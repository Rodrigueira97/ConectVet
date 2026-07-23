const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = 'conectvet_token';
const ROLE_KEY = 'conectvet_role';

// Além do localStorage (usado para anexar o Bearer token nas chamadas à API),
// mantemos uma cópia em cookie para que o middleware do Next.js (que roda no
// servidor, antes da página carregar) consiga decidir redirecionamentos de
// autenticação sem esperar o JS do cliente montar a página.
function decodeJwtExpSeconds(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const maxAge = maxAgeSeconds !== undefined ? `; Max-Age=${maxAgeSeconds}` : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${maxAge}${secure}`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

export function setSession(token: string, role: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);

  const exp = decodeJwtExpSeconds(token);
  const maxAge = exp ? Math.max(exp - Math.floor(Date.now() / 1000), 0) : undefined;
  setCookie(TOKEN_KEY, token, maxAge);
  setCookie(ROLE_KEY, role, maxAge);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  deleteCookie(TOKEN_KEY);
  deleteCookie(ROLE_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message || 'Erro inesperado.';
    throw new ApiError(res.status, message);
  }

  return data as T;
}

function get<T>(path: string) {
  return request<T>(path, { method: 'GET' });
}
function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}
function patch<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
}

// ---------- Tipos ----------

export type Categoria = 'VETERINARIO_CLINICO' | 'VETERINARIO_ESPECIALISTA' | 'ESTAGIARIO' | 'AUXILIAR';

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  VETERINARIO_CLINICO: 'Veterinário Clínico',
  VETERINARIO_ESPECIALISTA: 'Veterinário Especialista',
  ESTAGIARIO: 'Estagiário',
  AUXILIAR: 'Auxiliar',
};

export const CATEGORIA_VALUE: Record<string, Categoria> = Object.fromEntries(
  Object.entries(CATEGORIA_LABEL).map(([value, label]) => [label, value]),
) as Record<string, Categoria>;

export const CATEGORIAS: Categoria[] = ['VETERINARIO_CLINICO', 'VETERINARIO_ESPECIALISTA', 'ESTAGIARIO', 'AUXILIAR'];

export const MIN_VALORES: Record<Categoria, number> = {
  VETERINARIO_CLINICO: 150,
  VETERINARIO_ESPECIALISTA: 250,
  ESTAGIARIO: 60,
  AUXILIAR: 90,
};

export type ProfissionalResumo = {
  id: string;
  nome: string;
  funcao: Categoria;
  areaAtuacao: string;
  regioesAtendimento: string;
};

export type Candidatura = {
  id: string;
  vagaId: string;
  profissionalId: string;
  status: 'PENDENTE' | 'ACEITO' | 'RECUSADO';
  createdAt: string;
  profissional?: ProfissionalResumo;
  vaga?: Vaga;
};

export type Pagamento = {
  id: string;
  vagaId: string;
  candidaturaId: string;
  valorBruto: string;
  taxa: string;
  valorLiquido: string;
  status: 'RETIDO' | 'LIBERADO';
  createdAt: string;
  liberadoEm: string | null;
  vaga?: { categoria: Categoria; cidade: string; estado: string; rua: string; numero: string };
  candidatura?: { profissional: { nome: string } };
};

export type Vaga = {
  id: string;
  clinicaId: string;
  categoria: Categoria;
  cep?: string | null;
  estado: string;
  cidade: string;
  bairro?: string | null;
  rua: string;
  numero: string;
  complemento?: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  valor: string;
  descricao?: string | null;
  status: 'ABERTA' | 'PREENCHIDA' | 'CONCLUIDA' | 'CANCELADA';
  createdAt: string;
  clinica?: { id?: string; nome: string };
  candidaturas?: Candidatura[];
  pagamento?: Pagamento | null;
};

export type Clinica = {
  id: string;
  userId: string;
  nome: string;
  cnpj: string;
  inscricaoEstadual: string;
  responsavelTecnico: string;
  cep?: string | null;
  estado: string;
  cidade: string;
  bairro?: string | null;
  rua: string;
  numero: string;
  complemento?: string | null;
  alvaraUrl: string;
  fotosEstrutura: string[];
  planosSaude?: string | null;
  sistemas?: string | null;
  observacoes?: string | null;
};

export type Profissional = {
  id: string;
  userId: string;
  nome: string;
  documento: string;
  funcao: Categoria;
  tipoComprovacao: string;
  comprovanteUrl: string;
  idDocUrls: string[];
  crmvDocUrls: string[];
  curriculoUrl: string;
  areaAtuacao: string;
  planoSaude?: string | null;
  regioesAtendimento: string;
  observacoes?: string | null;
};

// ---------- Auth ----------

export function login(email: string, senha: string) {
  return post<{ accessToken: string; role: string }>('/auth/login', { email, senha });
}

export function registrarClinica(payload: Record<string, unknown>) {
  return post<{ accessToken: string; role: string }>('/auth/register/clinica', payload);
}

export function registrarProfissional(payload: Record<string, unknown>) {
  return post<{ accessToken: string; role: string }>('/auth/register/profissional', payload);
}

export function me() {
  return get<{ id: string; email: string; role: string; clinica: Clinica | null; profissional: Profissional | null }>('/auth/me');
}

// ---------- Uploads ----------

export async function uploadArquivo(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { url } = await request<{ url: string }>('/uploads', { method: 'POST', body: form });
  return url;
}

export async function uploadArquivos(files: File[]): Promise<string[]> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const { urls } = await request<{ urls: string[] }>('/uploads/multiplos', { method: 'POST', body: form });
  return urls;
}

// ---------- Clínicas ----------

export function getClinicaMe() {
  return get<Clinica>('/clinicas/me');
}
export function updateClinicaMe(payload: Partial<Clinica>) {
  return patch<Clinica>('/clinicas/me', payload);
}

// ---------- Profissionais ----------

export function getProfissionalMe() {
  return get<Profissional>('/profissionais/me');
}
export function updateProfissionalMe(payload: Partial<Profissional>) {
  return patch<Profissional>('/profissionais/me', payload);
}

// ---------- Vagas ----------

export function getFeed(filtros?: { categoria?: Categoria; cidade?: string }) {
  const params = new URLSearchParams();
  if (filtros?.categoria) params.set('categoria', filtros.categoria);
  if (filtros?.cidade) params.set('cidade', filtros.cidade);
  const qs = params.toString();
  return get<Vaga[]>(`/vagas${qs ? `?${qs}` : ''}`);
}

export function getMinhasVagas() {
  return get<Vaga[]>('/vagas/minhas');
}

export function getVaga(id: string) {
  return get<Vaga>(`/vagas/${id}`);
}

export function criarVaga(payload: Record<string, unknown>) {
  return post<Vaga>('/vagas', payload);
}

export function atualizarVaga(id: string, payload: Record<string, unknown>) {
  return patch<Vaga>(`/vagas/${id}`, payload);
}

export function cancelarVaga(id: string) {
  return post<Vaga>(`/vagas/${id}/cancelar`);
}

// ---------- Candidaturas ----------

export function candidatar(vagaId: string) {
  return post<Candidatura>('/candidaturas', { vagaId });
}

export function getMinhasCandidaturas() {
  return get<Candidatura[]>('/candidaturas/minhas');
}

export function getCandidatosDaVaga(vagaId: string) {
  return get<Candidatura[]>(`/candidaturas/vaga/${vagaId}`);
}

export function aceitarCandidatura(id: string) {
  return patch<Pagamento>(`/candidaturas/${id}/aceitar`);
}

export function recusarCandidatura(id: string) {
  return patch<Candidatura>(`/candidaturas/${id}/recusar`);
}

// ---------- Pagamentos ----------

export function listarPagamentos() {
  return get<Pagamento[]>('/pagamentos');
}

export function liberarPagamento(id: string) {
  return patch<Pagamento>(`/pagamentos/${id}/liberar`);
}

// ---------- Avaliações ----------

export type Avaliacao = {
  id: string;
  candidaturaId: string;
  profissionalId: string;
  autor: 'CLINICA' | 'PROFISSIONAL';
  nota: number;
  comentario?: string | null;
  createdAt: string;
};

export function criarAvaliacao(payload: { candidaturaId: string; nota: number; comentario?: string }) {
  return post<Avaliacao>('/avaliacoes', payload);
}

export function getAvaliacoesPorCandidatura(candidaturaId: string) {
  return get<Avaliacao[]>(`/avaliacoes/candidatura/${candidaturaId}`);
}
