import { Skeleton } from '@/components/ui/skeleton';

export default function QuestDetailLoading() {
  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6">
        <Skeleton className="h-8 w-64 mb-3" />
        <div className="flex items-center gap-3 mt-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </header>

      <Skeleton className="h-10 w-full mb-6" />

      <div className="mt-6">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-6" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
