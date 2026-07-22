'use client';
import { useState } from 'react';
import { PAGAMENTOS_MOCK, MINHAS_VAGAS_MOCK, statusBadge } from '@/lib/mockData';
import { Pagamento } from '@/lib/types';
import { Sidebar } from '@/app/components/Sidebar';
import { GridIcon } from '@/app/components/icons';

export default function AdminPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(PAGAMENTOS_MOCK);

  function liberar(mvId: string) {
    setPagamentos((prev) => prev.map((p) => p.mvId !== mvId ? p : { ...p, status: 'liberado' }));
  }

  const enriched = pagamentos.map((p) => {
    const mv = MINHAS_VAGAS_MOCK.find((m) => m.id === p.mvId);
    const bruto = parseFloat(mv?.valor || '0');
    const taxa = bruto * 0.05;
    return { ...p, categoria: mv?.categoria || '', local: mv?.local || '', bruto, taxa, liquido: bruto - taxa };
  });

  const totalRetido = enriched.filter((p) => p.status === 'retido').reduce((s, p) => s + p.liquido, 0);
  const totalLiberado = enriched.filter((p) => p.status === 'liberado').reduce((s, p) => s + p.liquido, 0);
  const totalTaxa = enriched.reduce((s, p) => s + p.taxa, 0);

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
        <h1 className="text-2xl font-extrabold mb-1">Painel administrativo</h1>
        <p className="text-sm text-gray-500 mb-6">Controle dos pagamentos retidos e liberados na plataforma</p>

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
          {enriched.map((p) => {
            const badge = statusBadge(p.status);
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex justify-between items-center gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-primary uppercase">{p.categoria}</div>
                  <div className="font-extrabold mt-1">{p.nome}</div>
                  <div className="text-sm text-gray-500 mt-1">{p.local} · bruto R$ {p.bruto.toFixed(2)} · taxa R$ {p.taxa.toFixed(2)} · repasse R$ {p.liquido.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={badge.className}>{badge.label}</div>
                  {p.status === 'retido' && (
                    <button onClick={() => liberar(p.mvId)} className="px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-bold">Liberar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
