import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';
import type { Draft } from '@/types/database';

// GET /api/drafts/[id] - with images
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message,
    }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  // Fetch images for this draft
  const { data: images } = await supabase
    .from('images')
    .select('*')
    .eq('draft_id', id)
    .order('created_at', { ascending: false });

  const draftWithImages: Draft = {
    ...data,
    images: images || [],
  };

  return NextResponse.json<ApiResponse<{ draft: Draft }>>({
    success: true,
    data: { draft: draftWithImages },
  });
}

// PATCH /api/drafts/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { content_text, hashtags, scheduled_for, funnel_stage } = body;

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (content_text !== undefined) updateData.content_text = content_text;
    if (hashtags !== undefined) updateData.hashtags = hashtags;
    if (scheduled_for !== undefined) updateData.scheduled_for = scheduled_for;
    if (funnel_stage) updateData.funnel_stage = funnel_stage;

    const { data, error } = await supabase
      .from('drafts')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating draft:', error.code, error.message, error.details);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
      }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }

    return NextResponse.json<ApiResponse<{ draft: unknown }>>({
      success: true,
      data: { draft: data },
      message: 'Draft updated successfully',
    });

  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update draft',
    }, { status: 500 });
  }
}

// DELETE /api/drafts/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from('drafts')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message,
    }, { status: 500 });
  }

  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Draft deleted successfully',
  });
}
