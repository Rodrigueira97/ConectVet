'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { vagaEncerrada } from '@/lib/mockData';
import { PublicHeader } from '@/app/components/PublicHeader';
import { Sidebar } from '@/app/components/Sidebar';
import { PerfilClinicaView } from '@/app/components/PerfilClinica';
import { PerfilClinicaSkeleton } from '@/app/components/skeletons/PerfilClinicaSkeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { HomeIcon, ClockIcon, HeartIcon, UserIcon, PawIcon, PlusIcon, GridIcon, SearchIcon } from '@/app/components/icons';
import {
  AvaliacaoClinica, ClinicaPublica, Clinica, Profissional, Vaga,
  getClinica, getFeed, getUltimasAvaliacoesClinica, getToken, getRole, getClinicaMe, getProfissionalMe,
} from '@/lib/api';

export default function ClinicaPublicaPage() {
  return (
    <Suspense fallback={<PerfilClinicaSkeleton />}>
      <ClinicaPublicaInner />
    </Suspense>
  );
}

// Quando o próprio profissional/clínica logado abre esse perfil (ex.: pelo
// link em Detalhes da vaga), mantém a sidebar do app em vez de trocar pra o
// cabeçalho público — visualmente ele nunca "sai" do painel dele.
//
// `logged` sai do localStorage (síncrono) assim que o componente monta —
// dá pra saber se mostra a sidebar no skeleton sem esperar o perfil
// carregar. `conta` só fica pronta depois do fetch, com nome/foto pro
// rodapé da sidebar de verdade.
function useContaLogada() {
  const [logged, setLogged] = useState<boolean | undefined>(undefined);
  const [conta, setConta] = useState<
    { role: 'PROFISSIONAL'; perfil: Profissional } | { role: 'CLINICA'; perfil: Clinica } | null
  >(null);

  useEffect(() => {
    let cancelado = false;
    const token = getToken();
    setLogged(!!token);
    if (!token) return;
    const role = getRole();
    const promessa = role === 'CLINICA' ? getClinicaMe() : getProfissionalMe();
    promessa
      .then((perfil) => {
        if (cancelado) return;
        setConta(role === 'CLINICA' ? { role: 'CLINICA', perfil: perfil as Clinica } : { role: 'PROFISSIONAL', perfil: perfil as Profissional });
      })
      .catch(() => { if (!cancelado) setLogged(false); });
    return () => { cancelado = true; };
  }, []);

  return { logged, conta };
}

function ClinicaPublicaInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clinicaId = params.id;
  const { logged, conta } = useContaLogada();

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

  if (loading || logged === undefined || (logged && !conta)) {
    return <PerfilClinicaSkeleton sidebar={logged === true} />;
  }

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

  if (conta) {
    const isClinica = conta.role === 'CLINICA';
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          accent="primary"
          subtitle={isClinica ? 'Clínica' : 'Profissional'}
          items={
            isClinica
              ? [
                  { key: 'home', label: 'Home', icon: <HomeIcon /> },
                  { key: 'criar-vaga', label: 'Criar vaga', icon: <PlusIcon /> },
                  { key: 'painel', label: 'Painel', icon: <GridIcon /> },
                  { key: 'perfil', label: 'Perfil', icon: <UserIcon /> },
                  { key: 'quem-somos', label: 'Quem somos', icon: <PawIcon className="w-[18px] h-4" /> },
                ]
              : [
                  { key: 'home', label: 'Home', icon: <HomeIcon /> },
                  { key: 'historico', label: 'Minhas candidaturas', icon: <ClockIcon /> },
                  { key: 'favoritas', label: 'Favoritas', icon: <HeartIcon /> },
                  { key: 'perfil', label: 'Perfil', icon: <UserIcon /> },
                  { key: 'quem-somos', label: 'Quem somos', icon: <PawIcon className="w-[18px] h-4" /> },
                ]
          }
          activeKey=""
          onSelect={(key) => router.push(`${isClinica ? '/clinica' : '/profissional'}?tab=${key}`)}
          footerName={conta.perfil.nome || (isClinica ? 'Clínica' : 'Profissional')}
          footerSubtitle={isClinica ? 'Conta clínica' : 'Conta profissional'}
          footerPhotoUrl={isClinica ? (conta.perfil as Clinica).logoUrl : (conta.perfil as Profissional).fotoUrl}
          footerIcon={isClinica ? 'building' : 'person'}
        />
        <main className="flex-1 overflow-y-auto bg-paws">
          <PerfilClinicaView
            clinica={clinica}
            totalVagas={vagas.length}
            vagasAbertas={vagasAbertas}
            avaliacoes={avaliacoes}
            onBack={() => router.back()}
          />
        </main>
      </div>
    );
  }

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
