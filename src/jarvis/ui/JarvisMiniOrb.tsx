/**
 * src/jarvis/ui/JarvisMiniOrb.tsx
 *
 * Mini Persistent Floating Button for Jarvis:
 * Designed for noisy environments or quick manual access where speaking
 * the "Hey Jarvis" wake word is impractical.
 *
 * Tapping it triggers instant listening without needing the wake word.
 */

import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import {
  getJarvisServiceState,
  forceResetService,
} from '../JarvisService';
import { addStateListener, type JarvisState } from '../../../modules/jarvis-wake-word';

interface JarvisMiniOrbProps {
  visible?: boolean;
}

export const JarvisMiniOrb: React.FC<JarvisMiniOrbProps> = ({ visible = true }) => {
  const [currentState, setCurrentState] = useState<JarvisState>('IDLE_LISTENING');
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const sub = addStateListener((evt) => {
      setCurrentState(evt.state);
    });

    return () => {
      sub.remove();
    };
  }, []);

  const isCapturing =
    currentState === 'CAPTURING' ||
    currentState === 'TRANSCRIBING' ||
    currentState === 'WAKE_DETECTED';

  // Pulse animation when capturing speech
  useEffect(() => {
    if (isCapturing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCapturing]);

  if (!visible) return null;

  const handlePress = () => {
    // Tapping triggers a fresh listening session without needing wake word
    forceResetService();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.orbButton,
          isCapturing ? styles.orbCapturing : styles.orbIdle,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isCapturing ? 'mic' : 'mic-outline'}
          size={22}
          color={isCapturing ? '#000' : colors.accent}
        />
        {isCapturing && <View style={styles.glowRing} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 115 : 95,
    right: 18,
    zIndex: 999,
  },
  orbButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
  },
  orbIdle: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  orbCapturing: {
    backgroundColor: colors.accent,
    borderColor: '#ffffff',
  },
  glowRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.accent,
    opacity: 0.6,
  },
});
