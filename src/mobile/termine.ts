/**
 * Termine erfasst in the mobile Kalender (Figma 19074:464695). Kept per browser; the desktop week view does not
 * read them yet.
 */
export type MobileTermin = {
  id: string;
  day: string;
  start: number;
  end: number;
  /** Terminart, e.g. "Termin - mit Beratung (Wino Partner)". */
  art: string;
  /** Who it is with (the partner), shown bold on the card. */
  title: string;
  ort: string;
  /** Fahrzeug & Reise: Abfahrt and Ankunft in minutes, when a trip is part of it. */
  abfahrt?: number;
  ankunft?: number;
  abfahrtOrt?: string;
  ankunftOrt?: string;
};

const KEY = "wino.mobile.termine.v1";
const EVENT = "wino:mobile-termine";

export function loadTermine(): MobileTermin[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTermine(list: MobileTermin[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Not saved: holds until reload.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: list }));
}

export function onTermineChange(callback: (list: MobileTermin[]) => void) {
  const handler = (event: Event) => callback((event as CustomEvent<MobileTermin[]>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Terminarten of "Termin erfassen" (Figma 22757:333933) with their dot colour. */
export const TERMINARTEN: { label: string; tone: "termin" | "reise" | "privat" | "ereignis" }[] = [
  { label: "Termin - mit Beratung (Wino Partner)", tone: "termin" },
  { label: "Termin - ohne Beratung", tone: "termin" },
  { label: "Weiterbildung", tone: "termin" },
  { label: "Interne Besprechung", tone: "termin" },
  { label: "Projekt", tone: "termin" },
  { label: "Mitarbeitergespräch", tone: "termin" },
  { label: "Reisezeit", tone: "reise" },
  { label: "Privater Termin", tone: "privat" },
  { label: "Ereignis", tone: "ereignis" },
];

/** Zeiterfassung menu (Figma 22757:333933). Only Arbeitszeit has a mobile form so far. */
export const ZEITARTEN: { label: string; tone: "arbeit" | "urlaub" | "zeitausgleich" | "krank" }[] = [
  { label: "Arbeitszeit", tone: "arbeit" },
  { label: "Urlaub", tone: "urlaub" },
  { label: "Zeitausgleich", tone: "zeitausgleich" },
  { label: "Krank", tone: "krank" },
  { label: "DV Arzt", tone: "krank" },
  { label: "DV Sonstiges", tone: "krank" },
  { label: "Pflegeurlaub", tone: "krank" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** "Mittwoch, 07. September" */
export function longDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return { weekday: WEEKDAYS[date.getDay()], date: `${pad(d)}. ${MONTHS[m - 1]}` };
}

/** Quarter-hour steps for the Uhrzeit selects. */
export const QUARTERS = Array.from({ length: 24 * 4 }, (_, i) => i * 15);
