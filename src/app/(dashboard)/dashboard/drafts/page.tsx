'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DraftCard } from '@/components/drafts/DraftCard';
import { DraftEditor } from '@/components/drafts/DraftEditor';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Zap, PenTool, Linkedin, Twitter } from 'lucide-react';
import type { Draft } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import Link from 'next/link';

const platformFilters = [
  { value: 'all', label: 'All Platforms' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'x', label: 'X/Twitter', icon: Twitter },
];

export default function DraftsPage() {
  const { currentWorkspace } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [platformFilter, setPlatformFilter] = useState('all');

  const fetchDrafts = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ workspace_id: currentWorkspace.id });
      if (platformFilter !== 'all') params.append('platform', platformFilter);

      const response = await fetch(`/api/drafts?${params}`);
      const data = await response.json();

      if (data.success) {
        setDrafts(data.data.drafts);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('Failed to fetch drafts', { error });
      toast.error('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, platformFilter]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        setDrafts(drafts.filter((d) => d.id !== id));
        if (selectedDraft?.id === id) setSelectedDraft(null);
        toast.success('Draft deleted');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('Failed to delete draft', { error });
      toast.error('Failed to delete draft');
    }
  };

  const handleCopy = async (draft: Draft) => {
    try {
      const fullText = draft.content_text + 
        (draft.hashtags?.length ? '\n\n' + draft.hashtags.map(t => `#${t}`).join(' ') : '');
      await navigator.clipboard.writeText(fullText);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleUpdate = (updatedDraft: Draft) => {
    setDrafts(drafts.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
    setSelectedDraft(updatedDraft);
  };

  // Group drafts by date
  const groupedDrafts = drafts.reduce((groups, draft) => {
    const date = new Date(draft.created_at).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(draft);
    return groups;
  }, {} as Record<string, Draft[]>);

  return (
    <div className="h-full flex">
      {/* Draft List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Drafts</h1>
              <p className="text-muted-foreground">
                Your generated content ready to edit and publish
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/generate">
                <Zap className="mr-2 h-4 w-4" />
                Generate New
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platformFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    <div className="flex items-center gap-2">
                      {filter.icon && <filter.icon className="h-4 w-4" />}
                      {filter.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={fetchDrafts}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-[180px]" />
                    <Skeleton className="h-[180px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <PenTool className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No drafts yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your first content to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/generate">
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Now
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedDrafts).map(([date, dateDrafts]) => (
                <div key={date}>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">{date}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {dateDrafts.map((draft) => (
                      <DraftCard
                        key={draft.id}
                        draft={draft}
                        onSelect={setSelectedDraft}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                        selected={selectedDraft?.id === draft.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      {selectedDraft && (
        <div className="w-[450px] border-l border-border bg-background">
          <DraftEditor
            draft={selectedDraft}
            onUpdate={handleUpdate}
            onClose={() => setSelectedDraft(null)}
          />
        </div>
      )}
    </div>
  );
}
