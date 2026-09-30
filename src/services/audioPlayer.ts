import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer as ExpoAudioPlayer,
  AudioStatus,
  AudioMetadata,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export interface PlaybackStatus {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isLoaded: boolean;
}

export interface MediaControlHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSeek?: (positionMs: number) => void;
  onToggleLike?: () => void;
}

/**
 * Fallback high-resolution album artwork for Spotify-style lock screen / notification card.
 */
export const DEFAULT_FALLBACK_ARTWORK =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

/**
 * Validates, repairs, and upgrades an image URL into a high-resolution, secure HTTPS URL
 * suitable for native Android/iOS media notifications and lock screen cards.
 * Prevents java.net.MalformedURLException and cleartext HTTP security blocks on Android.
 */
export function formatArtworkUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_FALLBACK_ARTWORK;
  }

  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === 'none'
  ) {
    return DEFAULT_FALLBACK_ARTWORK;
  }

  // Upgrade JioSaavn thumbnail resolutions to 500x500 high-res
  let resolved = trimmed
    .replace(/150x150/gi, '500x500')
    .replace(/50x50/gi, '500x500');

  // Enforce HTTPS for Android network security policy (blocks cleartext HTTP by default)
  if (resolved.startsWith('http://')) {
    resolved = resolved.replace(/^http:\/\//i, 'https://');
  }

  // Handle protocol-relative URLs (//c.saavncdn.com/...)
  if (resolved.startsWith('//')) {
    resolved = `https:${resolved}`;
  }

  // Allow local file URIs (e.g. file:///... from stashed tracks)
  if (resolved.startsWith('file://')) {
    return resolved;
  }

  // Validate format and ensure safe URI encoding for Android Kotlin URL() constructor
  try {
    const encoded = encodeURI(decodeURI(resolved));
    const parsed = new URL(encoded);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return encoded;
    }
    return DEFAULT_FALLBACK_ARTWORK;
  } catch {
    return DEFAULT_FALLBACK_ARTWORK;
  }
}

/**
 * Format and sanitize metadata for OS media session (Expo Audio / Android Media Notification / iOS Control Center).
 * Guarantees non-empty strings and valid artwork URL to ensure rich notification card presentation.
 */
export function formatAudioMetadata(meta?: Partial<AudioMetadata> | null): AudioMetadata {
  const title = (meta?.title || '').trim() || 'Unknown Track';
  const artist = (meta?.artist || '').trim() || 'Unknown Artist';
  const albumTitle = (meta?.albumTitle || '').trim() || title;
  const artworkUrl = formatArtworkUrl(meta?.artworkUrl);

  return {
    title,
    artist,
    albumTitle,
    artworkUrl,
  };
}

type StatusCallback = (status: PlaybackStatus) => void;

/**
 * Singleton audio player wrapping expo-audio.
 * Handles loading, unloading, playback control, lock screen media session, and status updates.
 */
class AudioPlayerService {
  private player: ExpoAudioPlayer | null = null;
  private secondaryPlayer: ExpoAudioPlayer | null = null;
  private statusCallbacks: Set<StatusCallback> = new Set();
  private trackEndCallbacks: Set<() => void> = new Set();
  private isInitialized = false;
  private currentUri: string | null = null;
  private currentMetadata: AudioMetadata | null = null;
  private statusSubscription: { remove: () => void } | null = null;
  private hasFiredTrackEnd = false;
  private currentVolume = 1.0;
  private currentPlaybackRate = 1.0;
  private isCrossfading = false;
  private crossfadeInterval: ReturnType<typeof setInterval> | null = null;
  private originalVolumeBeforeDuck: number | null = null;
  private mediaControlHandlers: MediaControlHandlers = {};

  /**
   * Configure audio mode for music playback (silent mode override & background playback).
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      this.isInitialized = true;
      this.setupWebMediaSessionHandlers();
    } catch (error) {
      console.warn('[AudioPlayer] init warning:', error);
    }
  }

  /**
   * Register callbacks for remote lock screen / media session control actions.
   */
  setMediaControlHandlers(handlers: MediaControlHandlers): void {
    this.mediaControlHandlers = { ...this.mediaControlHandlers, ...handlers };
    this.setupWebMediaSessionHandlers();
  }

