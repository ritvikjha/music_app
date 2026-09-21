import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';

SplashScreen.preventAutoHideAsync();

/**
 * Index route — auth gate.
 * If authenticated → redirect to tabs.
 * If not → show LoginScreen.
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) return null;
  if (isAuthenticated) return null; // Will redirect

  return <LoginScreen />;
}
