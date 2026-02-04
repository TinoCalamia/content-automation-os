'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function OnboardingPage() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, refreshWorkspaces } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Create workspace using the database function
      const { data, error: rpcError } = await supabase
        .rpc('create_workspace_with_owner' as never, {
          workspace_name: workspaceName.trim()
        } as never);

      if (rpcError) throw rpcError;

      logger.info('Workspace created', { workspaceId: data });

      // Refresh workspaces in context
      await refreshWorkspaces();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      logger.error('Failed to create workspace', { error: err });
      setError('Failed to create workspace. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-grid p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl tracking-tight">
              Welcome! Let&apos;s get started
            </CardTitle>
            <CardDescription className="text-base">
              Create your first workspace to organize your content
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace name</Label>
              <Input
                id="workspace"
                type="text"
                placeholder="My Content Hub"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                disabled={loading}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                You can change this later in settings
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !workspaceName.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating workspace...
                </>
              ) : (
                <>
                  Create workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
