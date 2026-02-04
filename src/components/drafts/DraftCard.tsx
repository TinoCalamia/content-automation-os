'use client';

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
  Twitter,
  MoreVertical,
  Copy,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import type { Draft } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface DraftCardProps {
  draft: Draft;
  onSelect?: (draft: Draft) => void;
  onDelete?: (id: string) => void;
  onCopy?: (draft: Draft) => void;
  selected?: boolean;
}

const platformConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  linkedin: { icon: Linkedin, color: 'text-blue-500', label: 'LinkedIn' },
  x: { icon: Twitter, color: 'text-foreground', label: 'X' },
};

export function DraftCard({
  draft,
  onSelect,
  onDelete,
  onCopy,
  selected,
}: DraftCardProps) {
  const config = platformConfig[draft.platform] || platformConfig.linkedin;
  const Icon = config.icon;

  const preview = draft.content_text.slice(0, 150);
  const hasVariants = draft.variants && draft.variants.length > 0;
  const hasImages = draft.images && draft.images.length > 0;

  return (
    <Card
      className={`bg-card/50 border-border/50 hover:bg-card/80 transition-all cursor-pointer group ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect?.(draft)}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${config.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <Badge variant="secondary" className="text-xs">
              {config.label}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy?.(draft); }}>
              <Copy className="mr-2 h-4 w-4" />
              Copy text
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(draft.id); }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm line-clamp-4 whitespace-pre-wrap">
          {preview}{preview.length < draft.content_text.length && '...'}
        </p>

        {/* Image thumbnails */}
        {hasImages && (
          <div className="flex gap-2">
            {draft.images!.slice(0, 2).map((img) => (
              <div
                key={img.id}
                className="relative w-16 h-16 rounded-md overflow-hidden bg-muted border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.storage_path.startsWith('http') ? img.storage_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/generated-images/${img.storage_path}`}
                  alt="Generated"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder on error
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center bg-muted">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            ))}
            {draft.images!.length > 2 && (
              <div className="w-16 h-16 rounded-md bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground">
                +{draft.images!.length - 2}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasVariants && (
              <Badge variant="outline" className="text-xs">
                {draft.variants.length} variants
              </Badge>
            )}
            {draft.hashtags && draft.hashtags.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {draft.hashtags.length} hashtags
              </Badge>
            )}
            {hasImages && (
              <Badge variant="outline" className="text-xs">
                <ImageIcon className="mr-1 h-3 w-3" />
                {draft.images!.length}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
