import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../config';
import { audioPlayer } from './audioPlayer';
import type { SyncState, PlaybackAction, JamQueueState } from '../types';

type SyncStateCallback = (state: SyncState) => void;
type MemberCountCallback = (count: number) => void;
type QueueStateCallback = (state: JamQueueState) => void;

/**
 * PlaybackSyncManager — owns the Socket.io connection to the Jam sync server.
 * Keeps UI components decoupled from raw socket logic.
 *
 * Server contract:
 *   Client emits:
 *     - "join-room" (roomId)
 *     - "playback-action" ({ roomId, action })
 *     - "request-resync" (roomId)
 *     - "queue-add" ({ roomId, songId })
 *     - "queue-remove" ({ roomId, songId })
 *   Server emits:
 *     - "sync-state" ({ songId, isPlaying, positionMs, serverTime })
 *     - "member-count" (count)
 *     - "queue-state" ({ roomId, entries: Array<{ songId, addedBy }> })
 */
class PlaybackSyncManager {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private resyncInterval: ReturnType<typeof setInterval> | null = null;
  private syncStateCallbacks: Set<SyncStateCallback> = new Set();
  private memberCountCallbacks: Set<MemberCountCallback> = new Set();
  private queueStateCallbacks: Set<QueueStateCallback> = new Set();

  /**
   * Connect to the sync server.
   */
  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(CONFIG.SYNC_SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[SyncManager] Connected to server');
      // Re-join room if we were in one (reconnection scenario)
      if (this.currentRoomId) {
        this.socket?.emit('join-room', this.currentRoomId);
      }
    });

    this.socket.on('sync-state', (state: SyncState) => {
      this.handleSyncState(state);
    });

    this.socket.on('member-count', (count: number) => {
      this.memberCountCallbacks.forEach((cb) => cb(count));
    });

    this.socket.on('queue-state', (state: JamQueueState) => {
      this.queueStateCallbacks.forEach((cb) => cb(state));
    });

    this.socket.on('disconnect', () => {
      console.log('[SyncManager] Disconnected from server');
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('[SyncManager] Connection error:', err.message);
    });
  }

  /**
   * Disconnect from the sync server entirely.
   */
  disconnect(): void {
    this.stopResync();
    this.currentRoomId = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Join a room. Starts the periodic resync timer.
   */
  joinRoom(roomId: string): void {
    if (!this.socket) this.connect();
    this.currentRoomId = roomId;
    this.socket!.emit('join-room', roomId);
    this.startResync();
  }

  /**
   * Leave the current room.
   */
  leaveRoom(): void {
    this.stopResync();
    this.currentRoomId = null;
    // Disconnecting and reconnecting is the cleanest way to leave a socket.io room
    // since the server tracks rooms by socket connection
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  /**
   * Emit a play action to the room.
   */
  play(): void {
    this.emitAction({ type: 'play' });
  }

  /**
   * Emit a pause action to the room.
   */
  pause(): void {
    this.emitAction({ type: 'pause' });
  }

  /**
   * Emit a seek action to the room.
   */
  seek(positionMs: number): void {
    this.emitAction({ type: 'seek', positionMs });
  }

  /**
   * Emit a change-song action to the room.
   */
  changeSong(songId: string): void {
    this.emitAction({ type: 'change-song', songId });
  }

  /**
   * Subscribe to sync-state events.
   * Returns an unsubscribe function.
   */
  onSyncState(callback: SyncStateCallback): () => void {
    this.syncStateCallbacks.add(callback);
    return () => this.syncStateCallbacks.delete(callback);
  }

  /**
   * Subscribe to member-count events.
   * Returns an unsubscribe function.
   */
  onMemberCount(callback: MemberCountCallback): () => void {
    this.memberCountCallbacks.add(callback);
    return () => this.memberCountCallbacks.delete(callback);
  }

  /**
   * Subscribe to queue-state events.
   * Returns an unsubscribe function.
   */
  onQueueState(callback: QueueStateCallback): () => void {
    this.queueStateCallbacks.add(callback);
    return () => this.queueStateCallbacks.delete(callback);
  }

  /**
   * Emit a queue-add action for the current room.
   */
  emitQueueAdd(songId: string): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('queue-add', {
      roomId: this.currentRoomId,
      songId,
    });
  }

  /**
   * Emit a queue-remove action for the current room.
   */
  emitQueueRemove(songId: string): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('queue-remove', {
      roomId: this.currentRoomId,
      songId,
    });
  }

  /**
   * Whether we're currently connected and in a room.
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get roomId(): string | null {
    return this.currentRoomId;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private emitAction(action: PlaybackAction): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('playback-action', {
      roomId: this.currentRoomId,
      action,
    });
  }

  /**
   * Handle incoming sync-state: adjust position for network latency
   * and apply to the audio player.
   */
  private handleSyncState(state: SyncState): void {
    // Adjust position for time elapsed since server sent the state
    let adjustedPositionMs = state.positionMs;
    if (state.isPlaying && state.serverTime) {
      const elapsed = Date.now() - state.serverTime;
      adjustedPositionMs += Math.max(0, elapsed);
    }

    // Notify subscribers (UI/context) with the adjusted state
    const adjustedState: SyncState = {
      ...state,
      positionMs: adjustedPositionMs,
    };
    this.syncStateCallbacks.forEach((cb) => cb(adjustedState));
  }

  /**
   * Start the periodic resync timer (~7 seconds).
   */
  private startResync(): void {
    this.stopResync();
    this.resyncInterval = setInterval(() => {
      if (this.socket && this.currentRoomId) {
        this.socket.emit('request-resync', this.currentRoomId);
      }
    }, CONFIG.RESYNC_INTERVAL_MS);
  }

  /**
   * Stop the periodic resync timer.
   */
  private stopResync(): void {
    if (this.resyncInterval) {
      clearInterval(this.resyncInterval);
      this.resyncInterval = null;
    }
  }
}

/** Global singleton instance */
export const syncManager = new PlaybackSyncManager();
