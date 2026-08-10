'use client';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '@/app/components/PublicHeader';
import { PublicFooter } from '@/app/components/PublicFooter';
import { QuemSomosView } from '@/app/components/QuemSomos';

// Versão pública da mesma aba que já existe dentro dos painéis logados
// (app/profissional e app/clinica) — sem motivo pra esconder missão e
// história de quem ainda não tem conta.
export default function QuemSomosPublico() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-paws">
      <PublicHeader />
      <QuemSomosView ctaLabel="Ver vagas disponíveis" onCta={() => router.push('/vagas')} />
      <PublicFooter />
    </div>
  );
}
