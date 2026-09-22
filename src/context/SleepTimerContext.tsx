import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { usePlayer } from './PlayerContext';

interface SleepTimerContextValue {
  /** Whether a timer is currently active */
  isActive: boolean;
  /** Remaining milliseconds until pause */
  remainingMs: number;
  /** Label describing the active timer (e.g. "30 min", "End of Track") */
  timerLabel: string | null;
  /** Start a timer for a given number of minutes. Use 0 for "end of track". */
  startTimer: (minutes: number) => void;
  /** Cancel any active timer */
  cancelTimer: () => void;
}

const SleepTimerContext = createContext<SleepTimerContextValue | undefined>(undefined);

export function SleepTimerProvider({ children }: { children: React.ReactNode }) {
  const { pause, durationMs, positionMs } = usePlayer();

  const [isActive, setIsActive] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [timerLabel, setTimerLabel] = useState<string | null>(null);
  const [endOfTrack, setEndOfTrack] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    setRemainingMs(0);
    setTimerLabel(null);
    setEndOfTrack(false);
    targetTimeRef.current = 0;
  }, []);

  const startTimer = useCallback((minutes: number) => {
    // Clear any existing timer first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (minutes === 0) {
      // "End of Track" mode
      setEndOfTrack(true);
      setIsActive(true);
      setTimerLabel('End of Track');
      const trackRemaining = Math.max(0, durationMs - positionMs);
      setRemainingMs(trackRemaining);
      return;
    }

    const durationMsTimer = minutes * 60 * 1000;
    const target = Date.now() + durationMsTimer;
    targetTimeRef.current = target;

    setEndOfTrack(false);
    setIsActive(true);
    setRemainingMs(durationMsTimer);
    setTimerLabel(`${minutes} min`);

    intervalRef.current = setInterval(() => {
      const left = Math.max(0, targetTimeRef.current - Date.now());
      setRemainingMs(left);

      if (left <= 0) {
        // Timer expired — pause playback
        pause();
        cleanup();
      }
    }, 1000);
  }, [durationMs, positionMs, pause, cleanup]);

  const cancelTimer = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Handle "End of Track" mode — watch the playback position
  useEffect(() => {
    if (!endOfTrack || !isActive) return;

    const trackRemaining = Math.max(0, durationMs - positionMs);
    setRemainingMs(trackRemaining);

    if (durationMs > 0 && positionMs > 0 && (durationMs - positionMs) < 500) {
      // Track is about to end
      pause();
      cleanup();
    }
  }, [endOfTrack, isActive, durationMs, positionMs, pause, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <SleepTimerContext.Provider
      value={{
        isActive,
        remainingMs,
        timerLabel,
        startTimer,
        cancelTimer,
      }}
    >
      {children}
    </SleepTimerContext.Provider>
  );
}

export function useSleepTimer(): SleepTimerContextValue {
  const ctx = useContext(SleepTimerContext);
  if (!ctx) throw new Error('useSleepTimer must be used within a SleepTimerProvider');
  return ctx;
}
