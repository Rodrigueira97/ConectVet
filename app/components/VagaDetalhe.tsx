'use client';
import { buildEndereco, mapsLink } from '@/lib/mockData';
import { CalendarIcon, ChevronLeftIcon, CheckCircleIcon, MoneyIcon, PinIcon, WarningIcon, XCircleIcon } from '@/app/components/icons';

export type VagaDetalheData = {
  clinica?: string;
  categoria: string;
  rua: string;
  numero: string;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string;
  estado: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  valor: string | number;
  descricao?: string | null;
  notaMedia?: number | null;
  totalAvaliacoes?: number;
  perto?: boolean;
};

function calcDuracaoHoras(inicio: string, fim: string) {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

function formatQuando(dataIso: string) {
  const semData = new Date(dataIso)
    .toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/\./g, '');
  return semData.charAt(0).toUpperCase() + semData.slice(1);
}

export function VagaDetalheView({
  vaga, onBack, actionLabel, onAction, actionDisabled, compatStatus, perfilFuncao,
}: {
  vaga: VagaDetalheData;
  onBack: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  compatStatus?: 'compativel' | 'incompativel' | 'aplicada' | 'encerrada';
  perfilFuncao?: string;
}) {
  const local = buildEndereco(vaga);
  const localCurto = [vaga.bairro, vaga.cidade].filter(Boolean).join(', ') || vaga.cidade;
  const valorNum = typeof vaga.valor === 'string' ? parseFloat(vaga.valor) : vaga.valor;
  const horas = calcDuracaoHoras(vaga.horaInicio, vaga.horaFim);
  const porHora = valorNum / horas;
  const horasLabel = horas % 1 === 0 ? `${horas}h` : `${horas.toFixed(1)}h`;

  const mostrarCta = !!(onAction && actionLabel);

  return (
    <div className="max-w-[1080px] mx-auto p-8">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-white/85 hover:text-white mb-4">
        <ChevronLeftIcon className="w-[15px] h-[15px]" /> Voltar para vagas
      </button>

      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        <span className="text-white bg-white/15 text-xs font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full">{vaga.categoria}</span>
        {vaga.perto && <span className="bg-secondary text-white text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full">Perto de você</span>}
      </div>
      <h1 className="text-white text-2xl font-extrabold mb-2">{vaga.clinica || 'Detalhes da vaga'}</h1>
      <div className="mb-6 text-white/90 text-sm font-bold">
        {vaga.notaMedia && vaga.totalAvaliacoes ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[#FFD666]">★</span> {vaga.notaMedia.toFixed(1)}
            <span className="text-white/65 font-semibold">({vaga.totalAvaliacoes} avaliações)</span>
          </span>
        ) : (
          <span className="text-white/70 font-semibold">Sem avaliações ainda</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-primaryTint rounded-2xl p-[18px]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-primaryDeep text-white flex items-center justify-center mb-3">
            <MoneyIcon className="w-[18px] h-[18px]" />
          </div>
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-primaryDeep/75 mb-1">Valor do plantão</div>
          <div className="text-[22px] font-extrabold text-ink leading-tight">R$ {valorNum}</div>
          <div className="text-[13px] font-semibold text-primaryDeep/80 mt-1">≈ R$ {porHora.toFixed(0)}/hora</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-[18px]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-primary text-white flex items-center justify-center mb-3">
            <CalendarIcon className="w-[18px] h-[18px]" />
          </div>
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Quando</div>
          <div className="text-[22px] font-extrabold text-ink leading-tight">{formatQuando(vaga.data)}</div>
          <div className="text-[13px] font-semibold text-gray-500 mt-1">{vaga.horaInicio} – {vaga.horaFim} · {horasLabel}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-[18px]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-primary text-white flex items-center justify-center mb-3">
            <PinIcon className="w-[18px] h-[18px]" />
          </div>
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Onde</div>
          <div className="text-[22px] font-extrabold text-ink leading-tight">{localCurto}</div>
          <a href={mapsLink(local)} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-primary mt-1 inline-block hover:underline">
            Ver no mapa →
          </a>
        </div>
      </div>

      {compatStatus && (
        <div className={`flex items-start gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-semibold leading-relaxed mb-5 ${
          compatStatus === 'incompativel' ? 'bg-red-50 text-[#8C2E20]' : compatStatus === 'encerrada' ? 'bg-gray-100 text-gray-500' : 'bg-primaryTint text-primaryDeep'
        }`}>
          {compatStatus === 'incompativel' ? (
            <WarningIcon className="w-[18px] h-[18px] shrink-0 mt-px text-danger" />
          ) : compatStatus === 'encerrada' ? (
            <XCircleIcon className="w-[18px] h-[18px] shrink-0 mt-px text-gray-400" />
          ) : (
            <CheckCircleIcon className="w-[18px] h-[18px] shrink-0 mt-px text-primaryDeep" />
          )}
          <div>
            {compatStatus === 'compativel' && <>Sua função (<b>{perfilFuncao}</b>) é compatível com esta vaga.</>}
            {compatStatus === 'incompativel' && <>Esta vaga é para <b>{vaga.categoria}</b>. Seu perfil está cadastrado como <b>{perfilFuncao}</b>.</>}
            {compatStatus === 'aplicada' && <>Você já se candidatou para esta vaga. Acompanhe o status em Minhas candidaturas.</>}
            {compatStatus === 'encerrada' && <>Esta vaga já encerrou e não aceita mais candidaturas.</>}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-2">Endereço completo</div>
        <div className="text-[14.5px] font-semibold text-ink mb-2">{local}</div>
        <a href={mapsLink(local)} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline">
          Ver no Google Maps →
        </a>
      </div>

      {vaga.descricao && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-2">Descrição da vaga</div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{vaga.descricao}</div>
        </div>
      )}

      {mostrarCta && (
        <>
          <div className="hidden md:block max-w-[340px] mt-2">
            <button
              disabled={actionDisabled}
              onClick={onAction}
              className={`w-full py-[15px] rounded-2xl text-[15px] font-extrabold transition-colors ${
                actionDisabled
                  ? 'bg-white/10 border border-white/25 text-white/60'
                  : 'bg-white text-primaryDeep shadow-lg hover:bg-primaryTint'
              }`}
            >
              {actionLabel}
            </button>
          </div>
          <div
            className="md:hidden sticky bottom-0 left-0 right-0 -mx-8 px-8 pt-6 pb-4"
            style={{ background: 'linear-gradient(to top, #F5F8F6 65%, transparent)' }}
          >
            <button
              disabled={actionDisabled}
              onClick={onAction}
              className={`w-full py-[15px] rounded-2xl text-[15px] font-extrabold transition-colors ${
                actionDisabled
                  ? 'bg-white border border-gray-200 text-gray-400'
                  : 'bg-primary text-white hover:bg-primaryDark'
              }`}
            >
              {actionLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
