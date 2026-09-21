import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../theme';

interface SkeletonProps {
  count?: number;
}

export function SkeletonItem() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      <Animated.View style={[styles.thumbnail, animatedStyle]} />

      {/* Info Block */}
      <View style={styles.info}>
        {/* Title placeholder */}
        <Animated.View style={[styles.titleLine, animatedStyle]} />
        {/* Artist placeholder */}
        <Animated.View style={[styles.subtitleLine, animatedStyle]} />
      </View>

      {/* Trailing pill */}
      <Animated.View style={[styles.durationPill, animatedStyle]} />
    </View>
  );
}

export function SkeletonList({ count = 8 }: SkeletonProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={`skeleton-${index}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16162280',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffffff0a',
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#ffffff15',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleLine: {
    height: 14,
    width: '70%',
    borderRadius: 7,
    backgroundColor: '#ffffff18',
    marginBottom: 8,
  },
  subtitleLine: {
    height: 11,
    width: '45%',
    borderRadius: 6,
    backgroundColor: '#ffffff10',
  },
  durationPill: {
    width: 32,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff10',
    marginRight: 4,
  },
});
