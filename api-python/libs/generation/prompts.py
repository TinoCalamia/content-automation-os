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

{funnel_stage_context}

## Task
Analyze the sources and plan a post. Consider:
1. What's the most compelling angle?
2. What key insight or value can we share?
3. What structure works best for this platform?
4. What marketing funnel stage does this post target?

## Funnel Stage Definitions
- **tofu** (Top of Funnel – Awareness): Thought leadership, hot takes, industry trends, broad educational content. Goal: reach & impressions.
- **mofu** (Middle of Funnel – Consideration): How-to guides, frameworks, case studies, comparisons, deep dives. Goal: engagement & trust.
- **bofu** (Bottom of Funnel – Conversion): Product demos, testimonials, direct CTAs, offers, service descriptions. Goal: leads & conversions.

Respond in JSON format:
{{
    "selected_angle": "contrarian|how-to|lesson|framework|story|tip|slay",
    "funnel_stage": "tofu|mofu|bofu",
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

## SLAY Framework (use when angle is "slay")
If the selected_angle is "slay", structure the post following this exact flow:
1. **Story** — Start with a personal insight, anecdote, or relatable moment
2. **Lesson** — State the problem or key lesson clearly
3. **Actionable advice** — Give concrete, actionable steps (use bullet points or numbered lists)
4. **You** — Turn it back to the reader. Address them directly with "you". Make it about them.
Use short paragraphs, line breaks between sections, and a conversational tone.

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
- **HARD LIMIT: Every individual tweet MUST be ≤ 280 characters** (including spaces, punctuation, hashtags). Count carefully.
- Include one "bookmarkable" line (principle, checklist, framework)
- Minimal hashtags (0-2 max, counted within the 280 char limit)
- Fewer emojis than LinkedIn
- Optimize for replies and bookmarks

## SLAY Framework (use when angle is "slay")
If the selected_angle is "slay", structure the post/thread following this flow:
1. **Story** — Start with a personal insight or hook
2. **Lesson** — State the problem or key lesson
3. **Actionable advice** — Give concrete steps (works great as a thread)
4. **You** — Turn it back to the reader. Address them directly.
For single posts: compress the SLAY flow into one punchy post.
For threads: dedicate one tweet per section of the SLAY framework.

## Example High-Performing Posts
{example_posts}

## Task
Write 3 X post variants based on the plan:
1. "Single" - One punchy post, MUST be ≤ 280 characters total
2. "Bold" - More provocative take, MUST be ≤ 280 characters total
3. "Thread" - 3-5 post thread (separate posts with ---). EACH post MUST be ≤ 280 characters.

CRITICAL: Count characters carefully. If you cannot fit the message in 280 chars, use the Thread format. Every single tweet must be ≤ 280 characters with no exceptions.

Respond in JSON format:
{{
    "variants": [
        {{"label": "Single", "content": "Post text here (≤280 chars)..."}},
        {{"label": "Bold", "content": "Post text here (≤280 chars)..."}},
        {{"label": "Thread", "content": "Tweet 1 (≤280)\\n---\\nTweet 2 (≤280)\\n---\\nTweet 3 (≤280)"}}
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
- **CRITICAL: Every single tweet MUST be ≤ 280 characters**

Respond in JSON format:
{{
    "thread": [
        "Post 1 — hook (≤280 chars)...",
        "Post 2 (≤280 chars)...",
        "Post 3 (≤280 chars)...",
        "Post 4 — conclusion + CTA (≤280 chars)..."
    ]
}}"""

REGENERATE_REWRITE_PROMPT = """Rewrite this social media post based on the user's feedback.

Original post:
{content}

Platform: {platform}

Tone of Voice:
{tone_of_voice}

## User Feedback
{feedback}

## Task
Rewrite the post incorporating the user's feedback while:
- Keeping the core message/topic intact
- Matching the brand voice and tone
- Staying optimized for the platform
- Applying the specific direction the user asked for

Respond in JSON format:
{{
    "rewritten": "Full rewritten post text here..."
}}"""

