import AsyncStorage from '@react-native-async-storage/async-storage';
import { audioPlayer } from './audioPlayer';
import type { SoundPreset, SoundPresetId } from '../types';

export const SOUND_PRESETS_KEY = '@jam_sound_preset';
export const PLAYBACK_RATE_KEY = '@jam_playback_rate';

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'cyber_dynamic',
    name: 'Cyber Dynamic',
    tagline: 'Studio Balance & Punch',
    icon: 'sparkles',
    accentColor: '#00F2FE',
    bands: [3, 1, 0, 2, 4],
    volumeGain: 1.0,
    playbackRate: 1.0,
    description: 'Pristine high-end clarity with tight, punchy low-end and wide stereo dynamics.',
  },
  {
    id: 'bass_heavy',
    name: 'Bass Heavy',
    tagline: '808 Boost & Deep Subs',
    icon: 'flame',
    accentColor: '#FF007F',
    bands: [6, 4, -1, 1, 2],
    volumeGain: 1.0,
    playbackRate: 1.0,
    description: 'Maximum low-frequency energy for electronic, hip-hop, club & heavy bass drops.',
  },
  {
    id: 'vocal_clarity',
    name: 'Vocal Clarity',
    tagline: 'Crisp Lyrics & Presence',
    icon: 'mic',
    accentColor: '#A855F7',
    bands: [-2, 0, 4, 3, 1],
    volumeGain: 1.0,
    playbackRate: 1.0,
    description: 'Amplifies voice, harmonies, and acoustic presence while taming mud and rumble.',
  },
  {
    id: 'spatial_synthwave',
    name: 'Spatial Synthwave',
    tagline: 'Wide Immersive Soundstage',
    icon: 'planet',
    accentColor: '#38EF7D',
    bands: [2, -1, 1, 4, 5],
    volumeGain: 1.0,
    playbackRate: 1.0,
    description: 'Expansive airy space with shimmering highs and lush retro-wave atmospheric depth.',
  },
  {
    id: 'lofi_analog',
    name: 'Lo-Fi Analog',
    tagline: 'Tape Saturation & Mellow',
    icon: 'radio',
    accentColor: '#F59E0B',
    bands: [4, 3, 1, -2, -4],
    volumeGain: 0.95,
    playbackRate: 1.0,
    description: 'Soft, rolled-off vintage warmth evoking vinyl records, cassette tape, and chill vibes.',
  },
];

export const FREQUENCY_LABELS = ['60Hz', '250Hz', '1kHz', '4kHz', '16kHz'];

/**
 * Get active sound preset from storage. Defaults to cyber_dynamic.
 */
export async function getActivePreset(): Promise<SoundPreset> {
  try {
    const savedId = await AsyncStorage.getItem(SOUND_PRESETS_KEY);
    if (savedId) {
      const found = SOUND_PRESETS.find((p) => p.id === savedId);
      if (found) return found;
    }
  } catch (err) {
    console.warn('[SoundPresets] load error:', err);
  }
  return SOUND_PRESETS[0];
}

/**
 * Save and apply a sound preset.
 */
export async function applySoundPreset(preset: SoundPreset): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_PRESETS_KEY, preset.id);
    await audioPlayer.setVolume(preset.volumeGain);
  } catch (err) {
    console.warn('[SoundPresets] save error:', err);
  }
}

/**
 * Get active playback rate.
 */
export async function getActivePlaybackRate(): Promise<number> {
  try {
    const rateStr = await AsyncStorage.getItem(PLAYBACK_RATE_KEY);
    if (rateStr) {
      const parsed = parseFloat(rateStr);
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
        return parsed;
      }
    }
  } catch {}
  return 1.0;
}

/**
 * Save and apply playback speed.
 */
export async function applyPlaybackRate(rate: number): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAYBACK_RATE_KEY, String(rate));
    await audioPlayer.setPlaybackRate(rate);
  } catch (err) {
    console.warn('[SoundPresets] save rate error:', err);
  }
}
