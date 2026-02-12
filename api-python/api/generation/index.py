"""Content generation API endpoints."""

from pathlib import Path
from fastapi import FastAPI, HTTPException, Header
from typing import Optional, List

# Bootstrap imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from libs.setup import bootstrap, init_supabase, setup_cors, setup_logging, get_settings
from libs.base_models import ApiResponse
from libs.generation.models import (
    GenerateRequest,
    GenerateMultiPlatformRequest,
    RegenerateRequest,
    GenerationResult,
    MultiPlatformResult,
    PlatformDraftResult,
    DraftResponse,
)
from libs.generation.service import GenerationService
from libs.images.service import ImageService

# Bootstrap the application
bootstrap(Path(__file__))

# Initialize
logger = setup_logging(__name__)
supabase = init_supabase()
settings = get_settings()

# Initialize Gemini client
gemini_client = None
if settings.gemini_api_key:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        gemini_client = genai.GenerativeModel("gemini-2.0-flash")
        logger.info("Gemini client initialized")
    except Exception as e:
        logger.warning(f"Could not initialize Gemini: {e}")

# Create FastAPI app
app = FastAPI(title="Generation API", version="1.0.0")
setup_cors(app)

# Initialize services
image_service = ImageService(supabase)
generation_service = GenerationService(gemini_client, supabase, image_service)


async def get_authenticated_user(
    authorization: Optional[str] = Header(None),
    required: bool = True
) -> Optional[dict]:
    """Authenticate user from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        if required:
            raise HTTPException(status_code=401, detail="Authorization required")
        return None
    
    token = authorization.split(" ")[1]
    
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        response = supabase.auth.get_user(token)
        return response.user
    except Exception as e:
        logger.error(f"Auth error: {e}")
        if required:
            raise HTTPException(status_code=401, detail="Invalid token")
        return None


@app.post("/generate", response_model=ApiResponse[GenerationResult])
async def generate_content(
    request: GenerateRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Generate content drafts for a platform.
    
    This runs the full generation pipeline:
    1. Source selection
    2. Planner pass (angle, structure)
    3. Writer pass (generate variants)
    4. Quality check
    5. Save draft
    6. Generate 2 images in parallel (infographic + comparison)
    """
    user = await get_authenticated_user(authorization)
    
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Generation service not configured")
    
    try:
        logger.info(f"Generating {request.platform} content", extra={
            "workspace_id": request.workspace_id,
            "user_id": user.id if user else None
        })
        
        result = await generation_service.generate(
            workspace_id=request.workspace_id,
            platform=request.platform,
            source_ids=request.source_ids,
            custom_text=request.custom_text,
            angle=request.angle,
            funnel_stage=request.funnel_stage,
            generate_images=request.generate_images,
            image_source=request.image_source,
            image_styles=request.image_styles,
            image_aspect_ratio=request.image_aspect_ratio,
            source_image_urls=request.source_image_urls
        )
        
        # Build response with images if generated
        images = result.get("images", [])
        image_ids = [img.get("image_id") for img in images if img.get("image_id")]
        
        return ApiResponse(
            success=True,
            data=GenerationResult(
                draft_id=result["draft_id"],
                platform=result["platform"],
                content=result["content"],
                variants=[{"label": v["label"], "content": v["content"]} for v in result["variants"]],
                hashtags=result["hashtags"],
                source_ids=result["source_ids"],
                funnel_stage=result.get("funnel_stage"),
                image_id=image_ids[0] if image_ids else None  # Primary image
            ),
            message=f"Content generated successfully with {len(images)} images"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Generation failed")


@app.post("/generate-multi", response_model=ApiResponse[MultiPlatformResult])
async def generate_multi_platform(
    request: GenerateMultiPlatformRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Generate content for multiple platforms with shared images.
    
    Images are generated once and linked to all platform drafts,
    avoiding duplicate image generation when creating for LinkedIn + X.
    """
    user = await get_authenticated_user(authorization)
    
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Generation service not configured")
    
    try:
        logger.info(f"Generating multi-platform content for {request.platforms}", extra={
            "workspace_id": request.workspace_id,
            "user_id": user.id if user else None
        })
        
        result = await generation_service.generate_multi_platform(
            workspace_id=request.workspace_id,
            platforms=request.platforms,
            source_ids=request.source_ids,
            custom_text=request.custom_text,
            angle=request.angle,
            generate_images=request.generate_images,
            image_source=request.image_source,
            image_styles=request.image_styles,
            image_aspect_ratio=request.image_aspect_ratio,
            source_image_urls=request.source_image_urls
        )
        
        # Build response
        draft_results = []
        for d in result["drafts"]:
            draft_results.append(PlatformDraftResult(
                draft_id=d["draft_id"],
                platform=d["platform"],
                content=d["content"],
                variants=[{"label": v["label"], "content": v["content"]} for v in d["variants"]],
                hashtags=d["hashtags"],
                source_ids=d["source_ids"],
            ))
        
        image_ids = result.get("image_ids", [])
        platform_names = ", ".join(request.platforms)
        
        return ApiResponse(
            success=True,
            data=MultiPlatformResult(
                drafts=draft_results,
                image_ids=image_ids,
            ),
            message=f"Generated {len(draft_results)} drafts ({platform_names}) with {len(image_ids)} shared images"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-platform generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Generation failed")


@app.post("/regenerate", response_model=ApiResponse[dict])
async def regenerate_content(
    request: RegenerateRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Regenerate specific aspects of a draft.
    
    Actions:
    - hook: Regenerate the opening hook
    - shorten: Make the post more concise
    - direct: Make the post more direct/assertive
    - storytelling: Add more story elements
    - cta: Generate alternative CTAs
    - thread: Convert to thread format
    - rewrite: Full rewrite guided by user feedback (requires feedback field)
    """
    await get_authenticated_user(authorization)
    
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Generation service not configured")
    
    try:
        logger.info(f"Regenerating draft {request.draft_id} with action {request.action}")
        
        result = await generation_service.regenerate(
            draft_id=request.draft_id,
            action=request.action,
            feedback=request.feedback
        )
        
        return ApiResponse(
            success=True,
            data=result,
            message=f"Regeneration ({request.action}) completed"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Regeneration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Regeneration failed")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "generation"}
