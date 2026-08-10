'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getRole, getToken } from '@/lib/api';

// Cabeçalho das páginas públicas (home, detalhe de vaga, quem somos) — sem
// sidebar, porque quem ainda não tem conta não tem "Minhas candidaturas" nem
// "Perfil" pra navegar. Detecta sessão só depois de montar (localStorage não
// existe no server) pra não gerar mismatch de hidratação.
export function PublicHeader() {
  const pathname = usePathname();
  const [logado, setLogado] = useState<{ painel: string } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const role = getRole();
    const painel = role === 'CLINICA' ? '/clinica' : role === 'ADMIN' ? '/admin' : '/profissional';
    setLogado({ painel });
  }, []);

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-8 py-2.5 sm:py-3 bg-white border-b border-gray-100">
      <a href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
          <img src="/logo.svg" alt="ConectVet" className="w-[70%] h-[70%] object-contain" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[17px] sm:text-[19px] font-bold font-brand whitespace-nowrap">
            <span className="text-ink">conect</span> <span className="text-primaryDeep">vet</span>
          </div>
        </div>
      </a>

      <nav className="hidden sm:flex items-center gap-5">
        <a href="/" className={`text-[13.5px] font-bold ${pathname === '/' ? 'text-ink' : 'text-gray-500 hover:text-ink'}`}>Home</a>
        <a href="/vagas" className={`text-[13.5px] font-bold ${pathname === '/vagas' ? 'text-ink' : 'text-gray-500 hover:text-ink'}`}>Vagas</a>
        <a href="/quem-somos" className={`text-[13.5px] font-bold ${pathname === '/quem-somos' ? 'text-ink' : 'text-gray-500 hover:text-ink'}`}>Quem somos</a>
      </nav>

      {logado ? (
        <a
          href={logado.painel}
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primaryDark text-white text-[12.5px] sm:text-[13px] font-extrabold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shrink-0 whitespace-nowrap"
        >
          Meu painel
        </a>
      ) : (
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <a href="/entrar" className="text-[12.5px] sm:text-[13px] font-extrabold text-ink px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl hover:bg-gray-50 whitespace-nowrap">Entrar</a>
          <a href="/cadastro" className="bg-primary hover:bg-primaryDark text-white text-[12.5px] sm:text-[13px] font-extrabold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl whitespace-nowrap">
            <span className="sm:hidden">Criar conta</span>
            <span className="hidden sm:inline">Criar conta grátis</span>
          </a>
        </div>
      )}
    </header>
  );
}
