import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';
import type { Draft, GeneratedImage } from '@/types/database';

// GET /api/drafts - List drafts with images
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id');
  const platform = searchParams.get('platform');
  const date = searchParams.get('date');

  if (!workspaceId) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'workspace_id is required',
    }, { status: 400 });
  }

  const supabase = await createClient();

  let query = supabase
    .from('drafts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (platform) {
    query = query.eq('platform', platform);
  }

  if (date) {
    // Filter by date (created_at starts with the date)
    query = query.gte('created_at', `${date}T00:00:00`)
                 .lt('created_at', `${date}T23:59:59`);
  }

  const { data: drafts, error } = await query;

  if (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message,
    }, { status: 500 });
  }

  // Fetch images for all drafts
  const draftIds = (drafts || []).map(d => d.id);
  let images: GeneratedImage[] = [];
  
  if (draftIds.length > 0) {
    const { data: imageData } = await supabase
      .from('images')
      .select('*')
      .in('draft_id', draftIds)
      .order('created_at', { ascending: false });
    
    images = imageData || [];
  }

  // Attach images to drafts
  const draftsWithImages: Draft[] = (drafts || []).map(draft => ({
    ...draft,
    images: images.filter(img => img.draft_id === draft.id),
  }));

  return NextResponse.json<ApiResponse<{ drafts: Draft[] }>>({
    success: true,
    data: { drafts: draftsWithImages },
  });
}
