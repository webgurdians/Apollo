import { useEffect, useRef, useCallback, useState } from "react";

interface DraftData {
  key: string;
  data: unknown;
  savedAt: number;
}

const SAVE_INTERVAL_MS = 15 * 1000;
const STORAGE_PREFIX = "draft_";

export function useOfflineSave<T>(formKey: string, formData: T) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const prevData = useRef(formData);

  const saveDraft = useCallback(() => {
    try {
      const entry: DraftData = {
        key: formKey,
        data: formData,
        savedAt: Date.now(),
      };
      localStorage.setItem(`${STORAGE_PREFIX}${formKey}`, JSON.stringify(entry));
    } catch {
      // Storage full or unavailable
    }
  }, [formKey, formData]);

  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${formKey}`);
      if (!raw) return null;
      const entry: DraftData = JSON.parse(raw);
      return entry.data as T;
    } catch {
      return null;
    }
  }, [formKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(`${STORAGE_PREFIX}${formKey}`);
  }, [formKey]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    if (JSON.stringify(prevData.current) === JSON.stringify(formData)) return;
    prevData.current = formData;

    const timer = setInterval(saveDraft, SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isOnline, formData, saveDraft]);

  return {
    isOnline,
    saveDraft,
    loadDraft,
    clearDraft,
  };
}
