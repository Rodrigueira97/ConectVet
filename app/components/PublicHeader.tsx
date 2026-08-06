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
    <header className="flex items-center justify-between gap-3 px-5 sm:px-8 py-3.5 bg-white border-b border-gray-100">
      <a href="/" className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
          <img src="/logo.svg" alt="ConectVet" className="w-[70%] h-[70%] object-contain" />
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold font-brand whitespace-nowrap">
            <span className="text-ink">conect</span> <span className="text-primaryDeep">vet</span>
          </div>
        </div>
      </a>

      <nav className="hidden sm:flex items-center gap-5">
        <a href="/" className={`text-[13.5px] font-bold ${pathname === '/' ? 'text-ink' : 'text-gray-500 hover:text-ink'}`}>Home</a>
        <a href="/quem-somos" className={`text-[13.5px] font-bold ${pathname === '/quem-somos' ? 'text-ink' : 'text-gray-500 hover:text-ink'}`}>Quem somos</a>
      </nav>

      {logado ? (
        <a
          href={logado.painel}
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primaryDark text-white text-[13px] font-extrabold px-4 py-2.5 rounded-xl shrink-0"
        >
          Meu painel
        </a>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <a href="/entrar" className="text-[13px] font-extrabold text-ink px-3 py-2.5 rounded-xl hover:bg-gray-50">Entrar</a>
          <a href="/cadastro" className="bg-primary hover:bg-primaryDark text-white text-[13px] font-extrabold px-4 py-2.5 rounded-xl">Criar conta grátis</a>
        </div>
      )}
    </header>
  );
}
