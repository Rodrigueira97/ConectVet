import { Categoria } from './types';

export const CATEGORIAS: Categoria[] = ['Veterinário Clínico', 'Veterinário Especialista', 'Estagiário', 'Auxiliar'];

// Área de atuação só se aplica a veterinários já formados (clínico ou especialista);
// estagiários e auxiliares ainda não têm registro profissional pra atuar por área.
export function isVeterinarioFormado(funcao: Categoria | ''): boolean {
  return funcao === 'Veterinário Clínico' || funcao === 'Veterinário Especialista';
}

export const MIN_VALORES: Record<Categoria, number> = {
  'Veterinário Clínico': 150,
  'Veterinário Especialista': 200,
  'Estagiário': 100,
  'Auxiliar': 100,
};

// Plantão noturno custa mais caro pro profissional (rotina, deslocamento,
// horário de sono) — por convenção, quem publica é avisado se o valor não
// cobrir esse acréscimo, mas isso não é bloqueado, só sugerido/confirmado.
// A janela noturna é quem começa às 22h ou depois, até quem começa de
// madrugada (antes das 5h) — cobre plantões que atravessam a virada do dia.
export const ADICIONAL_NOTURNO = 0.2;
export const HORA_INICIO_NOTURNO = '22:00';
export const HORA_FIM_JANELA_NOTURNA = '05:00';

export function isPlantaoNoturno(horaInicio: string): boolean {
  return !!horaInicio && (horaInicio >= HORA_INICIO_NOTURNO || horaInicio < HORA_FIM_JANELA_NOTURNA);
}

export function valorSugeridoNoturno(minimo: number): number {
  return Math.round(minimo * (1 + ADICIONAL_NOTURNO));
}

export const TAXA_PLATAFORMA = 0.05;

export const ESTADOS_CIDADES: Record<string, string[]> = {
  SP: ['São Paulo', 'Campinas', 'Santos'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Petrópolis'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Juiz de Fora', 'Contagem'],
  PR: ['Curitiba', 'Londrina', 'Maringá'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Pelotas'],
  PE: ['Recife', 'Olinda', 'Caruaru'],
};

export function onlyDigits(v: string) { return (v || '').replace(/\D/g, ''); }

// Data de "hoje" no calendário do Brasil (America/Sao_Paulo), no formato YYYY-MM-DD.
// new Date().toISOString() usa UTC, que já é o dia seguinte entre 21h e meia-noite
// no horário de Brasília — usar isso pra decidir "hoje"/"amanhã" fazia vagas do fim
// de tarde/noite serem marcadas como encerradas ou "começa amanhã" cedo demais.
export function hojeBrasil() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

// Soma (ou subtrai) dias a uma data YYYY-MM-DD, sem depender de fuso horário
// (é aritmética pura sobre o calendário, não um instante real no tempo).
export function somarDiasISO(dataISO: string, dias: number) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

// Horário atual no relógio do Brasil (America/Sao_Paulo), no formato HH:MM.
export function agoraBrasil() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
}

// Um plantão só termina de fato quando o horário de fim passa — nunca só porque
// virou o dia. Plantões que atravessam a madrugada (ex.: 19:00–07:00) continuam
// em andamento na manhã seguinte até bater o horaFim.
export function plantaoEncerrado(v: { data: string; horaInicio: string; horaFim: string }) {
  const dataInicio = v.data.slice(0, 10);
  const overnight = v.horaFim <= v.horaInicio;
  const dataFim = overnight ? somarDiasISO(dataInicio, 1) : dataInicio;
  const hoje = hojeBrasil();
  if (dataFim < hoje) return true;
  if (dataFim > hoje) return false;
  return agoraBrasil() >= v.horaFim;
}

// Uma desistência (do profissional aceito) só faz sentido antes do plantão
// começar — depois disso já é caso de não comparecimento, que segue outro
// fluxo (não reabre a vaga, só encerra).
export function plantaoAindaNaoComecou(v: { data: string; horaInicio: string }) {
  const dataInicio = v.data.slice(0, 10);
  const hoje = hojeBrasil();
  if (dataInicio > hoje) return true;
  if (dataInicio < hoje) return false;
  return agoraBrasil() < v.horaInicio;
}

export function buildEndereco(form: {
  rua?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cidade?: string | null; estado?: string | null;
}) {
  const parts: string[] = [];
  if (form.rua) parts.push(form.numero ? `${form.rua}, nº ${form.numero}` : form.rua);
  if (form.complemento) parts.push(form.complemento);
  if (form.bairro) parts.push(form.bairro);
  const cityState = [form.cidade, form.estado].filter(Boolean).join(' - ');
  if (cityState) parts.push(cityState);
  return parts.join(', ');
}

export function mapsLink(endereco: string) {
  return endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : '';
}

