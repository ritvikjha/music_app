import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../config';
import { audioPlayer } from './audioPlayer';
import type {
  SyncState,
  PlaybackAction,
  JamQueueState,
  JamChatMessage,
  JamEmojiReaction,
  PartyGameEvent,
  FriendRequest,
  GameInvite,
  JamRoomActivity,
  JamLyricsSync,
  JamVoiceSnippet,
  JamHostState,
  JamDjOverrideAction,
  UserPresence,
  LiveActivityFeedItem,
  OnlineDuelState,
  OnlineDuelType,
  TriviaDuelSettings,
} from '../types';

type SyncStateCallback = (state: SyncState) => void;
type MemberCountCallback = (count: number) => void;
type QueueStateCallback = (state: JamQueueState) => void;
type ChatMessageCallback = (msg: JamChatMessage) => void;
type EmojiReactionCallback = (reaction: JamEmojiReaction) => void;
type GameEventCallback = (event: PartyGameEvent) => void;
type DuelStateCallback = (state: OnlineDuelState | null) => void;
type DuelErrorCallback = (message: string) => void;
type FriendRequestCallback = (req: FriendRequest) => void;
type FriendAcceptCallback = (data: { from: { username: string; tag: string }; to: { username: string; tag: string }; requestId: string }) => void;
type FriendDeclineCallback = (data: { from: { username: string; tag: string }; to: { username: string; tag: string }; requestId: string }) => void;
type GameInviteCallback = (invite: GameInvite) => void;
type GameInviteErrorCallback = (message: string) => void;
type GameInviteSentCallback = (username: string) => void;
type RoomActivityCallback = (activity: JamRoomActivity) => void;
type LyricsSyncCallback = (lyrics: JamLyricsSync) => void;
type VoiceSnippetCallback = (snippet: JamVoiceSnippet) => void;
type HostStateCallback = (host: JamHostState) => void;
type MutedUsersCallback = (mutedUsers: string[]) => void;
type VolumeWeightCallback = (weight: number) => void;
type PresenceSyncCallback = (presences: UserPresence[]) => void;
type ActivityFeedUpdateCallback = (item: LiveActivityFeedItem) => void;
type ActivityFeedSyncCallback = (feed: LiveActivityFeedItem[]) => void;

/**
 * PlaybackSyncManager — owns the Socket.io connection to the Jam sync server.
 * Keeps UI components decoupled from raw socket logic.
 */
class PlaybackSyncManager {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private lastDuelState: OnlineDuelState | null = null;
  private currentUsername: string | null = null;
  private userInboxRoomId: string | null = null;
  private resyncInterval: ReturnType<typeof setInterval> | null = null;
  private syncStateCallbacks: Set<SyncStateCallback> = new Set();
  private memberCountCallbacks: Set<MemberCountCallback> = new Set();
  private queueStateCallbacks: Set<QueueStateCallback> = new Set();
  private chatMessageCallbacks: Set<ChatMessageCallback> = new Set();
  private emojiReactionCallbacks: Set<EmojiReactionCallback> = new Set();
  private gameEventCallbacks: Set<GameEventCallback> = new Set();
  private duelStateCallbacks: Set<DuelStateCallback> = new Set();
  private duelErrorCallbacks: Set<DuelErrorCallback> = new Set();
  private friendRequestCallbacks: Set<FriendRequestCallback> = new Set();
  private friendAcceptCallbacks: Set<FriendAcceptCallback> = new Set();
  private friendDeclineCallbacks: Set<FriendDeclineCallback> = new Set();
  private gameInviteCallbacks: Set<GameInviteCallback> = new Set();
  private gameInviteErrorCallbacks: Set<GameInviteErrorCallback> = new Set();
  private gameInviteSentCallbacks: Set<GameInviteSentCallback> = new Set();
  private roomActivityCallbacks: Set<RoomActivityCallback> = new Set();
  private lyricsSyncCallbacks: Set<LyricsSyncCallback> = new Set();
  private voiceSnippetCallbacks: Set<VoiceSnippetCallback> = new Set();
  private hostStateCallbacks: Set<HostStateCallback> = new Set();
  private mutedUsersCallbacks: Set<MutedUsersCallback> = new Set();
  private volumeWeightCallbacks: Set<VolumeWeightCallback> = new Set();
  private presenceCallbacks: Set<PresenceSyncCallback> = new Set();
  private activityFeedUpdateCallbacks: Set<ActivityFeedUpdateCallback> = new Set();
  private activityFeedSyncCallbacks: Set<ActivityFeedSyncCallback> = new Set();

