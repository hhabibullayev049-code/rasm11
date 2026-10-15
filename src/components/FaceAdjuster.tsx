import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FaceBounds } from '../types';
import { Move, ZoomIn, ZoomOut, Check, RotateCcw, AlertTriangle, Sparkles, UserCheck } from 'lucide-react';
import { detectFaceInImage } from '../utils/faceDetector';

interface FaceAdjusterProps {
  imageSrc: string;
  initialBounds: FaceBounds;
  isAutoDetected: boolean;
  detectionMessage?: string;
  onConfirm: (finalBounds: FaceBounds) => void;
  onCancel: () => void;
}

export const FaceAdjuster: React.FC<FaceAdjusterProps> = ({
  imageSrc,
  initialBounds,
  isAutoDetected,
  detectionMessage,
  onConfirm,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [bounds, setBounds] = useState<FaceBounds>(initialBounds);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startBounds, setStartBounds] = useState<FaceBounds>(initialBounds);
  const [isReDetecting, setIsReDetecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(detectionMessage || null);

  useEffect(() => {
    setBounds(initialBounds);
  }, [initialBounds]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartBounds({ ...bounds });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.x) / rect.width;
    const dy = (e.clientY - dragStart.y) / rect.height;

    setBounds({
      ...startBounds,
      x: Math.max(0.15, Math.min(0.85, startBounds.x + dx)),
      y: Math.max(0.15, Math.min(0.85, startBounds.y + dy)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setBounds((prev) => {
      const newW = Math.max(0.2, Math.min(0.85, prev.width + delta));
      const newH = Math.max(0.25, Math.min(0.9, prev.height + delta * 1.1));
      return {
        ...prev,
        width: newW,
        height: newH,
      };
    });
  };

  const reDetect = async () => {
    if (!imgRef.current) return;
    setIsReDetecting(true);
    setNotice(null);
    try {
      const result = await detectFaceInImage(imgRef.current);
      setBounds(result.bounds);
      if (result.detected) {
        setNotice('Yuz muvaffaqiyatli aniqlandi! 🎯');
      } else {
        setNotice(result.message || 'Yuz aniqlanmadi. Qutichani qo‘lda suring.');
      }
    } catch {
      setNotice('Xatolik yuz berdi. Qo‘lda to‘g‘rilang.');
    } finally {
      setIsReDetecting(false);
    }
  };

  // Live head preview on mini canvas
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const updatePreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const headX = bounds.x * naturalW;
    const headY = bounds.y * naturalH;
    const headW = bounds.width * naturalW;
    const headH = bounds.height * naturalH;

    // Draw clipped head preview with soft feather
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, (w * 0.42), (h * 0.46), 0, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
      img,
      headX - headW / 2,
      headY - headH / 2,
      headW,
      headH,
      0,
      0,
      w,
      h
    );
    ctx.restore();

    // Draw border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, (w * 0.42), (h * 0.46), 0, 0, Math.PI * 2);
    ctx.stroke();
  }, [bounds]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Bosh va Yuz Sohasini To‘g‘rilash
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Faqat bosh va bo‘yin harakatlanishi uchun oval qutini yuzga moslang
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Bekor qilish
          </button>
        </div>

        {/* Notice banner if face not detected */}
        {notice && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 border-b ${
              isAutoDetected
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-orange-500/15 text-orange-200 border-orange-500/30'
            }`}
          >
            {isAutoDetected ? (
              <UserCheck size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            )}
            <span>{notice}</span>
          </div>
        )}

        {/* Main interactive area */}
        <div className="relative p-4 sm:p-6 flex flex-col md:flex-row gap-5 items-center justify-center">
          {/* Image & Interactive Bounds Viewport */}
          <div
            ref={containerRef}
            className="relative w-full max-w-sm aspect-3/4 rounded-2xl bg-black overflow-hidden border border-slate-700 shadow-inner select-none cursor-move touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Portrait"
              className="w-full h-full object-contain pointer-events-none"
              onLoad={updatePreview}
              crossOrigin="anonymous"
            />

            {/* Darkened backdrop with cut-out for head */}
            <div className="absolute inset-0 bg-black/45 pointer-events-none" />

            {/* Draggable & resizable face oval ring */}
            <div
              style={{
                left: `${(bounds.x - bounds.width / 2) * 100}%`,
                top: `${(bounds.y - bounds.height / 2) * 100}%`,
                width: `${bounds.width * 100}%`,
                height: `${bounds.height * 100}%`,
              }}
              className="absolute rounded-[48%] border-2 border-amber-400 bg-amber-400/10 shadow-[0_0_25px_rgba(245,158,11,0.4)] pointer-events-none transition-all duration-75 flex flex-col items-center justify-between p-2"
            >
              {/* Top tag */}
              <div className="text-[10px] font-bold tracking-wider text-amber-300 bg-slate-900/90 px-2 py-0.5 rounded-full border border-amber-400/40">
                BOSH VA YUZ
              </div>

              {/* Center move anchor icon */}
              <div className="w-8 h-8 rounded-full bg-amber-500/80 text-black flex items-center justify-center shadow-lg">
                <Move size={16} />
              </div>

              {/* Neck pivot indicator at bottom */}
              <div className="flex flex-col items-center">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
                <span className="text-[9px] font-bold text-emerald-300 bg-slate-950/90 px-1.5 rounded mt-0.5">
                  Bo‘yin nuqtasi
                </span>
              </div>
            </div>
          </div>

          {/* Controls & Mini Preview Sidebar */}
          <div className="w-full md:w-60 flex flex-col gap-4">
            {/* Live Head Cutout Preview */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center">
              <span className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                Harakatlanuvchi qism:
              </span>
              <div className="w-24 h-28 rounded-2xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center overflow-hidden">
                <canvas
                  ref={previewCanvasRef}
                  width={140}
                  height={160}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Tana va fon qotib turadi, faqat mana shu qism raqsga tushadi
              </p>
            </div>

            {/* Size Zoom adjustments */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Doira o‘lchami:</span>
                <span className="text-amber-400 font-mono">
                  {Math.round(bounds.width * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleZoom(-0.04)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="Kichraytirish"
                >
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="0.25"
                  max="0.8"
                  step="0.01"
                  value={bounds.width}
                  onChange={(e) => {
                    const w = parseFloat(e.target.value);
                    setBounds((prev) => ({
                      ...prev,
                      width: w,
                      height: w * 1.15,
                    }));
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleZoom(0.04)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="Kattalashtirish"
                >
                  <ZoomIn size={16} />
                </button>
              </div>

              {/* Re-detect button */}
              <button
                type="button"
                onClick={reDetect}
                disabled={isReDetecting}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <RotateCcw size={14} className={isReDetecting ? 'animate-spin' : ''} />
                Qayta avtomatik aniqlash
              </button>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={() => onConfirm(bounds)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center gap-2 transition active:scale-95"
          >
            <Check size={18} />
            Raqsga tayyor! (Davom etish)
          </button>
        </div>
      </div>
    </div>
  );
};
