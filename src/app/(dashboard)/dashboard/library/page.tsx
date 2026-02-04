'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AddSourceDialog } from '@/components/capture/AddSourceDialog';
import { SourceCard } from '@/components/library/SourceCard';
import { SourceDetail } from '@/components/library/SourceDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  LayoutGrid,
  LayoutList,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import type { Source } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const typeFilters = [
  { value: 'all', label: 'All Types' },
  { value: 'linkedin_url', label: 'LinkedIn' },
  { value: 'youtube_url', label: 'YouTube' },
  { value: 'blog_url', label: 'Blog/Article' },
  { value: 'x_url', label: 'X/Twitter' },
  { value: 'note', label: 'Notes' },
];

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'enriched', label: 'Enriched' },
  { value: 'used', label: 'Used' },
  { value: 'archived', label: 'Archived' },
];

export default function LibraryPage() {
  const { currentWorkspace, session } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchSources = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ workspace_id: currentWorkspace.id });
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/sources?${params}`);
      const data = await response.json();

      if (data.success) {
        setSources(data.data.sources);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('Failed to fetch sources', { error });
      toast.error('Failed to load sources');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, typeFilter, statusFilter]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        setSources(sources.filter((s) => s.id !== id));
        if (selectedSource?.id === id) setSelectedSource(null);
        toast.success('Source deleted');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('Failed to delete source', { error });
      toast.error('Failed to delete source');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      const data = await response.json();

      if (data.success) {
        setSources(sources.map((s) => (s.id === id ? data.data.source : s)));
        toast.success('Source archived');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('Failed to archive source', { error });
      toast.error('Failed to archive source');
    }
  };

  const handleEnrich = async (id: string) => {
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${fastApiUrl}/api/enrichment/enrich/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (data.success) {
        // Update the source in state
        setSources(sources.map((s) => (s.id === id ? data.data : s)));
        if (selectedSource?.id === id) setSelectedSource(data.data);
        toast.success('Source enriched!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('Failed to enrich source', { error });
      toast.error('Enrichment failed', {
        description: 'The FastAPI backend may not be running.',
      });
    }
  };

  // Filter sources by search
  const filteredSources = sources.filter((source) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      source.title?.toLowerCase().includes(searchLower) ||
      source.summary?.toLowerCase().includes(searchLower) ||
      source.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Library</h1>
              <p className="text-muted-foreground">
                Manage your source content
              </p>
            </div>
            <AddSourceDialog onSourceAdded={fetchSources} />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border border-border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchSources}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Source Grid */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[180px]" />
              ))}
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No sources found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {sources.length === 0
                  ? 'Add your first source to get started'
                  : 'Try adjusting your filters'}
              </p>
              {sources.length === 0 && <AddSourceDialog onSourceAdded={fetchSources} />}
            </div>
          ) : (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}>
              {filteredSources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  onSelect={setSelectedSource}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onEnrich={handleEnrich}
                  selected={selectedSource?.id === source.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedSource && (
        <div className="w-[400px] border-l border-border bg-background">
          <SourceDetail
            source={selectedSource}
            onClose={() => setSelectedSource(null)}
            onEnrich={handleEnrich}
          />
        </div>
      )}
    </div>
  );
}
