import { cn } from '@/lib/utils/cn';

type Props = {
  children: React.ReactNode;
  className?: string;
  role?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
};

export function SrOnly({ children, className, role, 'aria-live': ariaLive }: Props) {
  return (
    <span className={cn('sr-only', className)} role={role} aria-live={ariaLive}>
      {children}
    </span>
  );
}
