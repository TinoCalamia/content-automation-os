-- Content Automation Hub Database Schema
-- Initial migration: Core tables and RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE source_type AS ENUM (
  'linkedin_url',
  'youtube_url', 
  'blog_url',
  'x_url',
  'podcast_url',
  'note',
  'file'
);

CREATE TYPE source_status AS ENUM (
  'new',
  'enriched',
  'used',
  'archived'
);

CREATE TYPE platform AS ENUM (
  'linkedin',
  'x'
);

CREATE TYPE generation_trigger AS ENUM (
  'cron',
  'manual'
);

CREATE TYPE generation_status AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed'
);

CREATE TYPE publish_mode AS ENUM (
  'api',
  'manual'
);

CREATE TYPE account_status AS ENUM (
  'connected',
  'expired',
  'error'
);

CREATE TYPE kb_document_key AS ENUM (
  'tone_of_voice',
  'brand_guidelines',
  'linkedin_algorithm',
  'x_algorithm',
  'quality_rubric'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type source_type NOT NULL,
  url TEXT,
  title TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  thumbnail_url TEXT,
  raw_text TEXT,
  cleaned_text TEXT,
  summary TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  status source_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KB Documents (Background Files)
CREATE TABLE kb_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key kb_document_key NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  previous_versions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, key)
);

-- Example Posts
CREATE TABLE example_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform platform NOT NULL,
  content_md TEXT NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generation Runs
CREATE TABLE generation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  trigger generation_trigger NOT NULL,
  status generation_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  inputs JSONB DEFAULT '{}'::jsonb,
  logs JSONB DEFAULT '[]'::jsonb,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

-- Drafts
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform platform NOT NULL,
  run_id UUID REFERENCES generation_runs(id) ON DELETE SET NULL,
  content_text TEXT NOT NULL,
  variants JSONB DEFAULT '[]'::jsonb,
  hashtags TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  source_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Images
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES drafts(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Connected Accounts
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform platform NOT NULL,
  oauth_data_encrypted TEXT,
  status account_status NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, platform)
);

-- Published Posts
CREATE TABLE published_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform platform NOT NULL,
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  external_post_id TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mode publish_mode NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_sources_workspace_id ON sources(workspace_id);
CREATE INDEX idx_sources_status ON sources(status);
CREATE INDEX idx_sources_type ON sources(type);
CREATE INDEX idx_sources_created_at ON sources(created_at DESC);

CREATE INDEX idx_kb_documents_workspace_id ON kb_documents(workspace_id);
CREATE INDEX idx_kb_documents_key ON kb_documents(key);

CREATE INDEX idx_example_posts_workspace_id ON example_posts(workspace_id);
CREATE INDEX idx_example_posts_platform ON example_posts(platform);

CREATE INDEX idx_generation_runs_workspace_id ON generation_runs(workspace_id);
CREATE INDEX idx_generation_runs_status ON generation_runs(status);
CREATE INDEX idx_generation_runs_idempotency ON generation_runs(idempotency_key);

CREATE INDEX idx_drafts_workspace_id ON drafts(workspace_id);
CREATE INDEX idx_drafts_platform ON drafts(platform);
CREATE INDEX idx_drafts_created_at ON drafts(created_at DESC);

CREATE INDEX idx_images_workspace_id ON images(workspace_id);
CREATE INDEX idx_images_draft_id ON images(draft_id);

CREATE INDEX idx_published_posts_workspace_id ON published_posts(workspace_id);
CREATE INDEX idx_published_posts_draft_id ON published_posts(draft_id);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_documents_updated_at
  BEFORE UPDATE ON kb_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_example_posts_updated_at
  BEFORE UPDATE ON example_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE example_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;

-- Helper function to check workspace membership
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspaces: Owner can see their workspaces
CREATE POLICY "Users can view their own workspaces"
  ON workspaces FOR SELECT
  USING (owner_id = auth.uid() OR is_workspace_member(id));

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace Members: Members can see other members
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Owners/admins can manage members"
  ON workspace_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Sources: Workspace members can access
