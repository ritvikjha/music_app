import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { LibraryProvider } from '../context/LibraryContext';
import { QueueProvider } from '../context/QueueContext';
import { PlayerProvider } from '../context/PlayerContext';
import { JamProvider } from '../context/JamContext';
import { ToastProvider } from '../context/ToastContext';
import { colors } from '../theme';

/**
 * Root layout — wraps the entire app in providers and configures
 * the navigation stack with our dark/lavender theme.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthProvider>
        <LibraryProvider>
          <QueueProvider>
            <PlayerProvider>
              <JamProvider>
                <ToastProvider>
                  <StatusBar style="light" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.background },
                      animation: 'slide_from_bottom',
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="player"
                      options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                      }}
                    />
                    <Stack.Screen
                      name="library"
                      options={{
                        animation: 'slide_from_right',
                      }}
                    />
                  </Stack>
                </ToastProvider>
              </JamProvider>
            </PlayerProvider>
          </QueueProvider>
        </LibraryProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
