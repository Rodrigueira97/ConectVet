'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmarEmail, reenviarConfirmacao, ApiError } from '@/lib/api';
import { CheckCircleIcon, WarningIcon } from '@/app/components/icons';
import { PawTrailLoader } from '@/app/components/PawTrailLoader';
import { useToast } from '@/app/components/Toast';

type Estado = 'carregando' | 'sucesso' | 'erro';

function ConfirmarEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const token = searchParams.get('token') || '';

  const [estado, setEstado] = useState<Estado>('carregando');
  const [erro, setErro] = useState('');
  const [emailReenvio, setEmailReenvio] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  useEffect(() => {
    if (!token) {
      setErro('Link de confirmação inválido.');
      setEstado('erro');
      return;
    }
    confirmarEmail(token)
      .then(() => setEstado('sucesso'))
      .catch((err) => {
        setErro(err instanceof ApiError ? err.message : 'Não foi possível confirmar seu e-mail.');
        setEstado('erro');
      });
  }, [token]);

  async function reenviar() {
    if (!/\S+@\S+\.\S+/.test(emailReenvio) || reenviando) return;
    setReenviando(true);
    try {
      await reenviarConfirmacao(emailReenvio);
      setReenviado(true);
    } catch (err) {
      toast.error('Não foi possível reenviar', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary text-white px-6 py-6 md:px-10 md:py-8 bg-paws-header">
        <div className="max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/" className="text-xl font-extrabold">
              <span className="text-ink">conect</span> <span className="text-[#003531]">vet</span>
            </a>
          </div>
          <a href="/entrar" className="text-sm font-bold text-white/90 whitespace-nowrap">Já tem conta? Entrar</a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 flex items-center justify-center py-16">
        {estado === 'carregando' && <PawTrailLoader label="Confirmando seu e-mail..." />}

        {estado === 'sucesso' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 w-full max-w-md flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-primaryTint text-primaryDeep flex items-center justify-center mb-3">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-ink">E-mail confirmado!</h1>
            <p className="text-sm leading-relaxed text-gray-500 mt-2">
              Sua conta foi ativada com sucesso. Agora você já pode acessar a ConectVet.
            </p>
            <button
              onClick={() => router.push('/entrar')}
              className="w-full mt-5 py-3 rounded-lg bg-primary hover:bg-primaryDark text-white font-bold text-sm"
            >
              Entrar na minha conta
            </button>
          </div>
        )}

        {estado === 'erro' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 w-full max-w-md flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-danger flex items-center justify-center mb-3">
              <WarningIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-ink">Não foi possível confirmar</h1>
            <p className="text-sm leading-relaxed text-gray-500 mt-2">{erro}</p>

            <div className="w-full h-px bg-gray-100 my-5" />

            {reenviado ? (
              <p className="text-sm font-semibold text-primaryDeep">Enviamos um novo link para {emailReenvio}. Confira sua caixa de entrada.</p>
            ) : (
              <>
                <p className="text-[13px] text-gray-500 mb-3">Informe seu e-mail para receber um novo link de confirmação.</p>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <input
                    type="email"
                    value={emailReenvio}
                    onChange={(e) => setEmailReenvio(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && reenviar()}
                    placeholder="voce@email.com"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primaryTint"
                  />
                  <button
                    onClick={reenviar}
                    disabled={reenviando}
                    className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primaryDark text-white font-bold text-sm disabled:opacity-60 whitespace-nowrap"
                  >
                    {reenviando ? 'Enviando...' : 'Reenviar link'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarEmailContent />
    </Suspense>
  );
}
