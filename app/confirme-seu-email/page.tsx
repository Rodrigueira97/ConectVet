'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { reenviarConfirmacao, ApiError } from '@/lib/api';
import { MailIcon, ArrowRightIcon } from '@/app/components/icons';
import { useToast } from '@/app/components/Toast';

const COOLDOWN_SEGUNDOS = 60;

function ConfirmeSeuEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const email = searchParams.get('email') || '';

  const [cooldown, setCooldown] = useState(searchParams.get('enviado') === '1' ? COOLDOWN_SEGUNDOS : 0);
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function reenviar() {
    if (!email || cooldown > 0 || reenviando) return;
    setReenviando(true);
    try {
      await reenviarConfirmacao(email);
      toast.success('E-mail reenviado', { message: `Confira a caixa de entrada de ${email}.` });
      setCooldown(COOLDOWN_SEGUNDOS);
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
            <div className="text-sm text-white/85 mt-0.5">Falta pouco para começar a usar a plataforma</div>
          </div>
          <a href="/entrar" className="text-sm font-bold text-white/90 whitespace-nowrap">Já tem conta? Entrar</a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 flex items-center justify-center py-16">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 w-full max-w-md flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primaryTint text-primaryDeep flex items-center justify-center mb-3">
            <MailIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-ink">Confirme seu e-mail</h1>
          <p className="text-sm leading-relaxed text-gray-500 mt-2">
            Enviamos um link de confirmação{email && <> para <span className="font-bold text-ink">{email}</span></>}.
            Clique nele para ativar sua conta e começar a usar a ConectVet.
          </p>

          <div className="w-full h-px bg-gray-100 my-5" />

          <div className="flex items-center gap-2 text-[13.5px] text-gray-500 flex-wrap justify-center">
            <span>Não recebeu o e-mail?</span>
            <button
              onClick={reenviar}
              disabled={!email || cooldown > 0 || reenviando}
              className="font-bold text-primaryDark disabled:text-gray-400 disabled:cursor-not-allowed hover:underline"
            >
              {cooldown > 0
                ? `Reenviar em ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`
                : reenviando ? 'Enviando...' : 'Reenviar e-mail'}
            </button>
          </div>

          <button
            onClick={() => router.push('/cadastro')}
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-500 hover:text-gray-700"
          >
            <ArrowRightIcon className="w-3.5 h-3.5 rotate-180" /> Usei o e-mail errado, voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmeSeuEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmeSeuEmailContent />
    </Suspense>
  );
}
