/**
 * src/jarvis/JarvisService.ts
 *
 * High-level service managing the Jarvis on-device voice pipeline,
 * Text-to-Speech voice responses, and multi-turn follow-up conversations.
 *
 * Core Capabilities:
 *   - Continuous 16kHz mono wake-word detection ("Hey Jarvis")
 *   - On-device speech recognition via android.speech.SpeechRecognizer
 *   - Instant local intent parsing & action execution
 *   - Free, on-device Text-to-Speech (en-IN default, hi-IN for Hindi/Devanagari)
 *   - Multi-turn follow-ups: 5-second automatic capture without wake word for
 *     confirmation dialogs (CLEAR_QUEUE, LEAVE_ROOM) and song disambiguation
 *   - Audio focus ducking and restoration for seamless music listening
 *   - Settings persistence for Voice Replies and Beep Only modes
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import type { EventSubscription } from 'expo-modules-core';
import { audioPlayer } from '../services/audioPlayer';
import { routeTranscript } from './brain/router';
import { executeIntent, type ActionResult } from './actions/executor';
import { getLiveHandlers } from './actions/registry';
import { REPLIES, pickVariant } from './brain/replies';
import { logJarvisEvent, recordWakeHit } from './eventLogger';
import { getAllNotes } from './memory/notepad';
import { getMusicProfile } from './memory/musicProfile';
import { appendConversationTurn } from './memory/conversationHistory';
import { getTimeOfDay } from './tools/timeDateTool';
import { proactiveEngine } from './ambient/proactiveEngine';
import type { Song } from '../types';
import type {
  JarvisState,
  CommandErrorReason,
  WakeWordDetection,
  CommandTranscriptEvent,
  SpeechDoneEvent,
  VoicePersona,
} from '../../modules/jarvis-wake-word';
export type { VoicePersona };

const JARVIS_ENABLED_KEY = '@jam_jarvis_enabled';
const JARVIS_THRESHOLD_KEY = '@jam_jarvis_threshold';
const JARVIS_VOICE_REPLIES_KEY = '@jam_jarvis_voice_replies';
const JARVIS_BEEP_ONLY_KEY = '@jam_jarvis_beep_only';
const JARVIS_CHARGING_ONLY_KEY = '@jam_jarvis_charging_only';
const JARVIS_LANGUAGE_KEY = '@jam_jarvis_language';
const JARVIS_ONBOARDING_DONE_KEY = '@jam_jarvis_onboarding_done';
const JARVIS_WAKE_MODEL_KEY = '@jam_jarvis_wake_model';
const JARVIS_VOICE_PERSONA_KEY = '@jam_jarvis_voice_persona';
const DEFAULT_THRESHOLD = 0.5;

// Lazy-import the native module (Android only)
let JarvisModule: typeof import('../../modules/jarvis-wake-word') | null = null;

function getModule() {
  if (Platform.OS !== 'android') {
    return null;
  }
  if (!JarvisModule) {
    try {
      JarvisModule = require('../../modules/jarvis-wake-word');
    } catch (e) {
      console.warn('[Jarvis] Native module not available:', e);
      return null;
    }
  }
  return JarvisModule;
}

// Subscriptions
let wakeWordSub: EventSubscription | null = null;
let stateSub: EventSubscription | null = null;
let transcriptSub: EventSubscription | null = null;
let errorSub: EventSubscription | null = null;
let nativeCommandSub: EventSubscription | null = null;
let speechDoneSub: EventSubscription | null = null;
let timelineSub: EventSubscription | null = null;

// Follow-up context tracking
export interface FollowUpContext {
  type: 'CLEAR_QUEUE' | 'LEAVE_ROOM' | 'DISAMBIGUATION';
  candidates?: [Song, Song];
  expiresAt: number;
}
let activeFollowUp: FollowUpContext | null = null;

// Music state tracking for ducking fallback
let originalMusicVolume: number | null = null;
let wasMusicPlaying = false;

// Callbacks registered by UI
export type JarvisCallbacks = {
  onWakeDetected?: (modelName: string, score: number) => void;
  onTranscript?: (text: string, isFinal: boolean, confidence?: number) => void;
  onActionResult?: (result: ActionResult) => void;
  onNativeCommand?: (event: { actionId: string; spokenReply: string; success: boolean }) => void;
  onError?: (reason: CommandErrorReason) => void;
  onStateChange?: (state: JarvisState) => void;
  onSpeechDone?: (utteranceId: string) => void;
};

let registeredCallbacks: JarvisCallbacks = {};
let lastWakeTime: number | null = null;
let isJarvisRunning = false;

/**
 * Duck music volume to avoid drowning the spoken command.
 */
