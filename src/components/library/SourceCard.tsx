'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Linkedin,
  Youtube,
  Twitter,
  Globe,
  FileText,
  MoreVertical,
  ExternalLink,
  Trash2,
  RefreshCw,
  Archive,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import type { Source } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface SourceCardProps {
  source: Source;
  onSelect?: (source: Source) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEnrich?: (id: string) => void;
  selected?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  linkedin_url: Linkedin,
  youtube_url: Youtube,
  x_url: Twitter,
  blog_url: Globe,
  note: FileText,
  file: FileText,
};

const typeColors: Record<string, string> = {
  linkedin_url: 'text-blue-500',
  youtube_url: 'text-red-500',
  x_url: 'text-foreground',
  blog_url: 'text-emerald-500',
  note: 'text-amber-500',
  file: 'text-purple-500',
};

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  new: { icon: Clock, label: 'New', color: 'text-muted-foreground' },
  enriched: { icon: CheckCircle2, label: 'Enriched', color: 'text-emerald-500' },
  used: { icon: CheckCircle2, label: 'Used', color: 'text-blue-500' },
  archived: { icon: Archive, label: 'Archived', color: 'text-muted-foreground' },
};

export function SourceCard({
  source,
  onSelect,
  onDelete,
  onArchive,
  onEnrich,
  selected,
}: SourceCardProps) {
  const [loading, setLoading] = useState(false);

  const Icon = typeIcons[source.type] || FileText;
  const iconColor = typeColors[source.type] || 'text-muted-foreground';
  const status = statusConfig[source.status] || statusConfig.new;
  const StatusIcon = status.icon;

  const displayTitle = source.title || source.url || 'Untitled';
  const displaySummary = source.summary || source.cleaned_text?.slice(0, 150) || source.raw_text?.slice(0, 150);

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
    <Card
      className={`bg-card/50 border-border/50 hover:bg-card/80 transition-all cursor-pointer group ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect?.(source)}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
            <span className={status.color}>{status.label}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {source.url && (
              <DropdownMenuItem asChild>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open original
                </a>
              </DropdownMenuItem>
            )}
            {source.status === 'new' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEnrich(); }} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Enrich now
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onArchive && source.status !== 'archived' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(source.id); }}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(source.id); }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        <h3 className="font-medium line-clamp-2 text-sm">{displayTitle}</h3>
        {displaySummary && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {displaySummary}
          </p>
        )}
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-wrap gap-1">
            {source.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {source.tags && source.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{source.tags.length - 3}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
