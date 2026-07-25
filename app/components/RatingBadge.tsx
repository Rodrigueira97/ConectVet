export function RatingBadge({ notaMedia, totalAvaliacoes }: { notaMedia?: number | null; totalAvaliacoes?: number }) {
  if (!notaMedia || !totalAvaliacoes) {
    return <span className="text-xs text-gray-400">Sem avaliações ainda</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-ink bg-gray-100 rounded-full pl-2 pr-2.5 py-1 tabular-nums">
      <span className="text-amber-500">★</span> {notaMedia.toFixed(1)}
      <span className="font-semibold text-gray-400">({totalAvaliacoes})</span>
    </span>
  );
}
