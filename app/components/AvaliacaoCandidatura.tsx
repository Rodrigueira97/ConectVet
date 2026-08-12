'use client';
import { useState } from 'react';
import { ApiError, Avaliacao, criarAvaliacao } from '@/lib/api';
import { useToast } from './Toast';

export function AvaliacaoCandidatura({
  candidaturaId, autorProprio, labelForm, labelFeita, labelOutra, avaliacoes, onAvaliado,
}: {
  candidaturaId: string;
  autorProprio: 'CLINICA' | 'PROFISSIONAL';
  labelForm: string;
  labelFeita: string;
  labelOutra: string;
  // Controlado pelo componente pai (em vez de estado interno) pra que os dois lugares onde essa
  // avaliação pode aparecer — "Minhas candidaturas"/"Painel" e a aba "Avaliações" — fiquem sempre
  // em sincronia: os dois leem do mesmo Record<candidaturaId, Avaliacao[]> e um só re-render
  // depois de enviar já atualiza ambos.
  avaliacoes: Avaliacao[];
  onAvaliado?: (avaliacao: Avaliacao) => void;
}) {
  const toast = useToast();
  const [nota, setNota] = useState(5);
  const [enviando, setEnviando] = useState(false);

  const minha = avaliacoes.find((a) => a.autor === autorProprio);
  const daOutraParte = avaliacoes.find((a) => a.autor !== autorProprio);

  // Comentário fica oculto por enquanto dos dois lados — só estrela. O campo
  // continua existindo no back-end e em avaliações antigas (por isso a
  // exibição abaixo ainda mostra `comentario` se já tiver sido salvo antes).
  async function enviar() {
    setEnviando(true);
    try {
      const nova = await criarAvaliacao({
        candidaturaId,
        nota,
      });
      onAvaliado?.(nova);
      toast.success('Avaliação enviada', { message: 'Obrigado pelo feedback — isso ajuda outros profissionais e clínicas na plataforma.' });
    } catch (err) {
      toast.error('Não foi possível enviar a avaliação', {
        message: err instanceof ApiError ? err.message : undefined,
        action: { label: 'Tentar novamente', onClick: enviar },
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-3.5 pt-3.5 border-t border-gray-100">
      <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-2.5">Avaliação do plantão</div>

      {minha ? (
        <div className="bg-gray-50 rounded-xl px-3.5 py-3 mb-2.5">
          <div className="flex items-center justify-between gap-2.5 mb-1">
            <span className="text-[12.5px] font-extrabold text-ink">{labelFeita}</span>
            <span className="text-amber-500 text-sm tracking-widest">{'★'.repeat(minha.nota)}{'☆'.repeat(5 - minha.nota)}</span>
          </div>
          {minha.comentario && <div className="text-[13px] text-gray-700 leading-relaxed">{minha.comentario}</div>}
        </div>
      ) : (
        <div className="mb-2.5">
          <div className="text-xs font-bold text-gray-700 mb-2">{labelForm}</div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(n)}
                aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                className={`text-2xl leading-none ${n <= nota ? 'text-amber-500' : 'text-gray-200'} hover:scale-110 transition-transform`}
              >
                ★
              </button>
            ))}
          </div>
          <button onClick={enviar} disabled={enviando} className="px-4 py-2 rounded-lg bg-primary hover:bg-primaryDark text-white text-xs font-bold disabled:opacity-60">
            {enviando ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </div>
      )}

      {daOutraParte ? (
        <div className="bg-gray-50 rounded-xl px-3.5 py-3">
          <div className="flex items-center justify-between gap-2.5 mb-1">
            <span className="text-[12.5px] font-extrabold text-ink">{labelOutra}</span>
            <span className="text-amber-500 text-sm tracking-widest">{'★'.repeat(daOutraParte.nota)}{'☆'.repeat(5 - daOutraParte.nota)}</span>
          </div>
          {daOutraParte.comentario && <div className="text-[13px] text-gray-700 leading-relaxed">{daOutraParte.comentario}</div>}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic">Aguardando avaliação {autorProprio === 'PROFISSIONAL' ? 'da clínica' : 'do profissional'}.</div>
      )}
    </div>
  );
}
