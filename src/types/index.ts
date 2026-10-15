export type DanceStyleId = 'andijon' | 'lazgi' | 'pop' | 'toyxona' | 'komik';

export interface DanceStyle {
  id: DanceStyleId;
  name: string;
  icon: string;
  description: string;
  tagline: string;
  tiltMultiplier: number;
  bobMultiplier: number;
  swayMultiplier: number;
  squashMultiplier: number;
  shakeFrequency: number;
  shakeAmplitude: number;
}

export type MusicCategory = 'milliy' | 'pop' | 'toy' | 'maxsus';

export interface Song {
  id: string;
  title: string;
  artist: string;
  category: MusicCategory;
  categoryName: string;
  bpm: number;
  duration: number; // seconds
  coverGradient: string;
  coverEmoji: string;
  description: string;
  defaultDanceStyle: DanceStyleId;
  synthPreset: 'andijon_polka' | 'lazgi_beat' | 'uzbek_pop' | 'toyxona_shox' | 'doira_solo' | 'dilxiroj';
  audioUrl?: string; // If custom file uploaded or external
}

export interface FaceBounds {
  // Normalized 0 to 1 coordinates within the image
  x: number; // Center X of face
  y: number; // Center Y of face
  width: number; // Width of head box
  height: number; // Height of head box
  neckPivotY: number; // Relative pivot point Y (e.g. 0.95 = base of chin/neck)
  rotationAngle?: number;
}

export interface DanceSettings {
  speed: number; // 0.5 to 2.0
  intensity: number; // 0.5 to 2.0
  style: DanceStyleId;
  accessory: 'none' | 'doppi' | 'glasses' | 'crown' | 'sparkles';
  partyEffects: boolean;
  discoLights: boolean;
  doiraEcho: boolean;
}

export interface PresetPortrait {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  faceBounds: FaceBounds;
}
