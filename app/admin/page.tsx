'use client';
import { useEffect, useState } from 'react';
import { buildEndereco, statusBadge } from '@/lib/mockData';
import { Sidebar } from '@/app/components/Sidebar';
import { GridIcon } from '@/app/components/icons';
import {
  ApiError, getToken, getRole, setSession, clearSession,
  Pagamento, login, listarPagamentos, liberarPagamento,
} from '@/lib/api';

export default function AdminPage() {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    setAutenticado(!!getToken() && getRole() === 'ADMIN');
    setCheckedAuth(true);
  }, []);

  if (!checkedAuth) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Carregando...</div>;
  }

  return autenticado ? <PainelAdmin onSair={() => setAutenticado(false)} /> : <LoginAdmin onEntrar={() => setAutenticado(true)} />;
}

function LoginAdmin({ onEntrar }: { onEntrar: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar() {
    setError('');
    setLoading(true);
    try {
      const { accessToken, role } = await login(email, senha);
      if (role !== 'ADMIN') {
        setError('Esta conta não tem acesso administrativo.');
        return;
      }
      setSession(accessToken, role);
      onEntrar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-7">
        <div className="text-lg font-extrabold mb-1">Acesso administrativo</div>
        <div className="text-sm text-gray-500 mb-6">Entre com sua conta de administrador</div>
        <div className="flex flex-col gap-3.5">
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="E-mail" className="px-3.5 py-3 rounded-lg border border-gray-300 text-sm outline-none" />
          <input type="password" value={senha} onChange={(e) => { setSenha(e.target.value); setError(''); }} placeholder="Senha" className="px-3.5 py-3 rounded-lg border border-gray-300 text-sm outline-none" onKeyDown={(e) => e.key === 'Enter' && entrar()} />
          {error && <div className="text-sm text-danger">{error}</div>}
          <button onClick={entrar} disabled={loading} className="mt-1.5 py-3.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
        <a href="/" className="block text-center mt-5 text-sm font-bold text-gray-500">← Voltar</a>
      </div>
    </div>
  );
}

function PainelAdmin({ onSair }: { onSair: () => void }) {
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setPagamentos(await listarPagamentos());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { clearSession(); onSair(); return; }
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os pagamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function liberar(id: string) {
    setError('');
    try {
      await liberarPagamento(id);
      await carregar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível liberar o pagamento.');
    }
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
          <button onClick={() => { clearSession(); onSair(); }} className="text-sm font-bold text-gray-400 hover:text-danger">Sair</button>
        </div>

        {error && <div className="text-sm font-semibold text-danger bg-red-50 rounded-lg p-3 mb-4">{error}</div>}

        {loading ? (
          <div className="text-sm text-gray-400">Carregando...</div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
