"""Image generation service using Gemini 3 Pro Image."""

import io
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Dict, List

from PIL import Image as PILImage

from google import genai
from google.genai import types

from libs.setup import setup_logging, get_settings

logger = setup_logging(__name__)

# Path to the brand logo (PNG with transparent background)
LOGO_PATH = Path(__file__).parent.parent.parent / "assets" / "aerie_logo_red.png"

# Gemini 3 Pro Image model for generation
IMAGE_MODEL = "gemini-3-pro-image-preview"

# Gemini Flash model for scene description (fast, cheap reasoning)
SCENE_MODEL = "gemini-2.0-flash"

# Supported aspect ratios for Gemini 3 Pro Image
SUPPORTED_ASPECT_RATIOS = {
    "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9",
}

# Default aspect ratio fallback
DEFAULT_ASPECT_RATIO = "1:1"

# ── Style prompts ──────────────────────────────────────────────────────────────
# Each style is the PRIMARY creative direction. Gemini 3 Pro Image can reason
# about the content, so we pass the full post + brand + style and let it create
# a meaningful visual.
# Styles that benefit from short text labels (flowcharts, infographics)
STYLES_WITH_TEXT = {"flow", "infographic", "comparison"}

STYLE_PROMPTS = {
    "infographic": (
        "Create a single-page infographic based on the post content. "
        "Extract the key points, stats, tips, or takeaways from the post and present "
        "them as a structured, readable infographic. Include a short headline or title "
        "at the top summarizing the topic. Each key point gets its own row or section "
        "with a small icon and a short text label (5-10 words max per point). "
        "Use numbered sections or visual separators to create clear hierarchy. "
        "Use brand colors for section headers, icons, and accent elements. "
        "Clean flat design, modern typography, generous spacing between sections. "
        "One single cohesive infographic — not abstract art."
    ),
    "comparison": (
        "Create a side-by-side comparison or table based on the post content. "
        "Identify the two things being compared and present them as a clean visual "
        "comparison — either as a two-column table, a split layout with headers, "
        "or a 'vs' style graphic. Each side has a short title and key bullet points "
        "or attributes listed underneath. Use contrasting colors for each side "
        "(e.g., one warm, one cool from the brand palette). "
        "Include short text labels to make the comparison clear and readable. "
        "Clean, modern design with clear visual separation between the two sides."
    ),
    "flow": (
        "Create a process flowchart or step-by-step diagram based on the post content. "
        "Identify the key steps or stages described in the post and show them as "
        "connected boxes, circles, or shapes arranged left-to-right or top-to-bottom. "
        "Each step has a short label (2-4 words max) describing that stage. "
        "Connect the steps with arrows or lines showing the progression. "
        "Use icons or small illustrations inside or next to each step to make it visual. "
        "Clean, modern design with rounded shapes and brand colors. "
        "One single cohesive diagram — not abstract art."
    ),
    "concept": (
        "Create a single striking editorial illustration that captures one key moment "
        "or scene. Show a real-world setting with people, objects, or environments "
        "that tell the story at a glance. Modern editorial style — clean, striking, "
        "professional. Focus on one strong visual moment. "
        "No text, words, or labels in the image."
    ),
    "quote": (
        "Create a single atmospheric scene that sets a mood and feeling. "
        "Use depth of field, dramatic lighting, and color grading to create "
        "a cinematic atmosphere. Leave a generous clean area (center or lower third) "
        "suitable for text overlay. The scene should evoke emotion and feel connected "
        "to the subject matter. "
        "No text, words, or labels in the image."
    ),
    "minimal": (
        "Show one single object or visual element as the focal point, surrounded by "
        "generous whitespace or a clean solid background. Clean lines, simple geometry, "
        "at most 2-3 accent colors. The object should symbolize the core idea. "
        "Maximum simplicity — the subject should breathe. "
        "No text, words, or labels in the image."
    ),
}


# ── Scene description prompt ───────────────────────────────────────────────────
# Gemini Flash reads the post + style + brand and produces a concrete, specific
# scene description that the image model can execute precisely.
SCENE_PROMPT = """You are an art director creating a brief for an image that will accompany a social media post.

=== IMAGE STYLE (the user chose this — follow it strictly) ===
{style}

=== SOCIAL MEDIA POST (understand the topic — the image must be relevant to this) ===
{content}

=== BRAND VISUAL GUIDELINES ===
{brand}

YOUR JOB:
Describe a specific, concrete scene for the image model to generate. Be precise about:
- What objects, people, or elements appear in the scene
- How they are arranged and composed (following the style above)
- What colors to use (from the brand guidelines)
- The overall mood and lighting

RULES:
- The scene MUST be directly relevant to the post topic — not a generic metaphor
- Follow the IMAGE STYLE direction for composition and layout
- Use the brand colors and visual style
- Describe ONE single cohesive image (no multiple panels, no comic strips)
{text_rule}
- Keep it under 300 words — be specific and visual, not conceptual

Respond with ONLY the scene description, nothing else."""


