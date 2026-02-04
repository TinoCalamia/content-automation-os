"""Prompt templates for content generation."""

PLANNER_PROMPT = """You are a content strategist planning a social media post.

## Context
Platform: {platform}
Available Sources:
{sources}

Tone of Voice Guidelines:
{tone_of_voice}

Brand Guidelines:
{brand_guidelines}

Platform Algorithm Guidelines:
{platform_guidelines}

## Task
Analyze the sources and plan a post. Consider:
1. What's the most compelling angle?
2. What key insight or value can we share?
3. What structure works best for this platform?

Respond in JSON format:
{{
    "selected_angle": "contrarian|how-to|lesson|framework|story|tip",
    "main_insight": "The core insight to share",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "suggested_hook": "Opening line idea",
    "cta_direction": "What action to encourage",
    "source_ids_to_use": ["id1", "id2"]
}}"""

LINKEDIN_WRITER_PROMPT = """You are an expert LinkedIn content writer.

## Content Plan
{plan}

## Tone of Voice
{tone_of_voice}

## Brand Guidelines  
{brand_guidelines}

## LinkedIn Best Practices
- Strong hook in first 1-2 lines (this appears before "see more")
- Short paragraphs with deliberate whitespace
- Use line breaks strategically for readability
- End with a thought-provoking question or clear CTA
- 0-5 hashtags at the very end
- Avoid engagement bait ("Comment YES if...")
- Be value-dense and specific, not generic

## Example High-Performing Posts
{example_posts}

## Task
Write 3 LinkedIn post variants based on the plan:
1. "Safe" - A solid, proven format
2. "Bold Hook" - More provocative opening
3. "Concise" - Shorter, punchier version

Respond in JSON format:
{{
    "variants": [
        {{"label": "Safe", "content": "Full post text here..."}},
        {{"label": "Bold Hook", "content": "Full post text here..."}},
        {{"label": "Concise", "content": "Full post text here..."}}
    ],
    "suggested_hashtags": ["tag1", "tag2", "tag3"]
}}"""

X_WRITER_PROMPT = """You are an expert X/Twitter content writer.

## Content Plan
{plan}

## Tone of Voice
{tone_of_voice}

## Brand Guidelines
{brand_guidelines}

## X Best Practices
- Punchy, direct language
- Under 280 characters for single posts
- Include one "bookmarkable" line (principle, checklist, framework)
- Minimal hashtags (0-2 max)
- Fewer emojis than LinkedIn
- Optimize for replies and bookmarks

## Example High-Performing Posts
{example_posts}

## Task
Write 3 X post variants based on the plan:
1. "Single" - One punchy post under 280 chars
2. "Bold" - More provocative take
3. "Thread" - 3-5 post thread format (separate with ---)

Respond in JSON format:
{{
    "variants": [
        {{"label": "Single", "content": "Post text here..."}},
        {{"label": "Bold", "content": "Post text here..."}},
        {{"label": "Thread", "content": "Post 1\\n---\\nPost 2\\n---\\nPost 3"}}
    ],
    "suggested_hashtags": ["tag1"]
}}"""

QUALITY_RUBRIC_PROMPT = """You are a content quality evaluator.

## Post to Evaluate
{content}

## Evaluation Criteria
Rate each criterion 0-5:
1. Voice Match - Does it match the brand voice?
2. Clarity - Is the message clear and easy to understand?
3. Novelty - Does it offer a fresh perspective?
4. Platform Fit - Is it optimized for {platform}?
5. Specificity - Does it include concrete details/examples?

## Tone of Voice Reference
{tone_of_voice}

## Task
Evaluate the post and provide scores with brief reasoning.

Respond in JSON format:
{{
    "scores": {{
        "voice_match": 4,
        "clarity": 5,
        "novelty": 3,
        "platform_fit": 4,
        "specificity": 4
    }},
    "total_score": 20,
    "risk_flags": ["None" or list any concerns],
    "improvement_suggestions": ["Suggestion 1", "Suggestion 2"]
}}"""

REGENERATE_HOOK_PROMPT = """Rewrite the opening hook of this post to be more attention-grabbing.

Original post:
{content}

Tone of Voice:
{tone_of_voice}

Write 3 alternative hooks that:
- Stop the scroll
- Create curiosity
- Match the brand voice

Respond in JSON format:
{{
    "hooks": [
        "Hook 1 text...",
        "Hook 2 text...",
        "Hook 3 text..."
    ],
    "recommended_full_post": "Full post with best hook integrated..."
}}"""

REGENERATE_SHORTEN_PROMPT = """Shorten this post while keeping the core message.

Original post:
{content}

Target: Reduce by 30-50% while maintaining impact.

Respond in JSON format:
{{
    "shortened": "Shortened post text..."
}}"""

REGENERATE_DIRECT_PROMPT = """Make this post more direct and actionable.

Original post:
{content}

Make it:
- More assertive
- Less hedging language
- Clearer action items

Respond in JSON format:
{{
    "direct_version": "More direct post text..."
}}"""

REGENERATE_STORYTELLING_PROMPT = """Rewrite this post with more storytelling elements.

Original post:
{content}

Add:
- A specific moment or scene
- Sensory details
- Emotional arc

Respond in JSON format:
{{
    "story_version": "Post with story elements..."
}}"""

REGENERATE_CTA_PROMPT = """Generate 3 alternative CTAs for this post.

Original post:
{content}

Create CTAs that:
- Encourage engagement (comments, shares)
- Feel natural, not salesy
- Match the content's energy

Respond in JSON format:
{{
    "ctas": [
        "CTA 1...",
        "CTA 2...",
        "CTA 3..."
    ]
}}"""

REGENERATE_THREAD_PROMPT = """Convert this post into a Twitter/X thread.

Original post:
{content}

Create a 3-5 post thread that:
- Has a strong hook in post 1
- Each post can stand alone
- Builds to a conclusion
- Last post has a CTA

Respond in JSON format:
{{
    "thread": [
        "Post 1 (hook)...",
        "Post 2...",
        "Post 3...",
        "Post 4 (conclusion + CTA)..."
    ]
}}"""

IMAGE_BRIEF_PROMPT = """Create an image generation prompt for this post.

Post content:
{content}

Brand guidelines:
{brand_guidelines}

Create a prompt that:
- Captures the post's core message visually
- Follows brand color/style guidelines
- Works as a thumbnail/preview image
- Is specific and detailed

Respond in JSON format:
{{
    "image_prompt": "Detailed image generation prompt...",
    "style_notes": "Style guidance for the image",
    "composition": "Description of layout/composition"
}}"""
