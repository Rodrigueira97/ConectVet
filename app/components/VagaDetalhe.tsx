'use client';
import { useEffect, useRef, useState } from 'react';
import { buildEndereco, mapsLink, plantaoEncerrado } from '@/lib/mockData';
import { BuildingIcon, CalendarIcon, ChevronLeftIcon, CheckCircleIcon, CloseIcon, MoneyIcon, PinIcon, WarningIcon, XCircleIcon } from '@/app/components/icons';
import { PawTrailInline } from '@/app/components/PawTrailLoader';
import { FotoEstrutura, AvaliacaoClinica, getUltimasAvaliacoesClinica } from '@/lib/api';

export type VagaDetalheData = {
  clinica?: string;
  clinicaId?: string;
  clinicaLogoUrl?: string | null;
  clinicaFotos?: FotoEstrutura[];
  categoria: string;
  status?: 'ABERTA' | 'PREENCHIDA' | 'CONCLUIDA' | 'CANCELADA';
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

function formatDataBR(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatQuando(dataIso: string) {
  const semData = new Date(dataIso)
    .toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/\./g, '');
  return semData.charAt(0).toUpperCase() + semData.slice(1);
}

// Combina o status salvo com a data/hora do plantão — uma vaga "Aberta" cuja
// data já passou sem ninguém preenchido também conta como encerrada.
function statusVagaInfo(vaga: VagaDetalheData): { label: string; className: string; dotClassName: string } | null {
  if (!vaga.status) return null;
  if (vaga.status === 'CANCELADA') return { label: 'Cancelada', className: 'bg-[rgba(4,20,25,0.32)] text-white', dotClassName: 'bg-white/60' };
  if (vaga.status === 'CONCLUIDA') return { label: 'Concluída', className: 'bg-[rgba(4,20,25,0.32)] text-white', dotClassName: 'bg-white/60' };
  if (vaga.status === 'PREENCHIDA') return null;
  if (plantaoEncerrado(vaga)) return { label: 'Encerrada', className: 'bg-[rgba(4,20,25,0.32)] text-white', dotClassName: 'bg-white/60' };
  return { label: 'Aberta', className: 'bg-white text-primaryDeep', dotClassName: 'bg-primary' };
}

export function VagaDetalheView({
  vaga, onBack, actionLabel, onAction, actionDisabled, actionLoading, compatStatus, perfilFuncao,
}: {
  vaga: VagaDetalheData;
  onBack: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  compatStatus?: 'compativel' | 'incompativel' | 'aplicada' | 'encerrada';
  perfilFuncao?: string;
}) {
  const local = buildEndereco(vaga);
  const localCurto = [vaga.bairro, vaga.cidade].filter(Boolean).join(', ') || vaga.cidade;
  const valorNum = typeof vaga.valor === 'string' ? parseFloat(vaga.valor) : vaga.valor;
  const horas = calcDuracaoHoras(vaga.horaInicio, vaga.horaFim);
  const horasLabel = horas % 1 === 0 ? `${horas}h` : `${horas.toFixed(1)}h`;

  const mostrarCta = !!(onAction && actionLabel);
  const [fotoAberta, setFotoAberta] = useState<FotoEstrutura | null>(null);
  const status = statusVagaInfo(vaga);

  const [avaliacoesClinica, setAvaliacoesClinica] = useState<AvaliacaoClinica[]>([]);
  const [avaliacoesCarregadas, setAvaliacoesCarregadas] = useState(false);
  const avaliacoesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAvaliacoesCarregadas(false);
    setAvaliacoesClinica([]);
    if (!vaga.clinicaId) return;
    getUltimasAvaliacoesClinica(vaga.clinicaId)
      .then(setAvaliacoesClinica)
      .catch(() => {})
      .finally(() => setAvaliacoesCarregadas(true));
  }, [vaga.clinicaId]);

  function scrollParaAvaliacoes() {
    avaliacoesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="max-w-[1080px] mx-auto p-8">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-white/85 hover:text-white mb-4">
        <ChevronLeftIcon className="w-[15px] h-[15px]" /> Voltar para vagas
      </button>

      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        <span className="text-white bg-white/15 text-xs font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full">{vaga.categoria}</span>
        {status && (
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold pl-2 pr-2.5 py-1 rounded-full ${status.className}`}>
            <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${status.dotClassName}`} />
            {status.label}
          </span>
        )}
        {vaga.perto && <span className="bg-secondary text-white text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full">Perto de você</span>}
      </div>

      <div className="flex items-center gap-3.5 mb-6">
        {vaga.clinica && (
          <div className="w-14 h-14 rounded-2xl bg-white/90 p-[3px] shadow-lg shrink-0">
            <div className="w-full h-full rounded-[13px] bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden">
              {vaga.clinicaLogoUrl ? (
                <img src={vaga.clinicaLogoUrl} alt={vaga.clinica} className="w-full h-full object-cover" />
              ) : (
                <BuildingIcon className="w-6 h-6" />
              )}
            </div>
          </div>
        )}
        <div>
          <h1 className="text-white text-2xl font-extrabold mb-1">{vaga.clinica || 'Detalhes da vaga'}</h1>
          <div className="text-white/90 text-sm font-bold">
            {vaga.notaMedia && vaga.totalAvaliacoes ? (
              avaliacoesClinica.length > 0 ? (
                <button
                  onClick={scrollParaAvaliacoes}
                  className="inline-flex items-center gap-1.5 -m-1 p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <span className="text-[#FFD666]">★</span> {vaga.notaMedia.toFixed(1)}
                  <span className="text-white/65 font-semibold hover:underline">({vaga.totalAvaliacoes} avaliações)</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#FFD666]">★</span> {vaga.notaMedia.toFixed(1)}
                  <span className="text-white/65 font-semibold">({vaga.totalAvaliacoes} avaliações)</span>
                </span>
              )
            ) : (
              <span className="text-white/70 font-semibold">Sem avaliações ainda</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-primaryTint rounded-2xl p-[18px]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-primaryDeep text-white flex items-center justify-center mb-3">
            <MoneyIcon className="w-[18px] h-[18px]" />
          </div>
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-primaryDeep/75 mb-1">Valor do plantão</div>
          <div className="text-[22px] font-extrabold text-ink leading-tight">R$ {valorNum}</div>
        </div>
        <div className="bg-primaryTint rounded-2xl p-[18px]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-primary text-white flex items-center justify-center mb-3">
            <CalendarIcon className="w-[18px] h-[18px]" />
          </div>
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Quando</div>
          <div className="text-[22px] font-extrabold text-ink leading-tight">{formatQuando(vaga.data)}</div>
          <div className="text-[13px] font-bold text-gray-500 mt-1">{vaga.horaInicio} – {vaga.horaFim} · {horasLabel}</div>
        </div>
        <div className="bg-primaryTint rounded-2xl p-[18px]">
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

      {vaga.clinicaFotos && vaga.clinicaFotos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-3">Conheça a clínica</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {vaga.clinicaFotos.map((foto) => (
              <button
                key={foto.url}
                onClick={() => setFotoAberta(foto)}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
              >
                <img src={foto.url} alt={foto.descricao || 'Foto da clínica'} className="w-full h-full object-cover" />
                {foto.descricao && (
                  <span
                    className="absolute left-0 right-0 bottom-0 px-2 py-1.5 text-[10.5px] font-bold text-white text-left"
                    style={{ background: 'linear-gradient(to top, rgba(4,20,25,.72), transparent)' }}
                  >
                    {foto.descricao}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {fotoAberta && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(4,20,25,0.7)] flex items-center justify-center p-6"
          onClick={() => setFotoAberta(null)}
        >
          <div className="w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={fotoAberta.url} alt={fotoAberta.descricao || 'Foto da clínica'} className="w-full aspect-[4/3] object-cover rounded-2xl" />
              <button
                onClick={() => setFotoAberta(null)}
                aria-label="Fechar"
                className="absolute -top-3.5 -right-3.5 w-8 h-8 rounded-full bg-white text-ink flex items-center justify-center shadow-lg"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            {fotoAberta.descricao && <div className="text-white text-sm font-bold text-center mt-3">{fotoAberta.descricao}</div>}
          </div>
        </div>
      )}

      {vaga.descricao && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-2">Descrição da vaga</div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{vaga.descricao}</div>
        </div>
      )}

      {vaga.clinicaId && avaliacoesCarregadas && (
        <div ref={avaliacoesRef} className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-1">Últimas avaliações</div>
          {avaliacoesClinica.length === 0 ? (
            <div className="text-sm text-gray-400 py-3">Essa clínica ainda não tem avaliações de outros profissionais.</div>
          ) : (
            avaliacoesClinica.map((a) => (
              <div key={a.id} className="py-3.5 border-b border-gray-100 last:border-b-0 last:pb-0 first:pt-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13.5px] font-extrabold text-ink">{a.profissionalNome}</div>
                  <div className="text-amber-500 text-sm tracking-widest shrink-0">{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}</div>
                </div>
                {a.comentario && <div className="text-[13.5px] leading-relaxed text-gray-700 mt-1">{a.comentario}</div>}
                {a.data && <div className="text-xs text-gray-400 mt-1.5">Plantão de {formatDataBR(a.data)}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {mostrarCta && (
        <>
          <div className="hidden md:block max-w-[340px] mt-2">
            <button
              disabled={actionDisabled || actionLoading}
              onClick={onAction}
              className={`w-full py-[15px] rounded-2xl text-[15px] font-extrabold transition-colors flex items-center justify-center ${
                actionLoading
                  ? 'bg-white text-primaryDeep shadow-lg cursor-default'
                  : actionDisabled
                    ? 'bg-white/10 border border-white/25 text-white/60'
                    : 'bg-white text-primaryDeep shadow-lg hover:bg-primaryTint'
              }`}
            >
              {actionLoading ? <PawTrailInline /> : actionLabel}
            </button>
          </div>
          <div
            className="md:hidden sticky bottom-0 left-0 right-0 -mx-8 px-8 pt-6 pb-4"
            style={{ background: 'linear-gradient(to top, #F5F8F6 65%, transparent)' }}
          >
            <button
              disabled={actionDisabled || actionLoading}
              onClick={onAction}
              className={`w-full py-[15px] rounded-2xl text-[15px] font-extrabold transition-colors flex items-center justify-center ${
                actionLoading
                  ? 'bg-primary text-white cursor-default'
                  : actionDisabled
                    ? 'bg-white border border-gray-200 text-gray-400'
                    : 'bg-primary text-white hover:bg-primaryDark'
              }`}
            >
              {actionLoading ? <PawTrailInline /> : actionLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
