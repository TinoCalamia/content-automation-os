import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';

// GET /api/sources/[id] - Get single source
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message,
    }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json<ApiResponse<{ source: unknown }>>({
    success: true,
    data: { source: data },
  });
}

// PATCH /api/sources/[id] - Update source
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { title, tags, status } = body;

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('sources')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
      }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }

    return NextResponse.json<ApiResponse<{ source: unknown }>>({
      success: true,
      data: { source: data },
      message: 'Source updated successfully',
    });

  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update source',
    }, { status: 500 });
  }
}

// DELETE /api/sources/[id] - Delete source
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from('sources')
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
    message: 'Source deleted successfully',
  });
}
