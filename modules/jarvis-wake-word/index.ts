/**
 * JarvisWakeWord — JS entry point for the local Expo Module.
 *
 * Provides a typed API over the native JarvisWakeWordModule:
 *   - startListening(): Promise<void>
 *   - stopListening(): Promise<void>
 *   - isBatteryOptimized(): boolean
 *   - hasAudioPermission(): boolean
 *   - setWakeSensitivity(threshold: number): void
 *   - getWakeSensitivity(): number
 *   - addWakeWordListener(callback): EventSubscription
 *   - addStateListener(callback): EventSubscription
 *   - addTranscriptListener(callback): EventSubscription
 *   - addErrorListener(callback): EventSubscription
 */

import { requireNativeModule, EventEmitter, type EventSubscription } from 'expo-modules-core';
import type {
  WakeWordDetection,
  JarvisState,
  JarvisStateEvent,
  CommandTranscriptEvent,
  CommandErrorEvent,
  CommandErrorReason,
  SpeechDoneEvent,
} from './src/JarvisWakeWord.types';

export interface NativeCommandEvent {
  actionId: string;
  spokenReply: string;
  success: boolean;
}

export interface NativeCommandResult {
  matched: boolean;
  actionId?: string;
  spokenReply?: string;
  success?: boolean;
  error?: string;
}

type JarvisEvents = {
  wakeWordDetected: (event: WakeWordDetection) => void;
  onJarvisState: (event: JarvisStateEvent) => void;
  onCommandTranscript: (event: CommandTranscriptEvent) => void;
  onCommandError: (event: CommandErrorEvent) => void;
  onNativeCommandExecuted: (event: NativeCommandEvent) => void;
  onSpeechDone: (event: SpeechDoneEvent) => void;
};

// Load the native module (Android only)
const JarvisWakeWordNative = requireNativeModule('JarvisWakeWord');
const emitter = new EventEmitter<JarvisEvents>(JarvisWakeWordNative);

/**
 * Start the Jarvis foreground service and begin wake-word detection.
 * Requires RECORD_AUDIO permission to be granted first.
 */
export async function startListening(): Promise<void> {
  return await JarvisWakeWordNative.startListening();
}

/**
 * Stop the Jarvis foreground service and wake-word detection.
 */
export async function stopListening(): Promise<void> {
  return await JarvisWakeWordNative.stopListening();
}

/**
 * Check if the app is battery-optimized (restricted).
 * When true, background listening may be unreliable.
 */
export function isBatteryOptimized(): boolean {
  return JarvisWakeWordNative.isBatteryOptimized();
}

/**
 * Check if RECORD_AUDIO permission is currently granted.
 */
export function hasAudioPermission(): boolean {
  return JarvisWakeWordNative.hasAudioPermission();
}

/**
 * Set the wake word sensitivity threshold (0.01 - 0.99).
 * Lower = more sensitive / more false positives.
 * Higher = stricter / fewer false positives.
 */
export function setWakeSensitivity(threshold: number): void {
  JarvisWakeWordNative.setWakeSensitivity(threshold);
}

/**
 * Get the currently configured wake word sensitivity threshold.
 */
export function getWakeSensitivity(): number {
  return JarvisWakeWordNative.getWakeSensitivity();
}

/**
 * Set the Android system media volume directly (0 - 100 percent).
 */
export function setSystemVolume(percent: number): void {
  JarvisWakeWordNative.setSystemVolume(Math.round(percent));
}

/**
 * Get current Android system media volume (0 - 100 percent).
 */
export function getSystemVolume(): number {
  return JarvisWakeWordNative.getSystemVolume();
}

/**
 * Subscribe to wake-word detection events.
 */
export function addWakeWordListener(
  callback: (event: WakeWordDetection) => void
): EventSubscription {
  return emitter.addListener('wakeWordDetected', callback);
}

/**
 * Subscribe to state machine transitions:
 * IDLE_LISTENING -> WAKE_DETECTED -> CAPTURING -> TRANSCRIBING -> COOLDOWN -> IDLE_LISTENING
 */
export function addStateListener(
  callback: (event: JarvisStateEvent) => void
): EventSubscription {
  return emitter.addListener('onJarvisState', callback);
}

/**
 * Subscribe to spoken command transcripts (partial streams and final results).
 */
export function addTranscriptListener(
  callback: (event: CommandTranscriptEvent) => void
): EventSubscription {
  return emitter.addListener('onCommandTranscript', callback);
}

/**
 * Subscribe to command capture errors (no_speech, timeout, recognizer_unavailable, mic_busy, other).
 */
export function addErrorListener(
  callback: (event: CommandErrorEvent) => void
): EventSubscription {
  return emitter.addListener('onCommandError', callback);
}

/**
 * Subscribe to native device control execution events.
 */
export function addNativeCommandListener(
  callback: (event: NativeCommandEvent) => void
): EventSubscription {
  return emitter.addListener('onNativeCommandExecuted', callback);
}

/**
 * Execute a device command natively in Kotlin (<50ms fast path).
 */
export async function executeNativeCommand(text: string): Promise<NativeCommandResult> {
  return await JarvisWakeWordNative.executeNativeCommand(text);
}

/**
 * Directly toggle device flashlight.
 */
export function toggleFlashlight(): boolean {
  return JarvisWakeWordNative.toggleFlashlight();
}

/**
 * Query current flashlight status.
 */
export function isFlashlightOn(): boolean {
  return JarvisWakeWordNative.isFlashlightOn();
}

/**
 * Speak text aloud using Android's on-device TextToSpeech.
 */
export async function speak(text: string): Promise<void> {
  return await JarvisWakeWordNative.speak(text);
}

/**
 * Stop active speech synthesis immediately.
 */
