'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIAS, ESTADOS_CIDADES, onlyDigits, hojeBrasil } from '@/lib/mockData';
import { isValidCNPJ, isValidCpfCnpj, maskCEP, maskCNPJ, maskCpfCnpj, maskTelefone } from '@/lib/validators';
import { Categoria } from '@/lib/types';
import { uploadArquivos, registrarClinica, registrarProfissional, setSession, ApiError, CATEGORIA_VALUE, ESPECIALIDADES_VETERINARIAS } from '@/lib/api';
import { FileField } from '@/app/components/FileField';
import { DateField } from '@/app/components/DateField';
import { BuildingIcon, CheckIcon, CloseIcon, PlusIcon, UserIcon } from '@/app/components/icons';

type Role = 'clinica' | 'profissional';
type CepStatus = 'idle' | 'loading' | 'success' | 'error';

function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [...list, current] : list;
}

const HOJE_ISO = hojeBrasil();
const DATA_NASCIMENTO_MIN = '1900-01-01';

function dataNascimentoValida(iso: string) {
  const [ano] = iso.split('-');
  return ano.length === 4 && iso >= DATA_NASCIMENTO_MIN && iso <= HOJE_ISO;
}

const initialClinica = {
  nome: '', cnpj: '', inscricaoEstadual: '', responsavelTecnicoNome: '', responsavelTecnicoCrmv: '', telefone: '',
  cep: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '',
  sistemas: '', observacoes: '',
};

