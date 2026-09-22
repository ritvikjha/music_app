import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer as ExpoAudioPlayer,
  AudioStatus,
  AudioMetadata,
} from 'expo-audio';

export interface PlaybackStatus {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isLoaded: boolean;
}

type StatusCallback = (status: PlaybackStatus) => void;

/**
 * Singleton audio player wrapping expo-audio.
 * Handles loading, unloading, playback control, and status updates.
 */
class AudioPlayerService {
  private player: ExpoAudioPlayer | null = null;
  private statusCallbacks: Set<StatusCallback> = new Set();
  private trackEndCallbacks: Set<() => void> = new Set();
  private isInitialized = false;
  private currentUri: string | null = null;
  private currentMetadata: AudioMetadata | null = null;
  private statusSubscription: { remove: () => void } | null = null;
  private hasFiredTrackEnd = false;
  private currentVolume = 1.0;
  private currentPlaybackRate = 1.0;

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
    } catch (error) {
      console.warn('[AudioPlayer] init warning:', error);
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

    // Track completion detection: playback finished near end of track
    if (
      !isPlaying &&
      durationMillis > 0 &&
      positionMillis >= durationMillis - 250 &&
      !this.hasFiredTrackEnd
    ) {
      this.hasFiredTrackEnd = true;
      this.trackEndCallbacks.forEach((cb) => cb());
    } else if (isPlaying && durationMillis > 0 && positionMillis < durationMillis - 1000) {
      this.hasFiredTrackEnd = false;
    }
  };

  /**
   * Load a new audio URI and start playing with track metadata for lock screen & notifications.
   */
  async loadAndPlay(uri: string, metadata?: AudioMetadata): Promise<void> {
    await this.init();
    this.hasFiredTrackEnd = false;
    if (metadata) {
      this.currentMetadata = metadata;
    }

    // If same URI is already loaded, update metadata if needed and just play
    if (this.currentUri === uri && this.player) {
      if (this.currentMetadata) {
        try {
          this.player.updateLockScreenMetadata(this.currentMetadata);
        } catch {}
      }
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
      if (this.currentMetadata) {
        try {
          this.player.setActiveForLockScreen(true, this.currentMetadata, {
            showSeekForward: true,
            showSeekBackward: true,
          });
        } catch (e) {
          console.warn('[AudioPlayer] setActiveForLockScreen error:', e);
        }
      }

      // Apply active volume profile & playback rate
      try {
        this.player.volume = this.currentVolume;
        this.player.playbackRate = this.currentPlaybackRate;
      } catch {}

      this.player.play();
    } catch (error) {
      console.error('[AudioPlayer] loadAndPlay error:', error);
      throw error;
    }
  }

  /**
   * Update lock screen and notification metadata (song title, artist, artwork)
   */
  updateMetadata(metadata: AudioMetadata): void {
    this.currentMetadata = metadata;
    if (this.player) {
      try {
        this.player.updateLockScreenMetadata(metadata);
      } catch {
        try {
          this.player.setActiveForLockScreen(true, metadata, {
            showSeekForward: true,
            showSeekBackward: true,
          });
        } catch {}
      }
    }
  }

  /**
   * Resume playback.
   */
  async play(): Promise<void> {
    if (!this.player) return;
    try {
      this.player.play();
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
