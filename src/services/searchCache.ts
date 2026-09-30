import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song } from '../types';

const CACHE_KEY = '@jam_search_cache_v1';
const MAX_CACHED_SEARCHES = 20;

export async function getCachedSearch(query: string): Promise<Song[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const cache = JSON.parse(raw) as Record<string, Song[]>;
    const cached = cache[query.trim().toLowerCase()];
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}

export async function saveCachedSearch(query: string, songs: Song[]): Promise<void> {
  const normalized = query.trim().toLowerCase();
  if (!normalized || songs.length === 0) return;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) as Record<string, Song[]> : {};
    const next = { ...cache, [normalized]: songs };
    const keys = Object.keys(next);
    while (keys.length > MAX_CACHED_SEARCHES) delete next[keys.shift()!];
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // Search should keep working even if the device cannot write its cache.
  }
}
