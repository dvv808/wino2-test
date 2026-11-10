/**
 * Mein Kalender (Figma 16702:185207): mock data and the pure layout logic of the week view.
 * Times are minutes since midnight; days are ISO dates "YYYY-MM-DD".
 */

/** Kalender-Art: decides the colour of the Arbeitszeit bar and the card (Figma "Aufbau Kalendereinträge"). */
export type EntryKind = "termin" | "urlaub" | "reise" | "privat";

/** Status icon on a card: a request (Antrag) that is open, approved or rejected. */
export type EntryStatus = "offen" | "genehmigt" | "abgelehnt";

export type CalendarId = string;

export type CalendarEntry = {
  id: string;
  calendar: CalendarId;
  day: string;
  start: number;
  end: number;
  kind: EntryKind;
  title: string;
  teams?: boolean;
  ort?: string;
  status?: EntryStatus;
  /** Reise: Abfahrt (start) and Ankunft (end) are shown as small chips, the trip as a dashed bar between them. */
  abfahrt?: string;
  ankunft?: string;
};

/** Whole-day items above the grid. Green = working at another office (e.g. Kapfenberg), otherwise grey-blue. */
export type AllDayItem = { id: string; calendar: CalendarId; day: string; title: string; office?: boolean };

/** Time actually worked (Zeiterfassung): the green bar on the left of a day. */
export type WorkedBlock = { calendar: CalendarId; day: string; start: number; end: number };

export type DayTimes = { soll: number; ist: number; from: number; to: number };

export type KalenderDef = { id: CalendarId; name: string; owner: "ich" | "geteilt"; parent?: CalendarId; photo?: string };

export const HOUR_PX = 46;
export const DEFAULT_RANGE = { from: 6 * 60, to: 22 * 60 };
export const FULL_RANGE = { from: 0, to: 24 * 60 };

// ---------------------------------------------------------------- dates

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** Monday of the week a day lies in. */
export function weekStart(day: string) {
  const d = parseIso(day);
  const offset = (d.getDay() + 6) % 7;
  return addDays(day, -offset);
}

export const weekDays = (day: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(day), i));

