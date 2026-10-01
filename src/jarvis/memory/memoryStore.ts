/**
 * src/jarvis/memory/memoryStore.ts
 *
 * Safe AsyncStorage-backed key-value store for Jarvis persistent state.
 * Gracefully handles JSON serialization, corrupted state, and storage errors.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@jarvis:';

export async function getStoredItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Jarvis Memory] Failed to read key "${key}":`, err);
    return defaultValue;
  }
}

export async function setStoredItem<T>(key: string, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[Jarvis Memory] Failed to write key "${key}":`, err);
    return false;
  }
}

export async function removeStoredItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
    return true;
  } catch (err) {
    console.warn(`[Jarvis Memory] Failed to delete key "${key}":`, err);
    return false;
  }
}
