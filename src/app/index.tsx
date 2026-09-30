import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Index route — auth gate.
 * If authenticated → redirect to tabs.
 * If not → show LoginScreen.
 * Prevents black gap by rendering branded dark Jam splash placeholder until ready.
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [viewMounted, setViewMounted] = useState(false);

  useEffect(() => {
    setViewMounted(true);
  }, []);

  useEffect(() => {
    if (viewMounted && !isLoading) {
      SplashScreen.hideAsync().catch(() => {});
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      }
    }
  }, [viewMounted, isLoading, isAuthenticated, router]);

  if (!isLoading && !isAuthenticated) {
    return <LoginScreen />;
  }

  // Render seamless dark branded placeholder while loading or redirecting to avoid black flash
  return (
    <View style={styles.splashContainer}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="musical-notes" size={44} color={colors.accent} />
        </View>
        <Text style={styles.appName}>Jam</Text>
        <Text style={styles.tagline}>Millions of songs. Free on Jam.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
});
