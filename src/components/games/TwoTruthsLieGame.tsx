import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { OnlineDuelPanel } from './OnlineDuelPanel';
import type { OnlineDuelState } from '../../types';

interface Props { players: string[]; onBackToHub: () => void; myName: string; onlineState: OnlineDuelState | null; connected: boolean; roomMemberCount: number; onPlayOnline: () => void; onOnlineAction: (action: Record<string, unknown>) => void; onlinePending: boolean; roomId: string | null; onShareRoom: () => void; onEditPlayer: (index: number) => void }
type Phase = 'write' | 'handoff' | 'guess' | 'result';

export function TwoTruthsLieGame({ players, onBackToHub, myName, onlineState, connected, roomMemberCount, onPlayOnline, onOnlineAction, onlinePending, roomId, onShareRoom, onEditPlayer }: Props) {
  const duo = [players[0] || 'Player 1', players[1] || 'Player 2'];
  const [storyteller, setStoryteller] = useState(0);
  const [round, setRound] = useState(1);
  const [statements, setStatements] = useState(['', '', '']);
  const [lieIndex, setLieIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('write');
  const [guessIndex, setGuessIndex] = useState<number | null>(null);
  const [scores, setScores] = useState([0, 0]);
  const [error, setError] = useState('');

  const guesser = 1 - storyteller;

  if (onlineState?.type === 'two_truths_lie') {
    return <OnlineDuelPanel
      type="two_truths_lie"
      state={onlineState}
      myName={myName}
      connected={connected}
      roomMemberCount={roomMemberCount}
      onWord={() => {}}
      onStatements={(items, lie) => onOnlineAction({ type: 'statements', statements: items, lieIndex: lie })}
      onGuess={(index) => onOnlineAction({ type: 'guess', index })}
      onNext={() => onOnlineAction({ type: 'next' })}
      onRematch={(gameType) => onOnlineAction({ type: 'rematch-vote', gameType })}
      onBack={onBackToHub}
    />;
  }

  const setStatement = (index: number, value: string) => {
    setStatements((previous) => previous.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const submitStatements = () => {
    const normalized = statements.map((statement) => statement.trim().toLowerCase());
    if (normalized.some((statement) => !statement)) {
      setError('Fill in all three statements first.');
      return;
    }
    if (new Set(normalized).size !== 3) {
      setError('Make each statement different.');
      return;
    }
    if (lieIndex === null) {
      setError('Tap one statement to secretly mark it as the lie.');
      return;
    }
    setError('');
    setPhase('handoff');
  };

  const submitGuess = (index: number) => {
    setGuessIndex(index);
    if (index === lieIndex) {
      setScores((previous) => previous.map((score, playerIndex) => playerIndex === guesser ? score + 1 : score));
    }
    setPhase('result');
  };

  const nextRound = () => {
    setStoryteller(guesser);
    setRound((previous) => previous + 1);
    setStatements(['', '', '']);
    setLieIndex(null);
    setGuessIndex(null);
    setError('');
    setPhase('write');
  };

  const rematch = () => {
    setStoryteller(0); setRound(1); setStatements(['', '', '']); setLieIndex(null);
    setGuessIndex(null); setScores([0, 0]); setError(''); setPhase('write');
  };

  return (
    <View style={styles.page}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBackToHub} style={styles.backButton} accessibilityLabel="Back to games">
          <Ionicons name="arrow-back" size={17} color={colors.textSecondary} /><Text style={styles.backText}>GAMES</Text>
        </TouchableOpacity>
        <View style={styles.modePill}><Ionicons name="people" size={12} color={colors.accentSecondary} /><Text style={styles.modeText}>PASS & PLAY · 1V1</Text></View>
      </View>

      <TouchableOpacity onPress={onlinePending && roomId ? onShareRoom : onPlayOnline} style={styles.onlineButton} activeOpacity={0.82}>
        <Ionicons name="people-outline" size={16} color={colors.accent} />
        <Text style={styles.onlineButtonText}>{onlinePending ? (roomId ? `Waiting for friend · ${roomId}` : 'Opening a room for your friend…') : 'Play with a friend online'}</Text>
        <Ionicons name={onlinePending && roomId ? 'share-outline' : 'arrow-forward'} size={15} color={colors.accent} />
      </TouchableOpacity>

      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>HOW WELL DO YOU KNOW THEM?</Text>
        <Text style={styles.title}>Two Truths{ '\n' }& a Lie</Text>
        <Text style={styles.subtitle}>Three statements. One lie. Read your opponent and spot the fake.</Text>
      </View>

      <View style={styles.scoreStrip}>
        {[0, 1].map((index) => (
          <View key={index} style={[styles.scorePlayer, (phase !== 'result' && index === storyteller) && styles.scorePlayerActive]}>
            <View style={styles.scoreAvatar}><Text style={styles.avatarLetter}>{duo[index].slice(0, 1).toUpperCase()}</Text></View>
            <View style={styles.scoreInfo}><TouchableOpacity onPress={() => onEditPlayer(index)} accessibilityLabel={`Change ${duo[index]}'s name`}><Text style={styles.scoreName} numberOfLines={1}>{duo[index]}  ✎</Text></TouchableOpacity><Text style={styles.scoreCaption}>{index === storyteller ? 'TELLING THIS ROUND' : 'GUESSER'}</Text></View>
            <Text style={styles.score}>{scores[index]}</Text>
          </View>
        ))}
        <View style={styles.roundPill}><Text style={styles.roundLabel}>ROUND</Text><Text style={styles.roundNumber}>{String(round).padStart(2, '0')}</Text></View>
      </View>

      {phase === 'write' && (
        <View style={styles.panel}>
          <View style={styles.panelHeadingRow}><View><Text style={styles.panelEyebrow}>YOUR TURN TO TELL</Text><Text style={styles.panelTitle}>{duo[storyteller]}</Text></View><Ionicons name="create-outline" size={23} color={colors.accentSecondary} /></View>
          <Text style={styles.helper}>Write two true things and one convincing lie. Tap the eye beside the lie to mark it privately.</Text>
          {statements.map((statement, index) => (
            <View key={index} style={[styles.statementEntry, lieIndex === index && styles.statementEntrySelected]}>
              <View style={[styles.numberBadge, lieIndex === index && styles.numberBadgeSelected]}><Text style={[styles.numberText, lieIndex === index && styles.numberTextSelected]}>{index + 1}</Text></View>
              <TextInput value={statement} onChangeText={(value) => setStatement(index, value)} placeholder={`Statement ${index + 1}`} placeholderTextColor={colors.textMuted} style={styles.statementInput} maxLength={120} multiline />
              <TouchableOpacity onPress={() => setLieIndex(index)} accessibilityLabel={`Mark statement ${index + 1} as the lie`} style={{ padding: 7 }}>
                <Ionicons name={lieIndex === index ? 'eye-off' : 'ellipse-outline'} size={17} color={lieIndex === index ? colors.neonPink : colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          <Text style={styles.secretHint}><Ionicons name="lock-closed" size={11} color={colors.neonPink} /> Your lie stays hidden until the guess.</Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity onPress={submitStatements} style={styles.primaryButton} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>LOCK IN & PASS PHONE</Text><Ionicons name="arrow-forward" size={16} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}

      {phase === 'handoff' && (
        <View style={styles.handoffCard}>
          <View style={styles.handoffIcon}><Ionicons name="phone-portrait-outline" size={28} color={colors.accent} /></View>
          <Text style={styles.handoffEyebrow}>PASS THE PHONE</Text>
          <Text style={styles.handoffTitle}>Your turn, {duo[guesser]}</Text>
          <Text style={styles.handoffDesc}>Don’t peek at the marked lie. Hand over the phone, then reveal the statements.</Text>
          <TouchableOpacity onPress={() => setPhase('guess')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>I’M READY</Text><Ionicons name="arrow-forward" size={16} color={colors.background} /></TouchableOpacity>
        </View>
      )}

      {(phase === 'guess' || phase === 'result') && (
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>{phase === 'guess' ? 'PICK THE LIE' : 'THE REVEAL'}</Text>
          <Text style={styles.panelTitle}>{phase === 'guess' ? `${duo[guesser]}, what sounds fake?` : (guessIndex === lieIndex ? 'Nailed it.' : 'They got you.')}</Text>
          <Text style={styles.helper}>{phase === 'guess' ? 'Choose one statement. Trust your instincts.' : `${duo[storyteller]}’s lie was statement ${Number(lieIndex) + 1}.`}</Text>
          {statements.map((statement, index) => {
            const isLie = phase === 'result' && index === lieIndex;
            const guessed = phase === 'result' && index === guessIndex;
            return (
              <TouchableOpacity key={index} disabled={phase === 'result'} onPress={() => submitGuess(index)} style={[styles.statementCard, isLie && styles.statementCardLie, guessed && !isLie && styles.statementCardWrong]} activeOpacity={0.8}>
                <View style={[styles.numberBadge, isLie && styles.numberBadgeSelected]}><Text style={[styles.numberText, isLie && styles.numberTextSelected]}>{index + 1}</Text></View>
                <Text style={styles.statementText}>{statement}</Text>
                {isLie && <Ionicons name="sparkles" size={16} color={colors.neonPink} />}
                {guessed && !isLie && <Ionicons name="close-circle" size={16} color={colors.textMuted} />}
              </TouchableOpacity>
            );
          })}
          {phase === 'result' && <Text style={[styles.resultLine, guessIndex === lieIndex ? styles.resultGood : styles.resultBad]}>{guessIndex === lieIndex ? `${duo[guesser]} earns a point` : `${duo[guesser]} missed the lie`}</Text>}
          {phase === 'result' && <TouchableOpacity onPress={nextRound} style={styles.primaryButton}><Text style={styles.primaryButtonText}>NEXT ROUND · {duo[guesser]}</Text><Ionicons name="arrow-forward" size={16} color={colors.background} /></TouchableOpacity>}
          {phase === 'result' && <TouchableOpacity onPress={rematch} style={styles.rematchButton}><Text style={styles.rematchText}>PLAY AGAIN</Text></TouchableOpacity>}
        </View>
      )}
      <Text style={styles.handoffNote}>Two players · one phone · take turns telling</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: 36, gap: spacing.lg },
  onlineButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.borderCard, flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineButtonText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingRight: 10 },
  backText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: borderRadius.full, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: colors.violetAlpha10, borderWidth: 1, borderColor: colors.borderViolet },
  modeText: { color: colors.neonViolet, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  titleBlock: { gap: 5, paddingTop: 2 },
  eyebrow: { color: colors.accentSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.textPrimary, fontSize: 32, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, maxWidth: 360 },
  scoreStrip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scorePlayer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.backgroundElevated, borderColor: colors.borderCard, borderWidth: 1, borderRadius: 14, padding: 9 },
  scorePlayerActive: { borderColor: colors.accentSecondary, backgroundColor: '#171625' },
  scoreAvatar: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetAlpha10 },
  avatarLetter: { color: colors.neonViolet, fontWeight: '900', fontSize: 13 },
  scoreInfo: { flex: 1 },
  scoreName: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
  scoreCaption: { color: colors.textMuted, fontSize: 7, letterSpacing: 0.5, marginTop: 3, fontWeight: '800' },
  score: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', paddingHorizontal: 3 },
  roundPill: { alignItems: 'center', paddingHorizontal: 9 },
  roundLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '800', letterSpacing: 0.7 },
  roundNumber: { color: colors.accent, fontSize: 15, fontWeight: '900', marginTop: 2 },
  panel: { backgroundColor: colors.backgroundElevated, borderRadius: 19, borderWidth: 1, borderColor: colors.borderCard, padding: 16 },
  panelHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelEyebrow: { color: colors.accentSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  panelTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 4 },
  helper: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 14 },
  statementEntry: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, borderRadius: 13, paddingHorizontal: 10, marginBottom: 8, backgroundColor: colors.backgroundInput, borderWidth: 1, borderColor: colors.borderCard },
  statementEntrySelected: { borderColor: colors.neonPink, backgroundColor: 'rgba(244,63,94,0.08)' },
  numberBadge: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2A38' },
  numberBadgeSelected: { backgroundColor: 'rgba(244,63,94,0.16)' },
  numberText: { color: colors.textSecondary, fontWeight: '800', fontSize: 11 },
  numberTextSelected: { color: colors.neonPink },
  statementInput: { flex: 1, color: colors.textPrimary, paddingVertical: 10, fontSize: 13, minHeight: 48 },
  secretHint: { color: colors.textMuted, fontSize: 10, marginTop: 2, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 11, marginBottom: 10 },
  primaryButton: { minHeight: 48, borderRadius: 13, paddingHorizontal: 15, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.accent },
  primaryButtonText: { color: colors.background, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  handoffCard: { alignItems: 'center', backgroundColor: colors.backgroundElevated, borderRadius: 20, borderWidth: 1, borderColor: colors.borderNeon, padding: 22 },
  handoffIcon: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.accentAlpha10, marginBottom: 17 },
  handoffEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  handoffTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  handoffDesc: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 12 },
  statementCard: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 8, backgroundColor: colors.backgroundInput, borderWidth: 1, borderColor: colors.borderCard },
  statementCardLie: { borderColor: colors.neonPink, backgroundColor: 'rgba(244,63,94,0.08)' },
  statementCardWrong: { opacity: 0.65 },
  statementText: { flex: 1, color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
  resultLine: { textAlign: 'center', fontSize: 12, fontWeight: '800', marginTop: 5 },
  resultGood: { color: colors.accentLight }, resultBad: { color: colors.neonPink },
  rematchButton: { alignItems: 'center', padding: 12, marginTop: 4 },
  rematchText: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  handoffNote: { textAlign: 'center', color: colors.textMuted, fontSize: 10, letterSpacing: 0.5 },
});
