import { PawIcon } from './icons';

export function PawTrailLoader({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`inline-flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-4 shadow-[0_4px_16px_rgba(4,45,76,0.10)] ${className}`}>
      <div className="flex items-end gap-2.5 h-[18px]">
        {[0, 1, 2, 3].map((i) => (
          <PawIcon
            key={i}
            className="w-[19px] h-[17px] text-primary animate-paw-step"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      {label && <div className="text-[12px] font-bold text-primaryDeep">{label}</div>}
    </div>
  );
}

// Variante compacta, sem o card branco, pra usar dentro de um botão — herda a cor do texto
// do próprio botão via currentColor, então não muda de tamanho/cor quando o botão troca de estado.
export function PawTrailInline({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-1.5 h-3.5 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <PawIcon key={i} className="w-3.5 h-3 animate-paw-step" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
