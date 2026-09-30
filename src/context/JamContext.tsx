import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { syncManager } from '../services/playbackSyncManager';
import { audioPlayer } from '../services/audioPlayer';
import { getSongById } from '../services/saavn';
import { usePlayer } from './PlayerContext';
import { useAuth } from './AuthContext';
import type { SyncState, Song, JamQueueEntry, JamQueueState, JamChatMessage, JamEmojiReaction, JamLyricsSync, JamVoiceSnippet, JamHostState } from '../types';

interface JamContextValue {
  isInRoom: boolean;
  roomId: string | null;
  memberCount: number;
  isConnected: boolean;
  isHost: boolean;
  hostUsername: string | null;
  jamQueue: JamQueueEntry[];
  messages: JamChatMessage[];
  reactions: JamEmojiReaction[];
  syncedLyric: JamLyricsSync | null;
  mutedUsers: string[];
  volumeWeight: number;
  allowGuestQueue: boolean;
  allowGuestPlayback: boolean;

  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;

  /** Jam-aware actions: these go through the sync manager */
  jamPlay: () => void;
  jamPause: () => void;
  jamSeek: (positionMs: number) => void;
  jamChangeSong: (song: Song) => void;
  jamSkipNext: () => void;

  /** Shared FIFO queue actions */
  jamAddToQueue: (song: Song) => void;
  jamRemoveFromQueue: (songId: string) => void;
  jamVoteSong: (songId: string) => void;

  /** Real-time Lyrics, Voice Snippets & DJ Overrides */
  broadcastLyricLine: (lineIndex: number, lineText: string) => void;
  sendVoiceSnippet: (audioBase64: string, durationMs: number) => void;
  djForceSkip: () => void;
  djToggleMuteUser: (username: string) => void;
  djSetVolumeWeight: (weight: number) => void;
  setRoomPermissions: (permissions: { allowGuestQueue: boolean; allowGuestPlayback: boolean }) => void;

  /** Chat & Reactions */
  sendMessage: (text: string) => void;
  sendReaction: (emoji: string) => void;
}

const JamContext = createContext<JamContextValue | undefined>(undefined);

