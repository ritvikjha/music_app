/**
 * src/jarvis/eventLogger.ts
 *
 * Local ring buffer keeping the last 100 Jarvis events:
 * - State machine transitions
 * - Wake word hits with confidence scores
 * - Speech-to-text transcripts
 * - Native & JS action execution
 * - System errors & timeouts
 * - End-to-end pipeline latencies
 *
 * Provides clipboard export and tracks daily wake count & last heard time.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

export type JarvisEventType =
  | 'STATE_CHANGE'
  | 'WAKE_HIT'
  | 'TRANSCRIPT'
  | 'ACTION'
  | 'ERROR'
  | 'LATENCY'
  | 'SERVICE'
  | 'PHONE_CALL'
  | 'POWER'
  | 'TIMELINE';

export interface JarvisLogEvent {
  id: string;
  timestamp: number;
  type: JarvisEventType;
  message: string;
  details?: Record<string, any>;
}

const MAX_LOGS = 100;
const ringBuffer: JarvisLogEvent[] = [];

const LAST_HEARD_KEY = '@jam_jarvis_last_heard_ts';
const WAKE_COUNT_KEY = '@jam_jarvis_wake_count_today';
const WAKE_DATE_KEY = '@jam_jarvis_wake_count_date';

let cachedLastHeard: number | null = null;
let cachedWakeCount: number = 0;

/**
 * Log a structured Jarvis event into the ring buffer.
 */
export function logJarvisEvent(
  type: JarvisEventType,
  message: string,
  details?: Record<string, any>
): JarvisLogEvent {
  const event: JarvisLogEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: Date.now(),
    type,
    message,
    details,
  };

  ringBuffer.unshift(event);
  if (ringBuffer.length > MAX_LOGS) {
    ringBuffer.pop();
  }

  // Console output for development
  console.log(`[Jarvis Log][${type}] ${message}`, details ? JSON.stringify(details) : '');

  return event;
}

/**
 * Record a wake word detection: updates last-heard timestamp and increments daily wake counter.
 */
export async function recordWakeHit(score: number): Promise<void> {
  const now = Date.now();
  cachedLastHeard = now;

  logJarvisEvent('WAKE_HIT', `Wake word detected (score: ${score.toFixed(2)})`, { score });

  try {
    await AsyncStorage.setItem(LAST_HEARD_KEY, now.toString());

    const todayStr = new Date().toISOString().slice(0, 10);
    const savedDate = await AsyncStorage.getItem(WAKE_DATE_KEY);

    if (savedDate !== todayStr) {
      cachedWakeCount = 1;
      await AsyncStorage.setItem(WAKE_DATE_KEY, todayStr);
      await AsyncStorage.setItem(WAKE_COUNT_KEY, '1');
    } else {
      cachedWakeCount++;
      await AsyncStorage.setItem(WAKE_COUNT_KEY, cachedWakeCount.toString());
    }
  } catch (err) {
    console.warn('[Jarvis Logger] Failed to persist wake statistics:', err);
  }
}

/**
 * Get the current ring buffer of events.
 */
export function getJarvisLogs(): JarvisLogEvent[] {
  return [...ringBuffer];
}

/**
 * Clear the in-memory ring buffer.
 */
export function clearJarvisLogs(): void {
  ringBuffer.length = 0;
}

/**
 * Format logs into formatted plaintext for export or clipboard copy.
 */
export function formatLogsForExport(): string {
  if (ringBuffer.length === 0) {
    return 'No Jarvis events recorded yet.';
  }

  const lines = ringBuffer.map((e) => {
    const time = new Date(e.timestamp).toLocaleTimeString();
    const details = e.details ? ` | ${JSON.stringify(e.details)}` : '';
    return `[${time}] [${e.type}] ${e.message}${details}`;
  });

  return [
    `=== JARVIS SYSTEM LOGS (${ringBuffer.length} events) ===`,
    `Generated: ${new Date().toISOString()}`,
    `Device OS: Android`,
    '-------------------------------------------------------',
    ...lines,
    '=======================================================',
  ].join('\n');
}

/**
 * Copy all logs to device clipboard.
 */
export async function copyJarvisLogsToClipboard(): Promise<boolean> {
  try {
    const text = formatLogsForExport();
    await Clipboard.setStringAsync(text);
    return true;
  } catch (e) {
    console.warn('[Jarvis Logger] Failed to copy logs to clipboard:', e);
    return false;
  }
}

/**
 * Retrieve human-readable "last heard" string (e.g., "Just now", "3 min ago", "2 hours ago").
 */
export async function getLastHeardFormatted(): Promise<string> {
  try {
    if (cachedLastHeard === null) {
      const stored = await AsyncStorage.getItem(LAST_HEARD_KEY);
      if (stored) {
        cachedLastHeard = parseInt(stored, 10);
      }
    }

    if (!cachedLastHeard) {
      return 'Not yet today';
    }

    const diffMs = Date.now() - cachedLastHeard;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return 'Over a day ago';
  } catch {
    return 'Unknown';
  }
}

/**
 * Retrieve total wake detections recorded today.
 */
export async function getTodayWakeCount(): Promise<number> {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const savedDate = await AsyncStorage.getItem(WAKE_DATE_KEY);

    if (savedDate !== todayStr) {
      cachedWakeCount = 0;
      return 0;
    }

    if (cachedWakeCount === 0) {
      const stored = await AsyncStorage.getItem(WAKE_COUNT_KEY);
      if (stored) {
        cachedWakeCount = parseInt(stored, 10) || 0;
      }
    }

    return cachedWakeCount;
  } catch {
    return 0;
  }
}