// Minúsculo + sem acento — pra "São Paulo", "sao paulo" e "SÃO PAULO" serem
// a mesma busca. Usado por toda busca de texto do feed (clínica, categoria,
// local, cidade), pra quem digita sem acento (comum no celular) achar vaga
// que tem acento no cadastro, e vice-versa.
export function normalizarBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Distância de edição (Levenshtein) entre duas strings já normalizadas —
// quantas inserções/remoções/trocas de letra separam uma da outra. Só serve
// de apoio pra correspondeAproximado, não precisa ser chamada direto.
function distanciaEdicao(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const linha = new Array(n + 1);
  for (let j = 0; j <= n; j++) linha[j] = j;
  for (let i = 1; i <= m; i++) {
    let anterior = linha[0];
    linha[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = linha[j];
      linha[j] = a[i - 1] === b[j - 1]
        ? anterior
        : 1 + Math.min(anterior, linha[j], linha[j - 1]);
      anterior = temp;
    }
  }
  return linha[n];
}

// Compara "alvo" (ex.: a cidade de uma vaga) com o que a pessoa digitou,
// tolerando acento e pequenos erros de digitação — "Barbacena" acha
// "barbacena", "Barbcena" (faltou letra) e "Barbasena" (letra trocada), mas
// não confunde cidades muito diferentes. A tolerância cresce com o tamanho
// do termo buscado: nomes curtos toleram só 1 erro, mais longos toleram mais.
export function correspondeAproximado(alvo: string | null | undefined, busca: string): boolean {
  const b = normalizarBusca(busca);
  if (!b) return true;
  const a = normalizarBusca(alvo || '');
  if (!a) return false;
  if (a.includes(b)) return true;

  const tolerancia = b.length <= 4 ? 1 : b.length <= 8 ? 2 : 3;
  const candidatos = [a, ...a.split(/\s+/)].filter(Boolean);
  return candidatos.some((c) => distanciaEdicao(c, b) <= tolerancia);
}

export function formatDataBR(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function localDaVaga(v: { rua: string; numero: string; complemento?: string | null; bairro?: string | null; cidade: string; estado: string }) {
  return buildEndereco({ rua: v.rua, numero: v.numero, complemento: v.complemento || undefined, bairro: v.bairro || undefined, cidade: v.cidade, estado: v.estado });
}

// Do ponto de vista de quem navega pelas vagas (feed do profissional ou feed
// público), "encerrada" é qualquer vaga que não aceita mais candidatura:
// preenchida, cancelada, concluída, ou aberta cuja data/hora já passou.
export function vagaEncerrada(v: { data: string; horaInicio: string; horaFim: string; status: string }) {
  if (v.status !== 'ABERTA') return true;
  return plantaoEncerrado(v);
}

export function urgenciaLabel(v: { data: string; horaInicio: string; horaFim: string; status: string }) {
  if (vagaEncerrada(v)) return null;
  const hojeStr = hojeBrasil();
  const amanhaStr = somarDiasISO(hojeStr, 1);
  const d = v.data.slice(0, 10);
  if (d === hojeStr) return 'É hoje';
  if (d === amanhaStr) return 'Amanhã';
  return null;
}

// Antes distinguia "preenchida por outro profissional" / "prazo encerrado" /
// "cancelada pela clínica" — simplificado a pedido: pra quem lê, o resultado
// prático de qualquer vaga fechada já era sempre o mesmo ("não dá mais"),
// então toda vaga encerrada mostra a mesma frase, sem explicar o motivo.
export function motivoVagaFechada(_v: { status: string }) {
  return 'Vaga concluída';
}

export function statusBadge(status: string) {
  const map: Record<string, [string, string, string]> = {
    cancelada: ['bg-gray-100', 'text-gray-500', 'Cancelada'],
    encerrada: ['bg-gray-100', 'text-gray-500', 'Encerrada'],
    aberta: ['bg-primaryTint', 'text-primaryDeep', 'Aberta'],
    preenchida: ['bg-secondary/10', 'text-secondary', 'Aguardando presença'],
    concluida: ['bg-gray-100', 'text-gray-500', 'Concluída'],
    pendente: ['bg-amber-100', 'text-amber-700', 'Pendente'],
    aceito: ['bg-primaryTint', 'text-primaryDeep', 'Aceito'],
    recusado: ['bg-danger/10', 'text-danger', 'Recusado'],
    desistiu: ['bg-gray-100', 'text-gray-500', 'Desistiu'],
    nao_compareceu: ['bg-danger/10', 'text-danger', 'Não compareceu'],
    aguardando_cobranca: ['bg-gray-100', 'text-gray-500', 'Aguardando cobrança'],
    processando: ['bg-secondary/10', 'text-secondary', 'Processando'],
    falhou: ['bg-danger/10', 'text-danger', 'Falhou'],
    retido: ['bg-amber-100', 'text-amber-700', 'Retido'],
    liberado_pendente: ['bg-amber-100', 'text-amber-700', 'Liberação pendente'],
    liberado: ['bg-primaryTint', 'text-primaryDeep', 'Liberado'],
    reembolsado: ['bg-gray-100', 'text-gray-500', 'Reembolsado'],
    cancelado: ['bg-gray-100', 'text-gray-500', 'Cancelado'],
    em_disputa: ['bg-danger/10', 'text-danger', 'Em disputa'],
  };
  const [bg, fg, label] = map[status] || map.pendente;
  return { className: `${bg} ${fg} font-bold text-xs px-2.5 py-1 rounded-lg whitespace-nowrap`, label };
}
