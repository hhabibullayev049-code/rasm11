import React, { useState } from 'react';
import { Sparkles, Info, X, Music, Heart, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/30">
              🎶
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>AI Photo Dance</span>
                  <span className="text-amber-400">🎶</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                  🇺🇿 O‘ZBEKCHA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Rasmdagi odamni o‘zbekcha qo‘shiqlar ritmiga raqsga tushiring!
              </p>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
              title="Ilova haqida ma’lumot"
            >
              <Info size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Qanday ishlaydi?</span>
            </button>
          </div>
        </div>
      </header>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  ✨
                </div>
                <h3 className="text-base font-bold text-white">
                  AI Photo Dance Haqida
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <span className="font-bold">🎯 Asosiy printsip:</span> Faqat rasmning bosh, yuz va bo‘yin sohasi raqsga tushadi. Tana, libos va orqa fon o‘zgarishsiz qoladi.
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Qanday foydalaniladi?
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                  <li><strong>Kamera yoki Galereya</strong> orqali o‘zingiz yoki do‘stingizning suratini yuklang.</li>
                  <li>Yuz avtomatik topiladi. Zarur bo‘lsa oval ramkani bosh va bo‘yinga to‘g‘rilang.</li>
                  <li>Kutubxonadan <strong>Andijon polkasi, Xorazm lazgisi, Pop yoki To‘yxona</strong> qo‘shiqlaridan birini tanlang (yoki o‘z musiqangizni yuklang).</li>
                  <li><strong>Raqsga tushirish! 💃</strong> tugmasini bosing va natijadan zavqlaning!</li>
                  <li>Video yozib olib do‘stlaringizga yoki Telegram/Instagramga ulashing.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>O‘zbek madaniyati va musiqiy an’analari bilan uyg‘un</span>
                <span className="flex items-center gap-1 text-red-400">
                  <Heart size={12} className="fill-current" /> O‘zbekiston
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              Tushundim, boshlaymiz!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
