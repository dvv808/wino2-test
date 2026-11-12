/**
 * Homeoffice-Anträge (Figma 22647:252180): per day one or more time blocks (Beginn – Ende), each with an
 * optional comment. Every block is its own request, so a single block can be approved, rejected or deleted.
 *
 * offen → genehmigt | zurueckgesetzt (by HR / the Genehmiger). Zurückgesetzt means: the request is taken out of the
 * calendar and the employee is told to ask again (with the reason). Saving a day again keeps unchanged blocks as they are;
 * a changed or new block is open again. Deleting removes the request.
 */
import { addDays, iso, parseIso, seedWeek } from "./calendarData";

export type HomeofficeStatus = "offen" | "genehmigt" | "zurueckgesetzt";

export type HomeofficeAntrag = {
  id: string;
  day: string;
  /** Minutes since midnight. */
  start: number;
  end: number;
  kommentar?: string;
  status: HomeofficeStatus;
  beantragt: string;
  entschieden?: string;
  /** Who decided (Kalender simulation: the Genehmiger; Freigaben: the Bestandsmanager). */
  entschiedenVon?: string;
  /** Note written with the decision in Freigaben. */
  entscheidNotiz?: string;
  /** The employee has seen the decision (widget notification). */
  gelesen?: boolean;
};

/** One row of the modal while it is edited. `id` is set for a block that already exists. */
export type HomeofficeBlock = { key: string; id?: string; start: number | null; end: number | null; kommentar: string };

export const STATUS_TEXT: Record<HomeofficeStatus, string> = {
  offen: "Beantragt, Genehmigung ausstehend",
  genehmigt: "Genehmigt",
  zurueckgesetzt: "Zurückgesetzt, bitte neu beantragen",
};

/** Who decides Lucy's requests in the prototype. */
export const GENEHMIGER = { name: "Caleb Alexander Smith", rolle: "Teamleitung" };

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

/** Sollzeit of a weekday (Figma: Mo–Do 8:30, Fr 4:30). */
export function sollzeit(day: string) {
  const weekday = parseIso(day).getDay();
  if (weekday === 0 || weekday === 6) return 0;
  return weekday === 5 ? h(4, 30) : h(8, 30);
}

/** Why no Homeoffice can be asked for on a day, or null. */
export function blockedReason(day: string, today: string, holidays: Set<string>): string | null {
  if (day < today) return "Vergangene Tage können nicht mehr beantragt werden.";
  const weekday = parseIso(day).getDay();
  if (weekday === 0 || weekday === 6) return "Am Wochenende kann kein Homeoffice beantragt werden.";
  if (holidays.has(day)) return "An Feiertagen kann kein Homeoffice beantragt werden.";
  return null;
}

/**
 * Blocks a day starts with in the modal: what is already asked for (a rejected block too, so it can be changed
 * and asked for again), else the Figma default (08:00–12:30, 13:00–17:00).
 */
export function startBlocks(day: string, antraege: HomeofficeAntrag[]): HomeofficeBlock[] {
  const existing = forDay(antraege, day);
  if (existing.length) return existing.map((x) => ({ key: x.id, id: x.id, start: x.start, end: x.end, kommentar: x.kommentar ?? "" }));
  const friday = parseIso(day).getDay() === 5;
  return friday
    ? [{ key: "b1", start: h(8), end: h(12, 30), kommentar: "" }]
    : [
        { key: "b1", start: h(8), end: h(12, 30), kommentar: "" },
        { key: "b2", start: h(13), end: h(17), kommentar: "" },
      ];
}

/** A new block right after the last one (one hour), or 08:00–09:00. */
export function nextBlock(blocks: HomeofficeBlock[], key: string): HomeofficeBlock {
  const last = Math.max(...blocks.map((b) => b.end ?? 0), 0);
  const start = last ? Math.min(last + 30, h(23)) : h(8);
  return { key, start, end: Math.min(start + 60, h(23, 59)), kommentar: "" };
}

/** Error per block (by key): missing time, Ende before Beginn, or overlapping another block. */
export function validate(blocks: HomeofficeBlock[]): Record<string, string> {
  const errors: Record<string, string> = {};
  blocks.forEach((b) => {
    if (b.start === null || b.end === null) errors[b.key] = "Bitte Beginn und Ende angeben.";
    else if (b.end <= b.start) errors[b.key] = "Ende muss nach Beginn liegen.";
  });
  const ok = blocks.filter((b) => !errors[b.key]) as { key: string; start: number; end: number }[];
  ok.forEach((b) => {
    if (ok.some((o) => o.key !== b.key && o.start < b.end && b.start < o.end)) errors[b.key] = "Überschneidet sich mit einer anderen Zeit.";
  });
  return errors;
}

