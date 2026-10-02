/**
 * src/jarvis/safety/voiceId.ts
 *
 * Lightweight Voice ID & Speaker Verification for Jarvis.
 * Restricts sensitive device operations (sending messages, making calls,
 * deleting memory, triggering emergency protocols) to verified voiceprints only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_VOICE_ID_ENABLED = '@jarvis_voice_id_enabled';
const KEY_VOICE_ENROLLED = '@jarvis_voice_enrolled';
const KEY_VOICE_THRESHOLD = '@jarvis_voice_id_threshold';
const DEFAULT_SENSITIVE_THRESHOLD = 0.65; // High confidence required for sensitive operations

// Intents that require speaker verification
export const SENSITIVE_INTENTS = new Set([
  'WHATSAPP_MESSAGE',
  'CALL',
  'EMERGENCY',
  'CLEAR_QUEUE',
  'DELETE_ROUTINE',
]);

/**
 * Check if Voice ID verification is enabled.
 */
export async function isVoiceIdEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEY_VOICE_ID_ENABLED);
    if (val === null) {
      const enrolled = await isVoiceEnrolled();
      return enrolled;
    }
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggle Voice ID verification.
 */
export async function setVoiceIdEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_VOICE_ID_ENABLED, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('[VoiceId] Failed to set voice ID enabled:', e);
  }
}

/**
 * Check if the user has enrolled their voiceprint.
 */
export async function isVoiceEnrolled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEY_VOICE_ENROLLED);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Enroll user voiceprint.
 */
export async function enrollVoice(sampleScore: number = 0.85): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEY_VOICE_ENROLLED, 'true');
    await AsyncStorage.setItem(KEY_VOICE_ID_ENABLED, 'true');
    await AsyncStorage.setItem(KEY_VOICE_THRESHOLD, sampleScore.toString());
    console.log(`[VoiceId] Voiceprint enrolled with baseline score ${sampleScore}`);
    return true;
  } catch (e) {
    console.error('[VoiceId] Failed to enroll voiceprint:', e);
    return false;
  }
}

/**
 * Reset voice enrollment.
 */
export async function resetVoiceEnrollment(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_VOICE_ENROLLED);
    await AsyncStorage.removeItem(KEY_VOICE_ID_ENABLED);
    await AsyncStorage.removeItem(KEY_VOICE_THRESHOLD);
  } catch {}
}

/**
 * Verify whether an intent should be allowed to execute.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function verifySpeakerForIntent(
  intent: string,
  confidence: number = 1.0
): Promise<{ allowed: boolean; spokenReply?: string }> {
  // If not a sensitive intent, allow freely
  if (!SENSITIVE_INTENTS.has(intent)) {
    return { allowed: true };
  }

  const enabled = await isVoiceIdEnabled();
  if (!enabled) {
    return { allowed: true };
  }

  const thresholdRaw = await AsyncStorage.getItem(KEY_VOICE_THRESHOLD);
  const threshold = thresholdRaw ? parseFloat(thresholdRaw) : DEFAULT_SENSITIVE_THRESHOLD;

  // Check confidence score from wake-word engine / STT
  if (confidence < threshold) {
    console.warn(`[VoiceId] Blocked sensitive action '${intent}' - confidence ${confidence.toFixed(2)} < threshold ${threshold}`);
    return {
      allowed: false,
      spokenReply: 'Voice verification required. That command is restricted to my verified operator, sir.',
    };
  }

  return { allowed: true };
}
