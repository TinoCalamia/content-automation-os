"""Pydantic models for generation API."""

from pydantic import BaseModel, Field
from typing import Literal, Optional, List

# Image style type for generation
ImageStyle = Literal["infographic", "comparison", "flow", "concept", "quote", "minimal"]


class GenerateRequest(BaseModel):
    """Request to generate content drafts."""
    
    workspace_id: str = Field(..., description="Workspace ID")
    platform: Literal["linkedin", "x"] = Field(..., description="Target platform")
    source_ids: Optional[List[str]] = Field(None, description="Specific source IDs to use")
    angle: Optional[str] = Field(None, description="Content angle (contrarian, how-to, etc.)")
    # Image generation options
    generate_images: bool = Field(True, description="Whether to generate images")
    image_styles: Optional[List[ImageStyle]] = Field(
        None,
        description="Image styles to generate (default: infographic, comparison)"
    )
    image_aspect_ratio: Literal["1:1", "16:9", "9:16", "4:5"] = Field(
        "1:1",
        description="Aspect ratio for generated images"
    )


class RegenerateRequest(BaseModel):
    """Request to regenerate specific aspects of a draft."""
    
    draft_id: str = Field(..., description="Draft ID to regenerate")
    action: Literal["hook", "shorten", "direct", "storytelling", "cta", "thread"] = Field(
        ..., description="Regeneration action"
    )


class DraftVariant(BaseModel):
    """A variant of generated content."""
    
    label: str = Field(..., description="Variant label (e.g., 'Bold Hook', 'Safe')")
    content: str = Field(..., description="Variant content")


class GenerationResult(BaseModel):
    """Result of content generation."""
    
    draft_id: str = Field(..., description="Created draft ID")
    platform: str = Field(..., description="Target platform")
    content: str = Field(..., description="Selected/primary content")
    variants: List[DraftVariant] = Field(default_factory=list, description="Alternative variants")
    hashtags: List[str] = Field(default_factory=list, description="Suggested hashtags")
    source_ids: List[str] = Field(default_factory=list, description="Source IDs used")
    image_id: Optional[str] = Field(None, description="Generated image ID if any")


class DraftResponse(BaseModel):
    """Draft object returned from API."""
    
    id: str
    workspace_id: str
    platform: str
    run_id: Optional[str]
    content_text: str
    variants: List[DraftVariant]
    hashtags: List[str]
    scheduled_for: Optional[str]
    source_ids: List[str]
    created_at: str
    updated_at: str
