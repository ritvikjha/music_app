import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
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
import { SpotifyTouchable } from '../components/SpotifyTouchable';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import {
  DECKS,
  TRUTH_OR_DARE_ITEMS,
  WOULD_YOU_RATHER_ITEMS,
  NEVER_HAVE_I_EVER_ITEMS,
  MOST_LIKELY_TO_ITEMS,
  getNextTruthOrDareItem,
  getNextNonRepeatingIndex,
} from '../data/partyGamesData';
import { RoomHeader } from '../components/games/RoomHeader';
import { GameHub } from '../components/games/GameHub';
import { BottleSpinGame } from '../components/games/BottleSpinGame';
import { WouldYouRatherGame } from '../components/games/WouldYouRatherGame';
import { NeverHaveIEverGame } from '../components/games/NeverHaveIEverGame';
import { MostLikelyToGame } from '../components/games/MostLikelyToGame';
import { WordDuelGame } from '../components/games/WordDuelGame';
import { TwoTruthsLieGame } from '../components/games/TwoTruthsLieGame';
import { TriviaDuelGame } from '../components/games/TriviaDuelGame';
import type {
  PartyGameMode,
  TruthOrDareDeck,
  TruthOrDareItem,
  PartyGameEvent,
  Friend,
  JamChatMessage,
  OnlineDuelState,
  OnlineDuelType,
  TriviaDuelSettings,
} from '../types';

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

interface GameErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface GameErrorBoundaryState {
  hasError: boolean;
}

class GameErrorBoundary extends React.Component<
  GameErrorBoundaryProps,
  GameErrorBoundaryState
> {
  constructor(props: GameErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[GameErrorBoundary] Caught render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Ionicons name="alert-circle" size={36} color={colors.accent} />
          <Text style={errorStyles.title}>Could Not Load Game</Text>
          <Text style={errorStyles.desc}>
            An unexpected error occurred while rendering this game mode.
          </Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            activeOpacity={0.85}
          >
            <Text style={errorStyles.buttonText}>RETURN TO GAME HUB</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderNeon,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.extrabold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
});

