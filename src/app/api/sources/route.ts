import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';

// Detect source type from input
function detectSourceType(input: string): string {
  const trimmed = input.trim();
  
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const url = trimmed.toLowerCase();
    
    if (url.includes('linkedin.com')) return 'linkedin_url';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube_url';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'x_url';
    
    return 'blog_url';
  }
  
  return 'note';
}

// GET /api/sources - List sources
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id');
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const tagsParam = searchParams.getAll('tags');

  if (!workspaceId) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'workspace_id is required',
    }, { status: 400 });
  }

  const supabase = await createClient();

  let query = supabase
    .from('sources')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (tagsParam.length > 0) {
    query = query.overlaps('tags', tagsParam);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message,
    }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<{ sources: unknown[] }>>({
    success: true,
    data: { sources: data || [] },
  });
}

// POST /api/sources - Create source
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspace_id, input, type, tags = [] } = body;

    if (!workspace_id || !input) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'workspace_id and input are required',
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Detect type if not provided
    const sourceType = type || detectSourceType(input);
    const isUrl = sourceType !== 'note';

    // Create the source
    const sourceData = {
      workspace_id,
      type: sourceType,
      url: isUrl ? input.trim() : null,
      raw_text: !isUrl ? input.trim() : null,
      title: isUrl ? null : input.trim().slice(0, 100),
      tags,
      status: 'new',
    };

    const { data, error } = await supabase
      .from('sources')
      .insert(sourceData as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    // Trigger enrichment asynchronously (fire and forget)
    // In production, this would call the FastAPI enrichment endpoint
    if (isUrl && data) {
      const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const sourceId = (data as { id: string }).id;
      
      // Get session for auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      fetch(`${fastApiUrl}/api/enrichment/enrich/${sourceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      }).catch(() => {
        // Silently handle enrichment errors
        console.warn('Enrichment request failed, will retry later');
      });
    }

    return NextResponse.json<ApiResponse<{ source: unknown }>>({
      success: true,
      data: { source: data },
      message: 'Source created successfully',
    });

  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to create source',
    }, { status: 500 });
  }
}
