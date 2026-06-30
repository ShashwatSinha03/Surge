'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  questId: string;
};

export function DeleteQuestButton({ questId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/quests/${questId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to delete quest');
        setDeleting(false);
        return;
      }

      router.push('/quests');
    } catch {
      setError('Something went wrong. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete quest
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !deleting && setOpen(false)}
          />
          <div className="relative bg-bg border border-border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-base font-medium text-fg">Delete quest?</h3>
            <p className="text-sm text-muted mt-2">
              This will permanently delete this quest and all its data. This action cannot be undone.
            </p>

            {error && (
              <p className="text-xs text-status-critical mt-3">{error}</p>
            )}

            <div className="flex items-center justify-end gap-3 mt-5">
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
