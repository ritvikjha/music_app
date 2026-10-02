/**
 * src/jarvis/ui/JarvisVoiceIdModal.tsx
 *
 * 3-Step Guided On-Device Voice ID Enrollment Modal.
 *
 * Captures 3 voice samples locally via ONNX embedding model (96-d acoustic d-vector).
 * Zero cloud APIs, 100% private on-device speaker verification.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { startVoiceIdEnrollment, captureVoiceIdSample } from '../JarvisService';

interface JarvisVoiceIdModalProps {
  visible: boolean;
  onClose: () => void;
  onEnrolledSuccess: () => void;
}

const ENROLLMENT_PHRASES = [
  'Hey Jarvis, I am your commander',
  'Hey Jarvis, authorize sensitive actions',
  'Hey Jarvis, this is my voice',
];

export const JarvisVoiceIdModal: React.FC<JarvisVoiceIdModalProps> = ({
  visible,
  onClose,
  onEnrolledSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleStartEnrollment = () => {
    setCurrentStep(1);
    setErrorMessage(null);
    setIsCompleted(false);
    startVoiceIdEnrollment();
  };

  const handleRecordSample = async () => {
    try {
      setIsRecording(true);
      setErrorMessage(null);

      const res = await captureVoiceIdSample(2500);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to capture voice features. Speak louder and try again.');
        setIsRecording(false);
        return;
      }

      if (res.isComplete) {
        setIsCompleted(true);
        setIsRecording(false);
        setTimeout(() => {
          onEnrolledSuccess();
          onClose();
        }, 1800);
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, 3));
        setIsRecording(false);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error recording voice sample');
      setIsRecording(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={handleStartEnrollment}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.shieldIconBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Voice ID Enrollment</Text>
                <Text style={styles.headerSubtitle}>On-Device Speaker Verification</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {isCompleted ? (
            <View style={styles.completedContainer}>
              <View style={styles.successRing}>
                <Ionicons name="checkmark-done-circle" size={64} color="#10B981" />
              </View>
              <Text style={styles.completedTitle}>Voice ID Enrolled!</Text>
              <Text style={styles.completedSubtitle}>
                Your unique acoustic voiceprint has been saved locally. Sensitive actions (payments, WhatsApp, notifications) are now gated to your voice.
              </Text>
            </View>
          ) : (
            <View style={styles.content}>
              {/* Step indicator */}
              <View style={styles.stepsRow}>
                {[1, 2, 3].map((step) => {
                  const done = step < currentStep;
                  const active = step === currentStep;
                  return (
                    <View key={step} style={styles.stepIndicatorCol}>
                      <View
                        style={[
                          styles.stepDot,
                          done && styles.stepDotDone,
                          active && styles.stepDotActive,
                        ]}
                      >
                        {done ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : (
                          <Text
                            style={[
                              styles.stepDotText,
                              active && styles.stepDotTextActive,
                            ]}
                          >
                            {step}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          active && styles.stepLabelActive,
                        ]}
                      >
                        Sample {step}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Phrase prompt card */}
              <View style={styles.phraseCard}>
                <Text style={styles.phrasePromptLabel}>Say this clearly at normal volume:</Text>
                <View style={styles.quoteRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6366F1" />
                  <Text style={styles.phraseText}>
                    "{ENROLLMENT_PHRASES[currentStep - 1]}"
                  </Text>
                </View>
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Record Button */}
              <View style={styles.recordActionArea}>
                <TouchableOpacity
                  style={[
                    styles.micRecordButton,
                    isRecording && styles.micRecordButtonRecording,
                  ]}
                  onPress={handleRecordSample}
                  disabled={isRecording}
                  activeOpacity={0.8}
                >
                  {isRecording ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="mic" size={28} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <Text style={styles.recordActionHint}>
                  {isRecording
                    ? 'Listening & extracting features (2.5s)…'
                    : `Tap to record Sample ${currentStep} of 3`}
                </Text>
              </View>

              {/* Privacy Footer */}
              <View style={styles.privacyFooter}>
                <Ionicons name="lock-closed-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.privacyFooterText}>
                  100% on-device • 96-d neural embedding • Audio never leaves your phone
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1E1E26',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + 12,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shieldIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  content: {
    marginTop: spacing.sm,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#6366F1',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderWidth: 3,
  },
  stepDotDone: {
    backgroundColor: '#10B981',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stepLabelActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  phraseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: spacing.md,
  },
  phrasePromptLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phraseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E0E7FF',
    flex: 1,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    flex: 1,
  },
  recordActionArea: {
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  micRecordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  micRecordButtonRecording: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  recordActionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  privacyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  privacyFooterText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  completedContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  successRing: {
    marginBottom: spacing.xs,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  completedSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
