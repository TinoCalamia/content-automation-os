"""Shared setup utilities for FastAPI backend."""

import os
import sys
import logging
from pathlib import Path
from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic_settings import BaseSettings

# Load env vars FIRST, before any Settings are created
# Try to find .env.local in the project root
_current_dir = Path(__file__).parent
_project_root = _current_dir.parent.parent  # api-python -> project root

_env_local = _project_root / ".env.local"
_env_file = _project_root / ".env"

if _env_local.exists():
    load_dotenv(_env_local, override=True)
elif _env_file.exists():
    load_dotenv(_env_file, override=True)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase - support both NEXT_PUBLIC_ and non-prefixed versions
    next_public_supabase_url: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    gemini_api_key: str = ""
    cron_secret: str = ""
    log_level: str = "INFO"
    
    # OpenAI for image generation (legacy, kept for backward compatibility)
    openai_api_key: str = ""
    
    model_config = {
        "extra": "ignore"
    }
    
    @property
    def effective_supabase_url(self) -> str:
        """Get the Supabase URL from either env var format."""
        return self.next_public_supabase_url or self.supabase_url


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


def bootstrap(file_path: Path) -> None:
    """
    Bootstrap the application by setting up paths.
    
    Args:
        file_path: Path to the current file (__file__)
    """
    # Add libs to path for imports
    api_python_dir = file_path.parent.parent.parent
    libs_dir = api_python_dir / "libs"
    
    if str(libs_dir) not in sys.path:
        sys.path.insert(0, str(libs_dir))
    if str(api_python_dir) not in sys.path:
        sys.path.insert(0, str(api_python_dir))


def init_supabase() -> Optional[Client]:
    """
    Initialize and return Supabase client.
    
    Returns:
        Supabase client instance or None if credentials not available.
    """
    settings = get_settings()
    
    supabase_url = settings.effective_supabase_url
    if not supabase_url or not settings.supabase_service_role_key:
        logging.warning("Supabase credentials not configured")
        logging.warning(f"  URL: {supabase_url[:20] + '...' if supabase_url else 'NOT SET'}")
        logging.warning(f"  Service Key: {'SET' if settings.supabase_service_role_key else 'NOT SET'}")
        return None
    
    return create_client(
        supabase_url,
        settings.supabase_service_role_key
    )


def setup_cors(app: FastAPI) -> None:
    """
    Configure CORS middleware for the FastAPI app.
    
    Args:
        app: FastAPI application instance
    """
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


def setup_logging(name: str) -> logging.Logger:
    """
    Set up and return a logger with consistent formatting.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Configured logger instance
    """
    settings = get_settings()
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger
