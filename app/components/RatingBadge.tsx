export function RatingBadge({ notaMedia, totalAvaliacoes }: { notaMedia?: number | null; totalAvaliacoes?: number }) {
  if (!notaMedia || !totalAvaliacoes) {
    return <span className="text-xs text-gray-400">Sem avaliações ainda</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
      ★ {notaMedia.toFixed(1)}
      <span className="font-normal text-gray-400">({totalAvaliacoes})</span>
    </span>
  );
}
