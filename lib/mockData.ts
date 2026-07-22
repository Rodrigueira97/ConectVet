import { Vaga, MinhaVaga, Pagamento, Candidatura, Categoria } from './types';

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

export const FEED_MOCK: Vaga[] = [
  { clinica: 'Clínica Pata Feliz', categoria: 'Veterinário Clínico', local: 'Pinheiros, São Paulo - SP', dataIso: '2026-07-28', data: '28/07/2026', horario: '08:00 - 18:00', turno: 'Diurno', valor: '180', descricao: 'Plantão de clínica geral em consultório com bom fluxo de atendimento. Necessário experiência com pequenos animais.' },
  { clinica: 'Hospital Vet Amigo', categoria: 'Estagiário', local: 'Moema, São Paulo - SP', dataIso: '2026-07-30', data: '30/07/2026', horario: '13:00 - 19:00', turno: 'Diurno', valor: '70' },
  { clinica: 'Clínica AnimalCare', categoria: 'Veterinário Especialista', local: 'Copacabana, Rio de Janeiro - RJ', dataIso: '2026-08-02', data: '02/08/2026', horario: '19:00 - 07:00', turno: 'Noturno', valor: '260', descricao: 'Plantão noturno de urgência e emergência. Desejável experiência em UTI veterinária.' },
  { clinica: 'Vet Center Jardins', categoria: 'Auxiliar', local: 'Jardins, São Paulo - SP', dataIso: '2026-07-29', data: '29/07/2026', horario: '08:00 - 16:00', turno: 'Diurno', valor: '95' },
  { clinica: 'Clínica São Francisco Pet', categoria: 'Veterinário Clínico', local: 'Savassi, Belo Horizonte - MG', dataIso: '2026-08-01', data: '01/08/2026', horario: '07:00 - 19:00', turno: 'Diurno', valor: '190' },
  { clinica: 'PetCare 24h', categoria: 'Veterinário Clínico', local: 'Boa Viagem, Recife - PE', dataIso: '2026-08-03', data: '03/08/2026', horario: '22:00 - 06:00', turno: 'Noturno', valor: '210' },
  { clinica: 'Hospital Veterinário Sul', categoria: 'Estagiário', local: 'Menino Deus, Porto Alegre - RS', dataIso: '2026-07-31', data: '31/07/2026', horario: '13:00 - 19:00', turno: 'Diurno', valor: '65' },
  { clinica: 'Clínica Bicho Feliz', categoria: 'Veterinário Especialista', local: 'Batel, Curitiba - PR', dataIso: '2026-08-04', data: '04/08/2026', horario: '08:00 - 18:00', turno: 'Diurno', valor: '270' },
  { clinica: 'VetLife Emergências', categoria: 'Auxiliar', local: 'Barra da Tijuca, Rio de Janeiro - RJ', dataIso: '2026-08-05', data: '05/08/2026', horario: '20:00 - 08:00', turno: 'Noturno', valor: '110' },
  { clinica: 'Clínica Amigo Fiel', categoria: 'Veterinário Clínico', local: 'Pinheiros, São Paulo - SP', dataIso: '2026-07-28', data: '28/07/2026', horario: '09:00 - 17:00', turno: 'Diurno', valor: '175' },
];

export const MINHAS_VAGAS_MOCK: MinhaVaga[] = [
  { id: 'mv1', categoria: 'Veterinário Clínico', local: 'Pinheiros, São Paulo - SP', data: '25/07/2026', horario: '08:00 - 18:00', valor: '180', status: 'aberta', candidatos: [
    { id: 'c1', nome: 'Dra. Marina Alves', funcao: 'Veterinário Clínico', area: 'Clínica geral', regioes: 'Pinheiros, Zona Oeste - SP', status: 'pendente' },
    { id: 'c2', nome: 'Dr. Felipe Souza', funcao: 'Veterinário Clínico', area: 'Clínica geral, cirurgia', regioes: 'Vila Madalena - SP', status: 'pendente' },
  ] },
  { id: 'mv2', categoria: 'Estagiário', local: 'Moema, São Paulo - SP', data: '30/07/2026', horario: '13:00 - 19:00', valor: '70', status: 'concluida', candidatos: [
    { id: 'c3', nome: 'Juliana Prado', funcao: 'Estagiário', area: '—', regioes: 'Moema - SP', status: 'aceito' },
    { id: 'c4', nome: 'Rafael Lima', funcao: 'Estagiário', area: '—', regioes: 'Itaim Bibi - SP', status: 'recusado' },
  ] },
  { id: 'mv3', categoria: 'Auxiliar', local: 'Jardins, São Paulo - SP', data: '02/08/2026', horario: '08:00 - 16:00', valor: '95', status: 'aberta', candidatos: [] },
  { id: 'mv4', categoria: 'Veterinário Especialista', local: 'Savassi, Belo Horizonte - MG', data: '22/07/2026', horario: '19:00 - 07:00', valor: '260', status: 'preenchida', candidatos: [
    { id: 'c5', nome: 'Dr. André Ramos', funcao: 'Veterinário Especialista', area: 'Dermatologia', regioes: 'Savassi - MG', status: 'aceito' },
  ] },
  { id: 'mv5', categoria: 'Auxiliar', local: 'Batel, Curitiba - PR', data: '21/07/2026', horario: '08:00 - 16:00', valor: '95', status: 'preenchida', candidatos: [
    { id: 'c6', nome: 'Camila Duarte', funcao: 'Auxiliar', area: '—', regioes: 'Batel - PR', status: 'aceito' },
  ] },
];

export const PAGAMENTOS_MOCK: Pagamento[] = [
  { id: 'p1', mvId: 'mv2', candId: 'c3', nome: 'Juliana Prado', status: 'liberado' },
  { id: 'p2', mvId: 'mv4', candId: 'c5', nome: 'Dr. André Ramos', status: 'retido' },
  { id: 'p3', mvId: 'mv5', candId: 'c6', nome: 'Camila Duarte', status: 'retido' },
];

export const CANDIDATURAS_MOCK: Candidatura[] = [
  { id: 'h1', clinica: 'Hospital Vet Amigo', categoria: 'Estagiário', valor: '70', data: '20/07/2026', horario: '13:00 - 19:00', status: 'aceito' },
  { id: 'h2', clinica: 'Clínica AnimalCare', categoria: 'Veterinário Especialista', valor: '260', data: '15/07/2026', horario: '19:00 - 07:00', status: 'recusado' },
];

export function onlyDigits(v: string) { return (v || '').replace(/\D/g, ''); }

export function buildEndereco(form: { rua?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; estado?: string }) {
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
