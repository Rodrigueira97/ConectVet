'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIAS, buildEndereco, statusBadge } from '@/lib/mockData';
import { Sidebar } from '@/app/components/Sidebar';
import { HomeIcon, ClockIcon, UserIcon } from '@/app/components/icons';
import { VagaDetalheView } from '@/app/components/VagaDetalhe';
import {
  ApiError, getToken, clearSession, CATEGORIA_LABEL,
  Vaga, Candidatura, Profissional,
  getProfissionalMe, updateProfissionalMe, getFeed, getMinhasCandidaturas, candidatar as apiCandidatar,
  criarAvaliacao,
} from '@/lib/api';

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
  const [perfilForm, setPerfilForm] = useState({ nome: '', areaAtuacao: '', regioesAtendimento: '' });
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [feed, setFeed] = useState<Vaga[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [filtros, setFiltros] = useState({ busca: '', categoria: '', pertoDeMim: false });
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);
  const [candidatandoId, setCandidatandoId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/'); return; }
    (async () => {
      try {
        const [p, f, c] = await Promise.all([getProfissionalMe(), getFeed(), getMinhasCandidaturas()]);
        setPerfil(p);
        setPerfilForm({ nome: p.nome, areaAtuacao: p.areaAtuacao, regioesAtendimento: p.regioesAtendimento });
        setFeed(f);
        setCandidaturas(c);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) { clearSession(); router.push('/'); }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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

  async function salvarPerfil() {
    setSavingPerfil(true);
    setActionError('');
    try {
      const atualizado = await updateProfissionalMe(perfilForm);
      setPerfil(atualizado);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSavingPerfil(false);
    }
  }

  if (loading || !perfil) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        accent="secondary"
        subtitle="Profissional"
        items={[
          { key: 'home', label: 'Home', icon: <HomeIcon /> },
          { key: 'historico', label: 'Minhas candidaturas', icon: <ClockIcon /> },
          { key: 'perfil', label: 'Perfil', icon: <UserIcon /> },
        ]}
        activeKey={tab}
        onSelect={(key) => setTab(key as Tab)}
        footerName={perfil.nome || 'Profissional'}
      />

      <main className="flex-1 overflow-y-auto">
        {vagaSelecionada ? (() => {
          const compat = vagaSelecionada.categoria === perfil.funcao;
          const applied = hasApplied(vagaSelecionada.id);
          const local = localDaVaga(vagaSelecionada);
          return (
            <VagaDetalheView
              vaga={{ clinica: vagaSelecionada.clinica?.nome, categoria: CATEGORIA_LABEL[vagaSelecionada.categoria], local, data: formatDataBR(vagaSelecionada.data), horario: `${vagaSelecionada.horaInicio} - ${vagaSelecionada.horaFim}`, valor: vagaSelecionada.valor, descricao: vagaSelecionada.descricao || undefined }}
              onBack={() => setVagaSelecionada(null)}
              accentClass="text-secondary"
              actionLabel={applied ? 'Candidatura enviada' : compat ? 'Candidatar-se' : 'Perfil incompatível'}
              actionDisabled={applied || !compat || candidatandoId === vagaSelecionada.id}
              actionButtonClass="bg-secondary text-white"
              onAction={() => candidatar(vagaSelecionada)}
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
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1">Vagas disponíveis</h1>
            <p className="text-sm text-gray-500 mb-5">Plantões publicados por clínicas parceiras</p>
            <input value={filtros.busca} onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))} placeholder="Buscar por clínica, categoria ou local..." className="w-full px-3.5 py-3 rounded-lg border border-gray-300 text-sm mb-3" />
            <div className="flex gap-3 flex-wrap mb-4">
              <select value={filtros.categoria} onChange={(e) => setFiltros((f) => ({ ...f, categoria: e.target.value }))} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
                <option value="">Todas categorias</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {regioesTokens.length > 0 && (
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input type="checkbox" checked={filtros.pertoDeMim} onChange={(e) => setFiltros((f) => ({ ...f, pertoDeMim: e.target.checked }))} />
                  Somente perto de mim ({perfil.regioesAtendimento})
                </label>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {feedFiltrado.map((v) => {
                const compat = v.categoria === perfil.funcao;
                const applied = hasApplied(v.id);
                const perto = pertoDeVoce(v);
                const local = localDaVaga(v);
                return (
                  <div
                    key={v.id}
                    onClick={() => setVagaSelecionada(v)}
                    className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-secondary/40 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex gap-2 items-center">
                          <div className="text-xs font-bold text-primary uppercase">{CATEGORIA_LABEL[v.categoria]}</div>
                          {perto && <div className="bg-secondary text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">Perto de você</div>}
                        </div>
                        <div className="text-lg font-extrabold mt-1">{v.clinica?.nome}</div>
                      </div>
                      <div className="bg-green-100 text-green-700 font-extrabold text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">R$ {v.valor}</div>
                    </div>
                    <div className="flex gap-4 flex-wrap mt-3 text-sm text-gray-500">
                      <div>LOCAL {local}</div><div>DATA {formatDataBR(v.data)}</div><div>HORÁRIO {v.horaInicio} - {v.horaFim}</div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button disabled={applied || !compat || candidatandoId === v.id} onClick={(e) => { e.stopPropagation(); candidatar(v); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold ${applied || !compat ? 'border border-gray-300 bg-gray-50 text-gray-400' : 'bg-secondary text-white'}`}>
                        {applied ? 'Candidatura enviada' : compat ? (candidatandoId === v.id ? 'Enviando...' : 'Candidatar-se') : 'Perfil incompatível'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {feedFiltrado.length === 0 && <div className="text-sm text-gray-400">Nenhuma vaga encontrada.</div>}
            </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1">Minhas candidaturas</h1>
            <p className="text-sm text-gray-500 mb-6">Acompanhe o status das vagas que você se candidatou</p>
            <div className="flex flex-col gap-3">
              {candidaturas.map((c) => {
                const badge = statusBadge(c.status.toLowerCase());
                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <div className="text-xs font-bold text-primary uppercase">{c.vaga && CATEGORIA_LABEL[c.vaga.categoria]}</div>
                        <div className="font-extrabold mt-1">{c.vaga?.clinica?.nome}</div>
                        <div className="text-sm text-gray-500 mt-1">DATA {c.vaga && formatDataBR(c.vaga.data)} · R$ {c.vaga?.valor}</div>
                      </div>
                      <div className={badge.className}>{badge.label}</div>
                    </div>
                    {c.status === 'ACEITO' && <AvaliarClinica candidaturaId={c.id} />}
                  </div>
                );
              })}
              {candidaturas.length === 0 && <div className="text-sm text-gray-400">Você ainda não se candidatou a nenhuma vaga.</div>}
            </div>
          </div>
        )}

        {tab === 'perfil' && (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-6">Perfil</h1>
            <div className="bg-white border border-gray-200 rounded-2xl p-7 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Nome</span>
                <input value={perfilForm.nome} onChange={(e) => setPerfilForm((f) => ({ ...f, nome: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">CPF/CNPJ</span>
                <input disabled value={perfil.documento} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Função</span>
                <input disabled value={CATEGORIA_LABEL[perfil.funcao]} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Área de atuação</span>
                <input value={perfilForm.areaAtuacao} onChange={(e) => setPerfilForm((f) => ({ ...f, areaAtuacao: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Regiões de atendimento</span>
                <input value={perfilForm.regioesAtendimento} onChange={(e) => setPerfilForm((f) => ({ ...f, regioesAtendimento: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
              <button onClick={salvarPerfil} disabled={savingPerfil} className="self-start px-5 py-2.5 rounded-lg bg-secondary text-white text-sm font-bold disabled:opacity-60">
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

function AvaliarClinica({ candidaturaId }: { candidaturaId: string }) {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar() {
    setErro('');
    try {
      await criarAvaliacao({ candidaturaId, nota, comentario: comentario || undefined });
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível enviar a avaliação.');
    }
  }

  if (enviado) {
    return <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">Nota {nota}/5{comentario ? ` — "${comentario}"` : ''}</div>;
  }
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="text-xs font-bold mb-2">Avaliar clínica</div>
      <select value={nota} onChange={(e) => setNota(Number(e.target.value))} className="px-2.5 py-1.5 rounded-md border border-gray-300 text-sm mb-2">
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} — {['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][n]}</option>)}
      </select>
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentário (opcional)" rows={2} className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm mb-2" />
      {erro && <div className="text-xs font-semibold text-danger mb-2">{erro}</div>}
      <button onClick={enviar} className="px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-bold">Enviar avaliação</button>
    </div>
  );
}
