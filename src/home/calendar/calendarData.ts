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
 * The week around `today`, clean: no Termine, Urlaub, Reisen or erfasste Arbeitszeit – only the Nationalfeiertag
 * (Di) stays. Sollzeit per day stays, Istzeit starts at 0:00 until Arbeitszeit is erfasst.
 */
export function seedWeek(today: string) {
  const [mo, di, mi, doo, fr] = weekDays(today);
  const entries: CalendarEntry[] = [];
  const allDay: AllDayItem[] = [{ id: "a4", calendar: "lucy", day: di, title: "Nationalfeiertag" }];
  const worked: WorkedBlock[] = [];
  const times: Record<string, DayTimes> = {
    [mo]: { soll: h(8, 30), ist: 0, from: h(7), to: h(17) },
    [di]: { soll: 0, ist: 0, from: 0, to: 0 },
    [mi]: { soll: h(8, 30), ist: 0, from: h(8), to: h(17, 30) },
    [doo]: { soll: h(8, 30), ist: 0, from: h(8), to: h(17) },
    [fr]: { soll: h(4, 30), ist: 0, from: h(8), to: h(12, 30) },
  };
  return { entries, allDay, worked, times, holidays: new Set([di]) };
}