async function duckMusic(): Promise<void> {
  try {
    const currentVol = audioPlayer.getVolume();
    originalMusicVolume = currentVol;
    const status = await audioPlayer.getStatus();
    wasMusicPlaying = status?.isPlaying ?? false;

    if (wasMusicPlaying && currentVol > 0) {
      await audioPlayer.setVolume(currentVol * 0.2);
      console.log(`[Jarvis] 🔉 Music ducked from ${currentVol} to ${(currentVol * 0.2).toFixed(2)}`);
    }
  } catch (err) {
    console.warn('[Jarvis] Ducking error:', err);
  }
}

/**
 * Restore previous music volume and ensure playback continues if it was playing.
 */
async function restoreMusic(): Promise<void> {
  try {
    if (originalMusicVolume !== null) {
      await audioPlayer.setVolume(originalMusicVolume);
      console.log(`[Jarvis] 🔊 Music volume restored to ${originalMusicVolume}`);
      originalMusicVolume = null;
    }

    if (wasMusicPlaying) {
      const status = await audioPlayer.getStatus();
      if (!status?.isPlaying) {
        await audioPlayer.play();
        console.log('[Jarvis] ▶️ Music playback resumed after command');
      }
      wasMusicPlaying = false;
    }
  } catch (err) {
    console.warn('[Jarvis] Restore music error:', err);
  }
}

/**
 * Request RECORD_AUDIO permission with a clear rationale dialog.
 */
export async function requestAudioPermission(): Promise<boolean> {
  try {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(
        'Microphone Permission Required',
        'Jarvis needs microphone access to listen for the wake word "Hey Jarvis" and your voice commands. ' +
          'Please grant microphone permission in device Settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Jarvis] Permission request error:', e);
    return false;
  }
}

/**
 * Speak text aloud using native Android TTS.
 */
export async function speak(text: string): Promise<void> {
  const mod = getModule();
  if (mod?.speak) {
    try {
      await mod.speak(text);
    } catch (e) {
      console.warn('[Jarvis] speak error:', e);
    }
  }
}

/**
 * Stop active speech synthesis.
 */
export function stopSpeaking(): void {
  const mod = getModule();
  mod?.stopSpeaking?.();
}

/**
 * Start the Jarvis wake-word and voice command listener.
 */
