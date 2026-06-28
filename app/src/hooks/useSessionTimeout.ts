import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

const TIMEOUT_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

export function useSessionTimeout(onLogout: () => void) {
  const navigate = useNavigate();

  const resetTimer = useCallback(() => {
    localStorage.setItem("apollo_last_activity", Date.now().toString());
  }, []);

  useEffect(() => {
    // Check on initial load if session has timed out while browser was closed
    const lastActivityStr = localStorage.getItem("apollo_last_activity");
    if (lastActivityStr) {
      const lastActivityTime = parseInt(lastActivityStr);
      if (!isNaN(lastActivityTime)) {
        const elapsed = Date.now() - lastActivityTime;
        if (elapsed >= TIMEOUT_MS) {
          localStorage.removeItem("apollo_last_activity");
          onLogout();
          navigate(LOGIN_PATH);
          return;
        }
      }
    }

    // Set initial activity
    localStorage.setItem("apollo_last_activity", Date.now().toString());

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    for (const event of events) {
      window.addEventListener(event, resetTimer);
    }

    const interval = setInterval(() => {
      const lastActivityStr = localStorage.getItem("apollo_last_activity");
      if (lastActivityStr) {
        const lastActivityTime = parseInt(lastActivityStr);
        if (!isNaN(lastActivityTime)) {
          const elapsed = Date.now() - lastActivityTime;
          if (elapsed >= TIMEOUT_MS) {
            localStorage.removeItem("apollo_last_activity");
            onLogout();
            navigate(LOGIN_PATH);
          }
        }
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
