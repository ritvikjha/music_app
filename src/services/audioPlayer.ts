import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer as ExpoAudioPlayer,
  AudioStatus,
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
  private statusSubscription: { remove: () => void } | null = null;
  private hasFiredTrackEnd = false;

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
   * Load a new audio URI and start playing.
   */
  async loadAndPlay(uri: string): Promise<void> {
    await this.init();
    this.hasFiredTrackEnd = false;

    // If same URI is already loaded, just play
    if (this.currentUri === uri && this.player) {
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
      this.player.play();
    } catch (error) {
      console.error('[AudioPlayer] loadAndPlay error:', error);
      throw error;
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
   * Check if a sound is currently loaded.
   */
  get isLoaded(): boolean {
    return this.player !== null;
  }
}

/** Global singleton instance */
export const audioPlayer = new AudioPlayerService();
