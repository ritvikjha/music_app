/**
 * src/jarvis/actions/registry.ts
 *
 * Module-level registry for live React context handlers provided by <JarvisBridge />.
 *
 * When React components are mounted (App states A and B), live handlers connect
 * Jarvis intent execution directly to PlayerContext, QueueContext, LibraryContext,
 * JamContext, SleepTimerContext, ToastContext, and Expo Router.
 *
 * When React is unmounted (App state C - swiped from recents), getLiveHandlers()
 * returns null, allowing executor.ts to fall back to headless audioPlayer + saavn singletons.
 */

import type { Song, RepeatMode } from '../../types';

export interface LiveJarvisHandlers {
  // Playback controls (PlayerContext)
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
  skipNext: (opts?: { crossfade?: boolean }) => Promise<void>;
  skipPrevious: () => Promise<void>;
  playSong: (song: Song, contextList?: Song[]) => Promise<void>;
  getCurrentSong: () => Song | null;
  getIsPlaying: () => boolean;
  getPositionMs: () => number;
  getDurationMs: () => number;

  // Queue controls (QueueContext)
  getQueue: () => Song[];
  playNow: (song: Song, contextList?: Song[]) => void;
  playNextInQueue: (song: Song) => void;
  addToQueue: (song: Song) => void;
  clearQueue: () => void;
  getShuffle: () => boolean;
  setShuffle: (on: boolean) => void;
  getRepeatMode: () => RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;

  // Library & Likes (LibraryContext)
  isLiked: (songId: string) => boolean;
  toggleLike: (song: Song) => Promise<void>;

  // Sleep Timer (SleepTimerContext)
  startSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  getSleepTimerActive: () => boolean;

  // Navigation (expo-router)
  navigate: (screen: 'home' | 'library' | 'jam' | 'games' | 'profile' | 'player' | 'friends') => void;

  // Toast feedback (ToastContext)
  showToast: (message: string, type?: 'info' | 'success' | 'error', duration?: number) => void;

  // Jam Room synchronization (JamContext)
  getJamState: () => {
    isInRoom: boolean;
    isHost: boolean;
    allowGuestPlayback: boolean;
    allowGuestQueue: boolean;
    memberCount: number;
    roomId: string | null;
  };
  jamPlay: () => void;
  jamPause: () => void;
  jamSeek: (positionMs: number) => void;
  jamChangeSong: (song: Song) => void;
  jamSkipNext: () => void;
  jamAddToQueue: (song: Song) => void;
  leaveRoom: () => void;
}

let activeHandlers: LiveJarvisHandlers | null = null;

/**
 * Register live handlers from <JarvisBridge />.
 * Returns an unregister cleanup function to be called on unmount.
 */
export function registerLiveHandlers(handlers: LiveJarvisHandlers): () => void {
  activeHandlers = handlers;
  return () => {
    if (activeHandlers === handlers) {
      activeHandlers = null;
    }
  };
}

/**
 * Get currently registered live handlers, or null if React tree is unmounted.
 */
export function getLiveHandlers(): LiveJarvisHandlers | null {
  return activeHandlers;
}

/**
 * Check whether the React tree is live and mounted.
 */
export function isLiveMounted(): boolean {
  return activeHandlers !== null;
}
