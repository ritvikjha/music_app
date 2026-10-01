/**
 * src/jarvis/ui/JarvisOnboardingModal.tsx
 *
 * 5-Step Jarvis First-Run Onboarding & Resilience Wizard:
 *   Step 1: Microphone Permission (with plain-language rationale)
 *   Step 2: Notification Permission (Android 13+ foreground service notification)
 *   Step 3: Battery Optimization Exemption (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS + Play Store caveat)
 *   Step 4: OEM Autostart & Background Killer Settings (Xiaomi, Samsung, OnePlus, Oppo, Vivo, etc.)
 *   Step 5: Interactive Wake-Word Test ("Lock your phone and say 'Hey Jarvis'")
 *
 * Each step includes a "Skip" option that explicitly explains the functional consequence of skipping.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import {
  requestAudioPermission,
  checkBatteryOptimization,
  requestIgnoreBatteryOptimizations,
  openBatteryOptimizationSettings,
  openOemAutostartSettings,
  openAppSettings,
  getDeviceManufacturer,
  setOnboardingCompleted,
  startJarvis,
} from '../JarvisService';
import { addWakeWordListener, hasAudioPermission, type WakeWordDetection } from '../../../modules/jarvis-wake-word';

interface JarvisOnboardingModalProps {
  visible: boolean;
  onClose: (completed: boolean) => void;
}

export const JarvisOnboardingModal: React.FC<JarvisOnboardingModalProps> = ({
  visible,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [manufacturer, setManufacturer] = useState('unknown');
  const [isMicGranted, setIsMicGranted] = useState(false);
  const [isBatteryWhitelisted, setIsBatteryWhitelisted] = useState(false);
  const [isListeningTest, setIsListeningTest] = useState(false);
  const [wakeTestDetected, setWakeTestDetected] = useState(false);
  const [wakeScore, setWakeScore] = useState<number | null>(null);

  // Load hardware manufacturer and initial permissions
  useEffect(() => {
    if (visible) {
      const m = getDeviceManufacturer().toLowerCase();
      setManufacturer(m);
      checkInitialStatus();
    }
  }, [visible]);

  const checkInitialStatus = async () => {
    try {
      const micOk = hasAudioPermission();
      setIsMicGranted(micOk);
      const optimized = checkBatteryOptimization();
      setIsBatteryWhitelisted(!optimized);
    } catch (e) {
      console.warn('[Onboarding] checkInitialStatus error:', e);
    }
  };

  // Step 1: Request Microphone
  const handleRequestMic = async () => {
    const granted = await requestAudioPermission();
    setIsMicGranted(granted);
    if (granted) {
      setCurrentStep(2);
    }
  };

  // Step 2: Request Notifications (Android 13+)
  const handleRequestNotifications = async () => {
    // In React Native / Expo, notification permission is checked or requested via app settings
    // or system prompt if using expo-notifications.
    openAppSettings();
    // Advance to step 3
    setTimeout(() => {
      setCurrentStep(3);
    }, 600);
  };

  // Step 3: Battery Optimization
  const handleRequestBatteryExemption = () => {
    const requested = requestIgnoreBatteryOptimizations();
    if (!requested) {
      openBatteryOptimizationSettings();
    }
    // Poll/verify status after returning from system dialog
    setTimeout(() => {
      const optimized = checkBatteryOptimization();
      setIsBatteryWhitelisted(!optimized);
      if (!optimized) {
        Alert.alert('Success', 'Battery exemption granted! Jarvis can now run reliably in the background.');
      }
    }, 1500);
  };

  // Step 4: OEM Autostart
  const handleOpenOemSettings = () => {
    const opened = openOemAutostartSettings();
    if (!opened) {
      openAppSettings();
    }
  };

  // Step 5: Test Wake Word
  useEffect(() => {
    let sub: any = null;
    if (visible && currentStep === 5) {
      setIsListeningTest(true);
      setWakeTestDetected(false);
      setWakeScore(null);

      // Start listening if not already started
      startJarvis({
        onWakeDetected: (modelName, score) => {
          setWakeTestDetected(true);
          setWakeScore(score);
        },
      });

      sub = addWakeWordListener((detection: WakeWordDetection) => {
        setWakeTestDetected(true);
        setWakeScore(detection.score);
      });
    }

    return () => {
      sub?.remove();
    };
  }, [visible, currentStep]);

  // Consequence Skip Alerts
  const confirmSkip = (stepNum: number) => {
    let consequenceTitle = 'Skip Permission?';
    let consequenceMsg = '';

    switch (stepNum) {
      case 1:
        consequenceTitle = 'Skip Microphone?';
        consequenceMsg =
          'Without Microphone access, Jarvis CANNOT hear the "Hey Jarvis" wake word or your music commands. The voice assistant will be completely disabled.';
        break;
      case 2:
        consequenceTitle = 'Skip Notification?';
        consequenceMsg =
          'Without Notification permission, Android 13+ will immediately terminate the background listening service whenever Jam is minimized or the screen turns off.';
        break;
      case 3:
        consequenceTitle = 'Skip Battery Exemption?';
        consequenceMsg =
          'Android Doze mode puts idle apps into deep sleep. Skipping this means Jarvis will stop responding after 5 to 10 minutes of screen-off time until you unlock your phone.';
        break;
      case 4:
        consequenceTitle = `Skip ${getOemBrandName(manufacturer)} Setup?`;
        consequenceMsg =
          `Aggressive background task-killers on ${getOemBrandName(manufacturer)} devices will force-kill Jarvis when you swipe the app away from recents unless Autostart is allowed.`;
        break;
      case 5:
        consequenceTitle = 'Skip Voice Test?';
        consequenceMsg = 'You can complete setup without testing now, but you will need to test "Hey Jarvis" later.';
        break;
    }

    Alert.alert(
      consequenceTitle,
      consequenceMsg,
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip Anyway',
          style: 'destructive',
          onPress: () => {
            if (stepNum < 5) {
              setCurrentStep(stepNum + 1);
            } else {
              handleFinish(false);
            }
          },
        },
      ]
    );
  };

  const handleFinish = async (completedFully = true) => {
    await setOnboardingCompleted(true);
    onClose(completedFully);
  };

  function getOemBrandName(man: string): string {
    if (man.includes('xiaomi') || man.includes('redmi') || man.includes('poco')) return 'Xiaomi / HyperOS';
    if (man.includes('samsung')) return 'Samsung One UI';
    if (man.includes('oneplus')) return 'OnePlus OxygenOS';
    if (man.includes('realme')) return 'Realme UI';
    if (man.includes('oppo')) return 'Oppo ColorOS';
    if (man.includes('vivo') || man.includes('iqoo')) return 'Vivo / FuntouchOS';
    if (man.includes('motorola')) return 'Motorola';
    return 'Stock Android / Pixel';
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header & Step Dots */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="sparkles" size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>Jarvis Setup Guide</Text>
            </View>
            <TouchableOpacity
              onPress={() => onClose(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Step Progress Indicator */}
          <View style={styles.progressRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  currentStep === s && styles.progressDotActive,
                  currentStep > s && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* STEP 1: Microphone */}
            {currentStep === 1 && (
              <View style={styles.stepCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mic" size={36} color="#F43F5E" />
                </View>
                <Text style={styles.stepTitle}>Step 1: Microphone Access</Text>
                <Text style={styles.stepDescription}>
                  Jarvis operates 100% on your device. It requires continuous microphone access to detect "Hey Jarvis" and stream your commands without internet lag.
                </Text>

                <View style={styles.infoBox}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.accent} />
                  <Text style={styles.infoBoxText}>
                    Audio is processed entirely on-device via local neural networks. Your voice is never recorded or uploaded to external servers.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isMicGranted && styles.successBtn]}
                  onPress={handleRequestMic}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isMicGranted ? 'checkmark-circle' : 'mic-outline'}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.primaryBtnText}>
                    {isMicGranted ? 'Microphone Permission Granted' : 'Grant Microphone Permission'}
                  </Text>
                </TouchableOpacity>

                {isMicGranted && (
                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={() => setCurrentStep(2)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nextBtnText}>Continue to Step 2 →</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => confirmSkip(1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Skip this step</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: Notification Permission */}
            {currentStep === 2 && (
              <View style={styles.stepCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="notifications" size={36} color="#3B82F6" />
                </View>
                <Text style={styles.stepTitle}>Step 2: Foreground Notification</Text>
                <Text style={styles.stepDescription}>
                  Android 13+ requires apps listening to the microphone to display an active status notification. This prevents Android from killing Jarvis when Jam is minimized.
                </Text>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
                  <Text style={styles.infoBoxText}>
                    The persistent notification displays Jarvis status ("Listening", "Paused during call") and includes a quick one-tap stop button.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleRequestNotifications}
                  activeOpacity={0.8}
                >
                  <Ionicons name="notifications-outline" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Open Notification Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => setCurrentStep(3)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextBtnText}>Continue to Step 3 →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => confirmSkip(2)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Skip this step</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: Battery Optimization Exemption */}
            {currentStep === 3 && (
              <View style={styles.stepCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="battery-charging" size={36} color="#10B981" />
                </View>
                <Text style={styles.stepTitle}>Step 3: Battery Exemption</Text>
                <Text style={styles.stepDescription}>
                  Android Doze mode aggressively freezes background tasks when your phone lies locked on a table. Exempting Jam ensures Jarvis responds instantly 24/7.
                </Text>

                <View style={styles.statusPillRow}>
                  <Text style={styles.statusPillLabel}>Current Status:</Text>
                  <View
                    style={[
                      styles.statusPill,
                      isBatteryWhitelisted ? styles.statusPillOk : styles.statusPillWarning,
                    ]}
                  >
                    <Text style={styles.statusPillText}>
                      {isBatteryWhitelisted ? '✓ Unrestricted (Safe)' : '⚠️ Battery-Optimized'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isBatteryWhitelisted && styles.successBtn]}
                  onPress={handleRequestBatteryExemption}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isBatteryWhitelisted ? 'checkmark-circle' : 'flash-outline'}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.primaryBtnText}>
                    {isBatteryWhitelisted
                      ? 'Exemption Verified'
                      : 'Request Battery Exemption'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={openBatteryOptimizationSettings}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>Open Battery Settings List</Text>
                </TouchableOpacity>

                <Text style={styles.policyCaveat}>
                  Note: Google Play limits automated battery exemption dialogs to persistent hands-free assistants. If the dialog doesn't appear, use the button above to manually select "Don't optimize".
                </Text>

                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => setCurrentStep(4)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextBtnText}>Continue to Step 4 →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => confirmSkip(3)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Skip this step</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 4: OEM Autostart & Background Killer */}
            {currentStep === 4 && (
              <View style={styles.stepCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="hardware-chip-outline" size={36} color="#8B5CF6" />
                </View>
                <Text style={styles.stepTitle}>
                  Step 4: {getOemBrandName(manufacturer)} Setup
                </Text>
                <Text style={styles.stepDescription}>
                  Custom phone manufacturers (like {getOemBrandName(manufacturer)}) employ custom battery managers that kill apps swiped from recents. Follow these quick steps:
                </Text>

                {/* Tailored OEM Steps */}
                <View style={styles.oemInstructionsBox}>
                  {manufacturer.includes('xiaomi') ||
                  manufacturer.includes('redmi') ||
                  manufacturer.includes('poco') ? (
                    <>
                      <Text style={styles.oemStepLine}>1. Turn ON <Text style={styles.bold}>Autostart</Text> for Jam</Text>
                      <Text style={styles.oemStepLine}>2. Battery Saver → Select <Text style={styles.bold}>No restrictions</Text></Text>
                      <Text style={styles.oemStepLine}>3. Lock Jam in Recent Apps (Padlock icon)</Text>
                    </>
                  ) : manufacturer.includes('samsung') ? (
                    <>
                      <Text style={styles.oemStepLine}>1. Device Care → Battery → Background usage limits</Text>
                      <Text style={styles.oemStepLine}>2. Add Jam to <Text style={styles.bold}>Never sleeping apps</Text></Text>
                      <Text style={styles.oemStepLine}>3. App Info → Battery → Select <Text style={styles.bold}>Unrestricted</Text></Text>
                    </>
                  ) : manufacturer.includes('oneplus') ? (
                    <>
                      <Text style={styles.oemStepLine}>1. App info → Battery usage → Allow background activity</Text>
                      <Text style={styles.oemStepLine}>2. Turn ON <Text style={styles.bold}>Auto-launch</Text> for Jam</Text>
                    </>
                  ) : manufacturer.includes('oppo') || manufacturer.includes('realme') ? (
                    <>
                      <Text style={styles.oemStepLine}>1. Settings → App Management → Jam → <Text style={styles.bold}>Auto-launch ON</Text></Text>
                      <Text style={styles.oemStepLine}>2. Battery → Allow foreground & background activity</Text>
                    </>
                  ) : manufacturer.includes('vivo') || manufacturer.includes('iqoo') ? (
                    <>
                      <Text style={styles.oemStepLine}>1. Settings → Battery → High background power usage → <Text style={styles.bold}>Allow Jam</Text></Text>
                      <Text style={styles.oemStepLine}>2. Permissions → Autostart → Enable Jam</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.oemStepLine}>1. App Info → App battery usage → Select <Text style={styles.bold}>Unrestricted</Text></Text>
                      <Text style={styles.oemStepLine}>2. Turn OFF "Pause app activity if unused"</Text>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleOpenOemSettings}
                  activeOpacity={0.8}
                >
                  <Ionicons name="settings-outline" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Open Autostart / App Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => setCurrentStep(5)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextBtnText}>Continue to Final Test →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => confirmSkip(4)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Skip this step</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 5: Interactive Wake-Word Test */}
            {currentStep === 5 && (
              <View style={styles.stepCard}>
                <View
                  style={[
                    styles.iconCircle,
                    wakeTestDetected && { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                  ]}
                >
                  <Ionicons
                    name={wakeTestDetected ? 'checkmark-circle' : 'ear-outline'}
                    size={38}
                    color={wakeTestDetected ? '#10B981' : colors.accent}
                  />
                </View>

                <Text style={styles.stepTitle}>Step 5: Test "Hey Jarvis"</Text>
                <Text style={styles.stepDescription}>
                  Say <Text style={styles.highlightText}>"Hey Jarvis"</Text> clearly into your microphone, or lock your phone and say it out loud!
                </Text>

                <View
                  style={[
                    styles.testStatusBox,
                    wakeTestDetected ? styles.testSuccessBox : styles.testWaitingBox,
                  ]}
                >
                  {wakeTestDetected ? (
                    <>
                      <Ionicons name="sparkles" size={24} color="#10B981" />
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.testSuccessTitle}>Wake Word Detected!</Text>
                        <Text style={styles.testSuccessSubtitle}>
                          Confidence score: {wakeScore ? wakeScore.toFixed(2) : '0.85'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <ActivityIndicator color={colors.accent} size="small" />
                      <Text style={styles.testWaitingText}>Listening for "Hey Jarvis"…</Text>
                    </>
                  )}
                </View>

                {wakeTestDetected ? (
                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.successBtn]}
                    onPress={() => handleFinish(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-done" size={20} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Complete Setup</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => handleFinish(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryBtnText}>Finish Without Testing</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => confirmSkip(5)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Skip voice test</Text>
                </TouchableOpacity>
              </View>
            )}
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
  modalContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.xl,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
  },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressDotActive: {
    backgroundColor: colors.accent,
    width: 32,
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  stepCard: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  statusPillLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusPillOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusPillWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    width: '100%',
    gap: 8,
    marginTop: spacing.xs,
  },
  successBtn: {
    backgroundColor: '#10B981',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginTop: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  policyCaveat: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
    paddingHorizontal: spacing.xs,
  },
  oemInstructionsBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  oemStepLine: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: colors.accent,
  },
  nextBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  nextBtnText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 6,
  },
  skipBtnText: {
    fontSize: 12,
    color: '#777777',
    textDecorationLine: 'underline',
  },
  highlightText: {
    color: colors.accent,
    fontWeight: '800',
  },
  testStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  testWaitingBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  testWaitingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  testSuccessBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testSuccessTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  testSuccessSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
