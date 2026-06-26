'use client';

import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6" role="alert">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-10 h-10 text-muted mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-medium text-fg mb-2">Something went wrong</h2>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
