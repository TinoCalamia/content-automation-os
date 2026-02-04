'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Linkedin,
  Youtube,
  Twitter,
  Globe,
  FileText,
  ExternalLink,
  RefreshCw,
  X,
  Loader2,
  User,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import type { Source } from '@/types/database';
import { formatDistanceToNow, format } from 'date-fns';

interface SourceDetailProps {
  source: Source;
  onClose: () => void;
  onEnrich?: (id: string) => Promise<void>;
}

const typeIcons: Record<string, React.ElementType> = {
  linkedin_url: Linkedin,
  youtube_url: Youtube,
  x_url: Twitter,
  blog_url: Globe,
  note: FileText,
  file: FileText,
};

export function SourceDetail({ source, onClose, onEnrich }: SourceDetailProps) {
  const [loading, setLoading] = useState(false);
  const Icon = typeIcons[source.type] || FileText;

  const handleEnrich = async () => {
    if (!onEnrich) return;
    setLoading(true);
    try {
      await onEnrich(source.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
            <CardTitle className="text-lg truncate">
              {source.title || 'Untitled'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="capitalize">
              {source.status}
            </Badge>
            <span>
              Added {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {source.author && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{source.author}</span>
            </div>
          )}
          {source.published_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(source.published_at), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Thumbnail */}
        {source.thumbnail_url && (
          <div className="rounded-lg overflow-hidden bg-muted aspect-video">
            <img
              src={source.thumbnail_url}
              alt={source.title || 'Thumbnail'}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Tags */}
        {source.tags && source.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {source.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Content Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="keypoints">Key Points</TabsTrigger>
            <TabsTrigger value="raw">Raw Text</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="summary" className="h-full m-0">
              <ScrollArea className="h-full">
                {source.summary ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {source.summary}
                  </p>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      No summary yet. Enrich this source to generate one.
                    </p>
                    {onEnrich && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleEnrich}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Enrich Now
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="keypoints" className="h-full m-0">
              <ScrollArea className="h-full">
                {source.key_points && source.key_points.length > 0 ? (
                  <ul className="space-y-2">
                    {source.key_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium">{index + 1}.</span>
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No key points extracted yet.
                  </p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="raw" className="h-full m-0">
              <ScrollArea className="h-full">
                {source.cleaned_text || source.raw_text ? (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {source.cleaned_text || source.raw_text}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No text content available.
                  </p>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {/* Actions */}
        {source.url && (
          <div className="pt-4 border-t border-border">
            <Button variant="outline" className="w-full" asChild>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Original
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
