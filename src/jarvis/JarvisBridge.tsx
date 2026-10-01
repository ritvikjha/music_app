/**
 * src/jarvis/JarvisBridge.tsx
 *
 * Headless React component mounted inside the root provider tree in _layout.tsx.
 *
 * Connects the live React context states (PlayerContext, QueueContext, LibraryContext,
 * JamContext, SleepTimerContext, ToastContext, Expo Router) to the module-level registry
 * in registry.ts so executor.ts can execute intents through the identical code paths used by the UI.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { usePlayer } from '../context/PlayerContext';
import { useQueue } from '../context/QueueContext';
import { useLibrary } from '../context/LibraryContext';
import { useJam } from '../context/JamContext';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useToast } from '../context/ToastContext';
import { registerLiveHandlers, type LiveJarvisHandlers } from './actions/registry';
import type { Song, RepeatMode } from '../types';

export function JarvisBridge() {
  const router = useRouter();
  const player = usePlayer();
  const queue = useQueue();
  const library = useLibrary();
  const jam = useJam();
  const sleepTimer = useSleepTimer();
  const toast = useToast();

  // Keep references fresh for live callbacks
  const playerRef = useRef(player);
  const queueRef = useRef(queue);
  const libraryRef = useRef(library);
  const jamRef = useRef(jam);
  const sleepTimerRef = useRef(sleepTimer);
  const toastRef = useRef(toast);

  playerRef.current = player;
  queueRef.current = queue;
  libraryRef.current = library;
  jamRef.current = jam;
  sleepTimerRef.current = sleepTimer;
  toastRef.current = toast;

  useEffect(() => {
    const handlers: LiveJarvisHandlers = {
      // Playback
      play: () => playerRef.current.play(),
      pause: () => playerRef.current.pause(),
      togglePlayPause: () => playerRef.current.togglePlayPause(),
      seekTo: (ms: number) => playerRef.current.seekTo(ms),
      skipNext: (opts) => playerRef.current.skipNext(opts),
      skipPrevious: () => playerRef.current.skipPrevious(),
      playSong: (song: Song, contextList?: Song[]) => playerRef.current.playSong(song),
      getCurrentSong: () => playerRef.current.currentSong,
      getIsPlaying: () => playerRef.current.isPlaying,
      getPositionMs: () => playerRef.current.positionMs,
      getDurationMs: () => playerRef.current.durationMs,

      // Queue
      getQueue: () => queueRef.current.queue,
      playNow: (song: Song, contextList?: Song[]) => queueRef.current.playNow(song, contextList),
      playNextInQueue: (song: Song) => queueRef.current.playNext(song),
      addToQueue: (song: Song) => queueRef.current.addToQueue(song),
      clearQueue: () => queueRef.current.clear(),
      getShuffle: () => queueRef.current.shuffle,
      setShuffle: (on: boolean) => {
        if (queueRef.current.shuffle !== on) {
          queueRef.current.toggleShuffle();
        }
      },
      getRepeatMode: () => queueRef.current.repeatMode,
      setRepeatMode: (mode: RepeatMode) => {
        // Cycle until mode matches
        let cur = queueRef.current.repeatMode;
        let attempts = 0;
        while (cur !== mode && attempts < 3) {
          queueRef.current.cycleRepeatMode();
          cur = queueRef.current.repeatMode;
          attempts++;
        }
      },

      // Library
      isLiked: (songId: string) => libraryRef.current.isLiked(songId),
      toggleLike: (song: Song) => libraryRef.current.toggleLike(song),

      // Sleep Timer
      startSleepTimer: (minutes: number) => sleepTimerRef.current.startTimer(minutes),
      cancelSleepTimer: () => sleepTimerRef.current.cancelTimer(),
      getSleepTimerActive: () => sleepTimerRef.current.isActive,

      // Navigation
      navigate: (screen) => {
        try {
          switch (screen) {
            case 'home':
              router.navigate('/(tabs)' as any);
              break;
            case 'library':
              router.navigate('/(tabs)/library' as any);
              break;
            case 'jam':
              router.navigate('/(tabs)/jam' as any);
              break;
            case 'games':
              router.navigate('/(tabs)/games' as any);
              break;
            case 'profile':
              router.navigate('/(tabs)/profile' as any);
              break;
            case 'player':
              router.push('/player' as any);
              break;
            case 'friends':
              router.push('/friends' as any);
              break;
          }
        } catch (e) {
          console.warn('[JarvisBridge] Navigation error:', e);
        }
      },

      // Toast feedback
      showToast: (message, type = 'info', duration) => {
        toastRef.current.showToast(message, type, duration);
      },

      // Jam room synchronization
      getJamState: () => ({
        isInRoom: jamRef.current.isInRoom,
        isHost: jamRef.current.isHost,
        allowGuestPlayback: jamRef.current.allowGuestPlayback,
        allowGuestQueue: jamRef.current.allowGuestQueue,
        memberCount: jamRef.current.memberCount,
        roomId: jamRef.current.roomId,
      }),
      jamPlay: () => jamRef.current.jamPlay(),
      jamPause: () => jamRef.current.jamPause(),
      jamSeek: (ms: number) => jamRef.current.jamSeek(ms),
      jamChangeSong: (song: Song) => jamRef.current.jamChangeSong(song),
      jamSkipNext: () => jamRef.current.jamSkipNext(),
      jamAddToQueue: (song: Song) => jamRef.current.jamAddToQueue(song),
      leaveRoom: () => jamRef.current.leaveRoom(),
    };

    const unregister = registerLiveHandlers(handlers);
    console.log('[JarvisBridge] Live React context handlers registered');

    return () => {
      unregister();
      console.log('[JarvisBridge] Live React context handlers unregistered');
    };
  }, [router]);

  return null;
}
