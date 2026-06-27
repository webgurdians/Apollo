import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

const TIMEOUT_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

export function useSessionTimeout(onLogout: () => void) {
  const lastActivity = useRef<number>(0);
  const navigate = useNavigate();

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  useEffect(() => {
    lastActivity.current = Date.now();

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    for (const event of events) {
      window.addEventListener(event, resetTimer);
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= TIMEOUT_MS) {
        onLogout();
        navigate(LOGIN_PATH);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of events) {
        window.removeEventListener(event, resetTimer);
      }
      clearInterval(interval);
    };
  }, [onLogout, resetTimer, navigate]);
}
