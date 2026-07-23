'use client';
import { useState } from 'react';
import { ApiError, Avaliacao, criarAvaliacao } from '@/lib/api';

const NOTAS = [5, 4, 3, 2, 1];
const LABEL_NOTA = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];

export function AvaliacaoCandidatura({
  candidaturaId, autorProprio, labelForm, labelFeita, labelOutra, corBotao, avaliacoesIniciais,
}: {
  candidaturaId: string;
  autorProprio: 'CLINICA' | 'PROFISSIONAL';
  labelForm: string;
  labelFeita: string;
  labelOutra: string;
  corBotao: string;
  avaliacoesIniciais: Avaliacao[];
}) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>(avaliacoesIniciais);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const minha = avaliacoes.find((a) => a.autor === autorProprio);
  const daOutraParte = avaliacoes.find((a) => a.autor !== autorProprio);

  async function enviar() {
    setErro('');
    setEnviando(true);
    try {
      const nova = await criarAvaliacao({ candidaturaId, nota, comentario: comentario || undefined });
      setAvaliacoes((prev) => [...prev, nova]);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
      {minha ? (
        <div className="text-sm text-gray-600">
          <span className="font-bold">{labelFeita}: </span>
          Nota {minha.nota}/5{minha.comentario ? ` — "${minha.comentario}"` : ''}
        </div>
      ) : (
        <div>
          <div className="text-xs font-bold mb-2">{labelForm}</div>
          <select value={nota} onChange={(e) => setNota(Number(e.target.value))} className="px-2.5 py-1.5 rounded-md border border-gray-300 text-sm mb-2">
            {NOTAS.map((n) => <option key={n} value={n}>{n} — {LABEL_NOTA[n]}</option>)}
          </select>
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentário (opcional)" rows={2} className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm mb-2" />
          {erro && <div className="text-xs font-semibold text-danger mb-2">{erro}</div>}
          <button onClick={enviar} disabled={enviando} className={`px-3.5 py-2 rounded-lg ${corBotao} text-white text-xs font-bold disabled:opacity-60`}>
            {enviando ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </div>
      )}

      {daOutraParte && (
        <div className="text-sm text-gray-600">
          <span className="font-bold">{labelOutra}: </span>
          Nota {daOutraParte.nota}/5{daOutraParte.comentario ? ` — "${daOutraParte.comentario}"` : ''}
        </div>
      )}
    </div>
  );
}