export async function startJarvis(callbacks: JarvisCallbacks = {}): Promise<boolean> {
  const mod = getModule();
  if (!mod) {
    console.warn('[Jarvis] Not available on this platform');
    return false;
  }

  const hasPermission = await requestAudioPermission();
  if (!hasPermission) {
    return false;
  }

  registeredCallbacks = callbacks;

  // If already running and subscriptions are actively attached, update callbacks and avoid duplicate registration
  if (isJarvisRunning && stateSub !== null) {
    return true;
  }

  try {
    // Ensure any stale subscriptions from prior runs are cleanly removed before registering new ones
    cleanup();
    registeredCallbacks = callbacks;

    // Load and apply saved sensitivity threshold
    const savedThreshold = await getWakeSensitivity();
    mod.setWakeSensitivity(savedThreshold);

    // Load and apply TTS settings (Voice replies On/Off, Beep only)
    const voiceReplies = await isVoiceRepliesEnabled();
    const beepOnly = await isBeepOnly();
    mod.setTtsSettings(voiceReplies, beepOnly);

    // Load and apply language and charging-only preferences
    const lang = await getPreferredLanguage();
    mod.setPreferredLanguage(lang);
    const chargingOnly = await isOnlyListenWhileCharging();
    mod.setOnlyListenWhileCharging(chargingOnly);

    // Load and apply selected wake-word model (Hello Jarvis vs Hey Jarvis)
    const wakeModel = await getSelectedWakeModel();
    mod.setSelectedWakeModel(wakeModel);

    // Load and apply selected Voice Persona (stark_uk, friday, india, us)
    const persona = await getVoicePersona();
    mod.setVoicePersona(persona);

    // Register proactive speaker for ambient briefings and alerts
    proactiveEngine.registerSpeaker(async (text: string) => {
      try {
        await mod?.speak(text);
      } catch (err) {
        console.warn('[Jarvis Ambient] Failed to speak ambient event:', err);
      }
    });

    // 1. Wake word detection listener
    wakeWordSub = mod.addWakeWordListener(async (event: WakeWordDetection) => {
      lastWakeTime = Date.now();
      console.log(`[Jarvis Pipeline] 🎤 Wake word detected: "${event.modelName}" (score: ${event.score.toFixed(3)})`);
      await recordWakeHit(event.score);
      registeredCallbacks.onWakeDetected?.(event.modelName, event.score);
    });

    // 2. State machine transition listener (logs exact reason for PAUSED_MIC_IN_USE)
    stateSub = mod.addStateListener(async (event) => {
      const reasonSuffix = event.reason ? ` (${event.reason})` : '';
      console.log(`[Jarvis] 🔄 State transition -> ${event.state}${reasonSuffix}`);
      logJarvisEvent('STATE_CHANGE', `Transitioned to ${event.state}${reasonSuffix}`, {
        state: event.state,
        reason: event.reason || '',
      });
      registeredCallbacks.onStateChange?.(event.state);

      if (event.state === 'WAKE_DETECTED') {
        await duckMusic();
      } else if (event.state === 'COOLDOWN' || event.state === 'IDLE_LISTENING') {
        await restoreMusic();
      }
    });

    // 3. Speech Done Listener (triggers follow-up capture after Jarvis asks a question)
    speechDoneSub = mod.addSpeechDoneListener(async (event: SpeechDoneEvent) => {
      console.log(`[Jarvis TTS] 🗣️ Utterance finished: ${event.utteranceId}`);
      registeredCallbacks.onSpeechDone?.(event.utteranceId);

      if (activeFollowUp && Date.now() < activeFollowUp.expiresAt) {
        console.log('[Jarvis Follow-Up] Auto-starting follow-up capture for 5s…');
        try {
          await mod?.startFollowUpCapture(5000);
        } catch (err) {
          console.warn('[Jarvis Follow-Up] startFollowUpCapture error:', err);
        }
      }
    });

    // 4. Command speech-to-text transcript listener -> Pipeline Execution (Stage 2 -> 3 -> 4 -> 5)
    transcriptSub = mod.addTranscriptListener(async (event: CommandTranscriptEvent) => {
      if (event.isFinal) {
        const transcriptTime = Date.now();
        const wakeToTranscriptMs = lastWakeTime ? transcriptTime - lastWakeTime : 0;
        console.log(`[Jarvis Pipeline] 🎯 Final transcript: "${event.text}" (conf: ${event.confidence?.toFixed(2) ?? 'N/A'})`);
        console.log(`[Jarvis Pipeline] ⏱️ 1/3 Wake -> Transcript: ${wakeToTranscriptMs}ms`);
        logJarvisEvent('TRANSCRIPT', `Speech: "${event.text}"`, { confidence: event.confidence, latencyMs: wakeToTranscriptMs });

        registeredCallbacks.onTranscript?.(event.text, event.isFinal, event.confidence);

        // If the command was executed natively in Kotlin (<50ms fast path), do not duplicate execution
        if (event.nativeHandled) {
          console.log(`[Jarvis Pipeline] ⚡ Handled natively on device: "${event.text}"`);
          return;
        }

        const liveHandlers = getLiveHandlers();
        const rawNormalized = event.text.toLowerCase().trim();

        // ---------------------------------------------------------------------
        // Check active multi-turn follow-up turn first (Stage 5)
        // ---------------------------------------------------------------------
        if (activeFollowUp && Date.now() < activeFollowUp.expiresAt) {
          const followUp = activeFollowUp;
          activeFollowUp = null; // Clear immediately to prevent duplicate runs

          const isAffirmative =
            /^(yes|haan|ha|sure|yeah|yep|do it|kar do|haanji|ok|okay|bilkul|confirm|yes please)$/i.test(rawNormalized);
          const isNegative =
            /^(no|nahi|na|cancel|mat karo|ruk jao|nope|never mind|rehne do|chhod do)$/i.test(rawNormalized);
          const isFirstOption =
            /^(first|1st|one|pehla|pehle wala|first one|pehla wala|option one)$/i.test(rawNormalized);
          const isSecondOption =
            /^(second|2nd|two|doosra|doosre wala|second one|doosra wala|option two)$/i.test(rawNormalized);

          if (followUp.type === 'CLEAR_QUEUE') {
            if (isAffirmative) {
              liveHandlers?.clearQueue();
              const reply = pickVariant(REPLIES.CLEAR_QUEUE_DONE);
              liveHandlers?.showToast('Queue cleared', 'info');
              await mod.speak(reply);
              return;
            } else if (isNegative) {
              const reply = pickVariant(REPLIES.CONFIRMATION_CANCELLED);
              await mod.speak(reply);
              return;
            }
          } else if (followUp.type === 'LEAVE_ROOM') {
            if (isAffirmative) {
              liveHandlers?.leaveRoom();
              const reply = pickVariant(REPLIES.LEAVE_ROOM_DONE);
              liveHandlers?.showToast('Left Jam room', 'info');
              await mod.speak(reply);
              return;
            } else if (isNegative) {
              const reply = 'Staying in the room.';
              await mod.speak(reply);
              return;
            }
          } else if (followUp.type === 'DISAMBIGUATION' && followUp.candidates) {
            if (isFirstOption || isAffirmative) {
              const chosen = followUp.candidates[0];
              liveHandlers?.playSong(chosen);
              const reply = pickVariant(REPLIES.PLAY_SONG)(chosen.title, chosen.artist);
              await mod.speak(reply);
              return;
            } else if (isSecondOption) {
              const chosen = followUp.candidates[1];
              liveHandlers?.playSong(chosen);
              const reply = pickVariant(REPLIES.PLAY_SONG)(chosen.title, chosen.artist);
              await mod.speak(reply);
              return;
            } else if (isNegative) {
              const reply = pickVariant(REPLIES.CONFIRMATION_CANCELLED);
              await mod.speak(reply);
              return;
            }
          }
        }

        // ---------------------------------------------------------------------
        // Standard Intent Resolution (Stages 3 -> 4)
        // ---------------------------------------------------------------------
        const currentSong = liveHandlers?.getCurrentSong();
        const isPlaying = liveHandlers?.getIsPlaying() ?? false;
        const queue = liveHandlers?.getQueue() ?? [];

        // Stage 3: Router
        const routerStart = Date.now();
        const notes = await getAllNotes();
        const musicProf = await getMusicProfile();
        const timeOfDay = getTimeOfDay();
        const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        const intentResult = await routeTranscript(event.text, {
          currentSongTitle: currentSong?.title || (audioPlayer as any).currentMetadata?.title,
          currentSongArtist: currentSong?.artist || (audioPlayer as any).currentMetadata?.artist,
          isPlaying,
          queueLength: queue.length,
          userNotes: notes.slice(0, 5),
          musicProfile: musicProf,
          timeOfDay,
          dayOfWeek,
        });
        const routerTime = Date.now();
        const transcriptToIntentMs = routerTime - routerStart;
        console.log(
          `[Jarvis Pipeline] ⏱️ 2/3 Transcript -> Intent: ${transcriptToIntentMs}ms (Intent: ${intentResult.intent}, Source: ${intentResult.source})`
        );

        // Stage 4: Executor
        const executorStart = Date.now();
        const actionResult = await executeIntent(intentResult);
        const actionTime = Date.now();
        const intentToActionMs = actionTime - executorStart;
        const totalPipelineMs = lastWakeTime
          ? actionTime - lastWakeTime
          : transcriptToIntentMs + intentToActionMs;

        console.log(`[Jarvis Pipeline] ⏱️ 3/3 Intent -> Action: ${intentToActionMs}ms (ok: ${actionResult.ok})`);
        console.log(`[Jarvis Pipeline] 🚀 TOTAL PIPELINE LATENCY: ${totalPipelineMs}ms (wake -> action)`);
        logJarvisEvent('ACTION', `Action: ${intentResult.intent}`, { success: actionResult.ok, latencyMs: totalPipelineMs });

        // Record turns to persistent conversation history
        appendConversationTurn({ role: 'user', text: event.text }).catch(() => {});
        if (actionResult.spokenReply) {
          appendConversationTurn({ role: 'assistant', text: actionResult.spokenReply }).catch(() => {});
        }

        registeredCallbacks.onActionResult?.(actionResult);

        // Stage 5: Speak reply and establish follow-up state if confirmation needed
        if (actionResult.needsConfirmation) {
          if (actionResult.ambiguousCandidates) {
            activeFollowUp = {
              type: 'DISAMBIGUATION',
              candidates: actionResult.ambiguousCandidates,
              expiresAt: Date.now() + 12000,
            };
          } else if (intentResult.intent === 'CLEAR_QUEUE') {
            activeFollowUp = {
              type: 'CLEAR_QUEUE',
              expiresAt: Date.now() + 12000,
            };
          } else if (intentResult.intent === 'LEAVE_ROOM') {
            activeFollowUp = {
              type: 'LEAVE_ROOM',
              expiresAt: Date.now() + 12000,
            };
          }

          if (actionResult.spokenReply) {
            await mod.speak(actionResult.spokenReply);
          }
        } else {
          activeFollowUp = null;
          if (actionResult.spokenReply) {
            await mod.speak(actionResult.spokenReply);
          }
        }
      } else {
        console.log(`[Jarvis] 🗣️ Partial transcript: "${event.text}"`);
        registeredCallbacks.onTranscript?.(event.text, event.isFinal, event.confidence);
      }
    });

    // 5. Command capture error listener
    errorSub = mod.addErrorListener(async (event) => {
      console.warn(`[Jarvis] ⚠️ Command error: ${event.reason}`);
      logJarvisEvent('ERROR', `Recognition error: ${event.reason}`, { reason: event.reason });
      await restoreMusic();

      // If follow-up timed out without answer, cancel politely
      if (activeFollowUp && (event.reason === 'no_speech' || event.reason === 'timeout')) {
        console.log('[Jarvis Follow-Up] Follow-up timed out — cancelling politely');
        activeFollowUp = null;
        await mod.speak(pickVariant(REPLIES.CONFIRMATION_TIMEOUT));
      }

      registeredCallbacks.onError?.(event.reason);
    });

    // 6. Native on-device command execution listener (<50ms fast path)
    nativeCommandSub = mod.addNativeCommandListener((event) => {
      console.log(
        `[Jarvis Native] ⚡ Native action executed on-device: ${event.actionId} - "${event.spokenReply}" (success=${event.success})`
      );
      logJarvisEvent('ACTION', `Native: ${event.actionId}`, { reply: event.spokenReply, success: event.success });
      const liveHandlers = getLiveHandlers();
      if (liveHandlers) {
        liveHandlers.showToast(event.spokenReply, event.success ? 'success' : 'error');
      }
      registeredCallbacks.onNativeCommand?.(event);
    });

    // 7. Millisecond timeline events for diagnostic tracking
    timelineSub = mod.addTimelineListener?.((event: { event: string; elapsedMs: number; details: Record<string, any> }) => {
      console.log(`[Jarvis Timeline][+${event.elapsedMs}ms] ${event.event}`, event.details);
      logJarvisEvent('TIMELINE', `[+${event.elapsedMs}ms] ${event.event}`, event.details);
    });

    // Start native foreground service
    await mod.startListening();
    logJarvisEvent('SERVICE', 'Jarvis service started');

    // Persist enabled state
    await AsyncStorage.setItem(JARVIS_ENABLED_KEY, 'true');

    // Check battery optimization status
    const isOptimized = mod.isBatteryOptimized();
    if (isOptimized) {
      console.warn(
        '[Jarvis] ⚠️ App is battery-optimized. Consider disabling battery optimization for background listening.'
      );
    }

    isJarvisRunning = true;
    return true;
  } catch (e) {
    console.error('[Jarvis] Failed to start:', e);
    logJarvisEvent('ERROR', `Failed to start: ${e}`);
    cleanup();
    await restoreMusic();
    return false;
  }
}

