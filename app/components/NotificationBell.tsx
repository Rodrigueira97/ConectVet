'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { getNotificacoes, marcarNotificacoesLidas, Notificacao, NotificacaoTipo } from '@/lib/api';
import { BellIcon, CheckCircleIcon, MoneyIcon, HeartIcon, XCircleIcon } from './icons';

const ICON_POR_TIPO: Record<NotificacaoTipo, { icon: (c: string) => ReactNode; bg: string; fg: string }> = {
  CANDIDATURA_ACEITA: { icon: (c) => <CheckCircleIcon className={c} />, bg: 'bg-primaryTint', fg: 'text-primaryDeep' },
  CANDIDATURA_RECUSADA: { icon: (c) => <XCircleIcon className={c} />, bg: 'bg-gray-100', fg: 'text-gray-500' },
  VAGA_PREENCHIDA_OUTRO: { icon: (c) => <XCircleIcon className={c} />, bg: 'bg-gray-100', fg: 'text-gray-500' },
  PAGAMENTO_LIBERADO: { icon: (c) => <MoneyIcon className={c} />, bg: 'bg-amber-100', fg: 'text-amber-700' },
  AVALIACAO_RECEBIDA: { icon: (c) => <HeartIcon className={c} />, bg: 'bg-amber-100', fg: 'text-amber-700' },
};

function tempoRelativo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ontem';
  return `há ${d} dias`;
}

export function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ativo = true;
    function carregar() {
      getNotificacoes().then((ns) => { if (ativo) setNotificacoes(ns); }).catch(() => {});
    }
    carregar();
    const intervalo = setInterval(carregar, 30000);
    return () => { ativo = false; clearInterval(intervalo); };
  }, []);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  function marcarLidas() {
    marcarNotificacoesLidas().catch(() => {});
    setNotificacoes((ns) => ns.map((n) => ({ ...n, lida: true })));
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-ink hover:bg-gray-50 shadow-sm"
      >
        <BellIcon className="w-[18px] h-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger border-2 border-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[340px] max-w-[88vw] bg-white border border-gray-200 rounded-2xl shadow-[0_12px_32px_rgba(4,45,76,0.14)] overflow-hidden z-30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <b className="text-[13.5px] text-ink">Notificações</b>
            {naoLidas > 0 && (
              <button onClick={marcarLidas} className="text-[11.5px] font-bold text-primary hover:underline">
                Marcar tudo como lido
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-gray-400">Nenhuma notificação ainda.</div>
            ) : (
              notificacoes.map((n) => {
                const cfg = ICON_POR_TIPO[n.tipo];
                return (
                  <div key={n.id} className={`flex gap-2.5 px-4 py-3 border-b border-gray-50 last:border-b-0 ${!n.lida ? 'bg-primaryTint/20' : ''}`}>
                    <div className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.fg}`}>
                      {cfg.icon('w-3.5 h-3.5')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-ink leading-snug">{n.texto}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{tempoRelativo(n.createdAt)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
