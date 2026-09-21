export const CONFIG = {
  /** Socket.io sync server URL */
  SYNC_SERVER_URL: 'https://music-app-9yte.onrender.com',

  /** JioSaavn official API */
  SAAVN_API_URL: 'https://www.jiosaavn.com',

  /** How often (ms) to request resync while in a Jam room */
  RESYNC_INTERVAL_MS: 7000,

  /** Maximum drift tolerance (ms) before forcing a seek correction */
  DRIFT_TOLERANCE_MS: 500,
} as const;
