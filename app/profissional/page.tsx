'use client';
import { useMemo, useState } from 'react';
import { FEED_MOCK, CANDIDATURAS_MOCK, CATEGORIAS, statusBadge } from '@/lib/mockData';
import { Candidatura, Avaliacao } from '@/lib/types';
import { Sidebar } from '@/app/components/Sidebar';
import { HomeIcon, ClockIcon, UserIcon } from '@/app/components/icons';
import { VagaDetalheView } from '@/app/components/VagaDetalhe';

type Tab = 'home' | 'historico' | 'perfil';

export default function ProfissionalPage() {
  const [tab, setTab] = useState<Tab>('home');
  const [perfil, setPerfil] = useState({ nome: '', doc: '', funcao: '', area: '', regioes: 'Pinheiros, Zona Oeste - SP' });
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>(CANDIDATURAS_MOCK);
  const [avaliacoesClinica, setAvaliacoesClinica] = useState<Record<string, Avaliacao>>({});
  const [filtros, setFiltros] = useState({ busca: '', categoria: '', pertoDeMim: false });
  const [vagaSelecionada, setVagaSelecionada] = useState<typeof FEED_MOCK[0] | null>(null);

  function hasApplied(v: typeof FEED_MOCK[0]) {
    return candidaturas.some((c) => c.clinica === v.clinica && c.categoria === v.categoria && c.data === v.data);
  }
  function candidatar(v: typeof FEED_MOCK[0]) {
    if (hasApplied(v)) return;
    setCandidaturas((prev) => [{ id: 'c' + Date.now(), clinica: v.clinica, categoria: v.categoria, valor: v.valor, data: v.data, horario: v.horario, status: 'pendente' }, ...prev]);
  }

  const regioesTokens = perfil.regioes.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  function pertoDeVoce(local: string) {
    if (!regioesTokens.length) return false;
    return regioesTokens.some((t) => local.toLowerCase().includes(t));
  }

  const feedFiltrado = FEED_MOCK.filter((v) => {
    const compat = !perfil.funcao || v.categoria === perfil.funcao;
    if (filtros.categoria && v.categoria !== filtros.categoria) return false;
    if (filtros.busca && !`${v.clinica} ${v.categoria} ${v.local}`.toLowerCase().includes(filtros.busca.toLowerCase())) return false;
    if (filtros.pertoDeMim && !pertoDeVoce(v.local)) return false;
    return compat || true; // incompatíveis ainda aparecem, mas com botão desabilitado
  });

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
          const compat = !perfil.funcao || vagaSelecionada.categoria === perfil.funcao;
          const applied = hasApplied(vagaSelecionada);
          return (
            <VagaDetalheView
              vaga={vagaSelecionada}
              onBack={() => setVagaSelecionada(null)}
              accentClass="text-secondary"
              actionLabel={applied ? 'Candidatura enviada' : compat ? 'Candidatar-se' : 'Perfil incompatível'}
              actionDisabled={applied || !compat}
              actionButtonClass="bg-secondary text-white"
              onAction={() => candidatar(vagaSelecionada)}
            />
          );
        })() : (
        <>
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
                  Somente perto de mim ({perfil.regioes})
                </label>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {feedFiltrado.map((v, i) => {
                const compat = !perfil.funcao || v.categoria === perfil.funcao;
                const applied = hasApplied(v);
                const perto = pertoDeVoce(v.local);
                return (
                  <div
                    key={i}
                    onClick={() => setVagaSelecionada(v)}
                    className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-secondary/40 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex gap-2 items-center">
                          <div className="text-xs font-bold text-primary uppercase">{v.categoria} · {v.turno}</div>
                          {perto && <div className="bg-secondary text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">Perto de você</div>}
                        </div>
                        <div className="text-lg font-extrabold mt-1">{v.clinica}</div>
                      </div>
                      <div className="bg-green-100 text-green-700 font-extrabold text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">R$ {v.valor}</div>
                    </div>
                    <div className="flex gap-4 flex-wrap mt-3 text-sm text-gray-500">
                      <div>LOCAL {v.local}</div><div>DATA {v.data}</div><div>HORÁRIO {v.horario}</div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button disabled={applied || !compat} onClick={(e) => { e.stopPropagation(); candidatar(v); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold ${applied || !compat ? 'border border-gray-300 bg-gray-50 text-gray-400' : 'bg-secondary text-white'}`}>
                        {applied ? 'Candidatura enviada' : compat ? 'Candidatar-se' : 'Perfil incompatível'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1">Minhas candidaturas</h1>
            <p className="text-sm text-gray-500 mb-6">Acompanhe o status das vagas que você se candidatou</p>
            <div className="flex flex-col gap-3">
              {candidaturas.map((c) => {
                const badge = statusBadge(c.status);
                const done = avaliacoesClinica[c.id];
                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <div className="text-xs font-bold text-primary uppercase">{c.categoria}</div>
                        <div className="font-extrabold mt-1">{c.clinica}</div>
                        <div className="text-sm text-gray-500 mt-1">DATA {c.data} · R$ {c.valor}</div>
                      </div>
                      <div className={badge.className}>{badge.label}</div>
                    </div>
                    {c.status === 'aceito' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-xs font-bold mb-2">Avaliar clínica</div>
                        {done ? (
                          <div className="text-sm text-gray-600">Nota {done.nota}/5 — "{done.comentario}"</div>
                        ) : (
                          <RatingForm onSubmit={(nota, comentario) => setAvaliacoesClinica((prev) => ({ ...prev, [c.id]: { nota, comentario } }))} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'perfil' && (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-6">Perfil</h1>
            <div className="bg-white border border-gray-200 rounded-2xl p-7 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Nome</span>
                <input value={perfil.nome} onChange={(e) => setPerfil((f) => ({ ...f, nome: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">CPF/CNPJ</span>
                <input maxLength={18} value={perfil.doc} onChange={(e) => setPerfil((f) => ({ ...f, doc: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Função</span>
                <select value={perfil.funcao} onChange={(e) => setPerfil((f) => ({ ...f, funcao: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
                  <option value="">Selecione...</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></label>
              <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Regiões de atendimento</span>
                <input value={perfil.regioes} onChange={(e) => setPerfil((f) => ({ ...f, regioes: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" /></label>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

function RatingForm({ onSubmit }: { onSubmit: (nota: number, comentario: string) => void }) {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  return (
    <div>
      <select value={nota} onChange={(e) => setNota(Number(e.target.value))} className="px-2.5 py-1.5 rounded-md border border-gray-300 text-sm mb-2">
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} — {['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][n]}</option>)}
      </select>
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentário (opcional)" rows={2} className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm mb-2" />
      <button onClick={() => onSubmit(nota, comentario)} className="px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-bold">Enviar avaliação</button>
    </div>
  );
}