/**
 * Stop the Jarvis listener service and clean up listeners.
 */
export async function stopJarvis(): Promise<void> {
  const mod = getModule();
  if (!mod) return;

  try {
    await mod.stopListening();
  } catch (e) {
    console.warn('[Jarvis] Failed to stop:', e);
  }

  cleanup();
  await restoreMusic();
  await AsyncStorage.setItem(JARVIS_ENABLED_KEY, 'false');
  logJarvisEvent('SERVICE', 'Jarvis service stopped');
}

function cleanup() {
  isJarvisRunning = false;
  wakeWordSub?.remove();
  stateSub?.remove();
  transcriptSub?.remove();
  errorSub?.remove();
  nativeCommandSub?.remove();
  speechDoneSub?.remove();
  timelineSub?.remove();

  wakeWordSub = null;
  stateSub = null;
  transcriptSub = null;
  errorSub = null;
  nativeCommandSub = null;
  speechDoneSub = null;
  timelineSub = null;
  activeFollowUp = null;
  registeredCallbacks = {};
}

/**
 * Check if Jarvis was previously enabled.
 */
export async function isJarvisEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Check if app is subject to Android battery restrictions.
 */
export function checkBatteryOptimization(): boolean {
  const mod = getModule();
  if (!mod) return false;
  return mod.isBatteryOptimized();
}

