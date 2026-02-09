// Database types for Supabase tables

export type SourceType = 
  | 'linkedin_url'
  | 'youtube_url'
  | 'blog_url'
  | 'x_url'
  | 'podcast_url'
  | 'note'
  | 'file';

export type SourceStatus = 'new' | 'enriched' | 'used' | 'archived';

export type Platform = 'linkedin' | 'x';

export type GenerationTrigger = 'cron' | 'manual';

export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type PublishMode = 'api' | 'manual';

export type FunnelStage = 'tofu' | 'mofu' | 'bofu';

export type KBDocumentKey = 
  | 'tone_of_voice'
  | 'brand_guidelines'
  | 'linkedin_algorithm'
  | 'x_algorithm'
  | 'quality_rubric';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
}

export interface Source {
  id: string;
  workspace_id: string;
  type: SourceType;
  url: string | null;
  title: string | null;
  author: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  raw_text: string | null;
  cleaned_text: string | null;
  summary: string | null;
  key_points: string[] | null;
  tags: string[];
  status: SourceStatus;
  created_at: string;
  updated_at: string;
}

export interface KBDocument {
  id: string;
  workspace_id: string;
  key: KBDocumentKey;
  title: string;
  content_md: string;
  version: number;
  is_active: boolean;
  previous_versions: { version: number; content_md: string; updated_at: string }[];
  created_at: string;
  updated_at: string;
}

export interface ExamplePost {
  id: string;
  workspace_id: string;
  platform: Platform;
  content_md: string;
  metrics: {
    impressions?: number;
    likes?: number;
    comments?: number;
    reposts?: number;
    clicks?: number;
  } | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenerationRun {
  id: string;
  workspace_id: string;
  trigger: GenerationTrigger;
  status: GenerationStatus;
  started_at: string | null;
  finished_at: string | null;
  inputs: {
    source_ids: string[];
    kb_doc_versions: Record<string, number>;
  } | null;
  logs: { step: string; message: string; timestamp: string }[];
  created_at: string;
}

export interface Draft {
  id: string;
  workspace_id: string;
  platform: Platform;
  run_id: string | null;
  content_text: string;
  variants: {
    label: string;
    content: string;
  }[];
  hashtags: string[];
  scheduled_for: string | null;
  source_ids: string[];
  funnel_stage: FunnelStage | null;
  created_at: string;
  updated_at: string;
  images?: GeneratedImage[];
}

export interface GeneratedImage {
  id: string;
  workspace_id: string;
  draft_id: string | null;
  prompt: string;
  model: string;
  storage_path: string;
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:5';
  style?: string;
  created_at: string;
}

export interface ConnectedAccount {
  id: string;
  workspace_id: string;
  platform: Platform;
  oauth_data_encrypted: string;
  status: 'connected' | 'expired' | 'error';
  created_at: string;
  updated_at: string;
}

export interface PublishedPost {
  id: string;
  workspace_id: string;
  platform: Platform;
  draft_id: string;
  external_post_id: string | null;
  published_at: string;
  mode: PublishMode;
  funnel_stage: FunnelStage | null;
  metrics: {
    impressions?: number;
    likes?: number;
    comments?: number;
    reposts?: number;
    clicks?: number;
  } | null;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, 'id' | 'created_at'>;
        Update: Partial<Omit<Workspace, 'id'>>;
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: WorkspaceMember;
        Update: Partial<WorkspaceMember>;
      };
      sources: {
        Row: Source;
        Insert: Omit<Source, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Source, 'id'>>;
      };
      kb_documents: {
        Row: KBDocument;
        Insert: Omit<KBDocument, 'id' | 'created_at' | 'updated_at' | 'version' | 'previous_versions'>;
        Update: Partial<Omit<KBDocument, 'id'>>;
      };
      example_posts: {
        Row: ExamplePost;
        Insert: Omit<ExamplePost, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ExamplePost, 'id'>>;
      };
      generation_runs: {
        Row: GenerationRun;
        Insert: Omit<GenerationRun, 'id' | 'created_at'>;
        Update: Partial<Omit<GenerationRun, 'id'>>;
      };
      drafts: {
        Row: Draft;
        Insert: Omit<Draft, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Draft, 'id'>>;
      };
      images: {
        Row: GeneratedImage;
        Insert: Omit<GeneratedImage, 'id' | 'created_at'>;
        Update: Partial<Omit<GeneratedImage, 'id'>>;
      };
      connected_accounts: {
        Row: ConnectedAccount;
        Insert: Omit<ConnectedAccount, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ConnectedAccount, 'id'>>;
      };
      published_posts: {
        Row: PublishedPost;
        Insert: Omit<PublishedPost, 'id'>;
        Update: Partial<Omit<PublishedPost, 'id'>>;
      };
    };
  };
}
