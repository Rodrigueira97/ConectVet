'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIAS, ESTADOS_CIDADES, onlyDigits } from '@/lib/mockData';
import { isValidCNPJ, isValidCpfCnpj, maskCEP, maskCNPJ, maskCpfCnpj } from '@/lib/validators';
import { Categoria } from '@/lib/types';

type Role = 'clinica' | 'profissional';
type CepStatus = 'idle' | 'loading' | 'success' | 'error';

function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [...list, current] : list;
}

const initialClinica = {
  nome: '', cnpj: '', inscricaoEstadual: '', responsavelTecnico: '',
  cep: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '',
  planosSaude: '', sistemas: '', observacoes: '',
};

const initialProf = {
  nome: '', doc: '', funcao: '' as Categoria | '',
  areaAtuacao: '', planoSaude: '', regioes: '', observacoes: '',
};

const COMPROVACAO_POR_FUNCAO: Record<Categoria, { label: string; accept: string; hint: string }> = {
  'Veterinário Clínico': {
    label: 'Foto da carteirinha do CRMV (ou arquivo PDF)',
    accept: 'image/*,.pdf',
    hint: 'Envie a foto da carteirinha do CRMV ou um PDF do documento.',
  },
  'Veterinário Especialista': {
    label: 'Foto da carteirinha do CRMV (ou arquivo PDF)',
    accept: 'image/*,.pdf',
    hint: 'Envie a foto da carteirinha do CRMV ou um PDF do documento.',
  },
  'Estagiário': {
    label: 'Comprovante de matrícula ativa',
    accept: '.pdf,.jpg,.jpeg,.png',
    hint: 'Envie o comprovante de matrícula ativa na instituição de ensino.',
  },
  'Auxiliar': {
    label: 'Certificado de conclusão de curso',
    accept: '.pdf,.jpg,.jpeg,.png',
    hint: 'Envie o certificado de conclusão do curso de auxiliar veterinário.',
  },
};

