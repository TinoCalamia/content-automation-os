import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';

// GET /api/kb-documents - List KB documents
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
    .from('kb_documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('key');

  if (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message,
    }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<{ documents: unknown[] }>>({
    success: true,
    data: { documents: data || [] },
  });
}

// POST /api/kb-documents - Create KB document
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspace_id, key, title, content_md, is_active = true } = body;

    if (!workspace_id || !key || !title) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'workspace_id, key, and title are required',
      }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('kb_documents')
      .insert({
        workspace_id,
        key,
        title,
        content_md: content_md || '',
        is_active,
      } as never)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'A document with this key already exists in this workspace',
        }, { status: 400 });
      }
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<{ document: unknown }>>({
      success: true,
      data: { document: data },
      message: 'Document created successfully',
    });

  } catch (error) {
    console.error('Error creating KB document:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to create document',
    }, { status: 500 });
  }
}
