"""Image generation service using OpenAI DALL-E."""

import os
import uuid
import base64
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Any, Optional, Dict, List

from libs.setup import setup_logging, get_settings

logger = setup_logging(__name__)

# Style-specific prompt templates
STYLE_PROMPTS = {
    "infographic": """Create a clean, modern infographic-style image.
Style: Flat design, bold colors, clear visual hierarchy
Elements: Icons, numbers, simple charts or graphs
Layout: Organized sections, clear focal points
No text or words in the image.""",
    
    "comparison": """Create a clear comparison/contrast image.
Style: Side-by-side or split layout, balanced composition
Elements: Two distinct sections, clear visual separation, icons or illustrations
Layout: Clear dividing line or gradient, equal visual weight
No text or words in the image.""",
    
    "flow": """Create a process flow or journey visualization.
Style: Connected steps, arrows or flowing lines, sequential
Elements: Numbered steps shown as icons, directional indicators, milestone markers
Layout: Left-to-right or top-to-bottom progression
No text or words in the image.""",
    
    "concept": """Create an abstract conceptual illustration.
Style: Modern, artistic, thought-provoking
Elements: Abstract shapes, metaphorical imagery, symbolic elements
Layout: Balanced, artistic composition
No text or words in the image.""",
    
    "quote": """Create a visually striking background for text overlay.
Style: Typography-friendly, elegant background, atmospheric
Elements: Beautiful backdrop, subtle textures, mood lighting, gradient
Layout: Central focus area left clean for text overlay
No text or words in the image.""",
    
    "minimal": """Create a minimal, clean illustration.
Style: Simple, lots of white space, single focal point
Elements: One or two key visual elements, subtle accents
Layout: Centered, breathing room around elements
No text or words in the image."""
}

IMAGE_BRIEF_PROMPT = """Based on the following social media post content, create a compelling image description.

POST CONTENT:
{content}

BRAND GUIDELINES:
{brand_guidelines}

IMAGE STYLE: {style}
{style_description}

Generate a detailed image prompt that:
1. Captures the main message/theme of the post
2. Follows the brand guidelines
3. Uses the specified style effectively
4. Is simple, clear, and visually impactful
5. Does NOT include any text, words, letters, or numbers in the image

Respond with ONLY a JSON object:
{{
    "image_prompt": "detailed prompt for DALL-E image generation (max 900 chars)",
    "mood": "one-word mood descriptor"
}}"""


