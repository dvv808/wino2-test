import { readDayParam } from "./dayParam";
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
  /** Overlay details (Figma 22761:367180). */
  beschreibung?: string;
  teams?: boolean;
  winter?: Teilnehmer[];
  extern?: Teilnehmer[];
  /** Termin mit Beratung: the documentation is not finished yet. */
  dokuOffen?: boolean;
};

export type Teilnehmer = { name: string; status: "ja" | "offen" | "nein"; host?: boolean };

const KEY = "wino.mobile.termine.v3";
const EVENT = "wino:mobile-termine";

const h = (hours: number, minutes = 0) => hours * 60 + minutes;
const pad2 = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Demo Termine for the week after today (Mo–Fr), so the mobile day view is not empty. */
export function seedTermine(today: string): MobileTermin[] {
  const linked = readDayParam();
  const [y, m, d] = (linked ?? today).split("-").map(Number);
  const base = new Date(y, m - 1, d);
  // The Monday of the linked day's week; without a link, next Monday.
  if (linked) base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  else base.setDate(base.getDate() + ((8 - base.getDay()) % 7 || 7));
  const day = (offset: number) => {
    const x = new Date(base);
    x.setDate(base.getDate() + offset);
    return isoDay(x);
  };
  const art = TERMINARTEN.map((t) => t.label);
  const lucy: Teilnehmer = { name: "Lucy Dallon", status: "ja", host: true };
  return [
    {
      id: "s1", day: day(0), start: h(9), end: h(10), art: art[3], title: "Wochenstart Team Beratung", ort: "Büro Schladming, Salzburgerstraße 304",
      beschreibung: "Wochenplanung, offene Anträge und die Termine der Woche durchgehen.", teams: true,
      winter: [lucy, { name: "Gertrud Badura", status: "ja" }, { name: "Michael Pitzer", status: "offen" }],
    },
    {
      id: "s2", day: day(0), start: h(13, 30), end: h(15), art: art[0], title: "Julia Atkinson", ort: "Mondseestrasse 32, A-5310 Mondsee",
      abfahrt: h(12, 30), ankunft: h(16), abfahrtOrt: "Büro", ankunftOrt: "Büro", dokuOffen: true,
      winter: [lucy], extern: [{ name: "Julia Atkinson", status: "ja" }],
    },
    {
      id: "s3", day: day(1), start: h(9), end: h(11), art: art[0], title: "Lunixo AG", ort: "Getreidegasse 12, A-5020 Salzburg",
      abfahrt: h(7), ankunft: h(14, 30), abfahrtOrt: "zu Hause", ankunftOrt: "Büro", teams: true,
      winter: [lucy, { name: "Silvia Fischbacher", status: "offen" }], extern: [{ name: "Lunixo AG", status: "nein" }, { name: "Julia Atkinson", status: "ja" }],
    },
    {
      id: "s4", day: day(1), start: h(15), end: h(16), art: art[5], title: "Gertrud Badura", ort: "Büro Schladming, Besprechungszimmer 01",
      beschreibung: "Jahresgespräch: Ziele 2027 und Weiterbildungswünsche.", winter: [lucy, { name: "Gertrud Badura", status: "ja" }],
    },
    {
      id: "s5", day: day(2), start: h(8, 30), end: h(12, 30), art: art[2], title: "Schulung Versicherungsrecht", ort: "WIFI Salzburg, Julius-Raab-Platz 2",
      beschreibung: "IDD-Weiterbildung: Neuerungen im Versicherungsvertragsrecht.",
    },
    {
      id: "s6", day: day(2), start: h(14), end: h(15), art: art[1], title: "Ashley Johnson", ort: "Telefontermin",
      beschreibung: "Rückruf wegen KFZ-Kennzeichen.", winter: [lucy], extern: [{ name: "Ashley Johnson", status: "offen" }],
    },
    {
      id: "s7", day: day(3), start: h(10), end: h(11, 30), art: art[0], title: "Lunixo Holding", ort: "Mirabellplatz 4, A-5020 Salzburg",
      abfahrt: h(9), ankunft: h(12, 30), abfahrtOrt: "Büro", ankunftOrt: "Büro",
      winter: [lucy, { name: "Philip Winter", status: "ja" }], extern: [{ name: "Lunixo Holding", status: "ja" }],
    },
    {
      id: "s8", day: day(3), start: h(16), end: h(17), art: art[4], title: "Projekt Wino 2", ort: "Büro Schladming", teams: true,
      beschreibung: "Abstimmung zum neuen Kalender und zur mobilen Version.", winter: [lucy, { name: "Janine Gungl", status: "offen" }],
    },
    {
      id: "s9", day: day(4), start: h(8), end: h(9), art: art[3], title: "Jour fixe Unternehmensleitung", ort: "Büro Schladming", teams: true,
      winter: [{ name: "Philip Winter", status: "ja", host: true }, { name: "Lucy Dallon", status: "ja" }, { name: "Julia Heigl", status: "nein" }],
    },
    { id: "s10", day: day(4), start: h(11), end: h(12), art: art[7], title: "Zahnarzt", ort: "Dr. Huber, Hauptplatz 5, Schladming" },
    {
      id: "s11", day: day(4), start: h(17), end: h(21), art: art[8], title: "Firmenfeier Makler Winter", ort: "Hotel Post, Schladming",
      beschreibung: "Jahresabschlussfeier mit dem ganzen Team.", winter: [{ name: "Philip Winter", status: "ja", host: true }, lucy, { name: "Gertrud Badura", status: "offen" }],
    },
  ];
}

export function loadTermine(): MobileTermin[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      const seeded = seedTermine(isoDay(new Date()));
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return seedTermine(isoDay(new Date()));
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
export const ZEITARTEN: { label: string; tone: "arbeit" | "homeoffice" | "urlaub" | "zeitausgleich" | "krank" }[] = [
  { label: "Arbeitszeit", tone: "arbeit" },
  { label: "Homeoffice", tone: "homeoffice" },
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
