"""Image generation service using Google Imagen 4 via Gemini API."""

import io
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Dict, List

from PIL import Image

from google import genai
from google.genai import types

from libs.setup import setup_logging, get_settings

logger = setup_logging(__name__)

# Path to the brand logo (PNG with transparent background)
LOGO_PATH = Path(__file__).parent.parent.parent / "assets" / "aerie_logo_red.png"

# Imagen 4 model identifier (available via Gemini API key)
IMAGEN_MODEL = "imagen-4.0-generate-001"

# Aspect ratio mapping: map unsupported ratios to the closest Imagen option.
# Imagen supports: 1:1, 16:9, 9:16, 4:3, 3:4
ASPECT_RATIO_MAP = {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
    "4:3": "4:3",
    "3:4": "3:4",
    "4:5": "3:4",  # closest supported ratio
}

# Style-specific LAYOUT instructions — these describe composition and layout only.
# WHAT the image depicts always comes from the source content, not from these styles.
STYLE_PROMPTS = {
    "infographic": """LAYOUT STYLE: Infographic
- Flat design illustration with organized sections and clear visual hierarchy
- Show the specific objects, people, tools, or scenarios from the content — not abstract shapes
- If the content discusses data or trends, show a recognizable chart or graph shape (scatter plot, bar chart, etc.)
- If the content compares things, show the actual things being compared as concrete objects
- Organized grid or section layout, clean lines""",

    "comparison": """LAYOUT STYLE: Side-by-Side Comparison
- Split the image into two clear halves with a visual divider
- Each half shows one side of the MAIN CONTRAST described in the article's primary argument
- Use recognizable objects, people, and settings — not abstract symbols
- The contrast should be immediately obvious from what is literally shown
- Equal visual weight on both sides""",

    "flow": """LAYOUT STYLE: Process / Step-by-Step
- Show the process or sequence described in the content as connected stages
- Each stage depicts a CONCRETE action, scene, or object from the content — not generic icons
- Connected by arrows or a flowing path, left-to-right or top-to-bottom
- The viewer should understand the actual process being described""",

    "concept": """LAYOUT STYLE: Editorial Illustration
- Create a SCENE that literally depicts the core situation described in the content
- Show real-world objects, people, settings, and interactions — not abstract shapes
- Think "what scene would a magazine illustrator draw to accompany this article?"
- The illustration should tell the story — a viewer who hasn't read the article should still get the gist
- Modern editorial illustration style, clean and striking""",

    "quote": """LAYOUT STYLE: Atmospheric Scene
- Create a scene or environment that represents the setting or situation from the content
- Show recognizable elements from the topic (workplace, tools, technology, people, etc.)
- Leave a clean central area suitable for text overlay
- The background scene should feel connected to the actual subject matter, not generic""",

    "minimal": """LAYOUT STYLE: Minimal / Single Subject
- Show ONE key object, tool, or element from the content as the single focal point
- This should be something SPECIFIC to the topic — not a generic icon
- Lots of white space, clean lines, single accent color
- The object should be immediately recognizable and connected to the article's subject"""
}

IMAGE_BRIEF_PROMPT = """You are creating an image prompt for an AI image generator (Imagen). Your job is to describe a CONCRETE scene that illustrates the social media post below.

CRITICAL RULES:
- DO NOT use abstract metaphors (no floating brains, no glowing orbs, no abstract shapes representing ideas)
- DO NOT illustrate a supporting example or analogy — illustrate the MAIN MESSAGE of the post
- If the post mentions specific industries (medicine, law, sports, etc.) as EXAMPLES to support a broader point, show the BROADER POINT, not the example industry
- Think: "What is this post FUNDAMENTALLY about?" — illustrate THAT
- The image should complement the post and make sense when seen alongside it

=== POST TEXT (this is the published content — the image MUST match this) ===
{content}

=== ORIGINAL SOURCE CONTEXT (background info only, for deeper understanding) ===
Title: {source_title}
Key points: {source_key_points}

=== BRAND VISUAL STYLE (colors and aesthetic only, NOT the image subject) ===
{brand_guidelines}

=== COMPOSITION LAYOUT ===
{style_description}

STEP 1 — Identify what the post is about:
Read the POST TEXT above. What is the core message, argument, or insight being shared? Ignore supporting examples and analogies.

STEP 2 — Translate to a visual scene:
Describe a concrete, recognizable scene that depicts that core message. Use real objects, people, settings, and technology that are directly related to the subject — not to the supporting examples.

For instance:
- A post about "AI output quality mirrors input sophistication" → show a person crafting a detailed prompt on a screen with the AI producing a polished response — NOT a doctor or police officer mentioned as examples
- A post about "how to write viral LinkedIn posts" → show a content creator at their desk with a well-crafted post getting engagement — NOT the specific framework steps

IMPORTANT: No text, words, letters, numbers, or labels in the image.

Respond with ONLY a JSON object:
{{
    "primary_topic": "one sentence: what this post is fundamentally about",
    "image_prompt": "detailed scene description for image generation depicting the post topic (max 900 chars)",
    "mood": "one-word mood descriptor"
}}"""


