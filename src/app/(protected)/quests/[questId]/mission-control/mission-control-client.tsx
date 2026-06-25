'use client';

import type { MomentumResponse, PillarEvaluation, ExecutionHighlight, Recommendation } from '@/features/momentum/types';
import { Badge } from '@/components/ui/badge';

function TrendIcon({ direction, delta }: { direction: string; delta: number }) {
  if (direction === 'up') {
    return <span className="text-status-healthy" title={`+${delta}`}>↑</span>;
  }
  if (direction === 'down') {
    return <span className="text-status-critical" title={`${delta}`}>↓</span>;
  }
  return <span className="text-muted">→</span>;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-status-healthy',
    attention: 'bg-status-attention',
    critical: 'bg-status-critical',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] ?? 'bg-muted'}`} />
  );
}

function ScoreText({ score, size = 'lg' }: { score: number; size?: 'lg' | 'sm' }) {
  const color = score >= 70 ? 'text-status-healthy'
    : score >= 40 ? 'text-status-attention'
    : 'text-status-critical';
  const dim = size === 'lg' ? 'text-5xl' : 'text-xl';
  return <span className={`${dim} ${color} font-medium tabular-nums`}>{score}</span>;
}

function PillarCard({ name, pillar }: { name: string; pillar: PillarEvaluation }) {
  const borderColor = pillar.score >= 70 ? 'border-status-healthy/20'
    : pillar.score >= 40 ? 'border-status-attention/20'
    : 'border-status-critical/20';

  const bgColor = pillar.score >= 70 ? 'bg-status-healthy/[0.03]'
    : pillar.score >= 40 ? 'bg-status-attention/[0.03]'
    : 'bg-status-critical/[0.03]';

  return (
    <div className={`rounded-lg border p-4 ${borderColor} ${bgColor}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{name}</span>
        <TrendIcon direction={pillar.trend.direction} delta={pillar.trend.delta} />
      </div>
      <ScoreText score={pillar.score} size="sm" />
      <p className="text-xs text-muted mt-1.5 leading-relaxed">{pillar.summary}</p>
      {pillar.weaknesses.length > 0 && (
        <p className="text-xs text-status-critical mt-1.5">
          {pillar.weaknesses[0]}
        </p>
      )}
    </div>
  );
}

export function MissionControlClient({ data }: { data: MomentumResponse }) {
  const { mission, momentum, highlights, pillars, recommendations } = data;

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Mission Summary — hero */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <StatusDot status={mission.status} />
          <Badge variant="status" color={mission.status as any}>
            {mission.status === 'healthy' ? 'Healthy'
              : mission.status === 'attention' ? 'Needs Attention'
              : 'Critical'}
          </Badge>
        </div>
        <p className="text-sm text-muted leading-relaxed max-w-lg">{mission.summary}</p>
      </section>

      {/* Overall Momentum — supporting */}
      <section className="flex items-baseline gap-4">
        <ScoreText score={momentum.overall} size="lg" />
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <TrendIcon direction={momentum.trend.direction} delta={momentum.trend.delta} />
          <span className="tabular-nums">{momentum.trend.current}</span>
          <span className="text-muted">/ 100</span>
        </div>
      </section>

      {/* Execution Highlights */}
      {highlights.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">
            Execution Highlights
          </h3>
          <div className="flex flex-wrap gap-2">
            {highlights.map((h, i) => (
              <HighlightBadge key={i} h={h} />
            ))}
          </div>
        </section>
      )}

      {/* Four Pillars */}
      <section>
        <h3 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">
          Pillars
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <PillarCard name="Velocity" pillar={pillars.velocity} />
          <PillarCard name="Ownership" pillar={pillars.ownership} />
          <PillarCard name="Stability" pillar={pillars.stability} />
          <PillarCard name="Engagement" pillar={pillars.engagement} />
        </div>
      </section>

      {/* Attention Required */}
      {(() => {
        const entries = Object.entries(pillars);
        const lowest = entries.sort((a, b) => a[1].score - b[1].score)[0];
        if (!lowest || lowest[1].score >= 50) return null;
        return (
          <section className="p-4 rounded-lg border border-status-attention/20 bg-status-attention/[0.03]">
            <h3 className="text-xs uppercase tracking-widest text-status-attention font-medium mb-2">
              Attention Required
            </h3>
            <p className="text-sm text-fg">
              <span className="capitalize font-medium">{lowest[0]}</span> is the lowest pillar ({lowest[1].score}/100). {lowest[1].weaknesses[0]}
            </p>
          </section>
        );
      })()}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">
            Recommended Next Actions
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </section>
      )}

      {/* Last calculated */}
      <p className="text-xs text-muted">
        Updated {formatTimeAgo(data.lastCalculated)}
      </p>
    </div>
  );
}

function HighlightBadge({ h }: { h: ExecutionHighlight }) {
  const icon = h.type === 'positive' ? <span className="text-[10px]">✓</span>
    : <span className="text-[10px]">⚠</span>;
  return (
    <Badge variant="status" color={h.type === 'positive' ? 'healthy' : 'attention'}>
      {icon}
      <span>{h.count} {h.label}</span>
    </Badge>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="rounded-lg border border-border p-3.5">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h4 className="text-sm font-medium text-fg">{rec.title}</h4>
        <Badge variant="priority" color={rec.priority as any}>
          {rec.priority}
        </Badge>
      </div>
      <p className="text-xs text-muted leading-relaxed">{rec.description}</p>
      <p className="text-xs text-muted mt-1.5 italic">{rec.reason}</p>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
