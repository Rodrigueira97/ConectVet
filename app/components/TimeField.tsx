'use client';
import { useEffect, useRef, useState } from 'react';
import { ClockIcon } from './icons';

export function TimeField({
  label, value, onChange, error, required, step = 30, placeholder = 'Selecione',
}: {
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
  error?: string;
  required?: boolean;
  step?: number;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.querySelector<HTMLElement>('[data-selecionado="true"]')?.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  const opcoes: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) {
    opcoes.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      <span className="text-sm font-bold">{label}{required && <span className="text-danger"> *</span>}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left bg-white ${
          error ? 'border-danger' : open ? 'border-primary ring-4 ring-primaryTint' : 'border-gray-300'
        } ${value ? 'text-ink' : 'text-gray-400'}`}
      >
        <ClockIcon className="w-4 h-4 text-primary shrink-0" />
        {value || placeholder}
      </button>
      {open && (
        <div ref={listRef} className="absolute z-20 top-full mt-1.5 w-full min-w-[110px] max-h-[220px] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-lg p-1.5">
          {opcoes.map((t) => (
            <button
              type="button"
              key={t}
              data-selecionado={t === value}
              onClick={() => { onChange(t); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 rounded-lg text-[13px] ${t === value ? 'bg-primary text-white font-bold' : 'text-ink hover:bg-primaryTint'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </div>
  );
}
