/**
 * Type definitions for the JarvisWakeWord Expo Module.
 *
 * This module bridges the native Android JarvisListenerService
 * to React Native / Expo.
 */

export type JarvisState =
  | 'IDLE_LISTENING'
  | 'WAKE_DETECTED'
  | 'CAPTURING'
  | 'TRANSCRIBING'
  | 'COOLDOWN'
  | 'PAUSED_MIC_IN_USE'
  | 'PAUSED_CHARGING_ONLY'
  | 'STOPPED';

export type CommandErrorReason =
  | 'no_speech'
  | 'timeout'
  | 'recognizer_unavailable'
  | 'mic_busy'
  | 'other';

export interface WakeWordDetection {
  /** Name of the detected wake-word model (e.g., "Hey Jarvis") */
  modelName: string;
  /** Confidence score from the classifier (0.0 - 1.0) */
  score: number;
}

export interface JarvisStateEvent {
  /** Current state of the Jarvis mic state machine */
  state: JarvisState;
}

export interface CommandTranscriptEvent {
  /** Transcribed speech text */
  text: string;
  /** Whether this is a finalized transcript or partial stream */
  isFinal: boolean;
  /** Confidence score if reported by recognizer (0.0 - 1.0) */
  confidence?: number;
  /** Whether this command was already executed natively by Kotlin (<50ms fast path) */
  nativeHandled?: boolean;
}

export interface CommandErrorEvent {
  /** Error reason indicating why command capture failed or terminated */
  reason: CommandErrorReason;
}

export interface SpeechDoneEvent {
  /** Utterance ID of the completed speech synthesis */
  utteranceId: string;
}
