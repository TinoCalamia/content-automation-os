"""Pydantic models for image generation API."""

from pydantic import BaseModel, Field
from typing import Literal, Optional, List


# Image style options
ImageStyle = Literal[
    "infographic",      # Data visualization, stats, numbers
    "comparison",       # Side-by-side, before/after, vs
    "flow",            # Process, steps, journey
    "concept",         # Abstract representation of ideas
    "quote",           # Text-focused with visual background
    "minimal"          # Clean, simple illustration
]


class GenerateImageRequest(BaseModel):
    """Request to generate an image for a draft."""
    
    draft_id: str = Field(..., description="Draft ID to generate image for")
    aspect_ratio: Literal["1:1", "16:9", "9:16", "4:5"] = Field("1:1", description="Image aspect ratio")
    style: ImageStyle = Field("infographic", description="Image style")
    custom_prompt: Optional[str] = Field(None, description="Optional custom prompt override")
    include_logo: bool = Field(True, description="Whether to include brand logo")


class GenerateBatchImagesRequest(BaseModel):
    """Request to generate multiple images for a draft."""
    
    draft_id: str = Field(..., description="Draft ID to generate images for")
    count: int = Field(2, description="Number of images to generate", ge=1, le=4)
    styles: List[ImageStyle] = Field(
        default=["infographic", "comparison"],
        description="Styles for each image"
    )
    aspect_ratio: Literal["1:1", "16:9", "9:16", "4:5"] = Field("1:1", description="Image aspect ratio")
    include_logo: bool = Field(True, description="Whether to include brand logo")


class ImageResult(BaseModel):
    """Result of image generation."""
    
    image_id: str = Field(..., description="Generated image ID")
    draft_id: str = Field(..., description="Associated draft ID")
    prompt: str = Field(..., description="Prompt used for generation")
    storage_path: str = Field(..., description="Path in storage")
    url: str = Field(..., description="Public URL of the image")
    aspect_ratio: str = Field(..., description="Image aspect ratio")
    style: str = Field(..., description="Image style used")


class BatchImageResult(BaseModel):
    """Result of batch image generation."""
    
    draft_id: str = Field(..., description="Associated draft ID")
    images: List[ImageResult] = Field(default_factory=list, description="Generated images")


class ImageResponse(BaseModel):
    """Image object returned from API."""
    
    id: str
    workspace_id: str
    draft_id: Optional[str]
    prompt: str
    model: str
    storage_path: str
    aspect_ratio: str
    style: Optional[str]
    created_at: str
