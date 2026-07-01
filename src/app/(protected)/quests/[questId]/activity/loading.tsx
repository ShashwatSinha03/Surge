import { SurgeLoader } from '@/components/ui/surge-loader';

export default function ActivityLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4 sm:p-8">
      <SurgeLoader />
    </div>
  );
}
