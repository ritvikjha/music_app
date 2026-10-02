/**
 * src/jarvis/ui/JarvisStatsModal.tsx
 *
 * Full-featured Weekly Usage Stats, Voice ID Security,
 * and Extensibility (Routines & Phrase Aliases) Dashboard.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { getWeeklyUsageStats, type WeeklyStats } from '../eventLogger';
import { isVoiceIdEnabled, setVoiceIdEnabled, isVoiceEnrolled, enrollVoice } from '../safety/voiceId';
import { getAllRoutines, getAllAliases, deleteRoutine } from '../memory/routines';

interface JarvisStatsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const JarvisStatsModal: React.FC<JarvisStatsModalProps> = ({ visible, onClose }) => {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [voiceIdActive, setVoiceIdActive] = useState(false);
  const [voiceEnrolled, setVoiceEnrolled] = useState(false);
  const [routines, setRoutines] = useState<Record<string, string[]>>({});
  const [aliases, setAliases] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      const s = await getWeeklyUsageStats();
      setStats(s);

      const enrolled = await isVoiceEnrolled();
      setVoiceEnrolled(enrolled);

      const enabled = await isVoiceIdEnabled();
      setVoiceIdActive(enabled);

      const r = await getAllRoutines();
      setRoutines(r);

      const a = await getAllAliases();
      setAliases(a);
    } catch (e) {
      console.warn('[JarvisStatsModal] Error loading stats:', e);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const toggleVoiceId = async (val: boolean) => {
    if (val && !voiceEnrolled) {
      await enrollVoice(0.85);
      setVoiceEnrolled(true);
    }
    await setVoiceIdEnabled(val);
    setVoiceIdActive(val);
  };

  const handleDeleteRoutine = async (name: string) => {
    await deleteRoutine(name);
    const updated = await getAllRoutines();
    setRoutines(updated);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="stats-chart" size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>Jarvis Intelligence</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Section 1: Weekly Telemetry */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Weekly Telemetry</Text>
              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats?.totalWakesThisWeek ?? 0}</Text>
                  <Text style={styles.statLabel}>Wakes This Week</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats?.busiestHour ?? '11 AM'}</Text>
                  <Text style={styles.statLabel}>Busiest Time</Text>
                </View>
              </View>

              {/* Top Commands */}
              <Text style={[styles.cardHeader, { marginTop: 14, fontSize: 13 }]}>Most-Used Commands</Text>
              {stats?.topCommands && stats.topCommands.length > 0 ? (
                stats.topCommands.map((item, idx) => (
                  <View key={item.intent} style={styles.commandRow}>
                    <Text style={styles.commandRank}>#{idx + 1}</Text>
                    <Text style={styles.commandName}>{item.intent.replace(/_/g, ' ')}</Text>
                    <Text style={styles.commandCount}>{item.count}×</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No commands recorded yet this week.</Text>
              )}
            </View>

            {/* Section 2: Voice ID & Speaker Verification */}
            <View style={styles.card}>
              <View style={styles.voiceIdHeader}>
                <View style={styles.shieldIconContainer}>
                  <Ionicons
                    name={voiceIdActive ? 'shield-checkmark' : 'shield-outline'}
                    size={20}
                    color={voiceIdActive ? colors.accent : colors.textSecondary}
                  />
                  <Text style={styles.cardHeader}>Voice ID Security</Text>
                </View>
                <Switch
                  value={voiceIdActive}
                  onValueChange={toggleVoiceId}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>
              <Text style={styles.cardDesc}>
                Restricts sensitive operations (WhatsApp sending, calls, and emergency protocols) to your verified voiceprint only.
              </Text>
              <View style={styles.voiceStatusPill}>
                <Text style={styles.voiceStatusText}>
                  Operator: <Text style={{ color: '#fff', fontWeight: '700' }}>Ritvik</Text> (Verified Voiceprint)
                </Text>
              </View>
            </View>

            {/* Section 3: User Routines */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.cardHeader}>User Routines</Text>
                <Text style={styles.badgeCount}>{Object.keys(routines).length}</Text>
              </View>
              <Text style={styles.cardDesc}>
                Teach Jarvis multi-command sequences: "Remember this as 'leaving home': wifi off, bluetooth on, play my usual".
              </Text>
              {Object.keys(routines).length > 0 ? (
                Object.entries(routines).map(([name, actions]) => (
                  <View key={name} style={styles.routineItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routineName}>"{name}"</Text>
                      <Text style={styles.routineSteps}>{actions.join(' → ')}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteRoutine(name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No routines created yet.</Text>
              )}
            </View>

            {/* Section 4: Custom Phrase Aliases */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.cardHeader}>Phrase Mappings</Text>
                <Text style={styles.badgeCount}>{Object.keys(aliases).length}</Text>
              </View>
              <Text style={styles.cardDesc}>
                Map custom phrases: "When I say 'go dark' execute night protocol".
              </Text>
              {Object.keys(aliases).length > 0 ? (
                Object.entries(aliases).map(([phrase, target]) => (
                  <View key={phrase} style={styles.routineItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routineName}>"{phrase}"</Text>
                      <Text style={styles.routineSteps}>Triggers: "{target}"</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No phrase mappings created yet.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollBody: {
    padding: spacing.md,
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
  },
  statValue: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  commandRank: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 12,
    width: 24,
  },
  commandName: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 13,
  },
  commandCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  voiceIdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shieldIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceStatusPill: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  voiceStatusText: {
    color: colors.accent,
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeCount: {
    color: colors.accent,
    backgroundColor: 'rgba(0,229,255,0.1)',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  routineName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  routineSteps: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },
});
