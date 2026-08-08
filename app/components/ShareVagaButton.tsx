'use client';
import { useEffect, useRef, useState } from 'react';
import { LinkIcon, MailIcon, ShareIcon, WhatsappIcon } from './icons';
import { useToast } from './Toast';

async function copiarTexto(texto: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  // Contextos sem clipboard API (http, navegadores mais antigos): mesmo
  // truque de sempre, um textarea invisível só pra segurar o document.execCommand.
  const area = document.createElement('textarea');
  area.value = texto;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.focus();
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

// Botão de compartilhar de uma vaga — no card do feed (ao lado do favoritar)
// e no cabeçalho da página da vaga. Onde o navegador oferece a folha de
// compartilhamento nativa (a maioria dos celulares), usamos ela — é o atalho
// que a pessoa já conhece. Onde não tem suporte (a maioria dos desktops),
// abrimos nosso próprio menu com copiar link, WhatsApp e e-mail.
export function ShareVagaButton({
  vagaId,
  titulo,
  variant = 'default',
  align = 'left',
  className,
}: {
  vagaId: string;
  titulo: string;
  variant?: 'default' | 'on-color';
  align?: 'left' | 'right';
  className?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClickFora(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, [open]);

  function link() {
    return `${window.location.origin}/vagas/${vagaId}`;
  }

  async function onClickCompartilhar(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: `${titulo} — Clique para saber mais.`, url: link() });
      } catch (err) {
        // AbortError = a pessoa cancelou a folha nativa, não é um erro nosso.
        if ((err as Error)?.name !== 'AbortError') setOpen(true);
      }
      return;
    }
    setOpen((v) => !v);
  }

  async function onCopiarLink(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await copiarTexto(link());
      toast.success('Link copiado!');
    } catch {
      toast.error('Não deu pra copiar o link', { message: 'Tente selecionar e copiar manualmente.' });
    }
    setOpen(false);
  }

  function onWhatsapp(e: React.MouseEvent) {
    e.stopPropagation();
    const texto = `Clique para saber mais: ${link()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
  }

  function onEmail(e: React.MouseEvent) {
    e.stopPropagation();
    const assunto = `Vaga: ${titulo}`;
    const corpo = `Dá uma olhada nessa vaga no ConectVet! Clique para saber mais:\n\n${link()}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    setOpen(false);
  }

  const botaoBase = variant === 'on-color'
    ? `bg-white/15 text-white hover:bg-white/25 ${open ? 'bg-white/25' : ''}`
    : `bg-gray-100 text-gray-400 hover:bg-primaryTint hover:text-primaryDeep ${open ? 'bg-primaryTint text-primaryDeep' : ''}`;

  return (
    <div className="relative shrink-0" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={onClickCompartilhar}
        aria-label="Compartilhar vaga"
        aria-haspopup="true"
        aria-expanded={open}
        className={`w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0 transition-colors ${botaoBase} ${className || ''}`}
      >
        <ShareIcon className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-12 w-[230px] bg-white border border-gray-200 rounded-2xl shadow-[0_12px_32px_rgba(4,45,76,0.14)] p-1.5 z-30 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <p className="px-2.5 pt-1.5 pb-2 text-[10.5px] font-extrabold uppercase tracking-wide text-gray-400">Compartilhar vaga</p>
          <button onClick={onCopiarLink} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] hover:bg-gray-50 text-left">
            <span className="w-8 h-8 rounded-[9px] bg-primaryTint text-primaryDeep flex items-center justify-center shrink-0"><LinkIcon className="w-4 h-4" /></span>
            <span className="text-[13px] font-semibold text-ink">Copiar link</span>
          </button>
          <button onClick={onWhatsapp} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] hover:bg-gray-50 text-left">
            <span className="w-8 h-8 rounded-[9px] bg-[#25d366]/15 text-[#25d366] flex items-center justify-center shrink-0"><WhatsappIcon className="w-4 h-4" /></span>
            <span className="text-[13px] font-semibold text-ink">WhatsApp</span>
          </button>
          <button onClick={onEmail} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] hover:bg-gray-50 text-left">
            <span className="w-8 h-8 rounded-[9px] bg-gray-100 text-secondary flex items-center justify-center shrink-0"><MailIcon className="w-4 h-4" /></span>
            <span className="text-[13px] font-semibold text-ink">E-mail</span>
          </button>
        </div>
      )}
    </div>
  );
}
