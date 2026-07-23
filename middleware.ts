import { NextRequest, NextResponse } from 'next/server';

type Role = 'CLINICA' | 'PROFISSIONAL' | 'ADMIN';

const TOKEN_COOKIE = 'conectvet_token';
const ROLE_COOKIE = 'conectvet_role';

// Rotas do "próprio" painel de cada papel — acesso exige sessão válida com esse papel.
const ROTA_POR_ROLE: Record<Role, string> = {
  CLINICA: '/clinica',
  PROFISSIONAL: '/profissional',
  ADMIN: '/admin',
};

function decodeJwtExpSeconds(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

function getSessao(request: NextRequest): { token: string; role: Role } | null {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const role = request.cookies.get(ROLE_COOKIE)?.value as Role | undefined;
  if (!token || !role || !(role in ROTA_POR_ROLE)) return null;

  const exp = decodeJwtExpSeconds(token);
  if (!exp || exp * 1000 < Date.now()) return null;

  return { token, role };
}

function redirecionarPara(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessao = getSessao(request);

  // Já logado: não pode ver a tela de login — manda para o painel do seu papel.
  if (pathname === '/') {
    if (sessao) return redirecionarPara(request, ROTA_POR_ROLE[sessao.role]);
    return NextResponse.next();
  }

  // Deslogado: não pode acessar nenhuma área da plataforma.
  if (!sessao) {
    return redirecionarPara(request, '/');
  }

  // Logado, mas tentando acessar o painel de outro papel — manda para o dele.
  if (pathname.startsWith('/clinica') && sessao.role !== 'CLINICA') {
    return redirecionarPara(request, ROTA_POR_ROLE[sessao.role]);
  }
  if (pathname.startsWith('/profissional') && sessao.role !== 'PROFISSIONAL') {
    return redirecionarPara(request, ROTA_POR_ROLE[sessao.role]);
  }
  if (pathname.startsWith('/admin') && sessao.role !== 'ADMIN') {
    return redirecionarPara(request, ROTA_POR_ROLE[sessao.role]);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/clinica/:path*', '/profissional/:path*', '/admin/:path*'],
};
