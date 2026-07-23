import { Skeleton } from './Skeleton';

export function SidebarSkeleton({ items = 4 }: { items?: number }) {
  return (
    <>
      <div className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="w-24 h-3" />
            <Skeleton className="w-14 h-2" />
          </div>
        </div>
      </div>

      <aside className="hidden md:flex md:w-64 shrink-0 bg-white border-r border-gray-100 flex-col gap-1 p-4 sticky top-0 md:h-screen">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="w-28 h-3.5" />
            <Skeleton className="w-16 h-2.5" />
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {Array.from({ length: items }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-xl" />
          ))}
        </nav>
        <div className="flex-1" />
        <Skeleton className="h-9 rounded-xl" />
      </aside>
    </>
  );
}
