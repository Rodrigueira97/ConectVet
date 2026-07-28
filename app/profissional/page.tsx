'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildEndereco, mapsLink, onlyDigits, statusBadge } from '@/lib/mockData';
import { maskTelefone } from '@/lib/validators';
import { Sidebar } from '@/app/components/Sidebar';
import { HomeIcon, ClockIcon, UserIcon, SearchIcon, PinIcon, CalendarIcon, FilterIcon, CloseIcon } from '@/app/components/icons';
import { VagaDetalheView } from '@/app/components/VagaDetalhe';
import { AvaliacaoCandidatura } from '@/app/components/AvaliacaoCandidatura';
import { FeedPageSkeleton } from '@/app/components/skeletons/FeedPageSkeleton';
import { RatingBadge } from '@/app/components/RatingBadge';
import {
  ApiError, getToken, clearSession, CATEGORIA_LABEL, CATEGORIAS,
  Vaga, Candidatura, Profissional, Avaliacao,
  getProfissionalMe, updateProfissionalMe, getFeed, getMinhasCandidaturas, candidatar as apiCandidatar,
  getAvaliacoesPorCandidatura, uploadArquivo,
} from '@/lib/api';

const POR_PAGINA = 10;

type Tab = 'home' | 'historico' | 'perfil';

