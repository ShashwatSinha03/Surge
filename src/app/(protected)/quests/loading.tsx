import { Skeleton } from '@/components/ui/skeleton';

export default function QuestsLoading() {
  return (
    <div className="p-8 max-w-3xl">
      <header className="mb-10">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </header>

      <section className="mb-10">
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </section>
    </div>
  );
}
