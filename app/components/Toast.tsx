'use client';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BellIcon, CheckCircleIcon, CloseIcon, WarningIcon, XCircleIcon } from './icons';

type ToastType = 'success' | 'error' | 'warn' | 'info';
type ToastAction = { label: string; onClick: () => void };
type ToastOptions = { message?: string; action?: ToastAction; duration?: number | null };
type ToastItem = { id: number; type: ToastType; title: string; message?: string; action?: ToastAction; duration: number | null };

// Sucesso e informação somem sozinhos; erro e atenção exigem uma decisão do
// usuário, então ficam na tela até ele fechar (ver diretrizes do protótipo).
const DEFAULT_DURATION: Record<ToastType, number | null> = {
  success: 4200,
  info: 5200,
  error: null,
  warn: null,
};

const ICON: Record<ToastType, (className: string) => ReactNode> = {
  success: (c) => <CheckCircleIcon className={c} />,
  error: (c) => <XCircleIcon className={c} />,
  warn: (c) => <WarningIcon className={c} />,
  info: (c) => <BellIcon className={c} />,
};

const STYLE: Record<ToastType, { badgeBg: string; badgeFg: string; bar: string }> = {
  success: { badgeBg: 'bg-primaryTint', badgeFg: 'text-primaryDeep', bar: 'bg-primary' },
  error: { badgeBg: 'bg-red-50', badgeFg: 'text-danger', bar: 'bg-danger' },
  warn: { badgeBg: 'bg-amber-100', badgeFg: 'text-amber-700', bar: 'bg-amber-600' },
  info: { badgeBg: 'bg-secondary/10', badgeFg: 'text-secondary', bar: 'bg-secondary' },
};

type ToastApi = {
  success: (title: string, opts?: ToastOptions) => void;
  error: (title: string, opts?: ToastOptions) => void;
  warn: (title: string, opts?: ToastOptions) => void;
  info: (title: string, opts?: ToastOptions) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa ser usado dentro de <ToastProvider>.');
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, title: string, opts: ToastOptions = {}) => {
    const id = nextId++;
    const duration = opts.duration !== undefined ? opts.duration : DEFAULT_DURATION[type];
    setToasts((ts) => [{ id, type, title, message: opts.message, action: opts.action, duration }, ...ts]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, opts) => push('success', title, opts),
      error: (title, opts) => push('error', title, opts),
      warn: (title, opts) => push('warn', title, opts),
      info: (title, opts) => push('info', title, opts),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[100] inset-x-3 bottom-3 flex flex-col-reverse gap-2.5 md:inset-x-auto md:bottom-auto md:top-20 md:right-6 md:w-[360px] md:flex-col pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.duration ?? 0);
  const startRef = useRef(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (toast.duration == null || paused) return;
    startRef.current = Date.now();
    const timer = setTimeout(close, remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startRef.current;
    };
  }, [paused, toast.duration, close]);

  const s = STYLE[toast.type];
  const soTitulo = !toast.message && !toast.action;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`relative flex gap-2.5 bg-white border border-gray-200 rounded-2xl shadow-[0_10px_28px_rgba(4,45,76,0.16)] pr-8 pl-3 py-3 overflow-hidden pointer-events-auto transition-all duration-200 ${
        soTitulo ? 'items-center' : 'items-start'
      } ${
        entered && !leaving ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-0 translate-x-6 md:translate-y-0 translate-y-2'
      }`}
    >
      <div className={`w-[34px] h-[34px] rounded-[11px] flex items-center justify-center shrink-0 ${s.badgeBg} ${s.badgeFg}`}>
        {ICON[toast.type]('w-[17px] h-[17px]')}
      </div>
      <div className={`min-w-0 flex-1 ${soTitulo ? '' : 'pt-px'}`}>
        <div className="text-[13.5px] font-bold text-ink leading-tight">{toast.title}</div>
        {toast.message && <div className="text-[12.5px] text-gray-500 leading-snug mt-0.5">{toast.message}</div>}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              close();
            }}
            className="mt-1.5 text-xs font-bold text-primary hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={close}
        aria-label="Fechar"
        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <CloseIcon className="w-[11px] h-[11px]" />
      </button>
      {toast.duration != null && (
        <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-gray-100">
          <div
            className={`h-full origin-left ${s.bar}`}
            style={{
              animation: `toastProgress ${toast.duration}ms linear forwards`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </div>
  );
}
