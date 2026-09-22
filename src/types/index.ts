// ─── Song ────────────────────────────────────────────────────────────────────

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  imageUrl: string; // album art (highest quality available)
  streamUrl: string; // direct audio streaming URL
}

// ─── Playback Sync (matches backend contract) ────────────────────────────────

export interface SyncState {
  songId: string | null;
  isPlaying: boolean;
  positionMs: number;
  serverTime: number;
}

export type PlaybackAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seek'; positionMs: number }
  | { type: 'change-song'; songId: string }
  | { type: 'skip-next' };

// ─── Jam Room ────────────────────────────────────────────────────────────────

export interface JamRoom {
  roomId: string;
  memberCount: number;
  currentSong: Song | null;
  isPlaying: boolean;
}

// ─── Queue & Playback Modes ──────────────────────────────────────────────────

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerModes {
  shuffle: boolean;
  repeatMode: RepeatMode;
}

// ─── Sound Presets & Equalizer ────────────────────────────────────────────────

export type SoundPresetId =
  | 'cyber_dynamic'
  | 'bass_heavy'
  | 'vocal_clarity'
  | 'spatial_synthwave'
  | 'lofi_analog';

export interface SoundPreset {
  id: SoundPresetId;
  name: string;
  tagline: string;
  icon: string;
  accentColor: string;
  bands: [number, number, number, number, number]; // 60Hz, 250Hz, 1kHz, 4kHz, 16kHz (-6 to +6 dB)
  volumeGain: number;
  playbackRate: number;
  description: string;
}

// ─── Jam Room Shared Queue ───────────────────────────────────────────────────

export interface JamQueueEntry {
  songId: string;
  song?: Song;
  addedBy: string; // username or username#tag
}

export interface JamQueueState {
  roomId: string;
  entries: Array<{ songId: string; addedBy: string }>;
}

// ─── Friends ─────────────────────────────────────────────────────────────────

export interface Friend {
  id: string;
  username: string;
  tag: string; // 4-digit unique tag (e.g., "4821")
  avatarUrl?: string;
  isOnline: boolean;
  activity?: string; // e.g., "Listening to Shape of You" or "In a Jam room"
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  username: string;
  tag: string; // 4-digit unique tag, generated on first login
}

// ─── Playlists ───────────────────────────────────────────────────────────────

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  songs: Song[];
  coverUrl?: string;
}

// ─── Jam Room Chat & Reactions ───────────────────────────────────────────────

export interface JamChatMessage {
  id: string;
  roomId: string;
  message: string;
  user: {
    username: string;
    tag?: string;
  };
  timestamp: number;
}

export interface JamEmojiReaction {
  id: string;
  roomId: string;
  emoji: string;
  user: {
    username: string;
  };
  timestamp: number;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Player: undefined;
  Library: undefined;
};

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Games: undefined;
  Jam: undefined;
  Profile: undefined;
};

// ─── Social Hangout & Party Games ────────────────────────────────────────────

export type PartyGameMode = 'bottle' | 'wyr' | 'nhie' | 'mlt';

export type TruthOrDareDeck = 'casual' | 'spicy' | 'late_night' | 'chaotic';

export interface TruthOrDareItem {
  id: string;
  type: 'truth' | 'dare';
  deck: TruthOrDareDeck;
  text: string;
}

export interface WouldYouRatherItem {
  id: string;
  optionA: string;
  optionB: string;
  percentA?: number;
  percentB?: number;
}

export interface NeverHaveIEverItem {
  id: string;
  statement: string;
}

export interface MostLikelyToItem {
  id: string;
  prompt: string;
}

// Real-time synchronization events between party members
export type PartyGameEvent =
  | {
      type: 'bottle_spin';
      targetAngle: number;
      durationMs: number;
      spinnerName: string;
      chosenPlayerIndex: number;
    }
  | {
      type: 'bottle_select_card';
      item: TruthOrDareItem;
      deck: TruthOrDareDeck;
      chosenBy: string;
    }
  | {
      type: 'bottle_timer_start';
      seconds: number;
    }
  | {
      type: 'wyr_vote';
      itemId: string;
      option: 'A' | 'B';
      username: string;
    }
  | {
      type: 'wyr_next';
      itemIndex: number;
    }
  | {
      type: 'nhie_lose_life';
      username: string;
      remainingLives: number;
    }
  | {
      type: 'nhie_next';
      itemIndex: number;
    }
  | {
      type: 'nhie_reset';
    }
  | {
      type: 'mlt_vote';
      itemId: string;
      votedFor: string;
      voter: string;
    }
  | {
      type: 'mlt_next';
      itemIndex: number;
    };

