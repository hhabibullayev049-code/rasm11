import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Song, FaceBounds, DanceSettings, DanceStyleId } from '../types';
import { DANCE_STYLES } from '../data/songs';
import { audioEngine, AudioAnalysis } from '../utils/audioEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Camera,
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  Share2,
  Download,
  Flame,
  Music,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DanceStageProps {
  imageSrc: string;
  faceBounds: FaceBounds;
  song: Song;
  onEditPhoto: () => void;
  onChangeSong: () => void;
}

export const DanceStage: React.FC<DanceStageProps> = ({
  imageSrc,
  faceBounds,
  song,
  onEditPhoto,
  onChangeSong,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const headCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Video recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.duration);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Dance settings
  const [settings, setSettings] = useState<DanceSettings>({
    speed: 1.0,
    intensity: 1.1,
    style: song.defaultDanceStyle || 'andijon',
    accessory: 'none',
    partyEffects: true,
    discoLights: true,
    doiraEcho: false,
  });

  // Track dynamic audio analysis
  const [analysisState, setAnalysisState] = useState<AudioAnalysis>({
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
    beatDetected: false,
    rawFrequencies: new Uint8Array(64),
  });

  // Load image into HTMLImageElement
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      preRenderHead(img, faceBounds);
    };
  }, [imageSrc, faceBounds]);

  // Pre-render isolated feathered head & neck on offscreen canvas
  const preRenderHead = (img: HTMLImageElement, bounds: FaceBounds) => {
    const offscreen = document.createElement('canvas');
    const naturalW = img.naturalWidth || 800;
    const naturalH = img.naturalHeight || 1000;

    const headW = bounds.width * naturalW;
    const headH = bounds.height * naturalH;

    offscreen.width = headW;
    offscreen.height = headH;

    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    const headX = bounds.x * naturalW - headW / 2;
    const headY = bounds.y * naturalH - headH / 2;

    // Create soft feathered radial/elliptical alpha mask
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      headW / 2,
      headH * 0.46,
      headW * 0.46,
      headH * 0.48,
      0,
      0,
      Math.PI * 2
    );
    ctx.clip();

    ctx.drawImage(
      img,
      headX,
      headY,
      headW,
      headH,
      0,
      0,
      headW,
      headH
    );
    ctx.restore();

    headCanvasRef.current = offscreen;
  };

  // Sync settings style when song changes
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      style: song.defaultDanceStyle || prev.style,
    }));
  }, [song]);

  // Start playing music when DanceStage opens
  useEffect(() => {
    const startAudio = async () => {
      try {
        await audioEngine.playSong(
          song,
          (cur, dur) => {
            setCurrentTime(cur);
            if (dur > 0) setDuration(dur);
          },
          () => {
            setIsPlaying(false);
          }
        );
        setIsPlaying(true);
      } catch (err) {
        console.warn('Audio autoplay failed (user gesture needed):', err);
        setIsPlaying(false);
      }
    };

    startAudio();

    return () => {
      audioEngine.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [song]);

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.resume();
      setIsPlaying(true);
    }
  };

  const restartDance = () => {
    audioEngine.stop();
    audioEngine.playSong(
      song,
      (cur, dur) => {
        setCurrentTime(cur);
        if (dur > 0) setDuration(dur);
      },
      () => {
        setIsPlaying(false);
      }
    );
    setIsPlaying(true);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioEngine.setVolume(0.85);
      setIsMuted(false);
    } else {
      audioEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  // Main 60FPS Animation Loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const headCanvas = headCanvasRef.current;

    if (!canvas || !img || !img.complete) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size matching aspect ratio of image
    const cw = canvas.width;
    const ch = canvas.height;

    // Get live audio data
    const analysis = audioEngine.getAnalysis();
    setAnalysisState(analysis);

    // Audio-driven phase and physics
    const currentStyle = DANCE_STYLES[settings.style] || DANCE_STYLES.andijon;
    const speed = settings.speed;
    const intensity = settings.intensity;

    const time = performance.now() * 0.001 * speed;
    const bpm = song.bpm || 128;
    const beatFrequency = (bpm / 60) * 2; // Beats per second

    // Tilt angle (rocks left and right to the beat)
    const rawSin = Math.sin(time * beatFrequency * Math.PI);
    let tiltAngle = rawSin * 0.16 * currentStyle.tiltMultiplier * intensity;

    // Lazgi rapid neck shimmer / tremor addition
    if (currentStyle.shakeAmplitude > 0) {
      const shake = Math.sin(time * currentStyle.shakeFrequency * 18) * currentStyle.shakeAmplitude * 0.07;
      tiltAngle += shake * (analysis.mid * 1.5 + 0.3);
    }

    // Vertical bobbing (bass punch moves head down, rebound up)
    const bobOffset = (analysis.bass * 26 + Math.abs(Math.sin(time * beatFrequency * Math.PI)) * 10) *
      currentStyle.bobMultiplier *
      intensity;

    // Horizontal sway
    const swayOffset = Math.cos(time * beatFrequency * 0.5 * Math.PI) *
      12 *
      currentStyle.swayMultiplier *
      intensity;

    // Squash & Stretch
    const squashY = 1.0 - (analysis.bass * 0.08 * currentStyle.squashMultiplier * intensity);
    const stretchX = 1.0 + (analysis.bass * 0.06 * currentStyle.squashMultiplier * intensity);

    // 1. Draw base unchanged image (Body, Clothes, Hands, Background)
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);

    // 2. Party Disco Background Lighting
    if (settings.discoLights && isPlaying) {
      ctx.save();
      const hue = (time * 60) % 360;
      const grad = ctx.createRadialGradient(
        cw * (0.5 + Math.sin(time * 2) * 0.3),
        ch * 0.3,
        10,
        cw / 2,
        ch / 2,
        cw * 0.8
      );
      grad.addColorStop(0, `hsla(${hue}, 100%, 65%, ${analysis.bass * 0.22})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }

    // 3. Smart seam fill behind head so no tearing occurs when head tilts
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const scaleX = cw / naturalW;
    const scaleY = ch / naturalH;

    const headW = faceBounds.width * naturalW * scaleX;
    const headH = faceBounds.height * naturalH * scaleY;
    const headCenterX = faceBounds.x * naturalW * scaleX;
    const headCenterY = faceBounds.y * naturalH * scaleY;

    // Fill underneath moving head with feathered context
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(headCenterX, headCenterY, headW * 0.44, headH * 0.46, 0, 0, Math.PI * 2);
    ctx.filter = 'blur(10px)';
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.restore();

    // 4. Draw Moving Isolated Head & Neck
    if (headCanvas) {
      ctx.save();

      // Pivot point at base of neck / collar
      const pivotX = headCenterX;
      const pivotY = headCenterY + headH * (faceBounds.neckPivotY - 0.5);

      // Translate to neck pivot
      ctx.translate(pivotX + swayOffset, pivotY + bobOffset);

      // Rotate head around neck
      ctx.rotate(tiltAngle);

      // Apply squash and stretch
      ctx.scale(stretchX, squashY);

      // Draw head relative to pivot
      const drawX = -headW / 2;
      const drawY = -(headH * (faceBounds.neckPivotY - 0.5) + headH / 2);

      ctx.drawImage(headCanvas, drawX, drawY, headW, headH);

      // 5. Render Optional Fun Accessories on the Head (they dance together with head!)
      renderAccessory(ctx, settings.accessory, drawX, drawY, headW, headH);

      ctx.restore();
    }

    // 6. Confetti & Beat celebrations on strong drops
    if (analysis.beatDetected && settings.partyEffects && isPlaying) {
      // Trigger subtle celebratory confetti
      confetti({
        particleCount: 15,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981'],
        disableForReducedMotion: true,
      });
    }

    // 7. Visualizer equalizer bars at bottom of canvas
    if (isPlaying) {
      drawEquilizer(ctx, analysis.rawFrequencies, cw, ch);
    }

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [faceBounds, isPlaying, settings, song]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderFrame]);

  // Draw accessories: Uzbek Do‘ppi, VIP Sunglasses, Crown, Sparkles
  const renderAccessory = (
    ctx: CanvasRenderingContext2D,
    type: string,
    hx: number,
    hy: number,
    hw: number,
    hh: number
  ) => {
    if (type === 'none') return;

    ctx.save();

    if (type === 'doppi') {
      // 🇺🇿 Authentic Uzbek Do‘ppi (Chust do‘ppi - traditional black velvet with white badam/qalampir motifs)
      const doppiW = hw * 0.72;
      const doppiH = hh * 0.32;
      const doppiX = hx + (hw - doppiW) / 2;
      const doppiY = hy + hh * 0.04;

      // Base black dome
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(doppiX, doppiY + doppiH);
      ctx.quadraticCurveTo(doppiX + doppiW * 0.2, doppiY, doppiX + doppiW / 2, doppiY - 4);
      ctx.quadraticCurveTo(doppiX + doppiW * 0.8, doppiY, doppiX + doppiW, doppiY + doppiH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White traditional badam (almond) paisley embroidery
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.fillStyle = '#f8fafc';

      // Left badam motif
      ctx.beginPath();
      ctx.ellipse(doppiX + doppiW * 0.32, doppiY + doppiH * 0.55, 9, 14, -0.3, 0, Math.PI * 2);
      ctx.stroke();

      // Right badam motif
      ctx.beginPath();
      ctx.ellipse(doppiX + doppiW * 0.68, doppiY + doppiH * 0.55, 9, 14, 0.3, 0, Math.PI * 2);
      ctx.stroke();

      // Bottom white border zig-zag
      ctx.beginPath();
      ctx.moveTo(doppiX, doppiY + doppiH);
      ctx.lineTo(doppiX + doppiW, doppiY + doppiH);
      ctx.stroke();
    } else if (type === 'glasses') {
      // 🕶️ VIP Disco Sunglasses
      const gw = hw * 0.68;
      const gh = hh * 0.22;
      const gx = hx + (hw - gw) / 2;
      const gy = hy + hh * 0.34;

      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;

      // Left lens
      ctx.beginPath();
      ctx.roundRect(gx, gy, gw * 0.44, gh, 8);
      ctx.fill();
      ctx.stroke();

      // Right lens
      ctx.beginPath();
      ctx.roundRect(gx + gw * 0.56, gy, gw * 0.44, gh, 8);
      ctx.fill();
      ctx.stroke();

      // Bridge
      ctx.beginPath();
      ctx.moveTo(gx + gw * 0.44, gy + gh * 0.3);
      ctx.lineTo(gx + gw * 0.56, gy + gh * 0.3);
      ctx.stroke();

      // Glare shine reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(gx + 6, gy + 4);
      ctx.lineTo(gx + 18, gy + 4);
      ctx.lineTo(gx + 6, gy + gh - 6);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'crown') {
      // 👑 Gold Royal Crown
      const cw = hw * 0.7;
      const ch = hh * 0.32;
      const cx = hx + (hw - cw) / 2;
      const cy = hy - ch * 0.35;

      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(cx, cy + ch);
      ctx.lineTo(cx, cy + ch * 0.3);
      ctx.lineTo(cx + cw * 0.25, cy + ch * 0.6);
      ctx.lineTo(cx + cw * 0.5, cy);
      ctx.lineTo(cx + cw * 0.75, cy + ch * 0.6);
      ctx.lineTo(cx + cw, cy + ch * 0.3);
      ctx.lineTo(cx + cw, cy + ch);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crown jewels
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx + cw * 0.5, cy + 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Draw Audio Visualizer Bars
  const drawEquilizer = (
    ctx: CanvasRenderingContext2D,
    freqData: Uint8Array,
    w: number,
    h: number
  ) => {
    const bars = 24;
    const barWidth = (w - 40) / bars;
    const barSpacing = 3;

    ctx.save();
    for (let i = 0; i < bars; i++) {
      const freqIdx = Math.floor((i / bars) * (freqData.length * 0.6));
      const val = freqData[freqIdx] / 255;
      const barH = Math.max(4, val * 55);

      const x = 20 + i * barWidth;
      const y = h - 16 - barH;

      const grad = ctx.createLinearGradient(0, y, 0, h - 16);
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(1, '#ef4444');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth - barSpacing, barH, 3);
      ctx.fill();
    }
    ctx.restore();
  };

  // Video Recording feature
  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      recordedChunksRef.current = [];
      const stream = canvas.captureStream(30);

      const options = { mimeType: 'video/webm;codecs=vp9' };
      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? options
          : undefined
      );

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI-Photo-Dance-${song.title.replace(/\s+/g, '_')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      const recInterval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 15) {
            // Auto stop after 15 seconds clip
            clearInterval(recInterval);
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      alert('Video yozishda xatolik yuz berdi: ' + (err as Error).message);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const takeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI-Dance-Snapshot-${Date.now()}.jpg`;
    a.click();
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Top Banner: Selected Song info + Quick navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${song.coverGradient} flex items-center justify-center text-2xl shadow-lg shrink-0`}
          >
            {song.coverEmoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                🇺🇿 {song.categoryName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ⚡ {song.bpm} BPM
              </span>
            </div>
            <h3 className="text-base font-bold text-white leading-tight">
              {song.title}
            </h3>
            <p className="text-xs text-slate-400">{song.artist}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={onChangeSong}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Music size={13} />
            Qo‘shiqni almashtirish
          </button>
          <button
            type="button"
            onClick={onEditPhoto}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            Rasmni o‘zgartirish
          </button>
        </div>
      </div>

      {/* Main Dancing Stage Viewport */}
      <div className="relative w-full rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col items-center justify-center p-3 sm:p-6">
        {/* Stage Atmosphere Lights */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Video Recording Status Badge */}
        {isRecording && (
          <div className="absolute top-6 left-6 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold shadow-lg animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            Video yozilmoqda ({recordingSeconds}s / 15s)
          </div>
        )}

        {/* The Dancing Canvas */}
        <div className="relative w-full max-w-md aspect-3/4 rounded-2xl bg-black overflow-hidden border-2 border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <canvas
            ref={canvasRef}
            width={720}
            height={960}
            className="w-full h-full object-contain"
          />

          {/* Floating Badge: Dance Style */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 shadow">
            <span>{DANCE_STYLES[settings.style]?.icon}</span>
            <span>{DANCE_STYLES[settings.style]?.name}</span>
          </div>
        </div>

        {/* Playback Progress & Control Bar */}
        <div className="w-full max-w-md mt-4 flex flex-col gap-3">
          {/* Progress scrubber */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>{formatSec(currentTime)}</span>
            <div className="relative flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />
            </div>
            <span>{formatSec(duration)}</span>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* Mute toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title={isMuted ? 'Ovozni yoqish' : 'Ovozni o‘chirish'}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Restart */}
              <button
                type="button"
                onClick={restartDance}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Boshidan boshlash"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* BIG PLAY / PAUSE DANCE BUTTON */}
            <button
              type="button"
              onClick={togglePlay}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all duration-200 active:scale-95 ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={20} className="fill-current" />
                  <span>Raqsni to‘xtatish</span>
                </>
              ) : (
                <>
                  <Play size={20} className="fill-current" />
                  <span>Raqsga tushirish! 💃</span>
                </>
              )}
            </button>

            {/* Settings & Record */}
            <div className="flex items-center gap-1.5">
              {/* Record Video */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2.5 rounded-xl font-semibold transition ${
                  isRecording
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/40 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={isRecording ? 'Yozishni to‘xtatish' : 'Video yozib olish (Instagram/Telegram)'}
              >
                <Video size={18} />
              </button>

              {/* Snapshot */}
              <button
                type="button"
                onClick={takeSnapshot}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Skrinshot olish"
              >
                <Camera size={18} />
              </button>

              {/* Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowSettingsPanel((prev) => !prev)}
                className={`p-2.5 rounded-xl transition ${
                  showSettingsPanel
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Raqs sozlamalari"
              >
                <Sliders size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Dance Styles Bar */}
        <div className="w-full max-w-xl mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Flame size={14} className="text-amber-400" />
              Raqs Uslubini Tanlang:
            </span>
            <span className="text-[11px] text-amber-400 font-medium">
              {DANCE_STYLES[settings.style]?.tagline}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.keys(DANCE_STYLES) as DanceStyleId[]).map((styleId) => {
              const style = DANCE_STYLES[styleId];
              const isSelected = settings.style === styleId;
              return (
                <button
                  key={styleId}
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, style: styleId }))}
                  className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/20 to-slate-900 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-2xl mb-1">{style.icon}</span>
                  <span className="text-xs font-bold leading-tight">{style.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expandable Dance Tuning Panel */}
        {showSettingsPanel && (
          <div className="w-full max-w-xl mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sliders size={14} />
                Raqs Nozik Sozlamalari
              </h4>
              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Yopish ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Speed Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Raqs Tezligi:</span>
                  <span className="text-amber-400 font-mono">{settings.speed}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.8"
                  step="0.1"
                  value={settings.speed}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, speed: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Intensity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Raqs Shiddati (Amplituda):</span>
                  <span className="text-amber-400 font-mono">
                    {Math.round(settings.intensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.1"
                  value={settings.intensity}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, intensity: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Accessories (Do‘ppi, Ko‘zoynak, Toj) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-400" />
                Bosh Aksessuari (Bosh bilan birga raqsga tushadi):
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'Yo‘q', icon: '🚫' },
                  { id: 'doppi', label: 'Milliy Do‘ppi', icon: '🇺🇿' },
                  { id: 'glasses', label: 'VIP Ko‘zoynak', icon: '🕶️' },
                  { id: 'crown', label: 'Zar Toj', icon: '👑' },
                ].map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        accessory: acc.id as DanceSettings['accessory'],
                      }))
                    }
                    className={`p-2 rounded-xl border text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      settings.accessory === acc.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{acc.icon}</span>
                    <span className="truncate">{acc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle checkboxes */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.discoLights}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, discoLights: e.target.checked }))
                  }
                  className="accent-amber-500 rounded"
                />
                Diskoteka chiroqlari
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.partyEffects}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, partyEffects: e.target.checked }))
                  }
                  className="accent-amber-500 rounded"
                />
                Zarb konfetilari
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
