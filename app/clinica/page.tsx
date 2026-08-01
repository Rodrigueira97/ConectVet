'use client';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CATEGORIAS, MIN_VALORES, TAXA_PLATAFORMA, ESTADOS_CIDADES, onlyDigits, buildEndereco, mapsLink, statusBadge, hojeBrasil, plantaoEncerrado } from '@/lib/mockData';
import { Categoria } from '@/lib/types';
import { Sidebar } from '@/app/components/Sidebar';
import { HomeIcon, PlusIcon, GridIcon, UserIcon, BuildingIcon, CloseIcon, PinIcon, ShieldIcon, HeartIcon, GraduationCapIcon, EyeIcon, WarningIcon, PencilIcon, PhoneIcon, CheckCircleIcon, SearchIcon, UsersIcon } from '@/app/components/icons';
import { maskCEP, maskTelefone } from '@/lib/validators';
import { VagaDetalheView, VagaDetalheData } from '@/app/components/VagaDetalhe';
import { AvaliacaoCandidatura } from '@/app/components/AvaliacaoCandidatura';
import { FeedPageSkeleton } from '@/app/components/skeletons/FeedPageSkeleton';
import { CardSkeleton } from '@/app/components/skeletons/CardSkeleton';
import { RatingBadge } from '@/app/components/RatingBadge';
import { EmptyState } from '@/app/components/EmptyState';
import { NotificationBell } from '@/app/components/NotificationBell';
import { RecorteFotoModal } from '@/app/components/RecorteFotoModal';
import { DateField } from '@/app/components/DateField';
import { TimeField } from '@/app/components/TimeField';
import { useToast } from '@/app/components/Toast';
import {
  ApiError, getToken, clearSession, CATEGORIA_LABEL, CATEGORIA_VALUE,
  Vaga, Candidatura, Clinica, Avaliacao,
  getClinicaMe, updateClinicaMe, getMinhasVagas, criarVaga, atualizarVaga, cancelarVaga as apiCancelarVaga,
  getCandidatosDaVaga, aceitarCandidatura, recusarCandidatura, liberarPagamento as apiLiberarPagamento,
  getAvaliacoesPorCandidatura, uploadArquivo, uploadArquivos,
} from '@/lib/api';

type Tab = 'home' | 'criar-vaga' | 'painel' | 'candidatos' | 'pagamento' | 'perfil';
type CepStatus = 'idle' | 'loading' | 'success' | 'error';
type PainelFiltro = 'todas' | 'aberta' | 'encerrada' | 'preenchida' | 'concluida' | 'cancelada' | 'retido';

function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [...list, current] : list;
}

function perfilFormFromClinica(c: Clinica) {
  return {
    nome: c.nome, cnpj: c.cnpj, telefone: c.telefone || '',
    cep: c.cep || '', estado: c.estado, cidade: c.cidade, bairro: c.bairro || '', rua: c.rua, numero: c.numero, complemento: c.complemento || '',
  };
}

