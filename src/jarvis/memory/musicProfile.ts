/**
 * src/jarvis/memory/musicProfile.ts
 *
 * Silently learns the user's music tastes over time:
 * - Tracks play counts, skip rates, and favorite artists/genres.
 * - Records time-of-day listening habits.
 * - Supplies "play my usual" query based on learned preferences.
 */

import { getStoredItem, setStoredItem } from './memoryStore';
import type { MusicProfile } from '../brain/types';

const PROFILE_KEY = 'music_profile';

interface StoredTasteProfile {
  artistCounts: Record<string, number>;
  genreCounts: Record<string, number>;
  hourlyCounts: Record<number, Record<string, number>>; // hour (0-23) -> artist/genre counts
  playCount: number;
  skipCount: number;
  recentMoods: string[];
}

const DEFAULT_PROFILE: StoredTasteProfile = {
  artistCounts: {},
  genreCounts: {},
  hourlyCounts: {},
  playCount: 0,
  skipCount: 0,
  recentMoods: [],
};

export async function getStoredTaste(): Promise<StoredTasteProfile> {
  return await getStoredItem<StoredTasteProfile>(PROFILE_KEY, DEFAULT_PROFILE);
}

export async function recordSongPlay(title: string, artist?: string, genre?: string) {
  const profile = await getStoredTaste();
  profile.playCount++;

  if (artist) {
    const a = artist.trim();
    profile.artistCounts[a] = (profile.artistCounts[a] || 0) + 1;
  }
  if (genre) {
    const g = genre.trim().toLowerCase();
    profile.genreCounts[g] = (profile.genreCounts[g] || 0) + 1;
  }

  // Record time of day
  const currentHour = new Date().getHours();
  if (!profile.hourlyCounts[currentHour]) {
    profile.hourlyCounts[currentHour] = {};
  }
  if (artist) {
    profile.hourlyCounts[currentHour][artist] = (profile.hourlyCounts[currentHour][artist] || 0) + 1;
  }

  await setStoredItem(PROFILE_KEY, profile);
}

export async function recordSongSkip(artist?: string) {
  const profile = await getStoredTaste();
  profile.skipCount++;
  // Slightly decrement artist preference if skipped early
  if (artist && profile.artistCounts[artist]) {
    profile.artistCounts[artist] = Math.max(0, profile.artistCounts[artist] - 1);
  }
  await setStoredItem(PROFILE_KEY, profile);
}

export async function recordMood(mood: string) {
  const profile = await getStoredTaste();
  if (!profile.recentMoods.includes(mood)) {
    profile.recentMoods.unshift(mood);
    if (profile.recentMoods.length > 5) profile.recentMoods.pop();
    await setStoredItem(PROFILE_KEY, profile);
  }
}

/**
 * Returns formatted MusicProfile suitable for LLM BrainContext.
 */
export async function getMusicProfile(): Promise<MusicProfile> {
  const profile = await getStoredTaste();

  // Sort top artists
  const topArtists = Object.entries(profile.artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([artist]) => artist);

  // Sort top genres
  const topGenres = Object.entries(profile.genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);

  return {
    topArtists,
    topGenres,
    recentMoods: profile.recentMoods,
    playCount: profile.playCount,
    skipCount: profile.skipCount,
  };
}

/**
 * Computes the best personalized query for "play my usual" or "play my favorites".
 */
export async function getUsualQuery(): Promise<string> {
  const profile = await getStoredTaste();
  const currentHour = new Date().getHours();

  // Check if we have hour-specific favorites
  const hourly = profile.hourlyCounts[currentHour];
  if (hourly) {
    const topHourArtist = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0];
    if (topHourArtist && topHourArtist[1] >= 2) {
      return topHourArtist[0];
    }
  }

  // Top overall artist
  const topArtists = Object.entries(profile.artistCounts).sort((a, b) => b[1] - a[1]);
  if (topArtists.length > 0 && topArtists[0][1] >= 1) {
    return topArtists[0][0];
  }

  // Default pleasant fallback if user is completely brand new
  if (currentHour >= 5 && currentHour < 12) {
    return 'morning chill acoustic';
  } else if (currentHour >= 12 && currentHour < 17) {
    return 'lofi beats';
  } else if (currentHour >= 17 && currentHour < 22) {
    return 'evening chill hits';
  } else {
    return 'calm ambient sleep';
  }
}