export default function GamesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    isInRoom,
    roomId,
    memberCount,
    isConnected,
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

  // Active game mode: defaults to landing GameHub
  const [activeMode, setActiveMode] = useState<PartyGameMode>('hub');
  const [onlineDuel, setOnlineDuel] = useState<OnlineDuelState | null>(null);
  const [pendingOnlineGame, setPendingOnlineGame] = useState<OnlineDuelType | null>(null);
  const [pendingTriviaSettings, setPendingTriviaSettings] = useState<TriviaDuelSettings>({ category: 'Any topic', difficulty: 'easy' });

  useEffect(() => {
    const offState = syncManager.onDuelState((state) => {
      setOnlineDuel(state);
      if (state) setActiveMode(state.type);
    });
    const offError = syncManager.onDuelError((message) => {
      setPendingOnlineGame(null);
      showToast(message, 'error');
    });
    return () => { offState(); offError(); };
  }, [showToast]);

  useEffect(() => {
    if (!isInRoom) {
      setOnlineDuel(null);
      setPendingOnlineGame(null);
    }
  }, [isInRoom]);

  useEffect(() => {
    if (!pendingOnlineGame || !isInRoom || !isConnected || memberCount < 2) return;
    if (memberCount > 2) {
      setPendingOnlineGame(null);
      showToast('A 1v1 room needs exactly two people. Create a new room for this game.', 'error');
      return;
    }
    syncManager.startOnlineDuel(pendingOnlineGame, pendingOnlineGame === 'trivia_duel' ? pendingTriviaSettings : undefined);
    setPendingOnlineGame(null);
  }, [pendingOnlineGame, pendingTriviaSettings, isInRoom, isConnected, memberCount, showToast]);

  const playOnline = useCallback((type: OnlineDuelType, settings?: TriviaDuelSettings) => {
    if (!isInRoom) {
      setPendingOnlineGame(type);
      if (settings) setPendingTriviaSettings(settings);
      setShowJoinModal(true);
      showToast('Create a room or join your friend to play online.', 'info');
      return;
    }
    if (memberCount > 2) {
      showToast('A 1v1 game needs a room with exactly two people.', 'error');
      return;
    }
    if (!isConnected) {
      setPendingOnlineGame(type);
      if (settings) setPendingTriviaSettings(settings);
      showToast('Connecting to the game room… try again in a moment.', 'info');
      return;
    }
    if (memberCount < 2) {
      setPendingOnlineGame(type);
      if (settings) setPendingTriviaSettings(settings);
      showToast('Share the room code. The game starts when your friend joins.', 'info');
      return;
    }
    syncManager.startOnlineDuel(type, settings);
  }, [isInRoom, memberCount, isConnected, showToast]);

  // Squad / Players roster — DEFAULT TO 2 PLAYERS
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
  const [selectedDeck, setSelectedDeck] = useState<TruthOrDareDeck>('normal');
  const [isSpinning, setIsSpinning] = useState(false);
  const [chosenPlayerIndex, setChosenPlayerIndex] = useState<number | null>(null);
  const [activeCard, setActiveCard] = useState<TruthOrDareItem | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [usedTruthOrDareIds, setUsedTruthOrDareIds] = useState<string[]>([]);

  // Bottle rotation animation
  const bottleAngleAnim = useRef(new Animated.Value(0)).current;
  const currentAngleRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Mode 2: Would You Rather State ─────────────────────────────────────────
  const [wyrIndex, setWyrIndex] = useState(0);
  const [seenWyrIndices, setSeenWyrIndices] = useState<number[]>([0]);
  const [wyrVotes, setWyrVotes] = useState<{ [itemId: string]: { [username: string]: 'A' | 'B' } }>({});

  // ─── Mode 3: Never Have I Ever State ────────────────────────────────────────
  const [nhieIndex, setNhieIndex] = useState(0);
  const [seenNhieIndices, setSeenNhieIndices] = useState<number[]>([0]);
  const [playerLives, setPlayerLives] = useState<{ [username: string]: number }>({
    [myName]: 5,
    'Player 2': 5,
  });

  // ─── Mode 4: Most Likely To State ───────────────────────────────────────────
  const [mltIndex, setMltIndex] = useState(0);
  const [seenMltIndices, setSeenMltIndices] = useState<number[]>([0]);
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedFriends(parsed);
          setRoster((prev) => [prev[0] || myName, parsed[0].username]);
          setPlayerLives((prev) => ({
            ...prev,
            [myName]: prev[myName] ?? 5,
            [parsed[0].username]: 5,
          }));
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
          setChosenPlayerIndex(null);
          triggerPartyNotice(`🍾 ${event.spinnerName} spun the bottle!`);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          currentAngleRef.current = event.targetAngle;

          Animated.timing(bottleAngleAnim, {
            toValue: event.targetAngle,
            duration: event.durationMs || 3400,
            easing: Easing.bezier(0.12, 0.8, 0.32, 1.0),
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
          setSelectedDeck(event.deck as TruthOrDareDeck);
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
    setChosenPlayerIndex(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const targetPlayerIndex = Math.floor(Math.random() * roster.length);
    const arcDegrees = 360 / roster.length;
    const playerAngle = targetPlayerIndex * arcDegrees;

    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const currentAngle = currentAngleRef.current;
    const currentMod = currentAngle % 360;
    let diff = playerAngle - currentMod;
    if (diff <= 0) diff += 360;

    const finalAngle = currentAngle + extraSpins + diff;
    currentAngleRef.current = finalAngle;
    const duration = 3400;

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'bottle_spin',
        targetAngle: finalAngle,
        durationMs: duration,
        spinnerName: myName,
        chosenPlayerIndex: targetPlayerIndex,
      });
    }

    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      if (tickCount < 18) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        clearInterval(tickInterval);
      }
    }, 160);

    Animated.timing(bottleAngleAnim, {
      toValue: finalAngle,
      duration,
      easing: Easing.bezier(0.12, 0.8, 0.32, 1.0),
      useNativeDriver: true,
    }).start(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setChosenPlayerIndex(targetPlayerIndex);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  // Pick Truth or Dare with No-Repeat Engine
  const handlePickCard = (type: 'truth' | 'dare') => {
    const { item, nextUsedIds } = getNextTruthOrDareItem(
      selectedDeck,
      type,
      usedTruthOrDareIds
    );
    setUsedTruthOrDareIds(nextUsedIds);
    setActiveCard(item);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'bottle_select_card',
        item,
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

  const handleVoteWyr = (option: 'A' | 'B', voterName = myName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const currentItemVotes = wyrVotes[currentWyrItem.id] || {};
    const updated = {
      ...currentItemVotes,
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
    const { nextIndex, nextSeenIndices } = getNextNonRepeatingIndex(
      wyrIndex,
      WOULD_YOU_RATHER_ITEMS.length,
      seenWyrIndices
    );
    setSeenWyrIndices(nextSeenIndices);
    setWyrIndex(nextIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'wyr_next',
        itemIndex: nextIndex,
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
    const { nextIndex, nextSeenIndices } = getNextNonRepeatingIndex(
      nhieIndex,
      NEVER_HAVE_I_EVER_ITEMS.length,
      seenNhieIndices
    );
    setSeenNhieIndices(nextSeenIndices);
    setNhieIndex(nextIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'nhie_next',
        itemIndex: nextIndex,
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

  const handleVoteMlt = (votedFor: string, voterName = myName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const currentItemVotes = mltVotes[currentMltItem.id] || {};
    const updated = {
      ...currentItemVotes,
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
    const { nextIndex, nextSeenIndices } = getNextNonRepeatingIndex(
      mltIndex,
      MOST_LIKELY_TO_ITEMS.length,
      seenMltIndices
    );
    setSeenMltIndices(nextSeenIndices);
    setMltIndex(nextIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isInRoom) {
      syncManager.sendGameEvent({
        type: 'mlt_next',
        itemIndex: nextIndex,
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
      const inviteLink = `jam://room/${roomId}`;
      await Share.share({
        message: `🎮 Join our Squad Hangout Party on Jam Music!\n\nRoom Code: ${roomId}\n1-Tap Join: ${inviteLink}`,
        url: inviteLink,
        title: `Squad Room #${roomId} Invite`,
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

  // Interpolated Bottle Rotation
  const bottleRotation = bottleAngleAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  return (
    <View style={styles.container}>
      {/* ─── Party Notice Overlay ────────────────────────────────────────── */}
      {partyNotice && (
        <View style={[styles.partyNoticeBadge, { top: insets.top + 8 }]}>
          <Text style={styles.partyNoticeText}>{partyNotice}</Text>
        </View>
      )}

      {/* ─── Collapsible Room / Sync Header ──────────────────────────────── */}
      <RoomHeader
        isInRoom={isInRoom}
        roomId={roomId}
        memberCount={memberCount}
        roster={roster}
        myName={myName}
        messagesCount={messages.length}
        onCopyRoom={handleCopyRoom}
        onShareRoom={handleShareRoom}
        onLeaveRoom={leaveRoom}
        onConnectOnline={() => setShowJoinModal(true)}
        onOpenChat={() => setShowChatModal(true)}
        onAddPlayer={() => setShowAddFriendModal(true)}
        onRenamePlayer={(idx, name) => {
          setEditingPlayerIndex(idx);
          setEditingPlayerName(name);
        }}
        onRemovePlayer={handleRemovePlayer}
        onSendEmojiBlast={handleSendEmojiBlast}
      />

      {/* ─── Main Game Canvas ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GameErrorBoundary onReset={() => setActiveMode('hub')}>
          {activeMode === 'hub' && (
            <GameHub
              onSelectGame={(mode) => {
                setActiveMode(mode);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              isInRoom={isInRoom}
              roomMemberCount={memberCount}
              onConnectOnline={() => isInRoom ? handleShareRoom() : setShowJoinModal(true)}
            />
          )}

          {activeMode === 'bottle' && (
            <BottleSpinGame
              roster={roster}
              isSpinning={isSpinning}
              chosenPlayerIndex={chosenPlayerIndex}
              selectedDeck={selectedDeck}
              activeCard={activeCard}
              timerSeconds={timerSeconds}
              isTimerRunning={isTimerRunning}
              bottleRotation={bottleRotation}
              onSpinBottle={handleSpinBottle}
              onSelectDeck={(deck) => setSelectedDeck(deck)}
              onPickCard={handlePickCard}
              onStartTimer={handleStartTimer}
              onCompleteCard={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast(`🎉 ${roster[chosenPlayerIndex ?? 0]} completed the challenge!`);
                setActiveCard(null);
              }}
              onForfeitCard={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                showToast(`💀 ${roster[chosenPlayerIndex ?? 0]} took a forfeit!`);
                setActiveCard(null);
              }}
              onCloseCard={() => setActiveCard(null)}
              onBackToHub={() => setActiveMode('hub')}
              onEditPlayer={(idx, player) => {
                setEditingPlayerIndex(idx);
                setEditingPlayerName(player);
              }}
            />
          )}

          {activeMode === 'wyr' && (
            <WouldYouRatherGame
              roster={roster}
              myName={myName}
              currentItem={currentWyrItem}
              currentIndex={wyrIndex}
              totalItems={WOULD_YOU_RATHER_ITEMS.length}
              wyrVotes={wyrVotes}
              isInRoom={isInRoom}
              onVote={handleVoteWyr}
              onNext={handleNextWyr}
              onBackToHub={() => setActiveMode('hub')}
            />
          )}

          {activeMode === 'nhie' && (
            <NeverHaveIEverGame
              roster={roster}
              myName={myName}
              currentItem={currentNhieItem}
              currentIndex={nhieIndex}
              totalItems={NEVER_HAVE_I_EVER_ITEMS.length}
              playerLives={playerLives}
              onLoseLife={handleLoseLifeNhie}
              onNext={handleNextNhie}
              onResetLives={handleResetNhie}
              onInnocent={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                showToast('😇 Pure & Innocent!');
              }}
              onBackToHub={() => setActiveMode('hub')}
            />
          )}

          {activeMode === 'mlt' && (
            <MostLikelyToGame
              roster={roster}
              myName={myName}
              currentItem={currentMltItem}
              currentIndex={mltIndex}
              totalItems={MOST_LIKELY_TO_ITEMS.length}
              mltVotes={mltVotes}
              onVote={handleVoteMlt}
              onNext={handleNextMlt}
              onBackToHub={() => setActiveMode('hub')}
            />
          )}

          {activeMode === 'word_duel' && (
            <WordDuelGame
              players={roster.slice(0, 2)}
              onBackToHub={() => setActiveMode('hub')}
              myName={myName}
              onlineState={onlineDuel?.type === 'word_duel' ? onlineDuel : null}
              connected={isConnected}
              roomMemberCount={memberCount}
              onPlayOnline={() => playOnline('word_duel')}
              onOnlineAction={(action) => syncManager.sendDuelAction(action)}
              onlinePending={pendingOnlineGame === 'word_duel'}
              roomId={roomId}
              onShareRoom={handleShareRoom}
              onEditPlayer={(index) => { setEditingPlayerIndex(index); setEditingPlayerName(roster[index] || ''); }}
            />
          )}

          {activeMode === 'two_truths_lie' && (
            <TwoTruthsLieGame
              players={roster.slice(0, 2)}
              onBackToHub={() => setActiveMode('hub')}
              myName={myName}
              onlineState={onlineDuel?.type === 'two_truths_lie' ? onlineDuel : null}
              connected={isConnected}
              roomMemberCount={memberCount}
              onPlayOnline={() => playOnline('two_truths_lie')}
              onOnlineAction={(action) => syncManager.sendDuelAction(action)}
              onlinePending={pendingOnlineGame === 'two_truths_lie'}
              roomId={roomId}
              onShareRoom={handleShareRoom}
              onEditPlayer={(index) => { setEditingPlayerIndex(index); setEditingPlayerName(roster[index] || ''); }}
            />
          )}

          {activeMode === 'trivia_duel' && (
            <TriviaDuelGame
              myName={myName}
              state={onlineDuel?.type === 'trivia_duel' ? onlineDuel : null}
              connected={isConnected}
              roomMemberCount={memberCount}
              pending={pendingOnlineGame === 'trivia_duel'}
              roomId={roomId}
              onStart={(settings) => playOnline('trivia_duel', settings)}
              onShareRoom={handleShareRoom}
              onAnswer={(index) => syncManager.sendDuelAction({ type: 'answer', index })}
              onNext={() => syncManager.sendDuelAction({ type: 'next' })}
              onRematch={(gameType) => syncManager.sendDuelAction({ type: 'rematch-vote', gameType })}
              onBack={() => setActiveMode('hub')}
            />
          )}
        </GameErrorBoundary>
      </ScrollView>

      {/* ─── Party Live Chat Modal ───────────────────────────────────────── */}
      <Modal visible={showChatModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.chatModalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatCard}>
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roastChipsRow}
              >
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
                  <View
                    style={[
                      styles.chatBubbleWrap,
                      isMe ? styles.chatBubbleMeWrap : styles.chatBubbleOtherWrap,
                    ]}
                  >
                    {!isMe && (
                      <Text style={styles.chatSenderName}>
                        {item.user?.username || 'Player'}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.chatBubble,
                        isMe ? styles.chatBubbleMe : styles.chatBubbleOther,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatMessageText,
                          isMe ? styles.chatMessageTextMe : null,
                        ]}
                      >
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
                    : Math.max(
                        (insets.bottom || 0) + 16,
                        Platform.OS === 'android' ? 64 : 32
                      ),
                },
              ]}
            >
              <TextInput
                style={styles.chatInput}
                placeholder="Type a roast, dare, or reaction..."
                placeholderTextColor={colors.textMuted}
                value={chatInputText}
                onChangeText={setChatInputText}
                onSubmitEditing={handleSendChat}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendBtn,
                  !chatInputText.trim() && { opacity: 0.5 },
                ]}
                onPress={handleSendChat}
                disabled={!chatInputText.trim()}
              >
                <Ionicons name="send" size={16} color="#000000" />
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
              placeholderTextColor={colors.textMuted}
              value={newPlayerInput}
              onChangeText={setNewPlayerInput}
              autoFocus
              onSubmitEditing={() => handleAddPlayerSubmit()}
            />

            <SpotifyTouchable
              style={[
                styles.modalPrimaryAction,
                !newPlayerInput.trim() && { opacity: 0.5 },
              ]}
              onPress={() => handleAddPlayerSubmit()}
              disabled={!newPlayerInput.trim()}
              activeScale={0.95}
              activeOpacity={0.88}
            >
              <Ionicons name="person-add" size={18} color="#000000" />
              <Text style={styles.modalPrimaryActionText}>ADD TO GAME</Text>
            </SpotifyTouchable>

            {/* 1-Tap Quick Add from Squad */}
            {savedFriends.length > 0 && (
              <View style={styles.squadQuickAddWrap}>
                <Text style={styles.sectionMiniHeading}>
                  OR 1-TAP FROM SAVED SQUAD:
                </Text>
                <View style={styles.squadPillRow}>
                  {savedFriends.map((f) => {
                    const alreadyIn = roster.includes(f.username);
                    return (
                      <TouchableOpacity
                        key={f.username + f.tag}
                        style={[
                          styles.squadPill,
                          alreadyIn && styles.squadPillDisabled,
                        ]}
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
                          color={alreadyIn ? colors.online : colors.accent}
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
              placeholderTextColor={colors.textMuted}
              value={editingPlayerName}
              onChangeText={setEditingPlayerName}
              autoFocus
              onSubmitEditing={handleSaveRename}
            />

            <TouchableOpacity
              style={styles.modalPrimaryAction}
              onPress={handleSaveRename}
              activeOpacity={0.85}
            >
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
              Sync live with friends across phones! All bottle spins, dilemmas,
              chat, and votes happen in real-time.
            </Text>

            <SpotifyTouchable
              style={styles.modalPrimaryAction}
              onPress={() => {
                createRoom();
                setShowJoinModal(false);
                showToast('Created new squad party room!');
              }}
              activeScale={0.95}
              activeOpacity={0.88}
            >
              <Ionicons name="add-circle" size={18} color="#000000" />
              <Text style={styles.modalPrimaryActionText}>
                HOST NEW PARTY ROOM
              </Text>
            </SpotifyTouchable>

            <View style={styles.modalDividerRow}>
              <View style={styles.modalLine} />
              <Text style={styles.modalOrText}>OR ENTER CODE</Text>
              <View style={styles.modalLine} />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. K9X2P4"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              maxLength={6}
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
            />

            <SpotifyTouchable
              style={[
                styles.modalSecondaryAction,
                !joinCodeInput.trim() && { opacity: 0.5 },
              ]}
              onPress={handleJoinSubmit}
              disabled={!joinCodeInput.trim()}
              activeScale={0.95}
              activeOpacity={0.88}
            >
              <Ionicons name="enter-outline" size={18} color={colors.accent} />
              <Text style={styles.modalSecondaryActionText}>
                JOIN WITH CODE
              </Text>
            </SpotifyTouchable>
          </View>
        </View>
      </Modal>

      {/* ─── Anchored MiniPlayer ─────────────────────────────────────────── */}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  partyNoticeBadge: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.emeraldGlow,
    maxWidth: '90%',
  },
  partyNoticeText: {
    color: '#000000',
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 160,
  },

  // Chat Modal
  chatModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'flex-end',
  },
  chatCard: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: '75%',
    borderTopWidth: 1,
    borderColor: colors.borderCard,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  chatRoomTag: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  roastChipsSection: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  roastChipsRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
  },
  roastChip: {
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  roastChipText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  chatBubbleWrap: {
    maxWidth: '80%',
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
    fontWeight: typography.weights.bold,
    marginBottom: 2,
    marginLeft: 4,
  },
  chatBubble: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatBubbleMe: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 2,
  },
  chatBubbleOther: {
    backgroundColor: colors.backgroundInput,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  chatMessageText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
  },
  chatMessageTextMe: {
    color: '#000000',
    fontWeight: typography.weights.semibold,
  },
  chatEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  chatEmptyText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  chatEmptySub: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 4,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Generic Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.borderNeon,
    ...shadows.cardShadow,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  modalDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  modalInput: {
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
    marginBottom: spacing.md,
  },
  modalPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  modalPrimaryActionText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderNeon,
  },
  modalSecondaryActionText: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  modalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  modalLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  modalOrText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
  },
  squadQuickAddWrap: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  sectionMiniHeading: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  squadPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  squadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  squadPillDisabled: {
    opacity: 0.5,
  },
  squadPillText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});
