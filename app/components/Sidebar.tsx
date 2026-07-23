'use client';
import { ReactNode, useState } from 'react';
import { CloseIcon, LogoutIcon, MenuIcon } from './icons';
import { clearSession } from '@/lib/api';

export type SidebarItem = {
  key: string;
  label: string;
  icon: ReactNode;
};

type Accent = 'primary' | 'secondary' | 'neutral';

const ACCENT: Record<Accent, { badge: string; active: string; icon: string }> = {
  primary: { badge: 'bg-primary', active: 'bg-green-50 text-primary', icon: 'text-primary' },
  secondary: { badge: 'bg-secondary', active: 'bg-sky-50 text-secondary', icon: 'text-secondary' },
  neutral: { badge: 'bg-gray-900', active: 'bg-gray-100 text-gray-900', icon: 'text-gray-700' },
};

export function Sidebar({
  accent, subtitle, items, activeKey, onSelect, footerName,
}: {
  accent: Accent;
  subtitle: string;
  items: SidebarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  footerName?: string;
}) {
  const c = ACCENT[accent];
  const [open, setOpen] = useState(false);

  function handleSelect(key: string) {
    onSelect(key);
    setOpen(false);
  }

  const footer = (
    <>
      {footerName && (
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-extrabold uppercase shrink-0">
            {footerName.trim().slice(0, 1) || '?'}
          </div>
          <div className="text-sm font-bold text-gray-700 truncate">{footerName}</div>
        </div>
      )}
      <button
        onClick={() => { clearSession(); window.location.href = '/'; }}
        className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-danger hover:bg-red-50 transition-colors duration-150 text-left"
      >
        <LogoutIcon className="w-[18px] h-[18px]" />
        Sair
      </button>
    </>
  );

  return (
    <>
      {/* Mobile: top bar with hamburger menu */}
      <div className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${c.badge} flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0`}>
              C
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-gray-900">ConectVet</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{subtitle}</div>
            </div>
          </div>
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
            {items.map((item) => {
              const active = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelect(item.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-colors duration-150 ${
                    active ? c.active : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <span className={active ? c.icon : 'text-gray-400'}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
            <div className="flex flex-col gap-2 pt-2 mt-1 border-t border-gray-100">{footer}</div>
          </div>
        )}
      </div>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden md:flex md:w-64 shrink-0 bg-white border-r border-gray-100 flex-col gap-1 p-4 sticky top-0 md:h-screen">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <div className={`w-9 h-9 rounded-xl ${c.badge} flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0`}>
            C
          </div>
          <div className="leading-tight">
            <div className="text-base font-extrabold text-gray-900">ConectVet</div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{subtitle}</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors duration-150 ${
                  active ? c.active : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className={active ? c.icon : 'text-gray-400'}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-gray-100">{footer}</div>
      </aside>
    </>
  );
}