CREATE POLICY "Members can view sources"
  ON sources FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create sources"
  ON sources FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update sources"
  ON sources FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete sources"
  ON sources FOR DELETE
  USING (is_workspace_member(workspace_id));

-- KB Documents: Workspace members can access
CREATE POLICY "Members can view kb_documents"
  ON kb_documents FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create kb_documents"
  ON kb_documents FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update kb_documents"
  ON kb_documents FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete kb_documents"
  ON kb_documents FOR DELETE
  USING (is_workspace_member(workspace_id));

-- Example Posts: Workspace members can access
CREATE POLICY "Members can view example_posts"
  ON example_posts FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create example_posts"
  ON example_posts FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update example_posts"
  ON example_posts FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete example_posts"
  ON example_posts FOR DELETE
  USING (is_workspace_member(workspace_id));

-- Generation Runs: Workspace members can access
CREATE POLICY "Members can view generation_runs"
  ON generation_runs FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create generation_runs"
  ON generation_runs FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update generation_runs"
  ON generation_runs FOR UPDATE
  USING (is_workspace_member(workspace_id));

-- Drafts: Workspace members can access
CREATE POLICY "Members can view drafts"
  ON drafts FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create drafts"
  ON drafts FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update drafts"
  ON drafts FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete drafts"
  ON drafts FOR DELETE
  USING (is_workspace_member(workspace_id));

-- Images: Workspace members can access
CREATE POLICY "Members can view images"
  ON images FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create images"
  ON images FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete images"
  ON images FOR DELETE
  USING (is_workspace_member(workspace_id));

-- Connected Accounts: Workspace members can access
CREATE POLICY "Members can view connected_accounts"
  ON connected_accounts FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can manage connected_accounts"
  ON connected_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = connected_accounts.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Published Posts: Workspace members can access
CREATE POLICY "Members can view published_posts"
  ON published_posts FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create published_posts"
  ON published_posts FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update published_posts"
  ON published_posts FOR UPDATE
  USING (is_workspace_member(workspace_id));

-- ============================================
-- STORAGE BUCKET
-- ============================================

-- Note: Run this in Supabase Dashboard or via API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('generated-images', 'generated-images', true);

-- Storage RLS policies would be:
-- CREATE POLICY "Workspace members can upload images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'generated-images' 
--     AND (storage.foldername(name))[1] = 'images'
--   );

-- CREATE POLICY "Anyone can view images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'generated-images');

-- ============================================
-- FUNCTION: Create workspace with owner membership
-- ============================================

CREATE OR REPLACE FUNCTION create_workspace_with_owner(
  workspace_name TEXT
)
RETURNS UUID AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create workspace
  INSERT INTO workspaces (name, owner_id)
  VALUES (workspace_name, auth.uid())
  RETURNING id INTO new_workspace_id;
  
  -- Add owner as member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, auth.uid(), 'owner');
  
  RETURN new_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Version KB document on update
-- ============================================

CREATE OR REPLACE FUNCTION version_kb_document()
RETURNS TRIGGER AS $$
BEGIN
  -- Store previous version
  IF OLD.content_md IS DISTINCT FROM NEW.content_md THEN
    NEW.previous_versions = jsonb_build_array(
      jsonb_build_object(
        'version', OLD.version,
        'content_md', OLD.content_md,
        'updated_at', OLD.updated_at
      )
    ) || COALESCE(OLD.previous_versions, '[]'::jsonb);
    
    -- Increment version
    NEW.version = OLD.version + 1;
    
    -- Keep only last 10 versions
    IF jsonb_array_length(NEW.previous_versions) > 10 THEN
      NEW.previous_versions = (
        SELECT jsonb_agg(elem)
        FROM (
          SELECT elem
          FROM jsonb_array_elements(NEW.previous_versions) AS elem
          LIMIT 10
        ) sub
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER version_kb_document_trigger
  BEFORE UPDATE ON kb_documents
  FOR EACH ROW EXECUTE FUNCTION version_kb_document();
