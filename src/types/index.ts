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
  | { type: 'change-song'; songId: string };

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

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Player: undefined;
  Library: undefined;
};

export type TabParamList = {
  Home: undefined;
  Friends: undefined;
  Jam: undefined;
  Profile: undefined;
};

