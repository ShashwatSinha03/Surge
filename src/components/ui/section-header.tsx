import { cn } from '@/lib/utils/cn';

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ title, subtitle, action, className }: Props) {
  return (
    <div className={cn('flex items-end justify-between mb-3', className)}>
      <div>
        <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
