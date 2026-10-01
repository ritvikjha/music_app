/**
 * src/jarvis/ui/JarvisSettingsSection.tsx
 *
 * Jarvis configuration settings rendered in Profile when Jarvis is enabled:
 *   1. Wake Sensitivity Slider / Stepper (0.20 - 0.80, default 0.50)
 *   2. Voice Replies Toggle (Spoken TTS vs Silent/Toast)
 *   3. Beep Only Mode (Audio earcon confirmation tones only)
 *   4. Recognition Language: English (India) [en-IN] / Hindi [hi-IN] / Auto
 *   5. "Only listen while charging" toggle (Battery saver mode)
 *   6. "View System Logs" button (opens Jarvis Debug modal)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import {
  getWakeSensitivity,
  setWakeSensitivity,
  isVoiceRepliesEnabled,
  setVoiceRepliesEnabled,
  isBeepOnly,
  setBeepOnly,
  getPreferredLanguage,
  setPreferredLanguage,
  isOnlyListenWhileCharging,
  setOnlyListenWhileCharging,
  getSelectedWakeModel,
  setSelectedWakeModel,
  type WakePhraseModel,
  getVoicePersona,
  setVoicePersona,
  type VoicePersona,
  isAccessibilityServiceActive,
  openAccessibilitySettings,
  isWhatsAppAutoSendEnabled,
  setWhatsAppAutoSendEnabled,
  startAutoScroll,
  stopAutomation,
  isAutomationRunning,
} from '../JarvisService';
import { JarvisPrivacyModal } from './JarvisPrivacyModal';


interface JarvisSettingsSectionProps {
  onOpenDebugModal: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const JarvisSettingsSection: React.FC<JarvisSettingsSectionProps> = ({
  onOpenDebugModal,
  showToast,
}) => {
  const [sensitivity, setSensitivityState] = useState(0.5);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [beepOnly, setBeepOnlyMode] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  const [chargingOnly, setChargingOnly] = useState(false);
  const [wakeModel, setWakeModelState] = useState<WakePhraseModel>('both');
  const [voicePersona, setVoicePersonaState] = useState<VoicePersona>('stark_uk');
  const [whatsAppAutoSend, setWhatsAppAutoSend] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [a11yActive, setA11yActive] = useState(false);
  const [isAutoScrollingActive, setIsAutoScrollingActive] = useState(false);

  useEffect(() => {
    const checkA11y = () => {
      const active = isAccessibilityServiceActive();
      setA11yActive(active);
      setIsAutoScrollingActive(isAutomationRunning());
    };

    checkA11y();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkA11y();
      }
    });

    (async () => {
      try {
        const sens = await getWakeSensitivity();
        setSensitivityState(sens);

        const vr = await isVoiceRepliesEnabled();
        setVoiceReplies(vr);

        const bo = await isBeepOnly();
        setBeepOnlyMode(bo);

        const lang = await getPreferredLanguage();
        setLanguage(lang);

        const co = await isOnlyListenWhileCharging();
        setChargingOnly(co);

        const wm = await getSelectedWakeModel();
        setWakeModelState(wm);

        const vp = await getVoicePersona();
        setVoicePersonaState(vp);

        const autoSend = await isWhatsAppAutoSendEnabled();
        const active = isAccessibilityServiceActive();
        setA11yActive(active);
        setWhatsAppAutoSend(autoSend && active);
      } catch (e) {
        console.warn('[JarvisSettingsSection] init error:', e);
      }
    })();

    return () => sub.remove();
  }, []);

  const handleToggleWhatsAppAutoSend = async (val: boolean) => {
    if (val) {
      const active = isAccessibilityServiceActive();
      if (!active) {
        Alert.alert(
          'Enable Jarvis Automation',
          'Hands-Free WhatsApp Auto-Send uses Android Accessibility Service to automatically tap "Send" and return you to Jam.\n\nTap "Open Settings", look for "Jarvis Automation" under Downloaded Apps/Accessibility, and turn it ON.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setWhatsAppAutoSend(false),
            },
            {
              text: 'Open Settings',
              onPress: () => {
                openAccessibilitySettings();
                setWhatsAppAutoSend(true);
                setWhatsAppAutoSendEnabled(true);
                showToast('Please enable "Jarvis Automation" in settings', 'info');
              },
            },
          ]
        );
        return;
      }
    }
    setWhatsAppAutoSend(val);
    await setWhatsAppAutoSendEnabled(val);
    showToast(
      val
        ? 'Hands-Free WhatsApp auto-send enabled'
        : 'Hands-Free WhatsApp auto-send disabled',
      'info'
    );
  };


  const handleSensitivityChange = async (newVal: number) => {
    const clamped = Math.round(Math.max(0.2, Math.min(0.85, newVal)) * 100) / 100;
    setSensitivityState(clamped);
    await setWakeSensitivity(clamped);
  };

  const handleToggleVoiceReplies = async (val: boolean) => {
    setVoiceReplies(val);
    await setVoiceRepliesEnabled(val);
    showToast(val ? 'Voice replies enabled' : 'Voice replies muted', 'info');
  };

  const handleToggleBeepOnly = async (val: boolean) => {
    setBeepOnlyMode(val);
    await setBeepOnly(val);
    showToast(val ? 'Beep only mode enabled' : 'Standard voice responses enabled', 'info');
  };

  const handleSelectLanguage = async (lang: string) => {
    setLanguage(lang);
    await setPreferredLanguage(lang);
    const label = lang === 'hi-IN' ? 'Hindi (India)' : lang === 'auto' ? 'Auto (English/Hindi)' : 'English (India)';
    showToast(`Speech language set to ${label}`, 'info');
  };

  const handleToggleChargingOnly = async (val: boolean) => {
    setChargingOnly(val);
    await setOnlyListenWhileCharging(val);
    showToast(val ? 'Jarvis will only listen while charging' : 'Always-on battery listening enabled', 'info');
  };

  const handleSelectWakeModel = async (model: WakePhraseModel) => {
    setWakeModelState(model);
    await setSelectedWakeModel(model);
    const label =
      model === 'both'
        ? '"Hey" or "Hello Jarvis" (Dual)'
        : model === 'hello_jarvis'
        ? '"Hello Jarvis"'
        : '"Hey Jarvis" (more reliable)';
    showToast(`Wake phrase set to ${label}`, 'info');
  };

  const handleSelectVoicePersona = async (p: VoicePersona) => {
    setVoicePersonaState(p);
    await setVoicePersona(p);

    const sampleReplies: Record<VoicePersona, string> = {
      stark_uk: 'At your service, sir. Systems calibrated.',
      friday: 'Online and ready, boss.',
      india: 'Jarvis is ready to assist you.',
      us: 'All systems operational.',
    };

    try {
      const JarvisWakeWord = require('../../modules/jarvis-wake-word');
      JarvisWakeWord?.speak?.(sampleReplies[p]);
    } catch {}

    const labels: Record<VoicePersona, string> = {
      stark_uk: 'J.A.R.V.I.S. (UK Butler)',
      friday: 'F.R.I.D.A.Y. (Female AI)',
      india: 'Jarvis India',
      us: 'Jarvis US',
    };
    showToast(`Voice set to ${labels[p]}`, 'success');
  };

  const getSensitivityLabel = (val: number) => {
    if (val <= 0.35) return 'Sensitive (Easiest)';
    if (val <= 0.55) return 'Balanced (Recommended)';
    if (val <= 0.70) return 'Strict (Fewer false alarms)';
    return 'Extreme';
  };

  return (
    <View style={styles.container}>
      {/* 1. Wake Sensitivity Slider / Stepper */}
      <View style={styles.settingBlock}>
        <View style={styles.blockHeader}>
          <View style={styles.blockHeaderLeft}>
            <Ionicons name="speedometer-outline" size={18} color={colors.accent} />
            <Text style={styles.blockTitle}>Wake Sensitivity</Text>
          </View>
          <Text style={styles.valueBadge}>
            {(sensitivity * 100).toFixed(0)}% • {getSensitivityLabel(sensitivity)}
          </Text>
        </View>

        <View style={styles.sensitivityControlsRow}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => handleSensitivityChange(sensitivity - 0.05)}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.presetsRow}>
            {[
              { label: 'Low', val: 0.35 },
              { label: 'Normal', val: 0.5 },
              { label: 'Strict', val: 0.65 },
              { label: 'Max', val: 0.8 },
            ].map((p) => {
              const active = Math.abs(sensitivity - p.val) < 0.05;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.presetPill, active && styles.presetPillActive]}
                  onPress={() => handleSensitivityChange(p.val)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetPillText, active && styles.presetPillTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => handleSensitivityChange(sensitivity + 0.05)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Wake Phrase Model Selector */}
      <View style={styles.settingBlock}>
        <View style={styles.blockHeader}>
          <View style={styles.blockHeaderLeft}>
            <Ionicons name="mic-circle-outline" size={18} color="#F43F5E" />
            <Text style={styles.blockTitle}>Wake Phrase</Text>
          </View>
        </View>

        <View style={styles.phraseSelectorCol}>
          <TouchableOpacity
            style={[styles.phraseChipWide, wakeModel === 'both' && styles.phraseChipSelected]}
            onPress={() => handleSelectWakeModel('both')}
            activeOpacity={0.7}
          >
            <View style={styles.phraseChipContent}>
              <Ionicons
                name={wakeModel === 'both' ? 'radio-button-on' : 'radio-button-off'}
                size={15}
                color={wakeModel === 'both' ? '#F43F5E' : colors.textSecondary}
              />
              <Text style={[styles.phraseChipText, wakeModel === 'both' && styles.phraseChipTextSelected]}>
                "Hey" & "Hello Jarvis" (Dual / Both)
              </Text>
            </View>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>Default</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.phraseSelectorRow}>
            <TouchableOpacity
              style={[styles.phraseChip, wakeModel === 'hey_jarvis' && styles.phraseChipSelected]}
              onPress={() => handleSelectWakeModel('hey_jarvis')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={wakeModel === 'hey_jarvis' ? 'radio-button-on' : 'radio-button-off'}
                size={15}
                color={wakeModel === 'hey_jarvis' ? '#F43F5E' : colors.textSecondary}
              />
              <Text style={[styles.phraseChipText, wakeModel === 'hey_jarvis' && styles.phraseChipTextSelected]}>
                "Hey Jarvis"
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.phraseChip, wakeModel === 'hello_jarvis' && styles.phraseChipSelected]}
              onPress={() => handleSelectWakeModel('hello_jarvis')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={wakeModel === 'hello_jarvis' ? 'radio-button-on' : 'radio-button-off'}
                size={15}
                color={wakeModel === 'hello_jarvis' ? '#F43F5E' : colors.textSecondary}
              />
              <Text style={[styles.phraseChipText, wakeModel === 'hello_jarvis' && styles.phraseChipTextSelected]}>
                "Hello Jarvis"
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.phraseSubtext}>
          {wakeModel === 'both'
            ? 'Concurrent listening: wake up naturally with "Hey Jarvis", "Hey", or "Hello Jarvis".'
            : wakeModel === 'hello_jarvis'
            ? 'Custom trained model for "Hello Jarvis" phrase.'
            : 'Pre-trained benchmark model with highest acoustic noise immunity.'}
        </Text>
      </View>

      {/* 3. Voice Persona Selector */}
      <View style={styles.settingBlock}>
        <View style={styles.blockHeader}>
          <View style={styles.blockHeaderLeft}>
            <Ionicons name="person-circle-outline" size={18} color="#38BDF8" />
            <Text style={styles.blockTitle}>Voice Persona</Text>
          </View>
        </View>

        <View style={styles.personaGrid}>
          {[
            { id: 'stark_uk' as VoicePersona, label: 'J.A.R.V.I.S.', sub: 'UK Butler', icon: '🇬🇧' },
            { id: 'friday' as VoicePersona, label: 'F.R.I.D.A.Y.', sub: 'Female AI', icon: '👩' },
            { id: 'india' as VoicePersona, label: 'Jarvis India', sub: 'en-IN', icon: '🇮🇳' },
            { id: 'us' as VoicePersona, label: 'Jarvis US', sub: 'en-US', icon: '🇺🇸' },
          ].map((item) => {
            const isSelected = voicePersona === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.personaCard, isSelected && styles.personaCardSelected]}
                onPress={() => handleSelectVoicePersona(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.personaIcon}>{item.icon}</Text>
                <Text style={[styles.personaLabel, isSelected && styles.personaLabelSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.personaSub}>{item.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.phraseSubtext}>
          Tap any persona to preview its accent, tone, and pacing.
        </Text>
      </View>

      {/* 4. Voice Replies Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingRowLeft}>
          <Ionicons
            name={voiceReplies ? 'volume-high-outline' : 'volume-mute-outline'}
            size={18}
            color={voiceReplies ? colors.accent : colors.textSecondary}
          />
          <View>
            <Text style={styles.rowTitle}>Voice Replies</Text>
            <Text style={styles.rowSubtitle}>
              {voiceReplies ? 'Jarvis speaks replies aloud' : 'Spoken replies muted'}
            </Text>
          </View>
        </View>
        <Switch
          value={voiceReplies}
          onValueChange={handleToggleVoiceReplies}
          trackColor={{ false: '#3E3E3E', true: colors.accent }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 3. Beep Only Mode */}
      <View style={styles.settingRow}>
        <View style={styles.settingRowLeft}>
          <Ionicons
            name={beepOnly ? 'notifications' : 'notifications-outline'}
            size={18}
            color={beepOnly ? '#F59E0B' : colors.textSecondary}
          />
          <View>
            <Text style={styles.rowTitle}>Beep Only Mode</Text>
            <Text style={styles.rowSubtitle}>
              {beepOnly ? 'Earcon tone confirmation only' : 'Spoken TTS confirmations'}
            </Text>
          </View>
        </View>
        <Switch
          value={beepOnly}
          onValueChange={handleToggleBeepOnly}
          trackColor={{ false: '#3E3E3E', true: '#F59E0B' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 4. Language Selector */}
      <View style={styles.settingBlock}>
        <View style={styles.blockHeader}>
          <View style={styles.blockHeaderLeft}>
            <Ionicons name="language-outline" size={18} color={colors.accentSecondary} />
            <Text style={styles.blockTitle}>Recognition Language</Text>
          </View>
        </View>

        <View style={styles.langSelectorRow}>
          {[
            { id: 'en-IN', label: 'English (India)' },
            { id: 'hi-IN', label: 'Hindi (हिंदी)' },
            { id: 'auto', label: 'Auto (Hinglish)' },
          ].map((item) => {
            const isSelected = language === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.langChip, isSelected && styles.langChipSelected]}
                onPress={() => handleSelectLanguage(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langChipText, isSelected && styles.langChipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 5. Only Listen While Charging Option */}
      <View style={styles.settingRow}>
        <View style={styles.settingRowLeft}>
          <Ionicons
            name="battery-charging-outline"
            size={18}
            color={chargingOnly ? '#10B981' : colors.textSecondary}
          />
          <View>
            <Text style={styles.rowTitle}>Only Listen While Charging</Text>
            <Text style={styles.rowSubtitle}>
              {chargingOnly
                ? 'Conserves battery: listens only on AC power'
                : 'Always-on background listening'}
            </Text>
          </View>
        </View>
        <Switch
          value={chargingOnly}
          onValueChange={handleToggleChargingOnly}
          trackColor={{ false: '#3E3E3E', true: '#10B981' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 6. Level 6: General App UI Automation & Accessibility */}
      <View style={styles.settingBlock}>
        <View style={styles.blockHeader}>
          <View style={styles.blockHeaderLeft}>
            <Ionicons name="hardware-chip-outline" size={18} color="#818CF8" />
            <Text style={styles.blockTitle}>App UI Automation (Level 6)</Text>
          </View>
          <View style={[styles.statusBadge, a11yActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
            <Ionicons
              name={a11yActive ? 'checkmark-circle' : 'warning-outline'}
              size={12}
              color={a11yActive ? '#10B981' : '#F59E0B'}
            />
            <Text style={[styles.statusBadgeText, { color: a11yActive ? '#10B981' : '#F59E0B' }]}>
              {a11yActive ? 'Active' : 'Setup Required'}
            </Text>
          </View>
        </View>

        <Text style={styles.automationDescription}>
          Enables Jarvis to control other apps hands-free: auto-scroll reels & feeds ("scroll reels every 10 seconds"), launch installed apps, tap elements, and hands-free WhatsApp messaging.
        </Text>

        {!a11yActive ? (
          <TouchableOpacity
            style={styles.enableA11yBtn}
            onPress={() => {
              openAccessibilitySettings();
              showToast('Turn ON "Jarvis Automation" under Downloaded Apps/Accessibility', 'info');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={16} color="#FFF" />
            <Text style={styles.enableA11yBtnText}>Enable in Android Accessibility Settings</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.automationActionRow}>
            <TouchableOpacity
              style={styles.testScrollBtn}
              onPress={() => {
                if (isAutoScrollingActive) {
                  stopAutomation();
                  setIsAutoScrollingActive(false);
                  showToast('Auto-scroll stopped', 'info');
                } else {
                  startAutoScroll('up', 5, 15);
                  setIsAutoScrollingActive(true);
                  showToast('Testing auto-scroll for 15s (say "stop" anytime)', 'success');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isAutoScrollingActive ? 'stop-circle-outline' : 'swap-vertical-outline'}
                size={16}
                color={isAutoScrollingActive ? '#F43F5E' : '#818CF8'}
              />
              <Text style={[styles.testScrollBtnText, isAutoScrollingActive && { color: '#F43F5E' }]}>
                {isAutoScrollingActive ? 'Stop Auto-Scroll' : 'Test Auto-Scroll (15s)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manageA11yBtn}
              onPress={openAccessibilitySettings}
              activeOpacity={0.7}
            >
              <Text style={styles.manageA11yBtnText}>Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.subSettingRow}>
          <View style={styles.settingRowLeft}>
            <Ionicons
              name="logo-whatsapp"
              size={18}
              color={whatsAppAutoSend && a11yActive ? '#25D366' : colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Hands-Free WhatsApp Auto-Send</Text>
              <Text style={styles.rowSubtitle}>
                Auto-clicks Send and returns back to Jam
              </Text>
            </View>
          </View>
          <Switch
            value={whatsAppAutoSend && a11yActive}
            onValueChange={handleToggleWhatsAppAutoSend}
            disabled={!a11yActive}
            trackColor={{ false: '#3E3E3E', true: '#25D366' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 7. Privacy & Architecture Disclosure Button */}
      <TouchableOpacity
        style={styles.debugBtn}
        onPress={() => setShowPrivacyModal(true)}
        activeOpacity={0.7}
      >

        <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
        <Text style={[styles.debugBtnText, { color: '#10B981' }]}>
          How Jarvis Works & Privacy
        </Text>
      </TouchableOpacity>

      {/* 7. Debug & Telemetry Button */}
      <TouchableOpacity
        style={styles.debugBtn}
        onPress={onOpenDebugModal}
        activeOpacity={0.7}
      >
        <Ionicons name="terminal-outline" size={16} color={colors.accent} />
        <Text style={styles.debugBtnText}>View System Event Logs (100 Events)</Text>
      </TouchableOpacity>

      {/* Privacy Modal */}
      <JarvisPrivacyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  settingBlock: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  blockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  valueBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  sensitivityControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetPillActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: colors.accent,
  },
  presetPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: colors.accent,
    fontWeight: '800',
  },
  phraseSelectorCol: {
    gap: 8,
    marginTop: 4,
  },
  phraseChipWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  phraseChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F43F5E',
    letterSpacing: 0.3,
  },
  phraseSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phraseChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  phraseChipSelected: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: '#F43F5E',
  },
  phraseChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  phraseChipTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  phraseSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 15,
  },
  langSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  langChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  langChipSelected: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderColor: colors.accentSecondary,
  },
  langChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  langChipTextSelected: {
    color: colors.accentSecondary,
    fontWeight: '800',
  },
  personaGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  personaCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  personaCardSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  personaIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  personaLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  personaLabelSelected: {
    color: '#38BDF8',
  },
  personaSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  automationDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 8,
  },
  enableA11yBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#6366F1',
    borderRadius: borderRadius.sm,
    marginBottom: 8,
  },
  enableA11yBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  automationActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  testScrollBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.25)',
  },
  testScrollBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818CF8',
  },
  manageA11yBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageA11yBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 4,
  },
  debugBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  debugBtnText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },
});
