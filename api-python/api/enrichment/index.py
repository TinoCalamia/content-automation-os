"""Content enrichment API endpoints."""

from pathlib import Path
from fastapi import FastAPI, HTTPException, Header
from typing import Optional

# Bootstrap imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from libs.setup import bootstrap, init_supabase, setup_cors, setup_logging, get_settings
from libs.base_models import ApiResponse
from libs.enrichment.models import EnrichSourceRequest, SourceResponse
from libs.enrichment.service import EnrichmentService

# Bootstrap the application
bootstrap(Path(__file__))

# Initialize
logger = setup_logging(__name__)
supabase = init_supabase()
settings = get_settings()

# Initialize Gemini client if available
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
app = FastAPI(title="Enrichment API", version="1.0.0")
setup_cors(app)

# Initialize service
enrichment_service = EnrichmentService(gemini_client)


async def get_authenticated_user(
    authorization: Optional[str] = Header(None),
    required: bool = True
) -> Optional[dict]:
    """
    Authenticate user from Authorization header.
    
    Args:
        authorization: Authorization header value
        required: Whether authentication is required
        
    Returns:
        User dict or None
        
    Raises:
        HTTPException: If auth required but not provided/valid
    """
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


@app.post("/enrich/{source_id}", response_model=ApiResponse[SourceResponse])
async def enrich_source(
    source_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Enrich a source with metadata and AI-generated summary.
    
    Fetches the source, extracts content based on type, generates summary
    and key points, and updates the source in the database.
    """
    user = await get_authenticated_user(authorization)
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Fetch the source
        result = supabase.table("sources").select("*").eq("id", source_id).single().execute()
        source = result.data
        
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        
        logger.info(f"Enriching source {source_id}", extra={"user_id": user.id if user else None})
        
        # Enrich the source
        enriched = await enrichment_service.enrich_source(
            source_type=source["type"],
            url=source.get("url"),
            raw_text=source.get("raw_text")
        )
        
        # Update the source in database
        update_data = {
            "title": enriched.get("title") or source.get("title"),
            "author": enriched.get("author"),
            "published_at": enriched.get("published_at"),
            "thumbnail_url": enriched.get("thumbnail_url"),
            "raw_text": enriched.get("raw_text") or source.get("raw_text"),
            "cleaned_text": enriched.get("cleaned_text"),
            "summary": enriched.get("summary"),
            "key_points": enriched.get("key_points"),
            "status": "enriched"
        }
        
        result = supabase.table("sources").update(update_data).eq("id", source_id).execute()
        updated_source = result.data[0] if result.data else None
        
        if not updated_source:
            raise HTTPException(status_code=500, detail="Failed to update source")
        
        return ApiResponse(
            success=True,
            data=SourceResponse(**updated_source),
            message="Source enriched successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enriching source: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to enrich source")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "enrichment"}
