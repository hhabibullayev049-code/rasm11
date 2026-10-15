import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Zap, AlertCircle } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.error('Kamera xatosi:', err);
      const isDenied = err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setErrorMsg(
        isDenied
          ? 'Kameraga ruxsat berilmadi. Brauzer sozlamalaridan kameraga ruxsat bering yoki galereyadan rasm yuklang.'
          : 'Kamera topilmadi yoki boshqa dastur tomonidan band qilingan. Galereyadan rasm tanlashingiz mumkin.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const triggerCapture = () => {
    // 3-second countdown
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 700);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror image if front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      stopCamera();
      onCapture(dataUrl);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col">
        {/* Flash animation */}
        {flash && <div className="absolute inset-0 z-40 bg-white pointer-events-none transition-opacity duration-150" />}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/90 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              📸
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Kamera orqali suratga olish</h3>
              <p className="text-xs text-slate-400">Yuzingizni markazga to‘g‘rilang</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Yopish"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={28} />
              </div>
              <p className="text-sm text-slate-200 font-medium mb-3">{errorMsg}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Galereyadan tanlash
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Head guide silhouette overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-56 h-72 rounded-[48%] border-2 border-dashed border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex flex-col items-center justify-end pb-4">
                  <span className="text-[11px] font-semibold tracking-wider text-amber-300/80 bg-black/60 px-2.5 py-1 rounded-full uppercase">
                    Bosh va yuz o‘rni
                  </span>
                </div>
              </div>

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-30">
                  <div className="text-7xl font-black text-amber-400 animate-ping">
                    {countdown}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800/80 flex items-center justify-around z-20">
          <button
            type="button"
            onClick={toggleFacingMode}
            disabled={!!errorMsg}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition disabled:opacity-40"
          >
            <div className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700">
              <RefreshCw size={20} />
            </div>
            <span className="text-[10px] font-medium">Kamerani burish</span>
          </button>

          {/* Big Snapshot button */}
          <button
            type="button"
            onClick={triggerCapture}
            disabled={!!errorMsg || countdown !== null}
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 text-white hover:scale-105 active:scale-95 transition disabled:opacity-40"
            title="Suratga olish"
          >
            <div className="w-13 h-13 rounded-full border-2 border-white/80 flex items-center justify-center">
              <Camera size={26} />
            </div>
          </button>

          <button
            type="button"
            onClick={takeSnapshot}
            disabled={!!errorMsg}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition disabled:opacity-40"
          >
            <div className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700">
              <Zap size={20} />
            </div>
            <span className="text-[10px] font-medium">Tezkor surat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
