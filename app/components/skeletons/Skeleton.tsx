export function Skeleton({ className = '', light = false }: { className?: string; light?: boolean }) {
  return <div className={`animate-pulse rounded ${light ? 'bg-white/25' : 'bg-gray-200'} ${className}`} />;
}
