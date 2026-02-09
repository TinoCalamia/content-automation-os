-- Add funnel_stage column to drafts and published_posts tables
-- Supports content strategy analysis (TOFU/MOFU/BOFU classification)

-- Create the funnel_stage enum type
CREATE TYPE funnel_stage AS ENUM ('tofu', 'mofu', 'bofu');

-- Add funnel_stage column to drafts (nullable to support existing drafts)
ALTER TABLE drafts ADD COLUMN funnel_stage funnel_stage;

-- Add funnel_stage column to published_posts (nullable to support existing posts)
ALTER TABLE published_posts ADD COLUMN funnel_stage funnel_stage;

-- Create indexes for efficient filtering
CREATE INDEX idx_drafts_funnel_stage ON drafts(funnel_stage);
CREATE INDEX idx_published_posts_funnel_stage ON published_posts(funnel_stage);