  /**
   * Synchronize metadata to web / PWA mediaSession if available.
   */
  private syncWebMediaSession(metadata: AudioMetadata): void {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
      try {
        const art = metadata.artworkUrl || DEFAULT_FALLBACK_ARTWORK;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: metadata.title || 'Unknown Track',
          artist: metadata.artist || 'Unknown Artist',
          album: metadata.albumTitle || 'Jam Music',
          artwork: [
            { src: art, sizes: '512x512', type: 'image/jpeg' },
            { src: art, sizes: '256x256', type: 'image/jpeg' },
            { src: art, sizes: '128x128', type: 'image/jpeg' },
          ],
        });
      } catch (err) {
        console.warn('[AudioPlayer] Web mediaSession metadata sync warning:', err);
      }
    }
  }

  /**
   * Attach action handlers to browser / web media session for cross-platform lock screen parity.
   */
  private setupWebMediaSessionHandlers(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !navigator.mediaSession) {
      return;
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (this.mediaControlHandlers.onPlay) {
          this.mediaControlHandlers.onPlay();
        } else {
          this.play();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.mediaControlHandlers.onPause) {
          this.mediaControlHandlers.onPause();
        } else {
          this.pause();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (this.mediaControlHandlers.onPrevious) {
          this.mediaControlHandlers.onPrevious();
        } else {
          this.seekTo(0);
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (this.mediaControlHandlers.onNext) {
          this.mediaControlHandlers.onNext();
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          const ms = details.seekTime * 1000;
          if (this.mediaControlHandlers.onSeek) {
            this.mediaControlHandlers.onSeek(ms);
          } else {
            this.seekTo(ms);
          }
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = (details.seekOffset || 10) * 1000;
        this.seekForward(offset);
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = (details.seekOffset || 10) * 1000;
        this.seekBackward(offset);
      });

      // Optional action buttons (e.g. Favorite / Like) if supported by host
      const optionalActions = ['like', 'unlike', 'favorite'] as const;
      for (const action of optionalActions) {
        try {
          (navigator.mediaSession as any).setActionHandler(action, () => {
            this.mediaControlHandlers.onToggleLike?.();
          });
        } catch {}
      }
    } catch (e) {
      console.warn('[AudioPlayer] Error registering web mediaSession action handlers:', e);
    }
  }

  /**
   * Subscribe to playback status updates.
   */
  onStatusUpdate(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Subscribe to track completion events.
   */
  onTrackEnd(callback: () => void): () => void {
    this.trackEndCallbacks.add(callback);
    return () => this.trackEndCallbacks.delete(callback);
  }

  private handleStatus = (status: AudioStatus) => {
    const isPlaying = !!status.playing;
    const positionMillis = Math.round((status.currentTime || 0) * 1000);
    const durationMillis = Math.round((status.duration || 0) * 1000);

    const formatted: PlaybackStatus = {
      isPlaying,
      positionMillis,
      durationMillis,
      isLoaded: status.isLoaded ?? true,
    };
    this.statusCallbacks.forEach((cb) => cb(formatted));

    // Web MediaSession position state synchronization
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
      try {
        if (durationMillis > 0) {
          navigator.mediaSession.setPositionState({
            duration: status.duration,
            playbackRate: status.playbackRate || 1.0,
            position: Math.min(status.currentTime || 0, status.duration),
          });
        }
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch {}
    }

    // Track completion detection: explicit didJustFinish flag or reached end boundary
    const isAtEnd =
      status.didJustFinish ||
      (!isPlaying && durationMillis > 0 && positionMillis >= durationMillis - 350);

    if (isAtEnd && !this.hasFiredTrackEnd) {
      this.hasFiredTrackEnd = true;
      this.trackEndCallbacks.forEach((cb) => cb());
    } else if (isPlaying && durationMillis > 0 && positionMillis < durationMillis - 1000) {
      this.hasFiredTrackEnd = false;
    }
  };

  /**
   * Load a new audio URI and start playing with full track metadata for lock screen & notifications.
   */
  async loadAndPlay(uri: string, metadata?: Partial<AudioMetadata>): Promise<void> {
    await this.init();
    this.hasFiredTrackEnd = false;

    const formatted = formatAudioMetadata(metadata);
    this.currentMetadata = formatted;

    // If same URI is already loaded, update metadata and resume
    if (this.currentUri === uri && this.player) {
      try {
        this.player.updateLockScreenMetadata(formatted);
      } catch {
        try {
          this.player.setActiveForLockScreen(true, formatted, {
            showSeekForward: true,
            showSeekBackward: true,
          });
        } catch {}
      }
      this.syncWebMediaSession(formatted);
      this.player.play();
      return;
    }

    await this.unload();

    try {
      this.player = createAudioPlayer({ uri }, { updateInterval: 250 });
      this.currentUri = uri;
      this.statusSubscription = this.player.addListener(
        'playbackStatusUpdate',
        this.handleStatus
      );

      // Enable OS lock screen & notification controls with song title, artist and artwork!
      try {
        this.player.setActiveForLockScreen(true, formatted, {
          showSeekForward: true,
          showSeekBackward: true,
        });
      } catch (e) {
        console.warn('[AudioPlayer] setActiveForLockScreen error:', e);
      }

      this.syncWebMediaSession(formatted);

      // Apply active volume profile & playback rate
      try {
        this.player.volume = this.currentVolume;
        this.player.playbackRate = this.currentPlaybackRate;
      } catch {}

      this.player.play();

      // Immediate follow-up synchronization to catch asynchronous Android MediaSession binding
      setTimeout(() => {
        if (this.player && this.currentMetadata) {
          try {
            this.player.updateLockScreenMetadata(this.currentMetadata);
          } catch {}
        }
      }, 75);
    } catch (error) {
      console.error('[AudioPlayer] loadAndPlay error:', error);
      throw error;
    }
  }

  /**
   * Smooth audio crossfading between queued tracks using dual expo-audio instances to eliminate gaps.
   * Updates notification card immediately for Spotify-like instant visual transition.
   */
  async crossfadeTo(
    uri: string,
    metadata?: Partial<AudioMetadata>,
    durationMs = 2500
  ): Promise<void> {
    await this.init();
    if (!this.player || !this.player.playing || durationMs <= 500) {
      return this.loadAndPlay(uri, metadata);
    }

    if (this.currentUri === uri) {
      if (metadata) this.updateMetadata(metadata);
      return;
    }

    const formatted = formatAudioMetadata(metadata);
    this.currentMetadata = formatted;

    // Immediately update lock screen notification to display new incoming track artwork and info
    if (this.player) {
      try {
        this.player.updateLockScreenMetadata(formatted);
      } catch {}
    }
    this.syncWebMediaSession(formatted);

    if (this.isCrossfading && this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }

    this.isCrossfading = true;
    const oldPlayer = this.player;
    const oldSubscription = this.statusSubscription;
    const targetVolume = this.currentVolume;

    try {
      const newPlayer = createAudioPlayer({ uri }, { updateInterval: 250 });
      newPlayer.volume = 0.0;
      newPlayer.playbackRate = this.currentPlaybackRate;

      this.currentUri = uri;
      this.hasFiredTrackEnd = false;

      // Start playing new track immediately at volume 0 for gapless takeover
      newPlayer.play();

      const startTime = Date.now();
      const steps = 25;
      const intervalMs = Math.max(20, Math.floor(durationMs / steps));

      await new Promise<void>((resolve) => {
        this.crossfadeInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(1.0, elapsed / durationMs);

          try {
            oldPlayer.volume = Math.max(0, targetVolume * (1.0 - progress));
            newPlayer.volume = Math.min(targetVolume, targetVolume * progress);
          } catch {}

          if (progress >= 1.0) {
            if (this.crossfadeInterval) {
              clearInterval(this.crossfadeInterval);
              this.crossfadeInterval = null;
            }
            resolve();
          }
        }, intervalMs);
      });

      // Cleanup old player subscription first so we don't receive stop status
      if (oldSubscription) oldSubscription.remove();

      // Hand off lock screen to new player before tearing down old player
      try {
        newPlayer.setActiveForLockScreen(true, formatted, {
          showSeekForward: true,
          showSeekBackward: true,
        });
      } catch {}

      try {
        oldPlayer.pause();
        oldPlayer.remove();
      } catch {}

      // Switch primary reference to new player
      this.player = newPlayer;
      this.statusSubscription = newPlayer.addListener(
        'playbackStatusUpdate',
        this.handleStatus
      );

      newPlayer.volume = targetVolume;
      this.isCrossfading = false;

      // Follow-up lock screen sync confirmation
      setTimeout(() => {
        if (this.player && this.currentMetadata) {
          try {
            this.player.updateLockScreenMetadata(this.currentMetadata);
          } catch {}
        }
      }, 75);
    } catch (error) {
      console.error('[AudioPlayer] crossfadeTo error, falling back to direct load:', error);
      this.isCrossfading = false;
      await this.loadAndPlay(uri, metadata);
    }
  }

  /**
   * Duck music volume (e.g. during voice note playback or speech).
   */
  async duckVolume(targetRatio = 0.25): Promise<void> {
    if (this.originalVolumeBeforeDuck === null) {
      this.originalVolumeBeforeDuck = this.currentVolume;
    }
    const duckedVolume = Math.max(0, Math.min(1.0, this.currentVolume * targetRatio));
    if (this.player) {
      try {
        this.player.volume = duckedVolume;
      } catch {}
    }
  }

  /**
   * Restore music volume after ducking.
   */
  async restoreVolume(): Promise<void> {
    if (this.originalVolumeBeforeDuck !== null) {
      this.currentVolume = this.originalVolumeBeforeDuck;
      this.originalVolumeBeforeDuck = null;
      if (this.player) {
        try {
          this.player.volume = this.currentVolume;
        } catch {}
      }
    }
  }

  /**
   * Play a voice snippet with automatic ducking of music and restore on finish.
   * Supports both direct audio URIs and base64 encoded audio payloads.
   */
  async playVoiceSnippet(uriOrBase64: string): Promise<void> {
    await this.init();
    await this.duckVolume(0.2);

    let playbackUri = uriOrBase64;
    let tempFileToDelete: string | null = null;

    try {
      // If it's a base64 string, dump to temporary cache file
      if (
        !uriOrBase64.startsWith('file://') &&
        !uriOrBase64.startsWith('http://') &&
        !uriOrBase64.startsWith('https://')
      ) {
        const rawBase64 = uriOrBase64.includes(',') ? uriOrBase64.split(',')[1] : uriOrBase64;
        const tempPath = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ''}snip_${Date.now()}.m4a`;
        await FileSystem.writeAsStringAsync(tempPath, rawBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        playbackUri = tempPath;
        tempFileToDelete = tempPath;
      }

      if (this.secondaryPlayer) {
        try {
          this.secondaryPlayer.pause();
          this.secondaryPlayer.remove();
        } catch {}
        this.secondaryPlayer = null;
      }

      this.secondaryPlayer = createAudioPlayer({ uri: playbackUri }, { updateInterval: 250 });
      this.secondaryPlayer.volume = 1.0;

      await new Promise<void>((resolve) => {
        let hasResolved = false;
        const cleanupSnippet = async () => {
          if (hasResolved) return;
          hasResolved = true;
          if (sub) sub.remove();
          if (this.secondaryPlayer) {
            try {
              this.secondaryPlayer.remove();
            } catch {}
            this.secondaryPlayer = null;
          }
          if (tempFileToDelete) {
            try {
              await FileSystem.deleteAsync(tempFileToDelete, { idempotent: true });
            } catch {}
          }
          await this.restoreVolume();
          resolve();
        };

        const sub = this.secondaryPlayer!.addListener('playbackStatusUpdate', (status) => {
          if (!status.playing && status.currentTime > 0) {
            cleanupSnippet();
          }
        });

        // Safety timeout for snippet (max 30s)
        setTimeout(cleanupSnippet, 30000);
        this.secondaryPlayer!.play();
      });
    } catch (err) {
      console.warn('[AudioPlayer] Error playing voice snippet:', err);
      if (tempFileToDelete) {
        try {
          await FileSystem.deleteAsync(tempFileToDelete, { idempotent: true });
        } catch {}
      }
      await this.restoreVolume();
    }
  }

  /**
   * Update lock screen and notification metadata (song title, artist, artwork)
   */
  updateMetadata(metadata: Partial<AudioMetadata>): void {
    const formatted = formatAudioMetadata({
      ...this.currentMetadata,
      ...metadata,
    });
    this.currentMetadata = formatted;

    if (this.player) {
      try {
        this.player.updateLockScreenMetadata(formatted);
      } catch {
        try {
          this.player.setActiveForLockScreen(true, formatted, {
            showSeekForward: true,
            showSeekBackward: true,
          });
        } catch (e) {
          console.warn('[AudioPlayer] updateMetadata fallback error:', e);
        }
      }
    }
    this.syncWebMediaSession(formatted);
  }

  /**
   * Resume playback and ensure notification stays active.
   */
  async play(): Promise<void> {
    if (!this.player) return;
    try {
      this.player.play();
      if (this.currentMetadata) {
        try {
          this.player.updateLockScreenMetadata(this.currentMetadata);
        } catch {}
      }
    } catch (error) {
      console.error('[AudioPlayer] play error:', error);
    }
  }

  /**
   * Pause playback.
   */
  async pause(): Promise<void> {
    if (!this.player) return;
    try {
      this.player.pause();
    } catch (error) {
      console.error('[AudioPlayer] pause error:', error);
    }
  }

  /**
   * Seek to a position in milliseconds.
   */
  async seekTo(positionMs: number): Promise<void> {
    if (!this.player) return;
    this.hasFiredTrackEnd = false;
    try {
      await this.player.seekTo(positionMs / 1000);
    } catch (error) {
      console.error('[AudioPlayer] seekTo error:', error);
    }
  }

  /**
   * Seek forward by an offset in milliseconds. Triggers skip to next if seeking past duration.
   */
  async seekForward(offsetMs = 10000): Promise<void> {
    if (!this.player) return;
    const current = (this.player.currentTime || 0) * 1000;
    const duration = (this.player.duration || 0) * 1000;
    const target = current + offsetMs;

    if (duration > 0 && target >= duration - 500) {
      if (this.mediaControlHandlers.onNext) {
        this.mediaControlHandlers.onNext();
      } else {
        await this.seekTo(duration);
      }
    } else {
      await this.seekTo(target);
    }
  }

  /**
   * Seek backward by an offset in milliseconds. Triggers skip to previous if within first 3 seconds.
   */
  async seekBackward(offsetMs = 10000): Promise<void> {
    if (!this.player) return;
    const current = (this.player.currentTime || 0) * 1000;

    if (current <= 3000 && this.mediaControlHandlers.onPrevious) {
      this.mediaControlHandlers.onPrevious();
    } else {
      await this.seekTo(Math.max(0, current - offsetMs));
    }
  }

  /**
   * Trigger skip to next track in queue.
   */
  async skipToNext(): Promise<void> {
    if (this.mediaControlHandlers.onNext) {
      this.mediaControlHandlers.onNext();
    }
  }

  /**
   * Trigger skip to previous track in queue.
   */
  async skipToPrevious(): Promise<void> {
    if (this.mediaControlHandlers.onPrevious) {
      this.mediaControlHandlers.onPrevious();
    } else {
      await this.seekTo(0);
    }
  }

  /**
   * Toggle favorite / like state from media notification action.
   */
  async toggleLike(): Promise<void> {
    if (this.mediaControlHandlers.onToggleLike) {
      this.mediaControlHandlers.onToggleLike();
    }
  }

  /**
   * Get current playback status.
   */
  async getStatus(): Promise<PlaybackStatus | null> {
    if (!this.player) return null;
    return {
      isPlaying: !!this.player.playing,
      positionMillis: Math.round((this.player.currentTime || 0) * 1000),
      durationMillis: Math.round((this.player.duration || 0) * 1000),
      isLoaded: this.player.isLoaded ?? true,
    };
  }

  /**
   * Unload the current sound and free resources.
   */
  async unload(): Promise<void> {
    if (this.statusSubscription) {
      this.statusSubscription.remove();
      this.statusSubscription = null;
    }
    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch {
        // Player may already be released
      }
      this.player = null;
      this.currentUri = null;
    }
  }

  /**
   * Set playback volume (0.0 to 1.0).
   */
  async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1.0, volume));
    this.currentVolume = clamped;
    if (this.player) {
      try {
        this.player.volume = clamped;
      } catch (err) {
        console.warn('[AudioPlayer] setVolume error:', err);
      }
    }
  }

  getVolume(): number {
    return this.currentVolume;
  }

  /**
   * Set playback rate / speed (e.g. 0.8, 1.0, 1.25, 1.5).
   */
  async setPlaybackRate(rate: number): Promise<void> {
    this.currentPlaybackRate = rate;
    if (this.player) {
      try {
        this.player.playbackRate = rate;
      } catch (err) {
        console.warn('[AudioPlayer] setPlaybackRate error:', err);
      }
    }
  }

  getPlaybackRate(): number {
    return this.currentPlaybackRate;
  }

  /**
   * Check if a sound is currently loaded.
   */
  get isLoaded(): boolean {
    return this.player !== null;
  }
}

/** Global singleton instance */
export const audioPlayer = new AudioPlayerService();
