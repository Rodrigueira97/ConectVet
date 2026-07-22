'use client';
import { mapsLink } from '@/lib/mockData';

export type VagaDetalheData = {
  clinica?: string;
  categoria: string;
  turno?: string;
  local: string;
  data: string;
  horario: string;
  valor: string;
  descricao?: string;
};

export function VagaDetalheView({
  vaga, onBack, accentClass = 'text-primary', actionLabel, onAction, actionDisabled, actionButtonClass = 'bg-primary hover:bg-primaryDark text-white',
}: {
  vaga: VagaDetalheData;
  onBack: () => void;
  accentClass?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionButtonClass?: string;
}) {
  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8">
      <button onClick={onBack} className="text-sm font-bold text-gray-500 mb-4">← Voltar</button>

      <div className={`text-xs font-bold uppercase ${accentClass}`}>
        {vaga.categoria}{vaga.turno ? ` · ${vaga.turno}` : ''}
      </div>
      <h1 className="text-2xl font-extrabold mt-1 mb-3">{vaga.clinica || 'Detalhes da vaga'}</h1>
      <div className="inline-block bg-green-100 text-green-700 font-extrabold text-sm px-3 py-1.5 rounded-lg mb-6">
        R$ {vaga.valor}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-5">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Endereço</div>
          <div className="text-sm text-gray-700">{vaga.local || '—'}</div>
          {vaga.local && (
            <a
              href={mapsLink(vaga.local)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-primary mt-1.5 inline-block"
            >
              Ver no Google Maps
            </a>
          )}
        </div>

        <div className="flex gap-8 flex-wrap">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Data</div>
            <div className="text-sm text-gray-700">{vaga.data || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Horário</div>
            <div className="text-sm text-gray-700">{vaga.horario || '—'}</div>
          </div>
        </div>

        {vaga.descricao && (
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Descrição</div>
            <div className="text-sm text-gray-700 whitespace-pre-line">{vaga.descricao}</div>
          </div>
        )}
      </div>

      {onAction && actionLabel && (
        <div className="flex justify-end mt-6">
          <button
            disabled={actionDisabled}
            onClick={onAction}
            className={`px-6 py-3 rounded-lg text-sm font-bold ${actionDisabled ? 'border border-gray-300 bg-gray-50 text-gray-400' : actionButtonClass}`}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
