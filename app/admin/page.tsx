'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildEndereco, statusBadge } from '@/lib/mockData';
import { Sidebar } from '@/app/components/Sidebar';
import { GridIcon } from '@/app/components/icons';
import { AdminPageSkeleton } from '@/app/components/skeletons/AdminPageSkeleton';
import {
  ApiError, getToken, clearSession,
  Pagamento, listarPagamentos, liberarPagamento,
} from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setPagamentos(await listarPagamentos());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { clearSession(); router.push('/'); return; }
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os pagamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) { router.push('/'); return; }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function liberar(id: string) {
    setError('');
    try {
      await liberarPagamento(id);
      await carregar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível liberar o pagamento.');
    }
  }

  if (loading) {
    return <AdminPageSkeleton />;
  }

  const totalRetido = pagamentos.filter((p) => p.status === 'RETIDO').reduce((s, p) => s + Number(p.valorLiquido), 0);
  const totalLiberado = pagamentos.filter((p) => p.status === 'LIBERADO').reduce((s, p) => s + Number(p.valorLiquido), 0);
  const totalTaxa = pagamentos.reduce((s, p) => s + Number(p.taxa), 0);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        accent="neutral"
        subtitle="Administrador"
        items={[{ key: 'painel', label: 'Painel administrativo', icon: <GridIcon /> }]}
        activeKey="painel"
        onSelect={() => {}}
      />

      <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold mb-1">Painel administrativo</h1>
            <p className="text-sm text-gray-500 mb-6">Controle dos pagamentos retidos e liberados na plataforma</p>
          </div>
          <button onClick={() => { clearSession(); router.push('/'); }} className="text-sm font-bold text-gray-400 hover:text-danger">Sair</button>
        </div>

        {error && <div className="text-sm font-semibold text-danger bg-red-50 rounded-lg p-3 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-xs font-bold text-gray-500">Retido com a plataforma</div>
            <div className="text-xl font-extrabold mt-1.5">R$ {totalRetido.toFixed(2)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-xs font-bold text-gray-500">Já liberado a profissionais</div>
            <div className="text-xl font-extrabold mt-1.5">R$ {totalLiberado.toFixed(2)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-xs font-bold text-gray-500">Taxa arrecadada (5%)</div>
            <div className="text-xl font-extrabold mt-1.5">R$ {totalTaxa.toFixed(2)}</div>
          </div>
        </div>

        <div className="text-sm font-bold text-gray-500 mb-3">Pagamentos</div>
        <div className="flex flex-col gap-3">
          {pagamentos.map((p) => {
            const badge = statusBadge(p.status.toLowerCase());
            const local = p.vaga ? buildEndereco(p.vaga) : '';
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex justify-between items-center gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-primary uppercase">{p.vaga?.categoria}</div>
                  <div className="font-extrabold mt-1">{p.candidatura?.profissional.nome}</div>
                  <div className="text-sm text-gray-500 mt-1">{local} · bruto R$ {Number(p.valorBruto).toFixed(2)} · taxa R$ {Number(p.taxa).toFixed(2)} · repasse R$ {Number(p.valorLiquido).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={badge.className}>{badge.label}</div>
                  {p.status === 'RETIDO' && (
                    <button onClick={() => liberar(p.id)} className="px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-bold">Liberar</button>
                  )}
                </div>
              </div>
            );
          })}
          {pagamentos.length === 0 && <div className="text-sm text-gray-400">Nenhum pagamento ainda.</div>}
        </div>
      </main>
    </div>
  );
}