class ImageService:
    """Service for generating images using Gemini 3 Pro Image."""

    def __init__(self, supabase_client: Optional[Any]):
        """Initialize the image service.

        Args:
            supabase_client: Supabase client for database/storage access
        """
        self.supabase = supabase_client
        self.settings = get_settings()
        self.genai_client: Optional[genai.Client] = None

        # Initialize google-genai client using the Gemini API key
        if self.settings.gemini_api_key:
            try:
                self.genai_client = genai.Client(api_key=self.settings.gemini_api_key)
                logger.info("Gemini 3 Pro Image initialized")
            except Exception as e:
                logger.error(f"Failed to initialize genai client: {e}", exc_info=True)
        else:
            logger.warning("GEMINI_API_KEY not set - image generation unavailable")

    @property
    def is_configured(self) -> bool:
        """Check whether the image generation backend is ready."""
        return self.genai_client is not None

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
        """Generate an image for a draft using Gemini 3 Pro Image."""
        if not self.supabase:
            raise ValueError("Database not configured")

        if not self.genai_client:
            raise ValueError("Image generation not configured - check GEMINI_API_KEY")

        # Fetch the draft
        result = self.supabase.table("drafts").select("*").eq("id", draft_id).single().execute()
        draft = result.data

        if not draft:
            raise ValueError("Draft not found")

        workspace_id = draft["workspace_id"]

        # Get brand guidelines
        brand_guidelines = await self._get_brand_guidelines(workspace_id)

        # Build the prompt — use Gemini Flash to create a specific scene description
        if custom_prompt:
            image_prompt = custom_prompt
        else:
            image_prompt = await self._build_scene_prompt(
                content=draft["content_text"],
                brand_guidelines=brand_guidelines,
                style=style,
            )

        # Generate the image
        image_data = await self._generate_image(image_prompt, aspect_ratio)

        if not image_data:
            raise ValueError("Image generation failed")

        # Overlay brand logo if requested
        if include_logo:
            image_data = self._overlay_logo(image_data)

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
            "model": IMAGE_MODEL,
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

    # ── Private helpers ────────────────────────────────────────────────────────

    async def _build_scene_prompt(
        self,
        content: str,
        brand_guidelines: str,
        style: str,
    ) -> str:
        """Use Gemini Flash to create a specific scene description.

        Pipeline:
        1. Gemini Flash reads post + style + brand → writes a concrete scene brief
        2. That scene brief is passed to Gemini 3 Pro Image for generation

        This produces images that are specific to the post content
        rather than generic/abstract interpretations.
        """
        style_instruction = STYLE_PROMPTS.get(style, STYLE_PROMPTS["minimal"])
        brand = brand_guidelines.strip() if brand_guidelines else "Clean, professional, modern aesthetic."

        # Text rule depends on style — flowcharts and infographics benefit from labels
        if style in STYLES_WITH_TEXT:
            text_rule = (
                "- You MAY include short text labels (2-4 words each) on diagram elements "
                "like steps, sections, or data points. Keep labels minimal and readable."
            )
        else:
            text_rule = (
                "- Do NOT include any text, words, letters, numbers, or labels in the scene. "
                "The image should be purely visual."
            )

        # Ask Gemini Flash to describe the scene
        if self.genai_client:
            try:
                scene_request = SCENE_PROMPT.format(
                    style=style_instruction,
                    content=content,
                    brand=brand,
                    text_rule=text_rule,
                )

                response = await asyncio.to_thread(
                    self.genai_client.models.generate_content,
                    model=SCENE_MODEL,
                    contents=[scene_request],
                    config=types.GenerateContentConfig(
                        response_modalities=["TEXT"],
                    ),
                )

                if response and response.text:
                    scene = response.text.strip()
                    logger.info(f"Scene description ({len(scene)} chars, style={style}): {scene[:120]}...")
                    return scene

            except Exception as e:
                logger.warning(f"Scene description failed, using fallback: {e}")

        # Fallback: direct prompt without the reasoning step
        return (
            f"{style_instruction} "
            f"The image is about: {content[:300]}. "
            f"No text, words, letters, or numbers in the image."
        )

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

        return ""

    async def _generate_image(
        self,
        prompt: str,
        aspect_ratio: str,
    ) -> Optional[bytes]:
        """Generate an image using Gemini 3 Pro Image."""
        if not self.genai_client:
            logger.error("genai client not initialised")
            return None

        try:
            # Validate aspect ratio
            ratio = aspect_ratio if aspect_ratio in SUPPORTED_ASPECT_RATIOS else DEFAULT_ASPECT_RATIO

            logger.info(f"Generating image with {IMAGE_MODEL} ({ratio})")

            # generate_content is synchronous; run in a thread to stay async
            response = await asyncio.to_thread(
                self.genai_client.models.generate_content,
                model=IMAGE_MODEL,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(
                        aspect_ratio=ratio,
                    ),
                ),
            )

            # Extract image from response parts
            if response and response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                        image_bytes = part.inline_data.data
                        logger.info(f"Generated image ({len(image_bytes)} bytes)")
                        return image_bytes

            logger.warning("No image data in response")
            return None

        except Exception as e:
            logger.error(f"Image generation error: {e}", exc_info=True)
            return None

    def _overlay_logo(self, image_bytes: bytes) -> bytes:
        """Overlay the brand logo on the top-right corner of the image."""
        try:
            if not LOGO_PATH.exists():
                logger.warning(f"Logo not found at {LOGO_PATH}, skipping overlay")
                return image_bytes

            base = PILImage.open(io.BytesIO(image_bytes)).convert("RGBA")
            logo = PILImage.open(LOGO_PATH).convert("RGBA")

            # Scale logo to ~8% of the image width
            max_logo_width = int(base.width * 0.08)
            if logo.width > max_logo_width:
                ratio = max_logo_width / logo.width
                logo = logo.resize(
                    (int(logo.width * ratio), int(logo.height * ratio)),
                    PILImage.LANCZOS,
                )

            # Position: top-right with 3% padding
            padding = int(base.width * 0.03)
            x = base.width - logo.width - padding
            y = padding

            # Paste with alpha transparency
            base.paste(logo, (x, y), logo)

            # Convert back to PNG bytes
            output = io.BytesIO()
            base.save(output, format="PNG")
            logger.info("Brand logo overlaid on image")
            return output.getvalue()

        except Exception as e:
            logger.warning(f"Logo overlay failed, returning original image: {e}")
            return image_bytes

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
