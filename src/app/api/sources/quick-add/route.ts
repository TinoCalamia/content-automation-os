import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@/types/api';

/**
 * Detect source type from a URL string.
 * Reuses the same logic as POST /api/sources.
 */
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

/** CORS headers for cross-origin requests from the Chrome extension */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * POST /api/sources/quick-add
 *
 * Create a source using Bearer token auth (for the Chrome extension).
 * Accepts: { url, title?, description?, tags? }
 * Auth: Authorization: Bearer <supabase_access_token>
 */
export async function POST(request: Request) {
  try {
    // ---- Authenticate via Bearer token ----
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authorization header with Bearer token is required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create a Supabase client authenticated with the user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    // Verify the user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid or expired token. Please reconnect.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // ---- Parse request body ----
    const body = await request.json();
    const { url, title, description, tags = [] } = body;

    if (!url) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'URL is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // ---- Resolve workspace ----
    const { data: memberships, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1);

    if (memberError || !memberships || memberships.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'No workspace found. Please create one in the dashboard first.',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const workspaceId = memberships[0].workspace_id;

    // ---- Create source ----
    const sourceType = detectSourceType(url);
    const isUrl = sourceType !== 'note';

    const sourceData = {
      workspace_id: workspaceId,
      type: sourceType,
      url: isUrl ? url.trim() : null,
      raw_text: !isUrl ? url.trim() : description || null,
      title: title || null,
      tags: Array.isArray(tags) ? tags : [],
      status: 'new',
    };

    const { data, error } = await supabase
      .from('sources')
      .insert(sourceData as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // ---- Trigger enrichment asynchronously ----
    if (isUrl && data) {
      const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const sourceId = (data as { id: string }).id;

      fetch(`${fastApiUrl}/api/enrichment/enrich/${sourceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {
        console.warn('Enrichment request failed, will retry later');
      });
    }

    return NextResponse.json<ApiResponse<{ source: unknown }>>(
      {
        success: true,
        data: { source: data },
        message: 'Source saved successfully',
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in quick-add:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to save source' },
      { status: 500, headers: corsHeaders }
    );
  }
}
