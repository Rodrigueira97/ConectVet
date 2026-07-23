'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setSession, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Informe um e-mail válido.');
    if (!senha || senha.length < 4) return setError('A senha deve ter ao menos 4 caracteres.');
    setError('');
    setLoading(true);
    try {
      const { accessToken, role: contaRole } = await login(email, senha);
      setSession(accessToken, contaRole);
      const destino = contaRole === 'CLINICA' ? '/clinica' : contaRole === 'PROFISSIONAL' ? '/profissional' : '/admin';
      router.push(destino);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex-[1.1] bg-primary flex flex-col justify-between p-10 md:p-14 text-white">
        <div className="text-2xl font-extrabold">ConectVet</div>
        <div className="max-w-md">
          <div className="text-3xl md:text-4xl font-extrabold leading-tight">
            Conectando clínicas e profissionais veterinários com facilidade, rapidez e segurança.
          </div>
          <div className="mt-5 text-base text-white/90 leading-relaxed">
            Acesse sua conta para publicar vagas, encontrar plantões e gerenciar contratações.
          </div>
        </div>
        <div className="text-sm text-white/70">v0.01 — protótipo de produto</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="text-2xl font-extrabold mb-1">Entrar</div>
          <div className="text-sm text-gray-500 mb-6">Acesse sua conta ConectVet</div>

          <div className="flex flex-col gap-3.5">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="E-mail"
              className="px-3.5 py-3 rounded-lg border border-gray-300 text-sm outline-none"
            />
            <input
              type="password"
              value={senha}
              onChange={(e) => { setSenha(e.target.value); setError(''); }}
              placeholder="Senha"
              className="px-3.5 py-3 rounded-lg border border-gray-300 text-sm outline-none"
              onKeyDown={(e) => e.key === 'Enter' && entrar()}
            />
            {error && <div className="text-sm text-danger">{error}</div>}
            <button
              onClick={entrar}
              disabled={loading}
              className="mt-1.5 py-3.5 rounded-lg bg-primary hover:bg-primaryDark text-white font-bold text-sm disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="text-center mt-5 text-sm text-gray-500">
            Não tem conta? <a href="/cadastro" className="font-bold">Criar conta</a>
          </div>
        </div>
      </div>
    </div>
  );
}
