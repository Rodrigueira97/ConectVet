'use client';
import { useEffect } from 'react';
import { Vaga, Clinica, CATEGORIA_LABEL } from '@/lib/api';
import { buildEndereco } from '@/lib/mockData';
import { CloseIcon, DownloadIcon } from './icons';

function formatDataBR(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatDataHoraBR(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatCNPJ(cnpj: string) {
  const d = (cnpj || '').replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Recibo simples de repasse (não é nota fiscal) — cobre o que a clínica precisa pra
// conferência interna: quem foi pago, por qual plantão, e o detalhamento bruto/taxa/líquido
// que já aparece hoje na tela de confirmação de pagamento. Gerado 100% no cliente: o botão
// "Baixar recibo" chama window.print(), e o CSS de @media print (globals.css) esconde o
// resto do app e deixa só o conteúdo de #recibo-print — o navegador oferece "Salvar como PDF".
export function ReciboModal({ vaga, clinica, onClose }: { vaga: Vaga; clinica: Clinica; onClose: () => void }) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const pagamento = vaga.pagamento;
  if (!pagamento) return null;

  const hired = (vaga.candidaturas || []).find((c) => c.status === 'ACEITO');
  const local = buildEndereco(vaga);
  const enderecoClinica = buildEndereco(clinica);

  return (
    <div className="fixed inset-0 z-[90] bg-ink/30 flex items-center justify-center p-4 print:static print:bg-white print:p-0 print:block" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-[0_24px_60px_rgba(4,45,76,0.28)] print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
        <div className="print:hidden flex items-center justify-between px-6 pt-5 pb-1">
          <div className="text-base font-extrabold text-ink">Recibo do plantão</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div id="recibo-print" className="p-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div>
              <div className="text-lg font-extrabold text-ink">Recibo de pagamento</div>
              <div className="text-xs text-gray-400 mt-0.5">Nº {pagamento.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div className="text-[11px] font-extrabold text-primaryDeep bg-primaryTint px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0">
              {pagamento.status === 'LIBERADO' ? 'Pago' : 'Retido'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide mb-0.5">Clínica contratante</div>
              <div className="font-bold text-ink">{clinica.nome}</div>
              {clinica.cnpj && <div className="text-gray-500 text-xs mt-0.5">CNPJ {formatCNPJ(clinica.cnpj)}</div>}
              {enderecoClinica && <div className="text-gray-500 text-xs">{enderecoClinica}</div>}
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide mb-0.5">Profissional</div>
              <div className="font-bold text-ink">{hired?.profissional?.nome || 'Profissional'}</div>
              <div className="text-gray-500 text-xs mt-0.5">{CATEGORIA_LABEL[vaga.categoria]}</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide mb-2">Plantão</div>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <div className="text-gray-500">Data</div><div className="font-bold text-ink text-right">{formatDataBR(vaga.data)}</div>
              <div className="text-gray-500">Horário</div><div className="font-bold text-ink text-right">{vaga.horaInicio} – {vaga.horaFim}</div>
              <div className="text-gray-500">Local</div><div className="font-bold text-ink text-right">{local}</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Valor cobrado da clínica</span><span className="font-bold text-ink">R$ {Number(pagamento.valorBruto).toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Taxa da ConectVet</span><span>− R$ {Number(pagamento.taxa).toFixed(2)}</span></div>
            <div className="flex justify-between font-extrabold pt-2 border-t border-gray-200 text-ink"><span>Valor repassado ao profissional</span><span>R$ {Number(pagamento.valorLiquido).toFixed(2)}</span></div>
          </div>

          {pagamento.liberadoEm && (
            <div className="text-xs text-gray-400 mt-4">Pagamento confirmado em {formatDataHoraBR(pagamento.liberadoEm)}.</div>
          )}
        </div>

        <div className="print:hidden flex justify-end gap-2 px-6 pb-5 pt-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-gray-500 text-sm font-bold hover:bg-gray-50">
            Fechar
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-white text-sm font-bold shadow-sm"
          >
            <DownloadIcon className="w-3.5 h-3.5" /> Baixar recibo
          </button>
        </div>
      </div>
    </div>
  );
}
