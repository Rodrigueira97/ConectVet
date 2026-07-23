import { Skeleton } from './Skeleton';
import { SidebarSkeleton } from './SidebarSkeleton';

export function AdminPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarSkeleton items={1} />
      <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        <Skeleton className="w-64 h-7 mb-2" />
        <Skeleton className="w-80 h-4 mb-6" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5">
              <Skeleton className="w-32 h-3 mb-2.5" />
              <Skeleton className="w-20 h-6" />
            </div>
          ))}
        </div>

        <Skeleton className="w-28 h-4 mb-3" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 flex justify-between items-center gap-3 flex-wrap">
              <div className="flex flex-col gap-2">
                <Skeleton className="w-16 h-2.5" />
                <Skeleton className="w-36 h-4" />
                <Skeleton className="w-56 h-3" />
              </div>
              <Skeleton className="w-20 h-7 rounded-lg" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
