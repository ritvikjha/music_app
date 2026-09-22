import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  SOUND_PRESETS,
  FREQUENCY_LABELS,
  getActivePreset,
  applySoundPreset,
  getActivePlaybackRate,
  applyPlaybackRate,
} from '../services/soundPresets';
import { audioPlayer } from '../services/audioPlayer';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { SoundPreset } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SoundPresetsModalProps {
  visible: boolean;
  onClose: () => void;
  onPresetChange?: (preset: SoundPreset) => void;
}

const SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5];

export function SoundPresetsModal({ visible, onClose, onPresetChange }: SoundPresetsModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<SoundPreset>(SOUND_PRESETS[0]);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volumeLevel, setVolumeLevel] = useState<number>(1.0);

  // Animated heights for the 5 frequency bands (60Hz, 250Hz, 1kHz, 4kHz, 16kHz)
  const bandAnims = useRef([
    new RNAnimated.Value(0.5),
    new RNAnimated.Value(0.5),
    new RNAnimated.Value(0.5),
    new RNAnimated.Value(0.5),
    new RNAnimated.Value(0.5),
  ]).current;

  // Load saved preset & speed on mount / visibility
  useEffect(() => {
    if (visible) {
      getActivePreset().then((preset) => {
        setSelectedPreset(preset);
        animateBands(preset.bands);
      });
      getActivePlaybackRate().then(setPlaybackRate);
      setVolumeLevel(audioPlayer.getVolume());
    }
  }, [visible]);

  const animateBands = (bands: [number, number, number, number, number]) => {
    // Map -6dB..+6dB to fraction 0.2..1.0
    const animations = bands.map((db, idx) => {
      const normalized = Math.max(0.15, Math.min(1.0, (db + 6) / 12));
      return RNAnimated.spring(bandAnims[idx], {
        toValue: normalized,
        friction: 6,
        tension: 80,
        useNativeDriver: false,
      });
    });
    RNAnimated.parallel(animations).start();
  };

  const handleSelectPreset = async (preset: SoundPreset) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedPreset(preset);
    animateBands(preset.bands);
    await applySoundPreset(preset);
    onPresetChange?.(preset);
  };

  const handleSelectSpeed = async (speed: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setPlaybackRate(speed);
    await applyPlaybackRate(speed);
  };

  const handleVolumeBoost = async (vol: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setVolumeLevel(vol);
    await audioPlayer.setVolume(vol);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="options-outline" size={20} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.title}>Audio Equalizer</Text>
                <Text style={styles.subtitle}>Sound Profiles & DSP Tuning</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Live 5-Band Equalizer Frequency Curve Visualizer */}
            <View style={styles.visualizerCard}>
              <View style={styles.visualizerHeader}>
                <View style={styles.visualizerTitleRow}>
                  <Text style={styles.visualizerTitle}>5-Band EQ Profile</Text>
                  <View
                    style={[
                      styles.activeBadge,
                      { backgroundColor: `${selectedPreset.accentColor}20` },
                    ]}
                  >
                    <View
                      style={[
                        styles.activeDot,
                        { backgroundColor: selectedPreset.accentColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.activeBadgeText,
                        { color: selectedPreset.accentColor },
                      ]}
                    >
                      {selectedPreset.name}
                    </Text>
                  </View>
                </View>
                <Text style={styles.visualizerSubtitle}>
                  Dynamic studio frequency response
                </Text>
              </View>

              <View style={styles.bandsRow}>
                {selectedPreset.bands.map((db, index) => {
                  const heightInterpolation = bandAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 85],
                  });

                  return (
                    <View key={`band-${index}`} style={styles.bandColumn}>
                      <Text
                        style={[
                          styles.dbText,
                          {
                            color:
                              db > 0
                                ? selectedPreset.accentColor
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {db > 0 ? `+${db}` : db}
                      </Text>

                      <View style={styles.barTrack}>
                        <RNAnimated.View
                          style={[
                            styles.barFill,
                            {
                              height: heightInterpolation,
                              backgroundColor: selectedPreset.accentColor,
                              shadowColor: selectedPreset.accentColor,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.freqLabel}>{FREQUENCY_LABELS[index]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Sound Profile Presets List */}
            <Text style={styles.sectionHeading}>Sound Profiles</Text>
            <View style={styles.presetList}>
              {SOUND_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedPreset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetCard,
                      isSelected && {
                        borderColor: preset.accentColor,
                        backgroundColor: '#1C1B26',
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectPreset(preset)}
                  >
                    <View
                      style={[
                        styles.presetIconWrap,
                        {
                          backgroundColor: `${preset.accentColor}18`,
                          borderColor: `${preset.accentColor}35`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={preset.icon as any}
                        size={20}
                        color={preset.accentColor}
                      />
                    </View>

                    <View style={styles.presetInfo}>
                      <View style={styles.presetTitleRow}>
                        <Text style={styles.presetName}>{preset.name}</Text>
                        <Text
                          style={[
                            styles.presetTagline,
                            { color: preset.accentColor },
                          ]}
                        >
                          {preset.tagline}
                        </Text>
                      </View>
                      <Text style={styles.presetDesc} numberOfLines={2}>
                        {preset.description}
                      </Text>
                    </View>

                    <View style={styles.checkCircle}>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={preset.accentColor}
                        />
                      ) : (
                        <View style={styles.uncheckCircle} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Playback Speed Controller */}
            <Text style={styles.sectionHeading}>Playback Speed</Text>
            <View style={styles.speedRow}>
              {SPEED_OPTIONS.map((speed) => {
                const isCurrent = playbackRate === speed;
                return (
                  <TouchableOpacity
                    key={`speed-${speed}`}
                    style={[
                      styles.speedChip,
                      isCurrent && {
                        borderColor: colors.accent,
                        backgroundColor: colors.accentAlpha25,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectSpeed(speed)}
                  >
                    <Text
                      style={[
                        styles.speedChipText,
                        isCurrent && { color: colors.accent, fontWeight: '700' },
                      ]}
                    >
                      {speed === 1.0 ? '1.0x Normal' : `${speed}x`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Master Gain & Volume Boost */}
            <Text style={styles.sectionHeading}>Output Gain</Text>
            <View style={styles.gainRow}>
              {[
                { label: '80%', val: 0.8 },
                { label: '100% Studio', val: 1.0 },
              ].map((item) => {
                const isSelected = Math.abs(volumeLevel - item.val) < 0.05;
                return (
                  <TouchableOpacity
                    key={`gain-${item.val}`}
                    style={[
                      styles.gainButton,
                      isSelected && {
                        borderColor: colors.accentSecondary,
                        backgroundColor: `${colors.accentSecondary}20`,
                      },
                    ]}
                    onPress={() => handleVolumeBoost(item.val)}
                  >
                    <Ionicons
                      name="volume-medium-outline"
                      size={18}
                      color={isSelected ? colors.accentSecondary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.gainButtonText,
                        isSelected && { color: colors.accentSecondary, fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    maxHeight: '85%',
    backgroundColor: '#12121A',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.18)',
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentAlpha25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  visualizerCard: {
    backgroundColor: '#191824',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  visualizerHeader: {
    marginBottom: spacing.md,
  },
  visualizerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visualizerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  visualizerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bandsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: spacing.xs,
  },
  bandColumn: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 80) / 5,
  },
  dbText: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  barTrack: {
    width: 22,
    height: 90,
    backgroundColor: '#0F0E17',
    borderRadius: 11,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  barFill: {
    width: '100%',
    borderRadius: 11,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  freqLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  presetList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161520',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: spacing.md,
    gap: spacing.md,
  },
  presetIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetInfo: {
    flex: 1,
  },
  presetTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  presetName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  presetTagline: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  presetDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  checkCircle: {
    marginLeft: spacing.xs,
  },
  uncheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  speedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  speedChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: '#161520',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  speedChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  gainRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: '#161520',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  gainButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});