export function stopSpeaking(): void {
  JarvisWakeWordNative.stopSpeaking();
}

/**
 * Start a follow-up capture turn (~5s) without requiring wake word.
 */
export async function startFollowUpCapture(timeoutMs = 5000): Promise<void> {
  return await JarvisWakeWordNative.startFollowUpCapture(timeoutMs);
}

/**
 * Update native TTS settings (voice replies on/off, beep only mode).
 */
export function setTtsSettings(voiceRepliesEnabled: boolean, beepOnly: boolean): void {
  JarvisWakeWordNative.setTtsSettings(voiceRepliesEnabled, beepOnly);
}

/**
 * Enable or disable wake word barge-in during TTS playback.
 */
export function setBargeInEnabled(enabled: boolean): void {
  JarvisWakeWordNative.setBargeInEnabled(enabled);
}

/**
 * Subscribe to speech done events from the native TTS engine.
 */
export function addSpeechDoneListener(
  callback: (event: SpeechDoneEvent) => void
): EventSubscription {
  return emitter.addListener('onSpeechDone', callback);
}

/**
 * Get device hardware manufacturer (e.g. "xiaomi", "samsung", "oneplus").
 */
export function getDeviceManufacturer(): string {
  try {
    return JarvisWakeWordNative.getDeviceManufacturer() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Get device hardware model name.
 */
export function getDeviceModel(): string {
  try {
    return JarvisWakeWordNative.getDeviceModel() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Launch OEM autostart / background management settings.
 */
export function openOemAutostartSettings(): boolean {
  try {
    return JarvisWakeWordNative.openOemAutostartSettings();
  } catch {
    return false;
  }
}

/**
 * Directly request battery optimization exemption (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
 */
export function requestIgnoreBatteryOptimizations(): boolean {
  try {
    return JarvisWakeWordNative.requestIgnoreBatteryOptimizations();
  } catch {
    return false;
  }
}

/**
 * Open battery optimization list settings screen.
 */
export function openBatteryOptimizationSettings(): boolean {
  try {
    return JarvisWakeWordNative.openBatteryOptimizationSettings();
  } catch {
    return false;
  }
}

/**
 * Open app details system settings page.
 */
export function openAppSettings(): boolean {
  try {
    return JarvisWakeWordNative.openAppSettings();
  } catch {
    return false;
  }
}

/**
 * Configure whether Jarvis should only listen when plugged into power.
 */
export function setOnlyListenWhileCharging(enabled: boolean): void {
  try {
    JarvisWakeWordNative.setOnlyListenWhileCharging(enabled);
  } catch {
    // ignore
  }
}

/**
 * Query whether Jarvis only listens while charging.
 */
export function getOnlyListenWhileCharging(): boolean {
  try {
    return JarvisWakeWordNative.getOnlyListenWhileCharging();
  } catch {
    return false;
  }
}

/**
 * Set preferred speech recognition language ('en-IN', 'hi-IN', or 'auto').
 */
export function setPreferredLanguage(lang: string): void {
  try {
    JarvisWakeWordNative.setPreferredLanguage(lang);
  } catch {
    // ignore
  }
}

/**
 * Query current preferred speech recognition language.
 */
export function getPreferredLanguage(): string {
  try {
    return JarvisWakeWordNative.getPreferredLanguage() || 'en-IN';
  } catch {
    return 'en-IN';
  }
}

/**
 * Query current native service state name.
 */
export function getJarvisServiceState(): JarvisState {
  try {
    return JarvisWakeWordNative.getJarvisServiceState() as JarvisState;
  } catch {
    return 'STOPPED';
  }
}

/**
 * Configure active wake word model ('hey_jarvis' or 'hello_jarvis').
 */
export function setSelectedWakeModel(model: 'hey_jarvis' | 'hello_jarvis'): void {
  try {
    JarvisWakeWordNative.setSelectedWakeModel(model);
  } catch {
    // ignore
  }
}

/**
 * Query active wake word model ('hey_jarvis' or 'hello_jarvis').
 */
export function getSelectedWakeModel(): 'hey_jarvis' | 'hello_jarvis' {
  try {
    return (JarvisWakeWordNative.getSelectedWakeModel() || 'hey_jarvis') as 'hey_jarvis' | 'hello_jarvis';
  } catch {
    return 'hey_jarvis';
  }
}

/**
 * Check if the Jarvis Accessibility Service is currently active in Android settings.
 */
export function isAccessibilityServiceEnabled(): boolean {
  try {
    return !!JarvisWakeWordNative.isAccessibilityServiceEnabled();
  } catch {
    return false;
  }
}

/**
 * Open Android Accessibility Settings to allow the user to enable Jarvis Automation.
 */
export function openAccessibilitySettings(): void {
  try {
    JarvisWakeWordNative.openAccessibilitySettings();
  } catch {
    // ignore
  }
}

/**
 * Dispatch a native WhatsApp message with hands-free auto-send support.
 */
export function sendWhatsAppMessage(contact: string, message: string): boolean {
  try {
    return !!JarvisWakeWordNative.sendWhatsAppMessage(contact, message);
  } catch {
    return false;
  }
}

/**
 * Retrieve on-device diagnostics telemetry and status report.
 */
export function getStatusReport(): { spokenReply: string; actionId: string; extraData?: Record<string, string> } | null {
  try {
    return JarvisWakeWordNative.getStatusReport?.() ?? null;
  } catch {
    return null;
  }
}

export type {
  WakeWordDetection,
  JarvisState,
  JarvisStateEvent,
  CommandTranscriptEvent,
  CommandErrorEvent,
  CommandErrorReason,
  SpeechDoneEvent,
  EventSubscription,
};


