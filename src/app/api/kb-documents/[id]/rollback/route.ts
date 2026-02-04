import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';

// POST /api/kb-documents/[id]/rollback - Rollback to a previous version
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { version } = body;

    if (typeof version !== 'number') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'version number is required',
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the document with versions
    const { data: docData, error: fetchError } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !docData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Document not found',
      }, { status: 404 });
    }

    const doc = docData as { id: string; previous_versions: unknown };

    // Find the requested version in previous_versions
    const previousVersions = doc.previous_versions as Array<{
      version: number;
      content_md: string;
      updated_at: string;
    }> | null;

    const targetVersion = previousVersions?.find((v) => v.version === version);

    if (!targetVersion) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Version ${version} not found`,
      }, { status: 404 });
    }

    // Update the document with the old content
    // The trigger will handle versioning the current content
    const { data, error } = await supabase
      .from('kb_documents')
      .update({ content_md: targetVersion.content_md } as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<{ document: unknown }>>({
      success: true,
      data: { document: data },
      message: `Rolled back to version ${version}`,
    });

  } catch (error) {
    console.error('Error rolling back document:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to rollback document',
    }, { status: 500 });
  }
}
