'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';
import Link from 'next/link';

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

interface StrategyAnalysis {
  tofu_percentage: number;
  mofu_percentage: number;
  bofu_percentage: number;
  balance_score: number;
  summary: string;
}

interface RecommendationCardProps {
  analysis: StrategyAnalysis | null;
  gaps: StrategyGap[];
  recommendations: ContentRecommendation[];
  postIdeas: PostIdea[];
  loading?: boolean;
}

const STAGE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  tofu: { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'TOFU' },
  mofu: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'MOFU' },
  bofu: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'BOFU' },
};

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'text-muted-foreground', label: 'Low' },
  medium: { color: 'text-amber-500', label: 'Medium' },
  high: { color: 'text-destructive', label: 'High' },
};

export function RecommendationCard({
  analysis,
  gaps,
  recommendations,
  postIdeas,
  loading,
}: RecommendationCardProps) {
  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span>Generating strategy recommendations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Analysis Summary */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Strategy Analysis
          </CardTitle>
          <CardDescription>
            Balance score: {analysis.balance_score}/10
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Gaps */}
      {gaps.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Content Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gaps.map((gap, i) => {
              const stageConf = STAGE_CONFIG[gap.stage] || STAGE_CONFIG.tofu;
              const sevConf = SEVERITY_CONFIG[gap.severity] || SEVERITY_CONFIG.medium;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Badge className={`${stageConf.bg} ${stageConf.color} border-0`}>
                    {stageConf.label}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{gap.description}</p>
                    <span className={`text-xs ${sevConf.color}`}>
                      Severity: {sevConf.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, i) => {
              const stageConf = STAGE_CONFIG[rec.stage] || STAGE_CONFIG.tofu;
              return (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-muted/50 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={`${stageConf.bg} ${stageConf.color} border-0`}>
                      {stageConf.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rec.content_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {rec.platform}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Post Ideas */}
      {postIdeas.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Post Ideas</CardTitle>
            <CardDescription>Ready-to-generate content ideas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {postIdeas.map((idea, i) => {
              const stageConf = STAGE_CONFIG[idea.stage] || STAGE_CONFIG.tofu;
              return (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-muted/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={`${stageConf.bg} ${stageConf.color} border-0`}>
                        {stageConf.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {idea.platform}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {idea.angle}
                      </Badge>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link
                        href={`/dashboard/generate?funnel_stage=${idea.stage}&angle=${idea.angle}`}
                      >
                        Generate
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                  <p className="text-sm font-medium italic">&ldquo;{idea.hook}&rdquo;</p>
                  <p className="text-xs text-muted-foreground">{idea.outline}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
