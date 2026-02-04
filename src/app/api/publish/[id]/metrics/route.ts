import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/api';

// PATCH /api/publish/[id]/metrics - Update metrics for a published post
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { impressions, likes, comments, reposts, clicks } = body;

    const supabase = await createClient();

    // Get existing metrics
    const { data: existing, error: fetchError } = await supabase
      .from('published_posts')
      .select('metrics')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Published post not found',
      }, { status: 404 });
    }

    const existingData = existing as { metrics: Record<string, number> | null } | null;

    // Merge with existing metrics
    const newMetrics = {
      ...(existingData?.metrics || {}),
      ...(impressions !== undefined && { impressions }),
      ...(likes !== undefined && { likes }),
      ...(comments !== undefined && { comments }),
      ...(reposts !== undefined && { reposts }),
      ...(clicks !== undefined && { clicks }),
    };

    const { data, error } = await supabase
      .from('published_posts')
      .update({ metrics: newMetrics } as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<{ published_post: unknown }>>({
      success: true,
      data: { published_post: data },
      message: 'Metrics updated successfully',
    });

  } catch (error) {
    console.error('Error updating metrics:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update metrics',
    }, { status: 500 });
  }
}
