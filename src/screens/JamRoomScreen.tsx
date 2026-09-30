import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Share,
  Image,
  ScrollView,
  Animated as RNAnimated,
  Switch,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { audioPlayer } from '../services/audioPlayer';
import { networkMonitor } from '../services/networkMonitor';
import { useJam } from '../context/JamContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { searchSongs } from '../services/saavn';
import { AvatarRow } from '../components/AvatarRow';
import { SongCard } from '../components/SongCard';
import { GlowCard } from '../components/GlowCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { SkeletonList } from '../components/Skeleton';
import { AnimatedEqualizer } from '../components/AnimatedEqualizer';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { Song, Friend } from '../types';

/**
 * Jam Room screen — create/join rooms, shared synchronized playback,
 * and shared FIFO queue.
 */
export default function JamRoomScreen() {
  const {
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
    setRoomPermissions,
    createRoom,
    joinRoom,
    leaveRoom,
    jamChangeSong,
    jamAddToQueue,
    jamRemoveFromQueue,
    jamVoteSong,
    jamPlay,
    jamPause,
    jamSkipNext,
    broadcastLyricLine,
    sendVoiceSnippet,
    djForceSkip,
    djToggleMuteUser,
    djSetVolumeWeight,
    sendMessage,
    sendReaction,
  } = useJam();
  const { currentSong, isPlaying, positionMs, durationMs } = usePlayer();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const isSelfMuted = Boolean(user?.username && mutedUsers.some((name) => name === user.username || name.startsWith(`${user.username}#`)));
  const canControlPlayback = isHost || allowGuestPlayback;

  // Voice snippet recording state & native audio recorder engine
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecordingRef = useRef(false);
  const recordingStartTimeRef = useRef(0);

  // Tab: queue vs chat
  const [jamTab, setJamTab] = useState<'queue' | 'chat'>('queue');
  const [chatInput, setChatInput] = useState('');
  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline);

  useEffect(() => {
    const unsubscribe = networkMonitor.addListener(setIsOnline);
    return () => { unsubscribe(); };
  }, []);

  // Saved friends for in-room quick invite
  const [savedFriends, setSavedFriends] = useState<Friend[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isInRoom) {
      (async () => {
        try {
          const stored = await AsyncStorage.getItem('@jam_friends_list');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setSavedFriends(parsed);
          }
        } catch {}
      })();
    }
  }, [isInRoom]);

  // Join room input
  const [joinCode, setJoinCode] = useState('');

  // In-room search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Pulse animation for live badge
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (isInRoom && isConnected) {
      const pulseLoop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 900,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [isInRoom, isConnected, pulseAnim]);

  const handleCreateRoom = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    createRoom();
    showToast('Jam room created!', 'success');
  }, [createRoom, showToast]);

  const handleJoin = useCallback(() => {
    if (joinCode.trim().length >= 4) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      joinRoom(joinCode.trim().toUpperCase());
      setJoinCode('');
      showToast('Joined Jam room!', 'success');
    }
  }, [joinCode, joinRoom, showToast]);

  const handleCopyCode = useCallback(async () => {
    if (roomId) {
      await Clipboard.setStringAsync(roomId);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      showToast(`Room code ${roomId} copied!`, 'success');
    }
  }, [roomId, showToast]);

  const handleShareRoom = useCallback(async () => {
    if (roomId) {
      try {
        const inviteLink = `jam://room/${roomId}`;
        await Share.share({
          message: `Join my live Jam music room on Jam! 🎵\n\nRoom Code: ${roomId}\n1-Tap Join: ${inviteLink}`,
          url: inviteLink,
          title: `Jam Room #${roomId} Invite`,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  }, [roomId]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    if (!isOnline) {
      showToast('You are offline. Jam search needs an internet connection.', 'error');
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchSongs(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      showToast('Search failed. Please try again.', 'error');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, showToast, isOnline]);

  const handleSongPlayNow = useCallback(
    (song: Song) => {
      if (!isHost && !allowGuestPlayback) {
        showToast('The host has disabled guest playback controls.', 'info');
        return;
      }
      jamChangeSong(song);
      setSearchResults([]);
      setSearchQuery('');
      showToast(`Playing ${song.title}`, 'info');
    },
    [jamChangeSong, showToast, isHost, allowGuestPlayback]
  );

  const handleAddToJamQueue = useCallback(
    (song: Song) => {
      if (!isHost && !allowGuestQueue) {
        showToast('The host has disabled guest queue suggestions.', 'info');
        return;
      }
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      jamAddToQueue(song);
      showToast(`Added ${song.title} to Jam Queue`, 'success');
    },
    [jamAddToQueue, showToast, isHost, allowGuestQueue]
  );

  const handleSongSelect = useCallback(
    (song: Song) => {
      if (currentSong) {
        // Music is already playing in the room — queue it so current song is not interrupted
        handleAddToJamQueue(song);
      } else {
        // Room is silent — start playback immediately
        handleSongPlayNow(song);
      }
    },
    [currentSong, handleAddToJamQueue, handleSongPlayNow]
  );

  const handleRemoveFromJamQueue = useCallback(
    (songId: string, title?: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      jamRemoveFromQueue(songId);
      showToast(title ? `Removed ${title} from queue` : 'Removed from queue', 'info');
    },
    [jamRemoveFromQueue, showToast]
  );

  const confirmLeaveRoom = useCallback(() => {
    Alert.alert('Leave Jam Room', 'Are you sure you want to leave this Jam?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          leaveRoom();
          showToast('Left Jam room', 'info');
        },
      },
    ]);
  }, [leaveRoom, showToast]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    if (isSelfMuted) {
      showToast('The host muted chat for your account.', 'error');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    sendMessage(chatInput.trim());
    setChatInput('');
  };

  const handleSendReaction = (emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    sendReaction(emoji);
    showToast(`Reacted ${emoji}`, 'info');
  };

  const handleQuickInviteFriend = useCallback(
    async (friend: Friend) => {
      if (!roomId) return;
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      try {
        const inviteLink = `jam://room/${roomId}`;
        await Share.share({
          message: `Hey ${friend.username}! Join my live Jam session on Jam! 🎵\nRoom Code: ${roomId}\nTap to join: ${inviteLink}`,
          url: inviteLink,
          title: `Jam Room Invite for ${friend.username}`,
        });
        setInvitedFriends((prev) => ({ ...prev, [friend.id]: true }));
        showToast(`Invite shared for ${friend.username}!`, 'success');
      } catch (e) {
        console.error('Invite share error:', e);
      }
    },
    [roomId, showToast]
  );

  // ─── Voice Snippet Recording Handlers with Ducking & Permissions ───────
  const handleStartRecording = useCallback(async () => {
    if (isSelfMuted) {
      showToast('The host muted voice messages for your account.', 'error');
      return;
    }
    try {
      // 1. Explicit permission check before starting recording
      const perm = await getRecordingPermissionsAsync();
      if (!perm.granted) {
        const req = await requestRecordingPermissionsAsync();
        if (!req.granted) {
          Alert.alert(
            'Microphone Permission Required',
            'Please allow microphone permissions to record and share voice snippets in the Jam room.'
          );
          return;
        }
      }

      // 2. Configure audio mode: allow recording while playback is active without crashing session
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });

      // 3. Dynamic audio ducking: reduce music to 20%
      await audioPlayer.duckVolume(0.2);

      // 4. Start recording session
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingStartTimeRef.current = Date.now();
      isRecordingRef.current = true;
      setIsRecording(true);

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    } catch (err) {
      console.warn('[JamRoomScreen] Failed to start voice recording:', err);
      await audioPlayer.restoreVolume();
      setIsRecording(false);
      isRecordingRef.current = false;
      showToast('Could not access microphone', 'error');
    }
  }, [recorder, showToast, isSelfMuted]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);

    try {
      const elapsedMs = Date.now() - recordingStartTimeRef.current;
      await recorder.stop();

      // 1. Restore music volume back to 100%
      await audioPlayer.restoreVolume();

      // 2. Revert audio mode allowsRecording to false
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });

      if (elapsedMs < 600) {
        showToast('Hold down to record voice note', 'info');
        return;
      }

      const recordedUri = recorder.uri;
      if (!recordedUri) {
        showToast('Recording failed to capture', 'error');
        return;
      }

      // 3. Convert snippet to base64 for Socket.io broadcast
      const base64Data = await FileSystem.readAsStringAsync(recordedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!base64Data) {
        showToast('Audio encoding failed', 'error');
        return;
      }

      // 4. Broadcast over Socket.io to all jam room members
      sendVoiceSnippet(base64Data, elapsedMs);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      showToast('Voice note sent to Jam squad!', 'success');

      // Clean up temporary local recording file
      try {
        await FileSystem.deleteAsync(recordedUri, { idempotent: true });
      } catch {}
    } catch (err) {
      console.warn('[JamRoomScreen] Error stopping/sending voice snippet:', err);
      await audioPlayer.restoreVolume();
      showToast('Failed to send voice note', 'error');
    }
  }, [recorder, sendVoiceSnippet, showToast]);

  const currentUsername = user?.username ?? '';

  // ─── Not in a room ─────────────────────────────────────────────────────────
  if (!isInRoom) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.notInRoomScroll} showsVerticalScrollIndicator={false}>
          {/* Cyber Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIconWrapper}>
              <Ionicons name="radio" size={38} color={colors.accent} />
              <View style={styles.heroAura} />
            </View>
            <Text style={styles.heroTitle}>LIVE JAM ROOMS</Text>
            <Text style={styles.heroSubtitle}>
              Stream together in sub-second sync with live voting and squad reactions
            </Text>
          </View>

          {/* Create room CTA */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateRoom}
            activeOpacity={0.88}
          >
            <Ionicons name="add-circle" size={20} color="#000000" />
            <Text style={styles.createButtonText}>START NEW JAM SESSION</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR JOIN WITH CODE</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Join room */}
          <View style={styles.joinContainer}>
            <TextInput
              style={styles.joinInput}
              placeholder="ENTER ROOM CODE"
              placeholderTextColor={colors.textSecondary}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={8}
              returnKeyType="join"
              onSubmitEditing={handleJoin}
            />
            <TouchableOpacity
              style={[
                styles.joinButton,
                joinCode.trim().length < 4 && styles.joinButtonDisabled,
              ]}
              onPress={handleJoin}
              disabled={joinCode.trim().length < 4}
              activeOpacity={0.85}
            >
              <Text style={styles.joinButtonText}>JOIN</Text>
            </TouchableOpacity>
          </View>

          {/* Feature Highlights Card */}
          <View style={styles.featuresCard}>
            <View style={styles.featureRow}>
              <Ionicons name="flash" size={16} color={colors.accent} />
              <Text style={styles.featureText}>Sub-second drift compensation auto-syncs all listeners</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="thumbs-up" size={16} color={colors.accentSecondary} />
              <Text style={styles.featureText}>Democratic queue voting reorders upcoming tracks live</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="chatbubbles" size={16} color="#38BDF8" />
              <Text style={styles.featureText}>Squad reactions & live chat with room members</Text>
            </View>
          </View>
        </ScrollView>
        <MiniPlayer />
      </View>
    );
  }

  // ─── In a room ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Floating Active Reactions (overlay on top of room UI) */}
      {reactions.length > 0 && (
        <View style={styles.floatingReactionsOverlay} pointerEvents="none">
          {reactions.slice(-4).map((r) => (
            <View key={r.id} style={styles.floatingReactionBadge}>
              <Text style={styles.floatingReactionEmoji}>{r.emoji}</Text>
              <Text style={styles.floatingReactionUser}>{r.user.username}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Room header card */}
        <GlowCard style={styles.roomCard}>
          <View style={styles.roomCardInner}>
            <View style={styles.roomTopRow}>
              <View style={styles.roomCodeContainer}>
                <Text style={styles.roomLabel}>JAM ROOM</Text>
                <View style={styles.roomCodeRow}>
                  <TouchableOpacity
                    style={styles.roomCodeChip}
                    onPress={handleCopyCode}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roomCode}>#{roomId}</Text>
                    <Ionicons name="copy-outline" size={13} color={colors.accent} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={handleShareRoom}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-social-outline" size={17} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.connectionBadge}>
                <RNAnimated.View
                  style={[
                    styles.connectionDot,
                    {
                      backgroundColor: isConnected ? colors.online : colors.error,
                      transform: isConnected ? [{ scale: pulseAnim }] : [],
                    },
                  ]}
                />
                <Text style={styles.connectionText}>
                  {isConnected ? 'LIVE SYNC' : 'Connecting...'}
                </Text>
              </View>
            </View>

            {/* Members & Quick In-Room Party Games */}
            <View style={styles.membersRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <AvatarRow count={memberCount} />
                <Text style={styles.memberText}>
                  {memberCount} {memberCount === 1 ? 'listener' : 'listeners'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.partyGameBtn}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {}
                  router.push('/(tabs)/games');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="game-controller" size={14} color={colors.accent} />
                <Text style={styles.partyGameBtnText}>Play Games</Text>
              </TouchableOpacity>
            </View>

            {/* ─── Cyber Live DJ Booth HUD ─────────────────────────────── */}
            {currentSong ? (
              <View style={styles.djBoothContainer}>
                <View style={styles.djBoothHeader}>
                  <View style={styles.djBadge}>
                    <Ionicons name="headset" size={11} color="#000000" />
                    <Text style={styles.djBadgeText}>LIVE DJ BOOTH</Text>
                  </View>
                  {isPlaying ? (
                    <AnimatedEqualizer size={16} color={colors.accent} />
                  ) : (
                    <Text style={styles.djStatusPaused}>PAUSED</Text>
                  )}
                </View>

                <View style={styles.djBoothBody}>
                  {currentSong.imageUrl ? (
                    <Image source={{ uri: currentSong.imageUrl }} style={styles.djArtwork} />
                  ) : (
                    <View style={styles.djArtworkFallback}>
                      <Ionicons name="disc" size={24} color={colors.accent} />
                    </View>
                  )}

                  <View style={styles.djInfo}>
                    <Text style={styles.djTitle} numberOfLines={1}>{currentSong.title}</Text>
                    <Text style={styles.djArtist} numberOfLines={1}>{currentSong.artist}</Text>
                    <View style={styles.djMetaRow}>
                      <Text style={styles.djSyncText}>⚡ LIVE SYNC</Text>
                      {durationMs > 0 && (
                        <Text style={styles.djDurationText}>
                          {Math.floor(positionMs / 60000)}:{String(Math.floor((positionMs % 60000) / 1000)).padStart(2, '0')} / {Math.floor(durationMs / 60000)}:{String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.djControls}>
                    <TouchableOpacity
                      style={[styles.djControlBtn, !canControlPlayback && styles.disabledControl]}
                      disabled={!canControlPlayback}
                      onPress={() => (isPlaying ? jamPause() : jamPlay())}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    {jamQueue.length > 0 && (
                      <TouchableOpacity
                        style={[styles.djControlBtn, !canControlPlayback && styles.disabledControl]}
                        disabled={!canControlPlayback}
                        onPress={jamSkipNext}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="play-skip-forward" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.djEmptyContainer}>
                <Ionicons name="disc-outline" size={22} color={colors.accent} style={{ opacity: 0.6 }} />
                <Text style={styles.djEmptyText}>No song playing right now</Text>
              </View>
            )}

            {/* ─── Synchronized Lyrics Broadcast HUD ────────────────── */}
            <View style={styles.syncLyricsBanner}>
              <View style={styles.syncLyricsHeader}>
                <View style={styles.syncLyricsTag}>
                  <Ionicons name="mic-outline" size={11} color={colors.accent} />
                  <Text style={styles.syncLyricsTagText}>SYNCED LYRICS</Text>
                </View>
                {isHost && (
                  <TouchableOpacity
                    style={styles.broadcastLyricBtn}
                    onPress={() => {
                      const currentTitle = currentSong?.title || 'Jam Music';
                      broadcastLyricLine(1, `♪ Sing along to ${currentTitle} ♪`);
                      showToast('Broadcasted lyric line to room', 'success');
                    }}
                  >
                    <Ionicons name="radio-outline" size={11} color="#000000" />
                    <Text style={styles.broadcastLyricBtnText}>BROADCAST</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.syncLyricsText}>
                {syncedLyric?.lineText || '♪ Listening in sync with room squad ♪'}
              </Text>
            </View>

            {/* ─── DJ Host Overrides HUD ───────────────────────────── */}
            {isHost && (
              <View style={styles.djOverridesCard}>
                <View style={styles.djOverridesHeader}>
                  <View style={styles.djCrownBadge}>
                    <Ionicons name="sparkles" size={11} color="#000000" />
                    <Text style={styles.djCrownText}>DJ HOST PRIVILEGES</Text>
                  </View>
                  <Text style={styles.djOverrideSub}>Host Overrides</Text>
                </View>
                <View style={styles.djOverrideActions}>
                  <TouchableOpacity style={styles.djOverrideBtn} onPress={djForceSkip} activeOpacity={0.8}>
                    <Ionicons name="play-skip-forward" size={12} color="#FFFFFF" />
                    <Text style={styles.djOverrideBtnText}>FORCE SKIP</Text>
                  </TouchableOpacity>
                  <View style={styles.volumeWeightGroup}>
                    <Text style={styles.volWeightText}>Mix {Math.round(volumeWeight * 100)}%</Text>
                    {[0.8, 1.0, 1.2].map((weight) => (
                      <TouchableOpacity
                        key={weight}
                        style={[styles.volWeightChip, volumeWeight === weight && styles.volWeightChipActive]}
                        onPress={() => djSetVolumeWeight(weight)}
                      >
                        <Text style={[styles.volWeightText, volumeWeight === weight && styles.volWeightTextActive]}>
                          {Math.round(weight * 100)}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ marginTop: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 12 }}>Guests can add songs</Text>
                    <Switch value={allowGuestQueue} onValueChange={(value) => setRoomPermissions({ allowGuestQueue: value, allowGuestPlayback })} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 12 }}>Guests can control playback</Text>
                    <Switch value={allowGuestPlayback} onValueChange={(value) => setRoomPermissions({ allowGuestQueue, allowGuestPlayback: value })} />
                  </View>
                </View>
              </View>
            )}
          </View>
        </GlowCard>

        {/* Quick Emoji Reaction Bar */}
        <View style={styles.reactionBar}>
          {['🔥', '❤️', '🎵', '💃', '👏', '🥳'].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionPill}
              activeOpacity={0.7}
              onPress={() => handleSendReaction(emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Invite Saved Friends (Option 3) */}
        {savedFriends.length > 0 && (
          <View style={styles.quickInviteSection}>
            <View style={styles.quickInviteHeader}>
              <View style={styles.quickInviteHeaderLeft}>
                <Ionicons name="people" size={14} color={colors.accent} />
                <Text style={styles.quickInviteTitle}>Invite Saved Friends</Text>
              </View>
              <Text style={styles.quickInviteSub}>1-Tap Invite</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickInviteScroll}
            >
              {savedFriends.map((friend) => {
                const isInvited = invitedFriends[friend.id];
                return (
                  <View key={friend.id} style={styles.quickFriendCard}>
                    <View style={styles.quickFriendAvatar}>
                      <Text style={styles.quickFriendAvatarText}>
                        {friend.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.quickFriendName} numberOfLines={1}>
                      {friend.username}
                    </Text>
                    <TouchableOpacity
                      style={[styles.quickInviteBtn, isInvited && styles.quickInviteBtnDone]}
                      activeOpacity={0.7}
                      onPress={() => handleQuickInviteFriend(friend)}
                    >
                      <Ionicons
                        name={isInvited ? 'checkmark' : 'paper-plane'}
                        size={10}
                        color={isInvited ? colors.accent : colors.background}
                      />
                      <Text
                        style={[
                          styles.quickInviteBtnText,
                          isInvited && styles.quickInviteBtnTextDone,
                        ]}
                      >
                        {isInvited ? 'Sent' : 'Invite'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Segmented Control: Queue vs Chat */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, jamTab === 'queue' && styles.segmentBtnActive]}
            onPress={() => setJamTab('queue')}
          >
            <Ionicons
              name="list"
              size={16}
              color={jamTab === 'queue' ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.segmentText, jamTab === 'queue' && styles.segmentTextActive]}>
              Queue ({jamQueue.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, jamTab === 'chat' && styles.segmentBtnActive]}
            onPress={() => setJamTab('chat')}
          >
            <Ionicons
              name="chatbubbles"
              size={16}
              color={jamTab === 'chat' ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.segmentText, jamTab === 'chat' && styles.segmentTextActive]}>
              Chat {messages.length > 0 && `(${messages.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {jamTab === 'chat' ? (
          /* Live Chat Section */
          <View style={styles.chatSection}>
            <View style={styles.chatMessagesList}>
              {messages.length === 0 ? (
                <View style={styles.emptyChatCard}>
                  <Ionicons name="chatbubbles-outline" size={36} color={colors.accentAlpha25} />
                  <Text style={styles.emptyChatTitle}>No messages yet</Text>
                  <Text style={styles.emptyChatDesc}>
                    Say hi or react to songs with the listening squad!
                  </Text>
                </View>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user.username === currentUsername;
                  return (
                    <View
                      key={msg.id}
                      style={[styles.chatBubbleContainer, isMe && styles.chatBubbleRight]}
                    >
                      {!isMe && (
                        <View style={styles.chatAvatar}>
                          <Text style={styles.chatAvatarText}>
                            {msg.user.username.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.chatBubble,
                          isMe ? styles.chatBubbleMe : styles.chatBubbleOther,
                          msg.message.startsWith('🎙️') && styles.chatBubbleVoiceNote,
                        ]}
                      >
                        {!isMe && (
                          <Text style={styles.chatSender}>{msg.user.username}</Text>
                        )}
                        <Text style={[styles.chatMessageText, isMe && styles.chatMessageTextMe]}>
                          {msg.message}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Recording Active Feedback Banner */}
            {isRecording && (
              <View style={styles.recordingBanner}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  Recording voice snippet... Release to send
                </Text>
              </View>
            )}

            {/* Chat Input */}
            <View style={styles.chatInputRow}>
              {isSelfMuted && <Text style={styles.mutedNotice}>The host has muted chat and voice for you.</Text>}
              <TextInput
                style={styles.chatTextInput}
                placeholder="Say something to room..."
                placeholderTextColor={colors.textSecondary}
                value={chatInput}
                onChangeText={setChatInput}
                returnKeyType="send"
                onSubmitEditing={handleSendChat}
                editable={!isSelfMuted}
              />
              <TouchableOpacity
                style={[styles.voiceSnippetBtn, isRecording && styles.voiceSnippetBtnActive]}
                onPressIn={handleStartRecording}
                onPressOut={handleStopRecording}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isRecording ? 'mic' : 'mic-outline'}
                  size={17}
                  color={isRecording ? '#000000' : colors.accent}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chatSendBtn, (!chatInput.trim() || isSelfMuted) && { opacity: 0.5 }]}
                disabled={!chatInput.trim() || isSelfMuted}
                onPress={handleSendChat}
              >
                <Ionicons name="send" size={16} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Queue Section & Search to Queue */
          <>
            <View style={styles.queueSection}>
              <View style={styles.queueHeader}>
                <Ionicons name="list" size={16} color={colors.accent} />
                <Text style={styles.queueTitle}>
                  Up Next · {jamQueue.length} {jamQueue.length === 1 ? 'song' : 'songs'}
                </Text>
              </View>

              {jamQueue.length === 0 ? (
                <View style={styles.emptyQueueCard}>
                  <Text style={styles.emptyQueueText}>
                    No upcoming songs. Search and add tracks to the shared queue below!
                  </Text>
                </View>
              ) : (
                <View style={styles.queueList}>
                  {jamQueue.map((entry, index) => {
                    const isOwn =
                      entry.addedBy === currentUsername ||
                      entry.addedBy?.startsWith(currentUsername) ||
                      !entry.addedBy;
                    const hasUpvoted = entry.upvoters?.includes(currentUsername);
                    const isMuted = mutedUsers.includes(entry.addedBy);

                    return (
                      <View key={`jam-q-${entry.songId}-${index}`} style={styles.queueItem}>
                        {entry.song?.imageUrl ? (
                          <Image source={{ uri: entry.song.imageUrl }} style={styles.queueThumb} />
                        ) : (
                          <View style={styles.queueThumbFallback}>
                            <Ionicons name="musical-note" size={18} color={colors.accent} />
                          </View>
                        )}
                        <View style={styles.queueInfo}>
                          <Text style={styles.queueItemTitle} numberOfLines={1}>
                            {entry.song?.title || 'Loading song...'}
                          </Text>
                          <Text style={styles.queueItemSubtitle} numberOfLines={1}>
                            {entry.song?.artist || 'JioSaavn'} • by {entry.addedBy || 'Jammer'}
                          </Text>
                        </View>

                        {/* Real-time Upvote Pill */}
                        <TouchableOpacity
                          style={[styles.votePill, hasUpvoted && styles.votePillActive]}
                          onPress={() => {
                            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                            jamVoteSong(entry.songId);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={hasUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                            size={16}
                            color={hasUpvoted ? colors.accent : colors.textSecondary}
                          />
                          <Text style={[styles.voteCountText, hasUpvoted && styles.voteCountTextActive]}>
                            {entry.votes || 0}
                          </Text>
                        </TouchableOpacity>

                        {isHost && entry.addedBy ? (
                          <TouchableOpacity
                            style={styles.queueRemoveBtn}
                            accessibilityLabel={isMuted ? `Unmute ${entry.addedBy}` : `Mute ${entry.addedBy}`}
                            onPress={() => djToggleMuteUser(entry.addedBy)}
                          >
                            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high-outline'} size={17} color={isMuted ? colors.error : colors.textSecondary} />
                          </TouchableOpacity>
                        ) : isMuted ? <Text style={styles.mutedBadge}>Muted</Text> : null}

                        {isOwn && (
                          <TouchableOpacity
                            onPress={() => handleRemoveFromJamQueue(entry.songId, entry.song?.title)}
                            style={styles.queueRemoveBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Search songs to queue in room */}
            <View style={styles.roomSearch}>
              <Text style={styles.searchSectionTitle}>Add Songs to Jam</Text>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search to play or queue..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  editable={isOnline}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Search results or skeleton loading */}
            {isSearching ? (
              <View style={styles.searchResultsSkeleton}>
                <SkeletonList count={5} />
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.resultsHeaderHint}>
                  {currentSong
                    ? 'Tap song to add to Jam Queue · Long-press to play now'
                    : 'Tap song to play'}
                </Text>
                {searchResults.map((item) => (
                  <SongCard
                    key={`inroom-search-${item.id}`}
                    song={item}
                    onPress={handleSongSelect}
                    onLongPress={handleSongPlayNow}
                    onAddToQueue={handleAddToJamQueue}
                    isPlaying={currentSong?.id === item.id}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}

        {/* Leave button */}
        <View style={styles.leaveContainer}>
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={confirmLeaveRoom}
            activeOpacity={0.8}
          >
            <Ionicons name="exit-outline" size={18} color={colors.error} />
            <Text style={styles.leaveText}>Leave Room</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },

  // ─── Not in room ───────────────────────────────────────────────────────────
  notInRoom: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  notInRoomScroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: 160,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.accentAlpha25,
  },
  heroIconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    position: 'relative',
  },
  heroAura: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.accentAlpha10,
    zIndex: -1,
  },
  featuresCard: {
    marginTop: spacing.xxxl,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  heroTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  createButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: '#000000',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xxl,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1,
  },
  joinContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  joinInput: {
    flex: 1,
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: typography.weights.bold,
  },
  joinButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.35,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  joinButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: '#000000',
  },

  // ─── In room ───────────────────────────────────────────────────────────────
  roomCard: {
    margin: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  roomCardInner: {
    padding: spacing.xl,
  },
  roomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  roomCodeContainer: {},
  roomLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  roomCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roomCodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.25)',
  },
  roomCode: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.accent,
    letterSpacing: 2,
  },
  partyGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.25)',
  },
  partyGameBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.backgroundInput,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  memberText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  currentSongInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  currentSongText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.medium,
    flex: 1,
  },

  // ─── Queue Section ─────────────────────────────────────────────────────────
  queueSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  queueTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyQueueCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyQueueText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  queueList: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  queueThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.backgroundInput,
  },
  queueThumbFallback: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueInfo: {
    flex: 1,
    marginLeft: spacing.sm + 2,
    marginRight: spacing.sm,
  },
  queueItemTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  queueItemSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  queueRemoveBtn: {
    padding: 6,
  },

  // ─── Room Search ───────────────────────────────────────────────────────────
  roomSearch: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  searchSectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  searchResultsSkeleton: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  searchResultsContainer: {
    marginTop: spacing.sm,
  },
  resultsHeaderHint: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },

  // ─── Leave Container ───────────────────────────────────────────────────────
  leaveContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  leaveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(224, 138, 138, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224, 138, 138, 0.25)',
  },
  leaveText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.error,
  },

  // ─── Reactions & Chat Styles ───────────────────────────────────────────────
  reactionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  reactionPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  floatingReactionsOverlay: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 9999,
    elevation: 30,
    gap: 6,
  },
  floatingReactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 24, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: 6,
  },
  floatingReactionEmoji: {
    fontSize: 16,
  },
  floatingReactionUser: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.accentAlpha15,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  segmentText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.accent,
    fontWeight: typography.weights.bold,
  },
  chatSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  chatMessagesList: {
    minHeight: 180,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  emptyChatCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyChatTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptyChatDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  chatBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginVertical: 2,
  },
  chatBubbleRight: {
    justifyContent: 'flex-end',
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentAlpha25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accent,
  },
  chatBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  chatBubbleMe: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 2,
  },
  chatBubbleOther: {
    backgroundColor: colors.backgroundElevated,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatBubbleVoiceNote: {
    borderColor: 'rgba(29, 185, 84, 0.4)',
    borderWidth: 1,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
  },
  chatSender: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 2,
  },
  chatMessageText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  chatMessageTextMe: {
    color: '#000000',
    fontWeight: '600',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    gap: spacing.sm,
  },
  chatTextInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    paddingVertical: spacing.sm,
  },
  chatSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickInviteSection: {
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  quickInviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  quickInviteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickInviteTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  quickInviteSub: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
  },
  quickInviteScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  quickFriendCard: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: 86,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickFriendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentAlpha10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  quickFriendAvatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  quickFriendName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  quickInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: '100%',
  },
  quickInviteBtnDone: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickInviteBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  quickInviteBtnTextDone: {
    color: colors.textSecondary,
  },
  // Cyber Live DJ Booth HUD
  djBoothContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.sm,
  },
  djBoothHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  djBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  djBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  djStatusPaused: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  djBoothBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  djArtwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated,
  },
  djArtworkFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  djInfo: {
    flex: 1,
  },
  djTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  djArtist: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  djMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  djSyncText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.3,
  },
  djDurationText: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  djControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  djControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  disabledControl: { opacity: 0.4 },
  mutedNotice: { color: colors.error, fontSize: 12, marginHorizontal: spacing.md },
  mutedBadge: { color: colors.error, fontSize: 10, fontWeight: '700', marginHorizontal: 6 },
  djEmptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  djEmptyText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Upvote Pill Styles
  votePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  votePillActive: {
    backgroundColor: colors.accentAlpha15,
    borderColor: colors.accent,
  },
  voteCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  voteCountTextActive: {
    color: colors.accent,
  },
  // Synchronized Lyrics HUD
  syncLyricsBanner: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  syncLyricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  syncLyricsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncLyricsTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  broadcastLyricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  broadcastLyricBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  syncLyricsText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  // DJ Overrides Card
  djOverridesCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  djOverridesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  djCrownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  djCrownText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  djOverrideSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  djOverrideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  djOverrideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  djOverrideBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  volumeWeightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  volWeightChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  volWeightChipActive: {
    backgroundColor: colors.accentAlpha25,
    borderColor: colors.accent,
  },
  volWeightText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  volWeightTextActive: {
    color: colors.accent,
  },
  // Voice Snippet Button
  voiceSnippetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  voiceSnippetBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    fontSize: typography.sizes.xs,
    color: '#EF4444',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