function formatDataBR(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function localDaVaga(v: { rua: string; numero: string; complemento?: string | null; bairro?: string | null; cidade: string; estado: string }) {
  return buildEndereco({ rua: v.rua, numero: v.numero, complemento: v.complemento || undefined, bairro: v.bairro || undefined, cidade: v.cidade, estado: v.estado });
}

// Uma vaga aberta cuja data já passou sem ninguém contratado nunca muda de status no backend
// (continua ABERTA) — aqui ela é tratada como encerrada só pra exibição/filtro no Painel.
// Plantões que atravessam a madrugada só encerram depois do horaFim, não na virada do dia.
function vagaExpirada(v: { data: string; horaInicio: string; horaFim: string; status: string }) {
  return v.status === 'ABERTA' && plantaoEncerrado(v);
}

function buildVagaDetalhe(mv: Vaga): VagaDetalheData {
  return {
    categoria: CATEGORIA_LABEL[mv.categoria],
    rua: mv.rua, numero: mv.numero, complemento: mv.complemento, bairro: mv.bairro, cidade: mv.cidade, estado: mv.estado,
    data: mv.data, horaInicio: mv.horaInicio, horaFim: mv.horaFim,
    valor: mv.valor, descricao: mv.descricao,
  };
}

const CATEGORIA_ICON: Record<Categoria, (className: string) => ReactNode> = {
  'Veterinário Clínico': (c) => <HeartIcon className={c} />,
  'Veterinário Especialista': (c) => <ShieldIcon className={c} />,
  'Estagiário': (c) => <GraduationCapIcon className={c} />,
  'Auxiliar': (c) => <UserIcon className={c} />,
};

function SectionHead({ num, title, sub }: { num: number; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-[26px] h-[26px] rounded-lg bg-primaryTint text-primaryDeep flex items-center justify-center text-xs font-extrabold shrink-0">{num}</div>
      <div>
        <div className="text-[15px] font-extrabold text-ink">{title}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

const vagaFormInicial = {
  outroEndereco: false, cep: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '',
  data: '', horaInicio: '', horaFim: '', valor: '', categoria: '' as Categoria | '', descricao: '',
};

export default function ClinicaPage() {
  return (
    <Suspense fallback={<FeedPageSkeleton sidebarItems={4} />}>
      <ClinicaPageInner />
    </Suspense>
  );
}

function ClinicaPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Tab, vaga/candidatura selecionada e filtro do painel moram na URL (não em estado local):
  // refresh, botão voltar do navegador e links compartilhados/vindos de notificação continuam
  // funcionando. `goTo` funde um patch nos query params atuais numa única navegação — chamar
  // vários setters em sequência no mesmo handler pisaria um no outro, já que cada um partiria
  // do mesmo searchParams "congelado" da renderização atual.
  function goTo(patch: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const tab = (searchParams.get('tab') as Tab | null) || 'home';
  const selectedMvId = searchParams.get('vaga');
  const selectedCandId = searchParams.get('cand');
  const painelFiltro = (searchParams.get('filtro') as PainelFiltro | null) || 'todas';
  const vagaDetalheId = searchParams.get('detalhe');

  // Trocar de aba pela sidebar precisa fechar o detalhe de vaga aberto — ele é
  // renderizado com prioridade sobre as abas, então sem isso a tela ficava "presa".
  function setTab(next: Tab) { goTo({ tab: next === 'home' ? null : next, detalhe: null }); }
  function setPainelFiltro(next: PainelFiltro) { goTo({ filtro: next === 'todas' ? null : next }); }
  function irParaCandidatos(mvId: string) { goTo({ vaga: mvId, tab: 'candidatos' }); }
  function irParaPagamento(mvId: string, candId: string) { goTo({ vaga: mvId, cand: candId, tab: 'pagamento' }); }
  function voltarAoPainel() { goTo({ tab: null, vaga: null, cand: null }); }
  function abrirDetalheVaga(mvId: string) { goTo({ detalhe: mvId }); }
  function fecharDetalheVaga() { goTo({ detalhe: null }); }

  const [loading, setLoading] = useState(true);
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [minhasVagas, setMinhasVagas] = useState<Vaga[]>([]);
  const [candidatos, setCandidatos] = useState<Candidatura[]>([]);
  const [candidatosLoading, setCandidatosLoading] = useState(false);
  const [avaliacoesPorCandidatura, setAvaliacoesPorCandidatura] = useState<Record<string, Avaliacao[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const vagaSelecionadaMv = vagaDetalheId ? minhasVagas.find((m) => m.id === vagaDetalheId) : undefined;
  const vagaSelecionada = vagaSelecionadaMv ? buildVagaDetalhe(vagaSelecionadaMv) : null;

  const [vagaForm, setVagaForm] = useState(vagaFormInicial);
  const [vagaCepStatus, setVagaCepStatus] = useState<CepStatus>('idle');
  const [publishing, setPublishing] = useState(false);
  const [vagaErrors, setVagaErrors] = useState<Record<string, string>>({});

  function limparErroVaga(campo: string) {
    setVagaErrors((e) => {
      if (!e[campo]) return e;
      const next = { ...e };
      delete next[campo];
      return next;
    });
  }

  const [perfilForm, setPerfilForm] = useState({
    nome: '', cnpj: '', telefone: '',
    cep: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '',
  });
  const [perfilCepStatus, setPerfilCepStatus] = useState<CepStatus>('idle');
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoParaCortar, setLogoParaCortar] = useState<File | null>(null);
  const [filaFotosParaCortar, setFilaFotosParaCortar] = useState<File[]>([]);
  const [fotosCortadas, setFotosCortadas] = useState<Blob[]>([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.push('/'); return; }
    (async () => {
      try {
        const [c, mv] = await Promise.all([getClinicaMe(), getMinhasVagas()]);
        setClinica(c);
        setPerfilForm(perfilFormFromClinica(c));
        setMinhasVagas(mv);

        const hiredIds = mv
          .filter((v) => v.status === 'CONCLUIDA')
          .map((v) => v.candidaturas?.find((cand) => cand.status === 'ACEITO')?.id)
          .filter((id): id is string => !!id);
        const pares = await Promise.all(hiredIds.map(async (id) => [id, await getAvaliacoesPorCandidatura(id)] as const));
        setAvaliacoesPorCandidatura(Object.fromEntries(pares));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) { clearSession(); router.push('/'); }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (tab !== 'candidatos' || !selectedMvId) return;
    setCandidatosLoading(true);
    getCandidatosDaVaga(selectedMvId).then(setCandidatos).catch(() => {}).finally(() => setCandidatosLoading(false));
  }, [tab, selectedMvId]);

  async function refreshMinhasVagas() {
    setMinhasVagas(await getMinhasVagas());
  }

  async function buscarCepVaga(cep: string) {
    setVagaCepStatus('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { setVagaCepStatus('error'); return; }
      setVagaForm((f) => ({
        ...f,
        rua: data.logradouro || f.rua,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
      }));
      setVagaCepStatus('success');
    } catch {
      setVagaCepStatus('error');
    }
  }

  function onVagaCepChange(v: string) {
    const d = onlyDigits(v).slice(0, 8);
    setVagaForm((f) => ({ ...f, cep: d }));
    setVagaCepStatus('idle');
    if (d.length === 8) buscarCepVaga(d);
  }

  async function buscarCepPerfil(cep: string) {
    setPerfilCepStatus('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { setPerfilCepStatus('error'); return; }
      setPerfilForm((f) => ({
        ...f,
        rua: data.logradouro || f.rua,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
      }));
      setPerfilCepStatus('success');
    } catch {
      setPerfilCepStatus('error');
    }
  }

  function onPerfilCepChange(v: string) {
    const d = onlyDigits(v).slice(0, 8);
    setPerfilForm((f) => ({ ...f, cep: d }));
    setPerfilCepStatus('idle');
    if (d.length === 8) buscarCepPerfil(d);
  }

  const enderecoParaExibir = vagaForm.outroEndereco
    ? buildEndereco(vagaForm)
    : clinica ? buildEndereco(clinica) : '';

  const minVal = vagaForm.categoria ? MIN_VALORES[vagaForm.categoria] : undefined;
  const valorNum = parseFloat(vagaForm.valor);
  let horaLabel = '';
  if (vagaForm.horaInicio && vagaForm.horaFim) {
    const [h1, m1] = vagaForm.horaInicio.split(':').map(Number);
    const [h2, m2] = vagaForm.horaFim.split(':').map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff < 0) diff += 24;
    horaLabel = `Duração: ${diff.toFixed(1)}h${diff > 12 ? ' — excede o máximo de 12h' : ''}`;
  }
  const localPreview = vagaForm.outroEndereco
    ? [vagaForm.bairro, [vagaForm.cidade, vagaForm.estado].filter(Boolean).join(' - ')].filter(Boolean).join(', ')
    : clinica ? [clinica.bairro, [clinica.cidade, clinica.estado].filter(Boolean).join(' - ')].filter(Boolean).join(', ') : '';

  function validateVaga(): Record<string, string> {
    const e: Record<string, string> = {};
    if (vagaForm.outroEndereco) {
      if (!vagaForm.estado) e.estado = 'Selecione o estado.';
      if (!vagaForm.cidade) e.cidade = 'Selecione a cidade.';
      if (!vagaForm.rua.trim()) e.rua = 'Informe a rua.';
      if (!vagaForm.numero.trim()) e.numero = 'Informe o número.';
    } else if (!clinica?.rua) {
      e.endereco = 'Sua clínica não tem endereço cadastrado. Cadastre em Perfil ou use outro endereço pra essa vaga.';
    }
    if (!vagaForm.categoria) e.categoria = 'Selecione a categoria.';
    if (!vagaForm.data) e.data = 'Selecione a data do serviço.';
    if (!vagaForm.horaInicio) e.horaInicio = 'Selecione o horário de início.';
    if (!vagaForm.horaFim) e.horaFim = 'Selecione o horário de fim.';
    if (!vagaForm.valor || isNaN(parseFloat(vagaForm.valor)) || parseFloat(vagaForm.valor) <= 0) e.valor = 'Informe o valor do plantão.';
    return e;
  }

  async function publicarVaga() {
    const errosValidacao = validateVaga();
    setVagaErrors(errosValidacao);
    if (Object.keys(errosValidacao).length > 0 || !clinica) return;
    setPublishing(true);
    const endereco = vagaForm.outroEndereco
      ? { cep: vagaForm.cep || undefined, estado: vagaForm.estado, cidade: vagaForm.cidade, bairro: vagaForm.bairro || undefined, rua: vagaForm.rua, numero: vagaForm.numero, complemento: vagaForm.complemento || undefined }
      : { cep: clinica.cep || undefined, estado: clinica.estado, cidade: clinica.cidade, bairro: clinica.bairro || undefined, rua: clinica.rua, numero: clinica.numero, complemento: clinica.complemento || undefined };
    const payload = {
      categoria: CATEGORIA_VALUE[vagaForm.categoria],
      ...endereco,
      data: vagaForm.data,
      horaInicio: vagaForm.horaInicio,
      horaFim: vagaForm.horaFim,
      valor: vagaForm.valor,
      descricao: vagaForm.descricao || undefined,
    };
    try {
      const eraEdicao = !!editingId;
      if (editingId) {
        await atualizarVaga(editingId, payload);
        setEditingId(null);
      } else {
        await criarVaga(payload);
      }
      setVagaForm(vagaFormInicial);
      setVagaCepStatus('idle');
      setVagaErrors({});
      await refreshMinhasVagas();
      voltarAoPainel();
      toast.success(eraEdicao ? 'Vaga atualizada' : 'Vaga publicada', {
        message: eraEdicao ? 'As alterações já estão visíveis pros profissionais.' : 'Profissionais da região já podem se candidatar.',
      });
    } catch (err) {
      toast.error('Não foi possível publicar a vaga', {
        message: err instanceof ApiError ? err.message : undefined,
        action: { label: 'Tentar novamente', onClick: publicarVaga },
      });
    } finally {
      setPublishing(false);
    }
  }

  function editarVaga(mv: Vaga) {
    setEditingId(mv.id);
    setVagaForm({
      outroEndereco: true,
      cep: mv.cep || '', estado: mv.estado, cidade: mv.cidade, bairro: mv.bairro || '', rua: mv.rua, numero: mv.numero, complemento: mv.complemento || '',
      data: mv.data.slice(0, 10), horaInicio: mv.horaInicio, horaFim: mv.horaFim, valor: mv.valor, categoria: CATEGORIA_LABEL[mv.categoria] as Categoria, descricao: mv.descricao || '',
    });
    setVagaCepStatus('idle');
    setVagaErrors({});
    setTab('criar-vaga');
  }

  async function cancelarVaga(id: string) {
    try {
      await apiCancelarVaga(id);
      await refreshMinhasVagas();
      toast.success('Vaga cancelada');
    } catch (err) {
      toast.error('Não foi possível cancelar a vaga', { message: err instanceof ApiError ? err.message : undefined });
    }
  }

  function aceitarCandidato(mvId: string, candId: string) {
    const mv = minhasVagas.find((m) => m.id === mvId);
    if (!mv || mv.status !== 'ABERTA') return; // cada vaga só pode ter um profissional aprovado
    irParaPagamento(mvId, candId);
  }

  async function recusarCandidato(candId: string) {
    try {
      await recusarCandidatura(candId);
      if (selectedMvId) setCandidatos(await getCandidatosDaVaga(selectedMvId));
      toast.success('Candidato recusado');
    } catch (err) {
      toast.error('Não foi possível recusar o candidato', { message: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function confirmarPagamento() {
    if (!selectedCandId) return;
    try {
      await aceitarCandidatura(selectedCandId);
      await refreshMinhasVagas();
      voltarAoPainel();
      toast.success('Profissional contratado', { message: 'O pagamento fica retido até você confirmar a presença.' });
    } catch (err) {
      toast.error('Não foi possível confirmar o pagamento', { message: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function handleLiberarPagamento(pagamentoId: string) {
    try {
      await apiLiberarPagamento(pagamentoId);
      await refreshMinhasVagas();
      toast.success('Pagamento liberado');
    } catch (err) {
      toast.error('Não foi possível liberar o pagamento', { message: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function salvarPerfil() {
    setSavingPerfil(true);
    try {
      const atualizado = await updateClinicaMe({
        nome: perfilForm.nome,
        telefone: onlyDigits(perfilForm.telefone) || undefined,
        cep: perfilForm.cep || undefined,
        estado: perfilForm.estado,
        cidade: perfilForm.cidade,
        bairro: perfilForm.bairro || undefined,
        rua: perfilForm.rua,
        numero: perfilForm.numero,
        complemento: perfilForm.complemento || undefined,
      });
      setClinica(atualizado);
      setPerfilForm(perfilFormFromClinica(atualizado));
      toast.success('Perfil atualizado');
    } catch (err) {
      toast.error('Não foi possível salvar o perfil', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setSavingPerfil(false);
    }
  }

  function handleLogoSelecionada(files: FileList | null) {
    const file = files?.[0];
    if (file) setLogoParaCortar(file);
  }

  async function handleLogoCortada(blob: Blob) {
    setLogoParaCortar(null);
    setUploadingLogo(true);
    try {
      const arquivo = new File([blob], 'logo.jpg', { type: 'image/jpeg' });
      const logoUrl = await uploadArquivo(arquivo);
      const atualizado = await updateClinicaMe({ logoUrl });
      setClinica(atualizado);
      toast.success('Logo atualizada');
    } catch (err) {
      toast.error('Não foi possível enviar a logo', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUploadingLogo(false);
    }
  }

  // Corta uma foto de cada vez: ao confirmar o corte da atual, ela sai da fila
  // e a próxima assume — só sobem de verdade quando a fila esvazia.
  function handleFotosSelecionadas(files: FileList | null) {
    if (!files || !files.length || !clinica) return;
    const vagas = 3 - clinica.fotosEstrutura.length;
    if (vagas <= 0) return;
    setFilaFotosParaCortar(Array.from(files).slice(0, vagas));
    setFotosCortadas([]);
  }

  function cancelarFilaFotos() {
    setFilaFotosParaCortar([]);
    setFotosCortadas([]);
  }

  function handleFotoEstruturaCortada(blob: Blob) {
    const novaLista = [...fotosCortadas, blob];
    const restante = filaFotosParaCortar.slice(1);
    setFotosCortadas(novaLista);
    setFilaFotosParaCortar(restante);
    if (restante.length === 0) enviarFotosEstrutura(novaLista);
  }

  async function enviarFotosEstrutura(blobs: Blob[]) {
    if (!clinica) return;
    setUploadingFotos(true);
    try {
      const arquivos = blobs.map((b, i) => new File([b], `estrutura-${i}.jpg`, { type: 'image/jpeg' }));
      const novasUrls = await uploadArquivos(arquivos);
      const fotosEstrutura = [...clinica.fotosEstrutura, ...novasUrls.map((url) => ({ url, descricao: '' }))];
      const atualizado = await updateClinicaMe({ fotosEstrutura });
      setClinica(atualizado);
      toast.success(novasUrls.length > 1 ? 'Fotos adicionadas' : 'Foto adicionada');
    } catch (err) {
      toast.error('Não foi possível enviar as fotos', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUploadingFotos(false);
    }
  }

  async function handleFotoRemover(url: string) {
    if (!clinica) return;
    const fotosEstrutura = clinica.fotosEstrutura.filter((f) => f.url !== url);
    try {
      const atualizado = await updateClinicaMe({ fotosEstrutura });
      setClinica(atualizado);
    } catch (err) {
      toast.error('Não foi possível remover a foto', { message: err instanceof ApiError ? err.message : undefined });
    }
  }

  function handleFotoDescricaoChange(url: string, descricao: string) {
    if (!clinica) return;
    setClinica({ ...clinica, fotosEstrutura: clinica.fotosEstrutura.map((f) => (f.url === url ? { ...f, descricao } : f)) });
  }

  async function handleFotoDescricaoSalvar(url: string) {
    if (!clinica) return;
    try {
      const atualizado = await updateClinicaMe({ fotosEstrutura: clinica.fotosEstrutura });
      setClinica(atualizado);
    } catch (err) {
      toast.error('Não foi possível salvar a descrição', { message: err instanceof ApiError ? err.message : undefined });
    }
  }

  const selectedMv = minhasVagas.find((m) => m.id === selectedMvId) || null;
  const selectedCand = candidatos.find((c) => c.id === selectedCandId) || null;
  const pendingTotal = minhasVagas
    .filter((mv) => mv.status === 'ABERTA' && !vagaExpirada(mv))
    .reduce((sum, mv) => sum + (mv.candidaturas || []).filter((c) => c.status === 'PENDENTE').length, 0);

  const vagasAtivas = minhasVagas.filter((v) => v.status === 'ABERTA').length;
  const vagasConsideradas = minhasVagas.filter((v) => v.status !== 'CANCELADA');
  const vagasPreenchidas = vagasConsideradas.filter((v) => v.status === 'PREENCHIDA' || v.status === 'CONCLUIDA').length;
  const taxaPreenchimento = vagasConsideradas.length ? Math.round((vagasPreenchidas / vagasConsideradas.length) * 100) : null;
  const avaliacoesRecebidas = minhasVagas
    .filter((v) => v.status === 'CONCLUIDA')
    .flatMap((v) => {
      const hired = (v.candidaturas || []).find((c) => c.status === 'ACEITO');
      if (!hired) return [];
      return (avaliacoesPorCandidatura[hired.id] || [])
        .filter((a) => a.autor === 'PROFISSIONAL')
        .map((a) => ({ ...a, profissionalNome: hired.profissional?.nome || 'Profissional', data: v.data }));
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const notaMedia = avaliacoesRecebidas.length
    ? avaliacoesRecebidas.reduce((soma, a) => soma + a.nota, 0) / avaliacoesRecebidas.length
    : null;
  const retidoTotal = minhasVagas.reduce((soma, v) => soma + (v.pagamento?.status === 'RETIDO' ? Number(v.pagamento.valorBruto) : 0), 0);
  const candidatosPendentes = minhasVagas
    .filter((v) => v.status === 'ABERTA' && !vagaExpirada(v))
    .flatMap((v) => (v.candidaturas || []).filter((c) => c.status === 'PENDENTE').map((c) => ({ candidatura: c, vaga: v })));

  if (loading || !clinica) {
    return <FeedPageSkeleton sidebarItems={4} />;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        accent="primary"
        subtitle="Clínica"
        items={[
          { key: 'home', label: 'Home', icon: <HomeIcon /> },
          { key: 'criar-vaga', label: 'Criar vaga', icon: <PlusIcon /> },
          { key: 'painel', label: 'Painel', icon: <GridIcon />, count: pendingTotal },
          { key: 'perfil', label: 'Perfil', icon: <UserIcon /> },
        ]}
        activeKey={tab}
        onSelect={(key) => setTab(key as Tab)}
        footerName={clinica.nome}
        footerSubtitle="Conta clínica"
        footerPhotoUrl={clinica.logoUrl}
        footerIcon="building"
      />

      <div className="fixed top-2.5 right-14 md:top-5 md:right-6 z-30">
        <NotificationBell />
      </div>

      <main className="flex-1 overflow-y-auto bg-paws">
        {vagaSelecionada ? (
          <VagaDetalheView vaga={vagaSelecionada} onBack={fecharDetalheVaga} />
        ) : (
        <>
        {tab === 'home' && (
            <div className="max-w-[1080px] mx-auto p-8">
              <h1 className="text-2xl font-extrabold mb-1 text-white">Painel</h1>
              <p className="text-sm text-white/85 mb-6">Como sua clínica está indo na plataforma</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                <div className="bg-white rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-ink">{vagasAtivas}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">Vagas ativas</div>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-ink">{taxaPreenchimento !== null ? `${taxaPreenchimento}%` : '—'}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">Taxa de preenchimento</div>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-ink">{notaMedia !== null ? notaMedia.toFixed(1) : '—'}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">Avaliação recebida</div>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-ink">R$ {retidoTotal.toFixed(2)}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">Retido, aguardando confirmação</div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-extrabold text-ink">Candidatos aguardando resposta</div>
                  {candidatosPendentes.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-[11px] font-extrabold px-2 py-0.5 rounded-full">{candidatosPendentes.length}</span>
                  )}
                </div>
                {candidatosPendentes.length === 0 ? (
                  <div className="text-sm text-gray-400 mt-2">Nenhum candidato pendente no momento.</div>
                ) : (
                  <div className="flex flex-col">
                    {candidatosPendentes.map(({ candidatura: c, vaga: v }) => (
                      <div key={c.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-b-0">
                        <div className="w-8 h-8 rounded-full bg-primaryTint text-primaryDeep flex items-center justify-center text-xs font-extrabold shrink-0">
                          {(c.profissional?.nome || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-ink truncate">{c.profissional?.nome}</div>
                          <div className="text-[12px] text-gray-500 truncate">{c.profissional && CATEGORIA_LABEL[c.profissional.funcao]} · vaga de <b className="font-bold text-gray-700">{formatDataBR(v.data)}</b></div>
                        </div>
                        <button
                          onClick={() => irParaCandidatos(v.id)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shrink-0"
                        >
                          Ver
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        )}

        {tab === 'criar-vaga' && (
          <div className="max-w-[1080px] mx-auto p-8">
            <div className="text-sm font-bold text-primaryTint mb-1">{editingId ? 'Editar vaga' : 'Nova vaga'}</div>
            <h1 className="text-2xl font-extrabold mb-6 text-white">{editingId ? 'Editar vaga' : 'Nova vaga'}</h1>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">
              <div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7">
                  <SectionHead num={1} title="Onde" />
                  {!vagaForm.outroEndereco ? (
                    <div>
                      <div className={`flex items-start gap-2.5 border rounded-xl px-3.5 py-3 ${vagaErrors.endereco ? 'border-danger bg-red-50/40' : 'bg-gray-50 border-gray-200'}`}>
                        <PinIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm text-gray-700 flex-1">
                          {enderecoParaExibir || 'Endereço da clínica não cadastrado — cadastre em Perfil ou use outro endereço abaixo.'}
                          <div className="mt-1.5">
                            <button type="button" onClick={() => { setVagaForm((f) => ({ ...f, outroEndereco: true })); limparErroVaga('endereco'); }} className="text-[13px] font-bold text-primary">
                              Usar outro endereço pra essa vaga
                            </button>
                          </div>
                        </div>
                      </div>
                      {vagaErrors.endereco && <span className="text-xs font-semibold text-danger mt-1.5 block">{vagaErrors.endereco}</span>}
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-1.5 sm:col-span-2">
                          <span className="text-sm font-bold">CEP</span>
                          <input
                            value={maskCEP(vagaForm.cep)}
                            onChange={(e) => onVagaCepChange(e.target.value)}
                            placeholder="00000-000"
                            className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none max-w-[200px]"
                          />
                          {vagaCepStatus === 'loading' && <span className="text-xs text-gray-400">Buscando endereço...</span>}
                          {vagaCepStatus === 'error' && <span className="text-xs font-semibold text-danger">CEP não encontrado. Preencha o endereço manualmente.</span>}
                          <a
                            href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-primary w-fit"
                          >
                            Não sei o CEP
                          </a>
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold">Estado (UF) *</span>
                          <select value={vagaForm.estado} onChange={(e) => { setVagaForm((f) => ({ ...f, estado: e.target.value, cidade: '' })); limparErroVaga('estado'); }} className={`px-3 py-2.5 rounded-lg border text-sm ${vagaErrors.estado ? 'border-danger' : 'border-gray-300'}`}>
                            <option value="">Selecione...</option>
                            {withCurrent(Object.keys(ESTADOS_CIDADES), vagaForm.estado).map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                          </select>
                          {vagaErrors.estado && <span className="text-xs font-semibold text-danger">{vagaErrors.estado}</span>}
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold">Cidade *</span>
                          <select disabled={!vagaForm.estado} value={vagaForm.cidade} onChange={(e) => { setVagaForm((f) => ({ ...f, cidade: e.target.value })); limparErroVaga('cidade'); }} className={`px-3 py-2.5 rounded-lg border text-sm ${vagaErrors.cidade ? 'border-danger' : 'border-gray-300'}`}>
                            <option value="">Selecione...</option>
                            {withCurrent(ESTADOS_CIDADES[vagaForm.estado] || [], vagaForm.cidade).map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {vagaErrors.cidade && <span className="text-xs font-semibold text-danger">{vagaErrors.cidade}</span>}
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold">Bairro</span>
                          <input value={vagaForm.bairro} onChange={(e) => setVagaForm((f) => ({ ...f, bairro: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold">Rua *</span>
                          <input value={vagaForm.rua} onChange={(e) => { setVagaForm((f) => ({ ...f, rua: e.target.value })); limparErroVaga('rua'); }} className={`px-3 py-2.5 rounded-lg border text-sm ${vagaErrors.rua ? 'border-danger' : 'border-gray-300'}`} />
                          {vagaErrors.rua && <span className="text-xs font-semibold text-danger">{vagaErrors.rua}</span>}
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold">Número *</span>
                          <input value={vagaForm.numero} onChange={(e) => { setVagaForm((f) => ({ ...f, numero: e.target.value })); limparErroVaga('numero'); }} className={`px-3 py-2.5 rounded-lg border text-sm ${vagaErrors.numero ? 'border-danger' : 'border-gray-300'}`} />
                          {vagaErrors.numero && <span className="text-xs font-semibold text-danger">{vagaErrors.numero}</span>}
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm font-bold">Complemento</span>
                          <input value={vagaForm.complemento} onChange={(e) => setVagaForm((f) => ({ ...f, complemento: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                        </label>
                      </div>
                      {enderecoParaExibir && (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mt-4">
                          {enderecoParaExibir} — <a href={mapsLink(enderecoParaExibir)} target="_blank" className="font-bold">ver no Google Maps</a>
                        </div>
                      )}
                      <button type="button" onClick={() => setVagaForm((f) => ({ ...f, outroEndereco: false }))} className="text-[13px] font-bold text-primary mt-3">
                        ← Usar o endereço da clínica
                      </button>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <SectionHead num={2} title="Quando" />
                    <div className="flex flex-col gap-4">
                      <DateField
                        label="Data do serviço"
                        value={vagaForm.data}
                        onChange={(v) => { setVagaForm((f) => ({ ...f, data: v })); limparErroVaga('data'); }}
                        min={hojeBrasil()}
                        error={vagaErrors.data}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <TimeField label="Início" value={vagaForm.horaInicio} onChange={(v) => { setVagaForm((f) => ({ ...f, horaInicio: v })); limparErroVaga('horaInicio'); }} error={vagaErrors.horaInicio} />
                        <TimeField label="Fim" value={vagaForm.horaFim} onChange={(v) => { setVagaForm((f) => ({ ...f, horaFim: v })); limparErroVaga('horaFim'); }} error={vagaErrors.horaFim} />
                      </div>
                      {horaLabel && <div className="text-xs font-mono text-gray-500 -mt-2">{horaLabel}</div>}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <SectionHead num={3} title="Vaga" />
                    <span className="text-sm font-bold block mb-2">Categoria</span>
                    <div className="grid grid-cols-2 gap-2.5 mb-1.5">
                      {CATEGORIAS.map((c) => {
                        const selecionada = vagaForm.categoria === c;
                        return (
                          <button
                            type="button"
                            key={c}
                            onClick={() => { setVagaForm((f) => ({ ...f, categoria: c })); limparErroVaga('categoria'); }}
                            className={`text-left rounded-xl border-[1.5px] p-3 transition-colors ${
                              selecionada ? 'border-primary bg-primaryTint' : vagaErrors.categoria ? 'border-danger' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-[26px] h-[26px] rounded-lg flex items-center justify-center mb-2 ${selecionada ? 'bg-primary text-white' : 'bg-primaryTint text-primaryDeep'}`}>
                              {CATEGORIA_ICON[c]('w-3.5 h-3.5')}
                            </div>
                            <div className="text-[13px] font-extrabold text-ink">{c}</div>
                            <div className="text-[11px] text-gray-400">Mín. R$ {MIN_VALORES[c]}</div>
                          </button>
                        );
                      })}
                    </div>
                    {vagaErrors.categoria && <span className="text-xs font-semibold text-danger block mb-3">{vagaErrors.categoria}</span>}
                    <label className="flex flex-col gap-1.5 mt-3">
                      <span className="text-sm font-bold">Valor a pagar ao profissional (R$)</span>
                      <input type="number" value={vagaForm.valor} onChange={(e) => { setVagaForm((f) => ({ ...f, valor: e.target.value })); limparErroVaga('valor'); }} className={`px-3 py-2.5 rounded-lg border text-sm ${vagaErrors.valor ? 'border-danger' : 'border-gray-300'}`} />
                      {vagaErrors.valor && <span className="text-xs font-semibold text-danger">{vagaErrors.valor}</span>}
                      {minVal && (
                        <span className={`text-xs ${!isNaN(valorNum) && valorNum < minVal ? 'text-danger font-semibold' : 'text-gray-500'}`}>
                          Mínimo para esta categoria: R$ {minVal}{!isNaN(valorNum) && valorNum < minVal ? ' — abaixo do mínimo' : ''}
                        </span>
                      )}
                      {!isNaN(valorNum) && valorNum > 0 ? (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 flex flex-col gap-1">
                          <div className="flex justify-between"><span>Profissional recebe</span><span className="font-bold">R$ {valorNum.toFixed(2)}</span></div>
                          <div className="flex justify-between text-gray-500"><span>Taxa da ConectVet (5%)</span><span>+ R$ {(valorNum * TAXA_PLATAFORMA).toFixed(2)}</span></div>
                          <div className="flex justify-between font-extrabold pt-1 border-t border-gray-200"><span>Você paga no total</span><span>R$ {(valorNum * (1 + TAXA_PLATAFORMA)).toFixed(2)}</span></div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">A ConectVet soma 5% de taxa de serviço sobre este valor.</span>
                      )}
                    </label>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <SectionHead num={4} title="Detalhes" sub="Opcional" />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold">Descrição</span>
                      <textarea
                        value={vagaForm.descricao}
                        onChange={(e) => setVagaForm((f) => ({ ...f, descricao: e.target.value }))}
                        rows={3}
                        placeholder="Detalhes sobre a vaga, requisitos, observações..."
                        className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                      />
                    </label>
                  </div>

                  {Object.keys(vagaErrors).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="flex items-start gap-2.5 bg-red-50 rounded-xl px-3.5 py-3 text-sm font-semibold text-danger">
                        <WarningIcon className="w-4 h-4 shrink-0 mt-px" />
                        Corrija os campos destacados acima antes de publicar.
                      </div>
                    </div>
                  )}
                </div>
                <button disabled={publishing} onClick={publicarVaga}
                  className={`mt-4 w-full py-3.5 rounded-lg font-bold text-sm shadow-sm ${publishing ? 'bg-gray-200 text-gray-400' : 'bg-ink text-white'}`}>
                  {publishing ? 'Publicando...' : editingId ? 'Salvar alterações' : 'Publicar vaga'}
                </button>
              </div>

              <div className="hidden md:block sticky top-8">
                <div className="text-xs font-bold text-white/85 mb-2.5 flex items-center gap-1.5">
                  <EyeIcon className="w-3.5 h-3.5" /> Assim que o profissional vai ver
                </div>
                <div className="bg-paws rounded-2xl p-4">
                  <div className="bg-white rounded-2xl p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-[10.5px] font-extrabold text-primary uppercase tracking-wide">{vagaForm.categoria || 'Categoria'}</div>
                        <div className="text-[15px] font-extrabold text-ink mt-0.5">{clinica.nome}</div>
                        <div className="mt-1"><RatingBadge /></div>
                      </div>
                      <div className="bg-primaryTint text-primaryDeep font-extrabold text-[12.5px] px-[9px] py-1 rounded-[9px] whitespace-nowrap">
                        {!isNaN(valorNum) && valorNum > 0 ? `R$ ${vagaForm.valor}` : 'R$ —'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-2.5 text-[11.5px] text-gray-500">
                      <div className={localPreview ? '' : 'text-gray-400 italic'}>
                        {localPreview ? <>Local: <b className="text-gray-700 font-bold">{localPreview}</b></> : 'Local a definir'}
                      </div>
                      <div className={vagaForm.data ? '' : 'text-gray-400 italic'}>
                        {vagaForm.data ? <>Data: <b className="text-gray-700 font-bold">{formatDataBR(vagaForm.data)}</b></> : 'Data a definir'}
                      </div>
                      <div className={vagaForm.horaInicio && vagaForm.horaFim ? '' : 'text-gray-400 italic'}>
                        {vagaForm.horaInicio && vagaForm.horaFim ? <>Horário: <b className="text-gray-700 font-bold">{vagaForm.horaInicio} – {vagaForm.horaFim}</b></> : 'Horário a definir'}
                      </div>
                    </div>
                    {vagaForm.descricao && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 text-[11.5px] leading-relaxed text-gray-600 whitespace-pre-line">{vagaForm.descricao}</div>
                    )}
                    <div className="flex justify-end mt-3">
                      <span className="px-3 py-[7px] rounded-[9px] text-[11.5px] font-bold bg-primary text-white">Ver detalhes e candidatar-se</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'painel' && (() => {
          const totalVagas = minhasVagas.length;
          const abertaCount = minhasVagas.filter((v) => v.status === 'ABERTA' && !vagaExpirada(v)).length;
          const encerradaCount = minhasVagas.filter((v) => vagaExpirada(v)).length;
          const retidoCount = minhasVagas.filter((v) => v.status === 'PREENCHIDA' && v.pagamento?.status === 'RETIDO').length;
          const concluidaCount = minhasVagas.filter((v) => v.status === 'CONCLUIDA').length;
          const preenchidaCount = minhasVagas.filter((v) => v.status === 'PREENCHIDA').length;
          const canceladaCount = minhasVagas.filter((v) => v.status === 'CANCELADA').length;

          const filtradas = painelFiltro === 'todas'
            ? minhasVagas
            : painelFiltro === 'retido'
              ? minhasVagas.filter((v) => v.status === 'PREENCHIDA' && v.pagamento?.status === 'RETIDO')
              : painelFiltro === 'encerrada'
                ? minhasVagas.filter((v) => vagaExpirada(v))
                : painelFiltro === 'aberta'
                  ? minhasVagas.filter((v) => v.status === 'ABERTA' && !vagaExpirada(v))
                  : minhasVagas.filter((v) => v.status.toLowerCase() === painelFiltro);

          const statCards: { key: typeof painelFiltro; label: string; value: number; iconBg: string; iconFg: string; icon: ReactNode }[] = [
            { key: 'todas', label: 'Total de vagas', value: totalVagas, iconBg: 'bg-secondary/10', iconFg: 'text-secondary', icon: <GridIcon className="w-4 h-4" /> },
            { key: 'aberta', label: 'Abertas', value: abertaCount, iconBg: 'bg-primaryTint', iconFg: 'text-primaryDeep', icon: <CheckCircleIcon className="w-4 h-4" /> },
            { key: 'retido', label: 'Aguardando sua ação', value: retidoCount, iconBg: 'bg-amber-100', iconFg: 'text-amber-700', icon: <WarningIcon className="w-4 h-4" /> },
            { key: 'concluida', label: 'Concluídas', value: concluidaCount, iconBg: 'bg-gray-100', iconFg: 'text-gray-500', icon: <CheckCircleIcon className="w-4 h-4" /> },
          ];
          const filtros: { key: typeof painelFiltro; label: string; count: number }[] = [
            { key: 'todas', label: 'Todas', count: totalVagas },
            { key: 'aberta', label: 'Abertas', count: abertaCount },
            { key: 'encerrada', label: 'Encerradas', count: encerradaCount },
            { key: 'preenchida', label: 'Aguardando presença', count: preenchidaCount },
            { key: 'concluida', label: 'Concluídas', count: concluidaCount },
            { key: 'cancelada', label: 'Canceladas', count: canceladaCount },
          ];

          return (
            <div className="max-w-[1080px] mx-auto p-8">
              <h1 className="text-2xl font-extrabold mb-1 text-white">Painel da clínica</h1>
              <p className="text-sm text-white/85 mb-6">Acompanhe suas vagas publicadas e candidatos</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {statCards.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setPainelFiltro(s.key)}
                    className={`text-left bg-white rounded-2xl p-4 shadow-sm border-[1.5px] transition-colors ${painelFiltro === s.key ? 'border-primary' : 'border-transparent'}`}
                  >
                    <div className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center mb-2 ${s.iconBg} ${s.iconFg}`}>{s.icon}</div>
                    <div className="text-2xl font-extrabold text-ink leading-none">{s.value}</div>
                    <div className="text-xs font-bold text-gray-400 mt-1.5">{s.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap mb-5">
                {filtros.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setPainelFiltro(f.key)}
                    className={`px-3.5 py-2 rounded-full text-xs font-extrabold ${painelFiltro === f.key ? 'bg-white text-primaryDeep' : 'bg-white/15 text-white hover:bg-white/25'}`}
                  >
                    {f.label} <span className="opacity-70">({f.count})</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                {filtradas.map((mv) => {
                  const expirada = vagaExpirada(mv);
                  const badge = statusBadge(expirada ? 'encerrada' : mv.status.toLowerCase());
                  const local = localDaVaga(mv);
                  const pend = (mv.candidaturas || []).filter((c) => c.status === 'PENDENTE').length;
                  const hired = (mv.candidaturas || []).find((c) => c.status === 'ACEITO');
                  return (
                    <div
                      key={mv.id}
                      onClick={() => abrirDetalheVaga(mv.id)}
                      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 cursor-pointer hover:border-primary/40 transition-colors duration-150"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="text-xs font-bold text-primary uppercase">{CATEGORIA_LABEL[mv.categoria]}</div>
                          <a
                            href={mapsLink(local)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-start gap-1 text-lg font-extrabold mt-1 hover:text-primary hover:underline"
                          >
                            <PinIcon className="w-4 h-4 shrink-0 text-primary mt-1.5" />
                            {local}
                          </a>
                        </div>
                        <div className={badge.className}>{badge.label}</div>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">Data <b className="text-ink font-extrabold">{formatDataBR(mv.data)}</b></span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">Horário <b className="text-ink font-extrabold">{mv.horaInicio} - {mv.horaFim}</b></span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primaryDeep bg-primaryTint px-2.5 py-1 rounded-lg">R$ {mv.valor}</span>
                      </div>
                      {mv.descricao && <div className="text-sm text-gray-600 mt-3">{mv.descricao}</div>}
                      {mv.status === 'PREENCHIDA' && mv.pagamento && mv.pagamento.status === 'RETIDO' && (
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5 justify-between flex-wrap bg-amber-50 rounded-xl px-3.5 py-3 mt-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                            <WarningIcon className="w-4 h-4 shrink-0" />
                            {hired?.profissional?.nome || 'O profissional'} concluiu o plantão — confirme a presença pra liberar o pagamento.
                          </div>
                          <button onClick={() => handleLiberarPagamento(mv.pagamento!.id)} className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-extrabold shrink-0">Confirmar presença e liberar pagamento</button>
                        </div>
                      )}
                      <div onClick={(e) => e.stopPropagation()} className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 flex-wrap gap-2">
                        <div className="text-sm text-gray-500">{(mv.candidaturas || []).length === 0 ? 'Nenhum candidato ainda' : `${mv.candidaturas!.length} candidato(s) · ${pend} pendente(s)`}</div>
                        <div className="flex gap-2 flex-wrap">
                          {mv.status === 'ABERTA' && !expirada && (mv.candidaturas || []).length === 0 && (
                            <button onClick={() => editarVaga(mv)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold">Editar</button>
                          )}
                          {mv.status === 'ABERTA' && !expirada && (
                            <button onClick={() => cancelarVaga(mv.id)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold text-danger">Cancelar</button>
                          )}
                          <button onClick={() => irParaCandidatos(mv.id)} className="px-4 py-2 rounded-lg bg-secondary text-white text-sm font-bold">Ver candidatos</button>
                        </div>
                      </div>
                      {mv.status === 'CONCLUIDA' && hired && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <AvaliacaoCandidatura
                            candidaturaId={hired.id}
                            autorProprio="CLINICA"
                            labelForm={`Avaliar ${hired.profissional?.nome || 'profissional'}`}
                            labelFeita={`Avaliação de ${hired.profissional?.nome || 'profissional'}`}
                            labelOutra={`${hired.profissional?.nome || 'Profissional'} avaliou você`}
                            avaliacoesIniciais={avaliacoesPorCandidatura[hired.id] || []}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {filtradas.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-10">
                    {minhasVagas.length === 0 ? (
                      <EmptyState
                        icon={<BuildingIcon className="w-6 h-6" />}
                        title="Você ainda não publicou nenhuma vaga"
                        description="Crie a primeira vaga pra começar a receber candidaturas de profissionais na sua região."
                        actionLabel="Criar vaga"
                        actionIcon={<PlusIcon className="w-3.5 h-3.5" />}
                        onAction={() => setTab('criar-vaga')}
                      />
                    ) : (
                      <EmptyState
                        icon={<SearchIcon className="w-6 h-6" />}
                        title="Nenhuma vaga encontrada"
                        description="Nenhuma vaga bate com esse filtro."
                        actionLabel="Ver todas"
                        actionIcon={<CloseIcon className="w-3.5 h-3.5" />}
                        onAction={() => setPainelFiltro('todas')}
                        actionVariant="ghost"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {tab === 'candidatos' && selectedMv && (
          <div className="max-w-2xl mx-auto p-8">
            <button onClick={voltarAoPainel} className="text-sm font-bold text-white/80 hover:text-white mb-4">← Voltar ao painel</button>
            <h1 className="text-xl font-extrabold mb-1 text-white">Candidatos — {CATEGORIA_LABEL[selectedMv.categoria]}</h1>
            <p className="text-sm text-white/85 mb-6">
              <b className="font-bold text-white">{localDaVaga(selectedMv)}</b> · <b className="font-bold text-white">{formatDataBR(selectedMv.data)}</b>
            </p>
            {selectedMv.status !== 'ABERTA' && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">
                {selectedMv.status === 'CANCELADA'
                  ? 'Esta vaga foi cancelada.'
                  : 'Esta vaga já tem um profissional aprovado — cada vaga permite apenas um aprovado por enquanto.'}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {candidatosLoading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                <>
                  {candidatos.map((c) => {
                    const badge = statusBadge(c.status.toLowerCase());
                    return (
                      <div key={c.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="font-extrabold">{c.profissional?.nome}</div>
                            <div className="mt-0.5"><RatingBadge notaMedia={c.profissional?.notaMedia} totalAvaliacoes={c.profissional?.totalAvaliacoes} /></div>
                            <div className="text-sm text-gray-500 mt-1">
                              {c.profissional && CATEGORIA_LABEL[c.profissional.funcao]}
                              {c.profissional?.especialidade ? ` (${c.profissional.especialidade})` : ''} · {c.profissional?.areaAtuacao}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Região: {c.profissional?.regioesAtendimento}</div>
                          </div>
                          <div className={badge.className}>{badge.label}</div>
                        </div>
                        {c.status === 'PENDENTE' && selectedMv.status === 'ABERTA' && (
                          <div className="flex gap-2 mt-4">
                            <button onClick={() => recusarCandidato(c.id)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold">Recusar</button>
                            <button onClick={() => aceitarCandidato(selectedMv.id, c.id)} className="px-3.5 py-2 rounded-lg bg-primary text-white text-sm font-bold">Aceitar e pagar</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {candidatos.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-10">
                      <EmptyState
                        icon={<UsersIcon className="w-6 h-6" />}
                        title="Nenhum candidato ainda"
                        description="Assim que um profissional se candidatar a essa vaga, ele aparece aqui pra você aceitar ou recusar."
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'pagamento' && selectedMv && (() => {
          const valorProfissional = parseFloat(selectedMv.valor) || 0;
          const taxa = valorProfissional * TAXA_PLATAFORMA;
          const totalClinica = valorProfissional + taxa;
          return (
            <div className="max-w-lg mx-auto p-8">
              <div className="text-sm font-bold text-primaryTint mb-1">Pagamento</div>
              <h1 className="text-2xl font-extrabold mb-6 text-white">Confirmar contratação</h1>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7">
                <div className="text-sm text-gray-500">Profissional</div>
                <div className="text-lg font-extrabold">{selectedCand?.profissional?.nome}</div>
                <div className="text-sm text-gray-500">{CATEGORIA_LABEL[selectedMv.categoria]} · <b className="font-bold text-gray-700">{localDaVaga(selectedMv)}</b></div>
                <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col gap-2">
                  <div className="flex justify-between text-sm"><span>Valor ao profissional</span><span className="font-bold">R$ {valorProfissional.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-gray-500"><span>Taxa da ConectVet (5%)</span><span>+ R$ {taxa.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base font-extrabold pt-2 border-t border-gray-200"><span>Total que você paga</span><span>R$ {totalClinica.toFixed(2)}</span></div>
                </div>
              </div>
              <p className="text-xs text-white/85 mt-3">O valor fica retido até a clínica confirmar a presença do profissional.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={voltarAoPainel} className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-sm font-bold">Cancelar</button>
                <button onClick={confirmarPagamento} className="px-6 py-3 rounded-lg bg-ink text-white text-sm font-bold shadow-sm">Confirmar pagamento</button>
              </div>
            </div>
          );
        })()}

        {tab === 'perfil' && (
          <div className="max-w-[880px] mx-auto p-8">
            <div className="flex flex-col items-center text-center gap-2.5 sm:flex-row sm:items-end sm:text-left sm:gap-5 mb-6">
              <div className="relative w-[100px] h-[100px] shrink-0">
                <div className="w-full h-full rounded-2xl p-1 bg-white/90 shadow-lg">
                  <div className="relative w-full h-full rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden">
                    {clinica.logoUrl ? (
                      <img src={clinica.logoUrl} alt={clinica.nome} className="w-full h-full object-cover" />
                    ) : (
                      <BuildingIcon className="w-9 h-9" />
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                <label className="absolute right-0 bottom-0.5 w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center cursor-pointer border-[3px] border-primary shadow-md">
                  <PencilIcon className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(e) => handleLogoSelecionada(e.target.files)} />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <div className="text-white text-2xl font-extrabold">{clinica.nome}</div>
                </div>
                <div className="text-white/85 text-sm font-semibold mt-1.5">{buildEndereco(clinica)}</div>
              </div>
              {!editandoPerfil && (
                <button
                  onClick={() => setEditandoPerfil(true)}
                  className="inline-flex items-center gap-1.5 bg-white text-primaryDeep text-[13.5px] font-extrabold px-[18px] py-2.5 rounded-xl shadow-lg hover:bg-primaryTint shrink-0"
                >
                  <PencilIcon className="w-3.5 h-3.5" /> Editar perfil
                </button>
              )}
            </div>

            {!editandoPerfil ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                  <div className="bg-white rounded-2xl p-4 text-center">
                    <div className="text-xl font-extrabold text-ink">{minhasVagas.length}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-0.5">Vagas publicadas</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 text-center">
                    <div className="text-xl font-extrabold text-ink">{taxaPreenchimento !== null ? `${taxaPreenchimento}%` : '—'}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-0.5">Taxa de preenchimento</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 text-center">
                    <div className="text-xl font-extrabold text-ink">{notaMedia !== null ? notaMedia.toFixed(1) : '—'}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-0.5">Avaliação média</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 text-center">
                    <div className="text-xl font-extrabold text-ink">{avaliacoesRecebidas.length}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-0.5">Avaliações recebidas</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-3.5">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-gray-400 mb-3">Dados de contato</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-primaryTint text-primaryDeep flex items-center justify-center shrink-0"><PhoneIcon className="w-3.5 h-3.5" /></div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Telefone</div>
                        <div className="text-sm font-bold text-ink mt-0.5">{clinica.telefone ? maskTelefone(clinica.telefone) : 'Não informado'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-primaryTint text-primaryDeep flex items-center justify-center shrink-0"><BuildingIcon className="w-3.5 h-3.5" /></div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">CNPJ</div>
                        <div className="text-sm font-bold text-ink mt-0.5">{clinica.cnpj}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-3.5">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-gray-400 mb-2">Endereço</div>
                  <div className="text-sm font-bold text-ink mb-2">{buildEndereco(clinica)}</div>
                  <a href={mapsLink(buildEndereco(clinica))} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline">Ver no mapa →</a>
                </div>

                {avaliacoesRecebidas.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-gray-400 mb-1">
                      <HeartIcon className="w-3.5 h-3.5 text-primary" /> Avaliações recebidas
                    </div>
                    {avaliacoesRecebidas.map((a) => (
                      <div key={a.id} className="py-3.5 border-b border-gray-100 last:border-b-0 last:pb-0 first:pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[13.5px] font-extrabold text-ink">{a.profissionalNome}</div>
                          <div className="text-amber-500 text-sm tracking-widest">{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}</div>
                        </div>
                        {a.comentario && <div className="text-[13.5px] leading-relaxed text-gray-700 mt-1">{a.comentario}</div>}
                        {a.data && <div className="text-xs text-gray-400 mt-1.5">Plantão de {formatDataBR(a.data)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">Nome / Razão social</span>
                  <input value={perfilForm.nome} onChange={(e) => setPerfilForm((f) => ({ ...f, nome: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">CNPJ</span>
                  <input disabled value={perfilForm.cnpj} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">Telefone</span>
                  <input
                    value={maskTelefone(perfilForm.telefone)}
                    onChange={(e) => setPerfilForm((f) => ({ ...f, telefone: onlyDigits(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                  />
                </label>

                <div className="pt-2 mt-2 border-t border-gray-100">
                  <div className="text-sm font-extrabold text-gray-800 mb-3">Endereço</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-sm font-bold">CEP</span>
                      <input
                        value={maskCEP(perfilForm.cep)}
                        onChange={(e) => onPerfilCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none max-w-[200px]"
                      />
                      {perfilCepStatus === 'loading' && <span className="text-xs text-gray-400">Buscando endereço...</span>}
                      {perfilCepStatus === 'error' && <span className="text-xs font-semibold text-danger">CEP não encontrado. Preencha o endereço manualmente.</span>}
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold">Estado (UF)</span>
                      <select value={perfilForm.estado} onChange={(e) => setPerfilForm((f) => ({ ...f, estado: e.target.value, cidade: '' }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
                        <option value="">Selecione...</option>
                        {withCurrent(Object.keys(ESTADOS_CIDADES), perfilForm.estado).map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold">Cidade</span>
                      <select disabled={!perfilForm.estado} value={perfilForm.cidade} onChange={(e) => setPerfilForm((f) => ({ ...f, cidade: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
                        <option value="">Selecione...</option>
                        {withCurrent(ESTADOS_CIDADES[perfilForm.estado] || [], perfilForm.cidade).map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold">Bairro</span>
                      <input value={perfilForm.bairro} onChange={(e) => setPerfilForm((f) => ({ ...f, bairro: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold">Rua</span>
                      <input value={perfilForm.rua} onChange={(e) => setPerfilForm((f) => ({ ...f, rua: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold">Número</span>
                      <input value={perfilForm.numero} onChange={(e) => setPerfilForm((f) => ({ ...f, numero: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold">Complemento</span>
                      <input value={perfilForm.complemento} onChange={(e) => setPerfilForm((f) => ({ ...f, complemento: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => salvarPerfil().then(() => setEditandoPerfil(false))}
                    disabled={savingPerfil}
                    className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primaryDark text-white text-sm font-bold shadow-sm disabled:opacity-60"
                  >
                    {savingPerfil ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                  <button
                    onClick={() => { setEditandoPerfil(false); setPerfilForm(perfilFormFromClinica(clinica)); }}
                    className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-bold hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 mt-6 flex flex-col gap-4">
              <div>
                <div className="text-sm font-extrabold text-gray-800">Fotos da clínica</div>
                <div className="text-xs text-gray-400 mt-0.5">Opcional, até 3 fotos ({clinica.fotosEstrutura.length}/3)</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {clinica.fotosEstrutura.map((foto) => (
                  <div key={foto.url} className="flex flex-col gap-1.5">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                      <img src={foto.url} alt={foto.descricao || 'Foto da clínica'} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleFotoRemover(foto.url)}
                        aria-label="Remover foto"
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      value={foto.descricao || ''}
                      onChange={(e) => handleFotoDescricaoChange(foto.url, e.target.value)}
                      onBlur={() => handleFotoDescricaoSalvar(foto.url)}
                      placeholder="Descrição (opcional)"
                      className="px-2 py-1 rounded-md border border-gray-200 text-xs outline-none"
                    />
                  </div>
                ))}
                {clinica.fotosEstrutura.length < 3 && (
                  <label className="cursor-pointer aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-gray-50 hover:text-gray-500">
                    <PlusIcon className="w-5 h-5" />
                    <span className="text-xs font-bold">{uploadingFotos ? 'Enviando...' : 'Adicionar'}</span>
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingFotos} onChange={(e) => handleFotosSelecionadas(e.target.files)} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </main>

      <RecorteFotoModal
        file={logoParaCortar}
        shape="square"
        onCancel={() => setLogoParaCortar(null)}
        onConfirm={handleLogoCortada}
      />
      <RecorteFotoModal
        file={filaFotosParaCortar[0] || null}
        shape="square"
        onCancel={cancelarFilaFotos}
        onConfirm={handleFotoEstruturaCortada}
      />
    </div>
  );
}
