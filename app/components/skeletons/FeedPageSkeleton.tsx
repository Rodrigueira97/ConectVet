import { Skeleton } from './Skeleton';
import { SidebarSkeleton } from './SidebarSkeleton';
import { CardSkeleton } from './CardSkeleton';

export function FeedPageSkeleton({ sidebarItems = 4, showFilters = false, cards = 4 }: {
  sidebarItems?: number;
  showFilters?: boolean;
  cards?: number;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarSkeleton items={sidebarItems} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="w-52 h-7 mb-2" />
          <Skeleton className="w-72 h-4 mb-5" />
          {showFilters && (
            <>
              <Skeleton className="w-full h-11 rounded-lg mb-3" />
              <div className="flex gap-3 mb-4">
                <Skeleton className="w-40 h-9 rounded-lg" />
                <Skeleton className="w-48 h-9 rounded-lg" />
              </div>
            </>
          )}
          <div className="flex flex-col gap-4">
            {Array.from({ length: cards }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