/** ISO 8601 calendar week (KW). */
export function isoWeek(day: string) {
  const d = parseIso(day);
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

const MONTHS_SHORT = ["Jän.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
export const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** "09. Nov. 2026" */
export function headerDate(day: string) {
  const d = parseIso(day);
  return `${pad(d.getDate())}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Rows of the mini month: each row is [KW, 7 days]; days outside the month are marked. */
export function monthGrid(year: number, month: number) {
  const first = iso(new Date(year, month, 1));
  let cursor = weekStart(first);
  const rows: { kw: number; days: { day: string; inMonth: boolean }[] }[] = [];
  for (let r = 0; r < 6; r += 1) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(cursor, i);
      return { day, inMonth: parseIso(day).getMonth() === month };
    });
    rows.push({ kw: isoWeek(days[0].day), days });
    cursor = addDays(cursor, 7);
  }
  return rows;
}

export const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
/** Sollzeit / Istzeit "8:30" */
export const duration = (min: number) => `${Math.floor(min / 60)}:${pad(min % 60)}`;

// ---------------------------------------------------------------- layout

export type Placed<T> = T & { lane: number; lanes: number };

/**
 * Overlapping entries of one day sit side by side (as "Vorbereiten Präsentation" and "Innendienst Weekly
 * Meeting" on Mi in Figma). Each cluster of overlapping entries shares its number of lanes.
 */
export function placeInLanes<T extends { start: number; end: number }>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Placed<T>[] = [];
  let cluster: Placed<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const close = () => {
    cluster.forEach((item) => (item.lanes = laneEnds.length));
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const item of sorted) {
    if (item.start >= clusterEnd && cluster.length) close();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else laneEnds[lane] = item.end;
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length) close();
  return out;
}

/** Pixels from the top of the visible range. */
export const topOf = (min: number, from: number) => ((min - from) / 60) * HOUR_PX;

// ---------------------------------------------------------------- seed

/** Calendars in the side nav: "Mein Kalender" (with iCloud below) and the ones shared with me. */
export const KALENDER: KalenderDef[] = [
  { id: "lucy", name: "Lucy Dallon (Ich)", owner: "ich" },
  { id: "icloud", name: "iCloud Cal Lucy", owner: "ich", parent: "lucy" },
  { id: "caleb", name: "Caleb Alexander Smith", owner: "geteilt" },
  { id: "lucymaria", name: "Lucy Maria", owner: "geteilt" },
  { id: "andrea", name: "Andrea Sullivan", owner: "geteilt" },
];

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

/**
 * One demo week around `today`, laid out like the Figma frame: Mo office day + meetings, Di holiday,
 * Mi (today in Figma) two overlapping meetings, Do Urlaub (open / rejected), Fr trip with Abfahrt/Ankunft.
 */
export function seedWeek(today: string) {
  const [mo, di, mi, doo, fr] = weekDays(today);
  const entries: CalendarEntry[] = [
    { id: "e1", calendar: "lucy", day: mo, start: h(7), end: h(7, 45), kind: "privat", title: "Meeting Zahnarzt" },
    { id: "e2", calendar: "lucy", day: mo, start: h(8), end: h(10, 30), kind: "termin", title: "Meeting Innendienst", teams: true, ort: "Besprechungsraum 2" },
    { id: "e3", calendar: "lucy", day: mo, start: h(11), end: h(13), kind: "termin", title: "Mittagessen mit Susanne Innendienst" },
    { id: "e4", calendar: "lucy", day: mo, start: h(15), end: h(17), kind: "termin", title: "Meeting Kunde M Stoviak", ort: "Schladming" },
    { id: "e5", calendar: "lucy", day: mi, start: h(7), end: h(11), kind: "termin", title: "Vorbereiten Präsentation" },
    { id: "e6", calendar: "lucy", day: mi, start: h(9), end: h(12), kind: "termin", title: "Innendienst Weekly Meeting", teams: true },
    { id: "e7", calendar: "lucy", day: mi, start: h(17), end: h(17, 45), kind: "termin", title: "Meeting Team" },
    { id: "e8", calendar: "lucy", day: doo, start: h(7), end: h(11), kind: "urlaub", title: "Urlaub", status: "offen" },
    { id: "e9", calendar: "lucy", day: doo, start: h(13), end: h(17, 30), kind: "urlaub", title: "Urlaub", status: "abgelehnt" },
    { id: "e10", calendar: "lucy", day: fr, start: h(8), end: h(9), kind: "termin", title: "Donau Hr. Mattstedt", status: "abgelehnt" },
    { id: "e11", calendar: "lucy", day: fr, start: h(10), end: h(12, 45), kind: "reise", title: "Reise Linz", abfahrt: "Abfahrt (2)", ankunft: "Ankunft" },
    { id: "e12", calendar: "lucy", day: fr, start: h(11), end: h(12), kind: "termin", title: "Allianz Fr. Donnel", status: "genehmigt" },
    { id: "e13", calendar: "icloud", day: di, start: h(18), end: h(19, 30), kind: "privat", title: "Tennis" },
    { id: "s1", calendar: "caleb", day: mo, start: h(9), end: h(10), kind: "termin", title: "Caleb: Kundentermin Graz", ort: "Graz" },
    { id: "s2", calendar: "caleb", day: doo, start: h(14), end: h(15, 30), kind: "termin", title: "Caleb: Schulung", teams: true },
    { id: "s3", calendar: "lucymaria", day: mi, start: h(13), end: h(14), kind: "termin", title: "Lucy Maria: Abstimmung" },
    { id: "s4", calendar: "andrea", day: fr, start: h(13), end: h(15), kind: "termin", title: "Andrea: Partnertermin Wien", ort: "Wien" },
  ];
  const allDay: AllDayItem[] = [
    { id: "a1", calendar: "lucy", day: mo, title: "Büro Kapfenberg", office: true },
    { id: "a2", calendar: "lucy", day: mo, title: "Bauarbeiten Parkplatz" },
    { id: "a3", calendar: "lucy", day: mo, title: "Geburtstag Mike" },
    { id: "a4", calendar: "lucy", day: di, title: "Nationalfeiertag" },
  ];
  const worked: WorkedBlock[] = [
    { calendar: "lucy", day: mo, start: h(10, 30), end: h(11) },
    { calendar: "lucy", day: mo, start: h(13), end: h(15) },
    { calendar: "lucy", day: mi, start: h(13), end: h(17, 30) },
    { calendar: "lucy", day: fr, start: h(9), end: h(10) },
  ];
  const times: Record<string, DayTimes> = {
    [mo]: { soll: h(8, 30), ist: h(8, 30), from: h(7), to: h(17) },
    [di]: { soll: 0, ist: 0, from: 0, to: 0 },
    [mi]: { soll: h(8, 30), ist: h(8, 30), from: h(8), to: h(17, 30) },
    [doo]: { soll: h(8, 30), ist: h(8, 30), from: h(8), to: h(17) },
    [fr]: { soll: h(4, 30), ist: h(4, 30), from: h(8), to: h(12, 30) },
  };
  return { entries, allDay, worked, times, holidays: new Set([di]) };
}
