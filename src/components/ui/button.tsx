import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

type Props = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive';
  href?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

const shared =
  'inline-flex cursor-pointer items-center gap-1 rounded border px-4 py-2 font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:ring-offset-2 active:opacity-100';

const variants = {
  primary:
    'border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 text-slate-900',
  secondary:
    'border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 text-slate-900',
  destructive:
    'border-red-300 bg-gradient-to-b from-red-50 to-red-200 text-red-900',
};

const shadow = 'shadow-[inset_0_2px_4px_0_rgb(2_6_23_/_0.3),inset_0_-2px_4px_0_rgb(203_213_225)]';

export function Button({
  children,
  variant = 'primary',
  href,
  className,
  disabled,
  onClick,
  type = 'button',
}: Props) {
  const cls = cn(shared, variants[variant], shadow, disabled && 'opacity-40 pointer-events-none', className);

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