  /**
   * Connect to the sync server.
   */
  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(CONFIG.SYNC_SERVER_URL, {
      transports: ['websocket'],
      query: this.currentUsername ? { username: this.currentUsername } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[SyncManager] Connected to server');
      if (this.currentUsername) {
        this.socket?.emit('register-user', this.currentUsername);
      }
      // Re-join room if we were in one (reconnection scenario)
      if (this.currentRoomId) {
        this.socket?.emit('join-room', this.currentRoomId);
      }
      // Re-join personal inbox room if registered
      if (this.userInboxRoomId) {
        this.socket?.emit('join-room', this.userInboxRoomId);
      }
    });

    this.socket.on('sync-state', (state: SyncState) => {
      this.handleSyncState(state);
    });

    this.socket.on('member-count', (count: number) => {
      this.memberCountCallbacks.forEach((cb) => cb(count));
    });

    this.socket.on('duel-state', (state: OnlineDuelState) => {
      this.lastDuelState = state;
      this.duelStateCallbacks.forEach((cb) => cb(state));
    });
    this.socket.on('duel-error', (message: string) => {
      this.duelErrorCallbacks.forEach((cb) => cb(message));
    });
    this.socket.on('game-invite', (invite: GameInvite) => this.gameInviteCallbacks.forEach((cb) => cb(invite)));
    this.socket.on('game-invite-error', (message: string) => this.gameInviteErrorCallbacks.forEach((cb) => cb(message)));
    this.socket.on('game-invite-sent', (data: { username: string }) => this.gameInviteSentCallbacks.forEach((cb) => cb(data.username)));

    this.socket.on('queue-state', (state: JamQueueState) => {
      this.queueStateCallbacks.forEach((cb) => cb(state));
    });

    this.socket.on('chat-message', (msg: JamChatMessage) => {
      if (typeof msg.message === 'string') {
        if (msg.message.startsWith('__JAM_GAME__:')) {
          try {
            const gamePayload = JSON.parse(msg.message.slice('__JAM_GAME__:'.length)) as PartyGameEvent;
            this.gameEventCallbacks.forEach((cb) => cb(gamePayload));
            return;
          } catch (err) {
            console.warn('[SyncManager] Failed to parse party game event:', err);
          }
        }
        if (msg.message.startsWith('__FRIEND_REQ__:')) {
          try {
            const req = JSON.parse(msg.message.slice('__FRIEND_REQ__:'.length)) as FriendRequest;
            this.friendRequestCallbacks.forEach((cb) => cb(req));
            return;
          } catch (err) {
            console.warn('[SyncManager] Failed to parse friend request:', err);
          }
        }
        if (msg.message.startsWith('__FRIEND_ACCEPT__:')) {
          try {
            const data = JSON.parse(msg.message.slice('__FRIEND_ACCEPT__:'.length));
            this.friendAcceptCallbacks.forEach((cb) => cb(data));
            return;
          } catch (err) {
            console.warn('[SyncManager] Failed to parse friend accept:', err);
          }
        }
        if (msg.message.startsWith('__FRIEND_DECLINE__:')) {
          try {
            const data = JSON.parse(msg.message.slice('__FRIEND_DECLINE__:'.length));
            this.friendDeclineCallbacks.forEach((cb) => cb(data));
            return;
          } catch (err) {
            console.warn('[SyncManager] Failed to parse friend decline:', err);
          }
        }
      }
      this.chatMessageCallbacks.forEach((cb) => cb(msg));
    });

    this.socket.on('emoji-reaction', (reaction: JamEmojiReaction) => {
      this.emojiReactionCallbacks.forEach((cb) => cb(reaction));
    });

    this.socket.on('room-activity', (activity: JamRoomActivity) => {
      this.roomActivityCallbacks.forEach((cb) => cb(activity));
    });

    this.socket.on('lyrics-sync', (lyrics: JamLyricsSync) => {
      this.lyricsSyncCallbacks.forEach((cb) => cb(lyrics));
    });

    this.socket.on('voice-snippet', (snippet: JamVoiceSnippet) => {
      this.voiceSnippetCallbacks.forEach((cb) => cb(snippet));
    });

    this.socket.on('host-state', (host: JamHostState) => {
      this.hostStateCallbacks.forEach((cb) => cb(host));
    });

    this.socket.on('muted-users-update', (mutedUsers: string[]) => {
      this.mutedUsersCallbacks.forEach((cb) => cb(mutedUsers));
    });

