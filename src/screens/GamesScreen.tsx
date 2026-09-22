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
  Keyboard,
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
const TURNTABLE_SIZE = Math.min(SCREEN_WIDTH - 48, 280);
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
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  // Party Chat State
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const chatListRef = useRef<FlatList<JamChatMessage> | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const handleAddPlayerSubmit = (nameToAdd?: string) => {
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
    setShowAddFriendModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(`Added ${name} to game!`);
  };

  const handleRemovePlayer = (name: string) => {
    if (roster.length <= 2) {
      showToast('Minimum 2 players needed for game');
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

      {/* ─── Room Connection & Top Chat Header ───────────────────────────── */}
      <View style={styles.header}>
        {isInRoom ? (
          <View style={styles.roomSyncPill}>
            <View style={styles.onlineDot} />
            <TouchableOpacity onPress={handleCopyRoom} activeOpacity={0.7} style={styles.roomCodeTouch}>
              <Text style={styles.roomSyncText}>
                ROOM <Text style={styles.roomCodeHighlight}>#{roomId}</Text>
              </Text>
              <Text style={styles.memberCountBadge}>{memberCount || 1} online</Text>
              <Ionicons name="copy-outline" size={13} color={colors.accent} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShareRoom} style={styles.iconButton}>
              <Ionicons name="share-social-outline" size={16} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity onPress={leaveRoom} style={styles.iconButtonDestructive}>
              <Ionicons name="close" size={16} color="#FF4D6D" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.offlineSyncRow}>
            <View style={styles.yellowDot} />
            <Text style={styles.offlineTitle}>PASS & PLAY</Text>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => setShowJoinModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={12} color="#050508" />
              <Text style={styles.connectButtonText}>CONNECT ONLINE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Top-Right Party Chat Button (ALWAYS VISIBLE & NEVER COVERED BY TABS) */}
        <TouchableOpacity
          style={styles.topChatButton}
          onPress={() => setShowChatModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color="#00F2FE" />
          <Text style={styles.topChatButtonText}>CHAT</Text>
          {messages.length > 0 && (
            <View style={styles.topChatBadge}>
              <Text style={styles.topChatBadgeText}>{messages.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Clear & Simple Player Strip Right Below Header ───────────────── */}
      <View style={styles.playerStrip}>
        <View style={styles.playerStripHeader}>
          <Text style={styles.playerStripTitle}>
            PLAYERS IN GAME ({roster.length}):
          </Text>
          <Text style={styles.playerStripHint}>Tap name to edit</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playerChipsRow}
        >
          {roster.map((player, idx) => {
            const isMe = idx === 0;
            return (
              <View
                key={player + idx}
                style={[styles.playerChip, isMe ? styles.playerChipMe : styles.playerChipFriend]}
              >
                <View style={styles.playerChipAvatar}>
                  <Text style={styles.playerChipAvatarText}>
                    {player.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setEditingPlayerIndex(idx);
                    setEditingPlayerName(player);
                  }}
                  style={styles.playerChipNameWrap}
                  activeOpacity={0.7}
                >
                  <Text style={styles.playerChipName} numberOfLines={1}>
                    {player}
                  </Text>
                  <Ionicons name="pencil" size={10} color={colors.textSecondary} style={{ marginLeft: 3 }} />
                </TouchableOpacity>

                {roster.length > 2 && !isMe && (
                  <TouchableOpacity
                    onPress={() => handleRemovePlayer(player)}
                    style={styles.playerChipRemove}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={14} color="#FF4D6D" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Prominent Glowing Add Friend Chip */}
          <TouchableOpacity
            style={styles.addFriendChip}
            onPress={() => setShowAddFriendModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={14} color="#050508" />
            <Text style={styles.addFriendChipText}>+ ADD FRIEND</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

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

      {/* ─── In-Line Quick Emoji Blast Strip (Never Covered By Tabs) ─────── */}
      <View style={styles.emojiStripRow}>
        <Text style={styles.emojiStripLabel}>BLAST:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiStripContent}>
          {['🔥', '😂', '💀', '😱', '👏', '🍾'].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiStripBtn}
              onPress={() => handleSendEmojiBlast(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiStripText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ─── Main Game Canvas ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
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
            <View
              style={[
                styles.chatInputRow,
                {
                  paddingBottom: isKeyboardVisible
                    ? 12
                    : Math.max((insets.bottom || 0) + 16, Platform.OS === 'android' ? 64 : 32),
                },
              ]}
            >
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

      {/* ─── Add Friend Simple Modal ─────────────────────────────────────── */}
      <Modal visible={showAddFriendModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👥 ADD FRIEND TO GAME</Text>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter friend's name to give them a seat in the game:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Friend name (e.g. Alex, Jordan, Sarah)..."
              placeholderTextColor="#64748B"
              value={newPlayerInput}
              onChangeText={setNewPlayerInput}
              autoFocus
              onSubmitEditing={() => handleAddPlayerSubmit()}
            />

            <TouchableOpacity
              style={[styles.modalPrimaryAction, !newPlayerInput.trim() && { opacity: 0.5 }]}
              onPress={() => handleAddPlayerSubmit()}
              disabled={!newPlayerInput.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add" size={18} color="#050508" />
              <Text style={styles.modalPrimaryActionText}>ADD TO GAME</Text>
            </TouchableOpacity>

            {/* 1-Tap Quick Add from Squad */}
            {savedFriends.length > 0 && (
              <View style={styles.squadQuickAddWrap}>
                <Text style={styles.sectionMiniHeading}>OR 1-TAP FROM SAVED SQUAD:</Text>
                <View style={styles.squadPillRow}>
                  {savedFriends.map((f) => {
                    const alreadyIn = roster.includes(f.username);
                    return (
                      <TouchableOpacity
                        key={f.username + f.tag}
                        style={[styles.squadPill, alreadyIn && styles.squadPillDisabled]}
                        onPress={() => {
                          if (!alreadyIn) handleAddPlayerSubmit(f.username);
                        }}
                        disabled={alreadyIn}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.squadPillText}>{f.username}</Text>
                        <Ionicons
                          name={alreadyIn ? 'checkmark-circle' : 'add-circle'}
                          size={14}
                          color={alreadyIn ? '#10B981' : colors.accent}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
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

  // Header Row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  roomSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  yellowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFE600',
    marginRight: 5,
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
    marginLeft: 5,
  },
  iconButton: {
    marginLeft: 6,
    padding: 2,
  },
  iconButtonDestructive: {
    marginLeft: 4,
    padding: 2,
  },
  offlineSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
    marginLeft: 8,
  },
  connectButtonText: {
    color: '#050508',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Top-Right Chat Button
  topChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#00F2FE',
    gap: 4,
  },
  topChatButtonText: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topChatBadge: {
    backgroundColor: '#FF007F',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 2,
  },
  topChatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // Player Strip Below Header
  playerStrip: {
    backgroundColor: 'rgba(18, 18, 30, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  playerStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  playerStripTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  playerStripHint: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  playerChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2F',
    borderRadius: 16,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerChipMe: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
  },
  playerChipFriend: {
    borderColor: '#FF007F',
    backgroundColor: 'rgba(255, 0, 127, 0.08)',
  },
  playerChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  playerChipAvatarText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 10,
  },
  playerChipNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 90,
  },
  playerChipName: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  playerChipRemove: {
    marginLeft: 6,
    padding: 1,
  },
  addFriendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE600',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 5,
    shadowColor: '#FFE600',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  addFriendChipText: {
    color: '#050508',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Game Mode Tabs
  modeTabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: 5,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 3,
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
    fontSize: 13,
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

  // Emoji Strip Row
  emojiStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  emojiStripLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    marginRight: 6,
    letterSpacing: 0.5,
  },
  emojiStripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emojiStripBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emojiStripText: {
    fontSize: 15,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
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
    marginVertical: 10,
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
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: 'rgba(0, 242, 254, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
  },
  playerNode: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
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
    fontSize: 13,
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
    width: 34,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFE600',
    marginBottom: 2,
  },
  bottleCap: {
    width: 13,
    height: 11,
    backgroundColor: '#FFE600',
    borderRadius: 3,
    alignItems: 'center',
  },
  bottleNeck: {
    width: 10,
    height: 26,
    backgroundColor: 'rgba(0, 242, 254, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottleBody: {
    width: 32,
    height: 52,
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
    width: 28,
    height: 7,
    backgroundColor: 'rgba(0, 150, 180, 0.95)',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },

  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    width: '100%',
    marginTop: 4,
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
    fontSize: 13,
    letterSpacing: 0.5,
  },

  chosenPlayerBanner: {
    marginTop: 12,
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
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  deckSelectorSection: {
    width: '100%',
    marginTop: 12,
  },
  deckSelectorHeading: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  deckRow: {
    gap: 7,
    paddingBottom: 4,
  },
  deckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 5,
  },
  deckChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  truthDareButtonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  truthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    borderWidth: 1.5,
    borderColor: '#00F2FE',
    borderRadius: 16,
    paddingVertical: 13,
    gap: 7,
  },
  truthButtonText: {
    color: '#00F2FE',
    fontWeight: '900',
    fontSize: 14,
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
    borderRadius: 16,
    paddingVertical: 13,
    gap: 7,
  },
  dareButtonText: {
    color: '#FF007F',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },

  cardContainer: {
    width: '100%',
    backgroundColor: '#12121E',
    borderRadius: 18,
    padding: spacing.lg,
    marginTop: 14,
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
    marginBottom: 10,
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
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 14,
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
    paddingVertical: 9,
    gap: 6,
  },
  timerButtonRunning: {
    backgroundColor: 'rgba(255, 230, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFE600',
  },
  timerButtonText: {
    color: colors.textPrimary,
    fontSize: 11,
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
    marginBottom: 10,
  },
  duoVoteCard: {
    flex: 1,
    backgroundColor: '#10101C',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  duoVoteName: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
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
    padding: 9,
    borderRadius: 12,
    marginBottom: 10,
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
    borderRadius: 16,
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
    marginBottom: 8,
  },
  optionPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  optionPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  votedBadgeText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
  },
  wyrOptionText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  wyrMeterContainer: {
    marginTop: 12,
  },
  meterTrack: {
    height: 7,
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
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  vsBadgeText: {
    color: '#FFE600',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  nextRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 13,
    marginTop: 16,
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
    marginBottom: 12,
    gap: 6,
  },
  duoLifeCard: {
    flex: 1,
    backgroundColor: '#10101C',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  duoPlayerName: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
  },
  duoHeartsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 3,
  },
  duoRemainingLives: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 6,
  },
  duoIHaveBtn1: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderWidth: 1,
    borderColor: '#00F2FE',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    width: '100%',
    alignItems: 'center',
  },
  duoIHaveBtn2: {
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    borderWidth: 1,
    borderColor: '#FF007F',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    width: '100%',
    alignItems: 'center',
  },
  duoIHaveText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
  duoVsDivider: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#050508',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  duoVsText: {
    color: '#FFE600',
    fontSize: 9,
    fontWeight: '900',
  },

  livesBoard: {
    backgroundColor: '#10101C',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  livesBoardTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  livesRow: {
    gap: 6,
  },
  playerLifeChip: {
    backgroundColor: '#1E1E2F',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
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
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  heartIcon: {
    fontSize: 11,
  },
  heartLost: {
    opacity: 0.3,
  },
  deadLabel: {
    color: '#FF4D6D',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },

  nhieCard: {
    backgroundColor: '#12121E',
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    marginVertical: 8,
  },
  nhieHeader: {
    marginBottom: 8,
  },
  nhieSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nhieLead: {
    color: '#A855F7',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  nhieStatementText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  nhieActionsRow: {
    marginTop: 4,
  },
  innocentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderRadius: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#00F2FE',
    gap: 6,
  },
  innocentButtonText: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: '900',
  },
  nhieBottomControls: {
    marginTop: 12,
    gap: 8,
  },
  nhieNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 13,
    gap: 6,
  },
  nhieNextText: {
    color: '#050508',
    fontSize: 12,
    fontWeight: '900',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  resetButtonText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  // Mode 4: Most Likely To
  mltContainer: {
    width: '100%',
  },
  mltCard: {
    backgroundColor: '#12121E',
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 230, 0, 0.4)',
    marginVertical: 8,
  },
  mltPromptLead: {
    color: '#FFE600',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  mltPromptText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  votePromptSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginVertical: 8,
  },
  mltGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mltCandidateCard: {
    width: (SCREEN_WIDTH - 48 - 8) / 2,
    backgroundColor: '#10101C',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  mltCandidateCardDuo: {
    width: (SCREEN_WIDTH - 48 - 8) / 2,
    paddingVertical: 18,
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
    top: -9,
    backgroundColor: '#FFE600',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
  },
  candidateAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
  },
  candidateAvatarText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 15,
  },
  candidateName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  voteCounterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  voteCountText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    paddingVertical: 12,
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
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chatRoomTag: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  roastChipsSection: {
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  roastChipsRow: {
    paddingHorizontal: spacing.md,
    gap: 5,
  },
  roastChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 9,
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
    paddingVertical: 10,
    gap: 7,
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
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 3,
  },
  chatBubble: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 15,
  },
  chatBubbleMe: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 3,
  },
  chatBubbleOther: {
    backgroundColor: '#1E1E2F',
    borderBottomLeftRadius: 3,
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
    paddingVertical: 35,
  },
  chatEmptyText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  chatEmptySub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#090912',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#151424',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 22,
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
    marginBottom: 12,
  },
  modalPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 7,
  },
  modalPrimaryActionText: {
    color: '#050508',
    fontWeight: '900',
    fontSize: 13,
  },
  modalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 7,
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
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  modalSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#00F2FE',
    gap: 6,
  },
  modalSecondaryActionText: {
    color: '#00F2FE',
    fontWeight: '900',
    fontSize: 13,
  },

  // 1-Tap Squad Quick Add In Modal
  squadQuickAddWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionMiniHeading: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  squadPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  squadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    gap: 5,
  },
  squadPillDisabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    opacity: 0.6,
  },
  squadPillText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