/**
 * Generate a random 6-character alphanumeric room code.
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function JamProvider({ children }: { children: React.ReactNode }) {
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostUsername, setHostUsername] = useState<string | null>(null);
  const [jamQueue, setJamQueue] = useState<JamQueueEntry[]>([]);
  const [messages, setMessages] = useState<JamChatMessage[]>([]);
  const [reactions, setReactions] = useState<JamEmojiReaction[]>([]);
  const [syncedLyric, setSyncedLyric] = useState<JamLyricsSync | null>(null);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [volumeWeight, setVolumeWeight] = useState<number>(1.0);
  const [allowGuestQueue, setAllowGuestQueue] = useState(true);
  const [allowGuestPlayback, setAllowGuestPlayback] = useState(true);

  const { _forceState, setIsInJam, currentSong, isPlaying } = usePlayer();
  const { user } = useAuth();

  const isHostRef = useRef(false);
  const isInRoomRef = useRef(false);
  const allowGuestQueueRef = useRef(true);
  const allowGuestPlaybackRef = useRef(true);
  const memberCountRef = useRef(0);
  const jamQueueRef = useRef<JamQueueEntry[]>([]);
  const songCacheRef = useRef<Map<string, Song>>(new Map());
  const userRef = useRef(user);

  isHostRef.current = isHost;
  isInRoomRef.current = isInRoom;
  allowGuestQueueRef.current = allowGuestQueue;
  allowGuestPlaybackRef.current = allowGuestPlayback;
  memberCountRef.current = memberCount;
  jamQueueRef.current = jamQueue;
  userRef.current = user;

  useEffect(() => {
    syncManager.setUsername(user?.username || null);
  }, [user?.username]);

  useEffect(() => {
    if (!user) return;
    syncManager.emitPresenceUpdate({
      username: user.username,
      tag: user.tag,
      currentSong: currentSong ? { title: currentSong.title, artist: currentSong.artist, imageUrl: currentSong.imageUrl } : null,
      isPlaying,
      roomId: isInRoom ? roomId : null,
    });
  }, [currentSong, isInRoom, isPlaying, roomId, user]);

  // Sync room state with player context
  useEffect(() => {
    setIsInJam(isInRoom);
  }, [isInRoom, setIsInJam]);

  // Subscribe to sync manager events
  useEffect(() => {
    const unsubSync = syncManager.onSyncState(async (state: SyncState) => {
      // Apply the server's authoritative state to local playback
      if (state.songId) {
        _forceState({
          songId: state.songId,
          isPlaying: state.isPlaying,
          positionMs: state.positionMs,
        });
      } else if (isHostRef.current && jamQueueRef.current.length > 0) {
        // Host advances to next FIFO entry if server cleared song
        const next = jamQueueRef.current[0];
        if (next.song) {
          syncManager.changeSong(next.song.id);
          syncManager.emitQueueRemove(next.songId);
        } else {
          try {
            const fetched = await getSongById(next.songId);
            if (fetched) {
              syncManager.changeSong(fetched.id);
              syncManager.emitQueueRemove(next.songId);
            }
          } catch {}
        }
      }
    });

    const unsubCount = syncManager.onMemberCount((count: number) => {
      setMemberCount(count);
    });

    const unsubQueue = syncManager.onQueueState(async (state: JamQueueState) => {
      if (!state.entries) return;

      const resolved: JamQueueEntry[] = await Promise.all(
        state.entries.map(async (entry) => {
          let song = songCacheRef.current.get(entry.songId);
          if (!song) {
            try {
              const fetched = await getSongById(entry.songId);
              if (fetched) {
                song = fetched;
                songCacheRef.current.set(entry.songId, fetched);
              }
            } catch (err) {
              console.warn('[JamContext] Failed to resolve queued song:', entry.songId);
            }
          }
          return {
            songId: entry.songId,
            song,
            addedBy: entry.addedBy,
            votes: entry.votes || 0,
            upvoters: entry.upvoters || [],
          };
        })
      );

      setJamQueue(resolved);
    });

    const unsubChat = syncManager.onChatMessage((msg) => {
      setMessages((prev) => {
        // 1. Direct ID deduplication
        if (prev.some((m) => m.id === msg.id)) return prev;

        // 2. Optimistic match: if an optimistic message exists with the same sender and same text within 12 seconds
        const optIndex = prev.findIndex(
          (m) =>
            m.user?.username === msg.user?.username &&
            m.message === msg.message &&
            Math.abs(m.timestamp - msg.timestamp) < 12000
        );

        if (optIndex !== -1) {
          // Replace the optimistic message with the server-confirmed message
          const updated = [...prev];
          updated[optIndex] = msg;
          return updated;
        }

        return [...prev.slice(-49), msg];
      });
    });

    const unsubEmoji = syncManager.onEmojiReaction((reaction) => {
      setReactions((prev) => {
        // 1. Direct ID deduplication
        if (prev.some((r) => r.id === reaction.id)) return prev;

        // 2. Optimistic match: if an optimistic reaction exists with same sender and emoji within 6 seconds
        const optIndex = prev.findIndex(
          (r) =>
            r.user?.username === reaction.user?.username &&
            r.emoji === reaction.emoji &&
            Math.abs(r.timestamp - reaction.timestamp) < 6000
        );

        if (optIndex !== -1) {
          const updated = [...prev];
          updated[optIndex] = reaction;
          return updated;
        }

        return [...prev.slice(-19), reaction];
      });
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    });

    const unsubLyrics = syncManager.onLyricsSync((lyric) => {
      setSyncedLyric(lyric);
    });

    const unsubVoice = syncManager.onVoiceSnippet((snippet) => {
      // 1. Add voice note message to chat history
      setMessages((prev) => {
        if (prev.some((m) => m.id === snippet.id)) return prev;
        const voiceNoteMsg: JamChatMessage = {
          id: snippet.id,
          roomId: snippet.roomId,
          message: `🎙️ Voice Note (${Math.max(1, Math.round(snippet.durationMs / 1000))}s)`,
          user: snippet.user,
          timestamp: snippet.timestamp,
        };
        return [...prev.slice(-49), voiceNoteMsg];
      });

      // 2. Play audio with auto-ducking for listeners (skip playing back to the speaker)
      const isSender = userRef.current?.username && snippet.user?.username === userRef.current.username;
      if (snippet.audioBase64 && !isSender) {
        audioPlayer.playVoiceSnippet(snippet.audioBase64);
      }
    });

    const unsubHost = syncManager.onHostState((host) => {
      setHostUsername(host.hostUsername);
      setVolumeWeight(host.volumeWeight || 1.0);
      setMutedUsers(host.mutedUsers || []);
      setAllowGuestQueue(host.allowGuestQueue !== false);
      setAllowGuestPlayback(host.allowGuestPlayback !== false);
      setIsHost(Boolean(host.hostSocketId && syncManager.socketId === host.hostSocketId));
    });

    const unsubMuted = syncManager.onMutedUsersUpdate((list) => {
      setMutedUsers(list);
    });

    const unsubVolWeight = syncManager.onVolumeWeightUpdate((weight) => {
      setVolumeWeight(weight);
      audioPlayer.setVolume(weight);
    });

    return () => {
      unsubSync();
      unsubCount();
      unsubQueue();
      unsubChat();
      unsubEmoji();
      unsubLyrics();
      unsubVoice();
      unsubHost();
      unsubMuted();
      unsubVolWeight();
    };
  }, [_forceState, user]);

  // Poll connection status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(syncManager.isConnected);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const createRoom = useCallback(() => {
    const code = generateRoomCode();
    syncManager.setUsername(user?.username || null);
    syncManager.connect();
    syncManager.joinRoom(code);
    setRoomId(code);
    setIsInRoom(true);
    setIsHost(true);
    setMemberCount(1);
    setJamQueue([]);
    setMessages([]);
    setReactions([]);
  }, [user?.username]);

  const joinRoom = useCallback((code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return;
    syncManager.setUsername(user?.username || null);
    syncManager.connect();
    syncManager.joinRoom(normalizedCode);
    setRoomId(normalizedCode);
    setIsInRoom(true);
    setIsHost(false);
    setJamQueue([]);
    setMessages([]);
    setReactions([]);
  }, [user?.username]);

  const leaveRoom = useCallback(() => {
    syncManager.leaveRoom();
    setIsInRoom(false);
    setRoomId(null);
    setIsHost(false);
    setMemberCount(0);
    setJamQueue([]);
    setMessages([]);
    setReactions([]);
  }, []);

  // Jam-aware playback controls
  const jamPlay = useCallback(() => {
    if (!isHostRef.current && !allowGuestPlaybackRef.current) return;
    syncManager.play();
  }, []);

  const jamPause = useCallback(() => {
    if (!isHostRef.current && !allowGuestPlaybackRef.current) return;
    syncManager.pause();
  }, []);

  const jamSeek = useCallback((positionMs: number) => {
    if (!isHostRef.current && !allowGuestPlaybackRef.current) return;
    syncManager.seek(positionMs);
  }, []);

  const jamChangeSong = useCallback((song: Song) => {
    if (!isHostRef.current && !allowGuestPlaybackRef.current) return;
    songCacheRef.current.set(song.id, song);
    syncManager.changeSong(song.id);
  }, []);

  const jamSkipNext = useCallback(() => {
    if (!isHostRef.current && !allowGuestPlaybackRef.current) return;
    if (jamQueueRef.current.length > 0) {
      const next = jamQueueRef.current[0];
      syncManager.changeSong(next.songId);
      syncManager.emitQueueRemove(next.songId);
    } else {
      syncManager.skipNext();
    }
  }, []);

  // Auto-advance Jam Queue when current track finishes playing
  useEffect(() => {
    const unsubTrackEnd = audioPlayer.onTrackEnd(() => {
      if (!isInRoomRef.current) return;
      // Host or sole participant advances the room queue
      if (isHostRef.current || memberCountRef.current <= 1) {
        jamSkipNext();
      }
    });
    return unsubTrackEnd;
  }, [jamSkipNext]);

  // Shared Queue controls
  const jamAddToQueue = useCallback((song: Song) => {
    if (!isHostRef.current && !allowGuestQueueRef.current) return;
    songCacheRef.current.set(song.id, song);
    syncManager.emitQueueAdd(song.id);
  }, []);

  const jamRemoveFromQueue = useCallback((songId: string) => {
    syncManager.emitQueueRemove(songId);
  }, []);

  const jamVoteSong = useCallback((songId: string) => {
    syncManager.emitQueueVote(songId, user?.username);
  }, [user?.username]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const msg: JamChatMessage = {
        id: msgId,
        roomId: roomId || '',
        message: trimmed,
        user: {
          username: user?.username || 'User',
          tag: user?.tag,
        },
        timestamp: Date.now(),
      };
      // Optimistic instant add so sender immediately sees their message!
      setMessages((prev) => [...prev.slice(-49), msg]);
      syncManager.sendChatMessage(msg.message, msg.user, msg.id);
    },
    [roomId, user]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!emoji) return;
      const reactId = `react-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const reaction: JamEmojiReaction = {
        id: reactId,
        roomId: roomId || '',
        emoji,
        user: {
          username: user?.username || 'User',
        },
        timestamp: Date.now(),
      };
      // Optimistic instant add so sender immediately sees floating reaction!
      setReactions((prev) => [...prev.slice(-19), reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);

      syncManager.sendEmojiReaction(
        emoji,
        {
          username: user?.username || 'User',
        },
        reaction.id
      );
    },
    [roomId, user]
  );

  const broadcastLyricLine = useCallback((lineIndex: number, lineText: string) => {
    syncManager.emitLyricsSync({ lineIndex, lineText });
  }, []);

  const sendVoiceSnippet = useCallback(
    (audioBase64: string, durationMs: number) => {
      if (!user) return;
      syncManager.emitVoiceSnippet({
        audioBase64,
        durationMs,
        user: { username: user.username },
      });
    },
    [user]
  );

  const djForceSkip = useCallback(() => {
    syncManager.emitDjOverride({ type: 'force-skip' });
  }, []);

  const djToggleMuteUser = useCallback((targetUser: string) => {
    syncManager.emitDjOverride({ type: 'mute-user', targetUser });
  }, []);

  const djSetVolumeWeight = useCallback((weight: number) => {
    setVolumeWeight(weight);
    audioPlayer.setVolume(weight);
    syncManager.emitDjOverride({ type: 'volume-weight', volumeWeight: weight });
  }, []);

  const setRoomPermissions = useCallback((permissions: { allowGuestQueue: boolean; allowGuestPlayback: boolean }) => {
    setAllowGuestQueue(permissions.allowGuestQueue);
    setAllowGuestPlayback(permissions.allowGuestPlayback);
    syncManager.updateRoomPermissions(permissions);
  }, []);

  return (
    <JamContext.Provider
      value={{
        isInRoom,
        roomId,
        memberCount,
        isConnected,
        isHost,
        hostUsername,
        jamQueue,
        messages,
        reactions,
        syncedLyric,
        mutedUsers,
        volumeWeight,
        allowGuestQueue,
        allowGuestPlayback,
        createRoom,
        joinRoom,
        leaveRoom,
        jamPlay,
        jamPause,
        jamSeek,
        jamChangeSong,
        jamSkipNext,
        jamAddToQueue,
        jamRemoveFromQueue,
        jamVoteSong,
        broadcastLyricLine,
        sendVoiceSnippet,
        djForceSkip,
        djToggleMuteUser,
        djSetVolumeWeight,
        setRoomPermissions,
        sendMessage,
        sendReaction,
      }}
    >
      {children}
    </JamContext.Provider>
  );
}

export function useJam(): JamContextValue {
  const ctx = useContext(JamContext);
  if (!ctx) throw new Error('useJam must be used within a JamProvider');
  return ctx;
}
