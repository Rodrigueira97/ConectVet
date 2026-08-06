'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { hojeBrasil, vagaEncerrada } from '@/lib/mockData';
import { PublicHeader } from '@/app/components/PublicHeader';
import { VagaCardPublica } from '@/app/components/VagaCardPublica';
import { DateField } from '@/app/components/DateField';
import { EmptyState } from '@/app/components/EmptyState';
import { PawTrailLoader } from '@/app/components/PawTrailLoader';
import { CardSkeleton } from '@/app/components/skeletons/CardSkeleton';
import { CloseIcon, FilterIcon, PinIcon, SearchIcon, WarningIcon } from '@/app/components/icons';
import { CATEGORIA_LABEL, CATEGORIAS, Vaga, getFeed } from '@/lib/api';

const VAGAS_POR_PAGINA = 6;

export default function HomePublica() {
  return (
    <Suspense fallback={<HomePublicaSkeleton />}>
      <HomePublicaInner />
    </Suspense>
  );
}

function HomePublicaSkeleton() {
  return (
    <div className="min-h-screen bg-paws">
      <div className="bg-white h-[62px]" />
      <div className="max-w-[880px] mx-auto p-8">
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

function HomePublicaInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(patch: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const filtros = {
    busca: searchParams.get('busca') || '',
    categoria: searchParams.get('categoria') || '',
    cidade: searchParams.get('cidade') || '',
    data: searchParams.get('data') || '',
  };

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [feed, setFeed] = useState<Vaga[]>([]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [visiveis, setVisiveis] = useState(VAGAS_POR_PAGINA);

  useEffect(() => {
    setLoading(true);
    setErro(false);
    getFeed({ cidade: filtros.cidade || undefined, data: filtros.data || undefined })
      .then(setFeed)
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.cidade, filtros.data, tentativa]);

  useEffect(() => { setVisiveis(VAGAS_POR_PAGINA); }, [filtros.busca, filtros.categoria, filtros.cidade, filtros.data]);

  useEffect(() => {
    function verificarScroll() {
      const faltam = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (faltam > 200) return;
      setVisiveis((v) => (v < feedFiltrado.length ? Math.min(v + VAGAS_POR_PAGINA, feedFiltrado.length) : v));
    }
    window.addEventListener('scroll', verificarScroll, { passive: true });
    window.addEventListener('resize', verificarScroll);
    return () => {
      window.removeEventListener('scroll', verificarScroll);
      window.removeEventListener('resize', verificarScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const feedFiltrado = feed
    .filter((v) => {
      if (filtros.categoria && v.categoria !== filtros.categoria) return false;
      const local = [v.bairro, v.cidade, v.estado].filter(Boolean).join(' ');
      if (filtros.busca && !`${v.clinica?.nome} ${CATEGORIA_LABEL[v.categoria]} ${local}`.toLowerCase().includes(filtros.busca.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => Number(vagaEncerrada(a)) - Number(vagaEncerrada(b)));

  const feedPaginado = feedFiltrado.slice(0, visiveis);
  const temMais = visiveis < feedFiltrado.length;
  const filtrosAtivos = [filtros.cidade, filtros.data, filtros.categoria].filter(Boolean).length;
  const algumFiltroAtivo = filtrosAtivos > 0 || !!filtros.busca;

  function limparFiltros() {
    goTo({ busca: '', categoria: '', cidade: '', data: '' });
  }

  return (
    <div className="min-h-screen bg-paws">
      <PublicHeader />

      <div className="max-w-[880px] mx-auto p-8">
        <h1 className="text-2xl font-extrabold mb-1 text-white">Vagas disponíveis</h1>
        <p className="text-sm text-white/85 mb-5">
          Plantões publicados por clínicas parceiras. Navegue à vontade — só pedimos conta na hora de se candidatar.
        </p>

        <div className="relative mb-3">
          <SearchIcon className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${filtros.busca ? 'text-primary' : 'text-gray-400'}`} />
          <input
            value={filtros.busca}
            onChange={(e) => goTo({ busca: e.target.value })}
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
              onChange={(e) => goTo({ cidade: e.target.value })}
              placeholder="Cidade"
              className="pl-8 pr-3 py-2 rounded-full border border-gray-300 text-sm bg-white w-32"
            />
          </div>
          <DateField
            label="Data" hideLabel compact clearable
            value={filtros.data}
            onChange={(v) => goTo({ data: v })}
            min={hojeBrasil()}
            placeholder="Qualquer data"
          />
          <div className="relative">
            <FilterIcon className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${filtros.categoria ? 'text-primary' : 'text-gray-400'}`} />
            <select
              value={filtros.categoria}
              onChange={(e) => goTo({ categoria: e.target.value })}
              className={`pl-8 pr-3 py-2 rounded-full border border-gray-300 text-sm bg-white appearance-none ${filtros.categoria ? 'text-ink' : 'text-gray-400'}`}
            >
              <option value="">Todas categorias</option>
              {CATEGORIAS.map((c) => <option key={c} value={c} className="text-ink">{CATEGORIA_LABEL[c]}</option>)}
            </select>
          </div>
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
                    onChange={(e) => goTo({ cidade: e.target.value })}
                    placeholder="Qualquer cidade"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <DateField
                  label="Data"
                  value={filtros.data}
                  onChange={(v) => goTo({ data: v })}
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
                    onChange={(e) => goTo({ categoria: e.target.value })}
                    className={`w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm bg-white appearance-none ${filtros.categoria ? 'text-ink' : 'text-gray-400'}`}
                  >
                    <option value="">Todas categorias</option>
                    {CATEGORIAS.map((c) => <option key={c} value={c} className="text-ink">{CATEGORIA_LABEL[c]}</option>)}
                  </select>
                </div>
              </div>
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

        {erro ? (
          <div className="bg-white rounded-2xl shadow-sm p-10">
            <EmptyState
              icon={<WarningIcon className="w-6 h-6" />}
              title="Não foi possível carregar as vagas"
              description="Algo deu errado ao buscar os plantões disponíveis. Tente de novo em instantes."
              actionLabel="Tentar novamente"
              onAction={() => setTentativa((t) => t + 1)}
            />
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-[14px]">
            {feedPaginado.map((v) => <VagaCardPublica key={v.id} vaga={v} />)}
            {feedFiltrado.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-10">
                <EmptyState
                  icon={<SearchIcon className="w-6 h-6" />}
                  title="Nenhuma vaga encontrada"
                  description={
                    algumFiltroAtivo
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
        )}
        {temMais && (
          <div className="flex items-center justify-center py-6">
            <PawTrailLoader label="Carregando mais vagas..." />
          </div>
        )}
      </div>
    </div>
  );
}
