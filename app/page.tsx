'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setSession, ApiError } from '@/lib/api';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, WarningIcon } from '@/app/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
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
      {/* Painel de marca */}
      <div
        className="bg-paws relative overflow-hidden text-white flex flex-col items-center justify-center text-center
                   rounded-b-[32px] px-5 pt-8 pb-14 min-h-[46vh]
                   md:min-h-0 md:rounded-none md:flex-[1.05] md:p-12 md:items-stretch md:text-left md:justify-start"
      >
        <div className="login-brand-inner relative z-10 w-full max-w-[460px] mx-auto flex flex-col gap-4 flex-none items-center
                         md:h-full md:max-w-[460px] md:min-[1600px]:max-w-[520px] md:items-start md:flex-1 md:gap-0">
          <div className="login-copy-group flex flex-col gap-4 items-center md:items-start md:gap-[26px]">
            <div className="flex flex-col items-center gap-4 md:items-start md:gap-3.5">
              <div className="w-[136px] h-[136px] md:w-[68px] md:h-[68px] md:min-[1600px]:w-20 md:min-[1600px]:h-20 shrink-0 flex items-center justify-center">
                <img
                  src="/logo.svg"
                  alt="ConectVet"
                  className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(4,45,76,0.35)] md:drop-shadow-none"
                />
              </div>
              <div className="text-[40px] md:text-[30px] md:min-[1600px]:text-[34px] font-extrabold tracking-tight font-brand">
                <span className="text-ink">conect</span> <span className="text-[#83F9E8]">vet</span>
              </div>
            </div>
            <div className="hidden md:block text-[36px] md:min-[1600px]:text-[42px] font-extrabold leading-[1.28] text-balance max-w-[460px] md:min-[1600px]:max-w-[500px]">
              Conectando clínicas e profissionais veterinários com facilidade, rapidez e segurança.
            </div>
            <div className="hidden md:block text-[16.5px] md:min-[1600px]:text-lg text-white/90 leading-relaxed max-w-[400px] md:min-[1600px]:max-w-[440px]">
              Acesse sua conta para publicar vagas, encontrar plantões e gerenciar contratações.
            </div>
          </div>
          <div className="hidden md:block text-xs text-white/65 mt-auto">v0.01 — protótipo de produto</div>
        </div>
      </div>

      {/* Painel do formulário */}
      <div
        className="relative flex-1 flex items-start justify-center bg-white rounded-t-3xl -mt-7 px-5 pt-8 pb-10
                   md:mt-0 md:bg-transparent md:rounded-none md:items-center md:px-8 md:py-12"
      >
        <div className="w-full max-w-[380px] md:min-[1600px]:max-w-[420px]">
          <div className="text-[22px] md:min-[1600px]:text-2xl font-extrabold mb-1">Entrar</div>
          <div className="text-[13.5px] md:min-[1600px]:text-sm text-gray-500 mb-6">Acesse sua conta ConectVet</div>

          {error && (
            <div className="flex items-start gap-1.5 text-[13px] font-semibold text-danger bg-red-50 rounded-lg px-2.5 py-2 mb-3.5">
              <WarningIcon className="w-[15px] h-[15px] shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <label className="flex flex-col gap-1.5 mb-3.5">
            <span className="text-[13px] font-bold">E-mail</span>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A39D] pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && entrar()}
                placeholder="voce@email.com"
                autoComplete="email"
                className="w-full pl-[38px] pr-3 py-[11px] rounded-[10px] border border-gray-200 text-sm outline-none
                           focus:border-primary focus:ring-4 focus:ring-primaryTint"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 mb-3.5">
            <span className="text-[13px] font-bold">Senha</span>
            <div className="relative">
              <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A39D] pointer-events-none" />
              <input
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && entrar()}
                placeholder="Sua senha"
                autoComplete="current-password"
                className="w-full pl-[38px] pr-[38px] py-[11px] rounded-[10px] border border-gray-200 text-sm outline-none
                           focus:border-primary focus:ring-4 focus:ring-primaryTint"
              />
              <button
                type="button"
                onClick={() => setShowSenha((v) => !v)}
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-md flex items-center justify-center
                           text-[#97A39D] hover:bg-gray-100 hover:text-gray-500"
              >
                {showSenha ? <EyeOffIcon className="w-[17px] h-[17px]" /> : <EyeIcon className="w-[17px] h-[17px]" />}
              </button>
            </div>
          </label>

          <button
            onClick={entrar}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-1.5 py-[13px] rounded-[11px] bg-primary hover:bg-primaryDark
                       text-white font-extrabold text-[14.5px] disabled:opacity-65"
          >
            {loading && (
              <span className="w-[15px] h-[15px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="text-center mt-5 text-[13.5px] text-gray-500">
            Não tem conta? <a href="/cadastro" className="font-bold hover:underline">Criar conta</a>
          </div>
        </div>
      </div>
    </div>
  );
}
