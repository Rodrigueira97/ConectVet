'use client';
import { ReactNode } from 'react';

export function EmptyState({
  icon, tone = 'neutral', title, description, actionLabel, actionIcon, onAction, actionVariant = 'solid',
}: {
  icon: ReactNode;
  tone?: 'neutral' | 'rose';
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  actionVariant?: 'solid' | 'ghost';
}) {
  return (
    <div className="flex flex-col items-center text-center max-w-[360px] mx-auto py-6">
      <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mb-5 shrink-0 ${tone === 'rose' ? 'bg-rose-50 text-rose-400' : 'bg-gray-100 text-gray-400'}`}>
        {icon}
      </div>
      <h3 className="text-[16.5px] font-extrabold text-ink mb-2">{title}</h3>
      <p className="text-[13.5px] text-gray-500 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={
            actionVariant === 'ghost'
              ? 'mt-5 inline-flex items-center gap-1.5 bg-white text-ink border-[1.5px] border-gray-200 text-[13.5px] font-extrabold px-5 py-2.5 rounded-xl hover:border-primary hover:text-primaryDeep'
              : 'mt-5 inline-flex items-center gap-1.5 bg-primary text-white text-[13.5px] font-extrabold px-5 py-2.5 rounded-xl shadow-sm hover:bg-primaryDark'
          }
        >
          {actionIcon}
          {actionLabel}
        </button>
      )}
    </div>
  );
}
