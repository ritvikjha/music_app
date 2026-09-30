/** Expo public config: override service URLs with EXPO_PUBLIC_* variables. */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    syncServerUrl: process.env.EXPO_PUBLIC_SYNC_SERVER_URL,
    saavnApiUrl: process.env.EXPO_PUBLIC_SAAVN_API_URL,
    resyncIntervalMs: process.env.EXPO_PUBLIC_RESYNC_INTERVAL_MS,
    driftToleranceMs: process.env.EXPO_PUBLIC_DRIFT_TOLERANCE_MS,
  },
});
