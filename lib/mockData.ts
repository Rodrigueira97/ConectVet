import { Categoria } from './types';

export const CATEGORIAS: Categoria[] = ['Veterinário Clínico', 'Veterinário Especialista', 'Estagiário', 'Auxiliar'];

// Área de atuação só se aplica a veterinários já formados (clínico ou especialista);
// estagiários e auxiliares ainda não têm registro profissional pra atuar por área.
export function isVeterinarioFormado(funcao: Categoria | ''): boolean {
  return funcao === 'Veterinário Clínico' || funcao === 'Veterinário Especialista';
}

export const MIN_VALORES: Record<Categoria, number> = {
  'Veterinário Clínico': 150,
  'Veterinário Especialista': 250,
  'Estagiário': 60,
  'Auxiliar': 90,
};

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
    retido: ['bg-amber-100', 'text-amber-700', 'Retido'],
    liberado: ['bg-primaryTint', 'text-primaryDeep', 'Liberado'],
  };
  const [bg, fg, label] = map[status] || map.pendente;
  return { className: `${bg} ${fg} font-bold text-xs px-2.5 py-1 rounded-lg whitespace-nowrap`, label };
}
