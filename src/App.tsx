/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Song, FaceBounds } from './types';
import { UZBEK_SONGS } from './data/songs';
import { Header } from './components/Header';
import { PhotoUploader } from './components/PhotoUploader';
import { SongSelector } from './components/SongSelector';
import { DanceStage } from './components/DanceStage';
import { Camera, Music, Sparkles, ArrowRight, Play, Check } from 'lucide-react';

export default function App() {
  const [currentStep, setCurrentStep] = useState<'photo' | 'song' | 'stage'>('photo');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [faceBounds, setFaceBounds] = useState<FaceBounds | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song>(UZBEK_SONGS[0]); // Default Andijon Polkasi

  const handlePhotoSelected = (src: string, bounds: FaceBounds) => {
    setImageSrc(src);
    setFaceBounds(bounds);
    // If not chosen song yet, suggest song step or if ready, stage
    if (!selectedSong) {
      setCurrentStep('song');
    }
  };

  const handleClearPhoto = () => {
    setImageSrc(null);
    setFaceBounds(null);
    setCurrentStep('photo');
  };

  const handleUpdateBounds = (newBounds: FaceBounds) => {
    setFaceBounds(newBounds);
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
  };

  const canDance = !!imageSrc && !!faceBounds && !!selectedSong;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Global Navigation Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
        {/* Step Indicator Tabs */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl gap-1 sm:gap-2">
            {/* Step 1: Photo */}
            <button
              type="button"
              onClick={() => setCurrentStep('photo')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentStep === 'photo'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Camera size={16} />
              <span>1. Rasm yuklash</span>
              {imageSrc && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
              )}
            </button>

            {/* Step 2: Song */}
            <button
              type="button"
              onClick={() => setCurrentStep('song')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentStep === 'song'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Music size={16} />
              <span>2. Qo‘shiq tanlash</span>
              {selectedSong && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
              )}
            </button>

            {/* Step 3: Stage */}
            <button
              type="button"
              onClick={() => {
                if (canDance) {
                  setCurrentStep('stage');
                }
              }}
              disabled={!canDance}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 'stage'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles size={16} />
              <span>3. AI Raqs 💃</span>
            </button>
          </div>
        </div>

        {/* View Switcher */}
        {currentStep === 'photo' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <PhotoUploader
              currentImage={imageSrc}
              faceBounds={faceBounds}
              onPhotoSelected={handlePhotoSelected}
              onClearPhoto={handleClearPhoto}
              onUpdateBounds={handleUpdateBounds}
            />

            {/* If photo is uploaded, show Next Step prompt */}
            {imageSrc && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-slate-900 border border-amber-500/30 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
                    🎶
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Tanlangan qo‘shiq: {selectedSong?.title}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Raqsga tushirish uchun davom eting yoki boshqa musiqa tanlang
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('song')}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                  >
                    Qo‘shiqni o‘zgartirish
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('stage')}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <span>Raqsga tushirish! 💃</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'song' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <SongSelector
              selectedSong={selectedSong}
              onSelectSong={handleSelectSong}
            />

            {/* Next Step confirmation */}
            <div className="sticky bottom-4 z-30 flex items-center justify-between p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl">
              <div>
                <p className="text-xs text-slate-400">Tanlangan qo‘shiq:</p>
                <p className="text-sm font-bold text-amber-400">
                  {selectedSong.title} — {selectedSong.artist}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!imageSrc && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep('photo')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Avval rasm yuklang
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (imageSrc) {
                      setCurrentStep('stage');
                    } else {
                      setCurrentStep('photo');
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition active:scale-95"
                >
                  {imageSrc ? (
                    <>
                      <span>Raqsga tushirish! 💃</span>
                      <ArrowRight size={14} />
                    </>
                  ) : (
                    <span>Rasm tanlashga o‘tish</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'stage' && imageSrc && faceBounds && selectedSong && (
          <div className="animate-in fade-in duration-200">
            <DanceStage
              imageSrc={imageSrc}
              faceBounds={faceBounds}
              song={selectedSong}
              onEditPhoto={() => setCurrentStep('photo')}
              onChangeSong={() => setCurrentStep('song')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">AI Photo Dance 🎶</span>
            <span>—</span>
            <span>O‘zbekcha AI Raqs Ilovasi</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Faqat bosh, yuz va bo‘yin harakatlanadi • Tana va fon saqlanadi
          </div>
        </div>
      </footer>
    </div>
  );
}
