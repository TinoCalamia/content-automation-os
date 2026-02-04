"""Shared Pydantic base models for API responses."""

from typing import TypeVar, Generic, Any, Optional, List
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    
    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[T] = Field(None, description="Response data")
    message: Optional[str] = Field(None, description="Human-readable message")
    error: Optional[str] = Field(None, description="Error message if not successful")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response."""
    
    items: List[T] = Field(default_factory=list, description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    has_more: bool = Field(..., description="Whether there are more pages")


class SourceType:
    """Source type constants."""
    
    LINKEDIN_URL = "linkedin_url"
    YOUTUBE_URL = "youtube_url"
    BLOG_URL = "blog_url"
    X_URL = "x_url"
    PODCAST_URL = "podcast_url"
    NOTE = "note"
    FILE = "file"
    
    @classmethod
    def all(cls) -> List[str]:
        return [
            cls.LINKEDIN_URL,
            cls.YOUTUBE_URL,
            cls.BLOG_URL,
            cls.X_URL,
            cls.PODCAST_URL,
            cls.NOTE,
            cls.FILE,
        ]


class SourceStatus:
    """Source status constants."""
    
    NEW = "new"
    ENRICHED = "enriched"
    USED = "used"
    ARCHIVED = "archived"
    
    @classmethod
    def all(cls) -> List[str]:
        return [cls.NEW, cls.ENRICHED, cls.USED, cls.ARCHIVED]


class Platform:
    """Platform constants."""
    
    LINKEDIN = "linkedin"
    X = "x"
    
    @classmethod
    def all(cls) -> List[str]:
        return [cls.LINKEDIN, cls.X]


class GenerationAngle:
    """Generation angle constants."""
    
    CONTRARIAN = "contrarian"
    HOW_TO = "how-to"
    LESSON = "lesson"
    FRAMEWORK = "framework"
    STORY = "story"
    TIP = "tip"
    
    @classmethod
    def all(cls) -> List[str]:
        return [
            cls.CONTRARIAN,
            cls.HOW_TO,
            cls.LESSON,
            cls.FRAMEWORK,
            cls.STORY,
            cls.TIP,
        ]


class RegenerateAction:
    """Regeneration action constants."""
    
    HOOK = "hook"
    SHORTEN = "shorten"
    DIRECT = "direct"
    STORYTELLING = "storytelling"
    CTA = "cta"
    THREAD = "thread"
    
    @classmethod
    def all(cls) -> List[str]:
        return [
            cls.HOOK,
            cls.SHORTEN,
            cls.DIRECT,
            cls.STORYTELLING,
            cls.CTA,
            cls.THREAD,
        ]
