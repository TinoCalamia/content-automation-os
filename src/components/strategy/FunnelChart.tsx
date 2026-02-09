'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

interface FunnelChartProps {
  total: FunnelStageCounts;
  byPlatform: PlatformDistribution[];
  timePeriod: string;
}

const STAGE_COLORS: Record<string, string> = {
  TOFU: '#3b82f6',
  MOFU: '#f59e0b',
  BOFU: '#10b981',
  Unclassified: '#6b7280',
};

const STAGE_LABELS: Record<string, string> = {
  tofu: 'Awareness',
  mofu: 'Consideration',
  bofu: 'Conversion',
};

export function FunnelChart({ total, byPlatform, timePeriod }: FunnelChartProps) {
  const totalCount = total.tofu + total.mofu + total.bofu + total.unclassified;

  const overviewData = [
    {
      name: 'TOFU',
      count: total.tofu,
      percentage: totalCount > 0 ? Math.round((total.tofu / totalCount) * 100) : 0,
      fill: STAGE_COLORS.TOFU,
    },
    {
      name: 'MOFU',
      count: total.mofu,
      percentage: totalCount > 0 ? Math.round((total.mofu / totalCount) * 100) : 0,
      fill: STAGE_COLORS.MOFU,
    },
    {
      name: 'BOFU',
      count: total.bofu,
      percentage: totalCount > 0 ? Math.round((total.bofu / totalCount) * 100) : 0,
      fill: STAGE_COLORS.BOFU,
    },
  ];

  // Platform comparison data
  const platformData = byPlatform.map((p) => ({
    platform: p.platform === 'linkedin' ? 'LinkedIn' : 'X',
    TOFU: p.counts.tofu,
    MOFU: p.counts.mofu,
    BOFU: p.counts.bofu,
  }));

  const periodLabel =
    timePeriod === '7d' ? 'Last 7 days' :
    timePeriod === '30d' ? 'Last 30 days' :
    timePeriod === '90d' ? 'Last 90 days' : 'All time';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Funnel Distribution */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Funnel Distribution</CardTitle>
          <CardDescription>{periodLabel} &middot; {totalCount} total posts</CardDescription>
        </CardHeader>
        <CardContent>
          {totalCount === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No classified posts yet
            </div>
          ) : (
            <div className="space-y-4">
              {overviewData.map((stage) => (
                <div key={stage.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.fill }}
                      />
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {STAGE_LABELS[stage.name.toLowerCase()]}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {stage.count} ({stage.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stage.percentage}%`,
                        backgroundColor: stage.fill,
                      }}
                    />
                  </div>
                </div>
              ))}
              {total.unclassified > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  + {total.unclassified} unclassified post{total.unclassified > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">By Platform</CardTitle>
          <CardDescription>Funnel distribution per platform</CardDescription>
        </CardHeader>
        <CardContent>
          {platformData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No platform data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={platformData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis
                  type="category"
                  dataKey="platform"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="TOFU" stackId="a" fill={STAGE_COLORS.TOFU} radius={[0, 0, 0, 0]} />
                <Bar dataKey="MOFU" stackId="a" fill={STAGE_COLORS.MOFU} />
                <Bar dataKey="BOFU" stackId="a" fill={STAGE_COLORS.BOFU} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