const initialProf = {
  nome: '', doc: '', funcao: '' as Categoria | '', telefone: '', dataNascimento: '',
  especialidade: '', especialidadeOutra: '',
  areaAtuacao: '', regioes: '', observacoes: '',
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

type Secao = { id: string; label: string };

const SECOES_CLINICA: Secao[] = [
  { id: 'acesso', label: 'Acesso' },
  { id: 'dados-clinica', label: 'Dados da clínica' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'estrutura', label: 'Estrutura' },
];

const SECOES_PROFISSIONAL: Secao[] = [
  { id: 'acesso', label: 'Acesso' },
  { id: 'dados-profissional', label: 'Dados do contratado' },
  { id: 'comprovacao', label: 'Comprovação' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'atuacao', label: 'Atuação' },
];

// Associa cada chave de erro de validate() à seção correspondente, pra calcular
// o progresso sem duplicar a lógica de obrigatoriedade.
const FIELD_SECTION_MAP: Record<string, string> = {
  email: 'acesso', senha: 'acesso',
  nome: 'dados-clinica', cnpj: 'dados-clinica', inscricaoEstadual: 'dados-clinica',
  responsavelTecnicoNome: 'dados-clinica', responsavelTecnicoCrmv: 'dados-clinica',
  telefone: 'dados-clinica', alvara: 'dados-clinica',
  estado: 'endereco', cidade: 'endereco', rua: 'endereco', numero: 'endereco',
  nomeProf: 'dados-profissional', doc: 'dados-profissional', funcao: 'dados-profissional',
  telefoneProf: 'dados-profissional', dataNascimentoProf: 'dados-profissional',
  especialidade: 'dados-profissional', especialidadeOutra: 'dados-profissional',
  comprovante: 'comprovacao',
  idDocFrente: 'documentos', idDocVerso: 'documentos',
  areaAtuacao: 'atuacao', regioes: 'atuacao',
};

export default function CadastroPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('clinica');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const secoesAtivas = role === 'clinica' ? SECOES_CLINICA : SECOES_PROFISSIONAL;
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [currentSection, setCurrentSection] = useState<string>('acesso');

  function handleRoleChange(novoRole: Role) {
    setRole(novoRole);
    setCurrentSection((novoRole === 'clinica' ? SECOES_CLINICA : SECOES_PROFISSIONAL)[0].id);
  }

  const [clinica, setClinica] = useState(initialClinica);
  const [alvara, setAlvara] = useState<File | null>(null);
  const [fotos, setFotos] = useState<{ file: File; url: string; descricao: string }[]>([]);
  const [logo, setLogo] = useState<File | null>(null);

  const [prof, setProf] = useState(initialProf);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [idDocFrente, setIdDocFrente] = useState<File | null>(null);
  const [idDocVerso, setIdDocVerso] = useState<File | null>(null);
  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

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

  function adicionarFotos(files: FileList | null) {
    if (!files || !files.length) return;
    const vagas = 3 - fotos.length;
    const novas = Array.from(files).slice(0, vagas).map((file) => ({ file, url: URL.createObjectURL(file), descricao: '' }));
    setFotos((f) => [...f, ...novas]);
  }

  function removerFoto(index: number) {
    setFotos((f) => {
      URL.revokeObjectURL(f[index].url);
      return f.filter((_, i) => i !== index);
    });
  }

  function atualizarDescricaoFoto(index: number, descricao: string) {
    setFotos((f) => f.map((item, i) => (i === index ? { ...item, descricao } : item)));
  }

  const fotosRef = useRef(fotos);
  useEffect(() => { fotosRef.current = fotos; }, [fotos]);
  useEffect(() => () => { fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-secao-id');
            if (id) setCurrentSection(id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    secoesAtivas.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const comprovacao = prof.funcao ? COMPROVACAO_POR_FUNCAO[prof.funcao] : null;

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Informe um e-mail válido.';
    if (!senha || senha.length < 4) e.senha = 'A senha deve ter ao menos 4 caracteres.';

    if (role === 'clinica') {
      if (!clinica.nome.trim()) e.nome = 'Informe o nome ou razão social.';
      if (!isValidCNPJ(clinica.cnpj)) e.cnpj = 'CNPJ inválido.';
      if (onlyDigits(clinica.inscricaoEstadual).length < 8) e.inscricaoEstadual = 'Informe uma inscrição estadual válida.';
      if (!clinica.responsavelTecnicoNome.trim()) e.responsavelTecnicoNome = 'Informe o nome completo do responsável técnico.';
      if (!clinica.responsavelTecnicoCrmv.trim()) e.responsavelTecnicoCrmv = 'Informe o CRMV do responsável técnico.';
      if (onlyDigits(clinica.telefone).length < 10) e.telefone = 'Informe um telefone válido com DDD.';
      if (!clinica.estado) e.estado = 'Selecione o estado.';
      if (!clinica.cidade) e.cidade = 'Selecione a cidade.';
      if (!clinica.rua.trim()) e.rua = 'Informe a rua.';
      if (!clinica.numero.trim()) e.numero = 'Informe o número.';
      if (!alvara) e.alvara = 'Anexe o alvará de funcionamento.';
      if (fotos.length > 3) e.fotos = 'Envie no máximo 3 fotos da estrutura.';
    } else {
      if (!prof.nome.trim()) e.nomeProf = 'Informe seu nome.';
      if (!isValidCpfCnpj(prof.doc)) e.doc = 'CPF ou CNPJ inválido.';
      if (!prof.funcao) e.funcao = 'Selecione a função.';
      if (prof.funcao === 'Veterinário Especialista') {
        if (!prof.especialidade) e.especialidade = 'Selecione sua especialidade.';
        else if (prof.especialidade === 'Outra' && !prof.especialidadeOutra.trim()) e.especialidadeOutra = 'Informe sua especialidade.';
      }
      if (onlyDigits(prof.telefone).length < 10) e.telefoneProf = 'Informe um telefone válido com DDD.';
      if (!prof.dataNascimento) e.dataNascimentoProf = 'Informe a data de nascimento.';
      else if (!dataNascimentoValida(prof.dataNascimento)) e.dataNascimentoProf = 'Informe uma data de nascimento válida.';
      if (prof.funcao && !comprovante) e.comprovante = `Anexe: ${COMPROVACAO_POR_FUNCAO[prof.funcao].label}.`;
      if (!idDocFrente) e.idDocFrente = 'Anexe a foto da frente do documento de identidade.';
      if (!idDocVerso) e.idDocVerso = 'Anexe a foto do verso do documento de identidade.';
      if (!prof.areaAtuacao.trim()) e.areaAtuacao = 'Informe sua área de atuação.';
      if (!prof.regioes.trim()) e.regioes = 'Informe as regiões de atendimento.';
    }
    return e;
  }

  async function cadastrar() {
    const e = validate();
    setErrors(e);
    setApiError('');
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      if (role === 'clinica') {
        const [alvaraUrl] = await uploadArquivos([alvara as File]);
        const urlsFotos = fotos.length > 0 ? await uploadArquivos(fotos.map((f) => f.file)) : [];
        const fotosEstrutura = urlsFotos.map((url, i) => ({ url, descricao: fotos[i].descricao || undefined }));
        const logoUrl = logo ? (await uploadArquivos([logo]))[0] : undefined;

        const { accessToken, role: contaRole } = await registrarClinica({
          email, senha,
          nome: clinica.nome,
          cnpj: onlyDigits(clinica.cnpj),
          inscricaoEstadual: clinica.inscricaoEstadual,
          responsavelTecnicoNome: clinica.responsavelTecnicoNome,
          responsavelTecnicoCrmv: clinica.responsavelTecnicoCrmv,
          telefone: onlyDigits(clinica.telefone),
          cep: clinica.cep || undefined,
          estado: clinica.estado,
          cidade: clinica.cidade,
          bairro: clinica.bairro || undefined,
          rua: clinica.rua,
          numero: clinica.numero,
          complemento: clinica.complemento || undefined,
          alvaraUrl,
          fotosEstrutura,
          logoUrl,
          sistemas: clinica.sistemas || undefined,
          observacoes: clinica.observacoes || undefined,
        });
        setSession(accessToken, contaRole);
        router.push('/clinica');
      } else {
        const [comprovanteUrl] = await uploadArquivos([comprovante as File]);
        const idDocUrls = await uploadArquivos([idDocFrente as File, idDocVerso as File]);
        const curriculoUrl = curriculo ? (await uploadArquivos([curriculo]))[0] : undefined;
        const fotoUrl = fotoPerfil ? (await uploadArquivos([fotoPerfil]))[0] : undefined;

        const { accessToken, role: contaRole } = await registrarProfissional({
          email, senha,
          nome: prof.nome,
          documento: onlyDigits(prof.doc),
          funcao: CATEGORIA_VALUE[prof.funcao as string],
          especialidade: prof.funcao === 'Veterinário Especialista'
            ? (prof.especialidade === 'Outra' ? prof.especialidadeOutra.trim() : prof.especialidade)
            : undefined,
          telefone: onlyDigits(prof.telefone),
          dataNascimento: prof.dataNascimento,
          tipoComprovacao: comprovacao?.label ?? '',
          comprovanteUrl,
          idDocUrls,
          curriculoUrl,
          fotoUrl,
          areaAtuacao: prof.areaAtuacao,
          regioesAtendimento: prof.regioes,
          observacoes: prof.observacoes || undefined,
        });
        setSession(accessToken, contaRole);
        router.push('/profissional');
      }
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Não foi possível concluir o cadastro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const liveErrors = validate();
  const secaoStats = secoesAtivas.map((s) => {
    const total = Object.values(FIELD_SECTION_MAP).filter((id) => id === s.id).length;
    // "comprovante" só vira erro depois que uma função é escolhida (validate() é condicional),
    // então aqui é calculado à parte pra não marcar a seção como concluída antes da hora.
    const filled = s.id === 'comprovacao'
      ? (comprovante ? 1 : 0)
      : total - Object.keys(liveErrors).filter((k) => FIELD_SECTION_MAP[k] === s.id).length;
    return { ...s, total, filled };
  });
  const totalGeral = secaoStats.reduce((sum, s) => sum + s.total, 0);
  const filledGeral = secaoStats.reduce((sum, s) => sum + s.filled, 0);
  const pctGeral = totalGeral ? Math.round((filledGeral / totalGeral) * 100) : 0;
  const secaoAtualLabel = secaoStats.find((s) => s.id === currentSection)?.label ?? '';

  function scrollToSecao(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary text-white px-6 py-6 md:px-10 md:py-8 bg-paws-header">
        <div className="max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/" className="text-xl font-extrabold">
              <span className="text-ink">conect</span> <span className="text-[#003531]">vet</span>
            </a>
            <div className="text-sm text-white/85 mt-0.5">Crie sua conta para começar a usar a plataforma</div>
          </div>
          <a href="/" className="text-sm font-bold text-white/90 whitespace-nowrap">Já tem conta? Entrar</a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex mt-5 mb-2">
          <div className="inline-flex p-1 gap-1 bg-gray-100 border border-gray-200 rounded-xl">
            <button
              onClick={() => handleRoleChange('clinica')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${role === 'clinica' ? 'bg-white text-primaryDeep shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BuildingIcon className="w-4 h-4" /> Sou Clínica
            </button>
            <button
              onClick={() => handleRoleChange('profissional')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${role === 'profissional' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <UserIcon className="w-4 h-4" /> Sou Profissional
            </button>
          </div>
        </div>

        <div className="md:hidden sticky top-0 z-10 bg-gray-50 -mx-4 px-4 pt-3 pb-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-ink mb-1.5">
            <span>{secaoAtualLabel}</span>
            <span className="text-gray-400 font-bold tabular-nums">{filledGeral}/{totalGeral}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pctGeral}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-7 py-6 md:py-8 items-start">
          <nav className="hidden md:flex md:flex-col md:gap-0.5 md:sticky md:top-6 bg-white border border-gray-200 rounded-2xl p-2.5">
            <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-extrabold text-gray-400 uppercase tracking-wide">Progresso</div>
            {secaoStats.map((s) => {
              const done = s.total > 0 && s.filled === s.total;
              const atual = currentSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSecao(s.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-bold text-left ${atual ? 'bg-primaryTint text-primaryDeep' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-primary border-primary text-white' : atual ? 'border-primaryDeep' : 'border-gray-300'}`}>
                    {done && <CheckIcon className="w-2.5 h-2.5" />}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex flex-col">

        <SectionCard id="acesso" sectionRef={(el) => { sectionRefs.current.acesso = el; }} title="Dados de acesso">
          <TextField label="E-mail" type="email" value={email} onChange={setEmail} error={errors.email} required />
          <TextField label="Senha" type="password" value={senha} onChange={setSenha} error={errors.senha} required />
        </SectionCard>

        {role === 'clinica' ? (
          <>
            <SectionCard id="dados-clinica" sectionRef={(el) => { sectionRefs.current['dados-clinica'] = el; }} title="Dados da clínica">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="self-center sm:self-start">
                  <AvatarPickerField label="Logo" file={logo} onChange={setLogo} shape="square" icon={<BuildingIcon className="w-8 h-8" />} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                  <TextField label="Nome / Razão social" value={clinica.nome} onChange={(v) => cField('nome', v)} error={errors.nome} required />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField label="CNPJ" value={clinica.cnpj} onChange={(v) => cField('cnpj', maskCNPJ(v))} error={errors.cnpj} placeholder="00.000.000/0000-00" required />
                    <TextField label="Inscrição estadual" value={clinica.inscricaoEstadual} onChange={(v) => cField('inscricaoEstadual', onlyDigits(v))} error={errors.inscricaoEstadual} required />
                  </div>
                </div>
              </div>
              <TextField label="Nome completo do responsável técnico" value={clinica.responsavelTecnicoNome} onChange={(v) => cField('responsavelTecnicoNome', v)} error={errors.responsavelTecnicoNome} required />
              <TextField label="CRMV do responsável técnico" value={clinica.responsavelTecnicoCrmv} onChange={(v) => cField('responsavelTecnicoCrmv', v)} error={errors.responsavelTecnicoCrmv} required />
              <TextField label="Telefone" value={maskTelefone(clinica.telefone)} onChange={(v) => cField('telefone', onlyDigits(v))} error={errors.telefone} placeholder="(00) 00000-0000" required />
              <FileField label="Alvará de funcionamento" files={alvara} onChange={(fl) => setAlvara(fl?.[0] ?? null)} error={errors.alvara} accept=".pdf,.jpg,.jpeg,.png" required />
            </SectionCard>

            <SectionCard id="endereco" sectionRef={(el) => { sectionRefs.current.endereco = el; }} title="Endereço">
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

            <SectionCard id="estrutura" sectionRef={(el) => { sectionRefs.current.estrutura = el; }} title="Estrutura e informações complementares">
              <div>
                <span className="text-sm font-bold">Fotos da estrutura <span className="text-gray-400 font-semibold text-xs">Opcional</span></span>
                <div className="text-xs text-gray-400 mt-0.5">Até 3 fotos ({fotos.length}/3). Você também pode adicionar depois em Perfil.</div>
                {errors.fotos && <span className="text-xs font-semibold text-danger">{errors.fotos}</span>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {fotos.map((f, i) => (
                    <div key={f.url} className="flex flex-col gap-1.5">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                        <img src={f.url} alt={f.descricao || 'Foto da estrutura'} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removerFoto(i)}
                          aria-label="Remover foto"
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        value={f.descricao}
                        onChange={(e) => atualizarDescricaoFoto(i, e.target.value)}
                        placeholder="Descrição (opcional)"
                        className="px-2 py-1 rounded-md border border-gray-200 text-xs outline-none"
                      />
                    </div>
                  ))}
                  {fotos.length < 3 && (
                    <label className="cursor-pointer aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-gray-50 hover:text-gray-500">
                      <PlusIcon className="w-5 h-5" />
                      <span className="text-xs font-bold">Adicionar</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { adicionarFotos(e.target.files); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
              </div>

              <TextField label="Sistemas de gestão" value={clinica.sistemas} onChange={(v) => cField('sistemas', v)} placeholder="Ex.: Simples Vet, Vet Smart..." />
              <TextArea label="Peculiaridades / observações" value={clinica.observacoes} onChange={(v) => cField('observacoes', v)} />
            </SectionCard>
          </>
        ) : (
          <>
            <SectionCard id="dados-profissional" sectionRef={(el) => { sectionRefs.current['dados-profissional'] = el; }} title="Dados do contratado">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="self-center sm:self-start">
                  <AvatarPickerField label="Foto" file={fotoPerfil} onChange={setFotoPerfil} shape="circle" icon={<UserIcon className="w-8 h-8" />} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                  <TextField label="Nome" value={prof.nome} onChange={(v) => pField('nome', v)} error={errors.nomeProf} required />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField label="CNPJ/CPF" value={prof.doc} onChange={(v) => pField('doc', maskCpfCnpj(v))} error={errors.doc} placeholder="000.000.000-00" required />
                    <TextField label="Escolha da função" value={prof.funcao} onChange={() => {}} error={errors.funcao} required select
                      options={CATEGORIAS}
                      onSelect={(v) => { pField('funcao', v as Categoria); setComprovante(null); pField('especialidade', ''); pField('especialidadeOutra', ''); }}
                    />
                  </div>
                  {prof.funcao === 'Veterinário Especialista' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="Especialidade" value={prof.especialidade} onChange={() => {}} error={errors.especialidade} required select
                        options={ESPECIALIDADES_VETERINARIAS}
                        onSelect={(v) => pField('especialidade', v)}
                      />
                      {prof.especialidade === 'Outra' && (
                        <TextField label="Qual especialidade?" value={prof.especialidadeOutra} onChange={(v) => pField('especialidadeOutra', v)} error={errors.especialidadeOutra} required />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <TextField label="Telefone" value={maskTelefone(prof.telefone)} onChange={(v) => pField('telefone', onlyDigits(v))} error={errors.telefoneProf} placeholder="(00) 00000-0000" required />
              <DateField label="Data de nascimento" value={prof.dataNascimento} onChange={(v) => pField('dataNascimento', v)} error={errors.dataNascimentoProf} min={DATA_NASCIMENTO_MIN} max={HOJE_ISO} required />
            </SectionCard>

            <SectionCard id="comprovacao" sectionRef={(el) => { sectionRefs.current.comprovacao = el; }} title="Comprovação de função">
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

            <SectionCard id="documentos" sectionRef={(el) => { sectionRefs.current.documentos = el; }} title="Documentos">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileField label="Foto do documento de identidade (frente)" files={idDocFrente} onChange={(fl) => setIdDocFrente(fl?.[0] ?? null)} error={errors.idDocFrente} accept="image/*" required />
                <FileField label="Foto do documento de identidade (verso)" files={idDocVerso} onChange={(fl) => setIdDocVerso(fl?.[0] ?? null)} error={errors.idDocVerso} accept="image/*" required />
              </div>
              <FileField label="Currículo (opcional)" files={curriculo} onChange={(fl) => setCurriculo(fl?.[0] ?? null)} accept=".pdf" />
            </SectionCard>

            <SectionCard id="atuacao" sectionRef={(el) => { sectionRefs.current.atuacao = el; }} title="Atuação">
              <TextField label="Área de atuação" value={prof.areaAtuacao} onChange={(v) => pField('areaAtuacao', v)} error={errors.areaAtuacao} placeholder="Ex.: Clínica geral, cirurgia, dermatologia" required />
              <TextField label="Regiões de atendimento" value={prof.regioes} onChange={(v) => pField('regioes', v)} error={errors.regioes} placeholder="Ex.: Pinheiros, Zona Oeste - SP" required />
              <TextArea label="Observações e demais informações" value={prof.observacoes} onChange={(v) => pField('observacoes', v)} />
            </SectionCard>
          </>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="text-sm font-semibold text-danger mb-3">Corrija os campos destacados acima antes de continuar.</div>
        )}
        {apiError && <div className="text-sm font-semibold text-danger mb-3">{apiError}</div>}

            <button
              onClick={cadastrar}
              disabled={submitting}
              className="w-full py-3.5 rounded-lg bg-primary hover:bg-primaryDark text-white font-bold text-sm disabled:opacity-60"
            >
              {submitting ? 'Enviando...' : 'Criar conta'}
            </button>
          </div>
        </div>

        <div className="text-center mt-1 mb-8 text-sm text-gray-500">
          Já tem conta? <a href="/" className="font-bold">Entrar</a>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  id, sectionRef, title, children,
}: {
  id?: string;
  sectionRef?: (el: HTMLDivElement | null) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      data-secao-id={id}
      ref={sectionRef}
      className="bg-white border border-gray-200 rounded-2xl p-6 md:p-7 flex flex-col gap-4 mb-5 scroll-mt-6"
    >
      <div className="text-sm font-extrabold text-gray-800">{title}</div>
      {children}
    </div>
  );
}

function TextField({
  label, value, onChange, error, placeholder, type = 'text', required, maxLength, min, max, select, options, onSelect, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  min?: string;
  max?: string;
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
          min={min}
          max={max}
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

function AvatarPickerField({
  label, file, onChange, shape, icon,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  shape: 'circle' | 'square';
  icon: React.ReactNode;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  return (
    <div className="flex items-center gap-4">
      <div className={`w-20 h-20 ${shapeClass} bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden shrink-0`}>
        {previewUrl ? <img src={previewUrl} alt={label} className="w-full h-full object-cover" /> : icon}
      </div>
      <label className="cursor-pointer px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50">
        {file ? 'Trocar' : 'Adicionar'} {label.toLowerCase()}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

