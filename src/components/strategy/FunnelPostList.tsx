'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Linkedin, Twitter } from 'lucide-react';
import type { Draft, FunnelStage } from '@/types/database';

interface FunnelPostListProps {
  drafts: Draft[];
  selectedStage: FunnelStage | 'all';
  onStageChange: (stage: FunnelStage | 'all') => void;
}

const STAGE_CONFIG: Record<string, { color: string; bg: string; label: string; description: string }> = {
  tofu: {
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'TOFU',
    description: 'Awareness',
  },
  mofu: {
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    label: 'MOFU',
    description: 'Consideration',
  },
  bofu: {
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    label: 'BOFU',
    description: 'Conversion',
  },
};

const platformConfig: Record<string, { icon: React.ElementType; label: string }> = {
  linkedin: { icon: Linkedin, label: 'LinkedIn' },
  x: { icon: Twitter, label: 'X' },
};

export function FunnelPostList({ drafts, selectedStage, onStageChange }: FunnelPostListProps) {
  const stages: (FunnelStage | 'all')[] = ['all', 'tofu', 'mofu', 'bofu'];

  const filteredDrafts =
    selectedStage === 'all'
      ? drafts.filter((d) => d.funnel_stage)
      : drafts.filter((d) => d.funnel_stage === selectedStage);

  // Count per stage
  const counts = {
    all: drafts.filter((d) => d.funnel_stage).length,
    tofu: drafts.filter((d) => d.funnel_stage === 'tofu').length,
    mofu: drafts.filter((d) => d.funnel_stage === 'mofu').length,
    bofu: drafts.filter((d) => d.funnel_stage === 'bofu').length,
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Posts by Funnel Stage</CardTitle>
        <CardDescription>Browse your content by marketing stage</CardDescription>
        <div className="flex gap-2 pt-2">
          {stages.map((stage) => {
            const isActive = selectedStage === stage;
            const stageConf = stage !== 'all' ? STAGE_CONFIG[stage] : null;
            return (
              <button
                key={stage}
                onClick={() => onStageChange(stage)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {stage === 'all' ? 'All' : stageConf?.label}
                <span className="ml-1.5 opacity-70">{counts[stage]}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {filteredDrafts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No posts in this stage yet
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {filteredDrafts.map((draft) => {
              const stageConf = draft.funnel_stage
                ? STAGE_CONFIG[draft.funnel_stage]
                : null;
              const platConf = platformConfig[draft.platform];
              const PlatIcon = platConf?.icon;

              return (
                <div
                  key={draft.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    {PlatIcon && <PlatIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2 whitespace-pre-wrap">
                      {draft.content_text.slice(0, 120)}
                      {draft.content_text.length > 120 && '...'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {stageConf && (
                        <Badge
                          className={`${stageConf.bg} ${stageConf.color} border-0 text-[10px]`}
                        >
                          {stageConf.label}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
