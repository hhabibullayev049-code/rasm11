import { Song } from '../types';

export interface AudioAnalysis {
  bass: number; // 0.0 to 1.0
  mid: number; // 0.0 to 1.0
  treble: number; // 0.0 to 1.0
  overall: number; // 0.0 to 1.0
  beatDetected: boolean;
  rawFrequencies: Uint8Array;
}

class UzbekAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private currentSong: Song | null = null;
  private activeBufferSource: AudioBufferSourceNode | null = null;
  private customAudioBuffer: AudioBuffer | null = null;
  private customAudioUrl: string | null = null;

  // Synthesizer pattern scheduler
  private timerId: number | null = null;
  private currentStep = 0;
  private lastBeatTime = 0;
  private lastBassEnergy = 0;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(64));


  // Callbacks
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private onEndCallback?: () => void;
  private startTime = 0;
  private pauseOffset = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.75;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentSong(): Song | null {
    return this.currentSong;
  }

  /**
   * Play a song (either synth preset or uploaded file)
   */
  public async playSong(
    song: Song,
    onTimeUpdate?: (currentTime: number, duration: number) => void,
    onEnd?: () => void
  ) {
    this.initContext();
    if (!this.ctx) return;

    if (this.isPlaying) {
      this.stop();
    }

    this.currentSong = song;
    this.isPlaying = true;
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onEndCallback = onEnd;
    this.startTime = this.ctx.currentTime - this.pauseOffset;

    if (song.audioUrl) {
      await this.playCustomAudio(song.audioUrl);
    } else {
      this.startSynthesizerLoop(song);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.pauseOffset = 0;

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.activeBufferSource) {
      try {
        this.activeBufferSource.stop();
        this.activeBufferSource.disconnect();
      } catch {
        // Ignore if already stopped
      }
      this.activeBufferSource = null;
    }
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.ctx) {
      this.pauseOffset = this.ctx.currentTime - this.startTime;
    }
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.activeBufferSource) {
      try {
        this.activeBufferSource.stop();
      } catch {
        // Ignore
      }
      this.activeBufferSource = null;
    }
  }

  public resume() {
    if (this.currentSong && !this.isPlaying) {
      this.playSong(this.currentSong, this.onTimeUpdateCallback, this.onEndCallback);
    }
  }

  /**
   * Load custom audio file (from user upload)
   */
  public async loadCustomAudioFile(file: File): Promise<string> {
    this.initContext();
    if (!this.ctx) throw new Error('Audio Context init failed');

    const arrayBuffer = await file.arrayBuffer();
    this.customAudioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.customAudioUrl = URL.createObjectURL(file);
    return this.customAudioUrl;
  }

  private async playCustomAudio(url: string) {
    if (!this.ctx || !this.masterGain) return;

    try {
      if (!this.customAudioBuffer || this.customAudioUrl !== url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.customAudioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.customAudioUrl = url;
      }

      this.activeBufferSource = this.ctx.createBufferSource();
      this.activeBufferSource.buffer = this.customAudioBuffer;
      this.activeBufferSource.loop = true;
      this.activeBufferSource.connect(this.masterGain);

      const offset = this.pauseOffset % (this.customAudioBuffer?.duration || 1);
      this.activeBufferSource.start(0, offset);

      this.activeBufferSource.onended = () => {
        if (this.isPlaying && this.onEndCallback) {
          this.onEndCallback();
        }
      };

      // Periodic timer for progress update
      this.timerId = window.setInterval(() => {
        if (!this.ctx || !this.isPlaying || !this.customAudioBuffer) return;
        const cur = (this.ctx.currentTime - this.startTime) % this.customAudioBuffer.duration;
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(cur, this.customAudioBuffer.duration);
        }
      }, 100);
    } catch (err) {
      console.error('Error playing audio file:', err);
      // Fallback to synth if external file fails
      if (this.currentSong) {
        this.startSynthesizerLoop(this.currentSong);
      }
    }
  }

  /**
   * Synthesizer engine that creates authentic Uzbek traditional & pop rhythms
   */
  private startSynthesizerLoop(song: Song) {
    if (!this.ctx) return;

    this.currentStep = 0;
    const bpm = song.bpm;
    // 16th notes: interval in ms = (60 / bpm / 4) * 1000
    const stepIntervalMs = (60000 / bpm) / 4;

    this.timerId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      this.playSynthStep(song, this.currentStep, now);
      this.currentStep = (this.currentStep + 1) % 32;

      const duration = song.duration;
      const elapsed = (now - this.startTime) % duration;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(elapsed, duration);
      }
    }, stepIntervalMs);
  }

  /**
   * Uzbek percussion & melody step sequencer
   */
  private playSynthStep(song: Song, step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    const preset = song.synthPreset;

    switch (preset) {
      case 'andijon_polka':
        this.playAndijonPolkaStep(step, time);
        break;
      case 'lazgi_beat':
        this.playLazgiStep(step, time);
        break;
      case 'uzbek_pop':
        this.playUzbekPopStep(step, time);
        break;
      case 'toyxona_shox':
        this.playToyxonaStep(step, time);
        break;
      case 'dilxiroj':
        this.playDilxirojStep(step, time);
        break;
      case 'doira_solo':
      default:
        this.playDoiraSoloStep(step, time);
        break;
    }
  }

  // --- INSTRUMENT GENERATORS ---

  /**
   * Authentic Doira "BUM" (Deep resonant bass punch with skin vibration)
   */
  private playDoiraBum(time: number, volume = 1.0, pitch = 95) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch * 1.5, time);
    osc.frequency.exponentialRampToValueAtTime(pitch, time + 0.05);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.35);

    gain.gain.setValueAtTime(volume * 0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  /**
   * Authentic Doira "BAK" / "TAQ" (Sharp rim slap with crisp overtones)
   */
  private playDoiraBak(time: number, volume = 0.8, pitch = 440) {
    if (!this.ctx || !this.masterGain) return;

    // Resonant bandpass filtered snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, time + 0.08);

    gain.gain.setValueAtTime(volume * 0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.13);

    // Add metallic noise ring (doira halqalari / zanglari)
    this.playZangNoise(time, volume * 0.5, 0.08);
  }

  /**
   * Doira metallic jingle rings (zang)
   */
  private playZangNoise(time: number, volume = 0.3, duration = 0.06) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  /**
   * Melodic synth pluck (Ney / Tanbur / Accordion vibe)
   */
  private playMelodyNote(time: number, freq: number, duration = 0.2, type: OscillatorType = 'sawtooth', volume = 0.25) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, time + duration);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  /**
   * Clap / Qarsak for wedding and dance celebration
   */
  private playClap(time: number, volume = 0.6) {
    this.playZangNoise(time, volume * 1.2, 0.15);
  }

  // --- PRESET SEQUENCES ---

  /**
   * 1. ANDIJON POLKASI (Iconic 2/4 rhythm, fast, joyful)
   */
  private playAndijonPolkaStep(step: number, time: number) {
    // 16-step bar:
    // Beat 1 (step 0): BUM
    // Beat 1& (step 2): Zang
    // Beat 2 (step 4): BAK
    // Beat 2& (step 6): BAK
    // Repeat for 8, 12...
    const pos = step % 8;

    if (pos === 0) {
      this.playDoiraBum(time, 1.0, 105);
    } else if (pos === 2) {
      this.playZangNoise(time, 0.4);
    } else if (pos === 4) {
      this.playDoiraBak(time, 0.9, 520);
    } else if (pos === 6) {
      this.playDoiraBak(time, 0.85, 480);
      this.playZangNoise(time, 0.5);
    }

    // Iconic Polka melody line notes: E4, G#4, A4, B4, C5, B4, A4...
    const polkaNotes = [
      329.63, 0, 415.30, 0, 440.00, 440.00, 493.88, 0,
      523.25, 0, 493.88, 0, 440.00, 440.00, 415.30, 0,
      329.63, 0, 440.00, 0, 493.88, 493.88, 523.25, 0,
      587.33, 523.25, 493.88, 440.00, 415.30, 0, 329.63, 0
    ];

    const note = polkaNotes[step];
    if (note && note > 0) {
      this.playMelodyNote(time, note, 0.16, 'sawtooth', 0.22);
    }
  }

  /**
   * 2. XORAZM LAZGISI (6/8 & 12/8 syncopated gallop rhythm, fiery fast!)
   */
  private playLazgiStep(step: number, time: number) {
    // Lazgi triplet-based dynamic accent:
    // Bum ... Bak ... Bak-Bak ... Bum
    if (step % 8 === 0) {
      this.playDoiraBum(time, 1.1, 90);
    } else if (step % 8 === 3) {
      this.playDoiraBak(time, 0.9, 550);
    } else if (step % 8 === 5) {
      this.playDoiraBak(time, 0.75, 600);
    } else if (step % 8 === 6) {
      this.playDoiraBak(time, 0.95, 520);
      this.playZangNoise(time, 0.6);
    }

    // High energy Lazgi tar riff (D, Eb, F#, G, A, Bb...)
    const lazgiScale = [
      293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33
    ];
    if (step % 2 === 0) {
      const idx = (step / 2) % lazgiScale.length;
      this.playMelodyNote(time, lazgiScale[idx], 0.12, 'triangle', 0.28);
    }
  }

  /**
   * 3. ZAMONAVIY O‘ZBEK POP (4/4 heavy bass kick + clap + synth arpeggio)
   */
  private playUzbekPopStep(step: number, time: number) {
    const pos = step % 16;

    // Four on the floor kick
    if (pos === 0 || pos === 4 || pos === 8 || pos === 12) {
      this.playDoiraBum(time, 1.2, 75);
    }

    // Crisp claps on 4 and 12
    if (pos === 4 || pos === 12) {
      this.playClap(time, 0.7);
    }

    // Doira syncope on 7 and 10
    if (pos === 7 || pos === 10) {
      this.playDoiraBak(time, 0.75, 480);
    }

    // 16th hi-hats
    if (pos % 2 === 1) {
      this.playZangNoise(time, 0.35, 0.04);
    }

    // Pop Bassline (A minor / F major progression)
    const bassFreqs = [110, 110, 110, 110, 87.31, 87.31, 98.0, 98.0];
    const bNote = bassFreqs[Math.floor(step / 4) % bassFreqs.length];
    if (pos % 4 === 0) {
      this.playMelodyNote(time, bNote, 0.25, 'sawtooth', 0.3);
    }
  }

  /**
   * 4. TO‘YXONA SHOKH (Biyron-biyron wedding dance, joyful accordion)
   */
  private playToyxonaStep(step: number, time: number) {
    const pos = step % 8;
    if (pos === 0) {
      this.playDoiraBum(time, 1.15, 100);
      this.playClap(time, 0.4);
    } else if (pos === 2) {
      this.playDoiraBak(time, 0.8, 500);
    } else if (pos === 4) {
      this.playDoiraBak(time, 1.0, 580);
      this.playClap(time, 0.8);
    } else if (pos === 6) {
      this.playDoiraBak(time, 0.85, 490);
    }

    // Happy wedding chord stabs (C major / G major)
    if (pos === 2 || pos === 6) {
      this.playMelodyNote(time, 523.25, 0.1, 'square', 0.14);
      this.playMelodyNote(time, 659.25, 0.1, 'square', 0.14);
    }
  }

  /**
   * 5. DILXIROJ (Classic lyrical dance with rhythmic claps)
   */
  private playDilxirojStep(step: number, time: number) {
    const pos = step % 8;
    if (pos === 0) {
      this.playDoiraBum(time, 1.0, 95);
    } else if (pos === 3) {
      this.playDoiraBak(time, 0.8, 480);
    } else if (pos === 4) {
      this.playClap(time, 0.7);
    } else if (pos === 6) {
      this.playDoiraBak(time, 0.7, 520);
    }

    // Dilxiroj melody notes
    const notes = [440, 0, 493.88, 0, 523.25, 493.88, 440, 392];
    const n = notes[pos];
    if (n > 0) {
      this.playMelodyNote(time, n, 0.18, 'sine', 0.25);
    }
  }

  /**
   * 6. DOIRA SOLO (Pure percussion masterclass)
   */
  private playDoiraSoloStep(step: number, time: number) {
    const pos = step % 16;
    if (pos === 0 || pos === 6 || pos === 10) {
      this.playDoiraBum(time, 1.2, 100);
    }
    if (pos === 2 || pos === 4 || pos === 8 || pos === 12 || pos === 14) {
      this.playDoiraBak(time, 0.9, 520 + (pos * 15));
    }
    this.playZangNoise(time, 0.25, 0.05);
  }

  /**
   * Real-time audio analysis for dance physics
   */
  public getAnalysis(): AudioAnalysis {
    if (!this.analyser) {
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        overall: 0,
        beatDetected: false,
        rawFrequencies: this.freqData,
      };
    }

    this.analyser.getByteFrequencyData(this.freqData);

    const binCount = this.freqData.length;
    // Bass: bins 0 - 6 (approx 0 - 300Hz)
    let bassSum = 0;
    const bassBins = Math.min(6, binCount);
    for (let i = 0; i < bassBins; i++) {
      bassSum += this.freqData[i];
    }
    const bass = bassSum / (bassBins * 255);

    // Mids: bins 7 - 24 (approx 300 - 1500Hz)
    let midSum = 0;
    const midBins = Math.min(24, binCount);
    for (let i = bassBins; i < midBins; i++) {
      midSum += this.freqData[i];
    }
    const mid = midSum / ((midBins - bassBins) * 255);

    // Treble: bins 25 - 63 (approx 1500 - 8000Hz)
    let trebleSum = 0;
    for (let i = midBins; i < binCount; i++) {
      trebleSum += this.freqData[i];
    }
    const treble = trebleSum / ((binCount - midBins) * 255);

    // Overall energy
    const overall = (bass * 0.5 + mid * 0.3 + treble * 0.2);

    // Beat transient detection (sudden bass spike)
    const now = performance.now();
    let beatDetected = false;
    const bassDelta = bass - this.lastBassEnergy;
    if (bassDelta > 0.18 && bass > 0.45 && now - this.lastBeatTime > 220) {
      beatDetected = true;
      this.lastBeatTime = now;
    }
    this.lastBassEnergy = bass;

    return {
      bass,
      mid,
      treble,
      overall,
      beatDetected,
      rawFrequencies: this.freqData,
    };
  }
}

export const audioEngine = new UzbekAudioEngine();
