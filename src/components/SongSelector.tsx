import React, { useState, useRef } from 'react';
import { Song, MusicCategory } from '../types';
import { UZBEK_SONGS } from '../data/songs';
import { Play, Pause, Check, Music2, Upload, Search, Flame, Sparkles, PartyPopper } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

interface SongSelectorProps {
  selectedSong: Song | null;
  onSelectSong: (song: Song) => void;
  onCustomSongUploaded?: (song: Song) => void;
}

export const SongSelector: React.FC<SongSelectorProps> = ({
  selectedSong,
  onSelectSong,
  onCustomSongUploaded,
}) => {
  const [activeCategory, setActiveCategory] = useState<MusicCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewingSongId, setPreviewingSongId] = useState<string | null>(null);
  const audioUploadInputRef = useRef<HTMLInputElement>(null);
  const [allSongs, setAllSongs] = useState<Song[]>(UZBEK_SONGS);

  const categories: { id: MusicCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Barchasi', icon: <Music2 size={15} /> },
    { id: 'milliy', label: 'Milliy Raqs', icon: <Flame size={15} className="text-amber-400" /> },
    { id: 'pop', label: 'Zamonaviy Pop', icon: <Sparkles size={15} className="text-purple-400" /> },
    { id: 'toy', label: 'To‘y Qo‘shiqlari', icon: <PartyPopper size={15} className="text-pink-400" /> },
  ];

  const handlePreview = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();

    if (previewingSongId === song.id) {
      // Pause
      audioEngine.stop();
      setPreviewingSongId(null);
    } else {
      // Play
      audioEngine.playSong(song, undefined, () => {
        setPreviewingSongId(null);
      });
      setPreviewingSongId(song.id);
    }
  };

  const handleSelect = (song: Song) => {
    // If it was previewing another song, stop preview
    if (previewingSongId && previewingSongId !== song.id) {
      audioEngine.stop();
      setPreviewingSongId(null);
    }
    onSelectSong(song);
  };

  const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const audioUrl = await audioEngine.loadCustomAudioFile(file);
      const newSong: Song = {
        id: `custom_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Siz yuklagan musiqa',
        category: 'maxsus',
        categoryName: 'Mening Musiqam',
        bpm: 128,
        duration: 180,
        coverGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
        coverEmoji: '🎵',
        description: 'Foydalanuvchi tomonidan yuklangan musiqa fayli.',
        defaultDanceStyle: 'pop',
        synthPreset: 'uzbek_pop',
        audioUrl,
      };

      setAllSongs((prev) => [newSong, ...prev]);
      onSelectSong(newSong);
      if (onCustomSongUploaded) {
        onCustomSongUploaded(newSong);
      }
    } catch (err) {
      alert('Audio faylni yuklashda xatolik: ' + (err as Error).message);
    }
    e.target.value = '';
  };

  const filteredSongs = allSongs.filter((song) => {
    const matchesCat = activeCategory === 'all' || song.category === activeCategory;
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Hidden custom audio input */}
      <input
        ref={audioUploadInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/*"
        className="hidden"
        onChange={handleCustomAudioUpload}
      />

      {/* Header and Category Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎶</span>
            <h3 className="text-lg font-bold text-white">Qo‘shiq Tanlash Markazi</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            O‘zbekona sho‘x qo‘shiqlardan birini tanlang yoki o‘z musiqangizni yuklang
          </p>
        </div>

        {/* Upload Own Music Button */}
        <button
          type="button"
          onClick={() => audioUploadInputRef.current?.click()}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-2 transition active:scale-95 shadow-md"
        >
          <Upload size={14} />
          <span>O‘z qo‘shig‘ingizni yuklang (MP3)</span>
        </button>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Qo‘shiq yoki ijrochi izlash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
      </div>

      {/* Songs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSongs.map((song) => {
          const isSelected = selectedSong?.id === song.id;
          const isPreviewing = previewingSongId === song.id;

          return (
            <div
              key={song.id}
              onClick={() => handleSelect(song)}
              className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/50'
                  : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Cover Art & Play Button */}
                <div
                  className={`relative w-14 h-14 rounded-xl bg-gradient-to-tr ${song.coverGradient} flex items-center justify-center shrink-0 shadow-md overflow-hidden group-hover:scale-105 transition-transform`}
                >
                  <span className="text-2xl select-none">{song.coverEmoji}</span>

                  {/* Play / Pause Preview Overlay Button */}
                  <button
                    type="button"
                    onClick={(e) => handlePreview(e, song)}
                    className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-opacity"
                    title={isPreviewing ? 'To‘xtatish' : 'Tinglab ko‘rish'}
                  >
                    {isPreviewing ? (
                      <div className="flex items-center gap-0.5">
                        <span className="w-1 h-3 bg-white animate-pulse" />
                        <span className="w-1 h-4 bg-white animate-pulse delay-75" />
                        <span className="w-1 h-2 bg-white animate-pulse delay-150" />
                      </div>
                    ) : (
                      <Play size={18} className="fill-white translate-x-0.5" />
                    )}
                  </button>
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 truncate">
                      {song.categoryName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDuration(song.duration)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition">
                    {song.title}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    {song.artist}
                  </p>
                </div>
              </div>

              {/* Description preview */}
              <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                {song.description}
              </p>

              {/* Bottom Bar: BPM badge & Tinglash / Tanlash Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
                    ⚡ {song.bpm} BPM
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Tinglash Button */}
                  <button
                    type="button"
                    onClick={(e) => handlePreview(e, song)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      isPreviewing
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isPreviewing ? <Pause size={12} /> : <Play size={12} />}
                    <span>{isPreviewing ? 'Pauza' : 'Tinglash'}</span>
                  </button>

                  {/* Tanlash Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(song);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check size={13} className="stroke-[3]" />
                        <span>Tanlandi</span>
                      </>
                    ) : (
                      <span>Tanlash</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