/**
 * Update wake sensitivity threshold (0.01 - 0.99) and persist to storage.
 */
export async function setWakeSensitivity(threshold: number): Promise<void> {
  const clamped = Math.max(0.01, Math.min(0.99, threshold));
  try {
    await AsyncStorage.setItem(JARVIS_THRESHOLD_KEY, clamped.toString());
    const mod = getModule();
    mod?.setWakeSensitivity(clamped);
  } catch (err) {
    console.warn('[Jarvis] Failed to save sensitivity:', err);
  }
}

/**
 * Retrieve saved wake sensitivity threshold.
 */
export async function getWakeSensitivity(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_THRESHOLD_KEY);
    if (val !== null) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[Jarvis] Failed to load sensitivity:', err);
  }
  return DEFAULT_THRESHOLD;
}

/**
 * Voice Replies setting (true = TTS spoken responses, false = muted responses).
 */
export async function isVoiceRepliesEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_VOICE_REPLIES_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export async function setVoiceRepliesEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(JARVIS_VOICE_REPLIES_KEY, enabled.toString());
    const beepOnly = await isBeepOnly();
    const mod = getModule();
    mod?.setTtsSettings(enabled, beepOnly);
  } catch (err) {
    console.warn('[Jarvis] Failed to save voice replies setting:', err);
  }
}

