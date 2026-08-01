'use client';
import { useEffect, useRef, useState } from 'react';
import { SearchIcon } from './icons';

const OUTPUT_SIZE = 480;

type Dims = { naturalW: number; naturalH: number; baseScale: number; boxSize: number };

export function RecorteFotoModal({
  file, shape, onCancel, onConfirm,
}: {
  file: File | null;
  shape: 'circle' | 'square';
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dims = useRef<Dims>({ naturalW: 0, naturalH: 0, baseScale: 1, boxSize: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!file) { setImgUrl(null); return; }
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setZoom(100);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function curScale(z = zoom) {
    return dims.current.baseScale * (z / 100);
  }

  function clampPos(left: number, top: number, scale: number) {
    const { naturalW, naturalH, boxSize } = dims.current;
    const w = naturalW * scale, h = naturalH * scale;
    const minLeft = boxSize - w, minTop = boxSize - h;
    return {
      left: Math.min(0, Math.max(minLeft, left)),
      top: Math.min(0, Math.max(minTop, top)),
    };
  }

  function onImgLoad() {
    const img = imgRef.current;
    const stage = stageRef.current;
    if (!img || !stage) return;
    const boxSize = stage.clientWidth;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const baseScale = Math.max(boxSize / naturalW, boxSize / naturalH);
    dims.current = { naturalW, naturalH, baseScale, boxSize };
    setPos({
      left: (boxSize - naturalW * baseScale) / 2,
      top: (boxSize - naturalH * baseScale) / 2,
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startLeft: pos.left, startTop: pos.top };
    stageRef.current?.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.dragging) return;
    const left = dragRef.current.startLeft + (e.clientX - dragRef.current.startX);
    const top = dragRef.current.startTop + (e.clientY - dragRef.current.startY);
    setPos(clampPos(left, top, curScale()));
  }
  function onPointerUp() {
    dragRef.current.dragging = false;
  }

  function onZoomChange(next: number) {
    const oldScale = curScale();
    const newScale = curScale(next);
    const ratio = newScale / oldScale;
    const { boxSize } = dims.current;
    const left = (pos.left - boxSize / 2) * ratio + boxSize / 2;
    const top = (pos.top - boxSize / 2) * ratio + boxSize / 2;
    setZoom(next);
    setPos(clampPos(left, top, newScale));
  }

  function confirmar() {
    const img = imgRef.current;
    if (!img) return;
    const { boxSize } = dims.current;
    const scale = curScale();
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scaleFactor = 1 / scale;
    const sx = -pos.left * scaleFactor;
    const sy = -pos.top * scaleFactor;
    const sSize = boxSize * scaleFactor;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob((blob) => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.85);
  }

  if (!file || !imgUrl) return null;

  const scale = curScale();
  const w = dims.current.naturalW * scale;
  const h = dims.current.naturalH * scale;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-5">
      <div className="w-full max-w-[380px] bg-white rounded-[20px] p-5 shadow-2xl">
        <h4 className="text-[15px] font-extrabold text-ink mb-1">Ajustar foto</h4>
        <p className="text-xs text-gray-500 mb-4">Arraste pra reposicionar, use o controle abaixo pra dar zoom.</p>

        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 touch-none cursor-grab active:cursor-grabbing bg-[#10262b]"
        >
          <img
            ref={imgRef}
            src={imgUrl}
            alt=""
            onLoad={onImgLoad}
            draggable={false}
            className="absolute select-none"
            style={{ left: pos.left, top: pos.top, width: w || undefined, height: h || undefined, maxWidth: 'none', maxHeight: 'none' }}
          />
          <div
            className={`absolute inset-0 border-2 border-white pointer-events-none ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'}`}
            style={{ boxShadow: '0 0 0 2000px rgba(4,20,25,.6)' }}
          />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <SearchIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            type="range"
            min={100}
            max={600}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <SearchIcon className="w-[18px] h-[18px] text-gray-400 shrink-0" />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2.5 rounded-lg text-gray-500 text-sm font-bold hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={confirmar} className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primaryDark text-white text-sm font-bold">
            Usar esta foto
          </button>
        </div>
      </div>
    </div>
  );
}
