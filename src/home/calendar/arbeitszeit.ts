/**
 * Erfasste Arbeitszeit (Zeiterfassung → Arbeitszeit, Figma 21495:97817): per day one or more time blocks with an
 * optional comment. Saved days replace the demo bars of that day in the calendar (the green strokes).
 */
import { parseIso } from "./calendarData";

export type ArbeitszeitBlock = { start: number; end: number; kommentar?: string };
export type Arbeitszeiten = Record<string, ArbeitszeitBlock[]>;

// v2: starts empty (clean Kalender); Arbeitszeit erfasst before is not read.
const KEY = "wino.kalender.arbeitszeit.v2";
const EVENT = "wino:arbeitszeit";

export function loadArbeitszeiten(): Arbeitszeiten {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveArbeitszeiten(value: Arbeitszeiten) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Not saved: holds until reload.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export function onArbeitszeitenChange(callback: (value: Arbeitszeiten) => void) {
  const handler = (event: Event) => callback((event as CustomEvent<Arbeitszeiten>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Figma default for a day without entries: 08:00–12:30 and 13:00–17:00, Friday only the morning. */
export function defaultBlocks(day: string): ArbeitszeitBlock[] {
  return parseIso(day).getDay() === 5
    ? [{ start: 480, end: 750 }]
    : [
        { start: 480, end: 750 },
        { start: 780, end: 1020 },
      ];
}
