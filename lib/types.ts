export type Categoria = 'Veterinário Clínico' | 'Veterinário Especialista' | 'Estagiário' | 'Auxiliar';

export interface Vaga {
  clinica: string;
  categoria: Categoria;
  local: string;
  dataIso: string;
  data: string;
  horario: string;
  turno: 'Diurno' | 'Noturno';
  valor: string;
  descricao?: string;
}

export interface Candidato {
  id: string;
  nome: string;
  funcao: string;
  area: string;
  regioes: string;
  status: 'pendente' | 'aceito' | 'recusado';
}

export interface MinhaVaga {
  id: string;
  categoria: Categoria;
  local: string;
  data: string;
  horario: string;
  valor: string;
  descricao?: string;
  status: 'aberta' | 'preenchida' | 'concluida' | 'cancelada';
  candidatos: Candidato[];
}

export interface Pagamento {
  id: string;
  mvId: string;
  candId: string;
  nome: string;
  status: 'retido' | 'liberado';
}

export interface Candidatura {
  id: string;
  clinica: string;
  categoria: Categoria;
  valor: string;
  data: string;
  horario: string;
  status: 'pendente' | 'aceito' | 'recusado';
}

export interface Avaliacao {
  nota: number;
  comentario: string;
}
