"""Content strategy service for funnel classification and recommendations."""

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, List, Dict

from libs.setup import setup_logging
from libs.strategy.prompts import (
    CLASSIFY_POST_PROMPT,
    CLASSIFY_BATCH_PROMPT,
    RECOMMEND_STRATEGY_PROMPT,
)
from libs.strategy.models import (
    ClassificationResult,
    FunnelStageCounts,
    FunnelDistribution,
    PlatformDistribution,
    StrategyRecommendation,
    StrategyAnalysis,
    StrategyGap,
    ContentRecommendation,
    PostIdea,
)

logger = setup_logging(__name__)

# Valid funnel stages
VALID_STAGES = {"tofu", "mofu", "bofu"}


class StrategyService:
    """Service for content strategy analysis and recommendations."""

    def __init__(
        self,
        gemini_client: Optional[Any],
        supabase_client: Optional[Any],
    ):
        self.gemini = gemini_client
        self.supabase = supabase_client

    async def classify_post(self, draft_id: str) -> ClassificationResult:
        """Classify a single draft by funnel stage."""
        if not self.gemini or not self.supabase:
            raise ValueError("Services not configured")

        # Fetch the draft
        result = (
            self.supabase.table("drafts")
            .select("id, content_text, platform")
            .eq("id", draft_id)
            .single()
            .execute()
        )
        draft = result.data
        if not draft:
            raise ValueError("Draft not found")

        prompt = CLASSIFY_POST_PROMPT.format(
            platform=draft["platform"],
            content=draft["content_text"][:2000],
        )

        response = self.gemini.generate_content(prompt)
        parsed = self._parse_json_response(response.text)

        stage = parsed.get("funnel_stage", "tofu")
        if stage not in VALID_STAGES:
            stage = "tofu"

        confidence = float(parsed.get("confidence", 0.5))
        reasoning = parsed.get("reasoning", "")

        # Update the draft in DB
        self.supabase.table("drafts").update(
            {"funnel_stage": stage}
        ).eq("id", draft_id).execute()

        return ClassificationResult(
            draft_id=draft_id,
            funnel_stage=stage,
            confidence=confidence,
            reasoning=reasoning,
        )

    async def classify_batch(self, workspace_id: str) -> List[ClassificationResult]:
        """Classify all untagged drafts in a workspace."""
        if not self.gemini or not self.supabase:
            raise ValueError("Services not configured")

        # Fetch unclassified drafts
        result = (
            self.supabase.table("drafts")
            .select("id, content_text, platform")
            .eq("workspace_id", workspace_id)
            .is_("funnel_stage", "null")
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        drafts = result.data or []

        if not drafts:
            return []

        # For small batches, classify one by one for accuracy
        if len(drafts) <= 5:
            results = []
            for draft in drafts:
                try:
                    r = await self.classify_post(draft["id"])
                    results.append(r)
                except Exception as e:
                    logger.error(f"Failed to classify draft {draft['id']}: {e}")
            return results

        # For larger batches, use batch prompt
        posts_text = ""
        for d in drafts:
            posts_text += (
                f"\n---\nID: {d['id']}\n"
                f"Platform: {d['platform']}\n"
                f"Content: {d['content_text'][:500]}\n"
            )

        prompt = CLASSIFY_BATCH_PROMPT.format(posts=posts_text)
        response = self.gemini.generate_content(prompt)
        parsed = self._parse_json_response(response.text)

        classifications = parsed.get("classifications", [])
        results = []

        for c in classifications:
            draft_id = c.get("id", "")
            stage = c.get("funnel_stage", "tofu")
            if stage not in VALID_STAGES:
                stage = "tofu"
            confidence = float(c.get("confidence", 0.5))

            # Update DB
            try:
                self.supabase.table("drafts").update(
                    {"funnel_stage": stage}
                ).eq("id", draft_id).execute()

                results.append(
                    ClassificationResult(
                        draft_id=draft_id,
                        funnel_stage=stage,
                        confidence=confidence,
                        reasoning=None,
                    )
                )
            except Exception as e:
                logger.error(f"Failed to update draft {draft_id}: {e}")

        return results

    async def get_distribution(
        self,
        workspace_id: str,
        time_period: str = "all",
    ) -> FunnelDistribution:
        """Get funnel stage distribution for a workspace."""
        if not self.supabase:
            raise ValueError("Database not configured")

        # Build date filter
        date_filter = self._get_date_filter(time_period)

        # Query drafts
        query = (
            self.supabase.table("drafts")
            .select("funnel_stage, platform")
            .eq("workspace_id", workspace_id)
        )
        if date_filter:
            query = query.gte("created_at", date_filter)

        result = query.execute()
        drafts = result.data or []

        # Also query published posts
        pub_query = (
            self.supabase.table("published_posts")
            .select("funnel_stage, platform")
            .eq("workspace_id", workspace_id)
        )
        if date_filter:
            pub_query = pub_query.gte("published_at", date_filter)

        pub_result = pub_query.execute()
        published = pub_result.data or []

        # Combine all posts
        all_posts = drafts + published

        # Compute totals
        total = FunnelStageCounts()
        platform_map: Dict[str, FunnelStageCounts] = {}

        for post in all_posts:
            stage = post.get("funnel_stage")
            platform = post.get("platform", "unknown")

            if platform not in platform_map:
                platform_map[platform] = FunnelStageCounts()

            if stage == "tofu":
                total.tofu += 1
                platform_map[platform].tofu += 1
            elif stage == "mofu":
                total.mofu += 1
                platform_map[platform].mofu += 1
            elif stage == "bofu":
                total.bofu += 1
                platform_map[platform].bofu += 1
            else:
                total.unclassified += 1
                platform_map[platform].unclassified += 1

        by_platform = [
            PlatformDistribution(platform=p, counts=c)
            for p, c in platform_map.items()
        ]

        return FunnelDistribution(
            total=total,
            by_platform=by_platform,
            time_period=time_period,
        )

    async def recommend(
        self,
        workspace_id: str,
        time_period: str = "30d",
    ) -> StrategyRecommendation:
        """Generate AI-powered content strategy recommendations."""
        if not self.gemini or not self.supabase:
            raise ValueError("Services not configured")

        # Get current distribution
        distribution = await self.get_distribution(workspace_id, time_period)

        total_classified = (
            distribution.total.tofu
            + distribution.total.mofu
            + distribution.total.bofu
        )

        # Build distribution text
        if total_classified == 0:
            dist_text = "No classified posts yet. All posts are unclassified."
        else:
            dist_text = (
                f"Total classified posts: {total_classified}\n"
                f"- TOFU (Awareness): {distribution.total.tofu} "
                f"({round(distribution.total.tofu / total_classified * 100)}%)\n"
                f"- MOFU (Consideration): {distribution.total.mofu} "
                f"({round(distribution.total.mofu / total_classified * 100)}%)\n"
                f"- BOFU (Conversion): {distribution.total.bofu} "
                f"({round(distribution.total.bofu / total_classified * 100)}%)\n"
                f"- Unclassified: {distribution.total.unclassified}"
            )

        # Build platform breakdown
        platform_text = ""
        for pd in distribution.by_platform:
            plat_total = pd.counts.tofu + pd.counts.mofu + pd.counts.bofu
            platform_text += (
                f"\n{pd.platform.upper()}: "
                f"TOFU={pd.counts.tofu}, MOFU={pd.counts.mofu}, "
                f"BOFU={pd.counts.bofu} (total={plat_total})"
            )

        if not platform_text:
            platform_text = "No platform-specific data available."

        # Fetch brand context
        context = await self._fetch_context(workspace_id)

        prompt = RECOMMEND_STRATEGY_PROMPT.format(
            distribution=dist_text,
            platform_breakdown=platform_text,
            time_period=time_period,
            tone_of_voice=context.get("tone_of_voice", "Not specified"),
            brand_guidelines=context.get("brand_guidelines", "Not specified"),
        )

        response = self.gemini.generate_content(prompt)
        parsed = self._parse_json_response(response.text)

        # Build response
        analysis_data = parsed.get("analysis", {})
        analysis = StrategyAnalysis(
            tofu_percentage=float(analysis_data.get("tofu_percentage", 0)),
            mofu_percentage=float(analysis_data.get("mofu_percentage", 0)),
            bofu_percentage=float(analysis_data.get("bofu_percentage", 0)),
            balance_score=int(analysis_data.get("balance_score", 5)),
            summary=analysis_data.get("summary", ""),
        )

        gaps = [
            StrategyGap(
                stage=g.get("stage", "tofu"),
                severity=g.get("severity", "medium"),
                description=g.get("description", ""),
            )
            for g in parsed.get("gaps", [])
            if g.get("stage") in VALID_STAGES
        ]

        recommendations = [
            ContentRecommendation(
                stage=r.get("stage", "tofu"),
                content_type=r.get("content_type", ""),
                title=r.get("title", ""),
                description=r.get("description", ""),
                platform=r.get("platform", "linkedin"),
            )
            for r in parsed.get("recommendations", [])
            if r.get("stage") in VALID_STAGES
        ]

        post_ideas = [
            PostIdea(
                stage=p.get("stage", "tofu"),
                platform=p.get("platform", "linkedin"),
                angle=p.get("angle", ""),
                hook=p.get("hook", ""),
                outline=p.get("outline", ""),
            )
            for p in parsed.get("post_ideas", [])
            if p.get("stage") in VALID_STAGES
        ]

        return StrategyRecommendation(
            analysis=analysis,
            gaps=gaps,
            recommendations=recommendations,
            post_ideas=post_ideas,
            distribution=distribution,
        )

    async def _fetch_context(self, workspace_id: str) -> Dict[str, str]:
        """Fetch brand context documents."""
        if not self.supabase:
            return {}

        context = {}
        result = (
            self.supabase.table("kb_documents")
            .select("key, content_md")
            .eq("workspace_id", workspace_id)
            .eq("is_active", True)
            .execute()
        )

        for doc in result.data or []:
            key = doc.get("key", "")
            if key == "tone_of_voice":
                context["tone_of_voice"] = doc.get("content_md", "")
            elif key == "brand_guidelines":
                context["brand_guidelines"] = doc.get("content_md", "")

        return context

    def _get_date_filter(self, time_period: str) -> Optional[str]:
        """Convert time period to ISO date string filter."""
        now = datetime.now(timezone.utc)
        if time_period == "7d":
            return (now - timedelta(days=7)).isoformat()
        elif time_period == "30d":
            return (now - timedelta(days=30)).isoformat()
        elif time_period == "90d":
            return (now - timedelta(days=90)).isoformat()
        return None

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM response."""
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = text[start:end]
                return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON response: {e}")
        return {}
