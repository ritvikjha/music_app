// ─── Song ────────────────────────────────────────────────────────────────────

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  imageUrl: string; // album art (highest quality available)
  streamUrl: string; // direct audio streaming URL
  artistId?: string;
  albumId?: string;
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
  votes?: number;
  upvoters?: string[];
}

export interface JamQueueState {
  roomId: string;
  entries: Array<{
    songId: string;
    addedBy: string;
    votes?: number;
    upvoters?: string[];
  }>;
}

export interface JamRoomActivity {
  id: string;
  roomId: string;
  text: string;
  user: {
    username: string;
  };
  timestamp: number;
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

export interface FriendRequest {
  id: string;
  from: {
    username: string;
    tag: string;
  };
  to: {
    username: string;
    tag: string;
  };
  timestamp: number;
}

export interface GameInvite {
  from: { username: string; tag: string };
  roomId: string;
  gameType?: OnlineDuelType | null;
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

export interface JamLyricsSync {
  lineIndex: number;
  lineText: string;
  timestamp: number;
}

export interface JamVoiceSnippet {
  id: string;
  roomId: string;
  audioBase64: string;
  durationMs: number;
  user: {
    username: string;
  };
  timestamp: number;
}

export interface JamHostState {
  hostSocketId: string;
  hostUsername: string;
  volumeWeight: number;
  mutedUsers: string[];
  allowGuestQueue?: boolean;
  allowGuestPlayback?: boolean;
}

export interface JamDjOverrideAction {
  type: 'force-skip' | 'mute-user' | 'volume-weight';
  targetUser?: string;
  volumeWeight?: number;
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

export type PartyGameMode = 'hub' | 'bottle' | 'wyr' | 'nhie' | 'mlt' | 'word_duel' | 'two_truths_lie' | 'trivia_duel';

export type TruthOrDareDeck = 'easy' | 'normal' | 'cheesy';

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

export type OnlineDuelType = 'word_duel' | 'two_truths_lie' | 'trivia_duel';
export type TriviaDifficulty = 'easy' | 'medium' | 'difficult';
export type TriviaCategory = 'Any topic' | 'Anime' | 'Movies' | 'Songs' | 'General Knowledge' | 'Science' | 'Geography' | 'History' | 'Nature' | 'Food' | 'Culture' | 'Quick Facts';
export interface TriviaDuelSettings {
  category: TriviaCategory;
  difficulty: TriviaDifficulty;
}
export type OnlineDuelPhase = 'playing' | 'write' | 'guess' | 'question' | 'result' | 'finished';

/** Public snapshot for online 1v1 games; secret answers are hidden until their reveal. */
export interface OnlineDuelState {
  type: OnlineDuelType;
  players: [string, string];
  turn: number;
  scores: [number, number];
  phase: OnlineDuelPhase;
  chain: string[];
  round: number;
  storyteller: number;
  statements: string[];
  guessIndex: number | null;
  lieIndex: number | null;
  myPlayerIndex?: number | null;
  mySecretLieIndex?: number | null;
  question?: { category: string; prompt: string; options: string[] } | null;
  answerIndex?: number | null;
  selectedIndex?: number | null;
  category?: string;
  difficulty?: TriviaDifficulty;
  rematchVotes?: [OnlineDuelType | null, OnlineDuelType | null];
  winner: string | null;
}

// ─── Presence & Activity Feed ────────────────────────────────────────────────

export interface UserPresence {
  username: string;
  tag: string;
  currentSong: {
    title: string;
    artist: string;
    imageUrl?: string;
  } | null;
  isPlaying: boolean;
  lastSeen: number;
  isOnline?: boolean;
  roomId?: string | null;
  currentGame?: { type: OnlineDuelType; roomId: string } | null;
}

export interface LiveActivityFeedItem {
  id: string;
  type: 'room_created' | 'track_upvoted' | 'playlist_added' | 'vibe_started';
  user: {
    username: string;
    tag?: string;
  };
  meta: string;
  roomId?: string;
  timestamp: number;
}

export type VisualizerMode = 'bars' | 'wave' | 'particles' | 'hologram';

