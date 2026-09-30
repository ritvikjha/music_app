import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import type { OnlineDuelState, OnlineDuelType } from '../../types';

interface Props {
  type: OnlineDuelType;
  state: OnlineDuelState;
  myName: string;
  connected: boolean;
  roomMemberCount: number;
  onWord: (word: string) => void;
  onStatements: (statements: string[], lieIndex: number) => void;
  onGuess: (index: number) => void;
  onNext: () => void;
  onRematch: (gameType: OnlineDuelType) => void;
  onBack: () => void;
}

export function OnlineDuelPanel({ type, state, myName, connected, roomMemberCount, onWord, onStatements, onGuess, onNext, onRematch, onBack }: Props) {
  const [word, setWord] = useState('');
  const [drafts, setDrafts] = useState(['', '', '']);
  const [lieIndex, setLieIndex] = useState(0);
  const [rematchType, setRematchType] = useState<OnlineDuelType>(type);
  const me = useMemo(() => {
    if (typeof state.myPlayerIndex === 'number' && state.myPlayerIndex >= 0) {
      return state.myPlayerIndex;
    }
    const idx = state.players.findIndex((p) => p.toLowerCase() === myName.toLowerCase());
    if (idx >= 0) return idx;
    if (state.players[0]?.toLowerCase().includes(myName.toLowerCase())) return 0;
    if (state.players[1]?.toLowerCase().includes(myName.toLowerCase())) return 1;
    return 0;
  }, [state.myPlayerIndex, state.players, myName]);
  const isMyTurn = state.turn === me;
  const lastLetter = state.chain.at(-1)?.slice(-1) || '';
  const myVote = state.rematchVotes?.[me] || null;
  const rematchChoices: { type: OnlineDuelType; label: string }[] = [
    { type: 'word_duel', label: 'Word Duel' },
    { type: 'two_truths_lie', label: 'Two Truths' },
    { type: 'trivia_duel', label: 'Trivia Duel' },
  ];
  const title = type === 'word_duel' ? 'Word Duel' : 'Two Truths & a Lie';
  const subtitle = type === 'word_duel'
    ? 'Take turns. Start with the last letter. A broken chain gives your opponent a point.'
    : 'Write three statements and secretly mark the lie. Your friend guesses from their phone.';

  const helper = useMemo(() => {
    if (!connected) return 'Reconnecting… Your game is saved in this room.';
    if (roomMemberCount < 2) return `Waiting for ${state.players[1 - me] || 'your friend'} to reconnect. The game is saved.`;
    if (state.phase === 'finished') return `${state.winner || 'A player'} won. Play another round?`;
    if (type === 'word_duel') return isMyTurn ? (lastLetter ? `Your word must start with “${lastLetter.toUpperCase()}”.` : 'Start with any word.') : `Waiting for ${state.players[state.turn]} to play…`;
    if (state.phase === 'write') return state.turn === me ? 'Write two true statements and one lie.' : `Waiting for ${state.players[state.storyteller]} to write…`;
    if (state.phase === 'guess') return state.turn === me ? 'Pick the statement you think is the lie.' : `Waiting for ${state.players[state.turn]} to guess…`;
    return state.guessIndex === state.lieIndex ? `${state.players[1 - state.storyteller]} found the lie!` : `${state.players[1 - state.storyteller]} missed the lie.`;
  }, [connected, isMyTurn, lastLetter, me, roomMemberCount, state, type]);

  return (
    <View style={styles.page}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}><Ionicons name="arrow-back" size={17} color={colors.textSecondary} /><Text style={styles.backText}>GAMES</Text></TouchableOpacity>
        <View style={styles.modePill}><View style={[styles.dot, connected && roomMemberCount === 2 ? styles.dotOnline : styles.dotOffline]} /><Text style={styles.modeText}>{!connected ? 'RECONNECTING' : roomMemberCount === 2 ? 'ONLINE · 1V1' : 'WAITING FOR FRIEND'}</Text></View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.scoreRow}>
        {state.players.map((name, index) => <View key={`${name}-${index}`} style={[styles.scoreCard, state.turn === index && state.phase !== 'finished' && styles.scoreActive]}>
          <Text style={styles.playerName} numberOfLines={1}>{name}{index === me ? ' (you)' : ''}</Text>
          <Text style={styles.score}>{state.scores[index]}</Text>
          {state.turn === index && state.phase !== 'finished' && <Text style={styles.turnText}>{type === 'word_duel' ? (index === me ? 'YOUR TURN' : 'THEIR TURN') : state.phase === 'write' ? (index === state.storyteller ? 'WRITING' : 'WAITING') : state.phase === 'guess' ? (index === state.turn ? 'GUESSING' : 'WAITING') : 'ROUND RESULT'}</Text>}
        </View>)}
      </View>
      <View style={styles.panel}>
        <Text style={styles.helper}>{helper}</Text>
        {type === 'word_duel' ? (
          <>
            <View style={styles.chain}>
              {state.chain.slice(-10).map((entry, index) => <Text key={`${entry}-${index}`} style={styles.chainWord}>{entry}{index < Math.min(state.chain.length, 10) - 1 ? '  ›  ' : ''}</Text>)}
              {!state.chain.length && <Text style={styles.muted}>The first word starts the chain.</Text>}
            </View>
            {state.phase === 'finished' ? <>
              <Text style={styles.muted}>Pick a game. It starts when you both choose the same one.</Text>
              <View style={styles.rematchChoices}>{rematchChoices.map((choice) => <TouchableOpacity key={choice.type} onPress={() => setRematchType(choice.type)} style={[styles.rematchChoice, rematchType === choice.type && styles.rematchChoiceActive]}><Text style={[styles.rematchChoiceText, rematchType === choice.type && styles.rematchChoiceTextActive]}>{choice.label}</Text></TouchableOpacity>)}</View>
              <TouchableOpacity onPress={() => onRematch(rematchType)} disabled={!connected} style={[styles.primary, !connected && styles.disabled]}><Text style={styles.primaryText}>{myVote ? `CHANGE VOTE · ${myVote === rematchType ? 'VOTED' : 'CONFIRM'}` : 'VOTE TO PLAY AGAIN'}</Text></TouchableOpacity>
              {!!myVote && <Text style={styles.muted}>You picked {rematchChoices.find((choice) => choice.type === myVote)?.label}. {state.rematchVotes?.[1 - me] ? `Your friend picked ${rematchChoices.find((choice) => choice.type === state.rematchVotes?.[1 - me])?.label}.` : 'Waiting for your friend to choose…'}</Text>}
            </> : isMyTurn ? <View style={styles.entryRow}>
              <TextInput value={word} onChangeText={setWord} onSubmitEditing={() => { onWord(word); setWord(''); }} returnKeyType="go" autoCapitalize="none" autoCorrect={false} maxLength={32} placeholder={lastLetter ? `Starts with ${lastLetter.toUpperCase()}` : 'Type a word'} placeholderTextColor={colors.textMuted} style={styles.input} editable={connected} />
              <TouchableOpacity onPress={() => { onWord(word); setWord(''); }} disabled={!connected || !word.trim()} style={[styles.primary, (!connected || !word.trim()) && styles.disabled]} accessibilityLabel="Submit word"><Ionicons name="arrow-forward" size={19} color={colors.background} /></TouchableOpacity>
            </View> : null}
          </>
        ) : state.phase === 'finished' ? (
          <>
            {state.statements.map((statement, index) => <View key={index} style={[styles.guessRow, index === state.lieIndex && styles.lieRow]}><Text style={styles.number}>{index + 1}</Text><Text style={styles.statement}>{statement}</Text>{index === state.lieIndex && <Text style={styles.lieTag}>THE LIE</Text>}</View>)}
            <Text style={styles.muted}>Pick a game. It starts when you both choose the same one.</Text>
            <View style={styles.rematchChoices}>{rematchChoices.map((choice) => <TouchableOpacity key={choice.type} onPress={() => setRematchType(choice.type)} style={[styles.rematchChoice, rematchType === choice.type && styles.rematchChoiceActive]}><Text style={[styles.rematchChoiceText, rematchType === choice.type && styles.rematchChoiceTextActive]}>{choice.label}</Text></TouchableOpacity>)}</View>
            <TouchableOpacity onPress={() => onRematch(rematchType)} disabled={!connected} style={[styles.primary, !connected && styles.disabled]}><Text style={styles.primaryText}>{myVote ? 'CHANGE REMATCH VOTE' : 'VOTE TO PLAY AGAIN'}</Text></TouchableOpacity>
            {!!myVote && <Text style={styles.muted}>Waiting for your friend to choose the same game.</Text>}
          </>
        ) : state.phase === 'write' && state.turn === me ? (
          <>
            {drafts.map((item, index) => <View key={index} style={styles.statementRow}><TextInput value={item} onChangeText={(value) => setDrafts((old) => old.map((line, lineIndex) => lineIndex === index ? value : line))} placeholder={`Statement ${index + 1}`} placeholderTextColor={colors.textMuted} style={styles.input} maxLength={120} editable={connected} /><TouchableOpacity onPress={() => setLieIndex(index)} accessibilityLabel={`Mark statement ${index + 1} as the lie`}><Ionicons name={lieIndex === index ? 'eye-off' : 'ellipse-outline'} size={20} color={lieIndex === index ? colors.error : colors.textMuted} /></TouchableOpacity></View>)}
            <Text style={styles.muted}>Only you can see which one you marked as the lie.</Text>
            <TouchableOpacity onPress={() => onStatements(drafts, lieIndex)} disabled={!connected || drafts.some((item) => !item.trim())} style={[styles.primary, (!connected || drafts.some((item) => !item.trim())) && styles.disabled]}><Text style={styles.primaryText}>SEND TO YOUR FRIEND</Text></TouchableOpacity>
          </>
        ) : state.phase === 'guess' && state.turn === me ? (
          <>{state.statements.map((statement, index) => <TouchableOpacity key={index} onPress={() => onGuess(index)} disabled={!connected} style={styles.guessRow}><Text style={styles.number}>{index + 1}</Text><Text style={styles.statement}>{statement}</Text><Ionicons name="chevron-forward" size={17} color={colors.textMuted} /></TouchableOpacity>)}</>
        ) : state.phase === 'guess' && state.storyteller === me ? (
          <>{state.statements.map((statement, index) => <View key={index} style={[styles.guessRow, index === state.mySecretLieIndex && styles.lieRow]}><Text style={styles.number}>{index + 1}</Text><Text style={styles.statement}>{statement}</Text>{index === state.mySecretLieIndex && <Text style={styles.lieTag}>YOUR LIE</Text>}</View>)}</>
        ) : state.phase === 'result' ? (
          <>
            {state.statements.map((statement, index) => <View key={index} style={[styles.guessRow, index === state.lieIndex && styles.lieRow]}><Text style={styles.number}>{index + 1}</Text><Text style={styles.statement}>{statement}</Text>{index === state.lieIndex && <Text style={styles.lieTag}>THE LIE</Text>}</View>)}
            <TouchableOpacity onPress={onNext} disabled={!connected || !isMyTurn} style={[styles.primary, (!connected || !isMyTurn) && styles.disabled]}><Text style={styles.primaryText}>{isMyTurn ? 'NEXT ROUND' : 'WAITING FOR NEXT ROUND'}</Text></TouchableOpacity>
          </>
        ) : null}
      </View>
      <Text style={styles.footer}>Game progress is saved in the room. Rejoin with the same room code to continue.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: 32, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 },
  backText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.backgroundElevated },
  dot: { width: 7, height: 7, borderRadius: 4 }, dotOnline: { backgroundColor: colors.online }, dotOffline: { backgroundColor: '#F59E0B' },
  modeText: { color: colors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  scoreRow: { flexDirection: 'row', gap: 10 },
  scoreCard: { flex: 1, minHeight: 86, padding: 12, borderRadius: 14, backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.borderCard },
  scoreActive: { borderColor: colors.accent },
  playerName: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  score: { color: colors.textPrimary, fontSize: 25, fontWeight: '800', marginTop: 4 },
  turnText: { position: 'absolute', right: 10, bottom: 10, color: colors.accent, fontSize: 8, fontWeight: '800' },
  panel: { padding: 15, borderRadius: 16, backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.borderCard, gap: 10 },
  helper: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  chain: { minHeight: 72, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', padding: 10, borderRadius: 10, backgroundColor: colors.background },
  chainWord: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  entryRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 44, color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.backgroundInput, fontSize: 14 },
  primary: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  primaryText: { color: '#000000', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  disabled: { opacity: 0.45 },
  rematchChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  rematchChoice: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: colors.backgroundInput, borderWidth: 1, borderColor: colors.borderCard },
  rematchChoiceActive: { borderColor: colors.accent, backgroundColor: colors.accentAlpha10 },
  rematchChoiceText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  rematchChoiceTextActive: { color: colors.accent },
  statementRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guessRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 11, backgroundColor: colors.backgroundInput },
  number: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  statement: { flex: 1, color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
  lieRow: { borderWidth: 1, borderColor: colors.error },
  lieTag: { color: colors.error, fontSize: 8, fontWeight: '800' },
  footer: { color: colors.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 8 },
});
