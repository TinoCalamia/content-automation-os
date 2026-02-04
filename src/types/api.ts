// API types for request/response payloads

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Source API types
export interface CreateSourceRequest {
  input: string; // URL or text content
  type?: string; // Auto-detected if not provided
  tags?: string[];
}

export interface UpdateSourceRequest {
  title?: string;
  tags?: string[];
  status?: 'new' | 'enriched' | 'used' | 'archived';
  notes?: string;
}

// KB Document API types
export interface CreateKBDocumentRequest {
  key: string;
  title: string;
  content_md: string;
  is_active?: boolean;
}

export interface UpdateKBDocumentRequest {
  title?: string;
  content_md?: string;
  is_active?: boolean;
}

// Example Post API types
export interface CreateExamplePostRequest {
  platform: 'linkedin' | 'x';
  content_md: string;
  tags?: string[];
  metrics?: {
    impressions?: number;
    likes?: number;
    comments?: number;
    reposts?: number;
    clicks?: number;
  };
}

export interface UpdateExamplePostRequest {
  content_md?: string;
  tags?: string[];
  metrics?: {
    impressions?: number;
    likes?: number;
    comments?: number;
    reposts?: number;
    clicks?: number;
  };
  is_active?: boolean;
}

// Generation API types
export interface GenerateRequest {
  platform: 'linkedin' | 'x';
  source_ids?: string[];
  angle?: 'contrarian' | 'how-to' | 'lesson' | 'framework' | 'story' | 'tip';
}

export interface RegenerateRequest {
  draft_id: string;
  action: 'hook' | 'shorten' | 'direct' | 'storytelling' | 'cta' | 'thread';
}

export interface GenerationResult {
  draft_id: string;
  platform: 'linkedin' | 'x';
  content: string;
  variants: { label: string; content: string }[];
  hashtags: string[];
  source_ids: string[];
  image?: {
    id: string;
    url: string;
    prompt: string;
  };
}

// Draft API types
export interface UpdateDraftRequest {
  content_text?: string;
  hashtags?: string[];
  scheduled_for?: string | null;
}

// Publish API types
export interface PublishRequest {
  draft_id: string;
  mode: 'api' | 'manual';
  external_post_id?: string;
}

export interface UpdateMetricsRequest {
  impressions?: number;
  likes?: number;
  comments?: number;
  reposts?: number;
  clicks?: number;
}

// Image API types
export interface GenerateImageRequest {
  draft_id: string;
  aspect_ratio?: '1:1' | '16:9';
  custom_prompt?: string;
}

// Enrichment API types
export interface EnrichmentResult {
  title: string | null;
  author: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  raw_text: string | null;
  cleaned_text: string | null;
  summary: string | null;
  key_points: string[] | null;
}
