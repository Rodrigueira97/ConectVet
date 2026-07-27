'use client';
import { useEffect, useState } from 'react';
import { CheckIcon, CloseIcon, FileIcon, UploadIcon } from './icons';

export function FileField({
  label, files, onChange, error, required, accept, hint,
}: {
  label: string;
  files: File | null;
  onChange: (files: FileList | null) => void;
  error?: string;
  required?: boolean;
  accept?: string;
  hint?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = !!files && files.type.startsWith('image/');

  useEffect(() => {
    if (!isImage || !files) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(files);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [files, isImage]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}{required && <span className="text-danger"> *</span>}</span>
      {files ? (
        <div className={`relative flex items-center gap-3 rounded-xl border p-2.5 bg-white ${error ? 'border-danger' : 'border-gray-200'}`}>
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
            {isImage && previewUrl ? (
              <img src={previewUrl} alt={files.name} className="w-full h-full object-cover" />
            ) : (
              <FileIcon className="w-6 h-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-gray-800 truncate">{files.name}</div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-primaryDeep mt-0.5">
              <CheckIcon className="w-3 h-3" /> Enviado
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remover"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-danger shrink-0"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); onChange(e.dataTransfer.files); }}
          className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
            error ? 'border-danger bg-red-50/40' : dragOver ? 'border-primary bg-primaryTint' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <input
            type="file"
            accept={accept}
            onChange={(e) => onChange(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-primaryDeep">
            <UploadIcon className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-gray-700">Arraste o arquivo aqui ou clique para selecionar</div>
          {hint && <div className="text-[11px] text-gray-400">{hint}</div>}
        </label>
      )}
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </div>
  );
}