class ImageService:
    """Service for generating images using Google Imagen via Gemini API."""
    
    def __init__(self, gemini_client: Optional[Any], supabase_client: Optional[Any]):
        """Initialize the image service with google-genai Client."""
        self.gemini = gemini_client  # Used for prompt generation
        self.supabase = supabase_client
        self.settings = get_settings()
        self.genai_client: Optional[genai.Client] = None
        
        # Initialize google-genai client using the existing Gemini API key
        if self.settings.gemini_api_key:
            try:
                self.genai_client = genai.Client(api_key=self.settings.gemini_api_key)
                logger.info("Imagen initialized via Gemini API key")
            except Exception as e:
                logger.error(f"Failed to initialize Imagen client: {e}", exc_info=True)
        else:
            logger.warning("GEMINI_API_KEY not set - Imagen image generation unavailable")
    
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
        """Generate an image for a draft using Imagen."""
        if not self.supabase:
            raise ValueError("Database not configured")
        
        if not self.genai_client:
            raise ValueError("Imagen not configured - check GEMINI_API_KEY")
        
        # Fetch the draft
        result = self.supabase.table("drafts").select("*").eq("id", draft_id).single().execute()
        draft = result.data
        
        if not draft:
            raise ValueError("Draft not found")
        
        workspace_id = draft["workspace_id"]
        
        # Fetch source content for the image topic
        source_context = await self._get_source_context(draft)
        
        # Get brand guidelines (visual styling only)
        brand_guidelines = await self._get_brand_guidelines(workspace_id)
        
        # Generate image prompt if not provided
        if custom_prompt:
            image_prompt = custom_prompt
        else:
            image_prompt = await self._generate_image_prompt(
                content=draft["content_text"],
                brand_guidelines=brand_guidelines,
                style=style,
                source_context=source_context
            )
        
        # Generate the image using Imagen
        image_data = await self._generate_with_imagen(image_prompt, aspect_ratio, style)
        
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
            "model": IMAGEN_MODEL,
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
    
    async def _get_source_context(self, draft: Dict[str, Any]) -> Dict[str, str]:
        """Fetch the original source content linked to the draft for image topic context."""
        context = {
            "title": "",
            "summary": "",
            "key_points": "",
        }
        
        if not self.supabase:
            return context
        
        source_ids = draft.get("source_ids", [])
        if not source_ids:
            return context
        
        try:
            result = self.supabase.table("sources").select(
                "title, summary, key_points"
            ).in_("id", source_ids).execute()
            
            if result.data:
                titles = []
                summaries = []
                all_key_points = []
                
                for source in result.data:
                    if source.get("title"):
                        titles.append(source["title"])
                    if source.get("summary"):
                        summaries.append(source["summary"])
                    if source.get("key_points"):
                        kp = source["key_points"]
                        if isinstance(kp, list):
                            all_key_points.extend(kp)
                        elif isinstance(kp, str):
                            all_key_points.append(kp)
                
                context["title"] = " | ".join(titles) if titles else ""
                context["summary"] = "\n".join(summaries)[:1000] if summaries else ""
                context["key_points"] = "\n".join(
                    f"- {kp}" for kp in all_key_points[:10]
                ) if all_key_points else ""
                
                logger.info(f"Fetched source context: {len(titles)} titles, {len(all_key_points)} key points")
        except Exception as e:
            logger.warning(f"Could not fetch source context: {e}")
        
        return context
    
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
        style: str,
        source_context: Optional[Dict[str, str]] = None
    ) -> str:
        """Generate an image prompt based on post text, brand styling, and style."""
        style_description = STYLE_PROMPTS.get(style, STYLE_PROMPTS["minimal"])
        
        # Source context is supplementary — the post text drives the image
        src = source_context or {}
        source_title = src.get("title", "") or "N/A"
        source_key_points = src.get("key_points", "") or "N/A"
        
        # If we have Gemini, use it to generate a better prompt
        if self.gemini:
            try:
                prompt = IMAGE_BRIEF_PROMPT.format(
                    content=content[:1500],
                    source_title=source_title,
                    source_key_points=source_key_points,
                    brand_guidelines=brand_guidelines or "Clean, professional, modern aesthetic",
                    style_description=style_description
                )
                
                response = self.gemini.generate_content(prompt)
                
                import json
                text = response.text
                start = text.find("{")
                end = text.rfind("}") + 1
                if start >= 0 and end > start:
                    data = json.loads(text[start:end])
                    generated_prompt = data.get("image_prompt", "")[:900]
                    if generated_prompt:
                        logger.info(f"Image subject: {data.get('primary_topic', 'N/A')}")
                        return generated_prompt
            except Exception as e:
                logger.warning(f"Failed to generate prompt with Gemini: {e}")
        
        # Fallback: content-focused simple prompt using the post text
        return (
            f"Editorial illustration showing the real-world scenario described in this post: "
            f"{content[:200]}. Show concrete people, objects, and settings related to the topic. "
            f"Clean modern style, professional quality. No text in the image."
        )
    
    async def _generate_with_imagen(
        self,
        prompt: str,
        aspect_ratio: str,
        style: str
    ) -> Optional[bytes]:
        """Generate image using Google Imagen via Gemini API key."""
        if not self.genai_client:
            logger.error("Imagen client not initialised")
            return None
        
        try:
            # Map to a supported Imagen aspect ratio
            imagen_ratio = ASPECT_RATIO_MAP.get(aspect_ratio, "1:1")
            
            # Enhance prompt — keep it grounded and concrete, avoid "digital art" which
            # pushes toward abstract artistic interpretations
            full_prompt = (
                f"{prompt} Professional editorial illustration, clean modern style, "
                "high resolution. Absolutely no text, words, letters, or numbers anywhere in the image."
            )
            
            logger.info(f"Generating image with Imagen ({imagen_ratio}, {style} style)")
            
            # generate_images is synchronous; run in a thread to stay async
            response = await asyncio.to_thread(
                self.genai_client.models.generate_images,
                model=IMAGEN_MODEL,
                prompt=full_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=imagen_ratio,
                ),
            )
            
            if response.generated_images and len(response.generated_images) > 0:
                image_bytes = response.generated_images[0].image.image_bytes
                logger.info(f"Successfully generated image ({len(image_bytes)} bytes)")
                return image_bytes
            
            logger.warning("No image data in Imagen response")
            return None
            
        except Exception as e:
            logger.error(f"Imagen generation error: {e}", exc_info=True)
            return None
    
    def _overlay_logo(self, image_bytes: bytes) -> bytes:
        """Overlay the brand logo on the top-right corner of the image."""
        try:
            if not LOGO_PATH.exists():
                logger.warning(f"Logo not found at {LOGO_PATH}, skipping overlay")
                return image_bytes

            base = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            logo = Image.open(LOGO_PATH).convert("RGBA")

            # Scale logo to ~8% of the image width
            max_logo_width = int(base.width * 0.08)
            if logo.width > max_logo_width:
                ratio = max_logo_width / logo.width
                logo = logo.resize(
                    (int(logo.width * ratio), int(logo.height * ratio)),
                    Image.LANCZOS,
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
