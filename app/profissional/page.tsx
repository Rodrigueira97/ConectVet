'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  mapsLink, onlyDigits, hojeBrasil, somarDiasISO, agoraBrasil, plantaoEncerrado, plantaoAindaNaoComecou,
  formatDataBR, localDaVaga, vagaEncerrada, urgenciaLabel, motivoVagaFechada, correspondeAproximado, normalizarBusca,
} from '@/lib/mockData';
import { maskTelefone } from '@/lib/validators';
import { Sidebar } from '@/app/components/Sidebar';
import {
  HomeIcon, ClockIcon, UserIcon, SearchIcon, PinIcon, CalendarIcon, FilterIcon, CloseIcon,
  PencilIcon, PhoneIcon, MailIcon, ShieldIcon, DownloadIcon, HeartIcon, FileIcon, CheckIcon,
  CheckCircleIcon, XCircleIcon, LockIcon, ArrowRightIcon, BuildingIcon, PawIcon, EyeIcon, UploadIcon,
} from '@/app/components/icons';
import { VagaDetalheView } from '@/app/components/VagaDetalhe';
import { QuemSomosView } from '@/app/components/QuemSomos';
import { FileField } from '@/app/components/FileField';
import { AvaliacaoCandidatura } from '@/app/components/AvaliacaoCandidatura';
import { PawTrailLoader } from '@/app/components/PawTrailLoader';
import { NotificationBell } from '@/app/components/NotificationBell';
import { DateField } from '@/app/components/DateField';
import { FeedPageSkeleton } from '@/app/components/skeletons/FeedPageSkeleton';
import { RatingBadge } from '@/app/components/RatingBadge';
import { EmptyState } from '@/app/components/EmptyState';
import { RecorteFotoModal } from '@/app/components/RecorteFotoModal';
import { useToast } from '@/app/components/Toast';
import {
  ApiError, getToken, clearSession, CATEGORIA_LABEL, CATEGORIAS, ESPECIALIDADES_VETERINARIAS, isVeterinarioFormado,
  Vaga, Candidatura, Profissional, Avaliacao,
  getProfissionalMe, updateProfissionalMe, getFeed, getMinhasCandidaturas, candidatar as apiCandidatar,
  getAvaliacoesPorCandidatura, uploadArquivo, cancelarCandidatura, desistirCandidatura,
} from '@/lib/api';

const VAGAS_POR_PAGINA = 6;

function especialidadeFormFromProfissional(p: { especialidade?: string | null }) {
  const salva = p.especialidade || '';
  const conhecida = ESPECIALIDADES_VETERINARIAS.includes(salva) && salva !== 'Outra';
  return conhecida
    ? { especialidade: salva, especialidadeOutra: '' }
    : { especialidade: salva ? 'Outra' : '', especialidadeOutra: salva };
}
const CANDIDATURAS_POR_PAGINA = 10;

type Tab = 'home' | 'favoritas' | 'historico' | 'perfil' | 'quem-somos';

