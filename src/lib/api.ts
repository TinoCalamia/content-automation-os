// Centralized API client for frontend

import { logger } from './logger';
import type { ApiResponse } from '@/types/api';

class ApiClient {
  private baseUrl: string;
  private fastApiUrl: string;

  constructor() {
    this.baseUrl = '';
    this.fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useFastApi = false
  ): Promise<ApiResponse<T>> {
    const url = useFastApi ? `${this.fastApiUrl}${endpoint}` : `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('API request failed', {
          endpoint,
          status: response.status,
          error: data.error || data.message,
        });
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
        };
      }

      return data;
    } catch (error) {
      logger.error('API request error', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Sources
  async getSources(workspaceId: string, filters?: {
    type?: string;
    status?: string;
    tags?: string[];
  }) {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
    
    return this.request<{ sources: unknown[] }>(`/api/sources?${params}`);
  }

  async createSource(workspaceId: string, data: { input: string; tags?: string[] }) {
    return this.request<{ source: unknown }>('/api/sources', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, ...data }),
    });
  }

  async updateSource(sourceId: string, data: { title?: string; tags?: string[]; status?: string }) {
    return this.request<{ source: unknown }>(`/api/sources/${sourceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSource(sourceId: string) {
    return this.request<void>(`/api/sources/${sourceId}`, {
      method: 'DELETE',
    });
  }

  // KB Documents
  async getKBDocuments(workspaceId: string) {
    return this.request<{ documents: unknown[] }>(`/api/kb-documents?workspace_id=${workspaceId}`);
  }

  async createKBDocument(workspaceId: string, data: {
    key: string;
    title: string;
    content_md: string;
    is_active?: boolean;
  }) {
    return this.request<{ document: unknown }>('/api/kb-documents', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, ...data }),
    });
  }

  async updateKBDocument(documentId: string, data: {
    title?: string;
    content_md?: string;
    is_active?: boolean;
  }) {
    return this.request<{ document: unknown }>(`/api/kb-documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getKBDocumentVersions(documentId: string) {
    return this.request<{ versions: unknown[] }>(`/api/kb-documents/${documentId}/versions`);
  }

  async rollbackKBDocument(documentId: string, version: number) {
    return this.request<{ document: unknown }>(`/api/kb-documents/${documentId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
  }

  // Example Posts
  async getExamplePosts(workspaceId: string, platform?: 'linkedin' | 'x') {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (platform) params.append('platform', platform);
    
    return this.request<{ posts: unknown[] }>(`/api/example-posts?${params}`);
  }

  async createExamplePost(workspaceId: string, data: {
    platform: 'linkedin' | 'x';
    content_md: string;
    tags?: string[];
    metrics?: Record<string, number>;
  }) {
    return this.request<{ post: unknown }>('/api/example-posts', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, ...data }),
    });
  }

  async updateExamplePost(postId: string, data: {
    content_md?: string;
    tags?: string[];
    metrics?: Record<string, number>;
    is_active?: boolean;
  }) {
    return this.request<{ post: unknown }>(`/api/example-posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Drafts
  async getDrafts(workspaceId: string, filters?: {
    platform?: 'linkedin' | 'x';
    date?: string;
  }) {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (filters?.platform) params.append('platform', filters.platform);
    if (filters?.date) params.append('date', filters.date);
    
    return this.request<{ drafts: unknown[] }>(`/api/drafts?${params}`);
  }

  async getDraft(draftId: string) {
    return this.request<{ draft: unknown }>(`/api/drafts/${draftId}`);
  }

  async updateDraft(draftId: string, data: {
    content_text?: string;
    hashtags?: string[];
    scheduled_for?: string | null;
  }) {
    return this.request<{ draft: unknown }>(`/api/drafts/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDraft(draftId: string) {
    return this.request<void>(`/api/drafts/${draftId}`, {
      method: 'DELETE',
    });
  }

  // Generation (calls FastAPI)
  async generate(workspaceId: string, data: {
    platform: 'linkedin' | 'x';
    source_ids?: string[];
    angle?: string;
  }) {
    return this.request<{ result: unknown }>('/api/generation/generate', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, ...data }),
    }, true);
  }

  async regenerate(data: {
    draft_id: string;
    action: 'hook' | 'shorten' | 'direct' | 'storytelling' | 'cta' | 'thread' | 'rewrite';
    feedback?: string;
  }) {
    return this.request<{ result: unknown }>('/api/generation/regenerate', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  // Images (calls FastAPI)
  async generateImage(data: {
    draft_id: string;
    aspect_ratio?: '1:1' | '16:9';
    custom_prompt?: string;
  }) {
    return this.request<{ image: unknown }>('/api/images/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  // Publishing
  async publishDraft(data: {
    draft_id: string;
    mode: 'api' | 'manual';
    external_post_id?: string;
  }) {
    return this.request<{ published_post: unknown }>('/api/publish', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMetrics(publishedPostId: string, metrics: {
    impressions?: number;
    likes?: number;
    comments?: number;
    reposts?: number;
    clicks?: number;
  }) {
    return this.request<{ published_post: unknown }>(`/api/publish/${publishedPostId}/metrics`, {
      method: 'PATCH',
      body: JSON.stringify(metrics),
    });
  }

  // Enrichment (calls FastAPI)
  async enrichSource(sourceId: string) {
    return this.request<{ source: unknown }>(`/api/enrichment/enrich/${sourceId}`, {
      method: 'POST',
    }, true);
  }
}

export const apiClient = new ApiClient();
