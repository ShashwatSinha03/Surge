import { cn } from '@/lib/utils/cn';

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, action, className, icon }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      {icon && <div className="mb-4 text-muted/30" aria-hidden="true">{icon}</div>}
      <p className="text-muted font-medium">{title}</p>
      {description && <p className="text-sm text-muted max-w-sm text-center mt-1.5 leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