export default function CadastroPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('clinica');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [clinica, setClinica] = useState(initialClinica);
  const [alvara, setAlvara] = useState<File | null>(null);
  const [fotos, setFotos] = useState<FileList | null>(null);

  const [prof, setProf] = useState(initialProf);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [idDocs, setIdDocs] = useState<FileList | null>(null);
  const [curriculo, setCurriculo] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle');

  function cField<K extends keyof typeof initialClinica>(key: K, value: (typeof initialClinica)[K]) {
    setClinica((f) => ({ ...f, [key]: value }));
  }

  async function buscarCep(cep: string) {
    setCepStatus('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { setCepStatus('error'); return; }
      setClinica((f) => ({
        ...f,
        rua: data.logradouro || f.rua,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
      }));
      setCepStatus('success');
    } catch {
      setCepStatus('error');
    }
  }

  function onCepChange(v: string) {
    const d = onlyDigits(v).slice(0, 8);
    cField('cep', d);
    setCepStatus('idle');
    if (d.length === 8) buscarCep(d);
  }
  function pField<K extends keyof typeof initialProf>(key: K, value: (typeof initialProf)[K]) {
    setProf((f) => ({ ...f, [key]: value }));
  }

  const comprovacao = prof.funcao ? COMPROVACAO_POR_FUNCAO[prof.funcao] : null;

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Informe um e-mail válido.';
    if (!senha || senha.length < 4) e.senha = 'A senha deve ter ao menos 4 caracteres.';

    if (role === 'clinica') {
      if (!clinica.nome.trim()) e.nome = 'Informe o nome ou razão social.';
      if (!isValidCNPJ(clinica.cnpj)) e.cnpj = 'CNPJ inválido.';
      if (onlyDigits(clinica.inscricaoEstadual).length < 8) e.inscricaoEstadual = 'Informe uma inscrição estadual válida.';
      if (!clinica.responsavelTecnico.trim()) e.responsavelTecnico = 'Informe o responsável técnico habilitado.';
      if (!clinica.estado) e.estado = 'Selecione o estado.';
      if (!clinica.cidade) e.cidade = 'Selecione a cidade.';
      if (!clinica.rua.trim()) e.rua = 'Informe a rua.';
      if (!clinica.numero.trim()) e.numero = 'Informe o número.';
      if (!alvara) e.alvara = 'Anexe o alvará de funcionamento.';
      if (!fotos || fotos.length === 0) e.fotos = 'Anexe ao menos uma foto da estrutura.';
    } else {
      if (!prof.nome.trim()) e.nomeProf = 'Informe seu nome.';
      if (!isValidCpfCnpj(prof.doc)) e.doc = 'CPF ou CNPJ inválido.';
      if (!prof.funcao) e.funcao = 'Selecione a função.';
      if (prof.funcao && !comprovante) e.comprovante = `Anexe: ${COMPROVACAO_POR_FUNCAO[prof.funcao].label}.`;
      if (!idDocs || idDocs.length < 2) e.idDocs = 'Anexe as fotos de frente e verso do documento de identidade.';
      if (!curriculo) e.curriculo = 'Anexe seu currículo.';
      if (!prof.areaAtuacao.trim()) e.areaAtuacao = 'Informe sua área de atuação.';
      if (!prof.regioes.trim()) e.regioes = 'Informe as regiões de atendimento.';
    }
    return e;
  }

  function cadastrar() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    router.push(`/${role}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary text-white px-6 py-6 md:px-10 md:py-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-extrabold">ConectVet</div>
            <div className="text-sm text-white/85 mt-0.5">Crie sua conta para começar a usar a plataforma</div>
          </div>
          <a href="/" className="text-sm font-bold text-white/90 whitespace-nowrap">Já tem conta? Entrar</a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 md:p-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setRole('clinica')}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-bold ${role === 'clinica' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            Sou Clínica
          </button>
          <button
            onClick={() => setRole('profissional')}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-bold ${role === 'profissional' ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            Sou Profissional
          </button>
        </div>

        <SectionCard title="Dados de acesso">
          <TextField label="E-mail" type="email" value={email} onChange={setEmail} error={errors.email} required />
          <TextField label="Senha" type="password" value={senha} onChange={setSenha} error={errors.senha} required />
        </SectionCard>

        {role === 'clinica' ? (
          <>
            <SectionCard title="Dados da clínica">
              <TextField label="Nome / Razão social" value={clinica.nome} onChange={(v) => cField('nome', v)} error={errors.nome} required />
              <TextField label="CNPJ" value={clinica.cnpj} onChange={(v) => cField('cnpj', maskCNPJ(v))} error={errors.cnpj} placeholder="00.000.000/0000-00" required />
              <TextField label="Inscrição estadual" value={clinica.inscricaoEstadual} onChange={(v) => cField('inscricaoEstadual', onlyDigits(v))} error={errors.inscricaoEstadual} required />
              <TextField label="Responsável técnico habilitado" value={clinica.responsavelTecnico} onChange={(v) => cField('responsavelTecnico', v)} error={errors.responsavelTecnico} placeholder="Nome completo e CRMV" required />
              <FileField label="Alvará de funcionamento" files={alvara} onChange={(fl) => setAlvara(fl?.[0] ?? null)} error={errors.alvara} accept=".pdf,.jpg,.jpeg,.png" required />
            </SectionCard>

            <SectionCard title="Endereço">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-bold">CEP</span>
                  <input
                    value={maskCEP(clinica.cep)}
                    onChange={(e) => onCepChange(e.target.value)}
                    placeholder="00000-000"
                    className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none max-w-[200px]"
                  />
                  {cepStatus === 'loading' && <span className="text-xs text-gray-400">Buscando endereço...</span>}
                  {cepStatus === 'error' && <span className="text-xs font-semibold text-danger">CEP não encontrado. Preencha o endereço manualmente.</span>}
                  <a
                    href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-primary w-fit"
                  >
                    Não sei o CEP
                  </a>
                </label>
                <TextField label="Estado (UF)" value={clinica.estado} onChange={() => {}} error={errors.estado} required select
                  options={withCurrent(Object.keys(ESTADOS_CIDADES), clinica.estado)}
                  onSelect={(v) => setClinica((f) => ({ ...f, estado: v, cidade: '' }))}
                />
                <TextField label="Cidade" value={clinica.cidade} onChange={() => {}} error={errors.cidade} required select
                  options={withCurrent(ESTADOS_CIDADES[clinica.estado] || [], clinica.cidade)}
                  onSelect={(v) => cField('cidade', v)}
                  disabled={!clinica.estado}
                />
                <TextField label="Bairro" value={clinica.bairro} onChange={(v) => cField('bairro', v)} />
                <TextField label="Rua" value={clinica.rua} onChange={(v) => cField('rua', v)} error={errors.rua} required />
                <TextField label="Número" value={clinica.numero} onChange={(v) => cField('numero', v)} error={errors.numero} required />
                <TextField label="Complemento" value={clinica.complemento} onChange={(v) => cField('complemento', v)} />
              </div>
            </SectionCard>

            <SectionCard title="Estrutura e informações complementares">
              <FileField label="Fotos da estrutura" files={fotos} onChange={setFotos} error={errors.fotos} accept="image/*" multiple required hint="Envie uma ou mais fotos." />
              <TextField label="Planos de saúde aceitos" value={clinica.planosSaude} onChange={(v) => cField('planosSaude', v)} placeholder="Ex.: Petlove Saúde, Sasy, Vetpay..." />
              <TextField label="Sistemas" value={clinica.sistemas} onChange={(v) => cField('sistemas', v)} placeholder="Sistema de gestão utilizado pela clínica" />
              <TextArea label="Peculiaridades / observações" value={clinica.observacoes} onChange={(v) => cField('observacoes', v)} />
            </SectionCard>
          </>
        ) : (
          <>
            <SectionCard title="Dados do contratado">
              <TextField label="Nome" value={prof.nome} onChange={(v) => pField('nome', v)} error={errors.nomeProf} required />
              <TextField label="CNPJ/CPF" value={prof.doc} onChange={(v) => pField('doc', maskCpfCnpj(v))} error={errors.doc} placeholder="000.000.000-00" required />
              <TextField label="Escolha da função" value={prof.funcao} onChange={() => {}} error={errors.funcao} required select
                options={CATEGORIAS}
                onSelect={(v) => { pField('funcao', v as Categoria); setComprovante(null); }}
              />
            </SectionCard>

            <SectionCard title="Comprovação de função">
              {comprovacao ? (
                <FileField
                  label={comprovacao.label}
                  files={comprovante}
                  onChange={(fl) => setComprovante(fl?.[0] ?? null)}
                  error={errors.comprovante}
                  accept={comprovacao.accept}
                  required
                  hint={comprovacao.hint}
                />
              ) : (
                <div className="text-xs text-gray-400">Selecione a função acima para indicar o documento necessário.</div>
              )}
            </SectionCard>

            <SectionCard title="Documentos">
              <FileField label="Foto do documento de identidade (frente e verso)" files={idDocs} onChange={setIdDocs} error={errors.idDocs} accept="image/*" multiple required hint="Selecione as duas fotos juntas: frente e verso." />
              <FileField label="Currículo" files={curriculo} onChange={(fl) => setCurriculo(fl?.[0] ?? null)} error={errors.curriculo} accept=".pdf" required />
            </SectionCard>

            <SectionCard title="Atuação">
              <TextField label="Área de atuação" value={prof.areaAtuacao} onChange={(v) => pField('areaAtuacao', v)} error={errors.areaAtuacao} placeholder="Ex.: Clínica geral, cirurgia, dermatologia" required />
              <TextField label="Plano de saúde" value={prof.planoSaude} onChange={(v) => pField('planoSaude', v)} placeholder="Opcional" />
              <TextField label="Regiões de atendimento" value={prof.regioes} onChange={(v) => pField('regioes', v)} error={errors.regioes} placeholder="Ex.: Pinheiros, Zona Oeste - SP" required />
              <TextArea label="Observações e demais informações" value={prof.observacoes} onChange={(v) => pField('observacoes', v)} />
            </SectionCard>
          </>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="text-sm font-semibold text-danger mb-3">Corrija os campos destacados acima antes de continuar.</div>
        )}

        <button onClick={cadastrar} className="w-full py-3.5 rounded-lg bg-primary hover:bg-primaryDark text-white font-bold text-sm">
          Criar conta
        </button>

        <div className="text-center mt-5 mb-8 text-sm text-gray-500">
          Já tem conta? <a href="/" className="font-bold">Entrar</a>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-7 flex flex-col gap-4 mb-5">
      <div className="text-sm font-extrabold text-gray-800">{title}</div>
      {children}
    </div>
  );
}

function TextField({
  label, value, onChange, error, placeholder, type = 'text', required, maxLength, select, options, onSelect, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  select?: boolean;
  options?: string[];
  onSelect?: (v: string) => void;
  disabled?: boolean;
}) {
  const inputClass = `px-3 py-2.5 rounded-lg border text-sm outline-none ${error ? 'border-danger' : 'border-gray-300'}`;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}{required && <span className="text-danger"> *</span>}</span>
      {select ? (
        <select value={value} disabled={disabled} onChange={(e) => onSelect?.(e.target.value)} className={inputClass}>
          <option value="">Selecione...</option>
          {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none" />
    </label>
  );
}

function FileField({
  label, files, onChange, error, required, multiple, accept, hint,
}: {
  label: string;
  files: FileList | File | null;
  onChange: (files: FileList | null) => void;
  error?: string;
  required?: boolean;
  multiple?: boolean;
  accept?: string;
  hint?: string;
}) {
  const names = files ? (files instanceof FileList ? Array.from(files).map((f) => f.name) : [files.name]) : [];
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}{required && <span className="text-danger"> *</span>}</span>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => onChange(e.target.files)}
        className={`text-sm border rounded-lg px-3 py-2.5 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 file:text-xs file:font-bold cursor-pointer ${error ? 'border-danger' : 'border-gray-300'}`}
      />
      {names.length > 0 && <span className="text-xs text-gray-500">{names.join(', ')}</span>}
      {hint && !error && <span className="text-xs text-gray-400">{hint}</span>}
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}
