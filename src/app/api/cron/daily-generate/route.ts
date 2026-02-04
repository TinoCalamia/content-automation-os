import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// This endpoint is called by Vercel Cron
// Configured in vercel.json to run at 05:30 UTC (07:30 Europe/Madrid)

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] Daily generation started');

  try {
    const supabase = await createServiceClient();
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

    // Get today's date for idempotency key
    const today = new Date().toISOString().split('T')[0];

    // Fetch all active workspaces
    const { data: workspacesData, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id, name');

    if (workspacesError) {
      throw new Error(`Failed to fetch workspaces: ${workspacesError.message}`);
    }

    const workspaces = workspacesData as { id: string; name: string }[] | null;

    if (!workspaces || workspaces.length === 0) {
      console.log('[Cron] No workspaces found');
      return NextResponse.json({ 
        success: true, 
        message: 'No workspaces to process',
        generated: 0 
      });
    }

    const results: { workspaceId: string; platform: string; status: string }[] = [];

    for (const workspace of workspaces) {
      // Process each platform
      for (const platform of ['linkedin', 'x']) {
        const idempotencyKey = `${today}_${platform}_${workspace.id}`;

        // Check if we already generated for this key today
        const { data: existingRun } = await supabase
          .from('generation_runs')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .single();

        if (existingRun) {
          console.log(`[Cron] Skipping ${platform} for workspace ${workspace.id} - already generated today`);
          results.push({ workspaceId: workspace.id, platform, status: 'skipped' });
          continue;
        }

        try {
          // Call FastAPI generation endpoint
          const response = await fetch(`${fastApiUrl}/api/generation/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspace_id: workspace.id,
              platform,
            }),
          });

          const data = await response.json();

          if (data.success) {
            results.push({ workspaceId: workspace.id, platform, status: 'success' });
            console.log(`[Cron] Generated ${platform} draft for workspace ${workspace.id}`);
          } else {
            throw new Error(data.error || 'Generation failed');
          }
        } catch (genError) {
          const errorMessage = genError instanceof Error ? genError.message : 'Unknown error';
          results.push({ workspaceId: workspace.id, platform, status: 'failed' });
          console.error(`[Cron] Failed to generate ${platform} for workspace ${workspace.id}: ${errorMessage}`);
        }
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    console.log(`[Cron] Daily generation completed: ${successful} success, ${failed} failed, ${skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: 'Daily generation completed',
      results: {
        successful,
        failed,
        skipped,
        total: results.length,
      },
    });

  } catch (error) {
    console.error('[Cron] Daily generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