/** Istzeit of the modal: the sum of all valid blocks. */
export const total = (blocks: HomeofficeBlock[]) =>
  blocks.reduce((sum, b) => (b.start !== null && b.end !== null && b.end > b.start ? sum + b.end - b.start : sum), 0);

/**
 * Saves a day: its open and approved requests are replaced by the blocks. A block whose time did not change
 * keeps its status (an approved block stays approved); everything else is a new open request.
 */
export function saveDay(antraege: HomeofficeAntrag[], day: string, blocks: HomeofficeBlock[], now: string): HomeofficeAntrag[] {
  const before = antraege.filter((x) => x.day === day && x.status !== "zurueckgesetzt");
  const others = antraege.filter((x) => !(x.day === day && x.status !== "zurueckgesetzt"));
  const saved = blocks
    .filter((b) => b.start !== null && b.end !== null)
    .sort((x, y) => x.start! - y.start!)
    .map<HomeofficeAntrag>((b, i) => {
      const old = before.find((x) => x.id === b.id);
      const kommentar = b.kommentar.trim() || undefined;
      if (old && old.start === b.start && old.end === b.end) return { ...old, kommentar };
      return { id: `ho-${day}-${b.start}-${Date.parse(now) || 0}-${i}`, day, start: b.start!, end: b.end!, kommentar, status: "offen", beantragt: now };
    });
  // A request that was reset is replaced once its time is asked for again.
  const kept = others.filter((x) => !(x.day === day && saved.some((s) => s.start < x.end && x.start < s.end)));
  return [...kept, ...saved];
}

/** A day's requests by Beginn. */
export const forDay = (antraege: HomeofficeAntrag[], day: string) => antraege.filter((x) => x.day === day).sort((x, y) => x.start - y.start);

/** What the calendar shows: a reset request is gone from it (the employee only gets the notice). */
export const inCalendar = (antraege: HomeofficeAntrag[], day: string) => forDay(antraege, day).filter((x) => x.status !== "zurueckgesetzt");

/** The Genehmiger decides an open request. */
export const decide = (
  antraege: HomeofficeAntrag[],
  id: string,
  status: "genehmigt" | "zurueckgesetzt",
  now: string,
  by: string = GENEHMIGER.name,
  notiz?: string,
) =>
  antraege.map((x) =>
    x.id === id && x.status === "offen"
      ? { ...x, status, entschieden: now, entschiedenVon: by, entscheidNotiz: notiz?.trim() || undefined, gelesen: false }
      : x,
  );

/** Decided requests as notifications for the employee (widget), newest first. */
export const decisions = (antraege: HomeofficeAntrag[]) =>
  antraege.filter((x) => x.status !== "offen" && x.entschieden).sort((x, y) => y.entschieden!.localeCompare(x.entschieden!));

/** Marks the decision of one request (or, without id, of all) as seen. */
export const markGelesen = (antraege: HomeofficeAntrag[], id?: string) =>
  antraege.map((x) => (x.entschieden && (!id || x.id === id) ? { ...x, gelesen: true } : x));

export const remove = (antraege: HomeofficeAntrag[], id: string) => antraege.filter((x) => x.id !== id);

