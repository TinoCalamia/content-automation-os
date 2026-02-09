"""Content generation service for creating platform-optimized drafts."""

import json
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional, List, Dict, Tuple

from libs.setup import setup_logging, get_settings
from libs.common import truncate_text
from libs.generation.prompts import (
    PLANNER_PROMPT,
    LINKEDIN_WRITER_PROMPT,
    X_WRITER_PROMPT,
    QUALITY_RUBRIC_PROMPT,
    REGENERATE_HOOK_PROMPT,
    REGENERATE_SHORTEN_PROMPT,
    REGENERATE_DIRECT_PROMPT,
    REGENERATE_STORYTELLING_PROMPT,
    REGENERATE_CTA_PROMPT,
    REGENERATE_THREAD_PROMPT,
)

logger = setup_logging(__name__)

# Default image styles for automatic generation
DEFAULT_IMAGE_STYLES = ["infographic", "comparison"]


class GenerationService:
    """Service for generating platform-optimized content drafts."""
    
    def __init__(
        self,
        gemini_client: Optional[Any],
        supabase_client: Optional[Any],
        image_service: Optional[Any] = None
    ):
        """
        Initialize the generation service.
        
        Args:
            gemini_client: Gemini client for LLM generation
            supabase_client: Supabase client for database access
            image_service: Optional image service for generating images
        """
        self.gemini = gemini_client
        self.supabase = supabase_client
        self.image_service = image_service
        self.settings = get_settings()
    
    async def generate(
        self,
        workspace_id: str,
        platform: str,
        source_ids: Optional[List[str]] = None,
        custom_text: Optional[str] = None,
        angle: Optional[str] = None,
        funnel_stage: Optional[str] = None,
        run_id: Optional[str] = None,
        generate_images: bool = True,
        image_source: str = "generate",
        image_styles: Optional[List[str]] = None,
        image_aspect_ratio: str = "1:1",
        source_image_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate content drafts for a platform.
        
        Args:
            workspace_id: Workspace ID
            platform: Target platform (linkedin or x)
            source_ids: Optional specific source IDs to use
            custom_text: Optional custom text input to generate from
            angle: Optional content angle
            run_id: Optional generation run ID
            generate_images: Whether to include images
            image_source: 'generate' for AI images, 'original' for source images
            image_styles: Styles for AI-generated images
            image_aspect_ratio: Aspect ratio for AI-generated images
            source_image_urls: Original image URLs when image_source='original'
            
        Returns:
            Generation result with draft ID and content
        """
        if not self.gemini:
            raise ValueError("Gemini client not configured")
        
        # 1. Fetch sources or build synthetic source from custom text
        if custom_text and custom_text.strip():
            sources = [{
                "id": "custom",
                "title": custom_text.strip()[:100],
                "summary": custom_text.strip(),
                "key_points": [],
            }]
            logger.info("Using custom text input for generation")
        else:
            sources = await self._fetch_sources(workspace_id, source_ids)
        
        if not sources:
            raise ValueError("No sources available for generation. Provide source IDs or custom text.")
        
        # 2. Fetch background context
        context = await self._fetch_context(workspace_id, platform)
        
        # 3. Run planner pass
        plan = await self._run_planner(sources, context, platform, angle, funnel_stage)
        
        # 4. Run writer pass
        variants, hashtags = await self._run_writer(plan, context, platform)
        
        # 5. Run quality check on primary variant
        quality_scores = await self._run_quality_check(
            variants[0]["content"] if variants else "",
            context,
            platform
        )
        
        # 6. Select best variant (for now, just use first)
        selected_content = variants[0]["content"] if variants else ""
        
        # 7. Determine funnel stage from plan (or use provided override)
        detected_funnel_stage = funnel_stage or plan.get("funnel_stage")
        if detected_funnel_stage not in {"tofu", "mofu", "bofu"}:
            detected_funnel_stage = None
        
        # 8. Save draft to database
        # Filter out synthetic "custom" source ID
        real_source_ids = [s["id"] for s in sources[:3] if s["id"] != "custom"]
        draft_id = await self._save_draft(
            workspace_id=workspace_id,
            platform=platform,
            content=selected_content,
            variants=variants,
            hashtags=hashtags,
            source_ids=real_source_ids,
            run_id=run_id,
            funnel_stage=detected_funnel_stage
        )
        
        # 9. Handle images based on image_source mode
        images = []
        if generate_images:
            if image_source == "original" and source_image_urls:
                # Use original images from sources
                images = await self._save_source_images(
                    workspace_id=workspace_id,
                    draft_id=draft_id,
                    image_urls=source_image_urls
                )
                logger.info(f"Attached {len(images)} original source images to draft {draft_id}")
            elif image_source == "generate" and self.image_service:
                # Generate AI images
                try:
                    styles = image_styles or DEFAULT_IMAGE_STYLES
                    logger.info(f"Generating {len(styles)} images for draft {draft_id}")
                    
                    image_result = await self.image_service.generate_batch_images(
                        draft_id=draft_id,
                        count=len(styles),
                        styles=styles,
                        aspect_ratio=image_aspect_ratio,
                        include_logo=True
                    )
                    images = image_result.get("images", [])
                    logger.info(f"Generated {len(images)} images successfully")
                except Exception as e:
                    logger.error(f"Image generation failed (continuing without images): {e}")
        
        return {
            "draft_id": draft_id,
            "platform": platform,
            "content": selected_content,
            "variants": variants,
            "hashtags": hashtags,
            "source_ids": real_source_ids,
            "funnel_stage": detected_funnel_stage,
            "quality_scores": quality_scores,
            "images": images
        }
    
    async def generate_multi_platform(
        self,
        workspace_id: str,
        platforms: List[str],
        source_ids: Optional[List[str]] = None,
        custom_text: Optional[str] = None,
        angle: Optional[str] = None,
        run_id: Optional[str] = None,
        generate_images: bool = True,
        image_source: str = "generate",
        image_styles: Optional[List[str]] = None,
        image_aspect_ratio: str = "1:1",
        source_image_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate content for multiple platforms with shared images.
        
        Images are generated once (using the first platform's draft) and then
        linked to all subsequent drafts, avoiding duplicate image generation.
        
        Args:
            workspace_id: Workspace ID
            platforms: List of target platforms (e.g. ["linkedin", "x"])
            source_ids: Optional specific source IDs to use
            custom_text: Optional custom text input to generate from
            angle: Optional content angle
            run_id: Optional generation run ID
            generate_images: Whether to include images
            image_source: 'generate' for AI images, 'original' for source images
            image_styles: Styles for AI-generated images
            image_aspect_ratio: Aspect ratio for AI-generated images
            source_image_urls: Original image URLs when image_source='original'
            
        Returns:
            Dict with drafts list and shared image_ids
        """
        if not self.gemini:
            raise ValueError("Gemini client not configured")
        
        if not platforms:
            raise ValueError("At least one platform is required")
        
        # 1. Fetch sources once (shared across all platforms)
        if custom_text and custom_text.strip():
            sources = [{
                "id": "custom",
                "title": custom_text.strip()[:100],
                "summary": custom_text.strip(),
                "key_points": [],
            }]
            logger.info("Using custom text input for multi-platform generation")
        else:
            sources = await self._fetch_sources(workspace_id, source_ids)
        
        if not sources:
            raise ValueError("No sources available for generation. Provide source IDs or custom text.")
        
        real_source_ids = [s["id"] for s in sources[:3] if s["id"] != "custom"]
        
        # 2. Generate content for each platform
        drafts_data = []
        for platform in platforms:
            context = await self._fetch_context(workspace_id, platform)
            plan = await self._run_planner(sources, context, platform, angle)
            variants, hashtags = await self._run_writer(plan, context, platform)
            quality_scores = await self._run_quality_check(
                variants[0]["content"] if variants else "",
                context,
                platform
            )
            selected_content = variants[0]["content"] if variants else ""
            
            draft_id = await self._save_draft(
                workspace_id=workspace_id,
                platform=platform,
                content=selected_content,
                variants=variants,
                hashtags=hashtags,
                source_ids=real_source_ids,
                run_id=run_id
            )
            
            drafts_data.append({
                "draft_id": draft_id,
                "platform": platform,
                "content": selected_content,
                "variants": variants,
                "hashtags": hashtags,
                "source_ids": real_source_ids,
                "quality_scores": quality_scores,
            })
            logger.info(f"Generated {platform} draft {draft_id}")
        
        # 3. Generate images ONCE using the first draft
        images = []
        if generate_images and drafts_data:
            first_draft_id = drafts_data[0]["draft_id"]
            
            if image_source == "original" and source_image_urls:
                images = await self._save_source_images(
                    workspace_id=workspace_id,
                    draft_id=first_draft_id,
                    image_urls=source_image_urls
                )
                logger.info(f"Attached {len(images)} original source images to first draft")
            elif image_source == "generate" and self.image_service:
                try:
                    styles = image_styles or DEFAULT_IMAGE_STYLES
                    logger.info(f"Generating {len(styles)} shared images for {len(platforms)} platforms")
                    
                    image_result = await self.image_service.generate_batch_images(
                        draft_id=first_draft_id,
                        count=len(styles),
                        styles=styles,
                        aspect_ratio=image_aspect_ratio,
                        include_logo=True
                    )
                    images = image_result.get("images", [])
                    logger.info(f"Generated {len(images)} shared images successfully")
                except Exception as e:
                    logger.error(f"Image generation failed (continuing without images): {e}")
            
            # 4. Link the same images to all OTHER drafts
            if images and len(drafts_data) > 1:
                for draft_data in drafts_data[1:]:
                    await self._link_images_to_draft(
                        workspace_id=workspace_id,
                        draft_id=draft_data["draft_id"],
                        images=images
                    )
                    logger.info(f"Linked {len(images)} shared images to {draft_data['platform']} draft")
        
        image_ids = [img.get("image_id") for img in images if img.get("image_id")]
        
        return {
            "drafts": drafts_data,
            "image_ids": image_ids,
        }
    
    async def _link_images_to_draft(
        self,
        workspace_id: str,
        draft_id: str,
        images: List[Dict[str, Any]]
    ) -> None:
        """
        Create image records for a draft that share the same storage_path
        as already-generated images. This avoids re-generating the same image.
        """
        if not self.supabase:
            return
        
        now = datetime.now(timezone.utc).isoformat()
        
        for img in images:
            new_image_id = str(uuid.uuid4())
            try:
                self.supabase.table("images").insert({
                    "id": new_image_id,
                    "workspace_id": workspace_id,
                    "draft_id": draft_id,
                    "prompt": img.get("prompt", ""),
                    "model": img.get("model", "shared"),
                    "storage_path": img.get("storage_path", ""),
                    "aspect_ratio": img.get("aspect_ratio", "1:1"),
                    "style": img.get("style", "infographic"),
                    "created_at": now
                }).execute()
            except Exception as e:
                logger.error(f"Failed to link image to draft {draft_id}: {e}")

    async def regenerate(
        self,
        draft_id: str,
        action: str
    ) -> Dict[str, Any]:
        """
        Regenerate specific aspects of a draft.
        
        Args:
            draft_id: Draft ID to regenerate
            action: Regeneration action
            
        Returns:
            Updated draft content
        """
        if not self.gemini or not self.supabase:
            raise ValueError("Services not configured")
        
        # Fetch the draft
        result = self.supabase.table("drafts").select("*").eq("id", draft_id).single().execute()
        draft = result.data
        
        if not draft:
            raise ValueError("Draft not found")
        
        # Fetch context
        context = await self._fetch_context(draft["workspace_id"], draft["platform"])
        
        # Select prompt based on action
        prompt_map = {
            "hook": REGENERATE_HOOK_PROMPT,
            "shorten": REGENERATE_SHORTEN_PROMPT,
            "direct": REGENERATE_DIRECT_PROMPT,
            "storytelling": REGENERATE_STORYTELLING_PROMPT,
            "cta": REGENERATE_CTA_PROMPT,
            "thread": REGENERATE_THREAD_PROMPT,
        }
        
        prompt_template = prompt_map.get(action)
        if not prompt_template:
            raise ValueError(f"Unknown action: {action}")
        
        prompt = prompt_template.format(
            content=draft["content_text"],
            tone_of_voice=context.get("tone_of_voice", "")
        )
        
        # Generate
        response = self.gemini.generate_content(prompt)
        result_data = self._parse_json_response(response.text)
        
        # Extract new content based on action
        new_content = None
        if action == "hook" and "recommended_full_post" in result_data:
            new_content = result_data["recommended_full_post"]
        elif action == "shorten" and "shortened" in result_data:
            new_content = result_data["shortened"]
        elif action == "direct" and "direct_version" in result_data:
            new_content = result_data["direct_version"]
        elif action == "storytelling" and "story_version" in result_data:
            new_content = result_data["story_version"]
        elif action == "thread" and "thread" in result_data:
            new_content = "\n---\n".join(result_data["thread"])
        elif action == "cta" and "ctas" in result_data:
            # Return CTAs as options, don't update main content
            return {
                "draft_id": draft_id,
                "action": action,
                "options": result_data["ctas"],
                "content": draft["content_text"]
            }
        
        if new_content:
            # Update draft
            self.supabase.table("drafts").update({
                "content_text": new_content,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", draft_id).execute()
        
        return {
            "draft_id": draft_id,
            "action": action,
            "content": new_content or draft["content_text"],
            "result_data": result_data
        }
    
    async def _save_source_images(
        self,
        workspace_id: str,
        draft_id: str,
        image_urls: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Save original source image URLs as images linked to the draft.
        
        These are stored with storage_path set to the external URL directly,
        so they can be displayed in the UI without needing Supabase storage.
        """
        if not self.supabase:
            return []
        
        saved_images = []
        now = datetime.now(timezone.utc).isoformat()
        
        for url in image_urls:
            image_id = str(uuid.uuid4())
            try:
                self.supabase.table("images").insert({
                    "id": image_id,
                    "workspace_id": workspace_id,
                    "draft_id": draft_id,
                    "prompt": "Original source image",
                    "model": "source",
                    "storage_path": url,
                    "aspect_ratio": "1:1",
                    "style": "original",
                    "created_at": now
                }).execute()
                
                saved_images.append({
                    "image_id": image_id,
                    "draft_id": draft_id,
                    "prompt": "Original source image",
                    "storage_path": url,
                    "url": url,
                    "aspect_ratio": "1:1",
                    "style": "original"
                })
            except Exception as e:
                logger.error(f"Failed to save source image {url}: {e}")
        
        return saved_images
    
    async def _fetch_sources(
        self,
        workspace_id: str,
        source_ids: Optional[List[str]]
    ) -> List[Dict[str, Any]]:
        """Fetch sources for generation."""
        if not self.supabase:
            return []
        
        query = self.supabase.table("sources").select("*").eq("workspace_id", workspace_id)
        
        if source_ids:
            query = query.in_("id", source_ids)
        else:
            # Get recent enriched sources that haven't been used much
            query = query.eq("status", "enriched").order("created_at", desc=True).limit(5)
        
        result = query.execute()
        return result.data or []
    
    async def _fetch_context(
        self,
        workspace_id: str,
        platform: str
    ) -> Dict[str, str]:
        """Fetch background context documents."""
        if not self.supabase:
            return {}
        
        context = {}
        
        # Fetch KB documents
        result = self.supabase.table("kb_documents").select("*").eq(
            "workspace_id", workspace_id
        ).eq("is_active", True).execute()
        
        for doc in result.data or []:
            key = doc.get("key", "")
            if key == "tone_of_voice":
                context["tone_of_voice"] = doc.get("content_md", "")
            elif key == "brand_guidelines":
                context["brand_guidelines"] = doc.get("content_md", "")
            elif key == f"{platform}_algorithm":
                context["platform_guidelines"] = doc.get("content_md", "")
        
        # Fetch example posts for this platform
        result = self.supabase.table("example_posts").select("*").eq(
            "workspace_id", workspace_id
        ).eq("platform", platform).eq("is_active", True).limit(3).execute()
        
        examples = []
        for post in result.data or []:
            examples.append(post.get("content_md", ""))
        context["example_posts"] = "\n\n---\n\n".join(examples)
        
        return context
    
    async def _run_planner(
        self,
        sources: List[Dict[str, Any]],
        context: Dict[str, str],
        platform: str,
        angle: Optional[str],
        funnel_stage: Optional[str] = None
    ) -> Dict[str, Any]:
        """Run the planner pass to decide angle and structure."""
        # Format sources for prompt
        sources_text = ""
        for s in sources[:5]:
            sources_text += f"\n---\nID: {s['id']}\nTitle: {s.get('title', 'Untitled')}\n"
            if s.get("summary"):
                sources_text += f"Summary: {s['summary']}\n"
            if s.get("key_points"):
                sources_text += f"Key Points: {', '.join(s['key_points'])}\n"
        
        # Build funnel stage context
        funnel_context = ""
        if funnel_stage:
            stage_labels = {
                "tofu": "Top of Funnel – Awareness (broad reach, thought leadership)",
                "mofu": "Middle of Funnel – Consideration (how-tos, frameworks, deep dives)",
                "bofu": "Bottom of Funnel – Conversion (CTAs, offers, product mentions)",
            }
            funnel_context = (
                f"## Target Funnel Stage\n"
                f"The user wants this post to target: **{funnel_stage.upper()}** "
                f"({stage_labels.get(funnel_stage, '')})\n"
                f"Tailor the angle, hook, and CTA accordingly."
            )
        
        prompt = PLANNER_PROMPT.format(
            platform=platform,
            sources=sources_text,
            tone_of_voice=context.get("tone_of_voice", "Professional and insightful"),
            brand_guidelines=context.get("brand_guidelines", ""),
            platform_guidelines=context.get("platform_guidelines", ""),
            funnel_stage_context=funnel_context
        )
        
        response = self.gemini.generate_content(prompt)
        plan = self._parse_json_response(response.text)
        
        # Override angle if specified
        if angle:
            plan["selected_angle"] = angle
        
        return plan
    
    async def _run_writer(
        self,
        plan: Dict[str, Any],
        context: Dict[str, str],
        platform: str
    ) -> Tuple[List[Dict[str, str]], List[str]]:
        """Run the writer pass to generate content variants."""
        prompt_template = LINKEDIN_WRITER_PROMPT if platform == "linkedin" else X_WRITER_PROMPT
        
        prompt = prompt_template.format(
            plan=json.dumps(plan, indent=2),
            tone_of_voice=context.get("tone_of_voice", ""),
            brand_guidelines=context.get("brand_guidelines", ""),
            example_posts=context.get("example_posts", "No examples available")
        )
        
        response = self.gemini.generate_content(prompt)
        result = self._parse_json_response(response.text)
        
        variants = result.get("variants", [])
        hashtags = result.get("suggested_hashtags", [])
        
        return variants, hashtags
    
    async def _run_quality_check(
        self,
        content: str,
        context: Dict[str, str],
        platform: str
    ) -> Dict[str, Any]:
        """Run quality evaluation on generated content."""
        if not content:
            return {}
        
        prompt = QUALITY_RUBRIC_PROMPT.format(
            content=content,
            platform=platform,
            tone_of_voice=context.get("tone_of_voice", "")
        )
        
        response = self.gemini.generate_content(prompt)
        return self._parse_json_response(response.text)
    
    async def _save_draft(
        self,
        workspace_id: str,
        platform: str,
        content: str,
        variants: List[Dict[str, str]],
        hashtags: List[str],
        source_ids: List[str],
        run_id: Optional[str],
        funnel_stage: Optional[str] = None
    ) -> str:
        """Save the generated draft to database."""
        if not self.supabase:
            raise ValueError("Database not configured")
        
        draft_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        draft_data = {
            "id": draft_id,
            "workspace_id": workspace_id,
            "platform": platform,
            "run_id": run_id,
            "content_text": content,
            "variants": variants,
            "hashtags": hashtags,
            "source_ids": source_ids,
            "created_at": now,
            "updated_at": now
        }
        
        if funnel_stage and funnel_stage in {"tofu", "mofu", "bofu"}:
            draft_data["funnel_stage"] = funnel_stage
        
        self.supabase.table("drafts").insert(draft_data).execute()
        
        return draft_id
    
    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM response."""
        try:
            # Find JSON in response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = text[start:end]
                return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON response: {e}")
        
        return {}
