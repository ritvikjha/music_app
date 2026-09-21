import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach the host machine's localhost.
// iOS simulator can use localhost directly.
const LOCALHOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const CONFIG = {
  /** Socket.io sync server URL */
  SYNC_SERVER_URL: `http://${LOCALHOST}:3000`,

  /** JioSaavn official API */
  SAAVN_API_URL: 'https://www.jiosaavn.com',

  /** How often (ms) to request resync while in a Jam room */
  RESYNC_INTERVAL_MS: 7000,

  /** Maximum drift tolerance (ms) before forcing a seek correction */
  DRIFT_TOLERANCE_MS: 500,
} as const;
