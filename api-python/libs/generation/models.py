"""Pydantic models for generation API."""

from pydantic import BaseModel, Field
from typing import Literal, Optional, List

# Image style type for generation
ImageStyle = Literal["infographic", "comparison", "flow", "concept", "quote", "minimal"]

# Image source mode: generate new AI images or use original images from sources
ImageSourceMode = Literal["generate", "original"]


class GenerateRequest(BaseModel):
    """Request to generate content drafts."""
    
    workspace_id: str = Field(..., description="Workspace ID")
    platform: Literal["linkedin", "x"] = Field(..., description="Target platform")
    source_ids: Optional[List[str]] = Field(None, description="Specific source IDs to use")
    custom_text: Optional[str] = Field(None, description="Custom text input to generate from (instead of sources)")
    angle: Optional[str] = Field(None, description="Content angle (contrarian, how-to, etc.)")
    funnel_stage: Optional[Literal["tofu", "mofu", "bofu"]] = Field(
        None, description="Target funnel stage (auto-detected if not provided)"
    )
    # Image options
    generate_images: bool = Field(True, description="Whether to include images")
    image_source: ImageSourceMode = Field(
        "generate",
        description="Image source mode: 'generate' for AI-generated, 'original' for source images"
    )
    image_styles: Optional[List[ImageStyle]] = Field(
        None,
        description="Image styles to generate (only used when image_source='generate')"
    )
    image_aspect_ratio: Literal["1:1", "16:9", "9:16", "4:5"] = Field(
        "1:1",
        description="Aspect ratio for generated images (only used when image_source='generate')"
    )
    source_image_urls: Optional[List[str]] = Field(
        None,
        description="Original image URLs from sources (only used when image_source='original')"
    )


class GenerateMultiPlatformRequest(BaseModel):
    """Request to generate content for multiple platforms with shared images."""
    
    workspace_id: str = Field(..., description="Workspace ID")
    platforms: List[Literal["linkedin", "x"]] = Field(
        ..., description="Target platforms (images generated once, shared across all)"
    )
    source_ids: Optional[List[str]] = Field(None, description="Specific source IDs to use")
    custom_text: Optional[str] = Field(None, description="Custom text input to generate from (instead of sources)")
    angle: Optional[str] = Field(None, description="Content angle (contrarian, how-to, etc.)")
    # Image options
    generate_images: bool = Field(True, description="Whether to include images")
    image_source: ImageSourceMode = Field(
        "generate",
        description="Image source mode: 'generate' for AI-generated, 'original' for source images"
    )
    image_styles: Optional[List[ImageStyle]] = Field(
        None,
        description="Image styles to generate (only used when image_source='generate')"
    )
    image_aspect_ratio: Literal["1:1", "16:9", "9:16", "4:5"] = Field(
        "1:1",
        description="Aspect ratio for generated images (only used when image_source='generate')"
    )
    source_image_urls: Optional[List[str]] = Field(
        None,
        description="Original image URLs from sources (only used when image_source='original')"
    )


class RegenerateRequest(BaseModel):
    """Request to regenerate specific aspects of a draft."""
    
    draft_id: str = Field(..., description="Draft ID to regenerate")
    action: Literal["hook", "shorten", "direct", "storytelling", "cta", "thread", "rewrite"] = Field(
        ..., description="Regeneration action"
    )
    feedback: Optional[str] = Field(
        None, description="User feedback to guide the rewrite (used with 'rewrite' action)"
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
    funnel_stage: Optional[str] = Field(None, description="Classified funnel stage")
    image_id: Optional[str] = Field(None, description="Generated image ID if any")


class PlatformDraftResult(BaseModel):
    """Result of content generation for a single platform within a multi-platform run."""
    
    draft_id: str = Field(..., description="Created draft ID")
    platform: str = Field(..., description="Target platform")
    content: str = Field(..., description="Selected/primary content")
    variants: List[DraftVariant] = Field(default_factory=list, description="Alternative variants")
    hashtags: List[str] = Field(default_factory=list, description="Suggested hashtags")
    source_ids: List[str] = Field(default_factory=list, description="Source IDs used")


class MultiPlatformResult(BaseModel):
    """Result of multi-platform content generation with shared images."""
    
    drafts: List[PlatformDraftResult] = Field(..., description="Generated drafts per platform")
    image_ids: List[str] = Field(default_factory=list, description="Shared image IDs across all drafts")


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
