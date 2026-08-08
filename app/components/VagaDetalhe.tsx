'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { buildEndereco, mapsLink, motivoVagaFechada, plantaoEncerrado } from '@/lib/mockData';
import { BuildingIcon, CalendarIcon, ChevronLeftIcon, CheckCircleIcon, CheckIcon, CloseIcon, InfoIcon, LockIcon, MoneyIcon, PawIcon, PinIcon, WarningIcon, XCircleIcon } from '@/app/components/icons';
import { PawTrailInline } from '@/app/components/PawTrailLoader';
import { ShareVagaButton } from '@/app/components/ShareVagaButton';
import { FotoEstrutura, AvaliacaoClinica, getUltimasAvaliacoesClinica } from '@/lib/api';

export type VagaDetalheData = {
  id?: string;
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

// Do ponto de vista de quem navega pelas vagas, "encerrada" é qualquer vaga
// que não aceita mais candidatura: preenchida, cancelada, concluída, ou
// aberta cuja data/hora já passou sem ninguém confirmado. Não importa qual
// desses motivos é — pra quem lê, o resultado prático é sempre o mesmo (não
// dá mais), então o selo é sempre "Encerrada" e o motivo é sempre a mesma
// frase curta (motivoVagaFechada, a mesma usada no card do feed).
//
// A exceção é quando o próprio profissional foi o escolhido: aí "encerrada"
// significa "você conseguiu o plantão", então ganha `tom: 'confirmada'` e o
// resto do componente troca o visual apagado por um destaque positivo.
function encerramentoInfo(vaga: VagaDetalheData, preenchidaPorMim?: boolean): { pill: string; motivo: string; tom: 'fechada' | 'confirmada' } | null {
  const encerrada = vaga.status ? (vaga.status !== 'ABERTA' || plantaoEncerrado(vaga)) : plantaoEncerrado(vaga);
  if (!encerrada) return null;
  if (vaga.status === 'PREENCHIDA' && preenchidaPorMim) {
    return { pill: 'Preenchida por você', motivo: 'Você foi confirmado para este plantão!', tom: 'confirmada' };
  }
  return { pill: 'Encerrada', motivo: motivoVagaFechada({ status: vaga.status || '' }), tom: 'fechada' };
}

export function VagaDetalheView({
  vaga, onBack, actionLabel, onAction, actionDisabled, actionLoading, compatStatus, perfilFuncao, preenchidaPorMim, confirmarCandidatura, onVerCandidaturas, mostrarVerOutras,
}: {
  vaga: VagaDetalheData;
  onBack: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  compatStatus?: 'compativel' | 'incompativel' | 'aplicada' | 'encerrada';
  perfilFuncao?: string;
  preenchidaPorMim?: boolean;
  // true só quando `onAction` significa "candidatar-se a esta vaga" (as duas
  // telas do profissional). A clínica gerenciando candidatos usa o mesmo
  // `onAction`/`actionLabel` pra outra coisa ("Gerenciar candidatos") e não
  // deve passar isso — sem essa distinção explícita não dá pra saber, só
  // pelo `compatStatus`, se o botão é uma candidatura (as duas telas do
  // profissional nem sempre concordam sobre quando `compatStatus` vale
  // 'compativel').
  confirmarCandidatura?: boolean;
  // Chamado quando o profissional confirma a saída da tela de sucesso pelo
  // botão "Ver em Minhas candidaturas" — cada página decide pra onde isso
  // leva (rota própria ou troca de aba de uma SPA).
  onVerCandidaturas?: () => void;
  // Mostra "Ver outras vagas disponíveis →" junto do CTA principal mesmo com
  // a vaga aberta e compatível — hoje só quem manda `true` é a página pública
  // (visitante sem conta), pra sempre oferecer uma saída pra navegar mais
  // vagas. Nas outras telas o botão só aparece quando a vaga já fechou ou é
  // incompatível (`fechada || incompativel`), como sempre foi.
  mostrarVerOutras?: boolean;
}) {
  const local = buildEndereco(vaga);
  const localCurto = [vaga.bairro, vaga.cidade].filter(Boolean).join(', ') || vaga.cidade;
  const valorNum = typeof vaga.valor === 'string' ? parseFloat(vaga.valor) : vaga.valor;
  const horas = calcDuracaoHoras(vaga.horaInicio, vaga.horaFim);
  const horasLabel = horas % 1 === 0 ? `${horas}h` : `${horas.toFixed(1)}h`;

  const mostrarCta = !!(onAction && actionLabel);
  const [fotoAberta, setFotoAberta] = useState<FotoEstrutura | null>(null);
  const encerramento = encerramentoInfo(vaga, preenchidaPorMim);
  const fechada = !!encerramento;
  const confirmada = encerramento?.tom === 'confirmada';
  // `apagada` é quem manda no visual "desativado" — uma vaga confirmada pra
  // você é fechada (não aceita mais candidatura), mas não é apagada: os
  // detalhes continuam em destaque porque você ainda precisa deles.
  const apagada = fechada && !confirmada;
  const incompativel = compatStatus === 'incompativel';
  const aplicada = compatStatus === 'aplicada';

  // Candidatar-se ganha uma revisão antes de enviar (evita candidatura errada
  // entre plantões parecidos publicados no mesmo fim de semana) e uma tela de
  // sucesso mais clara, com o que vem a seguir — troca o toast (que passa
  // despercebido) por uma confirmação forte. Só entra em jogo pra quem pode
  // mesmo se candidatar: a clínica gerenciando candidatos usa o mesmo
  // `onAction`, mas nunca manda `compatStatus`, então não abre essa revisão.
  const ehCandidatura = !!confirmarCandidatura;
  const [sheetStage, setSheetStage] = useState<'closed' | 'confirm' | 'success'>('closed');
  const [confetti, setConfetti] = useState<{ dx: number; dy: number; spin: number; delay: number; color: string }[]>([]);
  const eraLoading = useRef(false);

  useEffect(() => {
    if (eraLoading.current && !actionLoading) {
      if (compatStatus === 'aplicada') {
        const cores = ['#00a19a', '#00706b', '#2e8cad', '#dcf4f2'];
        const n = 9;
        setConfetti(Array.from({ length: n }, (_, i) => {
          const angulo = (Math.PI * 2 * i) / n + (Math.random() * 0.5 - 0.25);
          const dist = 46 + Math.random() * 26;
          return {
            dx: Math.cos(angulo) * dist,
            dy: Math.sin(angulo) * dist - 6,
            spin: Math.random() * 140 - 70,
            delay: Math.random() * 0.12,
            color: cores[i % cores.length],
          };
        }));
        setSheetStage('success');
      } else if (sheetStage === 'confirm') {
        // Deu erro — o toast de erro (disparado por quem chama onAction) já avisa, só fecha a revisão.
        setSheetStage('closed');
      }
    }
    eraLoading.current = !!actionLoading;
  }, [actionLoading, compatStatus, sheetStage]);

  useEffect(() => {
    if (sheetStage === 'closed') return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && !(sheetStage === 'confirm' && actionLoading)) setSheetStage('closed');
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [sheetStage, actionLoading]);

  function handleCtaClick() {
    if (ehCandidatura) setSheetStage('confirm'); else onAction?.();
  }

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

      <div className={`rounded-3xl p-5 sm:p-6 mb-6 shadow-lg ${apagada ? 'bg-paws-header-closed' : 'bg-paws-header-open'}`}>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {encerramento ? (
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-extrabold pl-2.5 pr-3.5 py-[7px] rounded-full ${confirmada ? 'bg-white text-primaryDeep' : 'bg-white text-ink'}`}>
                {confirmada ? <CheckCircleIcon className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />} {encerramento.pill}
              </span>
            ) : vaga.status === 'ABERTA' && (
              <span className="inline-flex items-center gap-1.5 bg-white text-primaryDeep text-[11px] font-extrabold pl-2 pr-2.5 py-1 rounded-full">
                <span className="w-[6px] h-[6px] rounded-full shrink-0 bg-primary" />
                Aberta
              </span>
            )}
            <span className="text-white bg-white/15 text-xs font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full">{vaga.categoria}</span>
            {vaga.perto && <span className="bg-secondary text-white text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full">Perto de você</span>}
          </div>
          {vaga.id && (
            <ShareVagaButton
              vagaId={vaga.id}
              titulo={`${vaga.categoria}${vaga.clinica ? ` — ${vaga.clinica}` : ''}`}
              variant="on-color"
              align="right"
            />
          )}
        </div>

        <div className="flex items-center gap-3.5">
          {vaga.clinica && (
            vaga.clinicaId ? (
              <Link
                href={`/clinicas/${vaga.clinicaId}`}
                aria-label={`Ver perfil de ${vaga.clinica}`}
                className="w-14 h-14 rounded-2xl bg-white/90 p-[3px] shadow-lg shrink-0 hover:shadow-xl transition-shadow"
              >
                <div className="w-full h-full rounded-[13px] bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden">
                  {vaga.clinicaLogoUrl ? (
                    <img src={vaga.clinicaLogoUrl} alt={vaga.clinica} className="w-full h-full object-cover" />
                  ) : (
                    <BuildingIcon className="w-6 h-6" />
                  )}
                </div>
              </Link>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/90 p-[3px] shadow-lg shrink-0">
                <div className="w-full h-full rounded-[13px] bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden">
                  {vaga.clinicaLogoUrl ? (
                    <img src={vaga.clinicaLogoUrl} alt={vaga.clinica} className="w-full h-full object-cover" />
                  ) : (
                    <BuildingIcon className="w-6 h-6" />
                  )}
                </div>
              </div>
            )
          )}
          <div>
            <h1 className="text-white text-2xl font-extrabold mb-1">
              {vaga.clinicaId ? (
                <Link href={`/clinicas/${vaga.clinicaId}`} className="text-white hover:underline underline-offset-2">
                  {vaga.clinica}
                </Link>
              ) : (
                vaga.clinica || 'Detalhes da vaga'
              )}
            </h1>
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
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
        {encerramento && (
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-4 mb-4 ${confirmada ? 'bg-primaryTint' : 'bg-ink'}`}>
            <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 ${confirmada ? 'bg-primaryDeep/10' : 'bg-white/15'}`}>
              {confirmada ? (
                <CheckCircleIcon className="w-[18px] h-[18px] text-primaryDeep" />
              ) : (
                <LockIcon className="w-[18px] h-[18px] text-white" />
              )}
            </div>
            <div>
              <div className={`text-[11px] font-extrabold uppercase tracking-wide ${confirmada ? 'text-primaryDeep/65' : 'text-white/60'}`}>
                {confirmada ? 'Confirmada' : 'Encerrada'}
              </div>
              <div className={`text-[15px] font-extrabold ${confirmada ? 'text-primaryDeep' : 'text-white'}`}>
                {encerramento.motivo}
              </div>
            </div>
          </div>
        )}

        {compatStatus && !(compatStatus === 'encerrada' && fechada) && (
          <div className={`flex items-start gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-semibold leading-relaxed mb-4 ${
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className={`rounded-2xl p-[18px] ${apagada ? 'bg-gray-100' : 'bg-primaryTint'}`}>
            <div className={`w-[34px] h-[34px] rounded-[10px] text-white flex items-center justify-center mb-3 ${apagada ? 'bg-gray-400' : 'bg-primaryDeep'}`}>
              <MoneyIcon className="w-[18px] h-[18px]" />
            </div>
            <div className={`text-[11.5px] font-extrabold uppercase tracking-wide mb-1 ${apagada ? 'text-gray-400' : 'text-primaryDeep/75'}`}>Valor do plantão</div>
            <div className={`text-[22px] font-extrabold leading-tight ${apagada ? 'text-gray-500' : 'text-ink'}`}>R$ {valorNum}</div>
          </div>
          <div className={`rounded-2xl p-[18px] ${apagada ? 'bg-gray-100' : 'bg-primaryTint'}`}>
            <div className={`w-[34px] h-[34px] rounded-[10px] text-white flex items-center justify-center mb-3 ${apagada ? 'bg-gray-400' : 'bg-primary'}`}>
              <CalendarIcon className="w-[18px] h-[18px]" />
            </div>
            <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Quando</div>
            <div className={`text-[22px] font-extrabold leading-tight ${apagada ? 'text-gray-500' : 'text-ink'}`}>{formatQuando(vaga.data)}</div>
            <div className="text-[13px] font-bold text-gray-500 mt-1">{vaga.horaInicio} – {vaga.horaFim} · {horasLabel}</div>
          </div>
          <div className={`rounded-2xl p-[18px] ${apagada ? 'bg-gray-100' : 'bg-primaryTint'}`}>
            <div className={`w-[34px] h-[34px] rounded-[10px] text-white flex items-center justify-center mb-3 ${apagada ? 'bg-gray-400' : 'bg-primary'}`}>
              <PinIcon className="w-[18px] h-[18px]" />
            </div>
            <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Onde</div>
            <div className={`text-[22px] font-extrabold leading-tight ${apagada ? 'text-gray-500' : 'text-ink'}`}>{localCurto}</div>
            <a href={mapsLink(local)} target="_blank" rel="noopener noreferrer" className={`text-[13px] font-semibold mt-1 inline-block hover:underline ${apagada ? 'text-gray-400' : 'text-primary'}`}>
              Ver no mapa →
            </a>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 mb-4">
          <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-2">Endereço completo</div>
          <div className="text-[14.5px] font-semibold text-ink mb-2">{local}</div>
          <a href={mapsLink(local)} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline">
            Ver no Google Maps →
          </a>
        </div>

        {vaga.clinicaFotos && vaga.clinicaFotos.length > 0 && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-4">
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

        {vaga.descricao && (
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-2">Descrição da vaga</div>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{vaga.descricao}</div>
          </div>
        )}
      </div>

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
            {incompativel || aplicada || apagada ? (
              <div className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 ${incompativel ? 'bg-white shadow-lg' : aplicada ? 'bg-primaryTint shadow-lg' : 'bg-ink shadow-lg'}`}>
                <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 ${incompativel ? 'bg-red-50' : aplicada ? 'bg-primaryDeep/10' : 'bg-white/15'}`}>
                  {incompativel ? (
                    <WarningIcon className="w-[17px] h-[17px] text-danger" />
                  ) : aplicada ? (
                    <CheckCircleIcon className="w-[17px] h-[17px] text-primaryDeep" />
                  ) : (
                    <LockIcon className="w-[17px] h-[17px] text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-[10.5px] font-extrabold uppercase tracking-wide ${incompativel ? 'text-danger/80' : aplicada ? 'text-primaryDeep/70' : 'text-white/60'}`}>
                    {incompativel ? 'Perfil incompatível' : aplicada ? 'Candidatura enviada' : 'Encerrada'}
                  </div>
                  <div className={`text-[13.5px] font-extrabold leading-snug ${incompativel ? 'text-ink' : aplicada ? 'text-primaryDeep' : 'text-white'}`}>
                    {incompativel ? <>Essa vaga é para {vaga.categoria}</> : aplicada ? 'Acompanhe o status em Minhas candidaturas' : 'Vaga concluída'}
                  </div>
                </div>
              </div>
            ) : (
              <button
                disabled={actionDisabled || actionLoading}
                onClick={handleCtaClick}
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
            )}
            {(fechada || incompativel || mostrarVerOutras) && (
              <button onClick={onBack} className="w-full h-[60px] mt-2.5 flex items-center justify-center rounded-2xl text-[13.5px] font-extrabold text-white bg-white/10 hover:bg-white/15">
                Ver outras vagas disponíveis →
              </button>
            )}
          </div>
          <div
            className="md:hidden sticky bottom-0 left-0 right-0 -mx-8 px-8 pt-6 pb-4"
            style={{ background: 'linear-gradient(to top, #F5F8F6 65%, transparent)' }}
          >
            {incompativel || aplicada || apagada ? (
              <div className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 ${
                incompativel ? 'bg-white border border-red-100 shadow-[0_4px_14px_rgba(4,45,76,0.08)]' : aplicada ? 'bg-primaryTint' : 'bg-ink shadow-[0_4px_14px_rgba(4,45,76,0.08)]'
              }`}>
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${incompativel ? 'bg-red-50' : aplicada ? 'bg-primaryDeep/10' : 'bg-white/15'}`}>
                  {incompativel ? (
                    <WarningIcon className="w-4 h-4 text-danger" />
                  ) : aplicada ? (
                    <CheckCircleIcon className="w-4 h-4 text-primaryDeep" />
                  ) : (
                    <LockIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-[10px] font-extrabold uppercase tracking-wide ${incompativel ? 'text-danger/80' : aplicada ? 'text-primaryDeep/70' : 'text-white/60'}`}>
                    {incompativel ? 'Perfil incompatível' : aplicada ? 'Candidatura enviada' : 'Encerrada'}
                  </div>
                  <div className={`text-[12.5px] font-extrabold leading-snug ${incompativel ? 'text-ink' : aplicada ? 'text-primaryDeep' : 'text-white'}`}>
                    {incompativel ? <>Essa vaga é para {vaga.categoria}</> : aplicada ? 'Acompanhe o status em Minhas candidaturas' : 'Vaga concluída'}
                  </div>
                </div>
              </div>
            ) : (
              <button
                disabled={actionDisabled || actionLoading}
                onClick={handleCtaClick}
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
            )}
            {(fechada || incompativel || mostrarVerOutras) && (
              <button onClick={onBack} className="w-full h-[56px] mt-2 flex items-center justify-center rounded-2xl text-[13px] font-extrabold text-primaryDeep hover:underline">
                Ver outras vagas disponíveis →
              </button>
            )}
          </div>
        </>
      )}

      {sheetStage !== 'closed' && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(4,20,25,0.55)] flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget && !(sheetStage === 'confirm' && actionLoading)) setSheetStage('closed'); }}
        >
          <div className="w-full sm:max-w-[400px] bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
            {sheetStage === 'confirm' ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-primaryDeep">Confirmar candidatura</span>
                  <button
                    onClick={() => !actionLoading && setSheetStage('closed')}
                    disabled={actionLoading}
                    aria-label="Fechar"
                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 disabled:opacity-40"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[19px] font-extrabold text-ink mb-4">Revise antes de enviar</div>

                <div className="bg-gray-50 rounded-2xl p-4 mb-3.5">
                  <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-gray-200">
                    <div className="w-9 h-9 rounded-[10px] bg-white border border-gray-200 text-gray-300 flex items-center justify-center shrink-0 overflow-hidden">
                      {vaga.clinicaLogoUrl ? (
                        <img src={vaga.clinicaLogoUrl} alt={vaga.clinica} className="w-full h-full object-cover" />
                      ) : (
                        <BuildingIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-extrabold text-ink truncate">{vaga.clinica}</div>
                      <div className="text-[11.5px] font-bold text-gray-500">{vaga.categoria}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] font-bold text-gray-500">Quando</span>
                      <span className="text-[13.5px] font-extrabold text-ink text-right">{formatQuando(vaga.data)} · {vaga.horaInicio} – {vaga.horaFim}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] font-bold text-gray-500">Duração</span>
                      <span className="text-[13.5px] font-extrabold text-ink">{horasLabel}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] font-bold text-gray-500">Valor</span>
                      <span className="text-[13.5px] font-extrabold text-ink">R$ {valorNum}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] font-bold text-gray-500">Onde</span>
                      <span className="text-[13.5px] font-extrabold text-ink text-right">{localCurto}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-primaryTint rounded-2xl px-3.5 py-3 mb-4">
                  <InfoIcon className="w-4 h-4 text-primaryDeep shrink-0 mt-px" />
                  <p className="text-[12.5px] font-semibold text-primaryDeep leading-relaxed m-0">
                    A clínica analisa seu perfil e você recebe uma resposta por aqui — geralmente em até 24h.
                  </p>
                </div>

                <button
                  disabled={actionLoading}
                  onClick={onAction}
                  className="w-full py-[15px] rounded-2xl text-[14.5px] font-extrabold bg-primary hover:bg-primaryDark text-white flex items-center justify-center disabled:opacity-85"
                >
                  {actionLoading ? <PawTrailInline /> : 'Confirmar candidatura'}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => setSheetStage('closed')}
                  className="w-full py-3 mt-1.5 rounded-2xl text-[13px] font-extrabold text-gray-500 hover:text-ink disabled:opacity-40"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="relative h-[110px] flex items-center justify-center mb-1">
                  <span className="absolute inset-0 pointer-events-none">
                    {confetti.map((b, i) => (
                      <span
                        key={i}
                        className="cand-paw-bit"
                        style={{ '--dx': `${b.dx}px`, '--dy': `${b.dy}px`, '--spin': `${b.spin}deg`, animationDelay: `${b.delay}s`, color: b.color } as CSSProperties}
                      >
                        <PawIcon className="w-full h-full" />
                      </span>
                    ))}
                  </span>
                  <span className="cand-ring absolute w-[88px] h-[88px] rounded-full border-2 border-primary" />
                  <span className="cand-stamp relative w-[88px] h-[88px] rounded-full bg-primaryTint flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(0,112,107,0.45)]">
                    <PawIcon className="w-11 h-10 text-primaryDeep" />
                  </span>
                  <span className="cand-badge absolute top-[62px] left-[62px] w-[30px] h-[30px] rounded-full bg-primaryDeep border-[3px] border-white flex items-center justify-center">
                    <CheckIcon className="w-3.5 h-3.5 text-white" />
                  </span>
                </div>

                <div className="cand-fade text-[19px] font-extrabold text-ink mt-1 mb-1.5" style={{ animationDelay: '.5s' }}>
                  Candidatura enviada!
                </div>
                <p className="cand-fade text-[13px] leading-relaxed text-gray-700 mb-4" style={{ animationDelay: '.58s' }}>
                  A {vaga.clinica} recebeu seu interesse no plantão de {formatQuando(vaga.data).toLowerCase()}. Você não precisa fazer mais nada agora.
                </p>

                <div className="cand-fade text-left mb-4" style={{ animationDelay: '.68s' }}>
                  <div className="relative flex gap-3 pb-4">
                    <span className="absolute left-[8px] top-[20px] bottom-[-2px] w-[2px] bg-gray-200" />
                    <span className="relative z-10 w-[17px] h-[17px] rounded-full bg-primaryDeep flex items-center justify-center shrink-0 mt-px">
                      <CheckIcon className="w-[9px] h-[9px] text-white" />
                    </span>
                    <div>
                      <div className="text-[13px] font-extrabold text-ink">Candidatura enviada</div>
                      <div className="text-[12px] text-gray-500 mt-0.5">Agora</div>
                    </div>
                  </div>
                  <div className="relative flex gap-3 pb-4">
                    <span className="absolute left-[8px] top-[20px] bottom-[-2px] w-[2px] bg-gray-200" />
                    <span className="cand-dot-now relative z-10 w-[17px] h-[17px] rounded-full bg-white border-[2.5px] border-primary shrink-0 mt-px" />
                    <div>
                      <div className="text-[13px] font-extrabold text-ink">Em análise pela clínica</div>
                      <div className="text-[12px] text-gray-500 mt-0.5">Normalmente responde em até 24h</div>
                    </div>
                  </div>
                  <div className="relative flex gap-3">
                    <span className="relative z-10 w-[17px] h-[17px] rounded-full bg-white border-2 border-gray-300 shrink-0 mt-px" />
                    <div>
                      <div className="text-[13px] font-extrabold text-gray-400">Resposta</div>
                      <div className="text-[12px] text-gray-500 mt-0.5">Avisamos pelas notificações do app e em Minhas candidaturas</div>
                    </div>
                  </div>
                </div>

                <p className="cand-fade text-[11.5px] text-gray-400 leading-relaxed mb-4" style={{ animationDelay: '.74s' }}>
                  Mudou de ideia? Você pode cancelar essa candidatura em Minhas candidaturas antes da clínica responder.
                </p>

                <div className="cand-fade" style={{ animationDelay: '.8s' }}>
                  <button
                    onClick={() => { setSheetStage('closed'); onVerCandidaturas?.(); }}
                    className="w-full py-[15px] rounded-2xl text-[14.5px] font-extrabold bg-primary hover:bg-primaryDark text-white"
                  >
                    Ver em Minhas candidaturas →
                  </button>
                  <button
                    onClick={() => setSheetStage('closed')}
                    className="w-full py-3 mt-1.5 rounded-2xl text-[13px] font-extrabold text-gray-500 hover:text-ink"
                  >
                    Voltar para vagas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