    this.socket.on('volume-weight-update', (data: { volumeWeight: number }) => {
      this.volumeWeightCallbacks.forEach((cb) => cb(data.volumeWeight));
    });

    this.socket.on('presence-sync', (presences: UserPresence[]) => {
      this.presenceCallbacks.forEach((cb) => cb(presences));
    });

    this.socket.on('activity-feed-update', (item: LiveActivityFeedItem) => {
      this.activityFeedUpdateCallbacks.forEach((cb) => cb(item));
    });

    this.socket.on('activity-feed-sync', (feed: LiveActivityFeedItem[]) => {
      this.activityFeedSyncCallbacks.forEach((cb) => cb(feed));
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
    this.lastDuelState = null;
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
    if (this.currentRoomId !== roomId) this.lastDuelState = null;
    this.currentRoomId = roomId;
    if (this.currentUsername && this.socket?.connected) {
      this.socket.emit('register-user', this.currentUsername);
    }
    this.socket!.emit('join-room', roomId);
    this.startResync();
  }

  setUsername(username: string | null): void {
    this.currentUsername = username;
    if (username && this.socket?.connected) this.socket.emit('register-user', username);
  }

  startOnlineDuel(type: OnlineDuelType, settings?: TriviaDuelSettings): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('duel-start', { roomId: this.currentRoomId, type, settings });
  }

