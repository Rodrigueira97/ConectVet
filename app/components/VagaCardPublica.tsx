'use client';
import { useRouter } from 'next/navigation';
import { formatDataBR, localDaVaga, mapsLink, motivoVagaFechada, urgenciaLabel, vagaEncerrada } from '@/lib/mockData';
import { CATEGORIA_LABEL, Vaga } from '@/lib/api';
import { RatingBadge } from '@/app/components/RatingBadge';
import { BuildingIcon, CalendarIcon, ClockIcon, LockIcon, PinIcon } from '@/app/components/icons';

// Card de vaga pra quem ainda não tem conta — mesma linguagem visual do card
// do painel logado (app/profissional/page.tsx), mas sem favoritar (precisa de
// conta) e sem chip de compatibilidade (não dá pra saber a função de quem tá
// só navegando). O CTA sempre manda pra página pública da vaga; é lá que mora
// o gate de login, não aqui no card.
export function VagaCardPublica({ vaga: v }: { vaga: Vaga }) {
  const router = useRouter();
  const encerrada = vagaEncerrada(v);
  const urgencia = urgenciaLabel(v);
  const local = localDaVaga(v);
  const localCurto = [v.bairro, `${v.cidade} - ${v.estado}`].filter(Boolean).join(', ');

  return (
    <div
      onClick={() => router.push(`/vagas/${v.id}`)}
      className={`flex flex-col gap-3 border rounded-2xl p-4 cursor-pointer transition-[border-color,box-shadow] duration-150 ${
        encerrada
          ? 'bg-gray-50 border-gray-100 hover:border-secondary/30'
          : 'bg-white border-gray-200 shadow-sm hover:border-secondary/40 hover:shadow-[0_4px_14px_rgba(4,45,76,0.06)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2.5 min-w-0">
          <div className={`w-[42px] h-[42px] rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${encerrada ? 'bg-gray-100 border-gray-100 text-gray-300 grayscale opacity-70' : 'bg-white border-gray-200 text-gray-300'}`}>
            {v.clinica?.logoUrl ? (
              <img src={v.clinica.logoUrl} alt={v.clinica.nome} className="w-full h-full object-cover" />
            ) : (
              <BuildingIcon className="w-[18px] h-[18px]" />
            )}
          </div>
          <div className="min-w-0">
            <div className={`text-[16.5px] font-extrabold truncate ${encerrada ? 'text-gray-400' : 'text-ink'}`}>{v.clinica?.nome}</div>
            <div className={`mt-0.5 ${encerrada ? 'opacity-50 grayscale' : ''}`}><RatingBadge notaMedia={v.clinica?.notaMedia} totalAvaliacoes={v.clinica?.totalAvaliacoes} /></div>
          </div>
        </div>
        <div className={`font-extrabold text-[15px] px-3 py-1.5 rounded-[11px] whitespace-nowrap shrink-0 ${encerrada ? 'bg-gray-100 text-gray-500' : 'bg-primaryTint text-primaryDeep'}`}>
          R$ {v.valor}
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${encerrada ? 'bg-gray-100 text-gray-400' : 'bg-primaryTint text-primaryDeep'}`}>
          {CATEGORIA_LABEL[v.categoria]}
        </span>
        {urgencia && (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide">{urgencia}</span>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-3 rounded-[13px] overflow-hidden ${encerrada ? 'bg-gray-100' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100">
          <CalendarIcon className={`w-[15px] h-[15px] shrink-0 ${encerrada ? 'text-gray-400' : 'text-primary'}`} />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Data</span>
            <span className={`text-[12.5px] font-bold truncate ${encerrada ? 'text-gray-500' : 'text-ink'}`}>{formatDataBR(v.data)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b sm:border-b-0 sm:border-r border-gray-100">
          <ClockIcon className={`w-[15px] h-[15px] shrink-0 ${encerrada ? 'text-gray-400' : 'text-primary'}`} />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Horário</span>
            <span className={`text-[12.5px] font-bold truncate ${encerrada ? 'text-gray-500' : 'text-ink'}`}>{v.horaInicio} – {v.horaFim}</span>
          </div>
        </div>
        <a
          href={mapsLink(local)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100"
        >
          <PinIcon className={`w-[15px] h-[15px] shrink-0 ${encerrada ? 'text-gray-400' : 'text-primary'}`} />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide shrink-0">Local</span>
            <span className={`text-[12.5px] font-bold truncate ${encerrada ? 'text-gray-500' : 'text-ink'}`}>{localCurto}</span>
          </div>
        </a>
      </div>

      {v.descricao && (
        <div className="text-[12.5px] text-gray-500 leading-relaxed line-clamp-2">{v.descricao}</div>
      )}

      {encerrada ? (
        <div className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-[11px] bg-ink">
          <div className="w-7 h-7 rounded-[9px] bg-white/15 flex items-center justify-center shrink-0">
            <LockIcon className="w-[15px] h-[15px] text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-white/60">Encerrada</div>
            <div className="text-[13.5px] font-extrabold text-white leading-snug">{motivoVagaFechada(v)}</div>
          </div>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/vagas/${v.id}`); }}
          className="w-full py-2.5 rounded-[11px] text-[13px] font-bold bg-primary hover:bg-primaryDark text-white"
        >
          Candidatar-se
        </button>
      )}
    </div>
  );
}
