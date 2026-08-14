// Achata vaga.pagamentos (array, mais recente primeiro) pra vaga.pagamento —
// o formato que o front sempre consumiu. Precisa disso porque uma vaga agora
// pode acumular mais de um Pagamento ao longo do tempo (reabre depois de
// desistência/não comparecimento, e o próximo aceite gera outro registro).
export function comPagamentoMaisRecente<T extends { pagamentos: unknown[] }>(
  vaga: T,
): Omit<T, 'pagamentos'> & { pagamento: T['pagamentos'][number] | null } {
  const { pagamentos, ...resto } = vaga;
  return { ...resto, pagamento: (pagamentos[0] as T['pagamentos'][number]) ?? null };
}

export const PAGAMENTO_MAIS_RECENTE_INCLUDE = {
  orderBy: { createdAt: 'desc' as const },
  take: 1,
};