/**
 * Beep Only mode (true = audio earcon tones only, no spoken TTS words).
 */
export async function isBeepOnly(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_BEEP_ONLY_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setBeepOnly(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(JARVIS_BEEP_ONLY_KEY, enabled.toString());
    const voiceReplies = await isVoiceRepliesEnabled();
    const mod = getModule();
    mod?.setTtsSettings(voiceReplies, enabled);
  } catch (err) {
    console.warn('[Jarvis] Failed to save beep only setting:', err);
  }
}

/**
 * Directly execute a device command natively in Kotlin (<50ms fast path).
 */
export async function executeNativeCommand(text: string) {
  const mod = getModule();
  if (!mod?.executeNativeCommand) {
    return { matched: false, error: 'Jarvis native module unavailable' };
  }
  return await mod.executeNativeCommand(text);
}

/**
 * Toggle flashlight on/off directly.
 */
export function toggleFlashlight(): boolean {
  const mod = getModule();
  if (!mod?.toggleFlashlight) return false;
  return mod.toggleFlashlight();
}

/**
 * Query current flashlight status.
 */
export function isFlashlightOn(): boolean {
  const mod = getModule();
  if (!mod?.isFlashlightOn) return false;
  return mod.isFlashlightOn();
}

/**
 * Onboarding completion status (stored in AsyncStorage)
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_ONBOARDING_DONE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(done: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(JARVIS_ONBOARDING_DONE_KEY, done ? 'true' : 'false');
  } catch (err) {
    console.warn('[Jarvis] Failed to save onboarding status:', err);
  }
}

/**
 * Get device hardware manufacturer (lowercase, e.g. "xiaomi", "samsung", "oneplus").
 */
