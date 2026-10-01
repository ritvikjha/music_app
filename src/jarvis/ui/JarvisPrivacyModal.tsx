/**
 * src/jarvis/ui/JarvisPrivacyModal.tsx
 *
 * "How Jarvis Works & Privacy" disclosure modal:
 *   1. Continuous wake-word detection runs 100% locally on-device (openWakeWord ONNX Runtime).
 *   2. Zero audio is ever recorded, stored, or sent to external servers.
 *   3. Android speech recognition runs on-device. Only text transcripts (never audio)
 *      are sent to the self-hosted AI proxy, and only when a query requires cloud LLM fallback.
 *   4. Native device controls (flashlight, volume, timers, apps) execute 100% offline in Kotlin.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';

interface JarvisPrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const JarvisPrivacyModal: React.FC<JarvisPrivacyModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.shieldIconBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.headerTitle}>How Jarvis Works</Text>
                <Text style={styles.headerSubtitle}>Privacy & On-Device Security</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Pillar 1: 100% On-Device Wake Word */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarIconRow}>
                <Ionicons name="hardware-chip-outline" size={22} color={colors.accent} />
                <Text style={styles.pillarTitle}>100% On-Device Wake Word</Text>
              </View>
              <Text style={styles.pillarBody}>
                Continuous background listening for "Hey Jarvis" and "Hello Jarvis" executes entirely on your phone via ONNX Runtime neural network models. Audio buffers are kept in RAM for fractions of a second and immediately discarded.
              </Text>
            </View>

            {/* Pillar 2: Zero Audio Storage or Uploads */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarIconRow}>
                <Ionicons name="mic-off-outline" size={22} color="#10B981" />
                <Text style={styles.pillarTitle}>Zero Audio Sent or Stored</Text>
              </View>
              <Text style={styles.pillarBody}>
                Jam never uploads your voice audio to the cloud. Spoken commands are transcribed directly on your Android device using Android Speech Services with offline language packs.
              </Text>
            </View>

            {/* Pillar 3: Offline-First Device Actions */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarIconRow}>
                <Ionicons name="flash-outline" size={22} color="#F59E0B" />
                <Text style={styles.pillarTitle}>Offline-First Control</Text>
              </View>
              <Text style={styles.pillarBody}>
                Music playback, flashlight, volume, alarms, timers, and app launching execute natively in Kotlin on-device in under 50 milliseconds without requiring an active internet connection.
              </Text>
            </View>

            {/* Pillar 4: Text-Only LLM Fallback */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarIconRow}>
                <Ionicons name="cloud-outline" size={22} color="#38BDF8" />
                <Text style={styles.pillarTitle}>Private AI Proxy (Text Only)</Text>
              </View>
              <Text style={styles.pillarBody}>
                Only when you ask an open-ended conversational question or an ambiguous music search does the transcribed text (never audio) pass through your private server proxy to Gemini.
              </Text>
            </View>

            {/* Privacy Badges Summary */}
            <View style={styles.badgesRow}>
              <View style={styles.badgeItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.badgeText}>No Voice Recordings</Text>
              </View>
              <View style={styles.badgeItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.badgeText}>No Ad Tracking</Text>
              </View>
              <View style={styles.badgeItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.badgeText}>Open ONNX Weights</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.gotItBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.gotItBtnText}>Understood</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.xl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  pillarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  pillarIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pillarBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  gotItBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotItBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
