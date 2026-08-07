'use client';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/app/components/Sidebar';
import { HomeIcon, ClockIcon, HeartIcon, UserIcon, PawIcon, PlusIcon, GridIcon } from '@/app/components/icons';
import { Clinica, Profissional } from '@/lib/api';

// Sidebar do app (clínica ou profissional) reaproveitada em páginas
// públicas — perfil de clínica, detalhes de vaga — abertas por quem já
// está logado, pra ele nunca "sair" do painel dele. Ver useContaLogada.
export function ContaSidebar({
  conta,
}: {
  conta: { role: 'PROFISSIONAL'; perfil: Profissional } | { role: 'CLINICA'; perfil: Clinica };
}) {
  const router = useRouter();
  const isClinica = conta.role === 'CLINICA';

  return (
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
  );
}