function tempoNaPlataforma(createdAt: string) {
  const meses = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  if (meses < 1) return 'novo por aqui';
  if (meses < 12) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(meses / 12);
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

const FAVORITOS_KEY = 'conectvet_vagas_favoritas';

type StatusCandidatura = 'PENDENTE' | 'ACEITO' | 'CONCLUIDA' | 'RECUSADO' | 'ENCERRADA' | 'DESISTIU';

function statusDaCandidatura(c: Candidatura): StatusCandidatura {
  if (c.status === 'ACEITO') return c.vaga?.status === 'CONCLUIDA' ? 'CONCLUIDA' : 'ACEITO';
  if (c.status === 'PENDENTE' && c.vaga && vagaEncerrada(c.vaga)) return 'ENCERRADA';
  return c.status;
}

type PassoJornada = { label: string; state: 'done' | 'current' | 'fail' };

function passosDaCandidatura(c: Candidatura, status: StatusCandidatura): PassoJornada[] {
  const vagaStatus = c.vaga?.status;
  if (status === 'PENDENTE') {
    return [{ label: 'Enviada', state: 'done' }, { label: 'Em análise', state: 'current' }];
  }
  if (status === 'ENCERRADA') {
    const ultimoLabel = vagaStatus === 'CANCELADA' ? 'Vaga cancelada' : 'Prazo encerrado';
    return [
      { label: 'Enviada', state: 'done' },
      { label: 'Em análise', state: 'done' },
      { label: ultimoLabel, state: 'fail' },
    ];
  }
  if (status === 'RECUSADO') {
    const ultimoLabel = vagaStatus === 'CANCELADA' ? 'Vaga cancelada' : vagaStatus === 'ABERTA' ? 'Não foi dessa vez' : 'Preenchida por outro';
    return [
      { label: 'Enviada', state: 'done' },
      { label: 'Em análise', state: 'done' },
      { label: ultimoLabel, state: 'fail' },
    ];
  }
  if (status === 'ACEITO') {
    return [
      { label: 'Enviada', state: 'done' },
      { label: 'Em análise', state: 'done' },
      { label: 'Aceita', state: 'current' },
    ];
  }
  if (status === 'DESISTIU') {
    return [
      { label: 'Enviada', state: 'done' },
      { label: 'Aceita', state: 'done' },
      { label: 'Você desistiu', state: 'fail' },
    ];
  }
  return [
    { label: 'Enviada', state: 'done' },
    { label: 'Em análise', state: 'done' },
    { label: 'Aceita', state: 'done' },
    { label: 'Concluída', state: 'done' },
  ];
}

function motivoRecusaLabel(c: Candidatura) {
  const vagaStatus = c.vaga?.status;
  if (vagaStatus === 'CANCELADA') return 'A clínica cancelou esta vaga.';
  if (vagaStatus === 'ABERTA') return 'A clínica optou por outro profissional desta vez. Continue de olho em novas vagas na Home.';
  return 'A vaga foi preenchida por outro profissional.';
}

function motivoEncerradaLabel(c: Candidatura) {
  if (c.vaga?.status === 'CANCELADA') return 'A clínica cancelou esta vaga antes de responder.';
  return 'A data da vaga já passou e a clínica não respondeu a tempo.';
}

// "Ainda faltam alguns dias" só faz sentido quando falta mesmo. Um plantão que
// atravessa a madrugada (ex.: 19:00–07:00) começou "ontem" mas pode continuar em
// andamento de manhã — por isso o cálculo usa o mesmo critério de fim real do
// plantão que o `plantaoEncerrado`, não só a data de início.
function mensagemAceito(v: { data: string; horaInicio: string; horaFim: string }) {
  if (plantaoEncerrado(v)) {
    return 'Plantão confirmado! O horário já passou — assim que a clínica confirmar sua presença, ele aparece como concluído aqui.';
  }
  const hoje = hojeBrasil();
  const dataInicio = v.data.slice(0, 10);
  const overnight = v.horaFim <= v.horaInicio;
  const dataFim = overnight ? somarDiasISO(dataInicio, 1) : dataInicio;
  if (dataInicio === hoje || dataFim === hoje) {
    const emAndamento = dataInicio < hoje || agoraBrasil() >= v.horaInicio;
    return emAndamento ? 'Plantão confirmado! Está rolando agora — bom plantão!' : 'Plantão confirmado! É hoje — não esqueça de comparecer.';
  }
  if (dataInicio === somarDiasISO(hoje, 1)) return 'Plantão confirmado! É amanhã.';
  return 'Plantão confirmado! Fique de olho na data — ainda faltam alguns dias.';
}

function StepperCandidatura({ passos }: { passos: PassoJornada[] }) {
  return (
    <div className="flex items-start mt-3 mb-1">
      {passos.map((p, i) => (
        <div key={i} className="flex flex-col items-center flex-1 min-w-[64px] relative">
          {i > 0 && (
            <div className={`absolute top-[13px] right-1/2 w-full h-0.5 z-0 ${passos[i - 1].state === 'done' ? 'bg-primary' : 'bg-gray-200'}`} />
          )}
          <div
            className={`relative z-10 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-extrabold border-[3px] border-white ${
              p.state === 'done' ? 'bg-primary text-white' : p.state === 'current' ? 'bg-primaryTint text-primaryDeep ring-4 ring-primaryTint' : 'bg-red-100 text-red-700'
            }`}
          >
            {p.state === 'done' ? <CheckIcon className="w-3 h-3" /> : p.state === 'fail' ? <CloseIcon className="w-3 h-3" /> : i + 1}
          </div>
          <div className={`text-[10px] font-bold text-center mt-1.5 leading-tight px-0.5 ${p.state === 'current' || p.state === 'done' ? 'text-ink' : 'text-gray-400'}`}>
            {p.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfissionalPage() {
  return (
    <Suspense fallback={<FeedPageSkeleton sidebarItems={3} showFilters />}>
      <ProfissionalPageInner />
    </Suspense>
  );
}

function ProfissionalPageInner() {
  const router = useRouter();
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Aba, filtros do feed e filtro de candidaturas moram na URL, não em estado local:
  // refresh, botão voltar do navegador e links compartilhados continuam funcionando.
  // `goTo` funde um patch nos query params atuais numa única navegação (mode 'replace'
  // pra ajustes de filtro, que não devem empilhar histórico a cada tecla/clique;
  // 'push' — o padrão — pra navegação de verdade entre abas).
  function goTo(patch: Record<string, string | null | undefined>, mode: 'push' | 'replace' = 'push', opts?: { scroll?: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (mode === 'replace') router.replace(url, opts); else router.push(url, opts);
  }

  const tab = (searchParams.get('tab') as Tab | null) || 'home';
  // Trocar de aba pela sidebar precisa fechar o detalhe de vaga aberto — ele é
  // renderizado com prioridade sobre as abas, então sem isso a tela ficava "presa".
  // O filtro de Minhas candidaturas (statusCand) também mora na URL e ficava
  // "grudado" ao trocar de aba — sair e voltar devia mostrar "Todas" de novo.
  // (Os filtros da Home continuam persistindo entre abas, de propósito.)
  function setTab(next: Tab) {
    goTo({ tab: next === 'home' ? null : next, detalhe: null, statusCand: null });
  }

  const filtros = {
    busca: searchParams.get('busca') || '',
    categoria: searchParams.get('categoria') || '',
    cidade: searchParams.get('cidade') || '',
    data: searchParams.get('data') || '',
    pertoDeMim: searchParams.get('perto') === '1',
    naoCandidatadas: searchParams.get('naoCand') === '1',
  };

  const filtroCandidaturas = (searchParams.get('statusCand') as 'TODAS' | StatusCandidatura | null) || 'TODAS';
  const vagaDetalheId = searchParams.get('detalhe');

  // Abrir/fechar o detalhe da vaga troca o conteúdo dentro do mesmo <main>, sem
  // recarregar a página — então o navegador não reseta o scroll sozinho, e o
  // Next também não sabe restaurá-lo (o container relevante não é sempre a
  // janela, ver comentário do efeito de scroll infinito abaixo). Por isso
  // guardamos a posição na ida e devolvemos na volta na mão, com `scroll:
  // false` pra impedir o Next de "ajudar" jogando tudo pro topo no meio disso.
  const scrollFeedRef = useRef<number | null>(null);
  function medirScroll() {
    const el = mainRef.current;
    if (el && el.scrollHeight > el.clientHeight + 1) return el.scrollTop;
    return window.scrollY;
  }
  function aplicarScroll(pos: number) {
    const el = mainRef.current;
    if (el && el.scrollHeight > el.clientHeight + 1) el.scrollTop = pos; else window.scrollTo(0, pos);
  }
  function abrirDetalheVaga(vagaId: string) {
    scrollFeedRef.current = medirScroll();
    goTo({ detalhe: vagaId }, 'push', { scroll: false });
    requestAnimationFrame(() => aplicarScroll(0));
  }
  function fecharDetalheVaga() {
    goTo({ detalhe: null }, 'push', { scroll: false });
  }
  useEffect(() => {
    if (vagaDetalheId || scrollFeedRef.current === null) return;
    const pos = scrollFeedRef.current;
    scrollFeedRef.current = null;
    requestAnimationFrame(() => aplicarScroll(pos));
  }, [vagaDetalheId]);

  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Profissional | null>(null);
  const [perfilForm, setPerfilForm] = useState({ nome: '', telefone: '', dataNascimento: '', especialidade: '', especialidadeOutra: '', crmv: '', areaAtuacao: '', regioesAtendimento: '', observacoes: '' });
  const [uploadingCurriculoInline, setUploadingCurriculoInline] = useState(false);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoParaCortar, setFotoParaCortar] = useState<File | null>(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [curriculoNovo, setCurriculoNovo] = useState<File | null>(null);
  const [curriculoRemovido, setCurriculoRemovido] = useState(false);
  const [feed, setFeed] = useState<Vaga[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [avaliacoesPorCandidatura, setAvaliacoesPorCandidatura] = useState<Record<string, Avaliacao[]>>({});
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const salvos = JSON.parse(localStorage.getItem(FAVORITOS_KEY) || '[]');
      if (Array.isArray(salvos)) setFavoritos(new Set(salvos));
    } catch {}
  }, []);

  function alternarFavorito(vagaId: string) {
    setFavoritos((prev) => {
      const next = new Set(prev);
      if (next.has(vagaId)) next.delete(vagaId); else next.add(vagaId);
      localStorage.setItem(FAVORITOS_KEY, JSON.stringify([...next]));
      return next;
    });
  }
  const [visiveis, setVisiveis] = useState(VAGAS_POR_PAGINA);
  const [visiveisCandidaturas, setVisiveisCandidaturas] = useState(CANDIDATURAS_POR_PAGINA);
  const mainRef = useRef<HTMLElement | null>(null);
  const vagaSelecionada = vagaDetalheId ? feed.find((v) => v.id === vagaDetalheId) || null : null;
  const [candidatandoId, setCandidatandoId] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [cancelandoProcessandoId, setCancelandoProcessandoId] = useState<string | null>(null);
  const [desistindoId, setDesistindoId] = useState<string | null>(null);
  const [desistindoProcessandoId, setDesistindoProcessandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.push('/entrar'); return; }
    (async () => {
      try {
        const [p, f, c] = await Promise.all([getProfissionalMe(), getFeed(), getMinhasCandidaturas()]);
        setPerfil(p);
        setPerfilForm({
          nome: p.nome, telefone: p.telefone || '', dataNascimento: p.dataNascimento ? p.dataNascimento.slice(0, 10) : '',
          ...especialidadeFormFromProfissional(p),
          crmv: p.crmv || '',
          areaAtuacao: p.areaAtuacao || '', regioesAtendimento: p.regioesAtendimento, observacoes: p.observacoes || '',
        });
        setFeed(f);
        setCandidaturas(c);

        const aceitas = c.filter((x) => x.status === 'ACEITO');
        const pares = await Promise.all(aceitas.map(async (x) => [x.id, await getAvaliacoesPorCandidatura(x.id)] as const));
        setAvaliacoesPorCandidatura(Object.fromEntries(pares));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) { clearSession(); router.push('/entrar'); }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const jaCarregouFeed = useRef(false);
  useEffect(() => {
    if (!jaCarregouFeed.current) { jaCarregouFeed.current = true; return; }
    // Cidade não vai mais pro back-end: filtramos aqui do lado do cliente
    // (ver feedFiltrado) pra poder tolerar acento e erro de digitação, o que
    // uma busca exata no servidor não faria.
    getFeed({ data: filtros.data || undefined })
      .then(setFeed)
      .catch(() => {});
  }, [filtros.data]);

  function hasApplied(vagaId: string) {
    return candidaturas.some((c) => c.vagaId === vagaId);
  }

  async function candidatar(v: Vaga) {
    if (hasApplied(v.id) || !perfil) return;
    setCandidatandoId(v.id);
    try {
      const nova = await apiCandidatar(v.id);
      setCandidaturas((prev) => [{ ...nova, vaga: v }, ...prev]);
      toast.success('Candidatura enviada', { message: `${v.clinica?.nome || 'A clínica'} vai te avisar por aqui assim que responder.` });
    } catch (err) {
      toast.error('Não foi possível enviar a candidatura', {
        message: err instanceof ApiError ? err.message : undefined,
        action: { label: 'Tentar novamente', onClick: () => candidatar(v) },
      });
    } finally {
      setCandidatandoId(null);
    }
  }

  async function confirmarCancelamento(candidaturaId: string) {
    setCancelandoProcessandoId(candidaturaId);
    try {
      await cancelarCandidatura(candidaturaId);
      setCandidaturas((prev) => prev.filter((c) => c.id !== candidaturaId));
      setCancelandoId(null);
      toast.success('Candidatura cancelada');
    } catch (err) {
      toast.error('Não foi possível cancelar a candidatura', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setCancelandoProcessandoId(null);
    }
  }

  async function confirmarDesistencia(candidaturaId: string) {
    setDesistindoProcessandoId(candidaturaId);
    try {
      await desistirCandidatura(candidaturaId);
      setCandidaturas((prev) => prev.map((c) => (c.id === candidaturaId ? { ...c, status: 'DESISTIU' } : c)));
      setDesistindoId(null);
      toast.success('Você desistiu do plantão', { message: 'A vaga já está aberta de novo pra outros profissionais.' });
    } catch (err) {
      toast.error('Não foi possível registrar a desistência', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setDesistindoProcessandoId(null);
    }
  }

  const regioesTokens = (perfil?.regioesAtendimento || '')
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
  function pertoDeVoce(v: Vaga) {
    if (!regioesTokens.length) return false;
    const local = `${v.bairro || ''} ${v.cidade} ${v.estado}`.toLowerCase();
    return regioesTokens.some((t) => local.includes(t));
  }

  const feedFiltrado = feed
    .filter((v) => {
      if (filtros.categoria && v.categoria !== filtros.categoria) return false;
      if (filtros.cidade && !correspondeAproximado(v.cidade, filtros.cidade)) return false;
      const local = localDaVaga(v);
      if (filtros.busca && !normalizarBusca(`${v.clinica?.nome} ${CATEGORIA_LABEL[v.categoria]} ${local}`).includes(normalizarBusca(filtros.busca))) return false;
      if (filtros.pertoDeMim && !pertoDeVoce(v)) return false;
      if (filtros.naoCandidatadas && (vagaEncerrada(v) || hasApplied(v.id))) return false;
      return true;
    })
    .sort((a, b) => Number(vagaEncerrada(a)) - Number(vagaEncerrada(b)));

  const vagasFavoritas = feed.filter((v) => favoritos.has(v.id));

  const feedPaginado = feedFiltrado.slice(0, visiveis);
  const temMaisVagas = visiveis < feedFiltrado.length;

  const plantaoConcluidos = candidaturas.filter((c) => statusDaCandidatura(c) === 'CONCLUIDA').length;
  const regioesCount = (perfil?.regioesAtendimento || '').split(',').map((r) => r.trim()).filter(Boolean).length;
  const avaliacoesRecebidas = candidaturas
    .filter((c) => statusDaCandidatura(c) === 'CONCLUIDA')
    .flatMap((c) => (avaliacoesPorCandidatura[c.id] || [])
      .filter((a) => a.autor === 'CLINICA')
      .map((a) => ({ ...a, clinicaNome: c.vaga?.clinica?.nome || 'Clínica', data: c.vaga?.data })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const notaMediaRecebida = avaliacoesRecebidas.length
    ? avaliacoesRecebidas.reduce((soma, a) => soma + a.nota, 0) / avaliacoesRecebidas.length
    : null;

  const candidaturasComStatus = candidaturas.map((c) => ({ ...c, statusExibido: statusDaCandidatura(c) }));
  const candidaturasFiltradas = filtroCandidaturas === 'TODAS'
    ? candidaturasComStatus
    : candidaturasComStatus.filter((c) => c.statusExibido === filtroCandidaturas);
  const candidaturasPaginadas = candidaturasFiltradas.slice(0, visiveisCandidaturas);
  const temMaisCandidaturas = visiveisCandidaturas < candidaturasFiltradas.length;
  const contagemStatus: Record<'TODAS' | StatusCandidatura, number> = {
    TODAS: candidaturas.length,
    PENDENTE: candidaturasComStatus.filter((c) => c.statusExibido === 'PENDENTE').length,
    ACEITO: candidaturasComStatus.filter((c) => c.statusExibido === 'ACEITO').length,
    CONCLUIDA: candidaturasComStatus.filter((c) => c.statusExibido === 'CONCLUIDA').length,
    RECUSADO: candidaturasComStatus.filter((c) => c.statusExibido === 'RECUSADO').length,
    ENCERRADA: candidaturasComStatus.filter((c) => c.statusExibido === 'ENCERRADA').length,
    DESISTIU: candidaturasComStatus.filter((c) => c.statusExibido === 'DESISTIU').length,
  };

  function selecionarFiltroCandidaturas(f: 'TODAS' | StatusCandidatura) {
    goTo({ statusCand: f === 'TODAS' ? null : f }, 'replace');
    setVisiveisCandidaturas(CANDIDATURAS_POR_PAGINA);
  }

  useEffect(() => {
    if (tab !== 'home' && tab !== 'historico') return;
    const el = mainRef.current;

    // O <main> só tem overflow próprio quando seu conteúdo excede a altura que o
    // layout reserva pra ele; caso contrário (mais comum) é a janela que rola.
    // Checar os dois cobre ambos os casos sem depender de qual é o verdadeiro.
    function faltamParaFim() {
      if (el) {
        const elRolavel = el.scrollHeight > el.clientHeight + 1;
        if (elRolavel) return el.scrollHeight - el.scrollTop - el.clientHeight;
      }
      return document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    }

    function verificarScroll() {
      if (faltamParaFim() > 200) return;
      if (tab === 'home') {
        setVisiveis((v) => (v < feedFiltrado.length ? Math.min(v + VAGAS_POR_PAGINA, feedFiltrado.length) : v));
      } else {
        setVisiveisCandidaturas((v) => (v < candidaturasFiltradas.length ? Math.min(v + CANDIDATURAS_POR_PAGINA, candidaturasFiltradas.length) : v));
      }
    }

    el?.addEventListener('scroll', verificarScroll, { passive: true });
    window.addEventListener('scroll', verificarScroll, { passive: true });
    window.addEventListener('resize', verificarScroll);
    return () => {
      el?.removeEventListener('scroll', verificarScroll);
      window.removeEventListener('scroll', verificarScroll);
      window.removeEventListener('resize', verificarScroll);
    };
  }, [tab, feedFiltrado.length, candidaturasFiltradas.length]);

  function atualizarFiltro(novo: Partial<typeof filtros>) {
    const patch: Record<string, string | null> = {};
    if ('busca' in novo) patch.busca = novo.busca || null;
    if ('categoria' in novo) patch.categoria = novo.categoria || null;
    if ('cidade' in novo) patch.cidade = novo.cidade || null;
    if ('data' in novo) patch.data = novo.data || null;
    if ('pertoDeMim' in novo) patch.perto = novo.pertoDeMim ? '1' : null;
    if ('naoCandidatadas' in novo) patch.naoCand = novo.naoCandidatadas ? '1' : null;
    goTo(patch, 'replace');
    setVisiveis(VAGAS_POR_PAGINA);
  }

  function limparFiltros() {
    atualizarFiltro({ busca: '', categoria: '', cidade: '', data: '', pertoDeMim: false, naoCandidatadas: false });
  }

  const filtrosAtivos = [filtros.cidade, filtros.data, filtros.categoria, filtros.pertoDeMim, filtros.naoCandidatadas].filter(Boolean).length;
  const algumFiltroAtivo = filtrosAtivos > 0 || !!filtros.busca;

  async function salvarPerfil() {
    setSavingPerfil(true);
    try {
      const curriculoUrl = curriculoNovo
        ? await uploadArquivo(curriculoNovo)
        : curriculoRemovido ? null : undefined;
      const especialidade = perfil?.funcao === 'VETERINARIO_ESPECIALISTA'
        ? (perfilForm.especialidade === 'Outra' ? perfilForm.especialidadeOutra.trim() : perfilForm.especialidade)
        : undefined;
      const atualizado = await updateProfissionalMe({
        nome: perfilForm.nome,
        telefone: onlyDigits(perfilForm.telefone),
        dataNascimento: perfilForm.dataNascimento || undefined,
        ...(isVeterinarioFormado(perfil?.funcao) ? { areaAtuacao: perfilForm.areaAtuacao, crmv: perfilForm.crmv.trim() } : {}),
        regioesAtendimento: perfilForm.regioesAtendimento,
        observacoes: perfilForm.observacoes,
        ...(especialidade !== undefined ? { especialidade } : {}),
        ...(curriculoUrl !== undefined ? { curriculoUrl } : {}),
      });
      setPerfil(atualizado);
      setPerfilForm({
        nome: atualizado.nome, telefone: atualizado.telefone || '', dataNascimento: atualizado.dataNascimento ? atualizado.dataNascimento.slice(0, 10) : '',
        ...especialidadeFormFromProfissional(atualizado),
        crmv: atualizado.crmv || '',
        areaAtuacao: atualizado.areaAtuacao || '', regioesAtendimento: atualizado.regioesAtendimento, observacoes: atualizado.observacoes || '',
      });
      setCurriculoNovo(null);
      setCurriculoRemovido(false);
      toast.success('Perfil atualizado');
    } catch (err) {
      toast.error('Não foi possível salvar o perfil', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setSavingPerfil(false);
    }
  }

  function handleFotoSelecionada(files: FileList | null) {
    const file = files?.[0];
    if (file) setFotoParaCortar(file);
  }

  async function handleFotoCortada(blob: Blob) {
    setFotoParaCortar(null);
    setUploadingFoto(true);
    try {
      const arquivo = new File([blob], 'foto.jpg', { type: 'image/jpeg' });
      const fotoUrl = await uploadArquivo(arquivo);
      const atualizado = await updateProfissionalMe({ fotoUrl });
      setPerfil(atualizado);
      toast.success('Foto atualizada');
    } catch (err) {
      toast.error('Não foi possível enviar a foto', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUploadingFoto(false);
    }
  }

  // Envio rápido do currículo direto no card de Documentação, sem precisar
  // abrir o formulário inteiro de edição — mesmo padrão da foto de perfil.
  async function handleCurriculoInlineSelecionado(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingCurriculoInline(true);
    try {
      const curriculoUrl = await uploadArquivo(file);
      const atualizado = await updateProfissionalMe({ curriculoUrl });
      setPerfil(atualizado);
      toast.success('Currículo enviado');
    } catch (err) {
      toast.error('Não foi possível enviar o currículo', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setUploadingCurriculoInline(false);
    }
  }

  function renderVagaCard(v: Vaga) {
    const applied = hasApplied(v.id);
    const perto = pertoDeVoce(v);
    const encerrada = vagaEncerrada(v);
    // Vaga fechada porque o próprio profissional foi o escolhido: é uma notícia boa,
    // não um beco sem saída — o card mantém as cores normais e ganha um banner de
    // confirmação, em vez do tratamento apagado que as outras vagas fechadas recebem.
    const preenchidaPorMim = candidaturas.some((c) => c.vagaId === v.id && c.status === 'ACEITO');
    const fechada = encerrada && !preenchidaPorMim;
    const urgencia = urgenciaLabel(v);
    const favorita = favoritos.has(v.id);
    const local = localDaVaga(v);
    const localCurto = [v.bairro, `${v.cidade} - ${v.estado}`].filter(Boolean).join(', ');
    return (
      <div
        key={v.id}
        onClick={() => abrirDetalheVaga(v.id)}
        className={`flex flex-col gap-3 border rounded-2xl p-4 cursor-pointer transition-[border-color,box-shadow] duration-150 ${
          fechada
            ? 'bg-gray-50 border-gray-100 hover:border-secondary/30'
            : 'bg-white border-gray-200 shadow-sm hover:border-secondary/40 hover:shadow-[0_4px_14px_rgba(4,45,76,0.06)]'
        }`}
      >
        {/* Identidade da clínica + preço — só isso disputa a primeira linha */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5 min-w-0">
            <div className={`w-[42px] h-[42px] rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${fechada ? 'bg-gray-100 border-gray-100 text-gray-300 grayscale opacity-70' : 'bg-white border-gray-200 text-gray-300'}`}>
              {v.clinica?.logoUrl ? (
                <img src={v.clinica.logoUrl} alt={v.clinica.nome} className="w-full h-full object-cover" />
              ) : (
                <BuildingIcon className="w-[18px] h-[18px]" />
              )}
            </div>
            <div className="min-w-0">
              <div className={`text-[16.5px] font-extrabold truncate ${fechada ? 'text-gray-400' : 'text-ink'}`}>{v.clinica?.nome}</div>
              <div className={`mt-0.5 ${fechada ? 'opacity-50 grayscale' : ''}`}><RatingBadge notaMedia={v.clinica?.notaMedia} totalAvaliacoes={v.clinica?.totalAvaliacoes} /></div>
            </div>
          </div>
          <div className={`font-extrabold text-[15px] px-3 py-1.5 rounded-[11px] whitespace-nowrap shrink-0 ${fechada ? 'bg-gray-100 text-gray-500' : 'bg-primaryTint text-primaryDeep'}`}>
            R$ {v.valor}
          </div>
        </div>

        {/* Categoria e selos de status — uma única linguagem de chip, só muda a cor.
            O selo "Encerrada" some daqui: o banner escuro no rodapé já cobre esse
            recado, com muito mais destaque do que um chip pequeno conseguiria. */}
        <div className="flex gap-1.5 flex-wrap">
          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${fechada ? 'bg-gray-100 text-gray-400' : 'bg-primaryTint text-primaryDeep'}`}>
            {CATEGORIA_LABEL[v.categoria]}
          </span>
          {preenchidaPorMim && (
            <span className="inline-flex items-center gap-1 bg-primaryTint text-primaryDeep text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide">
              <CheckCircleIcon className="w-2.5 h-2.5" /> Preenchida por você
            </span>
          )}
          {!encerrada && perto && (
            <span className="bg-secondary text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide">Perto de você</span>
          )}
          {urgencia && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide">{urgencia}</span>
          )}
        </div>

        {/* Data, horário e local — colunas fixas no desktop, empilhado no mobile,
            nunca uma frase corrida que quebra linha de forma imprevisível */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 rounded-[13px] overflow-hidden ${fechada ? 'bg-gray-100' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100">
            <CalendarIcon className={`w-[15px] h-[15px] shrink-0 ${fechada ? 'text-gray-400' : 'text-primary'}`} />
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Data</span>
              <span className={`text-[12.5px] font-bold truncate ${fechada ? 'text-gray-500' : 'text-ink'}`}>{formatDataBR(v.data)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100">
            <ClockIcon className={`w-[15px] h-[15px] shrink-0 ${fechada ? 'text-gray-400' : 'text-primary'}`} />
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Horário</span>
              <span className={`text-[12.5px] font-bold truncate ${fechada ? 'text-gray-500' : 'text-ink'}`}>{v.horaInicio} – {v.horaFim}</span>
            </div>
          </div>
          <a
            href={mapsLink(local)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100"
          >
            <PinIcon className={`w-[15px] h-[15px] shrink-0 ${fechada ? 'text-gray-400' : 'text-primary'}`} />
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Local</span>
              <span className={`text-[12.5px] font-bold truncate ${fechada ? 'text-gray-500' : 'text-ink'}`}>{localCurto}</span>
            </div>
          </a>
        </div>

        {v.descricao && (
          <div className="text-[12.5px] text-gray-500 leading-relaxed line-clamp-2">{v.descricao}</div>
        )}

        {/* Favoritar e a ação principal, lado a lado — as duas únicas coisas
            clicáveis do card além do próprio card */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); alternarFavorito(v.id); }}
            aria-label={favorita ? 'Remover dos favoritos' : 'Favoritar vaga'}
            className={`w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0 transition-colors ${favorita ? 'bg-rose-100 text-rose-500' : 'bg-gray-100 text-gray-400 hover:bg-rose-100 hover:text-rose-400'}`}
          >
            <HeartIcon className="w-4 h-4" filled={favorita} />
          </button>
          {preenchidaPorMim ? (
            <div className="flex-1 min-w-0 flex items-center gap-2.5 py-2.5 px-3.5 rounded-[11px] bg-primary">
              <div className="w-7 h-7 rounded-[9px] bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircleIcon className="w-[15px] h-[15px] text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-white/70">Confirmada</div>
                <div className="text-[13.5px] font-extrabold text-white leading-snug">Preenchida por você</div>
              </div>
            </div>
          ) : fechada ? (
            <div className="flex-1 min-w-0 flex items-center gap-2.5 py-2.5 px-3.5 rounded-[11px] bg-ink">
              <div className="w-7 h-7 rounded-[9px] bg-white/15 flex items-center justify-center shrink-0">
                <LockIcon className="w-[15px] h-[15px] text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-white/60">Encerrada</div>
                <div className="text-[13.5px] font-extrabold text-white leading-snug">{motivoVagaFechada(v)}</div>
              </div>
            </div>
          ) : applied ? (
            <div className="flex-1 min-w-0 flex items-center gap-2.5 py-2.5 px-3.5 rounded-[11px] bg-primaryTint">
              <div className="w-7 h-7 rounded-[9px] bg-primaryDeep/10 flex items-center justify-center shrink-0">
                <CheckCircleIcon className="w-[15px] h-[15px] text-primaryDeep" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-primaryDeep/70">Candidatura enviada</div>
                <div className="text-[13.5px] font-extrabold text-primaryDeep leading-snug">Acompanhe em Minhas candidaturas</div>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); abrirDetalheVaga(v.id); }}
              className="flex-1 py-2.5 rounded-[11px] text-[13px] font-bold bg-primary hover:bg-primaryDark text-white"
            >
              Ver detalhes e candidatar-se
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading || !perfil) {
    return <FeedPageSkeleton sidebarItems={3} showFilters />;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        accent="primary"
        subtitle="Profissional"
        items={[
          { key: 'home', label: 'Home', icon: <HomeIcon /> },
          { key: 'historico', label: 'Minhas candidaturas', icon: <ClockIcon /> },
          { key: 'favoritas', label: 'Favoritas', icon: <HeartIcon />, count: vagasFavoritas.length },
          { key: 'perfil', label: 'Perfil', icon: <UserIcon /> },
          { key: 'quem-somos', label: 'Quem somos', icon: <PawIcon className="w-[18px] h-4" /> },
        ]}
        activeKey={tab}
        onSelect={(key) => setTab(key as Tab)}
        footerName={perfil.nome || 'Profissional'}
        footerSubtitle="Conta profissional"
        footerPhotoUrl={perfil.fotoUrl}
      />

      <div className="fixed top-2.5 right-14 md:top-5 md:right-6 z-30">
        <NotificationBell />
      </div>

      <main ref={mainRef} className="flex-1 overflow-y-auto bg-paws">
        {vagaSelecionada ? (() => {
          const compat = vagaSelecionada.categoria === perfil.funcao;
          const applied = hasApplied(vagaSelecionada.id);
          const perto = pertoDeVoce(vagaSelecionada);
          const encerrada = vagaEncerrada(vagaSelecionada);
          const preenchidaPorMim = candidaturas.some((c) => c.vagaId === vagaSelecionada.id && c.status === 'ACEITO');
          return (
            <VagaDetalheView
              vaga={{
                clinica: vagaSelecionada.clinica?.nome,
                clinicaId: vagaSelecionada.clinica?.id,
                clinicaLogoUrl: vagaSelecionada.clinica?.logoUrl,
                clinicaFotos: vagaSelecionada.clinica?.fotosEstrutura,
                categoria: CATEGORIA_LABEL[vagaSelecionada.categoria],
                status: vagaSelecionada.status,
                rua: vagaSelecionada.rua, numero: vagaSelecionada.numero, complemento: vagaSelecionada.complemento,
                bairro: vagaSelecionada.bairro, cidade: vagaSelecionada.cidade, estado: vagaSelecionada.estado,
                data: vagaSelecionada.data, horaInicio: vagaSelecionada.horaInicio, horaFim: vagaSelecionada.horaFim,
                valor: vagaSelecionada.valor, descricao: vagaSelecionada.descricao,
                notaMedia: vagaSelecionada.clinica?.notaMedia, totalAvaliacoes: vagaSelecionada.clinica?.totalAvaliacoes,
                perto,
              }}
              onBack={fecharDetalheVaga}
              actionLabel={preenchidaPorMim ? 'Você foi confirmado' : encerrada ? 'Vaga encerrada' : applied ? 'Candidatura enviada' : compat ? 'Candidatar-se' : 'Perfil incompatível'}
              actionDisabled={applied || encerrada || !compat}
              actionLoading={candidatandoId === vagaSelecionada.id}
              onAction={() => candidatar(vagaSelecionada)}
              compatStatus={encerrada ? 'encerrada' : applied ? 'aplicada' : compat ? 'compativel' : 'incompativel'}
              perfilFuncao={CATEGORIA_LABEL[perfil.funcao]}
              preenchidaPorMim={preenchidaPorMim}
            />
          );
        })() : (
        <>
        {tab === 'home' && (
          <div className="max-w-[880px] mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1 text-white">Vagas disponíveis</h1>
            <p className="text-sm text-white/85 mb-5">Plantões publicados por clínicas parceiras</p>
            <div className="relative mb-3">
              <SearchIcon className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${filtros.busca ? 'text-primary' : 'text-gray-400'}`} />
              <input
                value={filtros.busca}
                onChange={(e) => atualizarFiltro({ busca: e.target.value })}
                placeholder="Buscar por clínica, categoria ou local..."
                className="w-full pl-10 pr-3.5 py-3 rounded-lg border border-gray-300 text-sm bg-white"
              />
            </div>
            {/* Filtros: linha inline no desktop */}
            <div className="hidden md:flex gap-2.5 flex-wrap items-center mb-4">
              <div className="relative">
                <PinIcon className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${filtros.cidade ? 'text-primary' : 'text-gray-400'}`} />
                <input
                  value={filtros.cidade}
                  onChange={(e) => atualizarFiltro({ cidade: e.target.value })}
                  placeholder="Cidade"
                  className="pl-8 pr-3 py-2 rounded-full border border-gray-300 text-sm bg-white w-32"
                />
              </div>
              <DateField
                label="Data"
                hideLabel
                compact
                clearable
                value={filtros.data}
                onChange={(v) => atualizarFiltro({ data: v })}
                min={hojeBrasil()}
                placeholder="Qualquer data"
              />
              <div className="relative">
                <FilterIcon className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${filtros.categoria ? 'text-primary' : 'text-gray-400'}`} />
                <select
                  value={filtros.categoria}
                  onChange={(e) => atualizarFiltro({ categoria: e.target.value })}
                  className={`pl-8 pr-3 py-2 rounded-full border border-gray-300 text-sm bg-white appearance-none ${filtros.categoria ? 'text-ink' : 'text-gray-400'}`}
                >
                  <option value="">Todas categorias</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c} className="text-ink">{CATEGORIA_LABEL[c]}</option>)}
                </select>
              </div>
              {regioesTokens.length > 0 && (
                <label className="flex items-center gap-2 text-sm font-semibold text-white/90 ml-1">
                  <input type="checkbox" checked={filtros.pertoDeMim} onChange={(e) => atualizarFiltro({ pertoDeMim: e.target.checked })} />
                  Somente perto de mim ({perfil.regioesAtendimento})
                </label>
              )}
              <label className="flex items-center gap-2 text-sm font-semibold text-white/90 ml-1">
                <input type="checkbox" checked={filtros.naoCandidatadas} onChange={(e) => atualizarFiltro({ naoCandidatadas: e.target.checked })} />
                Só as que eu não candidatei
              </label>
              <button
                onClick={limparFiltros}
                disabled={!algumFiltroAtivo}
                className="flex items-center gap-1.5 text-sm font-bold text-white/90 ml-auto px-2.5 py-2 rounded-full hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" /> Limpar filtros
              </button>
            </div>

            {/* Filtros: botão + painel no mobile */}
            <div className="md:hidden mb-4">
              <button
                onClick={() => setFiltrosAbertos((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-white/15 px-3.5 py-2.5 rounded-full"
              >
                <FilterIcon className="w-3.5 h-3.5" /> Filtros
                {filtrosAtivos > 0 && (
                  <span className="bg-white text-primaryDeep text-[11px] font-extrabold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1">
                    {filtrosAtivos}
                  </span>
                )}
              </button>
              {filtrosAbertos && (
                <div className="flex flex-col gap-3 bg-white rounded-2xl p-3.5 mt-2.5 shadow-sm">
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">Cidade</div>
                    <div className="relative">
                      <PinIcon className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${filtros.cidade ? 'text-primary' : 'text-gray-400'}`} />
                      <input
                        value={filtros.cidade}
                        onChange={(e) => atualizarFiltro({ cidade: e.target.value })}
                        placeholder="Qualquer cidade"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <DateField
                      label="Data"
                      value={filtros.data}
                      onChange={(v) => atualizarFiltro({ data: v })}
                      min={hojeBrasil()}
                      placeholder="Qualquer data"
                      clearable
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">Categoria</div>
                    <div className="relative">
                      <FilterIcon className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${filtros.categoria ? 'text-primary' : 'text-gray-400'}`} />
                      <select
                        value={filtros.categoria}
                        onChange={(e) => atualizarFiltro({ categoria: e.target.value })}
                        className={`w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm bg-white appearance-none ${filtros.categoria ? 'text-ink' : 'text-gray-400'}`}
                      >
                        <option value="">Todas categorias</option>
                        {CATEGORIAS.map((c) => <option key={c} value={c} className="text-ink">{CATEGORIA_LABEL[c]}</option>)}
                      </select>
                    </div>
                  </div>
                  {regioesTokens.length > 0 && (
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input type="checkbox" checked={filtros.pertoDeMim} onChange={(e) => atualizarFiltro({ pertoDeMim: e.target.checked })} />
                      Somente perto de mim ({perfil.regioesAtendimento})
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input type="checkbox" checked={filtros.naoCandidatadas} onChange={(e) => atualizarFiltro({ naoCandidatadas: e.target.checked })} />
                    Só as que eu não candidatei
                  </label>
                  {algumFiltroAtivo && (
                    <button
                      onClick={limparFiltros}
                      className="flex items-center justify-center gap-1.5 text-sm font-bold text-danger bg-red-50 rounded-lg py-2.5"
                    >
                      <CloseIcon className="w-3 h-3" /> Limpar filtros
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[14px]">
              {feedPaginado.map((v) => renderVagaCard(v))}
              {feedFiltrado.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-10">
                  <EmptyState
                    icon={<SearchIcon className="w-6 h-6" />}
                    title={filtros.naoCandidatadas ? 'Nenhuma vaga nova pra você agora' : 'Nenhuma vaga encontrada'}
                    description={
                      filtros.naoCandidatadas
                        ? 'Você já se candidatou em tudo que bate com os outros filtros escolhidos. Tente remover algum filtro ou volte mais tarde pra conferir novidades.'
                        : algumFiltroAtivo
                          ? 'Nenhuma vaga bate com os filtros que você escolheu. Tente remover algum filtro ou ampliar a busca.'
                          : 'No momento não há vagas publicadas. Volte mais tarde pra conferir novidades.'
                    }
                    actionLabel={algumFiltroAtivo ? 'Limpar filtros' : undefined}
                    actionIcon={<CloseIcon className="w-3.5 h-3.5" />}
                    onAction={algumFiltroAtivo ? limparFiltros : undefined}
                    actionVariant="ghost"
                  />
                </div>
              )}
            </div>
            {temMaisVagas && (
              <div className="flex items-center justify-center py-6">
                <PawTrailLoader label="Carregando mais vagas..." />
              </div>
            )}
          </div>
        )}

        {tab === 'favoritas' && (
          <div className="max-w-[880px] mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1 text-white">Vagas favoritas</h1>
            <p className="text-sm text-white/85 mb-5">Vagas que você salvou pra decidir com calma depois</p>
            <div className="flex flex-col gap-[14px]">
              {vagasFavoritas.map((v) => renderVagaCard(v))}
              {vagasFavoritas.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-10">
                  <EmptyState
                    icon={<HeartIcon className="w-6 h-6" />}
                    tone="rose"
                    title="Nenhuma vaga favoritada ainda"
                    description="Toque no coração de uma vaga na Home pra salvar aqui e decidir com calma depois."
                    actionLabel="Ver vagas disponíveis"
                    actionIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}
                    onAction={() => setTab('home')}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="max-w-[880px] mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1 text-white">Minhas candidaturas</h1>
            <p className="text-sm text-white/85 mb-5">Acompanhe o status das vagas que você se candidatou</p>

            <div className="flex gap-2 flex-wrap mb-5">
              {([
                ['TODAS', 'Todas'], ['PENDENTE', 'Pendentes'], ['ACEITO', 'Aceitas'], ['CONCLUIDA', 'Concluídas'], ['RECUSADO', 'Recusadas'], ['ENCERRADA', 'Encerradas'], ['DESISTIU', 'Desistências'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => selecionarFiltroCandidaturas(key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13.5px] font-bold whitespace-nowrap ${
                    filtroCandidaturas === key ? 'bg-white text-primaryDeep' : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {label}
                  <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full ${filtroCandidaturas === key ? 'bg-primaryTint text-primaryDeep' : 'bg-white/25 text-white'}`}>
                    {contagemStatus[key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-[14px]">
              {candidaturasPaginadas.map((c) => {
                const status = c.statusExibido;
                const fechada = status === 'RECUSADO' || status === 'ENCERRADA' || status === 'DESISTIU';
                const v = c.vaga;
                const local = v ? [v.bairro, `${v.cidade} - ${v.estado}`].filter(Boolean).join(', ') : '';
                const STATUS_CHIP: Record<StatusCandidatura, { label: string; className: string }> = {
                  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
                  ACEITO: { label: 'Aceita', className: 'bg-primary text-white' },
                  CONCLUIDA: { label: 'Concluída', className: 'bg-secondary text-white' },
                  RECUSADO: { label: 'Recusada', className: 'bg-gray-100 text-gray-500' },
                  ENCERRADA: { label: 'Encerrada', className: 'bg-gray-100 text-gray-500' },
                  DESISTIU: { label: 'Desistência', className: 'bg-gray-100 text-gray-500' },
                };
                const statusChip = STATUS_CHIP[status];
                const painelBg =
                  status === 'PENDENTE' ? 'bg-amber-50' : status === 'ACEITO' ? 'bg-primaryTint' : status === 'CONCLUIDA' ? 'bg-secondary/10' : 'bg-gray-50';
                return (
                  <div key={c.id} className={`flex flex-col gap-3 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 ${fechada ? 'rounded-l-md border-l-4 border-l-gray-300' : ''}`}>
                    {/* Identidade da clínica + valor — mesmo cabeçalho do card de vaga */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-2.5 min-w-0">
                        <div className="w-[42px] h-[42px] rounded-xl bg-white border border-gray-200 text-gray-300 flex items-center justify-center shrink-0 overflow-hidden">
                          {v?.clinica?.logoUrl ? (
                            <img src={v.clinica.logoUrl} alt={v.clinica.nome} className="w-full h-full object-cover" />
                          ) : (
                            <BuildingIcon className="w-[18px] h-[18px]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[16.5px] font-extrabold text-ink truncate">{v?.clinica?.nome}</div>
                          <div className="text-[11.5px] font-semibold text-gray-400 mt-0.5">Enviada em {formatDataBR(c.createdAt)}</div>
                        </div>
                      </div>
                      {v && (
                        <div className={`font-extrabold text-[15px] px-3 py-1.5 rounded-[11px] whitespace-nowrap shrink-0 ${fechada ? 'bg-gray-100 text-gray-500' : 'bg-primaryTint text-primaryDeep'}`}>
                          R$ {v.valor}
                        </div>
                      )}
                    </div>

                    {/* Categoria e o status, na mesma linguagem de chip do card de vaga */}
                    <div className="flex gap-1.5 flex-wrap">
                      {v && (
                        <span className="bg-primaryTint text-primaryDeep text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full">
                          {CATEGORIA_LABEL[v.categoria]}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${statusChip.className}`}>
                        {status === 'ENCERRADA' && <LockIcon className="w-2.5 h-2.5" />}
                        {statusChip.label}
                      </span>
                    </div>

                    {/* Data, horário e local — mesma faixa de fatos do card de vaga */}
                    {v && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-[13px] bg-gray-50 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100">
                          <CalendarIcon className="w-[15px] h-[15px] text-primary shrink-0" />
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Data</span>
                            <span className="text-[12.5px] font-bold text-ink truncate">{formatDataBR(v.data)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100">
                          <ClockIcon className="w-[15px] h-[15px] text-primary shrink-0" />
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Horário</span>
                            <span className="text-[12.5px] font-bold text-ink truncate">{v.horaInicio} – {v.horaFim}</span>
                          </div>
                        </div>
                        <a
                          href={mapsLink(local)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100"
                        >
                          <PinIcon className="w-[15px] h-[15px] text-primary shrink-0" />
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Local</span>
                            <span className="text-[12.5px] font-bold text-ink truncate">{local}</span>
                          </div>
                        </a>
                      </div>
                    )}

                    {/* Barrinha de progresso + explicação, juntas num painel só na cor do status */}
                    <div className={`rounded-[14px] px-3.5 pt-3.5 pb-3 ${painelBg}`}>
                      <StepperCandidatura passos={passosDaCandidatura(c, status)} />
                      {status === 'PENDENTE' && (
                        <div className="flex items-start gap-2 text-[12.5px] font-semibold leading-relaxed text-amber-800">
                          <ClockIcon className="w-[15px] h-[15px] shrink-0 mt-px" /> Aguardando resposta da clínica.
                        </div>
                      )}
                      {status === 'ACEITO' && (
                        <div className="flex items-start gap-2 text-[12.5px] font-semibold leading-relaxed text-primaryDeep">
                          <CheckCircleIcon className="w-[15px] h-[15px] shrink-0 mt-px" /> {v ? mensagemAceito(v) : 'Plantão confirmado!'}
                        </div>
                      )}
                      {status === 'CONCLUIDA' && v && (
                        <div className="flex items-start gap-2 text-[12.5px] font-semibold leading-relaxed text-secondary">
                          <CheckCircleIcon className="w-[15px] h-[15px] shrink-0 mt-px" /> Plantão realizado em {formatDataBR(v.data)}.
                        </div>
                      )}
                      {status === 'RECUSADO' && (
                        <div className="flex items-start gap-2 text-[12.5px] font-semibold leading-relaxed text-gray-500">
                          <XCircleIcon className="w-[15px] h-[15px] shrink-0 mt-px" /> {motivoRecusaLabel(c)}
                        </div>
                      )}
                      {status === 'ENCERRADA' && (
                        <div className="flex items-start gap-2 text-gray-500">
                          <LockIcon className="w-[15px] h-[15px] shrink-0 mt-[3px]" />
                          <div>
                            <div className="text-[13px] font-extrabold text-gray-700 mb-0.5">Vaga encerrada</div>
                            <div className="text-[12.5px] font-semibold leading-relaxed">{motivoEncerradaLabel(c)}</div>
                          </div>
                        </div>
                      )}
                      {status === 'DESISTIU' && (
                        <div className="flex items-start gap-2 text-[12.5px] font-semibold leading-relaxed text-gray-500">
                          <CloseIcon className="w-[15px] h-[15px] shrink-0 mt-px" /> Você desistiu desse plantão antes da data — a vaga voltou a ficar aberta pra outro profissional.
                        </div>
                      )}
                    </div>

                    {status === 'CONCLUIDA' && (
                      <AvaliacaoCandidatura
                        candidaturaId={c.id}
                        autorProprio="PROFISSIONAL"
                        labelForm="Avaliar clínica"
                        labelFeita="Sua avaliação"
                        labelOutra={`${v?.clinica?.nome || 'Clínica'} avaliou você`}
                        avaliacoesIniciais={avaliacoesPorCandidatura[c.id] || []}
                      />
                    )}

                    {status === 'PENDENTE' && (
                      cancelandoId === c.id ? (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <div className="text-[12.5px] font-semibold text-red-800 mb-2">Desistir dessa candidatura? A clínica vai ver que você não está mais concorrendo à vaga.</div>
                          <div className="flex gap-2">
                            <button
                              disabled={cancelandoProcessandoId === c.id}
                              onClick={() => confirmarCancelamento(c.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-danger text-white text-xs font-bold disabled:opacity-60"
                            >
                              {cancelandoProcessandoId === c.id ? 'Cancelando...' : 'Sim, cancelar'}
                            </button>
                            <button onClick={() => setCancelandoId(null)} className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-bold">
                              Voltar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button onClick={() => setCancelandoId(c.id)} className="text-xs font-bold text-danger inline-flex items-center gap-1 hover:underline">
                            <CloseIcon className="w-3 h-3" /> Cancelar candidatura
                          </button>
                        </div>
                      )
                    )}

                    {status === 'ACEITO' && v && plantaoAindaNaoComecou(v) && (
                      desistindoId === c.id ? (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <div className="text-[12.5px] font-semibold text-red-800 mb-2">Desistir desse plantão? A vaga volta a ficar aberta pra outro profissional, e a clínica é avisada.</div>
                          <div className="flex gap-2">
                            <button
                              disabled={desistindoProcessandoId === c.id}
                              onClick={() => confirmarDesistencia(c.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-danger text-white text-xs font-bold disabled:opacity-60"
                            >
                              {desistindoProcessandoId === c.id ? 'Enviando...' : 'Sim, desistir'}
                            </button>
                            <button onClick={() => setDesistindoId(null)} className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-bold">
                              Voltar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button onClick={() => setDesistindoId(c.id)} className="text-xs font-bold text-danger inline-flex items-center gap-1 hover:underline">
                            <CloseIcon className="w-3 h-3" /> Desistir do plantão
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
              {candidaturasFiltradas.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-10">
                  {candidaturas.length === 0 ? (
                    <EmptyState
                      icon={<ClockIcon className="w-6 h-6" />}
                      title="Você ainda não se candidatou a nenhuma vaga"
                      description="Quando você se candidatar a um plantão, o progresso da candidatura aparece aqui."
                      actionLabel="Ver vagas disponíveis"
                      actionIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}
                      onAction={() => setTab('home')}
                    />
                  ) : (
                    <EmptyState
                      icon={<SearchIcon className="w-6 h-6" />}
                      title="Nenhuma candidatura encontrada"
                      description="Nenhuma candidatura bate com esse filtro."
                      actionLabel="Ver todas"
                      actionIcon={<CloseIcon className="w-3.5 h-3.5" />}
                      onAction={() => selecionarFiltroCandidaturas('TODAS')}
                      actionVariant="ghost"
                    />
                  )}
                </div>
              )}
            </div>
            {temMaisCandidaturas && (
              <div className="flex items-center justify-center py-6">
                <PawTrailLoader label="Carregando mais candidaturas..." />
              </div>
            )}
          </div>
        )}

        {tab === 'perfil' && (
          <div className="max-w-[880px] mx-auto p-8">
          <div className="bg-[#eef7f6] rounded-[28px] p-6 sm:p-8">
            {/* Cabeçalho */}
            <div className="flex flex-col items-center text-center gap-2.5 sm:flex-row sm:items-end sm:text-left sm:gap-5 mb-6">
              <div className="relative w-[108px] h-[108px] shrink-0">
                <div className="w-full h-full rounded-full p-1 bg-white shadow-md">
                  <div className="relative w-full h-full rounded-full bg-primaryTint text-primaryDeep flex items-center justify-center overflow-hidden">
                    {perfil.fotoUrl ? (
                      <img src={perfil.fotoUrl} alt={perfil.nome} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10" />
                    )}
                    {uploadingFoto && (
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                <label className="absolute right-0 bottom-0.5 w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center cursor-pointer border-[3px] border-primary shadow-md">
                  <PencilIcon className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingFoto} onChange={(e) => handleFotoSelecionada(e.target.files)} />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <div className="text-ink text-2xl font-extrabold">{perfil.nome}</div>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mt-2">
                  <span className="bg-primaryTint text-primaryDeep text-xs font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full">
                    {CATEGORIA_LABEL[perfil.funcao]}
                  </span>
                  {perfil.funcao === 'VETERINARIO_ESPECIALISTA' && perfil.especialidade && (
                    <span className="bg-primaryTint text-primaryDeep text-xs font-bold px-3 py-1.5 rounded-full">
                      {perfil.especialidade}
                    </span>
                  )}
                  {notaMediaRecebida !== null && (
                    <span className="inline-flex items-center gap-1.5 text-ink text-[13.5px] font-bold">
                      <span className="text-amber-500">★</span> {notaMediaRecebida.toFixed(1)}
                      <span className="text-gray-400 font-semibold">({avaliacoesRecebidas.length} avaliações)</span>
                    </span>
                  )}
                </div>
              </div>
              {!editandoPerfil && (
                <button
                  onClick={() => setEditandoPerfil(true)}
                  className="inline-flex items-center gap-1.5 bg-primary text-white text-[13.5px] font-extrabold px-[18px] py-2.5 rounded-xl shadow-md hover:bg-primaryDark shrink-0"
                >
                  <PencilIcon className="w-3.5 h-3.5" /> Editar perfil
                </button>
              )}
            </div>

            {!editandoPerfil ? (
              <>
                {/* Estatísticas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                  <div className="bg-white rounded-2xl p-4 text-center">
                    <div className="text-xl font-extrabold text-ink">{notaMediaRecebida !== null ? notaMediaRecebida.toFixed(1) : '—'}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-0.5">Nota média</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 text-center">
                    <div className="text-xl font-extrabold text-ink">{plantaoConcluidos}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-0.5">Plantões concluídos</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 text-center">
                    <div className="text-xl font-extrabold text-ink">{regioesCount || '—'}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-0.5">Regiões atendidas</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 text-center">
                    <div className="text-xl font-extrabold text-ink">{tempoNaPlataforma(perfil.createdAt)}</div>
                    <div className="text-[11px] font-bold text-gray-500 mt-0.5">Na plataforma</div>
                  </div>
                </div>

                {/* Sobre */}
                {(isVeterinarioFormado(perfil.funcao) || perfil.observacoes) && (
                  <div className="bg-white rounded-2xl p-5 mb-3.5">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-gray-400 mb-3">Sobre</div>
                    {isVeterinarioFormado(perfil.funcao) && perfil.areaAtuacao && (
                      <span className="inline-flex bg-primaryTint text-primaryDeep text-[12.5px] font-bold px-3 py-1.5 rounded-full">{perfil.areaAtuacao}</span>
                    )}
                    {perfil.observacoes && <p className="text-sm leading-relaxed text-gray-700 mt-3">{perfil.observacoes}</p>}
                  </div>
                )}

                {/* Contato */}
                <div className="bg-white rounded-2xl p-5 mb-3.5">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-gray-400 mb-3">Contato e disponibilidade</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-primaryTint text-primaryDeep flex items-center justify-center shrink-0"><MailIcon className="w-3.5 h-3.5" /></div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">E-mail</div>
                        <div className="text-sm font-bold text-ink mt-0.5 truncate">{perfil.email}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-primaryTint text-primaryDeep flex items-center justify-center shrink-0"><PhoneIcon className="w-3.5 h-3.5" /></div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Telefone</div>
                        <div className="text-sm font-bold text-ink mt-0.5">{perfil.telefone ? maskTelefone(perfil.telefone) : 'Não informado'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-primaryTint text-primaryDeep flex items-center justify-center shrink-0"><PinIcon className="w-3.5 h-3.5" /></div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Regiões de atendimento</div>
                        <div className="text-sm font-bold text-ink mt-0.5">{perfil.regioesAtendimento || 'Não informado'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documentação */}
                <div className="bg-white rounded-2xl p-5 mb-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-gray-400">Documentação</div>
                    <div className="text-[11px] font-bold text-gray-400">{perfil.curriculoUrl ? '2' : '1'} de 2 enviados</div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-2">
                    <div className="w-[46px] h-[46px] rounded-xl bg-primaryTint text-primaryDeep flex items-center justify-center shrink-0"><ShieldIcon className="w-5 h-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-ink">
                        {isVeterinarioFormado(perfil.funcao) ? 'Carteirinha do CRMV' : `Carteirinha do ${perfil.tipoComprovacao}`}
                      </div>
                      {isVeterinarioFormado(perfil.funcao) && perfil.crmv && (
                        <div className="text-xs text-gray-500 font-semibold mt-0.5">Nº do CRMV: <span className="font-extrabold text-gray-700">{perfil.crmv}</span></div>
                      )}
                      <span className="inline-flex items-center gap-1 bg-primaryTint text-primaryDeep text-[10.5px] font-extrabold px-2 py-0.5 rounded-full mt-1.5">
                        <CheckIcon className="w-2.5 h-2.5" /> Enviado
                      </span>
                    </div>
                    <a
                      href={perfil.comprovanteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ver documento"
                      className="w-[42px] h-[42px] rounded-full bg-white border border-gray-200 text-primary flex items-center justify-center shrink-0 shadow-sm hover:bg-primaryTint"
                    >
                      <EyeIcon className="w-[18px] h-[18px]" />
                    </a>
                  </div>

                  {perfil.curriculoUrl ? (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                      <div className="w-[46px] h-[46px] rounded-xl bg-primaryTint text-primaryDeep flex items-center justify-center shrink-0"><FileIcon className="w-5 h-5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold text-ink">Currículo</div>
                        <div className="text-xs text-gray-500 truncate">{decodeURIComponent(perfil.curriculoUrl.split('/').pop() || 'curriculo.pdf')}</div>
                        <span className="inline-flex items-center gap-1 bg-primaryTint text-primaryDeep text-[10.5px] font-extrabold px-2 py-0.5 rounded-full mt-1.5">
                          <CheckIcon className="w-2.5 h-2.5" /> Enviado
                        </span>
                      </div>
                      <a
                        href={perfil.curriculoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Baixar currículo"
                        className="w-[42px] h-[42px] rounded-full bg-white border border-gray-200 text-primary flex items-center justify-center shrink-0 shadow-sm hover:bg-primaryTint"
                      >
                        <DownloadIcon className="w-[18px] h-[18px]" />
                      </a>
                    </div>
                  ) : (
                    <label className={`flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl p-3 ${uploadingCurriculoInline ? '' : 'cursor-pointer hover:bg-gray-50'}`}>
                      <div className="w-[46px] h-[46px] rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                        {uploadingCurriculoInline ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                        ) : (
                          <FileIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold text-ink">Currículo</div>
                        <div className="text-xs text-gray-400">Nenhum currículo enviado ainda</div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-extrabold px-3.5 py-2.5 rounded-full shrink-0">
                        <UploadIcon className="w-3.5 h-3.5" /> {uploadingCurriculoInline ? 'Enviando...' : 'Enviar'}
                      </span>
                      <input type="file" accept=".pdf" className="hidden" disabled={uploadingCurriculoInline} onChange={(e) => handleCurriculoInlineSelecionado(e.target.files)} />
                    </label>
                  )}
                </div>

                {/* Avaliações recebidas */}
                {avaliacoesRecebidas.length > 0 && (
                  <div className="bg-white rounded-2xl p-5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-gray-400 mb-1">
                      <HeartIcon className="w-3.5 h-3.5 text-primary" /> Avaliações recebidas
                    </div>
                    {avaliacoesRecebidas.map((a) => (
                      <div key={a.id} className="py-3.5 border-b border-gray-100 last:border-b-0 last:pb-0 first:pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[13.5px] font-extrabold text-ink">{a.clinicaNome}</div>
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
                <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Nome</span>
                  <input value={perfilForm.nome} onChange={(e) => setPerfilForm((f) => ({ ...f, nome: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
                <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">CPF/CNPJ</span>
                  <input disabled value={perfil.documento} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" /></label>
                <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Função</span>
                  <input disabled value={CATEGORIA_LABEL[perfil.funcao]} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" /></label>
                {perfil.funcao === 'VETERINARIO_ESPECIALISTA' && (
                  <>
                    <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Especialidade</span>
                      <select
                        value={perfilForm.especialidade}
                        onChange={(e) => setPerfilForm((f) => ({ ...f, especialidade: e.target.value, especialidadeOutra: e.target.value === 'Outra' ? f.especialidadeOutra : '' }))}
                        className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white"
                      >
                        <option value="">Selecione...</option>
                        {ESPECIALIDADES_VETERINARIAS.map((esp) => <option key={esp} value={esp}>{esp}</option>)}
                      </select>
                    </label>
                    {perfilForm.especialidade === 'Outra' && (
                      <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Qual especialidade?</span>
                        <input
                          value={perfilForm.especialidadeOutra}
                          onChange={(e) => setPerfilForm((f) => ({ ...f, especialidadeOutra: e.target.value }))}
                          className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                        /></label>
                    )}
                  </>
                )}
                {isVeterinarioFormado(perfil.funcao) && (
                  <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Número do CRMV</span>
                    <input
                      value={perfilForm.crmv}
                      onChange={(e) => setPerfilForm((f) => ({ ...f, crmv: e.target.value }))}
                      placeholder="Ex.: 18.432-SP"
                      className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                    /></label>
                )}
                <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Telefone</span>
                  <input
                    value={maskTelefone(perfilForm.telefone)}
                    onChange={(e) => setPerfilForm((f) => ({ ...f, telefone: onlyDigits(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                  /></label>
                <DateField
                  label="Data de nascimento"
                  value={perfilForm.dataNascimento}
                  onChange={(v) => setPerfilForm((f) => ({ ...f, dataNascimento: v }))}
                  min="1900-01-01"
                  max={hojeBrasil()}
                />
                {isVeterinarioFormado(perfil.funcao) && (
                  <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Área de atuação</span>
                    <input value={perfilForm.areaAtuacao} onChange={(e) => setPerfilForm((f) => ({ ...f, areaAtuacao: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
                )}
                <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Regiões de atendimento</span>
                  <input value={perfilForm.regioesAtendimento} onChange={(e) => setPerfilForm((f) => ({ ...f, regioesAtendimento: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
                <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Observações e demais informações</span>
                  <textarea
                    value={perfilForm.observacoes}
                    onChange={(e) => setPerfilForm((f) => ({ ...f, observacoes: e.target.value }))}
                    rows={4}
                    placeholder="Conte um pouco sobre sua experiência, disponibilidade e outras informações relevantes para as clínicas"
                    className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                  /></label>
                {curriculoNovo ? (
                  <FileField
                    label="Currículo (opcional)"
                    files={curriculoNovo}
                    onChange={(fl) => setCurriculoNovo(fl?.[0] ?? null)}
                    accept=".pdf"
                  />
                ) : perfil.curriculoUrl && !curriculoRemovido ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Currículo (opcional)</span>
                    <div className="relative flex items-center gap-3 rounded-xl border border-gray-200 p-2.5 bg-white">
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-800 truncate">{decodeURIComponent(perfil.curriculoUrl.split('/').pop() || 'curriculo.pdf')}</div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-primaryDeep mt-0.5">
                          <CheckIcon className="w-3 h-3" /> Enviado
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurriculoRemovido(true)}
                        aria-label="Remover"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-danger shrink-0"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <FileField
                    label="Currículo (opcional)"
                    files={null}
                    onChange={(fl) => setCurriculoNovo(fl?.[0] ?? null)}
                    accept=".pdf"
                    hint="PDF"
                  />
                )}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => salvarPerfil().then(() => setEditandoPerfil(false))}
                    disabled={savingPerfil}
                    className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primaryDark text-white text-sm font-bold shadow-sm disabled:opacity-60"
                  >
                    {savingPerfil ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                  <button
                    onClick={() => { setEditandoPerfil(false); setCurriculoNovo(null); setCurriculoRemovido(false); }}
                    className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-bold hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {tab === 'quem-somos' && (
          <QuemSomosView ctaLabel="Ver vagas disponíveis" onCta={() => setTab('home')} />
        )}
        </>
        )}
      </main>

      <RecorteFotoModal
        file={fotoParaCortar}
        shape="circle"
        onCancel={() => setFotoParaCortar(null)}
        onConfirm={handleFotoCortada}
      />
    </div>
  );
}
