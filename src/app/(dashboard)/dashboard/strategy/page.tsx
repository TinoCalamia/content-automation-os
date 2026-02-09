'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Sparkles, Loader2, Tag } from 'lucide-react';
import { FunnelChart } from '@/components/strategy/FunnelChart';
import { RecommendationCard } from '@/components/strategy/RecommendationCard';
import { FunnelPostList } from '@/components/strategy/FunnelPostList';
import type { Draft, FunnelStage } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface FunnelStageCounts {
  tofu: number;
  mofu: number;
  bofu: number;
  unclassified: number;
}

interface PlatformDistribution {
  platform: string;
  counts: FunnelStageCounts;
}

interface DistributionData {
  total: FunnelStageCounts;
  by_platform: PlatformDistribution[];
  time_period: string;
}

interface StrategyAnalysis {
  tofu_percentage: number;
  mofu_percentage: number;
  bofu_percentage: number;
  balance_score: number;
  summary: string;
}

interface StrategyGap {
  stage: string;
  severity: string;
  description: string;
}

interface ContentRecommendation {
  stage: string;
  content_type: string;
  title: string;
  description: string;
  platform: string;
}

interface PostIdea {
  stage: string;
  platform: string;
  angle: string;
  hook: string;
  outline: string;
}

const timePeriods = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export default function StrategyPage() {
  const { currentWorkspace, session } = useAuth();
  const [timePeriod, setTimePeriod] = useState('30d');
  const [distribution, setDistribution] = useState<DistributionData | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedStage, setSelectedStage] = useState<FunnelStage | 'all'>('all');
  const [loadingDistribution, setLoadingDistribution] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  // Recommendation state
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null);
  const [gaps, setGaps] = useState<StrategyGap[]>([]);
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [postIdeas, setPostIdeas] = useState<PostIdea[]>([]);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  // Batch classify state
  const [classifying, setClassifying] = useState(false);

  const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

  const fetchDistribution = useCallback(async () => {
    if (!currentWorkspace || !session) return;
    setLoadingDistribution(true);
    try {
      const res = await fetch(
        `${fastApiUrl}/api/strategy/distribution?workspace_id=${currentWorkspace.id}&time_period=${timePeriod}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const data = await res.json();
      if (data.success) {
        setDistribution(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch distribution', { error });
    } finally {
      setLoadingDistribution(false);
    }
  }, [currentWorkspace, session, timePeriod, fastApiUrl]);

  const fetchDrafts = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoadingDrafts(true);
    try {
      const res = await fetch(`/api/drafts?workspace_id=${currentWorkspace.id}`);
      const data = await res.json();
      if (data.success) {
        setDrafts(data.data.drafts);
      }
    } catch (error) {
      logger.error('Failed to fetch drafts', { error });
    } finally {
      setLoadingDrafts(false);
    }
  }, [currentWorkspace]);

  const fetchRecommendation = useCallback(async () => {
    if (!currentWorkspace || !session) return;
    setLoadingRecommendation(true);
    try {
      const res = await fetch(`${fastApiUrl}/api/strategy/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          time_period: timePeriod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data.analysis);
        setGaps(data.data.gaps);
        setRecommendations(data.data.recommendations);
        setPostIdeas(data.data.post_ideas);
      }
    } catch (error) {
      logger.error('Failed to fetch recommendations', { error });
      toast.error('Failed to generate recommendations', {
        description: 'Make sure the FastAPI backend is running.',
      });
    } finally {
      setLoadingRecommendation(false);
    }
  }, [currentWorkspace, session, timePeriod, fastApiUrl]);

  const handleClassifyBatch = async () => {
    if (!currentWorkspace || !session) return;
    setClassifying(true);
    try {
      const res = await fetch(`${fastApiUrl}/api/strategy/classify-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspace_id: currentWorkspace.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Classified ${data.data.classified} posts`);
        // Refresh data
        fetchDistribution();
        fetchDrafts();
      } else {
        throw new Error(data.error || 'Classification failed');
      }
    } catch (error) {
      logger.error('Batch classification failed', { error });
      toast.error('Classification failed', {
        description: 'Make sure the FastAPI backend is running.',
      });
    } finally {
      setClassifying(false);
    }
  };

  useEffect(() => {
    fetchDistribution();
    fetchDrafts();
  }, [fetchDistribution, fetchDrafts]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Strategy</h1>
          <p className="text-muted-foreground">
            Analyze your content funnel and get AI recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timePeriods.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => { fetchDistribution(); fetchDrafts(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleClassifyBatch}
          disabled={classifying}
          variant="outline"
        >
          {classifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Classifying...
            </>
          ) : (
            <>
              <Tag className="mr-2 h-4 w-4" />
              Classify Untagged Posts
            </>
          )}
        </Button>
        <Button
          onClick={fetchRecommendation}
          disabled={loadingRecommendation}
        >
          {loadingRecommendation ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Get AI Recommendations
            </>
          )}
        </Button>
      </div>

      {/* Distribution Chart */}
      {loadingDistribution ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      ) : distribution ? (
        <FunnelChart
          total={distribution.total}
          byPlatform={distribution.by_platform}
          timePeriod={distribution.time_period}
        />
      ) : null}

      {/* AI Recommendations */}
      <RecommendationCard
        analysis={analysis}
        gaps={gaps}
        recommendations={recommendations}
        postIdeas={postIdeas}
        loading={loadingRecommendation}
      />

      {/* Post List */}
      {loadingDrafts ? (
        <Skeleton className="h-[400px]" />
      ) : (
        <FunnelPostList
          drafts={drafts}
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
        />
      )}
    </div>
  );
}
