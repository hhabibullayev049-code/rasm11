import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Edit3, Sparkles, CheckCircle2, User } from 'lucide-react';
import { FaceBounds, PresetPortrait } from '../types';
import { PRESET_PORTRAITS } from '../data/presets';
import { detectFaceInImage } from '../utils/faceDetector';
import { CameraModal } from './CameraModal';
import { FaceAdjuster } from './FaceAdjuster';

interface PhotoUploaderProps {
  currentImage: string | null;
  faceBounds: FaceBounds | null;
  onPhotoSelected: (imageSrc: string, bounds: FaceBounds) => void;
  onClearPhoto: () => void;
  onUpdateBounds: (bounds: FaceBounds) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  currentImage,
  faceBounds,
  onPhotoSelected,
  onClearPhoto,
  onUpdateBounds,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [tempBounds, setTempBounds] = useState<FaceBounds | null>(null);

  // Process selected image (file or camera)
  const processImage = (src: string) => {
    setIsAnalyzing(true);
    setDetectionMessage('Yuz va bosh sohasi tahlil qilinmoqda...');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const detection = await detectFaceInImage(img);
        setIsAnalyzing(false);
        setIsAutoDetected(detection.detected);
        setDetectionMessage(detection.message || (detection.detected ? 'Yuz muvaffaqiyatli aniqlandi!' : null));

        setTempImage(src);
        setTempBounds(detection.bounds);

        // If face was reliably detected, save directly and open adjuster optionally
        onPhotoSelected(src, detection.bounds);
      } catch (err) {
        console.error('Face detection err:', err);
        setIsAnalyzing(false);
        const fallbackBounds: FaceBounds = {
          x: 0.5,
          y: 0.38,
          width: 0.44,
          height: 0.48,
          neckPivotY: 0.88,
        };
        onPhotoSelected(src, fallbackBounds);
      }
    };
    img.src = src;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      alert('Iltimos, JPG, PNG yoki WebP formatidagi rasm yuklang.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        processImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be picked again
    e.target.value = '';
  };

  const handlePresetSelect = (preset: PresetPortrait) => {
    processImage(preset.imageUrl);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* When NO photo is uploaded: Show 2 BIG Buttons as required */}
      {!currentImage ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Camera Button */}
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="group relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-dashed border-amber-500/40 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 text-center active:scale-[0.98]"
            >
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300 shadow-inner">
                <Camera size={40} className="stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                📸 Kamera orqali suratga olish
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xs">
                Telefon yoki kompyuter kamerasi orqali jonli surat oling
              </p>
              <div className="mt-4 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-amber-300 font-semibold border border-amber-500/20">
                Jonli kamera
              </div>
            </button>

            {/* 2. Gallery Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-dashed border-sky-500/40 hover:border-sky-400 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300 text-center active:scale-[0.98]"
            >
              <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-sky-500/20 transition-all duration-300 shadow-inner">
                <ImageIcon size={40} className="stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition">
                🖼️ Galereyadan rasm tanlash
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xs">
                JPG, PNG, WebP formatdagi portret rasmingizni yuklang
              </p>
              <div className="mt-4 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-sky-300 font-semibold border border-sky-500/20">
                Fayl tanlash / Drag & Drop
              </div>
            </button>
          </div>

          {/* Quick Preset Portretlar (1-bosishda sinab ko'rish) */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                Yoki tayyor portretlardan birini tanlang (1-bosishda sinash):
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESET_PORTRAITS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p)}
                  className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400/50 transition text-left"
                >
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-600 group-hover:scale-105 transition"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{p.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* When Photo IS Uploaded: Big screen display with action controls */
        <div className="flex flex-col gap-4">
          <div className="relative w-full rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center gap-6 p-4 sm:p-6">
            {/* Big photo display */}
            <div className="relative w-full max-w-xs sm:max-w-sm aspect-3/4 rounded-2xl bg-black overflow-hidden border border-slate-700 shadow-xl group">
              <img
                src={currentImage}
                alt="Uploaded portrait"
                className="w-full h-full object-contain"
              />

              {/* Face Boundary Overlay if bounds are set */}
              {faceBounds && (
                <div
                  style={{
                    left: `${(faceBounds.x - faceBounds.width / 2) * 100}%`,
                    top: `${(faceBounds.y - faceBounds.height / 2) * 100}%`,
                    width: `${faceBounds.width * 100}%`,
                    height: `${faceBounds.height * 100}%`,
                  }}
                  className="absolute rounded-[48%] border-2 border-amber-400/80 pointer-events-none shadow-[0_0_15px_rgba(245,158,11,0.3)] flex flex-col items-center justify-between p-1.5"
                >
                  <span className="text-[9px] font-bold text-amber-300 bg-black/70 px-1.5 py-0.5 rounded">
                    Bosh & Bo‘yin
                  </span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow" />
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Rasm tayyor
              </div>
            </div>

            {/* Side Controls & Options */}
            <div className="flex-1 w-full flex flex-col justify-between self-stretch gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
                  <User size={13} />
                  Portret yuklandi
                </div>
                <h4 className="text-xl font-bold text-white">
                  Raqqos/Raqqosa tayyor!
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Faqat bosh va yuz qismi qo‘shiq ritmiga mos ravishda qimirlaydi. Tana, kiyim va fon o‘zgarmaydi.
                </p>

                {detectionMessage && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                    {detectionMessage}
                  </div>
                )}
              </div>

              {/* Action buttons: To‘g‘rilash, Almashtirish, O‘chirish */}
              <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-800">
                {/* Adjust Head Box */}
                <button
                  type="button"
                  onClick={() => setIsAdjusterOpen(true)}
                  className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95"
                >
                  <Edit3 size={15} className="text-amber-400" />
                  Bosh qismini to‘g‘rilash
                </button>

                {/* Change Photo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-w-[130px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95"
                >
                  <ImageIcon size={15} className="text-sky-400" />
                  Rasmni almashtirish
                </button>

                {/* Camera retake */}
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95"
                  title="Qayta suratga olish"
                >
                  <Camera size={15} className="text-amber-400" />
                  Kamera
                </button>

                {/* Delete / Clear */}
                <button
                  type="button"
                  onClick={onClearPhoto}
                  className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                  title="Rasmni o‘chirish"
                >
                  <Trash2 size={15} />
                  O‘chirish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(imgUrl) => {
          setIsCameraOpen(false);
          processImage(imgUrl);
        }}
      />

      {/* Face Adjuster Modal */}
      {isAdjusterOpen && currentImage && faceBounds && (
        <FaceAdjuster
          imageSrc={currentImage}
          initialBounds={faceBounds}
          isAutoDetected={isAutoDetected}
          detectionMessage={detectionMessage || undefined}
          onConfirm={(newBounds) => {
            onUpdateBounds(newBounds);
            setIsAdjusterOpen(false);
          }}
          onCancel={() => setIsAdjusterOpen(false)}
        />
      )}
    </div>
  );
};
