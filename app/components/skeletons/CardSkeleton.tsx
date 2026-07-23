import { Skeleton } from './Skeleton';

export function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex justify-between items-start gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-40 h-5" />
        </div>
        <Skeleton className="w-16 h-7 rounded-lg shrink-0" />
      </div>
      <div className="flex gap-4 flex-wrap mt-4">
        <Skeleton className="w-24 h-3" />
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-28 h-3" />
      </div>
    </div>
  );
}
