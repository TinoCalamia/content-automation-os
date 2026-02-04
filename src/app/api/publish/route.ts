import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';

// POST /api/publish - Publish a draft
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { draft_id, mode, external_post_id } = body;

    if (!draft_id || !mode) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'draft_id and mode are required',
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the draft to get workspace_id and platform
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('workspace_id, platform')
      .eq('id', draft_id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Draft not found',
      }, { status: 404 });
    }

    const draftData = draft as { workspace_id: string; platform: string };

    // Create published post record
    const { data, error } = await supabase
      .from('published_posts')
      .insert({
        workspace_id: draftData.workspace_id,
        platform: draftData.platform,
        draft_id,
        mode,
        external_post_id: external_post_id || null,
        published_at: new Date().toISOString(),
      } as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    // Update the source status to 'used' for any sources used in this draft
    const { data: draftFullData } = await supabase
      .from('drafts')
      .select('source_ids')
      .eq('id', draft_id)
      .single();

    if (draftFullData) {
      const sourceIds = (draftFullData as { source_ids: string[] | null }).source_ids;
      if (sourceIds && sourceIds.length > 0) {
        await supabase
          .from('sources')
          .update({ status: 'used' } as never)
          .in('id', sourceIds);
      }
    }

    return NextResponse.json<ApiResponse<{ published_post: unknown }>>({
      success: true,
      data: { published_post: data },
      message: 'Post published successfully',
    });

  } catch (error) {
    console.error('Error publishing:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to publish',
    }, { status: 500 });
  }
}

// GET /api/publish - List published posts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'workspace_id is required',
    }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('published_posts')
    .select('*, draft:drafts(content_text, platform)')
    .eq('workspace_id', workspaceId)
    .order('published_at', { ascending: false });

  if (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message,
    }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<{ posts: unknown[] }>>({
    success: true,
    data: { posts: data || [] },
  });
}
