"""Prompt templates for content strategy analysis."""

CLASSIFY_POST_PROMPT = """You are a content marketing strategist. Classify the following social media post into a marketing funnel stage.

## Funnel Stage Definitions

**TOFU (Top of Funnel – Awareness)**
Content that attracts a broad audience and builds brand visibility.
Examples: thought leadership, hot takes, industry trends, broad educational content, personal stories, motivational posts, opinion pieces.
Goal: maximize reach & impressions.

**MOFU (Middle of Funnel – Consideration)**
Content that builds trust and demonstrates expertise to an engaged audience.
Examples: how-to guides, frameworks, case studies, comparisons, deep dives, tutorials, actionable advice, data-backed insights.
Goal: engagement & trust building.

**BOFU (Bottom of Funnel – Conversion)**
Content that drives specific actions and converts followers into leads/customers.
Examples: product demos, testimonials, direct CTAs, offers, "DM me" posts, service descriptions, results/ROI showcases, lead magnets.
Goal: leads & conversions.

## Post to Classify
Platform: {platform}
Content:
{content}

## Task
Classify this post into exactly one funnel stage. Consider the primary intent and who it targets.

Respond in JSON format:
{{
    "funnel_stage": "tofu|mofu|bofu",
    "confidence": 0.85,
    "reasoning": "Brief explanation of why this stage was chosen"
}}"""

CLASSIFY_BATCH_PROMPT = """You are a content marketing strategist. Classify each of the following social media posts into a marketing funnel stage.

## Funnel Stage Definitions

**TOFU (Top of Funnel – Awareness)**: Thought leadership, hot takes, industry trends, broad educational content. Goal: reach & impressions.
**MOFU (Middle of Funnel – Consideration)**: How-to guides, frameworks, case studies, comparisons, deep dives. Goal: engagement & trust.
**BOFU (Bottom of Funnel – Conversion)**: Product demos, testimonials, direct CTAs, offers, service descriptions. Goal: leads & conversions.

## Posts to Classify
{posts}

## Task
Classify each post by its ID. Respond in JSON format:
{{
    "classifications": [
        {{
            "id": "post-id-here",
            "funnel_stage": "tofu|mofu|bofu",
            "confidence": 0.85
        }}
    ]
}}"""

RECOMMEND_STRATEGY_PROMPT = """You are an expert content strategist analyzing a brand's content funnel distribution to provide actionable recommendations.

## Current Content Distribution
{distribution}

## Ideal Content Mix
The recommended content mix for sustainable growth is:
- TOFU (Awareness): ~40% — builds reach and attracts new audience
- MOFU (Consideration): ~40% — builds trust and demonstrates expertise
- BOFU (Conversion): ~20% — converts followers into leads/customers

## Platform Breakdown
{platform_breakdown}

## Time Period
Analysis period: {time_period}

## Brand Context
Tone of Voice: {tone_of_voice}
Brand Guidelines: {brand_guidelines}

## Task
Analyze the current content distribution and provide strategic recommendations:
1. Identify which funnel stages are over/under-represented
2. Recommend specific content types and topics for the under-represented stages
3. Suggest 3 specific post ideas that would balance the funnel
4. Consider platform-specific best practices

Respond in JSON format:
{{
    "analysis": {{
        "tofu_percentage": 45,
        "mofu_percentage": 35,
        "bofu_percentage": 20,
        "balance_score": 8,
        "summary": "Brief overall assessment"
    }},
    "gaps": [
        {{
            "stage": "mofu",
            "severity": "medium",
            "description": "You need more consideration-stage content"
        }}
    ],
    "recommendations": [
        {{
            "stage": "mofu",
            "content_type": "how-to",
            "title": "Suggested post title/topic",
            "description": "Why this would help and what angle to take",
            "platform": "linkedin"
        }}
    ],
    "post_ideas": [
        {{
            "stage": "mofu",
            "platform": "linkedin",
            "angle": "framework",
            "hook": "Suggested opening hook...",
            "outline": "Brief outline of the post content"
        }}
    ]
}}"""
