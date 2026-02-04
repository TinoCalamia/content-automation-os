import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';

// GET /api/kb-documents/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('kb_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message,
    }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json<ApiResponse<{ document: unknown }>>({
    success: true,
    data: { document: data },
  });
}

// PATCH /api/kb-documents/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { title, content_md, is_active } = body;

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content_md !== undefined) updateData.content_md = content_md;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('kb_documents')
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

    return NextResponse.json<ApiResponse<{ document: unknown }>>({
      success: true,
      data: { document: data },
      message: 'Document updated successfully',
    });

  } catch (error) {
    console.error('Error updating KB document:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update document',
    }, { status: 500 });
  }
}

// DELETE /api/kb-documents/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from('kb_documents')
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
    message: 'Document deleted successfully',
  });
}
