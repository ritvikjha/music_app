/**
 * src/jarvis/brain/llmClient.ts
 *
 * Client that queries the Jarvis Brain proxy on the existing backend server.
 *
 * PRIVACY GUARANTEE:
 *   - Zero API keys are stored in the client bundle.
 *   - Only the transcript, basic current song metadata, and last 3 turns leave the phone.
 *   - No audio files or personal data ever leave the device.
 */

import type { IntentResult, BrainContext } from './types';

declare const process: any;
declare const require: any;

const CLIENT_TIMEOUT_MS = 7500;
const JARVIS_TOKEN = process.env.EXPO_PUBLIC_JARVIS_TOKEN || 'jarvis-jam-secret-2026';
const DEFAULT_SERVER_URL = 'https://music-app-onx9.onrender.com';

function getServerUrl(): string {
  try {
    // Dynamic import to avoid hard dependency on expo-constants in test / CLI environments
    const { CONFIG } = require('../../config');
    return CONFIG?.SYNC_SERVER_URL || DEFAULT_SERVER_URL;
  } catch {
    return process.env.EXPO_PUBLIC_SYNC_SERVER_URL || DEFAULT_SERVER_URL;
  }
}

/**
 * Queries the backend proxy at POST <SYNC_SERVER_URL>/jarvis/brain.
 * Handles Render cold-start latency with graceful timeouts and fallbacks.
 */
export async function queryLlmBrain(
  transcript: string,
  context?: BrainContext
): Promise<IntentResult> {
  const startTime = Date.now();

  // Strip anything older than last 3 turns for privacy and compact payloads
  const recentHistory = (context?.history || []).slice(-3);

  const payload = {
    transcript,
    currentSongTitle: context?.currentSongTitle || null,
    currentSongArtist: context?.currentSongArtist || null,
    isPlaying: context?.isPlaying ?? false,
    queueLength: context?.queueLength ?? 0,
    history: recentHistory,
    deviceId: context?.deviceId || 'jam-mobile-client',
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const baseUrl = getServerUrl().replace(/\/$/, '');
    const url = `${baseUrl}/jarvis/brain`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jarvis-token': JARVIS_TOKEN,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[Jarvis LLM] Server returned HTTP ${response.status}`);
      return {
        intent: 'UNKNOWN',
        slots: { raw: transcript },
        confidence: 0,
        spokenReply: "I'm having trouble reaching the server, but local music commands still work.",
        source: 'llm',
        latencyMs: Date.now() - startTime,
      };
    }

    const data = await response.json();
    data.source = 'llm';
    data.latencyMs = Date.now() - startTime;
    return data as IntentResult;
  } catch (error: any) {
    clearTimeout(timer);
    const isTimeout = error?.name === 'AbortError';
    console.warn(`[Jarvis LLM] Request failed (${isTimeout ? 'timeout' : error?.message})`);

    return {
      intent: 'UNKNOWN',
      slots: { raw: transcript, error: isTimeout ? 'timeout' : 'network_error' },
      confidence: 0,
      spokenReply: isTimeout
        ? 'The server took too long to respond.'
        : "I can't think without internet right now, but I can still control your music.",
      source: 'llm',
      latencyMs: Date.now() - startTime,
    };
  }
}
