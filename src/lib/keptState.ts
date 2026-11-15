import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * useState that survives leaving the tab: pages like Admin unmount when another file tab is shown, and should come
 * back where you left them (sub-tab, selected folder, filters). Kept for the browser session, like a real app tab.
 * Only for JSON values.
 */
const memory = new Map<string, unknown>();
const PREFIX = "wino.kept.";

function read<T>(key: string, initial: T): T {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    // Blocked or broken storage: start fresh.
  }
  return initial;
}

export function useKeptState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, initial));
  useEffect(() => {
    memory.set(key, value);
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Keeps it in memory only.
    }
  }, [key, value]);
  return [value, setValue];
}
