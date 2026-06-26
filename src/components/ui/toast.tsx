'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TOAST_DURATION = 4000;
const ANIMATION_DURATION = 300;

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), ANIMATION_DURATION);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const iconMap: Record<ToastType, string> = {
    success: '\u2713',
    error: '\u2717',
    info: '\u2139',
  };

  const borderMap: Record<ToastType, string> = {
    success: 'border-l-status-healthy',
    error: 'border-l-status-critical',
    info: 'border-l-status-claimed',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'w-full max-w-sm bg-surface border border-border rounded-lg shadow-xl px-4 py-3 border-l-4 transition-all duration-300',
        borderMap[toast.type],
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-sm mt-0.5 shrink-0" aria-hidden="true">
          {iconMap[toast.type]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg font-medium">{toast.message}</p>
          {toast.description && (
            <p className="text-xs text-muted mt-0.5">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => {
            setExiting(true);
            setTimeout(() => onRemove(toast.id), ANIMATION_DURATION);
          }}
          className="text-muted hover:text-fg text-sm shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          \u2715
        </button>
      </div>
    </div>
  );
}

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
