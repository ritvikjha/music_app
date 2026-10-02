/**
 * src/jarvis/brain/visionClient.ts
 *
 * Client for Screen Understanding & Multimodal Camera Vision (Phase 2).
 *
 * Interfaces with the backend proxy:
 *   - POST /jarvis/vision: sends camera snapshot + user question to Gemini 2.0 Flash
 *   - POST /jarvis/screen-qa: sends accessibility node texts + foreground app + question
 */

declare const process: any;
declare const require: any;

const CLIENT_TIMEOUT_MS = 8500;
const JARVIS_TOKEN = process.env.EXPO_PUBLIC_JARVIS_TOKEN || 'jarvis-jam-secret-2026';
const DEFAULT_SERVER_URL = 'https://music-app-onx9.onrender.com';

function getServerUrl(): string {
  try {
    const { CONFIG } = require('../../config');
    return CONFIG?.SYNC_SERVER_URL || DEFAULT_SERVER_URL;
  } catch {
    return process.env.EXPO_PUBLIC_SYNC_SERVER_URL || DEFAULT_SERVER_URL;
  }
}

export interface ScreenQaResult {
  spokenReply: string;
  latencyMs?: number;
}

export interface CameraVisionResult {
  spokenReply: string;
  description: string;
  latencyMs?: number;
}

/**
 * Ask Jarvis a question about what is currently displayed on screen.
 */
export async function queryScreenQa(
  screenContent: Array<{ text: string; desc?: string }>,
  appName: string,
  query?: string
): Promise<ScreenQaResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const baseUrl = getServerUrl().replace(/\/$/, '');
    const url = `${baseUrl}/jarvis/screen-qa`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jarvis-token': JARVIS_TOKEN,
      },
      body: JSON.stringify({
        screenContent,
        appName,
        query: query || "What's on my screen?",
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Screen QA server returned ${response.status}`);
    }

    const data = await response.json();
    return {
      spokenReply: data.spokenReply || `You are currently viewing ${appName || 'your screen'}, sir.`,
      latencyMs: Date.now() - startTime,
    };
  } catch (err: any) {
    clearTimeout(timer);
    console.warn('[Jarvis ScreenQA] Failed:', err?.message);
    const topText = screenContent
      .map((e) => (e.text || e.desc || '').trim())
      .filter((t) => t.length > 0)
      .slice(0, 3)
      .join(', ');

    return {
      spokenReply: topText
        ? `You are in ${appName || 'an app'}, viewing ${topText}, sir.`
        : `You are currently on ${appName || 'the screen'}, sir.`,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Send a camera snapshot to Gemini 2.0 Flash multimodal vision.
 */
export async function queryCameraVision(
  imageBase64: string,
  prompt?: string
): Promise<CameraVisionResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const baseUrl = getServerUrl().replace(/\/$/, '');
    const url = `${baseUrl}/jarvis/vision`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jarvis-token': JARVIS_TOKEN,
      },
      body: JSON.stringify({
        imageBase64,
        prompt: prompt || 'Describe what you see in front of the camera.',
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Camera vision server returned ${response.status}`);
    }

    const data = await response.json();
    return {
      spokenReply: data.spokenReply || 'I see what is in front of you, sir.',
      description: data.description || data.spokenReply || '',
      latencyMs: Date.now() - startTime,
    };
  } catch (err: any) {
    clearTimeout(timer);
    console.warn('[Jarvis Vision] Failed:', err?.message);
    return {
      spokenReply: "I was unable to analyze that visual input, sir.",
      description: err?.message || 'Vision analysis failed',
      latencyMs: Date.now() - startTime,
    };
  }
}
