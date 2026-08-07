export function RatingBadge({
  notaMedia, totalAvaliacoes, hideWhenEmpty,
}: {
  notaMedia?: number | null;
  totalAvaliacoes?: number;
  // Clínicas ainda sem avaliação não mostram nada (em vez do aviso "Sem
  // avaliações ainda") — menos ruído nos cards de vaga.
  hideWhenEmpty?: boolean;
}) {
  if (!notaMedia || !totalAvaliacoes) {
    if (hideWhenEmpty) return null;
    return <span className="text-xs text-gray-400">Sem avaliações ainda</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-ink bg-gray-100 rounded-full pl-2 pr-2.5 py-1 tabular-nums">
      <span className="text-amber-500">★</span> {notaMedia.toFixed(1)}
      <span className="font-semibold text-gray-400">({totalAvaliacoes})</span>
    </span>
  );
}