export function getDeviceManufacturer(): string {
  const mod = getModule();
  return mod?.getDeviceManufacturer ? mod.getDeviceManufacturer() : 'unknown';
}

/**
 * Get device model name.
 */
export function getDeviceModel(): string {
  const mod = getModule();
  return mod?.getDeviceModel ? mod.getDeviceModel() : 'unknown';
}

/**
 * Open OEM autostart / background app management settings.
 */
export function openOemAutostartSettings(): boolean {
  const mod = getModule();
  return mod?.openOemAutostartSettings ? mod.openOemAutostartSettings() : false;
}

/**
 * Request exemption from battery optimizations (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
 */
export function requestIgnoreBatteryOptimizations(): boolean {
  const mod = getModule();
  return mod?.requestIgnoreBatteryOptimizations ? mod.requestIgnoreBatteryOptimizations() : false;
}

/**
 * Open battery optimization list settings screen.
 */
export function openBatteryOptimizationSettings(): boolean {
  const mod = getModule();
  return mod?.openBatteryOptimizationSettings ? mod.openBatteryOptimizationSettings() : false;
}

/**
 * Open app details system settings page.
 */
export function openAppSettings(): boolean {
  const mod = getModule();
  return mod?.openAppSettings ? mod.openAppSettings() : false;
}

/**
 * Charging-only listening mode
 */
export async function isOnlyListenWhileCharging(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_CHARGING_ONLY_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setOnlyListenWhileCharging(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(JARVIS_CHARGING_ONLY_KEY, enabled.toString());
    const mod = getModule();
    mod?.setOnlyListenWhileCharging?.(enabled);
  } catch (err) {
    console.warn('[Jarvis] Failed to save charging-only setting:', err);
  }
}

/**
 * Preferred language setting ('en-IN', 'hi-IN', or 'auto')
 */
export async function getPreferredLanguage(): Promise<string> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_LANGUAGE_KEY);
    return val || 'en-IN';
  } catch {
    return 'en-IN';
  }
}

export async function setPreferredLanguage(lang: string): Promise<void> {
  try {
    await AsyncStorage.setItem(JARVIS_LANGUAGE_KEY, lang);
    const mod = getModule();
    mod?.setPreferredLanguage?.(lang);
  } catch (err) {
    console.warn('[Jarvis] Failed to save preferred language:', err);
  }
}

/**
 * Get current native Jarvis service state
 */
export function getJarvisServiceState(): JarvisState {
  const mod = getModule();
  return mod?.getJarvisServiceState ? (mod.getJarvisServiceState() as JarvisState) : 'STOPPED';
}

export type WakePhraseModel = 'both' | 'hey_jarvis' | 'hello_jarvis';

/**
 * Active Wake Word Model ('both', 'hey_jarvis', or 'hello_jarvis')
 */
export async function getSelectedWakeModel(): Promise<WakePhraseModel> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_WAKE_MODEL_KEY);
    return (val as WakePhraseModel) || 'both';
  } catch {
    return 'both';
  }
}

export async function setSelectedWakeModel(model: WakePhraseModel): Promise<void> {
  try {
    await AsyncStorage.setItem(JARVIS_WAKE_MODEL_KEY, model);
    const mod = getModule();
    mod?.setSelectedWakeModel?.(model);
    logJarvisEvent('SERVICE', `Wake phrase updated to: ${model}`);
  } catch (err) {
    console.warn('[Jarvis] Failed to save wake model selection:', err);
  }
}

