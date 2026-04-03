import { useEffect, useState } from 'react';

/**
 * useState that automatically persists to localStorage.
 * Values are JSON-serialized, so strings, booleans, arrays, and objects all work.
 */
export function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore write errors (e.g. private browsing quota)
    }
  }, [key, state]);

  return [state, setState];
}
