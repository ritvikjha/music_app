/**
 * src/jarvis/brain/streamingBrain.ts
 *
 * Real-Time Zero-Latency Streaming Intelligence for Jarvis (Phase 1).
 *
 * Connects to the backend streaming SSE proxy (/jarvis/brain/stream).
 * Buffers incoming tokens and splits on sentence boundaries (. ! ? \n)
 * to dispatch the first spoken sentence chunk to native Android TTS in < 350ms,
 * while subsequent sentences are queued seamlessly with QUEUE_ADD.
 */

import { speakChunk } from '../../../modules/jarvis-wake-word';
import type { BrainContext } from './types';

declare const process: any;
declare const require: any;

const STREAM_TIMEOUT_MS = 8000;
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

export interface StreamingBrainOptions {
  onToken?: (token: string, fullText: string) => void;
  onSentence?: (sentence: string, isFirst: boolean) => void;
  autoSpeak?: boolean;
}

/**
 * Stream an open-ended question, conversation, or screen/vision query
 * directly to native TTS sentence-by-sentence.
 */
export async function streamLlmReply(
  prompt: string,
  options?: StreamingBrainOptions
): Promise<string> {
  const startTime = Date.now();
  const autoSpeak = options?.autoSpeak !== false;
  const baseUrl = getServerUrl().replace(/\/$/, '');
  const url = `${baseUrl}/jarvis/brain/stream`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  let fullText = '';
  let sentenceBuffer = '';
  let isFirstSentence = true;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jarvis-token': JARVIS_TOKEN,
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Streaming server returned ${response.status}`);
    }

    // Process SSE stream
    const reader = (response as any).body?.getReader?.();
    if (reader) {
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.type === 'token' && typeof data.token === 'string') {
                const token = data.token;
                fullText += token;
                sentenceBuffer += token;
                options?.onToken?.(token, fullText);

                // Check for sentence boundary: (. ! ? or \n) followed by space or end of clause
                const sentenceEndRegex = /([.!?\n])(?:\s+|$)/;
                const match = sentenceBuffer.match(sentenceEndRegex);

                if (match && match.index !== undefined) {
                  const cutIdx = match.index + match[0].length;
                  const sentence = sentenceBuffer.slice(0, cutIdx).trim();
                  sentenceBuffer = sentenceBuffer.slice(cutIdx);

                  if (sentence.length > 0) {
                    const elapsedMs = Date.now() - startTime;
                    if (isFirstSentence) {
                      console.log(`[Jarvis Stream] ⚡ First spoken sentence ready in ${elapsedMs}ms: "${sentence}"`);
                    }

                    options?.onSentence?.(sentence, isFirstSentence);
                    if (autoSpeak) {
                      speakChunk(sentence, !isFirstSentence).catch((e) =>
                        console.warn('[Jarvis Stream] speakChunk error:', e)
                      );
                    }
                    isFirstSentence = false;
                  }
                }
              } else if (data.type === 'done') {
                if (data.fullText && !fullText) {
                  fullText = data.fullText;
                }
              }
            } catch (err) {
              // Ignore line parse issues
            }
          }
        }
      }
    } else {
      // Fallback if reader not supported in some runtimes: read as text
      const rawText = await response.text();
      const lines = rawText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6).trim());
            if (data.type === 'token') fullText += data.token;
            if (data.type === 'done' && data.fullText) fullText = data.fullText;
          } catch {}
        }
      }
      if (autoSpeak && fullText.trim()) {
        speakChunk(fullText.trim(), false).catch(() => {});
      }
    }

    // Flush any leftover text in the sentence buffer
    const remaining = sentenceBuffer.trim();
    if (remaining.length > 0) {
      options?.onSentence?.(remaining, isFirstSentence);
      if (autoSpeak) {
        speakChunk(remaining, !isFirstSentence).catch(() => {});
      }
    }

    return fullText.trim() || 'Done, sir.';
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.warn('[Jarvis Stream] Stream failed or timed out:', error?.message);
    const fallback = "I'm having difficulty connecting right now, sir.";
    if (autoSpeak) {
      speakChunk(fallback, false).catch(() => {});
    }
    return fallback;
  }
}
