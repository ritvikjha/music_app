import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { syncManager } from '../services/playbackSyncManager';
import { audioPlayer } from '../services/audioPlayer';
import { getSongById } from '../services/saavn';
import { usePlayer } from './PlayerContext';
import { useAuth } from './AuthContext';
import type { SyncState, Song, JamQueueEntry, JamQueueState, JamChatMessage, JamEmojiReaction } from '../types';

interface JamContextValue {
  isInRoom: boolean;
  roomId: string | null;
  memberCount: number;
  isConnected: boolean;
  isHost: boolean;
  jamQueue: JamQueueEntry[];
  messages: JamChatMessage[];
  reactions: JamEmojiReaction[];

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
  const [jamQueue, setJamQueue] = useState<JamQueueEntry[]>([]);
  const [messages, setMessages] = useState<JamChatMessage[]>([]);
  const [reactions, setReactions] = useState<JamEmojiReaction[]>([]);

  const { _forceState, setIsInJam } = usePlayer();
  const { user } = useAuth();

  const isHostRef = useRef(false);
  const isInRoomRef = useRef(false);
  const memberCountRef = useRef(0);
  const jamQueueRef = useRef<JamQueueEntry[]>([]);
  const songCacheRef = useRef<Map<string, Song>>(new Map());

  isHostRef.current = isHost;
  isInRoomRef.current = isInRoom;
  memberCountRef.current = memberCount;
  jamQueueRef.current = jamQueue;

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
          };
        })
      );

      setJamQueue(resolved);
    });

    const unsubChat = syncManager.onChatMessage((msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev.slice(-49), msg];
      });
    });

    const unsubEmoji = syncManager.onEmojiReaction((reaction) => {
      setReactions((prev) => {
        if (prev.some((r) => r.id === reaction.id)) return prev;
        return [...prev.slice(-19), reaction];
      });
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    });

    return () => {
      unsubSync();
      unsubCount();
      unsubQueue();
      unsubChat();
      unsubEmoji();
    };
  }, [_forceState]);

  // Poll connection status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(syncManager.isConnected);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const createRoom = useCallback(() => {
    const code = generateRoomCode();
    syncManager.connect();
    syncManager.joinRoom(code);
    setRoomId(code);
    setIsInRoom(true);
    setIsHost(true);
    setMemberCount(1);
    setJamQueue([]);
    setMessages([]);
    setReactions([]);
  }, []);

  const joinRoom = useCallback((code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return;
    syncManager.connect();
    syncManager.joinRoom(normalizedCode);
    setRoomId(normalizedCode);
    setIsInRoom(true);
    setIsHost(false);
    setJamQueue([]);
    setMessages([]);
    setReactions([]);
  }, []);

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
    syncManager.play();
  }, []);

  const jamPause = useCallback(() => {
    syncManager.pause();
  }, []);

  const jamSeek = useCallback((positionMs: number) => {
    syncManager.seek(positionMs);
  }, []);

  const jamChangeSong = useCallback((song: Song) => {
    songCacheRef.current.set(song.id, song);
    syncManager.changeSong(song.id);
  }, []);

  const jamSkipNext = useCallback(() => {
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
    songCacheRef.current.set(song.id, song);
    syncManager.emitQueueAdd(song.id);
  }, []);

  const jamRemoveFromQueue = useCallback((songId: string) => {
    syncManager.emitQueueRemove(songId);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const msg: JamChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
      syncManager.sendChatMessage(msg.message, msg.user);
    },
    [roomId, user]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!emoji) return;
      const reaction: JamEmojiReaction = {
        id: `react-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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

      syncManager.sendEmojiReaction(emoji, {
        username: user?.username || 'User',
      });
    },
    [roomId, user]
  );

  return (
    <JamContext.Provider
      value={{
        isInRoom,
        roomId,
        memberCount,
        isConnected,
        isHost,
        jamQueue,
        messages,
        reactions,
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
