import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

type Props = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  href?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

export function Button({
  children,
  variant = 'primary',
  href,
  className,
  disabled,
  onClick,
  type = 'button',
}: Props) {
  const base =
    'inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all';

  const variants = {
    primary: 'bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40',
    secondary:
      'bg-surface border border-border text-fg hover:bg-surface-alt disabled:opacity-40',
    ghost: 'text-muted hover:text-fg disabled:opacity-40',
  };

  const cls = cn(base, variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
