import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'status' | 'priority' | 'neutral';
type StatusColor = 'healthy' | 'attention' | 'critical' | 'open' | 'claimed' | 'completed';
type PriorityColor = 'high' | 'medium' | 'low';

type Props = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  color?: StatusColor | PriorityColor;
  className?: string;
};

const statusStyles: Record<StatusColor, string> = {
  healthy: 'bg-status-healthy/10 text-status-healthy border-status-healthy/20',
  attention: 'bg-status-attention/10 text-status-attention border-status-attention/20',
  critical: 'bg-status-critical/10 text-status-critical border-status-critical/20',
  open: 'bg-surface text-muted border-border',
  claimed: 'bg-status-claimed/10 text-status-claimed border-status-claimed/20',
  completed: 'bg-status-healthy/10 text-status-healthy border-status-healthy/20',
};

const priorityStyles: Record<PriorityColor, string> = {
  high: 'bg-status-critical/10 text-status-critical border-status-critical/20',
  medium: 'bg-status-attention/10 text-status-attention border-status-attention/20',
  low: 'bg-surface-alt text-muted border-border',
};

export function Badge({ children, variant = 'neutral', color, className }: Props) {
  const colorStyle = variant === 'status'
    ? statusStyles[(color as StatusColor) ?? 'open']
    : variant === 'priority'
      ? priorityStyles[(color as PriorityColor) ?? 'low']
      : 'bg-surface text-muted border-border';

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
      colorStyle,
      className,
    )}>
      {children}
    </span>
  );
}
