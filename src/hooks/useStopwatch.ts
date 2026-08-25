import { useState, useEffect, useRef, useCallback } from "react";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function useStopwatch(isGameStarted: boolean) {
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!isGameStarted) {
      clearTimer();
      setSeconds(0);
      setIsPaused(false);
      return;
    }

    if (isPaused) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return clearTimer;
  }, [isGameStarted, isPaused]);

  const wasRunningBeforeHiddenRef = useRef(false);

  useEffect(() => {
    if (!isGameStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!isPaused) {
          wasRunningBeforeHiddenRef.current = true;
          setIsPaused(true);
        } else {
          wasRunningBeforeHiddenRef.current = false;
        }
      } else {
        if (wasRunningBeforeHiddenRef.current) {
          wasRunningBeforeHiddenRef.current = false;
          setIsPaused(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isGameStarted, isPaused]);

  const togglePause = useCallback(() => {
    if (isGameStarted) {
      setIsPaused((prev) => !prev);
    }
  }, [isGameStarted]);

  return {
    elapsedTime: formatTime(seconds),
    isPaused,
    togglePause,
  };
}
