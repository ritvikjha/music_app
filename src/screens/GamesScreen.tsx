import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Modal,
  TextInput,
  Share,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useJam } from '../context/JamContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { syncManager } from '../services/playbackSyncManager';
import { MiniPlayer } from '../components/MiniPlayer';
import { colors, spacing, borderRadius, typography } from '../theme';
import {
  DECKS,
  TRUTH_OR_DARE_ITEMS,
  WOULD_YOU_RATHER_ITEMS,
  NEVER_HAVE_I_EVER_ITEMS,
  MOST_LIKELY_TO_ITEMS,
} from '../data/partyGamesData';
import type {
  PartyGameMode,
  TruthOrDareDeck,
  TruthOrDareItem,
  PartyGameEvent,
  Friend,
  JamChatMessage,
} from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TURNTABLE_SIZE = Math.min(SCREEN_WIDTH - 48, 290);
const STORAGE_KEY = '@jam_friends_list';

const QUICK_ROASTS = [
  'Do the dare! 🔥',
  'Tell the truth! 💎',
  'No cap! 🧢',
  'Dead 💀',
  'I swear I am innocent! 😇',
  'Spill the tea! ☕',
  'Spin again! 🍾',
];

export default function GamesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    isInRoom,
    roomId,
    memberCount,
    createRoom,
    joinRoom,
    leaveRoom,
    messages,
    sendMessage,
    reactions,
    sendReaction,
  } = useJam();
  const { showToast } = useToast();

  const myName = user?.username || 'You';

  // Active game mode
  const [activeMode, setActiveMode] = useState<PartyGameMode>('bottle');

  // Squad / Players roster — DEFAULT TO 2 PLAYERS!
  const [roster, setRoster] = useState<string[]>([myName, 'Player 2']);
  const [savedFriends, setSavedFriends] = useState<Friend[]>([]);
  const [newPlayerInput, setNewPlayerInput] = useState('');
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');
  const [showRosterModal, setShowRosterModal] = useState(false);

  // Party Chat State
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const chatListRef = useRef<FlatList<JamChatMessage> | null>(null);

  // Sync Event & Chat Floating Toast
  const [partyNotice, setPartyNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPartyNotice = useCallback((text: string) => {
    setPartyNotice(text);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setPartyNotice(null), 3500);
  }, []);

  // Listen to incoming chat messages and display float notice if modal is closed
  const prevMsgLengthRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgLengthRef.current) {
      const latest = messages[messages.length - 1];
      if (latest && latest.user?.username !== myName && !showChatModal) {
        triggerPartyNotice(`💬 ${latest.user.username}: ${latest.message}`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    prevMsgLengthRef.current = messages.length;
  }, [messages, myName, showChatModal, triggerPartyNotice]);

  // ─── Mode 1: Spin the Bottle & Truth or Dare State ─────────────────────────
  const [selectedDeck, setSelectedDeck] = useState<TruthOrDareDeck>('casual');
  const [isSpinning, setIsSpinning] = useState(false);
  const [chosenPlayerIndex, setChosenPlayerIndex] = useState<number | null>(null);
  const [activeCard, setActiveCard] = useState<TruthOrDareItem | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Bottle rotation animation
  const bottleAngleAnim = useRef(new Animated.Value(0)).current;
  const currentAngleRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Mode 2: Would You Rather State ─────────────────────────────────────────
  const [wyrIndex, setWyrIndex] = useState(0);
  const [wyrVotes, setWyrVotes] = useState<{ [itemId: string]: { [username: string]: 'A' | 'B' } }>({});

  // ─── Mode 3: Never Have I Ever State ────────────────────────────────────────
  const [nhieIndex, setNhieIndex] = useState(0);
  const [playerLives, setPlayerLives] = useState<{ [username: string]: number }>({
    [myName]: 5,
    'Player 2': 5,
  });

  // ─── Mode 4: Most Likely To State ───────────────────────────────────────────
  const [mltIndex, setMltIndex] = useState(0);
  const [mltVotes, setMltVotes] = useState<{ [itemId: string]: { [voter: string]: string } }>({});

  // Join Room Modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // ─── Load Saved Friends & Initialize Roster ─────────────────────────────────
  const loadSavedFriends = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSavedFriends(parsed);
          // If we had a friend saved, set them as Player 2 by default
          if (parsed.length > 0) {
            setRoster((prev) => [prev[0] || myName, parsed[0].username]);
            setPlayerLives((prev) => ({
              ...prev,
              [myName]: prev[myName] ?? 5,
              [parsed[0].username]: 5,
            }));
          }
        }
      }
    } catch (err) {
      console.warn('[Games] Failed to load saved friends:', err);
    }
  }, [myName]);

  useEffect(() => {
    loadSavedFriends();
  }, [loadSavedFriends]);

  // Keep currentAngleRef updated with animated value
  useEffect(() => {
    const id = bottleAngleAnim.addListener(({ value }) => {
      currentAngleRef.current = value;
    });
    return () => bottleAngleAnim.removeListener(id);
  }, [bottleAngleAnim]);

  // ─── Quick Player Count Switcher ────────────────────────────────────────────
  const setPlayerCount = (count: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let updated: string[] = [];
    if (count === 2) {
      updated = [roster[0] || myName, roster[1] || 'Player 2'];
    } else if (count === 3) {
      const third = savedFriends[1]?.username || 'Player 3';
      updated = [roster[0] || myName, roster[1] || 'Player 2', roster[2] || third];
    } else if (count === 4) {
      const third = savedFriends[1]?.username || 'Player 3';
      const fourth = savedFriends[2]?.username || 'Player 4';
      updated = [roster[0] || myName, roster[1] || 'Player 2', roster[2] || third, roster[3] || fourth];
    }
    setRoster(updated);
    setPlayerLives((prev) => {
      const nextMap = { ...prev };
      updated.forEach((p) => {
        if (nextMap[p] === undefined) nextMap[p] = 5;
      });
      return nextMap;
    });
    setChosenPlayerIndex(null);
    showToast(`Set to ${count} Players (${count === 2 ? 'Duo Mode' : 'Party'})`);
  };

  // ─── Countdown Timer Effect ─────────────────────────────────────────────────
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timerSeconds]);

  // ─── Real-Time WebSocket Synchronization ────────────────────────────────────
  useEffect(() => {
    const unsubscribe = syncManager.onGameEvent((event: PartyGameEvent) => {
      switch (event.type) {
        case 'bottle_spin': {
          setIsSpinning(true);
          setActiveCard(null);
          triggerPartyNotice(`🍾 ${event.spinnerName} spun the bottle!`);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          Animated.timing(bottleAngleAnim, {
            toValue: event.targetAngle,
            duration: event.durationMs || 3200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            setIsSpinning(false);
            setChosenPlayerIndex(event.chosenPlayerIndex);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          });
          break;
        }

        case 'bottle_select_card': {
          setActiveCard(event.item);
          setSelectedDeck(event.deck);
          triggerPartyNotice(`🎯 ${event.chosenBy} picked a ${event.item.type.toUpperCase()}!`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        }

        case 'bottle_timer_start': {
          setTimerSeconds(event.seconds);
          setIsTimerRunning(true);
          triggerPartyNotice(`⏳ 30-second timer started!`);
          break;
        }

        case 'wyr_vote': {
          setWyrVotes((prev) => {
            const currentItemVotes = prev[event.itemId] || {};
            return {
              ...prev,
              [event.itemId]: {
                ...currentItemVotes,
                [event.username]: event.option,
              },
            };
          });
          triggerPartyNotice(`🤔 ${event.username} voted on Would You Rather!`);
          break;
        }

        case 'wyr_next': {
          setWyrIndex(event.itemIndex);
          triggerPartyNotice(`👉 Next Dilemma #${event.itemIndex + 1}!`);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        }

        case 'nhie_lose_life': {
          setPlayerLives((prev) => ({
            ...prev,
            [event.username]: event.remainingLives,
          }));
          triggerPartyNotice(`💥 ${event.username} admitted it! (${event.remainingLives} ❤️ left)`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        }

        case 'nhie_next': {
          setNhieIndex(event.itemIndex);
          triggerPartyNotice(`👉 Next statement!`);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        }

        case 'nhie_reset': {
          setPlayerLives((prev) => {
            const resetMap: { [u: string]: number } = {};
            Object.keys(prev).forEach((name) => {
              resetMap[name] = 5;
            });
            return resetMap;
          });
          triggerPartyNotice(`🔄 All squad lives were reset to 5 ❤️!`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        }

        case 'mlt_vote': {
          setMltVotes((prev) => {
            const itemVotes = prev[event.itemId] || {};
            return {
              ...prev,
              [event.itemId]: {
                ...itemVotes,
                [event.voter]: event.votedFor,
              },
            };
          });
          triggerPartyNotice(`👑 ${event.voter} voted for ${event.votedFor}!`);
          break;
        }

        case 'mlt_next': {
          setMltIndex(event.itemIndex);
          triggerPartyNotice(`👉 Next prompt!`);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        }
      }
    });

    return () => unsubscribe();
  }, [bottleAngleAnim, triggerPartyNotice]);

  // ─── Actions: Spin The Bottle ───────────────────────────────────────────────
  const handleSpinBottle = () => {
    if (isSpinning || roster.length === 0) return;

    setIsSpinning(true);
    setActiveCard(null);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const targetPlayerIndex = Math.floor(Math.random() * roster.length);
    const arcDegrees = 360 / roster.length;
    const playerAngle = targetPlayerIndex * arcDegrees;

    const extraSpins = (4 + Math.floor(Math.random() * 3)) * 360;
    const currentAngle = currentAngleRef.current;
    const currentMod = currentAngle % 360;
    let diff = playerAngle - currentMod;
    if (diff <= 0) diff += 360;

    const finalAngle = currentAngle + extraSpins + diff;
    const duration = 3200;

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'bottle_spin',
        targetAngle: finalAngle,
        durationMs: duration,
        spinnerName: myName,
        chosenPlayerIndex: targetPlayerIndex,
      });
    }

    Animated.timing(bottleAngleAnim, {
      toValue: finalAngle,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      setChosenPlayerIndex(targetPlayerIndex);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  const handlePickCard = (type: 'truth' | 'dare') => {
    const filtered = TRUTH_OR_DARE_ITEMS.filter(
      (item) => item.deck === selectedDeck && item.type === type
    );
    if (filtered.length === 0) return;

    const randomItem = filtered[Math.floor(Math.random() * filtered.length)];
    setActiveCard(randomItem);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'bottle_select_card',
        item: randomItem,
        deck: selectedDeck,
        chosenBy: roster[chosenPlayerIndex ?? 0] || myName,
      });
    }
  };

  const handleStartTimer = (seconds = 30) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'bottle_timer_start',
        seconds,
      });
    }
  };

  // ─── Actions: Would You Rather ──────────────────────────────────────────────
  const currentWyrItem = WOULD_YOU_RATHER_ITEMS[wyrIndex] || WOULD_YOU_RATHER_ITEMS[0];
  const currentWyrVotes = wyrVotes[currentWyrItem.id] || {};
  const myWyrVote = currentWyrVotes[myName];

  const player1 = roster[0] || myName;
  const player2 = roster[1] || 'Player 2';
  const player1Vote = currentWyrVotes[player1];
  const player2Vote = currentWyrVotes[player2];

  const handleVoteWyr = (option: 'A' | 'B', voterName = myName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = {
      ...currentWyrVotes,
      [voterName]: option,
    };

    setWyrVotes((prev) => ({
      ...prev,
      [currentWyrItem.id]: updated,
    }));

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'wyr_vote',
        itemId: currentWyrItem.id,
        option,
        username: voterName,
      });
    }
  };

  const handleNextWyr = () => {
    const nextIdx = (wyrIndex + 1) % WOULD_YOU_RATHER_ITEMS.length;
    setWyrIndex(nextIdx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'wyr_next',
        itemIndex: nextIdx,
      });
    }
  };

  // ─── Actions: Never Have I Ever ─────────────────────────────────────────────
  const currentNhieItem = NEVER_HAVE_I_EVER_ITEMS[nhieIndex] || NEVER_HAVE_I_EVER_ITEMS[0];

  const handleLoseLifeNhie = (targetUsername = myName) => {
    const currentLives = playerLives[targetUsername] ?? 5;
    if (currentLives <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const newLives = currentLives - 1;

    setPlayerLives((prev) => ({
      ...prev,
      [targetUsername]: newLives,
    }));

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'nhie_lose_life',
        username: targetUsername,
        remainingLives: newLives,
      });
    }
  };

  const handleNextNhie = () => {
    const nextIdx = (nhieIndex + 1) % NEVER_HAVE_I_EVER_ITEMS.length;
    setNhieIndex(nextIdx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'nhie_next',
        itemIndex: nextIdx,
      });
    }
  };

  const handleResetNhie = () => {
    const resetMap: { [name: string]: number } = {};
    roster.forEach((name) => {
      resetMap[name] = 5;
    });
    setPlayerLives(resetMap);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'nhie_reset',
      });
    }
  };

  // ─── Actions: Most Likely To ────────────────────────────────────────────────
  const currentMltItem = MOST_LIKELY_TO_ITEMS[mltIndex] || MOST_LIKELY_TO_ITEMS[0];
  const currentMltVotes = mltVotes[currentMltItem.id] || {};
  const myMltVote = currentMltVotes[myName];

  const handleVoteMlt = (votedFor: string, voterName = myName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = {
      ...currentMltVotes,
      [voterName]: votedFor,
    };

    setMltVotes((prev) => ({
      ...prev,
      [currentMltItem.id]: updated,
    }));

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'mlt_vote',
        itemId: currentMltItem.id,
        votedFor,
        voter: voterName,
      });
    }
  };

  const handleNextMlt = () => {
    const nextIdx = (mltIndex + 1) % MOST_LIKELY_TO_ITEMS.length;
    setMltIndex(nextIdx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'mlt_next',
        itemIndex: nextIdx,
      });
    }
  };

  // ─── Actions: Chat & Reactions ──────────────────────────────────────────────
  const handleSendChat = () => {
    const trimmed = chatInputText.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setChatInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      chatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendQuickRoast = (text: string) => {
    sendMessage(text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      chatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendEmojiBlast = (emoji: string) => {
    sendReaction(emoji);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast(`Blasted ${emoji}!`);
  };

  // ─── Room Join & Share Helpers ──────────────────────────────────────────────
  const handleCopyRoom = async () => {
    if (!roomId) return;
    await Clipboard.setStringAsync(roomId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Copied room code: ${roomId}`);
  };

  const handleShareRoom = async () => {
    if (!roomId) return;
    try {
      await Share.share({
        message: `🎮 Join our Squad Hangout Party on Jam Music! Room Code: ${roomId}`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleJoinSubmit = () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      showToast('Please enter a valid room code');
      return;
    }
    joinRoom(code);
    setShowJoinModal(false);
    setJoinCodeInput('');
    showToast(`Connecting to room #${code}...`);
  };

  const handleSaveRename = () => {
    if (editingPlayerIndex === null) return;
    const trimmed = editingPlayerName.trim();
    if (!trimmed) {
      setEditingPlayerIndex(null);
      return;
    }
    const oldName = roster[editingPlayerIndex];
    const updated = [...roster];
    updated[editingPlayerIndex] = trimmed;
    setRoster(updated);

    setPlayerLives((prev) => {
      const next = { ...prev };
      const currentVal = next[oldName] ?? 5;
      delete next[oldName];
      next[trimmed] = currentVal;
      return next;
    });

    setEditingPlayerIndex(null);
    setEditingPlayerName('');
    showToast(`Renamed to "${trimmed}"`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddPlayer = (nameToAdd?: string) => {
    const name = (nameToAdd || newPlayerInput).trim();
    if (!name) return;
    if (roster.includes(name)) {
      showToast(`${name} is already in the game!`);
      return;
    }
    const updated = [...roster, name];
    setRoster(updated);
    setPlayerLives((prev) => ({ ...prev, [name]: 5 }));
    setNewPlayerInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(`Added ${name} to game!`);
  };

  const handleRemovePlayer = (name: string) => {
    if (roster.length <= 2) {
      showToast('Minimum 2 players needed for duel');
      return;
    }
    const updated = roster.filter((p) => p !== name);
    setRoster(updated);
    showToast(`Removed ${name}`);
  };

  // ─── Interpolated Bottle Rotation ───────────────────────────────────────────
  const bottleRotation = bottleAngleAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const isDuoMode = roster.length === 2;

  return (
    <View style={styles.container}>
      {/* ─── Party Notice Overlay ────────────────────────────────────────── */}
      {partyNotice && (
        <View style={[styles.partyNoticeBadge, { top: insets.top + 8 }]}>
          <Text style={styles.partyNoticeText}>{partyNotice}</Text>
        </View>
      )}

      {/* ─── Room Connection / Sync Header ───────────────────────────────── */}
      <View style={styles.header}>
        {isInRoom ? (
          <View style={styles.roomSyncPill}>
            <View style={styles.onlineDot} />
            <TouchableOpacity onPress={handleCopyRoom} activeOpacity={0.7} style={styles.roomCodeTouch}>
              <Text style={styles.roomSyncText}>
                ROOM <Text style={styles.roomCodeHighlight}>#{roomId}</Text>
              </Text>
              <Text style={styles.memberCountBadge}>{memberCount || 1} online</Text>
              <Ionicons name="copy-outline" size={14} color={colors.accent} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShareRoom} style={styles.iconButton}>
              <Ionicons name="share-social-outline" size={18} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity onPress={leaveRoom} style={styles.iconButtonDestructive}>
              <Ionicons name="close" size={18} color="#FF4D6D" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.offlineSyncRow}>
            <View style={styles.offlineTextWrap}>
              <View style={styles.yellowDot} />
              <Text style={styles.offlineTitle}>PASS & PLAY</Text>
            </View>
            <View style={styles.offlineActions}>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => setShowJoinModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={13} color="#050508" />
                <Text style={styles.connectButtonText}>CONNECT SQUAD</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Player Count Selector & Prominent Add Button */}
        <View style={styles.playerCountPills}>
          <TouchableOpacity
            style={[styles.countPill, isDuoMode && styles.countPillActive]}
            onPress={() => setPlayerCount(2)}
            activeOpacity={0.8}
          >
            <Text style={[styles.countPillText, isDuoMode && styles.countPillTextActive]}>
              2P (Duo)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.countPill, roster.length === 3 && styles.countPillActive]}
            onPress={() => setPlayerCount(3)}
            activeOpacity={0.8}
          >
            <Text style={[styles.countPillText, roster.length === 3 && styles.countPillTextActive]}>
              3P
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.countPill, roster.length >= 4 && styles.countPillActive]}
            onPress={() => {
              if (roster.length < 4) setPlayerCount(4);
              else setShowRosterModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.countPillText, roster.length >= 4 && styles.countPillTextActive]}>
              {roster.length >= 4 ? `${roster.length}P` : '4P'}
            </Text>
          </TouchableOpacity>

          {/* Prominent + Add Friend Button */}
          <TouchableOpacity
            style={styles.addFriendTopBtn}
            onPress={() => setShowRosterModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={13} color="#050508" />
            <Text style={styles.addFriendTopBtnText}>+ ADD</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Duo Mode Alert Pill & Quick Add 3rd ──────────────────────────── */}
      {isDuoMode && (
        <View style={styles.duoBanner}>
          <Text style={styles.duoBannerText}>
            ⚡ <Text style={{ color: '#00F2FE', fontWeight: '900' }}>{player1}</Text> VS{' '}
            <Text style={{ color: '#FF007F', fontWeight: '900' }}>{player2}</Text>
          </Text>
          <View style={styles.duoActionsRight}>
            <TouchableOpacity
              onPress={() => {
                setEditingPlayerIndex(1);
                setEditingPlayerName(player2);
              }}
              style={styles.renameLink}
            >
              <Ionicons name="pencil" size={11} color={colors.accent} />
              <Text style={styles.renameLinkText}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowRosterModal(true)}
              style={styles.addThirdPill}
            >
              <Ionicons name="add" size={12} color="#FFE600" />
              <Text style={styles.addThirdPillText}>Add 3rd</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Game Mode Tabs ──────────────────────────────────────────────── */}
      <View style={styles.modeTabBar}>
        <TouchableOpacity
          style={[styles.modeTab, activeMode === 'bottle' && styles.modeTabActiveBottle]}
          onPress={() => {
            setActiveMode('bottle');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.modeTabIcon}>🍾</Text>
          <Text style={[styles.modeTabLabel, activeMode === 'bottle' && styles.modeTabLabelActive]}>
            Bottle & Dare
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeMode === 'wyr' && styles.modeTabActiveWyr]}
          onPress={() => {
            setActiveMode('wyr');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.modeTabIcon}>🤔</Text>
          <Text style={[styles.modeTabLabel, activeMode === 'wyr' && styles.modeTabLabelActive]}>
            Rather?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeMode === 'nhie' && styles.modeTabActiveNhie]}
          onPress={() => {
            setActiveMode('nhie');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.modeTabIcon}>✋</Text>
          <Text style={[styles.modeTabLabel, activeMode === 'nhie' && styles.modeTabLabelActive]}>
            Never Ever
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeMode === 'mlt' && styles.modeTabActiveMlt]}
          onPress={() => {
            setActiveMode('mlt');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.modeTabIcon}>👑</Text>
          <Text style={[styles.modeTabLabel, activeMode === 'mlt' && styles.modeTabLabelActive]}>
            Likely To
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Main Game Canvas ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════════════════════════
            MODE 1: SPIN THE BOTTLE & TRUTH OR DARE
        ══════════════════════════════════════════════════════════════════ */}
        {activeMode === 'bottle' && (
          <View style={styles.bottleContainer}>
            {/* Turntable Arena with Players */}
            <View style={styles.turntable}>
              <View style={styles.turntableRingOuter} />
              <View style={styles.turntableRingInner} />

              {/* Player Seats around the circle */}
              {roster.map((player, idx) => {
                const arc = 360 / roster.length;
                const angle = (idx * arc - 90) * (Math.PI / 180);
                const radius = TURNTABLE_SIZE / 2 - 28;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                const isSelected = chosenPlayerIndex === idx;

                return (
                  <TouchableOpacity
                    key={player + idx}
                    onPress={() => {
                      setEditingPlayerIndex(idx);
                      setEditingPlayerName(player);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.playerNode,
                      {
                        transform: [{ translateX: x }, { translateY: y }],
                      },
                      isSelected && styles.playerNodeSelected,
                      isDuoMode && (idx === 0 ? styles.duoNode1 : styles.duoNode2),
                    ]}
                  >
                    <Text style={styles.playerAvatarLetter}>
                      {player.charAt(0).toUpperCase()}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.playerNodeName, isSelected && styles.playerNodeNameSelected]}
                    >
                      {player}
                    </Text>
                    {isSelected && (
                      <View style={styles.targetCrown}>
                        <Text style={{ fontSize: 10 }}>🎯</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Rotating Bottle Component */}
              <Animated.View
                style={[
                  styles.bottleWrapper,
                  {
                    transform: [{ rotate: bottleRotation }],
                  },
                ]}
              >
                {/* Pointer Cap */}
                <View style={styles.bottleCap}>
                  <View style={styles.pointerNeedle} />
                </View>
                {/* Bottle Neck */}
                <View style={styles.bottleNeck} />
                {/* Bottle Body */}
                <View style={styles.bottleBody}>
                  <Text style={styles.bottleBrand}>⚡ PARTY</Text>
                </View>
                {/* Bottle Base */}
                <View style={styles.bottleBase} />
              </Animated.View>
            </View>

            {/* Spin CTA Button */}
            <TouchableOpacity
              style={[styles.spinButton, isSpinning && styles.spinButtonDisabled]}
              onPress={handleSpinBottle}
              disabled={isSpinning}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={22} color="#050508" style={isSpinning ? styles.spinningIcon : null} />
              <Text style={styles.spinButtonText}>
                {isSpinning
                  ? 'SPINNING THE BOTTLE...'
                  : isDuoMode
                  ? '🍾 SPIN BETWEEN YOU TWO!'
                  : '🍾 SPIN THE BOTTLE!'}
              </Text>
            </TouchableOpacity>

            {/* Chosen Player Headline */}
            {chosenPlayerIndex !== null && (
              <View style={styles.chosenPlayerBanner}>
                <Text style={styles.chosenSubtitle}>THE BOTTLE HAS CHOSEN</Text>
                <Text style={styles.chosenPlayerTitle}>
                  🎯 {roster[chosenPlayerIndex]}
                </Text>
              </View>
            )}

            {/* Deck Selector */}
            <View style={styles.deckSelectorSection}>
              <Text style={styles.deckSelectorHeading}>SELECT SPICE LEVEL</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckRow}>
                {DECKS.map((d) => {
                  const isActive = selectedDeck === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        styles.deckChip,
                        isActive && { borderColor: d.color, backgroundColor: 'rgba(255,255,255,0.08)' },
                      ]}
                      onPress={() => {
                        setSelectedDeck(d.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={d.icon as any} size={15} color={d.color} />
                      <Text style={[styles.deckChipText, isActive && { color: d.color, fontWeight: '700' }]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Truth or Dare Trigger Buttons */}
            <View style={styles.truthDareButtonRow}>
              <TouchableOpacity
                style={styles.truthButton}
                onPress={() => handlePickCard('truth')}
                activeOpacity={0.85}
              >
                <Ionicons name="help-circle" size={20} color="#00F2FE" />
                <Text style={styles.truthButtonText}>TRUTH</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dareButton}
                onPress={() => handlePickCard('dare')}
                activeOpacity={0.85}
              >
                <Ionicons name="flame" size={20} color="#FF007F" />
                <Text style={styles.dareButtonText}>DARE</Text>
              </TouchableOpacity>
            </View>

            {/* Card Display & Timer Modal / Card */}
            {activeCard && (
              <View style={[styles.cardContainer, activeCard.type === 'dare' ? styles.cardDare : styles.cardTruth]}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.cardBadge,
                      { backgroundColor: activeCard.type === 'dare' ? 'rgba(255,0,127,0.2)' : 'rgba(0,242,254,0.2)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardBadgeText,
                        { color: activeCard.type === 'dare' ? '#FF007F' : '#00F2FE' },
                      ]}
                    >
                      {activeCard.type === 'dare' ? '🔥 SPICY DARE' : '💎 CASUAL TRUTH'}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => setActiveCard(null)}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cardPromptText}>{activeCard.text}</Text>

                {/* 30s Countdown Timer */}
                <View style={styles.timerRow}>
                  <TouchableOpacity
                    style={[styles.timerButton, isTimerRunning && styles.timerButtonRunning]}
                    onPress={() => handleStartTimer(30)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="timer-outline" size={16} color={isTimerRunning ? '#FFE600' : colors.textPrimary} />
                    <Text style={[styles.timerButtonText, isTimerRunning && { color: '#FFE600' }]}>
                      {isTimerRunning ? `⏳ ${timerSeconds}s REMAINING` : 'START 30s COUNTDOWN'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODE 2: WOULD YOU RATHER
        ══════════════════════════════════════════════════════════════════ */}
        {activeMode === 'wyr' && (
          <View style={styles.wyrContainer}>
            <View style={styles.gameRoundBar}>
              <Text style={styles.gameRoundText}>
                DILEMMA {wyrIndex + 1} OF {WOULD_YOU_RATHER_ITEMS.length}
              </Text>
              <Text style={styles.syncedTag}>{isDuoMode ? '⚡ 2-PLAYER DUEL' : '👥 SQUAD VOTE'}</Text>
            </View>

            {/* 2-Player Pass & Play HUD */}
            {isDuoMode && !isInRoom && (
              <View style={styles.duoVoteHUD}>
                <View style={styles.duoVoteCard}>
                  <Text style={styles.duoVoteName}>{player1}</Text>
                  <View style={styles.duoVoteRow}>
                    <TouchableOpacity
                      style={[styles.duoMiniPill, player1Vote === 'A' && styles.duoMiniPillA]}
                      onPress={() => handleVoteWyr('A', player1)}
                    >
                      <Text style={styles.duoMiniText}>Option A</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.duoMiniPill, player1Vote === 'B' && styles.duoMiniPillB]}
                      onPress={() => handleVoteWyr('B', player1)}
                    >
                      <Text style={styles.duoMiniText}>Option B</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.duoVoteCard}>
                  <Text style={styles.duoVoteName}>{player2}</Text>
                  <View style={styles.duoVoteRow}>
                    <TouchableOpacity
                      style={[styles.duoMiniPill, player2Vote === 'A' && styles.duoMiniPillA]}
                      onPress={() => handleVoteWyr('A', player2)}
                    >
                      <Text style={styles.duoMiniText}>Option A</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.duoMiniPill, player2Vote === 'B' && styles.duoMiniPillB]}
                      onPress={() => handleVoteWyr('B', player2)}
                    >
                      <Text style={styles.duoMiniText}>Option B</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* 2-Player Match / Rivalry Banner */}
            {isDuoMode && player1Vote && player2Vote && (
              <View style={[styles.duoResultBanner, player1Vote === player2Vote ? styles.duoMatch : styles.duoClash]}>
                <Text style={styles.duoResultText}>
                  {player1Vote === player2Vote
                    ? '💖 PERFECT MATCH! You both picked the same!'
                    : '⚡ OPPOSITES ATTRACT! You picked different choices!'}
                </Text>
              </View>
            )}

            {/* Option A Card (Cyan) */}
            <TouchableOpacity
              style={[
                styles.wyrOptionCard,
                styles.wyrCardA,
                myWyrVote === 'A' && styles.wyrCardSelectedA,
              ]}
              onPress={() => handleVoteWyr('A', myName)}
              activeOpacity={0.88}
            >
              <View style={styles.wyrCardTop}>
                <View style={[styles.optionPill, { backgroundColor: 'rgba(0, 242, 254, 0.2)' }]}>
                  <Text style={[styles.optionPillText, { color: '#00F2FE' }]}>OPTION A</Text>
                </View>
                {myWyrVote === 'A' && (
                  <View style={styles.votedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#00F2FE" />
                    <Text style={styles.votedBadgeText}>YOUR VOTE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.wyrOptionText}>{currentWyrItem.optionA}</Text>

              {/* Reveal Percentages & Voters */}
              {myWyrVote && (
                <View style={styles.wyrMeterContainer}>
                  {(() => {
                    const totalVotes = Object.keys(currentWyrVotes).length;
                    const countA = Object.values(currentWyrVotes).filter((v) => v === 'A').length;
                    const percent = totalVotes > 0 ? Math.round((countA / totalVotes) * 100) : currentWyrItem.percentA || 50;
                    return (
                      <>
                        <View style={styles.meterTrack}>
                          <View style={[styles.meterFillA, { width: `${percent}%` }]} />
                        </View>
                        <Text style={styles.percentTextA}>
                          {percent}% ({countA} of {totalVotes || 1} votes)
                        </Text>
                      </>
                    );
                  })()}
                </View>
              )}
            </TouchableOpacity>

            {/* Lightning Center Badge */}
            <View style={styles.vsBadgeContainer}>
              <View style={styles.vsBadge}>
                <Text style={styles.vsBadgeText}>⚡ OR ⚡</Text>
              </View>
            </View>

            {/* Option B Card (Pink) */}
            <TouchableOpacity
              style={[
                styles.wyrOptionCard,
                styles.wyrCardB,
                myWyrVote === 'B' && styles.wyrCardSelectedB,
              ]}
              onPress={() => handleVoteWyr('B', myName)}
              activeOpacity={0.88}
            >
              <View style={styles.wyrCardTop}>
                <View style={[styles.optionPill, { backgroundColor: 'rgba(255, 0, 127, 0.2)' }]}>
                  <Text style={[styles.optionPillText, { color: '#FF007F' }]}>OPTION B</Text>
                </View>
                {myWyrVote === 'B' && (
                  <View style={styles.votedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#FF007F" />
                    <Text style={styles.votedBadgeText}>YOUR VOTE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.wyrOptionText}>{currentWyrItem.optionB}</Text>

              {/* Reveal Percentages & Voters */}
              {myWyrVote && (
                <View style={styles.wyrMeterContainer}>
                  {(() => {
                    const totalVotes = Object.keys(currentWyrVotes).length;
                    const countB = Object.values(currentWyrVotes).filter((v) => v === 'B').length;
                    const percent = totalVotes > 0 ? Math.round((countB / totalVotes) * 100) : currentWyrItem.percentB || 50;
                    return (
                      <>
                        <View style={styles.meterTrack}>
                          <View style={[styles.meterFillB, { width: `${percent}%` }]} />
                        </View>
                        <Text style={styles.percentTextB}>
                          {percent}% ({countB} of {totalVotes || 1} votes)
                        </Text>
                      </>
                    );
                  })()}
                </View>
              )}
            </TouchableOpacity>

            {/* Navigation CTA */}
            <TouchableOpacity style={styles.nextRoundButton} onPress={handleNextWyr} activeOpacity={0.85}>
              <Text style={styles.nextRoundButtonText}>NEXT DILEMMA</Text>
              <Ionicons name="arrow-forward" size={18} color="#050508" />
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODE 3: NEVER HAVE I EVER
        ══════════════════════════════════════════════════════════════════ */}
        {activeMode === 'nhie' && (
          <View style={styles.nhieContainer}>
            {/* 2-Player Head-to-Head Duel Board */}
            {isDuoMode ? (
              <View style={styles.duoLivesContainer}>
                {/* Player 1 Card */}
                <View style={styles.duoLifeCard}>
                  <Text style={[styles.duoPlayerName, { color: '#00F2FE' }]}>{player1}</Text>
                  <View style={styles.duoHeartsRow}>
                    {[1, 2, 3, 4, 5].map((h) => {
                      const lives = playerLives[player1] ?? 5;
                      return (
                        <Text key={h} style={[styles.heartIcon, h > lives && styles.heartLost]}>
                          {h > lives ? '🖤' : '❤️'}
                        </Text>
                      );
                    })}
                  </View>
                  <Text style={styles.duoRemainingLives}>
                    {(playerLives[player1] ?? 5) > 0 ? `${playerLives[player1] ?? 5} HEARTS` : '💀 OUT!'}
                  </Text>
                  <TouchableOpacity
                    style={styles.duoIHaveBtn1}
                    onPress={() => handleLoseLifeNhie(player1)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.duoIHaveText}>I HAVE! (-1 ❤️)</Text>
                  </TouchableOpacity>
                </View>

                {/* VS divider */}
                <View style={styles.duoVsDivider}>
                  <Text style={styles.duoVsText}>VS</Text>
                </View>

                {/* Player 2 Card */}
                <View style={styles.duoLifeCard}>
                  <Text style={[styles.duoPlayerName, { color: '#FF007F' }]}>{player2}</Text>
                  <View style={styles.duoHeartsRow}>
                    {[1, 2, 3, 4, 5].map((h) => {
                      const lives = playerLives[player2] ?? 5;
                      return (
                        <Text key={h} style={[styles.heartIcon, h > lives && styles.heartLost]}>
                          {h > lives ? '🖤' : '❤️'}
                        </Text>
                      );
                    })}
                  </View>
                  <Text style={styles.duoRemainingLives}>
                    {(playerLives[player2] ?? 5) > 0 ? `${playerLives[player2] ?? 5} HEARTS` : '💀 OUT!'}
                  </Text>
                  <TouchableOpacity
                    style={styles.duoIHaveBtn2}
                    onPress={() => handleLoseLifeNhie(player2)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.duoIHaveText}>I HAVE! (-1 ❤️)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Multi-player Squad Scoreboard */
              <View style={styles.livesBoard}>
                <Text style={styles.livesBoardTitle}>SQUAD CYBER LIVES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.livesRow}>
                  {roster.map((name) => {
                    const lives = playerLives[name] ?? 5;
                    const isDead = lives <= 0;
                    return (
                      <View key={name} style={[styles.playerLifeChip, isDead && styles.playerDeadChip]}>
                        <Text style={styles.playerLifeName}>{name}</Text>
                        <View style={styles.heartsRow}>
                          {[1, 2, 3, 4, 5].map((h) => (
                            <Text key={h} style={[styles.heartIcon, h > lives && styles.heartLost]}>
                              {h > lives ? '🖤' : '❤️'}
                            </Text>
                          ))}
                        </View>
                        {isDead && <Text style={styles.deadLabel}>💀 ELIMINATED</Text>}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Prompt Statement Card */}
            <View style={styles.nhieCard}>
              <View style={styles.nhieHeader}>
                <Text style={styles.nhieSubtitle}>STATEMENT #{nhieIndex + 1}</Text>
                <Text style={styles.nhieLead}>NEVER HAVE I EVER...</Text>
              </View>

              <Text style={styles.nhieStatementText}>{currentNhieItem.statement}</Text>
            </View>

            {/* General Action Buttons */}
            <View style={styles.nhieActionsRow}>
              <TouchableOpacity
                style={styles.innocentButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  showToast('😇 Pure & Innocent!');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="heart" size={18} color="#00F2FE" />
                <Text style={styles.innocentButtonText}>WE ARE INNOCENT (NEVER)</Text>
              </TouchableOpacity>
            </View>

            {/* Controls */}
            <View style={styles.nhieBottomControls}>
              <TouchableOpacity style={styles.nhieNextButton} onPress={handleNextNhie} activeOpacity={0.85}>
                <Text style={styles.nhieNextText}>NEXT STATEMENT</Text>
                <Ionicons name="arrow-forward" size={18} color="#050508" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetButton} onPress={handleResetNhie} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                <Text style={styles.resetButtonText}>RESET ALL HEARTS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODE 4: MOST LIKELY TO...
        ══════════════════════════════════════════════════════════════════ */}
        {activeMode === 'mlt' && (
          <View style={styles.mltContainer}>
            <View style={styles.gameRoundBar}>
              <Text style={styles.gameRoundText}>
                ROUND {mltIndex + 1} OF {MOST_LIKELY_TO_ITEMS.length}
              </Text>
              <Text style={styles.syncedTag}>{isDuoMode ? '👑 2-PLAYER SHOWDOWN' : '👑 SQUAD VOTE'}</Text>
            </View>

            {/* Prompt Box */}
            <View style={styles.mltCard}>
              <Text style={styles.mltPromptLead}>WHO IS MOST LIKELY TO...</Text>
              <Text style={styles.mltPromptText}>{currentMltItem.prompt}</Text>
            </View>

            {/* Prompt Subtitle */}
            <Text style={styles.votePromptSubtitle}>
              {isDuoMode ? 'TAP WHO WOULD DO THIS:' : 'TAP A FRIEND TO CAST YOUR VOTE:'}
            </Text>

            <View style={styles.mltGrid}>
              {roster.map((player) => {
                const totalVotes = Object.keys(currentMltVotes).length;
                const playerVotes = Object.values(currentMltVotes).filter((v) => v === player).length;
                const isWinner =
                  totalVotes > 0 &&
                  playerVotes ===
                    Math.max(...roster.map((p) => Object.values(currentMltVotes).filter((v) => v === p).length));
                const isSelectedByMe = myMltVote === player;

                return (
                  <TouchableOpacity
                    key={player}
                    style={[
                      styles.mltCandidateCard,
                      isDuoMode && styles.mltCandidateCardDuo,
                      isSelectedByMe && styles.mltCandidateSelected,
                      isWinner && styles.mltCandidateWinner,
                    ]}
                    onPress={() => handleVoteMlt(player, myName)}
                    activeOpacity={0.85}
                  >
                    {isWinner && (
                      <View style={styles.crownBadge}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#050508' }}>👑 GUILTY</Text>
                      </View>
                    )}

                    <View style={styles.candidateAvatar}>
                      <Text style={styles.candidateAvatarText}>{player.charAt(0).toUpperCase()}</Text>
                    </View>

                    <Text style={styles.candidateName} numberOfLines={1}>{player}</Text>

                    <View style={styles.voteCounterPill}>
                      <Text style={styles.voteCountText}>
                        {playerVotes} {playerVotes === 1 ? 'vote' : 'votes'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.nextRoundButton} onPress={handleNextMlt} activeOpacity={0.85}>
              <Text style={styles.nextRoundButtonText}>NEXT ROUND</Text>
              <Ionicons name="arrow-forward" size={18} color="#050508" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ─── Floating Emoji Blast & Chat Bar ─────────────────────────────── */}
      <View style={styles.floatingActionBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiBlastRow}>
          {['🔥', '😂', '💀', '😱', '👏', '🍾'].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiBlastBtn}
              onPress={() => handleSendEmojiBlast(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiBlastText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.chatFabBtn}
          onPress={() => setShowChatModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#050508" />
          <Text style={styles.chatFabText}>CHAT</Text>
          {messages.length > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>{messages.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Party Live Chat Modal ───────────────────────────────────────── */}
      <Modal visible={showChatModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.chatModalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatCard}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <Ionicons name="chatbubbles" size={20} color={colors.accent} />
                <Text style={styles.chatTitle}>💬 PARTY LIVE CHAT</Text>
                {isInRoom && <Text style={styles.chatRoomTag}>#{roomId}</Text>}
              </View>
              <TouchableOpacity onPress={() => setShowChatModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Roast Buttons */}
            <View style={styles.roastChipsSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roastChipsRow}>
                {QUICK_ROASTS.map((roast) => (
                  <TouchableOpacity
                    key={roast}
                    style={styles.roastChip}
                    onPress={() => handleSendQuickRoast(roast)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.roastChipText}>{roast}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Message Feed */}
            <FlatList
              ref={chatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
              renderItem={({ item }) => {
                const isMe = item.user?.username === myName;
                return (
                  <View style={[styles.chatBubbleWrap, isMe ? styles.chatBubbleMeWrap : styles.chatBubbleOtherWrap]}>
                    {!isMe && (
                      <Text style={styles.chatSenderName}>{item.user?.username || 'Player'}</Text>
                    )}
                    <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
                      <Text style={[styles.chatMessageText, isMe ? styles.chatMessageTextMe : null]}>
                        {item.message}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.chatEmpty}>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>💬</Text>
                  <Text style={styles.chatEmptyText}>No messages yet!</Text>
                  <Text style={styles.chatEmptySub}>Drop a roast or reaction above!</Text>
                </View>
              }
            />

            {/* Chat Input Bar */}
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a roast, dare, or reaction..."
                placeholderTextColor="#64748B"
                value={chatInputText}
                onChangeText={setChatInputText}
                onSubmitEditing={handleSendChat}
              />
              <TouchableOpacity
                style={[styles.chatSendBtn, !chatInputText.trim() && { opacity: 0.5 }]}
                onPress={handleSendChat}
                disabled={!chatInputText.trim()}
              >
                <Ionicons name="send" size={18} color="#050508" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Rename Player Modal ─────────────────────────────────────────── */}
      <Modal visible={editingPlayerIndex !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ RENAME PLAYER</Text>
              <TouchableOpacity onPress={() => setEditingPlayerIndex(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter friend, partner, or teammate name:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Maya, Jordan, Alex"
              placeholderTextColor="#64748B"
              value={editingPlayerName}
              onChangeText={setEditingPlayerName}
              autoFocus
              onSubmitEditing={handleSaveRename}
            />

            <TouchableOpacity style={styles.modalPrimaryAction} onPress={handleSaveRename} activeOpacity={0.85}>
              <Text style={styles.modalPrimaryActionText}>SAVE NAME</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Join Room Modal ─────────────────────────────────────────────── */}
      <Modal visible={showJoinModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚡ CONNECT SQUAD</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Sync live with friends across phones! All bottle spins, dilemmas, chat, and votes happen in real-time.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryAction}
              onPress={() => {
                createRoom();
                setShowJoinModal(false);
                showToast('Created new squad party room!');
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={20} color="#050508" />
              <Text style={styles.modalPrimaryActionText}>HOST NEW PARTY ROOM</Text>
            </TouchableOpacity>

            <View style={styles.modalDividerRow}>
              <View style={styles.modalLine} />
              <Text style={styles.modalOrText}>OR ENTER CODE</Text>
              <View style={styles.modalLine} />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. K9X2P4"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              maxLength={6}
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
            />

            <TouchableOpacity
              style={[styles.modalSecondaryAction, !joinCodeInput.trim() && { opacity: 0.5 }]}
              onPress={handleJoinSubmit}
              disabled={!joinCodeInput.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="enter-outline" size={18} color="#00F2FE" />
              <Text style={styles.modalSecondaryActionText}>JOIN WITH CODE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Add Friend / Roster Modal ───────────────────────────────────── */}
      <Modal visible={showRosterModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👥 ADD PLAYERS TO GAME</Text>
              <TouchableOpacity onPress={() => setShowRosterModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick 1-Tap Add From Saved Squad Friends */}
            {savedFriends.length > 0 && (
              <View style={styles.savedSquadSection}>
                <Text style={styles.sectionMiniHeading}>QUICK ADD FROM YOUR SQUAD:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedFriendsRow}>
                  {savedFriends.map((f) => {
                    const alreadyIn = roster.includes(f.username);
                    return (
                      <TouchableOpacity
                        key={f.username + f.tag}
                        style={[styles.savedFriendChip, alreadyIn && styles.savedFriendChipIn]}
                        onPress={() => {
                          if (!alreadyIn) handleAddPlayer(f.username);
                        }}
                        disabled={alreadyIn}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.savedFriendText}>{f.username}</Text>
                        <Ionicons
                          name={alreadyIn ? 'checkmark-circle' : 'add-circle'}
                          size={15}
                          color={alreadyIn ? '#10B981' : colors.accent}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={styles.sectionMiniHeading}>OR TYPE ANY FRIEND NAME:</Text>
            <View style={styles.addPlayerRow}>
              <TextInput
                style={styles.addPlayerInput}
                placeholder="Friend name (e.g. Jordan, Sarah)..."
                placeholderTextColor="#64748B"
                value={newPlayerInput}
                onChangeText={setNewPlayerInput}
                onSubmitEditing={() => handleAddPlayer()}
              />
              <TouchableOpacity style={styles.addPlayerBtn} onPress={() => handleAddPlayer()}>
                <Ionicons name="add" size={22} color="#050508" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionMiniHeading}>CURRENT PLAYERS IN GAME ({roster.length}):</Text>
            <ScrollView style={{ maxHeight: 180 }}>
              {roster.map((player, idx) => (
                <View key={player + idx} style={styles.rosterItem}>
                  <View style={styles.rosterAvatar}>
                    <Text style={styles.rosterAvatarText}>{player.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.rosterItemName}>{player}</Text>

                  <View style={styles.rosterActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingPlayerIndex(idx);
                        setEditingPlayerName(player);
                      }}
                      style={{ marginRight: 10 }}
                    >
                      <Ionicons name="pencil-outline" size={18} color={colors.accent} />
                    </TouchableOpacity>

                    {player !== myName && (
                      <TouchableOpacity onPress={() => handleRemovePlayer(player)}>
                        <Ionicons name="trash-outline" size={18} color="#FF4D6D" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryAction, { marginTop: 14 }]}
              onPress={() => setShowRosterModal(false)}
            >
              <Text style={styles.modalPrimaryActionText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Anchored MiniPlayer ─────────────────────────────────────────── */}
      <MiniPlayer />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  partyNoticeBadge: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: '#00F2FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
    maxWidth: SCREEN_WIDTH - 40,
  },
  partyNoticeText: {
    color: '#050508',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  roomSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  yellowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFE600',
    marginRight: 6,
  },
  roomCodeTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomSyncText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  roomCodeHighlight: {
    color: colors.accent,
    fontWeight: '900',
  },
  memberCountBadge: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
  },
  iconButton: {
    marginLeft: 8,
    padding: 2,
  },
  iconButtonDestructive: {
    marginLeft: 6,
    padding: 2,
  },
  offlineSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offlineActions: {
    marginLeft: 8,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  connectButtonText: {
    color: '#050508',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  playerCountPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countPillActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderColor: '#00F2FE',
  },
  countPillText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  countPillTextActive: {
    color: '#00F2FE',
    fontWeight: '900',
  },
  addFriendTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE600',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
  },
  addFriendTopBtnText: {
    color: '#050508',
    fontSize: 10,
    fontWeight: '900',
  },

  duoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 18, 30, 0.8)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  duoBannerText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  duoActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renameLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  renameLinkText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  addThirdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 230, 0, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 0, 0.3)',
    gap: 2,
  },
  addThirdPillText: {
    color: '#FFE600',
    fontSize: 10,
    fontWeight: '800',
  },

  // Mode Tab Bar
  modeTabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  modeTabActiveBottle: {
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    borderColor: '#00F2FE',
  },
  modeTabActiveWyr: {
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    borderColor: '#FF007F',
  },
  modeTabActiveNhie: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: '#A855F7',
  },
  modeTabActiveMlt: {
    backgroundColor: 'rgba(255, 230, 0, 0.12)',
    borderColor: '#FFE600',
  },
  modeTabIcon: {
    fontSize: 14,
  },
  modeTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  modeTabLabelActive: {
    color: colors.textPrimary,
    fontWeight: '900',
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
  },

  // Mode 1: Bottle Styles
  bottleContainer: {
    alignItems: 'center',
  },
  turntable: {
    width: TURNTABLE_SIZE,
    height: TURNTABLE_SIZE,
    borderRadius: TURNTABLE_SIZE / 2,
    backgroundColor: 'rgba(14, 14, 23, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 242, 254, 0.2)',
  },
  turntableRingOuter: {
    position: 'absolute',
    width: TURNTABLE_SIZE - 20,
    height: TURNTABLE_SIZE - 20,
    borderRadius: (TURNTABLE_SIZE - 20) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
  },
  turntableRingInner: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 242, 254, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
  },
  playerNode: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E2F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  duoNode1: {
    borderColor: '#00F2FE',
  },
  duoNode2: {
    borderColor: '#FF007F',
  },
  playerNodeSelected: {
    borderColor: '#FFE600',
    backgroundColor: '#332E00',
    shadowColor: '#FFE600',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    transform: [{ scale: 1.15 }],
  },
  playerAvatarLetter: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 14,
  },
  playerNodeName: {
    position: 'absolute',
    bottom: -15,
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 65,
    textAlign: 'center',
  },
  playerNodeNameSelected: {
    color: '#FFE600',
    fontWeight: '900',
  },
  targetCrown: {
    position: 'absolute',
    top: -12,
  },

  // Bottle Graphic
  bottleWrapper: {
    width: 36,
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFE600',
    marginBottom: 2,
  },
  bottleCap: {
    width: 14,
    height: 12,
    backgroundColor: '#FFE600',
    borderRadius: 3,
    alignItems: 'center',
  },
  bottleNeck: {
    width: 11,
    height: 28,
    backgroundColor: 'rgba(0, 242, 254, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottleBody: {
    width: 34,
    height: 56,
    backgroundColor: 'rgba(0, 180, 216, 0.85)',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottleBrand: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bottleBase: {
    width: 30,
    height: 8,
    backgroundColor: 'rgba(0, 150, 180, 0.95)',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },

  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    width: '100%',
    marginTop: 6,
  },
  spinButtonDisabled: {
    opacity: 0.7,
  },
  spinningIcon: {
    transform: [{ rotate: '45deg' }],
  },
  spinButtonText: {
    color: '#050508',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  chosenPlayerBanner: {
    marginTop: 14,
    alignItems: 'center',
  },
  chosenSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  chosenPlayerTitle: {
    color: '#FFE600',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  deckSelectorSection: {
    width: '100%',
    marginTop: 14,
  },
  deckSelectorHeading: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  deckRow: {
    gap: 8,
    paddingBottom: 4,
  },
  deckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  deckChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  truthDareButtonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  truthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    borderWidth: 1.5,
    borderColor: '#00F2FE',
    borderRadius: 18,
    paddingVertical: 14,
    gap: 8,
  },
  truthButtonText: {
    color: '#00F2FE',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
  dareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    borderWidth: 1.5,
    borderColor: '#FF007F',
    borderRadius: 18,
    paddingVertical: 14,
    gap: 8,
  },
  dareButtonText: {
    color: '#FF007F',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },

  cardContainer: {
    width: '100%',
    backgroundColor: '#12121E',
    borderRadius: 20,
    padding: spacing.lg,
    marginTop: 16,
    borderWidth: 1.5,
  },
  cardTruth: {
    borderColor: 'rgba(0, 242, 254, 0.5)',
    shadowColor: '#00F2FE',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  cardDare: {
    borderColor: 'rgba(255, 0, 127, 0.5)',
    shadowColor: '#FF007F',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardBadgeText: {
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardPromptText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 16,
  },
  timerRow: {
    width: '100%',
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  timerButtonRunning: {
    backgroundColor: 'rgba(255, 230, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFE600',
  },
  timerButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },

  // Mode 2: Would You Rather
  wyrContainer: {
    width: '100%',
  },
  gameRoundBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gameRoundText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  syncedTag: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },

  duoVoteHUD: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  duoVoteCard: {
    flex: 1,
    backgroundColor: '#10101C',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  duoVoteName: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  duoVoteRow: {
    flexDirection: 'row',
    gap: 4,
  },
  duoMiniPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  duoMiniPillA: {
    backgroundColor: 'rgba(0, 242, 254, 0.25)',
    borderWidth: 1,
    borderColor: '#00F2FE',
  },
  duoMiniPillB: {
    backgroundColor: 'rgba(255, 0, 127, 0.25)',
    borderWidth: 1,
    borderColor: '#FF007F',
  },
  duoMiniText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '700',
  },

  duoResultBanner: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  duoMatch: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  duoClash: {
    backgroundColor: 'rgba(255, 77, 109, 0.15)',
    borderWidth: 1,
    borderColor: '#FF4D6D',
  },
  duoResultText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  wyrOptionCard: {
    backgroundColor: '#12121E',
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1.5,
  },
  wyrCardA: {
    borderColor: 'rgba(0, 242, 254, 0.4)',
  },
  wyrCardSelectedA: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
  },
  wyrCardB: {
    borderColor: 'rgba(255, 0, 127, 0.4)',
  },
  wyrCardSelectedB: {
    borderColor: '#FF007F',
    backgroundColor: 'rgba(255, 0, 127, 0.1)',
  },
  wyrCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  optionPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  votedBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
  wyrOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  wyrMeterContainer: {
    marginTop: 14,
  },
  meterTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFillA: {
    height: '100%',
    backgroundColor: '#00F2FE',
    borderRadius: 4,
  },
  meterFillB: {
    height: '100%',
    backgroundColor: '#FF007F',
    borderRadius: 4,
  },
  percentTextA: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  percentTextB: {
    color: '#FF007F',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  vsBadgeContainer: {
    alignItems: 'center',
    marginVertical: -8,
    zIndex: 10,
  },
  vsBadge: {
    backgroundColor: '#050508',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  vsBadgeText: {
    color: '#FFE600',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  nextRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 14,
    marginTop: 18,
    gap: 6,
  },
  nextRoundButtonText: {
    color: '#050508',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Mode 3: Never Have I Ever
  nhieContainer: {
    width: '100%',
  },
  duoLivesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  duoLifeCard: {
    flex: 1,
    backgroundColor: '#10101C',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  duoPlayerName: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  duoHeartsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  duoRemainingLives: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 8,
  },
  duoIHaveBtn1: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderWidth: 1,
    borderColor: '#00F2FE',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '100%',
    alignItems: 'center',
  },
  duoIHaveBtn2: {
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    borderWidth: 1,
    borderColor: '#FF007F',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '100%',
    alignItems: 'center',
  },
  duoIHaveText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
  },
  duoVsDivider: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#050508',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  duoVsText: {
    color: '#FFE600',
    fontSize: 10,
    fontWeight: '900',
  },

  livesBoard: {
    backgroundColor: '#10101C',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  livesBoardTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  livesRow: {
    gap: 8,
  },
  playerLifeChip: {
    backgroundColor: '#1E1E2F',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerDeadChip: {
    borderColor: '#FF4D6D',
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
  },
  playerLifeName: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  heartIcon: {
    fontSize: 12,
  },
  heartLost: {
    opacity: 0.3,
  },
  deadLabel: {
    color: '#FF4D6D',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
  },

  nhieCard: {
    backgroundColor: '#12121E',
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    marginVertical: 10,
  },
  nhieHeader: {
    marginBottom: 10,
  },
  nhieSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nhieLead: {
    color: '#A855F7',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  nhieStatementText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 25,
  },
  nhieActionsRow: {
    marginTop: 6,
  },
  innocentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#00F2FE',
    gap: 6,
  },
  innocentButtonText: {
    color: '#00F2FE',
    fontSize: 12,
    fontWeight: '900',
  },
  nhieBottomControls: {
    marginTop: 14,
    gap: 10,
  },
  nhieNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 14,
    gap: 6,
  },
  nhieNextText: {
    color: '#050508',
    fontSize: 13,
    fontWeight: '900',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  resetButtonText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  // Mode 4: Most Likely To
  mltContainer: {
    width: '100%',
  },
  mltCard: {
    backgroundColor: '#12121E',
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 230, 0, 0.4)',
    marginVertical: 10,
  },
  mltPromptLead: {
    color: '#FFE600',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  mltPromptText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  votePromptSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginVertical: 10,
  },
  mltGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mltCandidateCard: {
    width: (SCREEN_WIDTH - 48 - 10) / 2,
    backgroundColor: '#10101C',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  mltCandidateCardDuo: {
    width: (SCREEN_WIDTH - 48 - 10) / 2,
    paddingVertical: 20,
  },
  mltCandidateSelected: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
  },
  mltCandidateWinner: {
    borderColor: '#FFE600',
    backgroundColor: 'rgba(255, 230, 0, 0.08)',
  },
  crownBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#FFE600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  candidateAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  candidateAvatarText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 17,
  },
  candidateName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  voteCounterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  voteCountText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },

  // Floating Action Bar (Emoji Blast & Chat)
  floatingActionBar: {
    position: 'absolute',
    bottom: 84, // right above MiniPlayer
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 14, 23, 0.95)',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 90,
  },
  emojiBlastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
  },
  emojiBlastBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBlastText: {
    fontSize: 18,
  },
  chatFabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 5,
    marginLeft: 'auto',
  },
  chatFabText: {
    color: '#050508',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  chatBadge: {
    backgroundColor: '#FF007F',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // Chat Sheet Modal
  chatModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  chatCard: {
    height: '75%',
    backgroundColor: '#0E0E17',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chatRoomTag: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  roastChipsSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  roastChipsRow: {
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  roastChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roastChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 8,
  },
  chatBubbleWrap: {
    maxWidth: '80%',
    marginVertical: 2,
  },
  chatBubbleMeWrap: {
    alignSelf: 'flex-end',
  },
  chatBubbleOtherWrap: {
    alignSelf: 'flex-start',
  },
  chatSenderName: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 4,
  },
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chatBubbleMe: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  chatBubbleOther: {
    backgroundColor: '#1E1E2F',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatMessageText: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  chatMessageTextMe: {
    color: '#050508',
    fontWeight: '700',
  },
  chatEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  chatEmptyText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  chatEmptySub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#090912',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#151424',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modals General
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0E0E17',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 13,
    gap: 8,
  },
  modalPrimaryActionText: {
    color: '#050508',
    fontWeight: '900',
    fontSize: 13,
  },
  modalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
  },
  modalLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOrText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  modalInput: {
    backgroundColor: '#151424',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  modalSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#00F2FE',
    gap: 6,
  },
  modalSecondaryActionText: {
    color: '#00F2FE',
    fontWeight: '900',
    fontSize: 13,
  },

  // Add Players Modal Specifics
  sectionMiniHeading: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  savedSquadSection: {
    marginBottom: 6,
  },
  savedFriendsRow: {
    gap: 6,
    paddingBottom: 4,
  },
  savedFriendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    gap: 5,
  },
  savedFriendChipIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  savedFriendText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  addPlayerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  addPlayerInput: {
    flex: 1,
    backgroundColor: '#151424',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addPlayerBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 8,
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  rosterAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rosterAvatarText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 12,
  },
  rosterItemName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  rosterActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
