'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { vagaEncerrada } from '@/lib/mockData';
import { PublicHeader } from '@/app/components/PublicHeader';
import { PerfilClinicaView } from '@/app/components/PerfilClinica';
import { CardSkeleton } from '@/app/components/skeletons/CardSkeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { SearchIcon } from '@/app/components/icons';
import {
  AvaliacaoClinica, ClinicaPublica, Vaga,
  getClinica, getFeed, getUltimasAvaliacoesClinica,
} from '@/lib/api';

export default function ClinicaPublicaPage() {
  return (
    <Suspense fallback={<ClinicaPublicaSkeleton />}>
      <ClinicaPublicaInner />
    </Suspense>
  );
}

function ClinicaPublicaSkeleton() {
  return (
    <div className="min-h-screen bg-paws">
      <div className="bg-white h-[62px]" />
      <div className="max-w-[720px] mx-auto p-8"><CardSkeleton /></div>
    </div>
  );
}

function ClinicaPublicaInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clinicaId = params.id;

  const [clinica, setClinica] = useState<ClinicaPublica | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoClinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(false);
    Promise.all([
      getClinica(clinicaId),
      getFeed({ clinicaId }),
      getUltimasAvaliacoesClinica(clinicaId),
    ])
      .then(([c, v, a]) => {
        if (cancelado) return;
        setClinica(c);
        setVagas(v);
        setAvaliacoes(a);
      })
      .catch(() => { if (!cancelado) setErro(true); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [clinicaId]);

  if (loading) return <ClinicaPublicaSkeleton />;

  if (erro || !clinica) {
    return (
      <div className="min-h-screen bg-paws">
        <PublicHeader />
        <div className="max-w-[720px] mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-sm p-10">
            <EmptyState
              icon={<SearchIcon className="w-6 h-6" />}
              title="Clínica não encontrada"
              description="Esse perfil pode ter sido removido, ou o link que você seguiu está incorreto."
              actionLabel="Ver vagas disponíveis"
              onAction={() => router.push('/')}
            />
          </div>
        </div>
      </div>
    );
  }

  const vagasAbertas = vagas.filter((v) => !vagaEncerrada(v));

  return (
    <div className="min-h-screen bg-paws">
      <PublicHeader />
      <PerfilClinicaView
        clinica={clinica}
        totalVagas={vagas.length}
        vagasAbertas={vagasAbertas}
        avaliacoes={avaliacoes}
        onBack={() => router.back()}
      />
    </div>
  );
}