  sendDuelAction(action: Record<string, unknown>): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('duel-action', { roomId: this.currentRoomId, action });
  }

  sendGameInvite(targetUsername: string, targetTag: string, roomId: string): void {
    if (!this.socket || !this.socket.connected) {
      this.gameInviteErrorCallbacks.forEach((cb) => cb('Connect to Jam before inviting a friend.'));
      return;
    }
    this.socket.emit('game-invite-send', { targetUsername, targetTag, roomId });
  }

  onGameInvite(cb: GameInviteCallback): () => void {
    this.gameInviteCallbacks.add(cb);
    return () => this.gameInviteCallbacks.delete(cb);
  }

  onGameInviteError(cb: GameInviteErrorCallback): () => void {
    this.gameInviteErrorCallbacks.add(cb);
    return () => this.gameInviteErrorCallbacks.delete(cb);
  }

  onGameInviteSent(cb: GameInviteSentCallback): () => void {
    this.gameInviteSentCallbacks.add(cb);
    return () => this.gameInviteSentCallbacks.delete(cb);
  }

  onDuelState(cb: DuelStateCallback): () => void {
    this.duelStateCallbacks.add(cb);
    if (this.lastDuelState) cb(this.lastDuelState);
    return () => this.duelStateCallbacks.delete(cb);
  }

  onDuelError(cb: DuelErrorCallback): () => void {
    this.duelErrorCallbacks.add(cb);
    return () => this.duelErrorCallbacks.delete(cb);
  }

  /**
   * Leave the current room.
   */
  leaveRoom(): void {
    this.stopResync();
    this.currentRoomId = null;
    this.lastDuelState = null;
    // Disconnecting and reconnecting is the cleanest way to leave a socket.io room
    // since the server tracks rooms by socket connection
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
      if (this.userInboxRoomId) {
        this.socket.emit('join-room', this.userInboxRoomId);
      }
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
   * Emit a skip-next action to the room.
   */
  skipNext(): void {
    this.emitAction({ type: 'skip-next' });
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
   * Emit a queue-vote / upvote for a song in the current room.
   */
  emitQueueVote(songId: string, voter?: string): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('queue-vote', {
      roomId: this.currentRoomId,
      songId,
      voter,
    });
  }

  /**
   * Subscribe to room activity events (e.g. song added, player joined).
   */
  onRoomActivity(callback: RoomActivityCallback): () => void {
    this.roomActivityCallbacks.add(callback);
    return () => this.roomActivityCallbacks.delete(callback);
  }

  /**
   * Send a real-time chat message to the room.
   */
  sendChatMessage(message: string, user: { username: string; tag?: string }, id?: string): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('chat-message', {
      roomId: this.currentRoomId,
      message,
      user,
      id,
    });
  }

  /**
   * Send an emoji reaction to the room.
   */
  sendEmojiReaction(emoji: string, user: { username: string }, id?: string): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('emoji-reaction', {
      roomId: this.currentRoomId,
      emoji,
      user,
      id,
    });
  }

  /**
   * Subscribe to incoming room chat messages.
   */
  onChatMessage(cb: ChatMessageCallback): () => void {
    this.chatMessageCallbacks.add(cb);
    return () => this.chatMessageCallbacks.delete(cb);
  }

  /**
   * Subscribe to incoming room emoji reactions.
   */
  onEmojiReaction(cb: EmojiReactionCallback): () => void {
    this.emojiReactionCallbacks.add(cb);
    return () => this.emojiReactionCallbacks.delete(cb);
  }

  /**
   * Broadcast a party hangout game event to all room members in real-time.
   */
  sendGameEvent(event: PartyGameEvent): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('chat-message', {
      roomId: this.currentRoomId,
      message: '__JAM_GAME__:' + JSON.stringify(event),
      user: { username: 'GameEngine', tag: 'PARTY' },
      id: 'game_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    });
  }

  /**
   * Subscribe to incoming synchronized party game events.
   */
  onGameEvent(cb: GameEventCallback): () => void {
    this.gameEventCallbacks.add(cb);
    return () => this.gameEventCallbacks.delete(cb);
  }

  /**
   * Register the current user's identity to receive incoming targeted friend requests
   */
  setUserInbox(username: string, tag: string): void {
    if (!this.socket) this.connect();
    const cleanUser = username.trim().toLowerCase();
    const cleanTag = tag.trim();
    this.userInboxRoomId = `inbox_${cleanUser}_${cleanTag}`;
    this.socket?.emit('join-room', this.userInboxRoomId);
  }

  /**
   * Send a targeted real-time friend request to another user by Username#Tag
   */
  sendFriendRequest(
    targetUsername: string,
    targetTag: string,
    sender: { username: string; tag: string }
  ): FriendRequest {
    if (!this.socket) this.connect();
    const cleanTargetUser = targetUsername.trim().toLowerCase();
    const cleanTargetTag = targetTag.trim();
    const targetRoom = `inbox_${cleanTargetUser}_${cleanTargetTag}`;

    const request: FriendRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      from: {
        username: sender.username.trim(),
        tag: sender.tag.trim(),
      },
      to: {
        username: targetUsername.trim(),
        tag: targetTag.trim(),
      },
      timestamp: Date.now(),
    };

    this.socket?.emit('chat-message', {
      roomId: targetRoom,
      message: '__FRIEND_REQ__:' + JSON.stringify(request),
      user: { username: sender.username, tag: sender.tag },
      id: request.id,
    });

    return request;
  }

  /**
   * Accept an incoming friend request and notify the sender
   */
  acceptFriendRequest(request: FriendRequest, me: { username: string; tag: string }): void {
    if (!this.socket) this.connect();
    const senderRoom = `inbox_${request.from.username.trim().toLowerCase()}_${request.from.tag.trim()}`;
    const payload = {
      from: { username: me.username, tag: me.tag },
      to: request.from,
      requestId: request.id,
    };
    this.socket?.emit('chat-message', {
      roomId: senderRoom,
      message: '__FRIEND_ACCEPT__:' + JSON.stringify(payload),
      user: { username: me.username, tag: me.tag },
      id: 'acc_' + request.id,
    });
  }

  /**
   * Decline an incoming friend request and notify the sender
   */
  declineFriendRequest(request: FriendRequest, me: { username: string; tag: string }): void {
    if (!this.socket) this.connect();
    const senderRoom = `inbox_${request.from.username.trim().toLowerCase()}_${request.from.tag.trim()}`;
    const payload = {
      from: { username: me.username, tag: me.tag },
      to: request.from,
      requestId: request.id,
    };
    this.socket?.emit('chat-message', {
      roomId: senderRoom,
      message: '__FRIEND_DECLINE__:' + JSON.stringify(payload),
      user: { username: me.username, tag: me.tag },
      id: 'dec_' + request.id,
    });
  }

  /**
   * Subscribe to incoming targeted friend requests
   */
  onFriendRequest(cb: FriendRequestCallback): () => void {
    this.friendRequestCallbacks.add(cb);
    return () => this.friendRequestCallbacks.delete(cb);
  }

  /**
   * Subscribe to friend request accepted notifications
   */
  onFriendAccept(cb: FriendAcceptCallback): () => void {
    this.friendAcceptCallbacks.add(cb);
    return () => this.friendAcceptCallbacks.delete(cb);
  }

  /**
   * Subscribe to friend request declined notifications
   */
  onFriendDecline(cb: FriendDeclineCallback): () => void {
    this.friendDeclineCallbacks.add(cb);
    return () => this.friendDeclineCallbacks.delete(cb);
  }

  /**
   * Subscribe to synchronized lyrics
   */
  onLyricsSync(cb: LyricsSyncCallback): () => void {
    this.lyricsSyncCallbacks.add(cb);
    return () => this.lyricsSyncCallbacks.delete(cb);
  }

  /**
   * Broadcast current synchronized lyric line to room
   */
  emitLyricsSync(lyrics: { lineIndex: number; lineText: string; timestamp?: number }): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('lyrics-sync', {
      roomId: this.currentRoomId,
      lineIndex: lyrics.lineIndex,
      lineText: lyrics.lineText,
      timestamp: lyrics.timestamp || Date.now(),
    });
  }

  /**
   * Subscribe to voice snippets from room members
   */
  onVoiceSnippet(cb: VoiceSnippetCallback): () => void {
    this.voiceSnippetCallbacks.add(cb);
    return () => this.voiceSnippetCallbacks.delete(cb);
  }

  /**
   * Send a recorded voice snippet to the room
   */
  emitVoiceSnippet(snippet: { audioBase64: string; durationMs: number; user: { username: string } }): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('voice-snippet', {
      roomId: this.currentRoomId,
      audioBase64: snippet.audioBase64,
      durationMs: snippet.durationMs,
      user: snippet.user,
    });
  }

  /**
   * Subscribe to DJ Host state (hostSocketId, volumeWeight, mutedUsers)
   */
  onHostState(cb: HostStateCallback): () => void {
    this.hostStateCallbacks.add(cb);
    return () => this.hostStateCallbacks.delete(cb);
  }

  /**
   * Send DJ Host override (force skip, mute user, volume weighting)
   */
  emitDjOverride(override: JamDjOverrideAction): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('dj-override', {
      roomId: this.currentRoomId,
      type: override.type,
      targetUser: override.targetUser,
      volumeWeight: override.volumeWeight,
    });
  }

  updateRoomPermissions(permissions: { allowGuestQueue: boolean; allowGuestPlayback: boolean }): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('room-permissions', { roomId: this.currentRoomId, ...permissions });
  }

  /**
   * Subscribe to muted users list updates
   */
  onMutedUsersUpdate(cb: MutedUsersCallback): () => void {
    this.mutedUsersCallbacks.add(cb);
    return () => this.mutedUsersCallbacks.delete(cb);
  }

  /**
   * Subscribe to room volume weight updates
   */
  onVolumeWeightUpdate(cb: VolumeWeightCallback): () => void {
    this.volumeWeightCallbacks.add(cb);
    return () => this.volumeWeightCallbacks.delete(cb);
  }

  /**
   * Broadcast local presence and listening state
   */
  emitPresenceUpdate(presence: {
    username: string;
    tag: string;
    currentSong: { title: string; artist: string; imageUrl?: string } | null;
    isPlaying: boolean;
    roomId?: string | null;
  }): void {
    if (!this.socket?.connected) return;
    this.socket.emit('presence-update', presence);
  }

  /**
   * Request global presence sync
   */
  requestPresenceSync(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('get-presence');
  }

  /**
   * Subscribe to live presence updates
   */
  onPresenceSync(cb: PresenceSyncCallback): () => void {
    this.presenceCallbacks.add(cb);
    return () => this.presenceCallbacks.delete(cb);
  }

  /**
   * Emit an activity event (room created, track upvoted, playlist added, vibe started)
   */
  emitActivityEvent(event: {
    type: 'room_created' | 'track_upvoted' | 'playlist_added' | 'vibe_started';
    user: { username: string; tag?: string };
    meta: string;
    roomId?: string;
  }): void {
    if (!this.socket?.connected) return;
    this.socket.emit('activity-event', event);
  }

  /**
   * Request initial activity feed
   */
  requestActivityFeedSync(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('get-activity-feed');
  }

  /**
   * Subscribe to real-time activity feed events
   */
  onActivityFeedUpdate(cb: ActivityFeedUpdateCallback): () => void {
    this.activityFeedUpdateCallbacks.add(cb);
    return () => this.activityFeedUpdateCallbacks.delete(cb);
  }

  /**
   * Subscribe to full activity feed sync
   */
  onActivityFeedSync(cb: ActivityFeedSyncCallback): () => void {
    this.activityFeedSyncCallbacks.add(cb);
    return () => this.activityFeedSyncCallbacks.delete(cb);
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

  get socketId(): string | null {
    return this.socket?.id ?? null;
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
