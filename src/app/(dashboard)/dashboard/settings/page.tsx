'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Settings,
  Building2,
  TrendingUp,
  Linkedin,
  Twitter,
  Calendar,
  Loader2,
  Save,
} from 'lucide-react';
import type { PublishedPost } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { formatDistanceToNow, format } from 'date-fns';

export default function SettingsPage() {
  const { currentWorkspace, user } = useAuth();
  const [publishedPosts, setPublishedPosts] = useState<(PublishedPost & { draft?: { content_text: string; platform: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PublishedPost | null>(null);
  const [metrics, setMetrics] = useState({
    impressions: '',
    likes: '',
    comments: '',
    reposts: '',
    clicks: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchPublishedPosts = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/publish?workspace_id=${currentWorkspace.id}`);
      const data = await response.json();

      if (data.success) {
        setPublishedPosts(data.data.posts);
      }
    } catch (error) {
      logger.error('Failed to fetch published posts', { error });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchPublishedPosts();
  }, [fetchPublishedPosts]);

  const handleSelectPost = (post: PublishedPost) => {
    setSelectedPost(post);
    const existingMetrics = post.metrics || {};
    setMetrics({
      impressions: existingMetrics.impressions?.toString() || '',
      likes: existingMetrics.likes?.toString() || '',
      comments: existingMetrics.comments?.toString() || '',
      reposts: existingMetrics.reposts?.toString() || '',
      clicks: existingMetrics.clicks?.toString() || '',
    });
  };

  const handleSaveMetrics = async () => {
    if (!selectedPost) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/publish/${selectedPost.id}/metrics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          impressions: metrics.impressions ? parseInt(metrics.impressions) : undefined,
          likes: metrics.likes ? parseInt(metrics.likes) : undefined,
          comments: metrics.comments ? parseInt(metrics.comments) : undefined,
          reposts: metrics.reposts ? parseInt(metrics.reposts) : undefined,
          clicks: metrics.clicks ? parseInt(metrics.clicks) : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      toast.success('Metrics saved!');
      setSelectedPost(null);
      fetchPublishedPosts();
    } catch (error) {
      logger.error('Failed to save metrics', { error });
      toast.error('Failed to save metrics');
    } finally {
      setSaving(false);
    }
  };

  const platformIcon = {
    linkedin: Linkedin,
    x: Twitter,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace and track post performance
        </p>
      </div>

      {/* Workspace Info */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Workspace
          </CardTitle>
          <CardDescription>Current workspace details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <p className="font-medium">{currentWorkspace?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Your Role</Label>
              <p className="font-medium capitalize">{currentWorkspace?.role}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Workspace ID</Label>
              <p className="font-mono text-xs text-muted-foreground">{currentWorkspace?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Post Analytics
          </CardTitle>
          <CardDescription>
            Track performance of your published posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : publishedPosts.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                No published posts yet. Publish some content to track performance!
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {publishedPosts.map((post) => {
                  const Icon = platformIcon[post.platform as keyof typeof platformIcon] || Linkedin;
                  const hasMetrics = post.metrics && Object.keys(post.metrics).length > 0;

                  return (
                    <Dialog key={post.id}>
                      <DialogTrigger asChild>
                        <div
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleSelectPost(post)}
                        >
                          <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${post.platform === 'linkedin' ? 'text-blue-500' : 'text-foreground'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {post.draft?.content_text?.slice(0, 60)}...
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {post.mode}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(post.published_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {hasMetrics && (
                              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                {post.metrics?.impressions && (
                                  <span>{post.metrics.impressions.toLocaleString()} views</span>
                                )}
                                {post.metrics?.likes && (
                                  <span>{post.metrics.likes.toLocaleString()} likes</span>
                                )}
                                {post.metrics?.comments && (
                                  <span>{post.metrics.comments.toLocaleString()} comments</span>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {hasMetrics ? 'Has metrics' : 'Add metrics'}
                          </Badge>
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Post Metrics</DialogTitle>
                          <DialogDescription>
                            Enter the performance metrics from {post.platform}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="impressions">Impressions</Label>
                            <Input
                              id="impressions"
                              type="number"
                              placeholder="0"
                              value={metrics.impressions}
                              onChange={(e) => setMetrics({ ...metrics, impressions: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="likes">Likes</Label>
                            <Input
                              id="likes"
                              type="number"
                              placeholder="0"
                              value={metrics.likes}
                              onChange={(e) => setMetrics({ ...metrics, likes: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="comments">Comments</Label>
                            <Input
                              id="comments"
                              type="number"
                              placeholder="0"
                              value={metrics.comments}
                              onChange={(e) => setMetrics({ ...metrics, comments: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reposts">Reposts</Label>
                            <Input
                              id="reposts"
                              type="number"
                              placeholder="0"
                              value={metrics.reposts}
                              onChange={(e) => setMetrics({ ...metrics, reposts: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="clicks">Link Clicks</Label>
                            <Input
                              id="clicks"
                              type="number"
                              placeholder="0"
                              value={metrics.clicks}
                              onChange={(e) => setMetrics({ ...metrics, clicks: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            onClick={handleSaveMetrics}
                            disabled={saving}
                          >
                            {saving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Metrics
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Scheduling Info */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Automated Generation
          </CardTitle>
          <CardDescription>Daily content generation schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Daily Generation</p>
              <p className="text-sm text-muted-foreground">
                Runs every day at 07:30 Europe/Madrid (05:30 UTC)
              </p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            The system automatically generates 1 LinkedIn draft and 1 X draft daily.
            You can also trigger generation manually from the Generate page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
