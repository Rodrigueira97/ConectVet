import { Categoria } from './types';

export const CATEGORIAS: Categoria[] = ['Veterinário Clínico', 'Veterinário Especialista', 'Estagiário', 'Auxiliar'];

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
    aberta: ['bg-sky-100', 'text-sky-700', 'Aberta'],
    preenchida: ['bg-amber-100', 'text-amber-700', 'Aguardando presença'],
    concluida: ['bg-green-100', 'text-green-700', 'Concluída'],
    pendente: ['bg-amber-100', 'text-amber-700', 'Pendente'],
    aceito: ['bg-green-100', 'text-green-700', 'Aceito'],
    recusado: ['bg-red-100', 'text-red-700', 'Recusado'],
    retido: ['bg-amber-100', 'text-amber-700', 'Retido'],
    liberado: ['bg-green-100', 'text-green-700', 'Liberado'],
  };
  const [bg, fg, label] = map[status] || map.pendente;
  return { className: `${bg} ${fg} font-bold text-xs px-2.5 py-1 rounded-lg whitespace-nowrap`, label };
}
