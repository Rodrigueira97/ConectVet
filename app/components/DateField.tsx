'use client';
import { useEffect, useRef, useState } from 'react';
import { hojeBrasil } from '@/lib/mockData';
import { CalendarIcon, ChevronLeftIcon, CloseIcon } from './icons';

function formatDataLonga(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const s = d.toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function somarMes(iso: string, delta: number) {
  const [ano, mes] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function DateField({
  label, value, onChange, error, required, min, max, placeholder = 'Selecione a data',
  hideLabel, compact, clearable,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  /** Esconde o rótulo acima do campo — pra usar dentro de uma barra de filtros que já tem seu próprio rótulo, ou nenhum. */
  hideLabel?: boolean;
  /** Botão em formato de pílula (rounded-full, mais baixo) em vez do campo de formulário padrão. */
  compact?: boolean;
  /** Mostra um "x" pra voltar a value: '' — útil em filtro, onde "nenhuma data" é uma opção válida. */
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => (value || min || hojeBrasil()).slice(0, 7) + '-01');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const hoje = hojeBrasil();
  const [ano, mes] = viewMonth.split('-').map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  const anoMin = min ? Number(min.slice(0, 4)) : ano - 100;
  const anoMax = max ? Number(max.slice(0, 4)) : ano + 2;
  const anos = Array.from({ length: anoMax - anoMin + 1 }, (_, i) => anoMin + i);

  function irPara(novoAno: number, novoMes: number) {
    setViewMonth(`${novoAno}-${String(novoMes).padStart(2, '0')}-01`);
  }

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      {!hideLabel && <span className="text-sm font-bold">{label}{required && <span className="text-danger"> *</span>}</span>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-2 border text-sm text-left bg-white ${compact ? 'px-3 py-2 rounded-full' : 'px-3 py-2.5 rounded-lg'} ${clearable && value ? 'pr-8' : ''} ${
            error ? 'border-danger' : open ? 'border-primary ring-4 ring-primaryTint' : 'border-gray-300'
          } ${value ? 'text-ink' : 'text-gray-400'}`}
        >
          <CalendarIcon className={`w-4 h-4 shrink-0 ${value ? 'text-primary' : 'text-gray-400'}`} />
          {value ? formatDataLonga(value) : placeholder}
        </button>
        {clearable && value && (
          <button
            type="button"
            aria-label="Limpar data"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        )}
        {open && (
        <div className="absolute z-20 top-full mt-1.5 w-[260px] bg-white border border-gray-200 rounded-2xl shadow-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => somarMes(m, -1))}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-primaryTint hover:text-primaryDeep flex items-center justify-center text-gray-500 shrink-0"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>
            <select
              value={mes}
              onChange={(e) => irPara(ano, Number(e.target.value))}
              className="flex-1 min-w-0 text-[12.5px] font-extrabold capitalize border-none bg-transparent outline-none text-center"
            >
              {NOMES_MES.map((nome, i) => <option key={nome} value={i + 1} className="capitalize">{nome}</option>)}
            </select>
            <select
              value={ano}
              onChange={(e) => irPara(Number(e.target.value), mes)}
              className="text-[12.5px] font-extrabold border-none bg-transparent outline-none"
            >
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setViewMonth((m) => somarMes(m, 1))}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-primaryTint hover:text-primaryDeep flex items-center justify-center text-gray-500 shrink-0"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-[10px] font-extrabold text-gray-400 text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDiaSemana }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const dia = i + 1;
              const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const desabilitado = (min && iso < min) || (max && iso > max);
              const selecionado = iso === value;
              return (
                <button
                  type="button"
                  key={iso}
                  disabled={!!desabilitado}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className={`aspect-square rounded-lg text-[12.5px] ${
                    desabilitado
                      ? 'text-gray-300'
                      : selecionado
                        ? 'bg-primary text-white font-extrabold'
                        : iso === hoje
                          ? 'ring-[1.5px] ring-primary font-extrabold text-ink'
                          : 'text-ink hover:bg-primaryTint'
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        </div>
      )}
      </div>
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </div>
  );
}
