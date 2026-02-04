"""Image generation API endpoints."""

from pathlib import Path
from fastapi import FastAPI, HTTPException, Header
from typing import Optional, List

# Bootstrap imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from libs.setup import bootstrap, init_supabase, setup_cors, setup_logging, get_settings
from libs.base_models import ApiResponse
from libs.images.models import (
    GenerateImageRequest,
    GenerateBatchImagesRequest,
    ImageResult,
    BatchImageResult,
)
from libs.images.service import ImageService

# Bootstrap the application
bootstrap(Path(__file__))

# Initialize
logger = setup_logging(__name__)
supabase = init_supabase()
settings = get_settings()

# Initialize Gemini client (for prompt generation)
gemini_client = None
if settings.gemini_api_key:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        gemini_client = genai.GenerativeModel("gemini-2.0-flash")
        logger.info("Gemini client initialized for prompt generation")
    except Exception as e:
        logger.warning(f"Could not initialize Gemini: {e}")

# Check for OpenAI API key (required for image generation)
openai_configured = bool(settings.openai_api_key)
if openai_configured:
    logger.info("OpenAI DALL-E configured for image generation")
else:
    logger.warning("OPENAI_API_KEY not set - image generation will fail")

# Create FastAPI app
app = FastAPI(title="Image Generation API", version="1.0.0")
setup_cors(app)

# Initialize service
image_service = ImageService(gemini_client, supabase)


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


@app.post("/generate", response_model=ApiResponse[ImageResult])
async def generate_image(
    request: GenerateImageRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Generate a single image for a draft.
    
    Creates an on-brand image based on the draft content,
    brand guidelines, and specified style.
    """
    await get_authenticated_user(authorization)
    
    if not openai_configured:
        raise HTTPException(status_code=500, detail="Image generation not configured - OPENAI_API_KEY required")
    
    try:
        logger.info(f"Generating {request.style} image for draft {request.draft_id}")
        
        result = await image_service.generate_image(
            draft_id=request.draft_id,
            aspect_ratio=request.aspect_ratio,
            style=request.style,
            custom_prompt=request.custom_prompt,
            include_logo=request.include_logo
        )
        
        return ApiResponse(
            success=True,
            data=ImageResult(
                image_id=result["image_id"],
                draft_id=result["draft_id"],
                prompt=result["prompt"],
                storage_path=result["storage_path"],
                url=result["url"],
                aspect_ratio=result["aspect_ratio"],
                style=result["style"]
            ),
            message="Image generated successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Image generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Image generation failed")


@app.post("/generate-batch", response_model=ApiResponse[BatchImageResult])
async def generate_batch_images(
    request: GenerateBatchImagesRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Generate multiple images for a draft in parallel.
    
    Creates multiple on-brand images with different styles.
    Images are generated concurrently for speed.
    """
    await get_authenticated_user(authorization)
    
    if not openai_configured:
        raise HTTPException(status_code=500, detail="Image generation not configured - OPENAI_API_KEY required")
    
    try:
        logger.info(f"Generating {request.count} images for draft {request.draft_id} with styles: {request.styles}")
        
        result = await image_service.generate_batch_images(
            draft_id=request.draft_id,
            count=request.count,
            styles=request.styles,
            aspect_ratio=request.aspect_ratio,
            include_logo=request.include_logo
        )
        
        # Convert to response model
        images = [
            ImageResult(
                image_id=img["image_id"],
                draft_id=img["draft_id"],
                prompt=img["prompt"],
                storage_path=img["storage_path"],
                url=img["url"],
                aspect_ratio=img["aspect_ratio"],
                style=img["style"]
            )
            for img in result["images"]
        ]
        
        return ApiResponse(
            success=True,
            data=BatchImageResult(
                draft_id=request.draft_id,
                images=images
            ),
            message=f"Generated {len(images)} images successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch image generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Batch image generation failed")


@app.post("/regenerate/{image_id}", response_model=ApiResponse[ImageResult])
async def regenerate_image(
    image_id: str,
    authorization: Optional[str] = Header(None)
):
    """Regenerate an existing image with the same settings."""
    await get_authenticated_user(authorization)
    
    if not openai_configured:
        raise HTTPException(status_code=500, detail="Image generation not configured - OPENAI_API_KEY required")
    
    try:
        logger.info(f"Regenerating image {image_id}")
        
        result = await image_service.regenerate_image(image_id)
        
        return ApiResponse(
            success=True,
            data=ImageResult(
                image_id=result["image_id"],
                draft_id=result["draft_id"],
                prompt=result["prompt"],
                storage_path=result["storage_path"],
                url=result["url"],
                aspect_ratio=result["aspect_ratio"],
                style=result.get("style", "minimal")
            ),
            message="Image regenerated successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Image regeneration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Image regeneration failed")


@app.get("/styles")
async def list_image_styles():
    """List available image styles with descriptions."""
    return {
        "styles": [
            {"id": "infographic", "label": "Infographic", "description": "Data visualization, stats, charts"},
            {"id": "comparison", "label": "Comparison", "description": "Side-by-side, before/after, vs"},
            {"id": "flow", "label": "Flow/Process", "description": "Steps, journey, progression"},
            {"id": "concept", "label": "Concept", "description": "Abstract, metaphorical imagery"},
            {"id": "quote", "label": "Quote Background", "description": "Typography-friendly backdrop"},
            {"id": "minimal", "label": "Minimal", "description": "Clean, simple illustration"},
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "images"}
