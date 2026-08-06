'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setSession, ApiError } from '@/lib/api';
import { BuildingIcon, CloseIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, WarningIcon } from '@/app/components/icons';

export type LoginGateVaga = {
  id: string;
  clinicaNome?: string;
  clinicaLogoUrl?: string | null;
  resumo: string; // ex.: "Veterinário clínico · Qui, 06/08 · 08:00–18:00"
};

// Aparece quando um visitante sem conta clica em "Candidatar-se". Fica por
// cima da própria página da vaga (não navega pra lugar nenhum) — "Criar
// conta" manda pro formulário completo (longo demais pra caber aqui), mas
// "Entrar" é leve o bastante pra resolver sem sair da tela: login aqui dentro
// já candidata na hora (ver onLoginSuccess, chamado pelo componente pai).
export function LoginGate({
  vaga, onClose, onLoginSuccess,
}: {
  vaga: LoginGateVaga;
  onClose: () => void;
  onLoginSuccess: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'criar' | 'entrar'>('criar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  function irParaCadastro() {
    router.push(`/cadastro?role=profissional&next=${encodeURIComponent(`/vagas/${vaga.id}`)}`);
  }

  async function entrar() {
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Informe um e-mail válido.');
    if (!senha || senha.length < 4) return setError('A senha deve ter ao menos 4 caracteres.');
    setError('');
    setLoading(true);
    try {
      const { accessToken, role } = await login(email, senha);
      setSession(accessToken, role);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(4,20,25,0.55)] flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Pra continuar</span>
          <button onClick={onClose} aria-label="Fechar" className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200">
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-300 flex items-center justify-center shrink-0 overflow-hidden">
            {vaga.clinicaLogoUrl ? (
              <img src={vaga.clinicaLogoUrl} alt={vaga.clinicaNome} className="w-full h-full object-cover" />
            ) : (
              <BuildingIcon className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-extrabold text-ink truncate">{vaga.clinicaNome}</div>
            <div className="text-[11px] font-semibold text-gray-400 truncate">{vaga.resumo}</div>
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-full p-[3px] mb-4">
          <button
            onClick={() => setTab('criar')}
            className={`flex-1 text-center text-[12.5px] font-extrabold py-2 rounded-full ${tab === 'criar' ? 'bg-white text-primaryDeep shadow-sm' : 'text-gray-500'}`}
          >
            Criar conta
          </button>
          <button
            onClick={() => setTab('entrar')}
            className={`flex-1 text-center text-[12.5px] font-extrabold py-2 rounded-full ${tab === 'entrar' ? 'bg-white text-primaryDeep shadow-sm' : 'text-gray-500'}`}
          >
            Entrar
          </button>
        </div>

        {tab === 'criar' ? (
          <>
            <div className="text-[19px] font-extrabold text-ink text-center mb-1.5">Crie sua conta pra se candidatar</div>
            <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-4">
              Guardamos essa vaga — você volta direto pra cá assim que terminar.
            </p>
            <p className="text-[13px] text-gray-600 text-center leading-relaxed mb-4">
              Leva poucos minutos. Você vai precisar do CRMV (ou comprovante de matrícula, se ainda for estudante).
            </p>
            <button
              onClick={irParaCadastro}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primaryDark text-white text-[13.5px] font-extrabold"
            >
              Criar conta grátis →
            </button>
            <div className="text-center text-[12.5px] text-gray-500 mt-3">
              Já tem conta? <button onClick={() => setTab('entrar')} className="font-extrabold text-primaryDeep">Entrar</button>
            </div>
          </>
        ) : (
          <>
            <div className="text-[19px] font-extrabold text-ink text-center mb-1.5">Entre pra se candidatar</div>
            <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-4">
              Guardamos essa vaga — você volta direto pra cá assim que entrar.
            </p>

            {error && (
              <div className="flex items-start gap-1.5 text-[12.5px] font-semibold text-danger bg-red-50 rounded-lg px-2.5 py-2 mb-3">
                <WarningIcon className="w-[14px] h-[14px] shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

            <label className="flex flex-col gap-1.5 mb-3">
              <span className="text-[12px] font-bold text-ink">E-mail</span>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && entrar()}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-[13.5px] outline-none focus:border-primary focus:ring-4 focus:ring-primaryTint"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5 mb-1">
              <span className="text-[12px] font-bold text-ink">Senha</span>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && entrar()}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-200 text-[13.5px] outline-none focus:border-primary focus:ring-4 focus:ring-primaryTint"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100"
                >
                  {showSenha ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <button
              onClick={entrar}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 mt-3 py-3 rounded-xl bg-primary hover:bg-primaryDark text-white text-[13.5px] font-extrabold disabled:opacity-65"
            >
              {loading && <span className="w-[14px] h-[14px] rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar e candidatar-se'}
            </button>
            <div className="text-center text-[12.5px] text-gray-500 mt-3">
              Ainda não tem conta? <button onClick={() => setTab('criar')} className="font-extrabold text-primaryDeep">Criar conta</button>
            </div>
            <p className="text-[11px] text-gray-400 text-center leading-relaxed mt-3">
              Ao continuar, sua candidatura pra essa vaga é enviada automaticamente.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