function formatDataBR(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function localDaVaga(v: { rua: string; numero: string; complemento?: string | null; bairro?: string | null; cidade: string; estado: string }) {
  return buildEndereco({ rua: v.rua, numero: v.numero, complemento: v.complemento || undefined, bairro: v.bairro || undefined, cidade: v.cidade, estado: v.estado });
}

export default function ProfissionalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [perfil, setPerfil] = useState<Profissional | null>(null);
  const [perfilForm, setPerfilForm] = useState({ nome: '', telefone: '', dataNascimento: '', areaAtuacao: '', regioesAtendimento: '' });
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [feed, setFeed] = useState<Vaga[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [avaliacoesPorCandidatura, setAvaliacoesPorCandidatura] = useState<Record<string, Avaliacao[]>>({});
  const [filtros, setFiltros] = useState({ busca: '', categoria: '', cidade: '', data: '', pertoDeMim: false });
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [visiveis, setVisiveis] = useState(POR_PAGINA);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);
  const [candidatandoId, setCandidatandoId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/'); return; }
    (async () => {
      try {
        const [p, f, c] = await Promise.all([getProfissionalMe(), getFeed(), getMinhasCandidaturas()]);
        setPerfil(p);
        setPerfilForm({
          nome: p.nome, telefone: p.telefone || '', dataNascimento: p.dataNascimento ? p.dataNascimento.slice(0, 10) : '',
          areaAtuacao: p.areaAtuacao, regioesAtendimento: p.regioesAtendimento,
        });
        setFeed(f);
        setCandidaturas(c);

        const aceitas = c.filter((x) => x.status === 'ACEITO');
        const pares = await Promise.all(aceitas.map(async (x) => [x.id, await getAvaliacoesPorCandidatura(x.id)] as const));
        setAvaliacoesPorCandidatura(Object.fromEntries(pares));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) { clearSession(); router.push('/'); }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const jaCarregouFeed = useRef(false);
  useEffect(() => {
    if (!jaCarregouFeed.current) { jaCarregouFeed.current = true; return; }
    getFeed({ cidade: filtros.cidade || undefined, data: filtros.data || undefined })
      .then(setFeed)
      .catch(() => {});
  }, [filtros.cidade, filtros.data]);

  function hasApplied(vagaId: string) {
    return candidaturas.some((c) => c.vagaId === vagaId);
  }

  async function candidatar(v: Vaga) {
    if (hasApplied(v.id) || !perfil) return;
    setCandidatandoId(v.id);
    setActionError('');
    try {
      const nova = await apiCandidatar(v.id);
      setCandidaturas((prev) => [{ ...nova, vaga: v }, ...prev]);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível enviar a candidatura.');
    } finally {
      setCandidatandoId(null);
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

  const feedFiltrado = feed.filter((v) => {
    if (filtros.categoria && v.categoria !== filtros.categoria) return false;
    const local = localDaVaga(v);
    if (filtros.busca && !`${v.clinica?.nome} ${CATEGORIA_LABEL[v.categoria]} ${local}`.toLowerCase().includes(filtros.busca.toLowerCase())) return false;
    if (filtros.pertoDeMim && !pertoDeVoce(v)) return false;
    return true;
  });

  const feedPaginado = feedFiltrado.slice(0, visiveis);
  const temMaisVagas = visiveis < feedFiltrado.length;

  useEffect(() => {
    if (tab !== 'home') return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisiveis((v) => Math.min(v + POR_PAGINA, feedFiltrado.length));
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab, feedFiltrado.length]);

  function atualizarFiltro(novo: Partial<typeof filtros>) {
    setFiltros((f) => ({ ...f, ...novo }));
    setVisiveis(POR_PAGINA);
  }

  function limparFiltros() {
    atualizarFiltro({ busca: '', categoria: '', cidade: '', data: '', pertoDeMim: false });
  }

  const filtrosAtivos = [filtros.cidade, filtros.data, filtros.categoria, filtros.pertoDeMim].filter(Boolean).length;
  const algumFiltroAtivo = filtrosAtivos > 0 || !!filtros.busca;

  async function salvarPerfil() {
    setSavingPerfil(true);
    setActionError('');
    try {
      const atualizado = await updateProfissionalMe({ ...perfilForm, telefone: onlyDigits(perfilForm.telefone) });
      setPerfil(atualizado);
      setPerfilForm({
        nome: atualizado.nome, telefone: atualizado.telefone || '', dataNascimento: atualizado.dataNascimento ? atualizado.dataNascimento.slice(0, 10) : '',
        areaAtuacao: atualizado.areaAtuacao, regioesAtendimento: atualizado.regioesAtendimento,
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSavingPerfil(false);
    }
  }

  async function handleFotoChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    setActionError('');
    try {
      const fotoUrl = await uploadArquivo(file);
      const atualizado = await updateProfissionalMe({ fotoUrl });
      setPerfil(atualizado);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível enviar a foto.');
    } finally {
      setUploadingFoto(false);
    }
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
          { key: 'perfil', label: 'Perfil', icon: <UserIcon /> },
        ]}
        activeKey={tab}
        onSelect={(key) => setTab(key as Tab)}
        footerName={perfil.nome || 'Profissional'}
        footerSubtitle="Conta profissional"
        footerPhotoUrl={perfil.fotoUrl}
      />

      <main className="flex-1 overflow-y-auto bg-paws">
        {vagaSelecionada ? (() => {
          const compat = vagaSelecionada.categoria === perfil.funcao;
          const applied = hasApplied(vagaSelecionada.id);
          const perto = pertoDeVoce(vagaSelecionada);
          return (
            <VagaDetalheView
              vaga={{
                clinica: vagaSelecionada.clinica?.nome,
                categoria: CATEGORIA_LABEL[vagaSelecionada.categoria],
                rua: vagaSelecionada.rua, numero: vagaSelecionada.numero, complemento: vagaSelecionada.complemento,
                bairro: vagaSelecionada.bairro, cidade: vagaSelecionada.cidade, estado: vagaSelecionada.estado,
                data: vagaSelecionada.data, horaInicio: vagaSelecionada.horaInicio, horaFim: vagaSelecionada.horaFim,
                valor: vagaSelecionada.valor, descricao: vagaSelecionada.descricao,
                notaMedia: vagaSelecionada.clinica?.notaMedia, totalAvaliacoes: vagaSelecionada.clinica?.totalAvaliacoes,
                perto,
              }}
              onBack={() => setVagaSelecionada(null)}
              actionLabel={applied ? 'Candidatura enviada' : compat ? 'Candidatar-se' : 'Perfil incompatível'}
              actionDisabled={applied || !compat || candidatandoId === vagaSelecionada.id}
              onAction={() => candidatar(vagaSelecionada)}
              compatStatus={applied ? 'aplicada' : compat ? 'compativel' : 'incompativel'}
              perfilFuncao={CATEGORIA_LABEL[perfil.funcao]}
            />
          );
        })() : (
        <>
        {actionError && (
          <div className="max-w-3xl mx-auto pt-6 px-8">
            <div className="text-sm font-semibold text-danger bg-red-50 rounded-lg p-3">{actionError}</div>
          </div>
        )}

        {tab === 'home' && (
          <div className="max-w-[880px] mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1 text-white">Vagas disponíveis</h1>
            <p className="text-sm text-white/85 mb-5">Plantões publicados por clínicas parceiras</p>
            <div className="relative mb-3">
              <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                <PinIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={filtros.cidade}
                  onChange={(e) => atualizarFiltro({ cidade: e.target.value })}
                  placeholder="Cidade"
                  className="pl-8 pr-3 py-2 rounded-full border border-gray-300 text-sm bg-white w-32"
                />
              </div>
              <div className="relative">
                <CalendarIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={filtros.data}
                  onChange={(e) => atualizarFiltro({ data: e.target.value })}
                  className="pl-8 pr-3 py-2 rounded-full border border-gray-300 text-sm bg-white"
                />
              </div>
              <div className="relative">
                <FilterIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={filtros.categoria}
                  onChange={(e) => atualizarFiltro({ categoria: e.target.value })}
                  className="pl-8 pr-3 py-2 rounded-full border border-gray-300 text-sm bg-white appearance-none"
                >
                  <option value="">Todas categorias</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
                </select>
              </div>
              {regioesTokens.length > 0 && (
                <label className="flex items-center gap-2 text-sm font-semibold text-white/90 ml-1">
                  <input type="checkbox" checked={filtros.pertoDeMim} onChange={(e) => atualizarFiltro({ pertoDeMim: e.target.checked })} />
                  Somente perto de mim ({perfil.regioesAtendimento})
                </label>
              )}
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
                      <PinIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={filtros.cidade}
                        onChange={(e) => atualizarFiltro({ cidade: e.target.value })}
                        placeholder="Qualquer cidade"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">Data</div>
                    <div className="relative">
                      <CalendarIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={filtros.data}
                        onChange={(e) => atualizarFiltro({ data: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">Categoria</div>
                    <div className="relative">
                      <FilterIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={filtros.categoria}
                        onChange={(e) => atualizarFiltro({ categoria: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm bg-white appearance-none"
                      >
                        <option value="">Todas categorias</option>
                        {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
                      </select>
                    </div>
                  </div>
                  {regioesTokens.length > 0 && (
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input type="checkbox" checked={filtros.pertoDeMim} onChange={(e) => atualizarFiltro({ pertoDeMim: e.target.checked })} />
                      Somente perto de mim ({perfil.regioesAtendimento})
                    </label>
                  )}
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
              {feedPaginado.map((v) => {
                const compat = v.categoria === perfil.funcao;
                const applied = hasApplied(v.id);
                const perto = pertoDeVoce(v);
                const local = localDaVaga(v);
                return (
                  <div
                    key={v.id}
                    onClick={() => setVagaSelecionada(v)}
                    className="bg-white border border-gray-200 rounded-2xl shadow-sm p-[18px] cursor-pointer hover:border-secondary/40 hover:shadow-[0_4px_14px_rgba(4,45,76,0.06)] transition-[border-color,box-shadow] duration-150"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex gap-2 items-center flex-wrap">
                          <div className="text-[11.5px] font-extrabold text-primary uppercase tracking-[0.02em]">{CATEGORIA_LABEL[v.categoria]}</div>
                          {perto && <div className="bg-secondary text-white text-[9.5px] font-extrabold px-[7px] py-0.5 rounded-[5px] uppercase">Perto de você</div>}
                        </div>
                        <div className="text-[17px] font-extrabold mt-[3px]">{v.clinica?.nome}</div>
                        <div className="mt-1.5"><RatingBadge notaMedia={v.clinica?.notaMedia} totalAvaliacoes={v.clinica?.totalAvaliacoes} /></div>
                      </div>
                      <div className="bg-primaryTint text-primaryDeep font-extrabold text-[13.5px] px-[11px] py-1.5 rounded-[10px] whitespace-nowrap">R$ {v.valor}</div>
                    </div>
                    <div className="flex gap-4 flex-wrap items-center mt-3 text-[13px] text-gray-500">
                      <a
                        href={mapsLink(local)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <PinIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                        Local <b className="font-bold text-gray-700">{local}</b>
                      </a>
                      <div>Data <b className="font-bold text-gray-700">{formatDataBR(v.data)}</b></div>
                      <div>Horário <b className="font-bold text-gray-700">{v.horaInicio} - {v.horaFim}</b></div>
                    </div>
                    {v.descricao && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-[13.5px] leading-relaxed text-gray-700">
                        <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.02em] mb-1">Descrição</div>
                        <div className="whitespace-pre-line">{v.descricao}</div>
                      </div>
                    )}
                    <div className="flex justify-end mt-[14px]">
                      <button disabled={applied || !compat} onClick={(e) => { e.stopPropagation(); setVagaSelecionada(v); }}
                        className={`px-4 py-[9px] rounded-[10px] text-[13.5px] font-bold ${applied || !compat ? 'border border-gray-300 bg-gray-50 text-gray-400' : 'bg-primary hover:bg-primaryDark text-white'}`}>
                        {applied ? 'Candidatura enviada' : compat ? 'Ver detalhes e candidatar-se' : 'Perfil incompatível'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {feedFiltrado.length === 0 && <div className="text-sm text-gray-400">Nenhuma vaga encontrada.</div>}
            </div>
            {temMaisVagas && (
              <div ref={sentinelRef} className="flex items-center justify-center py-6 text-xs font-semibold text-white/70">
                Carregando mais vagas...
              </div>
            )}
          </div>
        )}

        {tab === 'historico' && (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1 text-white">Minhas candidaturas</h1>
            <p className="text-sm text-white/85 mb-6">Acompanhe o status das vagas que você se candidatou</p>
            <div className="flex flex-col gap-3">
              {candidaturas.map((c) => {
                const badge = statusBadge(c.status.toLowerCase());
                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <div className="text-xs font-bold text-primary uppercase">{c.vaga && CATEGORIA_LABEL[c.vaga.categoria]}</div>
                        <div className="font-extrabold mt-1">{c.vaga?.clinica?.nome}</div>
                        <div className="text-sm text-gray-500 mt-1">Data <b className="font-bold text-gray-700">{c.vaga && formatDataBR(c.vaga.data)}</b> · <b className="font-bold text-gray-700">R$ {c.vaga?.valor}</b></div>
                      </div>
                      <div className={badge.className}>{badge.label}</div>
                    </div>
                    {c.status === 'ACEITO' && (
                      <AvaliacaoCandidatura
                        candidaturaId={c.id}
                        autorProprio="PROFISSIONAL"
                        labelForm="Avaliar clínica"
                        labelFeita="Avaliação da clínica"
                        labelOutra={`${c.vaga?.clinica?.nome || 'Clínica'} avaliou você`}
                        corBotao="bg-primary"
                        avaliacoesIniciais={avaliacoesPorCandidatura[c.id] || []}
                      />
                    )}
                  </div>
                );
              })}
              {candidaturas.length === 0 && <div className="text-sm text-gray-400">Você ainda não se candidatou a nenhuma vaga.</div>}
            </div>
          </div>
        )}

        {tab === 'perfil' && (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-6 text-white">Perfil</h1>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 flex flex-col gap-4">
              <div className="flex items-center gap-4 pb-2">
                <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden shrink-0">
                  {perfil.fotoUrl ? (
                    <img src={perfil.fotoUrl} alt={perfil.nome} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-9 h-9" />
                  )}
                </div>
                <label className="cursor-pointer px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50">
                  {uploadingFoto ? 'Enviando...' : 'Trocar foto'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingFoto} onChange={(e) => handleFotoChange(e.target.files)} />
                </label>
              </div>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Nome</span>
                <input value={perfilForm.nome} onChange={(e) => setPerfilForm((f) => ({ ...f, nome: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">CPF/CNPJ</span>
                <input disabled value={perfil.documento} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Função</span>
                <input disabled value={CATEGORIA_LABEL[perfil.funcao]} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Telefone</span>
                <input
                  value={maskTelefone(perfilForm.telefone)}
                  onChange={(e) => setPerfilForm((f) => ({ ...f, telefone: onlyDigits(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                  className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Data de nascimento</span>
                <input
                  type="date"
                  value={perfilForm.dataNascimento}
                  onChange={(e) => setPerfilForm((f) => ({ ...f, dataNascimento: e.target.value }))}
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Área de atuação</span>
                <input value={perfilForm.areaAtuacao} onChange={(e) => setPerfilForm((f) => ({ ...f, areaAtuacao: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Regiões de atendimento</span>
                <input value={perfilForm.regioesAtendimento} onChange={(e) => setPerfilForm((f) => ({ ...f, regioesAtendimento: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
              <button onClick={salvarPerfil} disabled={savingPerfil} className="self-start px-5 py-2.5 rounded-lg bg-ink text-white text-sm font-bold shadow-sm disabled:opacity-60">
                {savingPerfil ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
