"""Content strategy API endpoints."""

from pathlib import Path
from fastapi import FastAPI, HTTPException, Header, Query
from typing import Optional

# Bootstrap imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from libs.setup import bootstrap, init_supabase, setup_cors, setup_logging, get_settings
from libs.base_models import ApiResponse
from libs.strategy.models import (
    ClassifyRequest,
    ClassifyBatchRequest,
    RecommendRequest,
    ClassificationResult,
    BatchClassificationResult,
    FunnelDistribution,
    StrategyRecommendation,
)
from libs.strategy.service import StrategyService

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
        logger.info("Gemini client initialized for strategy service")
    except Exception as e:
        logger.warning(f"Could not initialize Gemini: {e}")

# Create FastAPI app
app = FastAPI(title="Strategy API", version="1.0.0")
setup_cors(app)

# Initialize service
strategy_service = StrategyService(gemini_client, supabase)


async def get_authenticated_user(
    authorization: Optional[str] = Header(None),
    required: bool = True,
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


@app.post("/classify", response_model=ApiResponse[ClassificationResult])
async def classify_post(
    request: ClassifyRequest,
    authorization: Optional[str] = Header(None),
):
    """Classify a single draft into a funnel stage (TOFU/MOFU/BOFU)."""
    await get_authenticated_user(authorization)

    if not gemini_client:
        raise HTTPException(
            status_code=500, detail="Strategy service not configured"
        )

    try:
        logger.info(f"Classifying draft {request.draft_id}")
        result = await strategy_service.classify_post(request.draft_id)

        return ApiResponse(
            success=True,
            data=result,
            message=f"Draft classified as {result.funnel_stage}",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Classification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Classification failed")


@app.post("/classify-batch", response_model=ApiResponse[BatchClassificationResult])
async def classify_batch(
    request: ClassifyBatchRequest,
    authorization: Optional[str] = Header(None),
):
    """Classify all untagged drafts in a workspace."""
    await get_authenticated_user(authorization)

    if not gemini_client:
        raise HTTPException(
            status_code=500, detail="Strategy service not configured"
        )

    try:
        logger.info(f"Batch classifying drafts for workspace {request.workspace_id}")
        results = await strategy_service.classify_batch(request.workspace_id)

        return ApiResponse(
            success=True,
            data=BatchClassificationResult(
                classified=len(results),
                results=results,
            ),
            message=f"Classified {len(results)} drafts",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch classification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Batch classification failed")


@app.get("/distribution", response_model=ApiResponse[FunnelDistribution])
async def get_distribution(
    workspace_id: str = Query(..., description="Workspace ID"),
    time_period: str = Query("all", description="Time period: 7d, 30d, 90d, all"),
    authorization: Optional[str] = Header(None),
):
    """Get funnel stage distribution for a workspace."""
    await get_authenticated_user(authorization)

    try:
        result = await strategy_service.get_distribution(workspace_id, time_period)

        return ApiResponse(
            success=True,
            data=result,
            message="Distribution retrieved",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Distribution error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get distribution")


@app.post("/recommend", response_model=ApiResponse[StrategyRecommendation])
async def get_recommendation(
    request: RecommendRequest,
    authorization: Optional[str] = Header(None),
):
    """Get AI-powered content strategy recommendations."""
    await get_authenticated_user(authorization)

    if not gemini_client:
        raise HTTPException(
            status_code=500, detail="Strategy service not configured"
        )

    try:
        logger.info(
            f"Generating recommendations for workspace {request.workspace_id}"
        )
        result = await strategy_service.recommend(
            request.workspace_id, request.time_period
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Strategy recommendations generated",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Recommendation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Recommendation failed")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "strategy"}
