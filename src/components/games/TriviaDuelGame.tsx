import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import type { OnlineDuelState, OnlineDuelType, TriviaCategory, TriviaDifficulty, TriviaDuelSettings } from '../../types';

interface Props {
  myName: string;
  state: OnlineDuelState | null;
  connected: boolean;
  roomMemberCount: number;
  pending: boolean;
  roomId: string | null;
  onStart: (settings: TriviaDuelSettings) => void;
  onShareRoom: () => void;
  onAnswer: (index: number) => void;
  onNext: () => void;
  onRematch: (gameType: OnlineDuelType) => void;
  onBack: () => void;
}

export function TriviaDuelGame({ myName, state, connected, roomMemberCount, pending, roomId, onStart, onShareRoom, onAnswer, onNext, onRematch, onBack }: Props) {
  const [rematchType, setRematchType] = useState<OnlineDuelType>('trivia_duel');
  const [category, setCategory] = useState<TriviaCategory>('Any topic');
  const [difficulty, setDifficulty] = useState<TriviaDifficulty>('easy');
  if (!state || state.type !== 'trivia_duel') {
    return <View style={styles.page}>
      <TouchableOpacity onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={17} color={colors.textSecondary} /><Text style={styles.backText}>GAMES</Text></TouchableOpacity>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>420 QUESTIONS · 11 TOPICS · 3 LEVELS</Text>
        <Text style={styles.title}>Trivia Duel</Text>
        <Text style={styles.copy}>Choose what you want to play. You’ll each take turns answering 10 questions, and every right answer earns a point.</Text>
        <Text style={styles.settingHeading}>CHOOSE A TOPIC</Text>
        <View style={styles.choices}>{(['Any topic', 'Anime', 'Movies', 'Songs', 'General Knowledge', 'Science', 'Geography', 'History', 'Nature', 'Food', 'Culture', 'Quick Facts'] as TriviaCategory[]).map((item) => <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.choice, category === item && styles.choiceActive]}><Text style={[styles.choiceText, category === item && styles.choiceTextActive]}>{item}</Text></TouchableOpacity>)}</View>
        <Text style={styles.settingHeading}>CHOOSE DIFFICULTY</Text>
        <View style={styles.choices}>{(['easy', 'medium', 'difficult'] as TriviaDifficulty[]).map((item) => <TouchableOpacity key={item} onPress={() => setDifficulty(item)} style={[styles.choice, difficulty === item && styles.choiceActive]}><Text style={[styles.choiceText, difficulty === item && styles.choiceTextActive]}>{item === 'difficult' ? 'Difficult' : item[0].toUpperCase() + item.slice(1)}</Text></TouchableOpacity>)}</View>
        <Text style={styles.note}>Each topic and level has its own question set. A match never repeats a question.</Text>
        <TouchableOpacity style={styles.button} onPress={() => pending && roomId ? onShareRoom() : onStart({ category, difficulty })}>
          <Text style={styles.buttonText}>{pending ? (roomId ? `INVITE FRIEND · ${roomId}` : 'OPENING ROOM…') : 'PLAY ONLINE'}</Text>
          <Ionicons name={pending && roomId ? 'share-outline' : 'arrow-forward'} size={17} color={colors.background} />
        </TouchableOpacity>
        <Text style={styles.note}>Play on two phones by joining the same room.</Text>
      </View>
    </View>;
  }

  const me = typeof state.myPlayerIndex === 'number' && state.myPlayerIndex >= 0
    ? state.myPlayerIndex
    : (() => {
        const idx = state.players.findIndex((p) => p.toLowerCase() === myName.toLowerCase());
        if (idx >= 0) return idx;
        if (state.players[0]?.toLowerCase().includes(myName.toLowerCase())) return 0;
        if (state.players[1]?.toLowerCase().includes(myName.toLowerCase())) return 1;
        return 0;
      })();
  const isMyTurn = state.turn === me;
  const finished = state.phase === 'finished';
  const answered = state.phase === 'result' || finished;
  const myVote = state.rematchVotes?.[me] || null;
  const choices: { type: OnlineDuelType; label: string }[] = [
    { type: 'word_duel', label: 'Word Duel' },
    { type: 'two_truths_lie', label: 'Two Truths' },
    { type: 'trivia_duel', label: 'Trivia Duel' },
  ];

  return <View style={styles.page}>
    <View style={styles.topRow}>
      <TouchableOpacity onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={17} color={colors.textSecondary} /><Text style={styles.backText}>GAMES</Text></TouchableOpacity>
      <View style={styles.connection}><View style={[styles.dot, connected && roomMemberCount === 2 ? styles.online : styles.offline]} /><Text style={styles.connectionText}>{!connected ? 'RECONNECTING' : roomMemberCount === 2 ? 'ONLINE · 1V1' : 'WAITING FOR FRIEND'}</Text></View>
    </View>
    <Text style={styles.title}>Trivia Duel</Text>
    <Text style={styles.copy}>{state.category || 'Any topic'} · {(state.difficulty || 'easy')[0].toUpperCase() + (state.difficulty || 'easy').slice(1)} · 10 questions</Text>
    <View style={styles.scores}>{state.players.map((name, i) => <View key={`${name}-${i}`} style={[styles.scoreCard, !finished && state.turn === i && styles.activeScore]}>
      <Text style={styles.player} numberOfLines={1}>{name}{i === me ? ' (you)' : ''}</Text><Text style={styles.score}>{state.scores[i]}</Text>
      {!finished && state.turn === i && <Text style={styles.turn}>{i === me ? 'YOUR TURN' : 'THEIR TURN'}</Text>}
    </View>)}</View>
    <View style={styles.card}>
      {finished ? <>
        <Text style={styles.eyebrow}>MATCH COMPLETE</Text>
        <Text style={styles.prompt}>{state.winner === 'Draw' ? 'It’s a draw!' : `${state.winner} wins!`}</Text>
        <Text style={styles.copy}>Final score: {state.scores[0]}–{state.scores[1]}</Text>
        <Text style={styles.copy}>Choose a game. It starts when you both agree.</Text>
        <View style={styles.choices}>{choices.map((choice) => <TouchableOpacity key={choice.type} onPress={() => setRematchType(choice.type)} style={[styles.choice, rematchType === choice.type && styles.choiceActive]}><Text style={[styles.choiceText, rematchType === choice.type && styles.choiceTextActive]}>{choice.label}</Text></TouchableOpacity>)}</View>
        <TouchableOpacity onPress={() => onRematch(rematchType)} disabled={!connected} style={[styles.button, !connected && styles.disabled]}><Text style={styles.buttonText}>{myVote ? 'CHANGE REMATCH VOTE' : 'VOTE TO PLAY AGAIN'}</Text><Ionicons name="arrow-forward" size={17} color={colors.background} /></TouchableOpacity>
        {!!myVote && <Text style={styles.note}>You picked {choices.find((choice) => choice.type === myVote)?.label}. {state.rematchVotes?.[1 - me] ? `Your friend picked ${choices.find((choice) => choice.type === state.rematchVotes?.[1 - me])?.label}.` : 'Waiting for your friend to choose…'}</Text>}
      </> : <>
        <View style={styles.questionMeta}><Text style={styles.eyebrow}>{state.question?.category?.toUpperCase() || 'GENERAL KNOWLEDGE'}</Text><Text style={styles.round}>QUESTION {state.round} / 10</Text></View>
        <Text style={styles.prompt}>{state.question?.prompt || 'Loading question…'}</Text>
        {!isMyTurn && !answered && <Text style={styles.copy}>Waiting for {state.players[state.turn]} to answer…</Text>}
        {state.question?.options.map((option, index) => {
          const correct = answered && index === state.answerIndex;
          const wrongPick = answered && index === state.selectedIndex && !correct;
          return <TouchableOpacity key={`${state.round}-${index}`} disabled={!isMyTurn || answered || !connected} onPress={() => onAnswer(index)} style={[styles.option, correct && styles.correct, wrongPick && styles.incorrect]}>
            <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text><Text style={styles.optionText}>{option}</Text>
            {correct && <Ionicons name="checkmark-circle" size={19} color={colors.online} />}
            {wrongPick && <Ionicons name="close-circle" size={19} color={colors.error} />}
          </TouchableOpacity>;
        })}
        {answered && <>
          <Text style={[styles.result, state.selectedIndex === state.answerIndex ? styles.good : styles.bad]}>{state.selectedIndex === state.answerIndex ? 'Correct! +1 point' : 'Not quite — the answer is highlighted.'}</Text>
          <TouchableOpacity onPress={onNext} disabled={!connected} style={[styles.button, !connected && styles.disabled]}><Text style={styles.buttonText}>{state.round === 10 ? 'SEE FINAL SCORE' : 'NEXT QUESTION'}</Text><Ionicons name="arrow-forward" size={17} color={colors.background} /></TouchableOpacity>
        </>}
      </>}
    </View>
    <Text style={styles.note}>A fresh set is picked each match. Answers stay hidden until each turn is over.</Text>
  </View>;
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: 36, gap: 13 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 },
  backText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.backgroundElevated },
  dot: { width: 7, height: 7, borderRadius: 4 }, online: { backgroundColor: colors.online }, offline: { backgroundColor: '#F59E0B' },
  connectionText: { color: colors.textSecondary, fontSize: 9, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  copy: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  card: { padding: 16, borderRadius: 17, backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.borderCard, gap: 11 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  questionMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingHeading: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  round: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  prompt: { color: colors.textPrimary, fontSize: 20, lineHeight: 27, fontWeight: '800', marginVertical: 3 },
  scores: { flexDirection: 'row', gap: 10 },
  scoreCard: { flex: 1, minHeight: 73, padding: 11, borderRadius: 13, backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.borderCard },
  activeScore: { borderColor: colors.accent },
  player: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  score: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 3 },
  turn: { position: 'absolute', right: 9, bottom: 9, color: colors.accent, fontSize: 8, fontWeight: '900' },
  option: { minHeight: 49, paddingHorizontal: 11, borderRadius: 11, backgroundColor: colors.backgroundInput, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.borderCard },
  optionLetter: { color: colors.accent, fontSize: 12, fontWeight: '900', width: 18 },
  optionText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', flex: 1 },
  correct: { borderColor: colors.online, backgroundColor: 'rgba(34,197,94,0.08)' },
  incorrect: { borderColor: colors.error, backgroundColor: 'rgba(239,68,68,0.08)' },
  result: { fontSize: 12, fontWeight: '800', textAlign: 'center' }, good: { color: colors.online }, bad: { color: colors.error },
  button: { minHeight: 46, borderRadius: 11, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 5 },
  buttonText: { color: colors.background, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  disabled: { opacity: 0.5 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: colors.backgroundInput, borderWidth: 1, borderColor: colors.borderCard },
  choiceActive: { borderColor: colors.accent, backgroundColor: colors.accentAlpha10 },
  choiceText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  choiceTextActive: { color: colors.accent },
  note: { color: colors.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
