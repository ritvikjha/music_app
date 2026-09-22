import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../context/SleepTimerContext';
import { colors, spacing, borderRadius, typography } from '../theme';

interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: 'End of Track', minutes: 0 },
];

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min >= 60) {
    const hr = Math.floor(min / 60);
    const remMin = min % 60;
    return `${hr}:${remMin.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Glassmorphism modal for selecting a sleep timer duration.
 * Shows the active countdown when a timer is running.
 */
export function SleepTimerModal({ visible, onClose }: SleepTimerModalProps) {
  const { isActive, remainingMs, timerLabel, startTimer, cancelTimer } = useSleepTimer();

  const handleSelect = (minutes: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    startTimer(minutes);
    onClose();
  };

  const handleCancel = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    cancelTimer();
    onClose();
  };

  const modalContent = (
    <View style={styles.modalContent}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="moon" size={22} color={colors.accent} />
        <Text style={styles.title}>Sleep Timer</Text>
      </View>

      {/* Active Timer Display */}
      {isActive && (
        <View style={styles.activeTimer}>
          <Text style={styles.activeLabel}>{timerLabel} remaining</Text>
          <Text style={styles.countdown}>{formatRemaining(remainingMs)}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Ionicons name="close-circle" size={16} color={colors.error} />
            <Text style={styles.cancelText}>Cancel Timer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Divider */}
      {isActive && <View style={styles.divider} />}

      {/* Options */}
      <Text style={styles.sectionLabel}>
        {isActive ? 'Change Timer' : 'Stop playing after'}
      </Text>
      {TIMER_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.minutes}
          style={styles.option}
          onPress={() => handleSelect(option.minutes)}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <Ionicons
              name={option.minutes === 0 ? 'musical-note' : 'time-outline'}
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.optionText}>{option.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={90} tint="dark" style={styles.blurContainer}>
                <View style={styles.glassOverlay}>
                  {modalContent}
                </View>
              </BlurView>
            ) : (
              <View style={styles.androidContainer}>
                {modalContent}
              </View>
            )}
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(22, 21, 28, 0.45)',
  },
  androidContainer: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderTopColor: colors.accentAlpha25,
  },
  modalContent: {
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl + 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  activeTimer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.accentAlpha10,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  activeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  countdown: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(224, 138, 138, 0.1)',
    borderRadius: borderRadius.full,
  },
  cancelText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionText: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  closeText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
});
