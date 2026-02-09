"""Main FastAPI application that mounts all sub-applications."""

from pathlib import Path
import sys

# Add libs to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from libs.setup import setup_logging

# Import sub-applications
from api.enrichment.index import app as enrichment_app
from api.generation.index import app as generation_app
from api.images.index import app as images_app
from api.strategy.index import app as strategy_app

logger = setup_logging(__name__)

# Create main app
app = FastAPI(
    title="Content Automation Hub API",
    description="Backend API for content generation and management",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount sub-applications
app.mount("/api/enrichment", enrichment_app)
app.mount("/api/generation", generation_app)
app.mount("/api/images", images_app)
app.mount("/api/strategy", strategy_app)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Content Automation Hub API",
        "version": "1.0.0",
        "endpoints": {
            "enrichment": "/api/enrichment",
            "generation": "/api/generation",
            "images": "/api/images",
            "strategy": "/api/strategy"
        }
    }


@app.get("/health")
async def health_check():
    """Global health check."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