class ImageService:
    """Service for generating images using OpenAI DALL-E."""
    
    def __init__(self, gemini_client: Optional[Any], supabase_client: Optional[Any]):
        """Initialize the image service."""
        self.gemini = gemini_client  # Used for prompt generation
        self.supabase = supabase_client
        self.settings = get_settings()
        self.openai_api_key = self.settings.openai_api_key or os.environ.get("OPENAI_API_KEY", "")
    
    async def generate_batch_images(
        self,
        draft_id: str,
        count: int = 2,
        styles: Optional[List[str]] = None,
        aspect_ratio: str = "1:1",
        include_logo: bool = True
    ) -> Dict[str, Any]:
        """Generate multiple images for a draft in parallel."""
        if not styles:
            styles = ["infographic", "comparison"][:count]
        
        while len(styles) < count:
            styles.append(styles[-1] if styles else "infographic")
        
        # Generate images in parallel
        tasks = [
            self.generate_image(
                draft_id=draft_id,
                aspect_ratio=aspect_ratio,
                style=styles[i],
                include_logo=include_logo
            )
            for i in range(count)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        images = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Image generation failed: {result}")
            elif result:
                images.append(result)
        
        return {"draft_id": draft_id, "images": images}
    
    async def generate_image(
        self,
        draft_id: str,
        aspect_ratio: str = "1:1",
        style: str = "infographic",
        custom_prompt: Optional[str] = None,
        include_logo: bool = True
    ) -> Dict[str, Any]:
        """Generate an image for a draft using DALL-E."""
        if not self.supabase:
            raise ValueError("Database not configured")
        
        # Fetch the draft
        result = self.supabase.table("drafts").select("*").eq("id", draft_id).single().execute()
        draft = result.data
        
        if not draft:
            raise ValueError("Draft not found")
        
        workspace_id = draft["workspace_id"]
        
        # Get brand guidelines
        brand_guidelines = await self._get_brand_guidelines(workspace_id)
        
        # Generate image prompt if not provided
        if custom_prompt:
            image_prompt = custom_prompt
        else:
            image_prompt = await self._generate_image_prompt(
                content=draft["content_text"],
                brand_guidelines=brand_guidelines,
                style=style
            )
        
        # Generate the image using DALL-E
        image_data = await self._generate_with_dalle(image_prompt, aspect_ratio, style)
        
        if not image_data:
            raise ValueError("Image generation failed")
        
        # Upload to Supabase Storage
        image_id = str(uuid.uuid4())
        storage_path = f"images/{workspace_id}/{image_id}.png"
        
        self.supabase.storage.from_("generated-images").upload(
            storage_path,
            image_data,
            {"content-type": "image/png"}
        )
        
        # Get public URL
        public_url = self.supabase.storage.from_("generated-images").get_public_url(storage_path)
        
        # Save to database
        now = datetime.now(timezone.utc).isoformat()
        self.supabase.table("images").insert({
            "id": image_id,
            "workspace_id": workspace_id,
            "draft_id": draft_id,
            "prompt": image_prompt,
            "model": "dall-e-3",
            "storage_path": storage_path,
            "aspect_ratio": aspect_ratio,
            "style": style,
            "created_at": now
        }).execute()
        
        return {
            "image_id": image_id,
            "draft_id": draft_id,
            "prompt": image_prompt,
            "storage_path": storage_path,
            "url": public_url,
            "aspect_ratio": aspect_ratio,
            "style": style
        }
    
    async def _get_brand_guidelines(self, workspace_id: str) -> str:
        """Get brand guidelines from KB documents."""
        try:
            result = self.supabase.table("kb_documents").select("content_md").eq(
                "workspace_id", workspace_id
            ).eq("key", "brand_guidelines").eq("is_active", True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0].get("content_md", "")
        except Exception as e:
            logger.debug(f"No brand guidelines found: {e}")
        
        return "Clean, professional, modern aesthetic."
    
    async def _generate_image_prompt(
        self,
        content: str,
        brand_guidelines: str,
        style: str
    ) -> str:
        """Generate an image prompt based on content and style."""
        style_description = STYLE_PROMPTS.get(style, STYLE_PROMPTS["minimal"])
        
        # If we have Gemini, use it to generate a better prompt
        if self.gemini:
            try:
                prompt = IMAGE_BRIEF_PROMPT.format(
                    content=content[:1500],
                    brand_guidelines=brand_guidelines or "Clean, professional, modern aesthetic",
                    style=style,
                    style_description=style_description
                )
                
                response = self.gemini.generate_content(prompt)
                
                import json
                text = response.text
                start = text.find("{")
                end = text.rfind("}") + 1
                if start >= 0 and end > start:
                    data = json.loads(text[start:end])
                    return data.get("image_prompt", "")[:900]  # DALL-E has prompt limits
            except Exception as e:
                logger.warning(f"Failed to generate prompt with Gemini: {e}")
        
        # Fallback: create a simple prompt
        return f"A professional {style} illustration. {style_description[:200]} Modern, clean design for social media. No text."
    
    async def _generate_with_dalle(
        self,
        prompt: str,
        aspect_ratio: str,
        style: str
    ) -> Optional[bytes]:
        """Generate image using OpenAI DALL-E 3."""
        if not self.openai_api_key:
            logger.error("OPENAI_API_KEY not set")
            return None
        
        try:
            # Map aspect ratio to DALL-E sizes
            size_map = {
                "1:1": "1024x1024",
                "16:9": "1792x1024",
                "9:16": "1024x1792",
                "4:5": "1024x1024"  # DALL-E doesn't support 4:5, use square
            }
            size = size_map.get(aspect_ratio, "1024x1024")
            
            # Enhance prompt for DALL-E
            full_prompt = f"{prompt} Digital art, professional quality, high resolution. Absolutely no text, words, letters, or numbers anywhere in the image."
            
            logger.info(f"Generating image with DALL-E 3 ({size}, {style} style)")
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "dall-e-3",
                        "prompt": full_prompt[:4000],  # DALL-E 3 limit
                        "n": 1,
                        "size": size,
                        "quality": "standard",
                        "response_format": "b64_json"
                    }
                )
                
                if response.status_code != 200:
                    error_data = response.json()
                    logger.error(f"DALL-E API error: {error_data}")
                    return None
                
                data = response.json()
                
                if data.get("data") and len(data["data"]) > 0:
                    b64_image = data["data"][0].get("b64_json")
                    if b64_image:
                        image_bytes = base64.b64decode(b64_image)
                        logger.info(f"Successfully generated image ({len(image_bytes)} bytes)")
                        return image_bytes
                
                logger.warning("No image data in DALL-E response")
                return None
                
        except Exception as e:
            logger.error(f"DALL-E generation error: {e}", exc_info=True)
            return None
    
    async def regenerate_image(self, image_id: str) -> Dict[str, Any]:
        """Regenerate an existing image with the same settings."""
        if not self.supabase:
            raise ValueError("Database not configured")
        
        result = self.supabase.table("images").select("*").eq("id", image_id).single().execute()
        image = result.data
        
        if not image:
            raise ValueError("Image not found")
        
        return await self.generate_image(
            draft_id=image["draft_id"],
            aspect_ratio=image["aspect_ratio"],
            style=image.get("style", "infographic"),
            custom_prompt=image["prompt"]
        )
