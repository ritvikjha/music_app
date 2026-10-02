/**
 * src/jarvis/ui/JarvisMiniOrb.tsx
 *
 * Phase 5: Cinematic Iron Man Arc-Reactor Holographic Orb
 *
 * Capabilities:
 *   - Continuous gyroscopic arc-reactor animations (spinning outer/inner rings & neon core)
 *   - Fluid Drag-and-Snap physics (PanResponder with magnetic screen-edge docking)
 *   - Dynamic audio/speech state reactivity (Idle, Wake, Capturing, Transcribing, Speaking)
 *   - Real-time floating speech & subtitle pill (displays live transcription & Jarvis replies)
 *   - Gesture Superpowers:
 *       • Single Tap: Instant voice capture (no wake word needed)
 *       • Double Tap: Instant Screen Vision ("What's on my screen?")
 *       • Long Press: Instant Camera Vision ("Jarvis, look at this")
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Animated,
  View,
  Text,
  Platform,
  Dimensions,
  PanResponder,
  Vibration,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { forceResetService } from '../JarvisService';
import {
  addStateListener,
  addTranscriptListener,
  addSpeechDoneListener,
  type JarvisState,
} from '../../../modules/jarvis-wake-word';
import { executeIntent } from '../actions/executor';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = 58;
const SNAP_MARGIN = 16;
const MIN_Y = Platform.OS === 'ios' ? 70 : 50;
const MAX_Y = SCREEN_HEIGHT - (Platform.OS === 'ios' ? 140 : 120);

interface JarvisMiniOrbProps {
  visible?: boolean;
}

export const JarvisMiniOrb: React.FC<JarvisMiniOrbProps> = ({ visible = true }) => {
  const [currentState, setCurrentState] = useState<JarvisState>('IDLE_LISTENING');
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');
  const [bubbleText, setBubbleText] = useState<string>('');
  const [bubbleRole, setBubbleRole] = useState<'user' | 'jarvis'>('user');

  // Animation drivers
  const pan = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - ORB_SIZE - SNAP_MARGIN,
      y: SCREEN_HEIGHT - 170,
    })
  ).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const outerRotateAnim = useRef(new Animated.Value(0)).current;
  const innerRotateAnim = useRef(new Animated.Value(0)).current;
  const bubbleFade = useRef(new Animated.Value(0)).current;
  const bubbleTimer = useRef<any>(null);

  // Gesture handling state
  const lastTapTs = useRef<number>(0);
  const longPressTimer = useRef<any>(null);
  const isDragging = useRef<boolean>(false);

  // Continuous Gyroscopic Arc-Reactor Rotation
  useEffect(() => {
    const isAccelerated =
      currentState === 'CAPTURING' ||
      currentState === 'TRANSCRIBING' ||
      currentState === 'WAKE_DETECTED';

    const outerDuration = isAccelerated ? 2200 : 7000;
    const innerDuration = isAccelerated ? 1600 : 5500;

    const outerLoop = Animated.loop(
      Animated.timing(outerRotateAnim, {
        toValue: 1,
        duration: outerDuration,
        useNativeDriver: true,
      })
    );

    const innerLoop = Animated.loop(
      Animated.timing(innerRotateAnim, {
        toValue: 1,
        duration: innerDuration,
        useNativeDriver: true,
      })
    );

    outerLoop.start();
    innerLoop.start();

    return () => {
      outerLoop.stop();
      innerLoop.stop();
    };
  }, [currentState]);

  // Breathing / Energy Flare Pulse
  useEffect(() => {
    const isCapturing =
      currentState === 'CAPTURING' ||
      currentState === 'TRANSCRIBING' ||
      currentState === 'WAKE_DETECTED';

    if (isCapturing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 480,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 480,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.96,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentState]);

  // Subtitle / Transcript Bubble Display
  const showBubble = (text: string, role: 'user' | 'jarvis' = 'user') => {
    if (!text.trim()) return;
    setBubbleText(text.trim());
    setBubbleRole(role);

    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);

    Animated.timing(bubbleFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    bubbleTimer.current = setTimeout(() => {
      Animated.timing(bubbleFade, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => setBubbleText(''));
    }, 4500);
  };

  // State, Transcript & Speech Listeners
  useEffect(() => {
    const stateSub = addStateListener((evt) => {
      setCurrentState(evt.state);
      if (evt.state === 'WAKE_DETECTED') {
        showBubble('Listening, sir...', 'jarvis');
      }
    });

    const transcriptSub = addTranscriptListener((evt) => {
      if (evt.text) {
        showBubble(evt.text, 'user');
      }
    });

    const speechSub = addSpeechDoneListener(() => {
      if (currentState === 'COOLDOWN' || currentState === 'TRANSCRIBING') {
        setCurrentState('IDLE_LISTENING');
      }
    });

    return () => {
      stateSub.remove();
      transcriptSub.remove();
      speechSub.remove();
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, [currentState]);

  // Gesture Actions
  const handleSingleTap = () => {
    Vibration.vibrate(25);
    showBubble('At your service...', 'jarvis');
    forceResetService();
  };

  const handleDoubleTap = async () => {
    Vibration.vibrate([0, 30, 60, 30]);
    showBubble('Inspecting screen...', 'jarvis');
    const result = await executeIntent({
      intent: 'SCREEN_QUERY',
      slots: { query: 'Summarize what is on my screen' },
      confidence: 1.0,
      spokenReply: 'Inspecting screen, sir.',
      source: 'local',
    });
    if (result.spokenReply) {
      showBubble(result.spokenReply, 'jarvis');
    }
  };

  const handleLongPress = async () => {
    Vibration.vibrate(60);
    showBubble('Scanning camera feed...', 'jarvis');
    const result = await executeIntent({
      intent: 'CAMERA_VISION',
      slots: { prompt: 'Describe what you see in front of the camera.' },
      confidence: 1.0,
      spokenReply: 'Analyzing visual input, sir.',
      source: 'local',
    });
    if (result.spokenReply) {
      showBubble(result.spokenReply, 'jarvis');
    }
  };

  // PanResponder with Drag-and-Snap Physics
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,

      onPanResponderGrant: () => {
        isDragging.current = false;
        longPressTimer.current = setTimeout(() => {
          if (!isDragging.current) {
            handleLongPress();
          }
        }, 550);
      },

      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6) {
          isDragging.current = true;
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }

        pan.setValue({
          x: gesture.moveX - ORB_SIZE / 2,
          y: Math.max(MIN_Y, Math.min(MAX_Y, gesture.moveY - ORB_SIZE / 2)),
        });
      },

      onPanResponderRelease: (_, gesture) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);

        // Check if this was a tap or drag
        if (!isDragging.current && Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
          const now = Date.now();
          if (now - lastTapTs.current < 320) {
            // Double tap
            lastTapTs.current = 0;
            handleDoubleTap();
          } else {
            // Single tap candidate (wait briefly to disambiguate from double tap)
            lastTapTs.current = now;
            setTimeout(() => {
              if (lastTapTs.current === now) {
                handleSingleTap();
              }
            }, 320);
          }
          return;
        }

        // Snap to nearest horizontal edge (left or right)
        const currentX = gesture.moveX;
        const toLeft = currentX < SCREEN_WIDTH / 2;
        const targetX = toLeft ? SNAP_MARGIN : SCREEN_WIDTH - ORB_SIZE - SNAP_MARGIN;
        const targetY = Math.max(MIN_Y, Math.min(MAX_Y, gesture.moveY - ORB_SIZE / 2));

        setDockSide(toLeft ? 'left' : 'right');

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          friction: 6,
          tension: 50,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  if (!visible) return null;

  const isCapturing =
    currentState === 'CAPTURING' ||
    currentState === 'TRANSCRIBING' ||
    currentState === 'WAKE_DETECTED';

  const isTranscribing = currentState === 'TRANSCRIBING';

  // Rotation interpolations
  const outerSpin = outerRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerSpin = innerRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          left: pan.x,
          top: pan.y,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Real-time Subtitle / Transcript Bubble */}
      {bubbleText.length > 0 && (
        <Animated.View
          style={[
            styles.bubbleContainer,
            dockSide === 'left' ? styles.bubbleLeftDock : styles.bubbleRightDock,
            { opacity: bubbleFade },
          ]}
        >
          <View style={styles.bubbleContent}>
            <View
              style={[
                styles.bubbleIndicator,
                bubbleRole === 'jarvis' ? styles.bubbleIndicatorJarvis : styles.bubbleIndicatorUser,
              ]}
            />
            <Text style={styles.bubbleText} numberOfLines={3}>
              {bubbleText}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Main Holographic Arc-Reactor Orb */}
      <Animated.View
        style={[
          styles.reactorRoot,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Outermost Energy Halo Glow */}
        <View
          style={[
            styles.haloGlow,
            isCapturing ? styles.haloGlowActive : styles.haloGlowIdle,
          ]}
        />

        {/* Counter-Clockwise Outer Gyro Ring with Arc Ticks */}
        <Animated.View
          style={[
            styles.outerGyroRing,
            isCapturing ? styles.gyroRingActive : styles.gyroRingIdle,
            { transform: [{ rotate: outerSpin }] },
          ]}
        >
          <View style={[styles.ringTick, styles.ringTickTop]} />
          <View style={[styles.ringTick, styles.ringTickBottom]} />
          <View style={[styles.ringTick, styles.ringTickLeft]} />
          <View style={[styles.ringTick, styles.ringTickRight]} />
        </Animated.View>

        {/* Clockwise Inner Segmented Core */}
        <Animated.View
          style={[
            styles.innerGyroRing,
            isTranscribing ? styles.gyroRingThinking : styles.gyroRingIdle,
            { transform: [{ rotate: innerSpin }] },
          ]}
        />

        {/* Dark Obsidian Glass Core with Central Glow */}
        <View
          style={[
            styles.reactorCore,
            isCapturing ? styles.coreActive : styles.coreIdle,
          ]}
        >
          {isTranscribing ? (
            <MaterialCommunityIcons
              name="atom"
              size={24}
              color={colors.accent}
            />
          ) : isCapturing ? (
            <Ionicons name="mic" size={24} color="#000" />
          ) : (
            <Ionicons
              name="radio"
              size={20}
              color={colors.accent}
            />
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactorRoot: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloGlow: {
    position: 'absolute',
    width: ORB_SIZE + 18,
    height: ORB_SIZE + 18,
    borderRadius: (ORB_SIZE + 18) / 2,
  },
  haloGlowIdle: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  haloGlowActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.28)',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 12,
  },
  outerGyroRing: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gyroRingIdle: {
    borderColor: 'rgba(0, 229, 255, 0.45)',
  },
  gyroRingActive: {
    borderColor: '#ffffff',
  },
  gyroRingThinking: {
    borderColor: '#ffd700',
  },
  ringTick: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  ringTickTop: { top: -2 },
  ringTickBottom: { bottom: -2 },
  ringTickLeft: { left: -2 },
  ringTickRight: { right: -2 },
  innerGyroRing: {
    position: 'absolute',
    width: ORB_SIZE - 12,
    height: ORB_SIZE - 12,
    borderRadius: (ORB_SIZE - 12) / 2,
    borderWidth: 1.5,
    borderTopColor: colors.accent,
    borderBottomColor: colors.accent,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  reactorCore: {
    width: ORB_SIZE - 18,
    height: ORB_SIZE - 18,
    borderRadius: (ORB_SIZE - 18) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  coreIdle: {
    backgroundColor: 'rgba(8, 14, 26, 0.94)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 229, 255, 0.6)',
  },
  coreActive: {
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  // Floating Subtitle / Transcript Bubble
  bubbleContainer: {
    position: 'absolute',
    top: 6,
    width: 220,
    zIndex: 9998,
  },
  bubbleLeftDock: {
    left: ORB_SIZE + 12,
  },
  bubbleRightDock: {
    right: ORB_SIZE + 12,
  },
  bubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 16, 32, 0.92)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  bubbleIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  bubbleIndicatorJarvis: {
    backgroundColor: colors.accent,
  },
  bubbleIndicatorUser: {
    backgroundColor: '#10b981',
  },
  bubbleText: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
