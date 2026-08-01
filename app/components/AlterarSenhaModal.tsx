'use client';
import { useEffect, useState } from 'react';
import { ApiError, alterarSenha } from '@/lib/api';
import { useToast } from './Toast';

export function AlterarSenhaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erros, setErros] = useState<{ novaSenha?: string; confirmarSenha?: string }>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') fechar();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function fechar() {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
    setErros({});
    onClose();
  }

  async function salvar() {
    const novosErros: typeof erros = {};
    if (novaSenha.length < 4) novosErros.novaSenha = 'A nova senha precisa ter pelo menos 4 caracteres.';
    if (!confirmarSenha || confirmarSenha !== novaSenha) novosErros.confirmarSenha = 'As senhas não são iguais.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setSalvando(true);
    try {
      await alterarSenha(senhaAtual, novaSenha);
      toast.success('Senha alterada');
      fechar();
    } catch (err) {
      toast.error('Não foi possível alterar a senha', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-ink/30 flex items-center justify-center p-4" onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[360px] bg-white rounded-2xl shadow-[0_24px_60px_rgba(4,45,76,0.28)] p-6">
        <div className="text-base font-extrabold text-ink mb-1">Alterar senha</div>
        <div className="text-xs text-gray-500 mb-4">Sua sessão atual continua ativa depois de salvar.</div>

        <div className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Senha atual</span>
            <input
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className={`px-3 py-2.5 rounded-lg border text-sm ${erros.novaSenha ? 'border-danger' : 'border-gray-300'}`}
            />
            {erros.novaSenha && <span className="text-xs font-semibold text-danger">{erros.novaSenha}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Confirmar nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className={`px-3 py-2.5 rounded-lg border text-sm ${erros.confirmarSenha ? 'border-danger' : 'border-gray-300'}`}
            />
            {erros.confirmarSenha && <span className="text-xs font-semibold text-danger">{erros.confirmarSenha}</span>}
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={fechar} className="px-4 py-2.5 rounded-lg text-gray-500 text-sm font-bold hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-2.5 rounded-lg bg-ink text-white text-sm font-bold shadow-sm disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </div>
      </div>
    </div>
  );
}
