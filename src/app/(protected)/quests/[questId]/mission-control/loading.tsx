import { Skeleton } from '@/components/ui/skeleton';

export default function MissionControlLoading() {
  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-4 w-3/4 max-w-lg mt-1" />
      </section>

      <section className="flex items-baseline gap-4">
        <Skeleton className="h-14 w-20" />
        <Skeleton className="h-4 w-32" />
      </section>

      <section>
        <Skeleton className="h-3 w-32 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </section>
    </div>
  );
}