/** "8" → 08:00, "830" / "8.30" / "8:30" → 08:30. Null when it is no time of day. */
export function parseTime(text: string): number | null {
  const t = text.trim().replace(/[.,h]/g, ":");
  if (!t) return null;
  let hours: number;
  let minutes: number;
  if (t.includes(":")) {
    const [hs, ms] = t.split(":");
    hours = Number(hs);
    minutes = Number(ms || 0);
  } else if (/^\d{3,4}$/.test(t)) {
    hours = Number(t.slice(0, -2));
    minutes = Number(t.slice(-2));
  } else {
    hours = Number(t);
    minutes = 0;
  }
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// ---------------------------------------------------------------- focus

/** A request another screen wants shown in the Kalender (its day, popover open). Read once by the Kalender. */
let focus: string | null = null;
export const focusAntrag = (id: string) => {
  focus = id;
  // An open Kalender reacts right away (the widget can jump while the Kalender is shown).
  window.dispatchEvent(new CustomEvent(FOCUS_EVENT));
};
const FOCUS_EVENT = "wino:homeoffice-focus";
export function onFocus(callback: () => void) {
  window.addEventListener(FOCUS_EVENT, callback);
  return () => window.removeEventListener(FOCUS_EVENT, callback);
}
export function takeFocus() {
  const id = focus;
  focus = null;
  return id;
}

// ---------------------------------------------------------------- storage

/** v2: time blocks. Requests of the earlier Ganztag / Vormittag / Nachmittag version are not read. */
/** v3: starts with Lucy's two open demo requests (earlier test data is not read). */
const KEY = "wino.kalender.homeoffice.v3";

/**
 * Demo: Lucy Dallon has two open Homeoffice requests on the next two working days (no weekend, no holiday),
 * so the Kalender, Beantragungen, HRM Anträge, Freigaben and Mein Bereich show them from the start.
 */
export function seedAntraege(today: string): HomeofficeAntrag[] {
  const holidays = seedWeek(today).holidays;
  const days: string[] = [];
  for (let day = addDays(today, 1); days.length < 2; day = addDays(day, 1)) {
    if (!blockedReason(day, today, holidays)) days.push(day);
  }
  const stamp = (offset: number, hours: number, minutes: number) => {
    const d = parseIso(addDays(today, offset));
    d.setHours(hours, minutes);
    return d.toISOString();
  };
  return [
    { id: "ho-demo-1", day: days[0], start: 8 * 60, end: 12 * 60 + 30, kommentar: "Handwerker kommt am Vormittag.", status: "offen", beantragt: stamp(-1, 9, 12) },
    { id: "ho-demo-2", day: days[1], start: 13 * 60, end: 17 * 60, status: "offen", beantragt: stamp(0, 8, 5) },
  ];
}

/**
 * Demo: one Homeoffice request that is already genehmigt – the last working day before today (no weekend, no
 * holiday), 08:00–12:30, decided by the Genehmiger the day after it was asked for.
 */
export function seedApproved(today: string): HomeofficeAntrag {
  const holidays = seedWeek(today).holidays;
  let day = addDays(today, -1);
  while ([0, 6].includes(parseIso(day).getDay()) || holidays.has(day)) day = addDays(day, -1);
  const at = (offset: number, hours: number, minutes: number) => {
    const d = parseIso(addDays(day, offset));
    d.setHours(hours, minutes);
    return d.toISOString();
  };
  return {
    id: "ho-demo-approved",
    day,
    start: 8 * 60,
    end: 12 * 60 + 30,
    kommentar: "Steuerberater-Termin am Nachmittag in Salzburg.",
    status: "genehmigt",
    beantragt: at(-3, 10, 20),
    entschieden: at(-2, 8, 45),
    entschiedenVon: GENEHMIGER.name,
    gelesen: true,
  };
}

/** Added once to data saved before the approved demo request existed (deleting it later sticks). */
const APPROVED_SEEDED = "wino.kalender.homeoffice.approvedSeeded";

export function loadAntraege(): HomeofficeAntrag[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      const seeded = [...seedAntraege(iso(new Date())), seedApproved(iso(new Date()))];
      localStorage.setItem(KEY, JSON.stringify(seeded));
      localStorage.setItem(APPROVED_SEEDED, "1");
      return seeded;
    }
    const parsed = JSON.parse(raw);
    // "abgelehnt" was the earlier name of zurückgesetzt.
    const list: HomeofficeAntrag[] = Array.isArray(parsed)
      ? parsed.filter((x) => typeof x?.start === "number").map((x) => (x.status === "abgelehnt" ? { ...x, status: "zurueckgesetzt" } : x))
      : [];
    if (!localStorage.getItem(APPROVED_SEEDED)) {
      localStorage.setItem(APPROVED_SEEDED, "1");
      if (!list.some((x) => x.id === "ho-demo-approved")) {
        const next = [...list, seedApproved(iso(new Date()))];
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }
    }
    return list;
  } catch {
    return [];
  }
}

const EVENT = "wino:homeoffice";

/** Saves and tells every open screen (Kalender, Freigaben) that the requests changed. */
export function saveAntraege(antraege: HomeofficeAntrag[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(antraege));
  } catch {
    // Not saved: requests hold until reload.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: antraege }));
}

/** Calls back with the new list whenever another screen saved the requests. */
export function onAntraegeChange(callback: (antraege: HomeofficeAntrag[]) => void) {
  const handler = (event: Event) => callback((event as CustomEvent<HomeofficeAntrag[]>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
