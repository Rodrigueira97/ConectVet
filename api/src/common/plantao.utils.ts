// Fuso horário único usado em toda checagem de "hoje"/"agora" do backend —
// mesmo critério do front (lib/mockData.ts). Timezone de propósito (não
// UTC), porque "já passou da hora" depende de onde o plantão acontece.

function hojeBrasil(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function agoraBrasil(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type VagaComHorario = { data: Date; horaInicio: string; horaFim: string };

/**
 * Só dá pra desistir antes do plantão começar — depois disso já é um caso de
 * não comparecimento (fluxo diferente, que não reabre a vaga).
 */
export function plantaoAindaNaoComecou(vaga: Pick<VagaComHorario, 'data' | 'horaInicio'>): boolean {
  const dataVaga = vaga.data.toISOString().slice(0, 10);
  const hoje = hojeBrasil();
  if (dataVaga > hoje) return true;
  if (dataVaga < hoje) return false;
  return agoraBrasil() < vaga.horaInicio;
}

/**
 * "Não compareceu" só faz sentido depois que o horário do plantão já passou —
 * antes disso ainda pode aparecer (mesma regra documentada no fluxo de
 * pagamento: não comparecimento fecha a vaga porque a data já passou).
 */
export function plantaoJaTerminou(vaga: Pick<VagaComHorario, 'data' | 'horaFim'>): boolean {
  const dataVaga = vaga.data.toISOString().slice(0, 10);
  const hoje = hojeBrasil();
  if (dataVaga < hoje) return true;
  if (dataVaga > hoje) return false;
  return agoraBrasil() >= vaga.horaFim;
}
