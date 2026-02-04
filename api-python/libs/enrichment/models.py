"""Pydantic models for enrichment API."""

from typing import Optional, List
from pydantic import BaseModel, Field


class EnrichSourceRequest(BaseModel):
    """Request to enrich a source."""
    
    source_id: str = Field(..., description="ID of the source to enrich")


class EnrichmentResult(BaseModel):
    """Result of content enrichment."""
    
    title: Optional[str] = Field(None, description="Extracted title")
    author: Optional[str] = Field(None, description="Extracted author")
    published_at: Optional[str] = Field(None, description="Publication date if found")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail or preview image URL")
    raw_text: Optional[str] = Field(None, description="Raw extracted text")
    cleaned_text: Optional[str] = Field(None, description="Cleaned and normalized text")
    summary: Optional[str] = Field(None, description="AI-generated summary")
    key_points: Optional[List[str]] = Field(None, description="Key points or takeaways")


class SourceResponse(BaseModel):
    """Source object returned from API."""
    
    id: str
    workspace_id: str
    type: str
    url: Optional[str]
    title: Optional[str]
    author: Optional[str]
    published_at: Optional[str]
    thumbnail_url: Optional[str]
    raw_text: Optional[str]
    cleaned_text: Optional[str]
    summary: Optional[str]
    key_points: Optional[List[str]]
    tags: List[str]
    status: str
    created_at: str
    updated_at: str