/**
 * Active Voice Persona ('stark_uk' | 'friday' | 'india' | 'us')
 */
export async function getVoicePersona(): Promise<VoicePersona> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_VOICE_PERSONA_KEY);
    return (val as VoicePersona) || 'stark_uk';
  } catch {
    return 'stark_uk';
  }
}

export async function setVoicePersona(persona: VoicePersona): Promise<void> {
  try {
    await AsyncStorage.setItem(JARVIS_VOICE_PERSONA_KEY, persona);
    const mod = getModule();
    mod?.setVoicePersona?.(persona);
    logJarvisEvent('SERVICE', `Voice persona set to: ${persona}`);
  } catch (err) {
    console.warn('[Jarvis] Failed to save voice persona:', err);
  }
}

const JARVIS_WHATSAPP_AUTOSEND_KEY = '@jam_jarvis_whatsapp_autosend';

/**
 * Check if the Jarvis Accessibility Service is active.
 */
export function isAccessibilityServiceActive(): boolean {
  const mod = getModule();
  return mod?.isAccessibilityServiceEnabled ? mod.isAccessibilityServiceEnabled() : false;
}

/**
 * Open Android Accessibility Settings so the user can toggle "Jarvis Automation".
 */
export function openAccessibilitySettings(): void {
  const mod = getModule();
  mod?.openAccessibilitySettings?.();
}

/**
 * Whether WhatsApp Auto-Send is enabled by the user in Profile settings.
 */
export async function isWhatsAppAutoSendEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(JARVIS_WHATSAPP_AUTOSEND_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setWhatsAppAutoSendEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(JARVIS_WHATSAPP_AUTOSEND_KEY, enabled.toString());
    logJarvisEvent('SERVICE', `WhatsApp auto-send preference set to: ${enabled}`);
  } catch (err) {
    console.warn('[Jarvis] Failed to save whatsapp auto-send setting:', err);
  }
}

/**
 * Send a WhatsApp message natively with hands-free auto-send.
 */
export function sendWhatsAppMessage(contact: string, message: string): boolean {
  const mod = getModule();
  return mod?.sendWhatsAppMessage ? mod.sendWhatsAppMessage(contact, message) : false;
}

/**
 * Get the current reason why Jarvis listening is paused (if any).
 */
export function getJarvisPauseReason(): string {
  const mod = getModule();
  return mod?.getJarvisPauseReason ? mod.getJarvisPauseReason() : '';
}

/**
 * Force reset the Jarvis listener service state and wake word engine.
 */
export function forceResetService(): void {
  const mod = getModule();
  mod?.forceResetService?.();
}

/**
 * Level 6: General App UI Automation
 */
export function openApp(appName: string): boolean {
  const mod = getModule();
  return mod?.openApp ? mod.openApp(appName) : false;
}

export function startAutoScroll(
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  intervalSeconds: number = 10,
  durationSeconds: number = 0
): boolean {
  const mod = getModule();
  return mod?.startAutoScroll ? mod.startAutoScroll(direction, intervalSeconds, durationSeconds) : false;
}

export function stopAutomation(): boolean {
  const mod = getModule();
  return mod?.stopAutomation ? mod.stopAutomation() : false;
}

export function isAutomationRunning(): boolean {
  const mod = getModule();
  return mod?.isAutomationRunning ? mod.isAutomationRunning() : false;
}

export function tapElement(query: string): boolean {
  const mod = getModule();
  return mod?.tapElement ? mod.tapElement(query) : false;
}

export function typeText(query: string, text: string): boolean {
  const mod = getModule();
  return mod?.typeText ? mod.typeText(query, text) : false;
}

export function getForegroundApp(): { packageName: string; appName: string; activity?: string } {
  const mod = getModule();
  return mod?.getForegroundApp ? mod.getForegroundApp() : { packageName: '', appName: '' };
}

export function inspectScreen(): Array<{
  text: string;
  desc: string;
  clickable: boolean;
  editable: boolean;
  bounds: [number, number, number, number];
}> {
  const mod = getModule();
  return mod?.inspectScreen ? mod.inspectScreen() : [];
}


