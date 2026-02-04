'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Linkedin,
  Twitter,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { Draft } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface PublishDialogProps {
  draft: Draft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

const platformConfig: Record<string, { 
  icon: React.ElementType; 
  color: string; 
  label: string;
  url: string;
  composeUrl: string;
}> = {
  linkedin: { 
    icon: Linkedin, 
    color: 'text-blue-500', 
    label: 'LinkedIn',
    url: 'https://linkedin.com',
    composeUrl: 'https://www.linkedin.com/sharing/share-offsite/',
  },
  x: { 
    icon: Twitter, 
    color: 'text-foreground', 
    label: 'X',
    url: 'https://x.com',
    composeUrl: 'https://twitter.com/intent/tweet',
  },
};

export function PublishDialog({ draft, open, onOpenChange, onPublished }: PublishDialogProps) {
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const config = platformConfig[draft.platform] || platformConfig.linkedin;
  const Icon = config.icon;

  const fullText = draft.content_text + 
    (draft.hashtags?.length ? '\n\n' + draft.hashtags.map(t => `#${t}`).join(' ') : '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleOpenPlatform = () => {
    // For X, we can pre-fill the tweet
    if (draft.platform === 'x') {
      const tweetUrl = `${config.composeUrl}?text=${encodeURIComponent(fullText)}`;
      window.open(tweetUrl, '_blank');
    } else {
      // For LinkedIn, just open the feed
      window.open(config.url, '_blank');
    }
  };

  const handleMarkPublished = async () => {
    setPublishing(true);
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draft.id,
          mode: 'manual',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setPublished(true);
      toast.success('Marked as published!');
      onPublished?.();

      // Close dialog after a moment
      setTimeout(() => {
        onOpenChange(false);
        setPublished(false);
      }, 1500);
    } catch (error) {
      logger.error('Failed to mark as published', { error });
      toast.error('Failed to update');
    } finally {
      setPublishing(false);
    }
  };

  if (published) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <DialogTitle className="text-xl">Published!</DialogTitle>
            <DialogDescription className="mt-2">
              Your post has been marked as published on {config.label}
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${config.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Publish to {config.label}</DialogTitle>
              <DialogDescription>
                Copy your content and post it manually
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Content Preview</span>
              <Badge variant="secondary">
                {draft.content_text.length} chars
              </Badge>
            </div>
            <ScrollArea className="h-[200px] border border-border rounded-lg p-3">
              <p className="text-sm whitespace-pre-wrap">{fullText}</p>
            </ScrollArea>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Follow these steps to publish:
            </p>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleCopy}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 text-xs font-medium">
                  1
                </div>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy text to clipboard
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleOpenPlatform}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 text-xs font-medium">
                  2
                </div>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open {config.label}
              </Button>

              <Button
                className="w-full justify-start"
                onClick={handleMarkPublished}
                disabled={publishing}
              >
                <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center mr-3 text-xs font-medium">
                  3
                </div>
                {publishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as published
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
