import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { OnlineDuelPanel } from './OnlineDuelPanel';
import type { OnlineDuelState } from '../../types';

interface Props {
  players: string[];
  onBackToHub: () => void;
  myName: string;
  onlineState: OnlineDuelState | null;
  connected: boolean;
  roomMemberCount: number;
  onPlayOnline: () => void;
  onOnlineAction: (action: Record<string, unknown>) => void;
  onlinePending: boolean;
  roomId: string | null;
  onShareRoom: () => void;
  onEditPlayer: (index: number) => void;
}

const WIN_SCORE = 5;

export function WordDuelGame({ players, onBackToHub, myName, onlineState, connected, roomMemberCount, onPlayOnline, onOnlineAction, onlinePending, roomId, onShareRoom, onEditPlayer }: Props) {
  const duo = useMemo(() => [players[0] || 'Player 1', players[1] || 'Player 2'], [players]);
  const [draft, setDraft] = useState('');
  const [turn, setTurn] = useState(0);
  const [chain, setChain] = useState<string[]>([]);
  const [scores, setScores] = useState([0, 0]);
  const [message, setMessage] = useState('Start with any word. Keep the chain alive.');
  const [champion, setChampion] = useState<number | null>(null);

  const lastLetter = chain.length ? chain[chain.length - 1].slice(-1) : null;
  const cleanWord = draft.trim().toLowerCase().replace(/[^a-z]/g, '');

  if (onlineState?.type === 'word_duel') {
    return <OnlineDuelPanel type="word_duel" state={onlineState} myName={myName} connected={connected} roomMemberCount={roomMemberCount} onWord={(value) => onOnlineAction({ type: 'word', word: value })} onStatements={() => {}} onGuess={() => {}} onNext={() => {}} onRematch={(gameType) => onOnlineAction({ type: 'rematch-vote', gameType })} onBack={onBackToHub} />;
  }

  const submitWord = () => {
    if (champion !== null) return;
    if (!cleanWord) {
      setMessage('Type a word before you submit.');
      return;
    }
    let reason = '';
    if (cleanWord.length < 2) reason = 'Use a word with at least two letters.';
    else if (chain.includes(cleanWord)) reason = 'That word is already in this chain.';
    else if (lastLetter && cleanWord[0] !== lastLetter) reason = `Your word must start with “${lastLetter.toUpperCase()}”.`;

    if (reason) {
      const pointFor = 1 - turn;
      const nextScore = [...scores];
      nextScore[pointFor] += 1;
      setScores(nextScore);
      setChain([]);
      setTurn(pointFor);
      setDraft('');
      if (nextScore[pointFor] >= WIN_SCORE) {
        setChampion(pointFor);
        setMessage(`${duo[pointFor]} wins the duel!`);
      } else {
        setMessage(`${duo[turn]} missed — point to ${duo[pointFor]}. New chain!`);
      }
      return;
    }

    setChain((previous) => [...previous, cleanWord]);
    setTurn(1 - turn);
    setDraft('');
    setMessage(`${duo[1 - turn]} is up. Continue with “${cleanWord.slice(-1).toUpperCase()}”.`);
  };

  const resetGame = () => {
    setDraft(''); setTurn(0); setChain([]); setScores([0, 0]); setChampion(null);
    setMessage('Start with any word. Keep the chain alive.');
  };

  return (
    <View style={styles.page}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBackToHub} style={styles.backButton} accessibilityLabel="Back to games">
          <Ionicons name="arrow-back" size={17} color={colors.textSecondary} />
          <Text style={styles.backText}>GAMES</Text>
        </TouchableOpacity>
        <View style={styles.modePill}><View style={styles.liveDot} /><Text style={styles.modeText}>PASS & PLAY · 1V1</Text></View>
      </View>

      <TouchableOpacity onPress={onlinePending && roomId ? onShareRoom : onPlayOnline} style={styles.onlineButton} activeOpacity={0.82}>
        <Ionicons name="people-outline" size={16} color={colors.accent} />
        <Text style={styles.onlineButtonText}>{onlinePending ? (roomId ? `Waiting for friend · ${roomId}` : 'Opening a room for your friend…') : 'Play with a friend online'}</Text>
        <Ionicons name={onlinePending && roomId ? 'share-outline' : 'arrow-forward'} size={15} color={colors.accent} />
      </TouchableOpacity>

      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>QUICK THINKING, CLEAN WORDS</Text>
        <Text style={styles.title}>Word Duel</Text>
        <Text style={styles.subtitle}>Take turns. Link the next word to the last letter. First to five points wins.</Text>
      </View>

      <View style={styles.scoreboard}>
        {[0, 1].map((index) => (
          <View key={index} style={[styles.playerCard, turn === index && champion === null && styles.playerActive]}>
            <Text style={styles.playerLabel}>{index === 0 ? 'PLAYER ONE' : 'PLAYER TWO'}</Text>
            <TouchableOpacity onPress={() => onEditPlayer(index)} accessibilityLabel={`Change ${duo[index]}'s name`} style={styles.editName}>
              <Text style={styles.playerName} numberOfLines={1}>{duo[index]}</Text>
              <Ionicons name="pencil-outline" size={11} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.scoreRow}>
              {[0, 1, 2, 3, 4].map((point) => <View key={point} style={[styles.scoreDot, point < scores[index] && (index === 0 ? styles.dotOne : styles.dotTwo)]} />)}
              <Text style={styles.scoreNumber}>{scores[index]}</Text>
            </View>
            {turn === index && champion === null && <Text style={styles.turnLabel}>YOUR TURN</Text>}
          </View>
        ))}
      </View>

      <View style={styles.chainCard}>
        <View style={styles.chainHeader}>
          <Text style={styles.chainEyebrow}>WORD CHAIN</Text>
          <Text style={styles.chainCount}>{chain.length} {chain.length === 1 ? 'WORD' : 'WORDS'}</Text>
        </View>
        {chain.length ? (
          <View style={styles.chainWords}>
            {chain.slice(-8).map((word, index, recent) => (
              <React.Fragment key={`${word}-${chain.length - recent.length + index}`}>
                {index > 0 && <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />}
                <Text style={[styles.chainWord, index === recent.length - 1 && styles.chainWordLatest]}>{word}</Text>
              </React.Fragment>
            ))}
          </View>
        ) : <Text style={styles.emptyChain}>The first word starts the chain.</Text>}
        <View style={styles.ruleRow}>
          <Text style={styles.ruleText}>{lastLetter ? 'START WITH' : 'ANY WORD'}</Text>
          {lastLetter && <Text style={styles.letterBadge}>{lastLetter.toUpperCase()}</Text>}
          <Text style={styles.ruleDivider}>·</Text>
          <Text style={styles.ruleText}>NO REPEATS</Text>
        </View>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.turnHeading}>{champion !== null ? 'DUEL COMPLETE' : `${duo[turn]} plays next`}</Text>
        <Text style={styles.statusText}>{message}</Text>
        {champion === null ? (
          <View style={styles.entryRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitWord}
              returnKeyType="go"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={32}
              placeholder={lastLetter ? `Starts with ${lastLetter.toUpperCase()}` : 'Type a word'}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Enter your word"
            />
            <TouchableOpacity onPress={submitWord} style={styles.submitButton} accessibilityLabel="Submit word">
              <Ionicons name="arrow-forward" size={21} color={colors.background} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={resetGame} style={styles.rematchButton}>
            <Ionicons name="refresh" size={17} color={colors.background} />
            <Text style={styles.rematchText}>REMATCH</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.handoffNote}>One phone · pass it after every turn</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: 34, gap: spacing.lg },
  onlineButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.borderCard, flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineButtonText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingRight: 10 },
  backText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: borderRadius.full, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: colors.accentAlpha10, borderWidth: 1, borderColor: colors.borderNeon },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  modeText: { color: colors.accentLight, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  titleBlock: { paddingTop: 2, gap: 5 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, maxWidth: 360 },
  scoreboard: { flexDirection: 'row', gap: 10 },
  playerCard: { flex: 1, minHeight: 115, padding: 14, borderRadius: 17, backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.borderCard },
  playerActive: { borderColor: colors.accent, backgroundColor: '#102016' },
  playerLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  playerName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 7 },
  editName: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  scoreDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#343442' },
  dotOne: { backgroundColor: colors.accent }, dotTwo: { backgroundColor: colors.accentSecondary },
  scoreNumber: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', marginLeft: 4 },
  turnLabel: { position: 'absolute', right: 12, bottom: 13, color: colors.accentLight, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  chainCard: { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.borderCard, borderRadius: 18, padding: 16, minHeight: 118, justifyContent: 'space-between' },
  chainHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  chainEyebrow: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  chainCount: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  chainWords: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginVertical: 15 },
  chainWord: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  chainWordLatest: { color: colors.textPrimary },
  emptyChain: { color: colors.textMuted, fontSize: 13, marginVertical: 15 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  letterBadge: { color: colors.accentLight, fontSize: 11, fontWeight: '900', backgroundColor: colors.accentAlpha15, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  ruleDivider: { color: colors.textMuted },
  inputCard: { backgroundColor: colors.backgroundElevated, borderRadius: 18, borderWidth: 1, borderColor: colors.borderCard, padding: 16 },
  turnHeading: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  statusText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 14 },
  entryRow: { flexDirection: 'row', gap: 9 },
  input: { flex: 1, height: 50, borderRadius: 13, backgroundColor: colors.backgroundInput, paddingHorizontal: 14, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.borderCard },
  submitButton: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  rematchButton: { flexDirection: 'row', height: 48, gap: 8, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  rematchText: { color: colors.background, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  handoffNote: { textAlign: 'center', color: colors.textMuted, fontSize: 10, letterSpacing: 0.5 },
});
