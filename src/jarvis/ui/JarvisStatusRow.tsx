/**
 * src/jarvis/ui/JarvisStatusRow.tsx
 *
 * Real-time health and status row displayed directly in Profile under the Jarvis toggle:
 * - Status Badges:
 *     - Listening (Green glowing dot)
 *     - Paused (mic in use) (Orange pill — phone call active or other app recording)
 *     - Battery-optimized (tap to fix) (Amber pill — Android Doze mode restriction)
 *     - Needs permission (Red pill — mic permission missing)
 *     - Stopped by system (Gray pill — background service terminated)
 * - Telemetry:
 *     - "Last heard: X min ago"
 *     - "Wake count today: N"
 * - Re-trigger link to re-open the Onboarding & Resilience guide.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import {
  checkBatteryOptimization,
  requestIgnoreBatteryOptimizations,
  getJarvisServiceState,
  getJarvisPauseReason,
  forceResetService,
} from '../JarvisService';
import {
  hasAudioPermission,
  addStateListener,
  type JarvisState,
} from '../../../modules/jarvis-wake-word';
import { getLastHeardFormatted, getTodayWakeCount } from '../eventLogger';

interface JarvisStatusRowProps {
  enabled: boolean;
  onOpenSetupGuide: () => void;
}

export type HealthStatusType =
  | 'LISTENING'
  | 'PAUSED_MIC'
  | 'PAUSED_CHARGING'
  | 'BATTERY_OPTIMIZED'
  | 'NEEDS_PERMISSION'
  | 'STOPPED';

export const JarvisStatusRow: React.FC<JarvisStatusRowProps> = ({
  enabled,
  onOpenSetupGuide,
}) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatusType>('STOPPED');
  const [pauseReason, setPauseReason] = useState<string>('');
  const [lastHeardText, setLastHeardText] = useState('Not yet today');
  const [wakeCount, setWakeCount] = useState(0);

  // Refresh status and telemetry
  const refreshStatus = async () => {
    if (!enabled) {
      setHealthStatus('STOPPED');
      setPauseReason('');
      return;
    }

    try {
      const hasMic = hasAudioPermission();
      if (!hasMic) {
        setHealthStatus('NEEDS_PERMISSION');
        return;
      }

      const isOptimized = checkBatteryOptimization();
      if (isOptimized) {
        setHealthStatus('BATTERY_OPTIMIZED');
        return;
      }

      const nativeState = getJarvisServiceState();
      const currentPauseReason = getJarvisPauseReason();
      setPauseReason(currentPauseReason);

      if (nativeState === 'PAUSED_MIC_IN_USE') {
        setHealthStatus('PAUSED_MIC');
      } else if (nativeState === 'PAUSED_CHARGING_ONLY') {
        setHealthStatus('PAUSED_CHARGING');
      } else if (
        nativeState === 'IDLE_LISTENING' ||
        nativeState === 'WAKE_DETECTED' ||
        nativeState === 'CAPTURING' ||
        nativeState === 'TRANSCRIBING' ||
        nativeState === 'COOLDOWN'
      ) {
        setHealthStatus('LISTENING');
      } else {
        setHealthStatus('STOPPED');
      }

      const heard = await getLastHeardFormatted();
      setLastHeardText(heard);

      const count = await getTodayWakeCount();
      setWakeCount(count);
    } catch (e) {
      console.warn('[JarvisStatusRow] refresh error:', e);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 4000);

    const sub = addStateListener((event) => {
      if (event.state === 'PAUSED_MIC_IN_USE') {
        setHealthStatus('PAUSED_MIC');
        if (event.reason) {
          setPauseReason(event.reason);
        }
      } else if (event.state === 'PAUSED_CHARGING_ONLY') {
        setHealthStatus('PAUSED_CHARGING');
      } else if (event.state === 'IDLE_LISTENING') {
        setHealthStatus('LISTENING');
        setPauseReason('');
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [enabled]);

  // Handle tap on "Battery-optimized (tap to fix)"
  const handleFixBattery = () => {
    requestIgnoreBatteryOptimizations();
    setTimeout(refreshStatus, 1500);
  };

  const handleForceRecoverMic = () => {
    forceResetService();
    setTimeout(refreshStatus, 800);
  };

  const renderBadge = () => {
    switch (healthStatus) {
      case 'LISTENING':
        return (
          <View style={[styles.badge, styles.badgeListening]}>
            <View style={styles.pulseDot} />
            <Text style={[styles.badgeText, styles.textListening]}>Listening</Text>
          </View>
        );

      case 'PAUSED_MIC': {
        const displayReason = pauseReason
          ? pauseReason.toLowerCase().includes('call')
            ? 'Paused (phone call)'
            : pauseReason.toLowerCase().includes('silenced')
            ? 'Paused (mic silenced)'
            : pauseReason.toLowerCase().includes('another app')
            ? 'Paused (other app recording)'
            : `Paused (${pauseReason})`
          : 'Paused (mic in use)';

        return (
          <TouchableOpacity
            style={[styles.badge, styles.badgePausedMic]}
            onPress={handleForceRecoverMic}
            activeOpacity={0.7}
          >
            <Ionicons name="mic-off" size={12} color="#F97316" />
            <Text style={[styles.badgeText, styles.textPausedMic]}>
              {displayReason}
            </Text>
            <Ionicons name="refresh-outline" size={11} color="#F97316" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        );
      }

      case 'PAUSED_CHARGING':
        return (
          <View style={[styles.badge, styles.badgePausedCharging]}>
            <Ionicons name="battery-dead-outline" size={12} color="#EAB308" />
            <Text style={[styles.badgeText, styles.textPausedCharging]}>
              Paused (connect charger)
            </Text>
          </View>
        );

      case 'BATTERY_OPTIMIZED':
        return (
          <TouchableOpacity
            style={[styles.badge, styles.badgeWarning]}
            onPress={handleFixBattery}
            activeOpacity={0.7}
          >
            <Ionicons name="warning-outline" size={12} color="#F59E0B" />
            <Text style={[styles.badgeText, styles.textWarning]}>
              Battery-optimized (tap to fix)
            </Text>
          </TouchableOpacity>
        );

      case 'NEEDS_PERMISSION':
        return (
          <TouchableOpacity
            style={[styles.badge, styles.badgeError]}
            onPress={onOpenSetupGuide}
            activeOpacity={0.7}
          >
            <Ionicons name="alert-circle" size={12} color="#EF4444" />
            <Text style={[styles.badgeText, styles.textError]}>
              Needs permission
            </Text>
          </TouchableOpacity>
        );

      case 'STOPPED':
      default:
        return (
          <View style={[styles.badge, styles.badgeStopped]}>
            <View style={styles.stoppedDot} />
            <Text style={[styles.badgeText, styles.textStopped]}>
              Stopped
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Row */}
      <View style={styles.statusTopRow}>
        <View style={styles.badgeContainer}>{renderBadge()}</View>
        <TouchableOpacity
          style={styles.guideLink}
          onPress={onOpenSetupGuide}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={14} color={colors.accent} />
          <Text style={styles.guideLinkText}>Setup Guide</Text>
        </TouchableOpacity>
      </View>

      {/* Telemetry Row */}
      {enabled && (
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryItem}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.telemetryText}>
              Last heard: <Text style={styles.telemetryBold}>{lastHeardText}</Text>
            </Text>
          </View>
          <View style={styles.telemetryDivider} />
          <View style={styles.telemetryItem}>
            <Ionicons name="flash-outline" size={13} color={colors.accent} />
            <Text style={styles.telemetryText}>
              Wakes today: <Text style={styles.telemetryBold}>{wakeCount}</Text>
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeListening: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgePausedMic: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  badgePausedCharging: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeStopped: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  stoppedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textListening: {
    color: '#10B981',
  },
  textPausedMic: {
    color: '#F97316',
  },
  textPausedCharging: {
    color: '#EAB308',
  },
  textWarning: {
    color: '#F59E0B',
  },
  textError: {
    color: '#EF4444',
  },
  textStopped: {
    color: colors.textSecondary,
  },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  guideLinkText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  telemetryBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  telemetryDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
