import Constants from 'expo-constants';

/** For local sync development, set EXPO_PUBLIC_SYNC_SERVER_URL in .env.local and restart Metro. */
const extra = Constants.expoConfig?.extra || {};
const readNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const CONFIG = {
  /** Socket.io sync server URL */
  SYNC_SERVER_URL: process.env.EXPO_PUBLIC_SYNC_SERVER_URL || extra.syncServerUrl || 'https://music-app-onx9.onrender.com',

  /** JioSaavn official API */
  SAAVN_API_URL: process.env.EXPO_PUBLIC_SAAVN_API_URL || extra.saavnApiUrl || 'https://www.jiosaavn.com',

  /** How often (ms) to request resync while in a Jam room */
  RESYNC_INTERVAL_MS: readNumber(process.env.EXPO_PUBLIC_RESYNC_INTERVAL_MS || extra.resyncIntervalMs, 7000),

  /** Maximum drift tolerance (ms) before forcing a seek correction */
  DRIFT_TOLERANCE_MS: readNumber(process.env.EXPO_PUBLIC_DRIFT_TOLERANCE_MS || extra.driftToleranceMs, 500),
} as const;
