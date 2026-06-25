import { cn } from '@/lib/utils/cn';

type Props = {
  className?: string;
};

export function Skeleton({ className }: Props) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-surface', className)} />
  );
}
