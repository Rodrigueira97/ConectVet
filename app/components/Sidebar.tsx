'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { BuildingIcon, ChevronLeftIcon, CloseIcon, LockIcon, LogoutIcon, MenuIcon, UserIcon } from './icons';
import { clearSession } from '@/lib/api';
import { AlterarSenhaModal } from './AlterarSenhaModal';

export type SidebarItem = {
  key: string;
  label: string;
  icon: ReactNode;
  count?: number;
};

type Accent = 'primary' | 'neutral';

const ACCENT: Record<Accent, { active: string; icon: string; count: string }> = {
  primary: { active: 'bg-primaryTint text-primaryDeep', icon: 'text-primaryDeep', count: 'bg-primary text-white' },
  neutral: { active: 'bg-gray-100 text-gray-900', icon: 'text-gray-700', count: 'bg-gray-900 text-white' },
};

const COLLAPSE_KEY = 'conectvet_sidebar_collapsed';

export function Sidebar({
  accent, subtitle, items, activeKey, onSelect, footerName, footerSubtitle, footerPhotoUrl, footerIcon = 'person',
}: {
  accent: Accent;
  subtitle: string;
  items: SidebarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  footerName?: string;
  footerSubtitle?: string;
  footerPhotoUrl?: string | null;
  footerIcon?: 'person' | 'building';
}) {
  const c = ACCENT[accent];
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const temPerfil = items.some((item) => item.key === 'perfil');

  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
  }, []);

  // Menu de "Ver perfil" / "Sair" que abre a partir do rodapé — mesmo padrão de
  // clique-fora do NotificationBell, só que ancorado pra cima (o rodapé fica na base da tela).
  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickFora);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickFora);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  function handleSelect(key: string) {
    onSelect(key);
    setOpen(false);
  }

  const FooterIcon = footerIcon === 'building' ? BuildingIcon : UserIcon;

  function renderNavItem(item: SidebarItem, onClick: () => void, hideLabel: boolean) {
    const active = item.key === activeKey;
    return (
      <button
        key={item.key}
        onClick={onClick}
        className={`relative flex items-center gap-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors duration-150 text-left ${
          hideLabel ? 'justify-center px-2.5 py-2.5' : 'px-3 py-2.5'
        } ${active ? c.active : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
      >
        {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />}
        <span className={active ? c.icon : 'text-gray-400'}>{item.icon}</span>
        {!hideLabel && <span className="overflow-hidden text-ellipsis">{item.label}</span>}
        {!hideLabel && item.count !== undefined && item.count > 0 && (
          <span className={`ml-auto text-[11px] font-extrabold rounded-full px-1.5 py-0.5 ${active ? c.count : 'bg-gray-100 text-gray-500'}`}>
            {item.count}
          </span>
        )}
      </button>
    );
  }

  function renderIdentidade(hideText: boolean) {
    return (
      <>
        <div className="w-[30px] h-[30px] rounded-lg bg-white border border-gray-200 text-gray-400 flex items-center justify-center shrink-0 overflow-hidden">
          {footerPhotoUrl ? (
            <img src={footerPhotoUrl} alt={footerName} className="w-full h-full object-cover" />
          ) : (
            <FooterIcon className="w-4 h-4" />
          )}
        </div>
        {!hideText && (
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-gray-800 truncate leading-tight">{footerName}</div>
            {footerSubtitle && <div className="text-[11px] text-gray-400 leading-tight truncate">{footerSubtitle}</div>}
          </div>
        )}
      </>
    );
  }

  // No mobile o rodapé já mora dentro do menu hambúrguer aberto — nada de empilhar
  // um segundo menu ali dentro, as duas ações aparecem direto, sempre visíveis.
  function renderFooterMobile() {
    return (
      <div className="mt-1.5 rounded-xl bg-gray-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-2.5 py-2.5">{renderIdentidade(false)}</div>
        {temPerfil && (
          <button
            onClick={() => handleSelect('perfil')}
            className="flex items-center gap-2.5 w-full text-left px-2.5 py-2.5 text-sm font-bold text-gray-600 border-t border-white/70 hover:bg-white/60"
          >
            <UserIcon className="w-4 h-4 text-gray-400" /> Ver perfil
          </button>
        )}
        <button
          onClick={() => { setOpen(false); setSenhaModalOpen(true); }}
          className="flex items-center gap-2.5 w-full text-left px-2.5 py-2.5 text-sm font-bold text-gray-600 border-t border-white/70 hover:bg-white/60"
        >
          <LockIcon className="w-4 h-4 text-gray-400" /> Alterar senha
        </button>
        <button
          onClick={() => { clearSession(); window.location.href = '/'; }}
          className="flex items-center gap-2.5 w-full text-left px-2.5 py-2.5 text-sm font-bold text-danger border-t border-white/70 hover:bg-white/60"
        >
          <LogoutIcon className="w-4 h-4" /> Sair
        </button>
      </div>
    );
  }

  // Desktop: o rodapé vira um botão só, que abre um menu ancorado pra cima
  // (bottom-full) com "Ver perfil" e "Sair" — substitui o ícone de sair que ficava sempre solto.
  function renderFooterDesktop(hideText: boolean) {
    return (
      <div className="relative mt-1.5" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`flex items-center gap-2.5 rounded-xl w-full border transition-colors duration-150 ${
            hideText ? 'justify-center py-2.5' : 'px-2.5 py-2.5'
          } ${menuOpen ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-100 border-transparent hover:bg-gray-200/70'}`}
        >
          {renderIdentidade(hideText)}
          {!hideText && (
            <ChevronLeftIcon
              className={`w-3 h-3 text-gray-400 shrink-0 transition-transform duration-150 ${menuOpen ? '-rotate-90' : 'rotate-90'}`}
            />
          )}
        </button>

        {menuOpen && (
          <div
            className={`absolute bottom-full mb-2 bg-white border border-gray-200 rounded-2xl shadow-[0_12px_32px_rgba(4,45,76,0.14)] overflow-hidden z-30 ${
              hideText ? 'left-0 w-48' : 'left-0 right-0'
            }`}
          >
            {temPerfil && (
              <button
                onClick={() => { onSelect('perfil'); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50"
              >
                <UserIcon className="w-4 h-4 text-gray-400" /> Ver perfil
              </button>
            )}
            <button
              onClick={() => { setMenuOpen(false); setSenhaModalOpen(true); }}
              className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50"
            >
              <LockIcon className="w-4 h-4 text-gray-400" /> Alterar senha
            </button>
            <button
              onClick={() => { clearSession(); window.location.href = '/'; }}
              className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 text-[13px] font-bold text-danger border-t border-gray-100 hover:bg-red-50"
            >
              <LogoutIcon className="w-4 h-4" /> Sair
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: top bar with hamburger menu */}
      <div className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
              <img src="/logo.svg" alt="ConectVet" className="w-[70%] h-[70%] object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold font-brand whitespace-nowrap">
                <span className="text-ink">conect</span> <span className="text-primaryDeep">vet</span>
              </div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{subtitle}</div>
            </div>
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50"
          >
            {open ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-gray-100 px-3 pb-3 pt-2 flex flex-col gap-1">
            {items.map((item) => renderNavItem(item, () => handleSelect(item.key), false))}
            {renderFooterMobile()}
          </div>
        )}
      </div>

      {/* Desktop: vertical sidebar */}
      <aside
        className={`hidden md:flex shrink-0 bg-white border-r border-gray-100 flex-col gap-1 p-4 sticky top-0 md:h-screen transition-[width] duration-200 ${
          collapsed ? 'md:w-[76px]' : 'md:w-64'
        }`}
      >
        <div className={`flex items-center gap-2.5 px-2 pb-6 min-w-0 ${collapsed ? 'flex-col' : ''}`}>
          <div className={`flex items-center gap-2.5 min-w-0 w-full ${collapsed ? 'justify-center' : ''}`}>
            <a href="/" className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                <img src="/logo.svg" alt="ConectVet" className="w-[70%] h-[70%] object-contain" />
              </div>
              {!collapsed && (
                <div className="leading-tight min-w-0 overflow-hidden">
                  <div className="text-base font-bold font-brand whitespace-nowrap">
                    <span className="text-ink">conect</span> <span className="text-primaryDeep">vet</span>
                  </div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{subtitle}</div>
                </div>
              )}
            </a>
            {!collapsed && (
              <button
                onClick={toggleCollapsed}
                aria-label="Recolher menu"
                className="ml-auto shrink-0 w-6 h-6 rounded-md bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={toggleCollapsed}
              aria-label="Expandir menu"
              className="shrink-0 w-6 h-6 rounded-md bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5 rotate-180" />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item) => renderNavItem(item, () => onSelect(item.key), collapsed))}
        </nav>

        <div className="flex-1" />

        {renderFooterDesktop(collapsed)}
      </aside>

      <AlterarSenhaModal open={senhaModalOpen} onClose={() => setSenhaModalOpen(false)} />
    </>
  );
}
