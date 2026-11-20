import { useSyncExternalStore } from "react";
import * as a from "../assets/index";
import { hhmm, parseIso } from "../home/calendar/calendarData";
import type { HomeofficeAntrag } from "../home/calendar/homeoffice";
import { addDays } from "../home/calendar/calendarData";
import { TEAM, isEmployee, seeded } from "./hrmTeam";

/**
 * HR-Anträge shared by HRM Listen → Anträge and the HRM Dashboard: the demo rows of the Figma table plus the live
 * Homeoffice requests from Lucy's Kalender. Decisions on the demo rows live here, so both screens agree.
 */

export type HrStatus = "beantragt" | "zurueckgesetzt" | "genehmigt";
export type Art = "Homeoffice" | "Urlaub" | "Krank" | "DV Arzt" | "DV Sonstiges";

export type Person = { name: string; role: string; photo?: string };

export type HrAntrag = {
  id: string;
  person: Person;
  art: Art;
  /** Sort key (ISO day). */
  day: string;
  datum: string;
  zeit: string;
  anhang: string[];
  status: HrStatus;
  /** The employee's own comment (DV Sonstiges and Homeoffice). */
  kommentar?: string;
  /** HR's note with the decision ("Status Kommentar"). */
  statusKommentar?: string;
  vertretung?: Person;
  homeofficeId?: string;
};

export const STATUS_LABEL: Record<HrStatus, string> = { beantragt: "Beantragt", zurueckgesetzt: "Zurückgesetzt", genehmigt: "Genehmigt" };
export const STATUS_ICON: Record<HrStatus, string> = { beantragt: a.hoOnhold, zurueckgesetzt: a.revertDark, genehmigt: a.confirm };

export const ART_ICON: Record<Art, string> = {
  Homeoffice: a.hoDot,
  Urlaub: a.mbUrlaub,
  Krank: a.mbOffline,
  "DV Arzt": a.mbOffline,
  "DV Sonstiges": a.mbOffline,
};

export const HR = "Julia Heigl";
export const LUCY: Person = { name: "Lucy Dallon", role: "Innendienst", photo: a.empLucy };
export const MIKE: Person = { name: "Manuel Scott", role: "KFZ-Versicherungen", photo: a.reqMike };

/** The rows of the Figma table. */
export const DEMO: HrAntrag[] = [
  { id: "hr-1", person: { name: "Julia Heigl", role: "Leitung HR-Management", photo: a.reqAnna }, art: "Urlaub", day: "2026-01-01", datum: "01.01.2026", zeit: "09:00 - 11:30 (2h 30m)", anhang: [], status: "beantragt", vertretung: MIKE },
  { id: "hr-2", person: { name: "Maria Straka", role: "Leitung KFZ-Versicherungen", photo: a.reqSonja }, art: "Krank", day: "2026-05-03", datum: "03.05.2026 - 07.05.2026", zeit: "4 Tage 4 Stunden", anhang: ["arztzeugnis.pdf", "bestätigung...2023.pdf"], status: "beantragt" },
  { id: "hr-3", person: { name: "Maria Straka", role: "Leitung KFZ-Versicherungen", photo: a.reqSonja }, art: "DV Sonstiges", day: "2026-05-03", datum: "03.05.2026", zeit: "1 Tag", anhang: ["Umzugsbestät_.pdf"], status: "beantragt", kommentar: "Ziehe um und brauche bitte einen Umzugstag.", vertretung: MIKE },
  { id: "hr-4", person: MIKE, art: "DV Sonstiges", day: "2026-03-02", datum: "02.03.2026 - 04.03.2026", zeit: "3 Tage", anhang: [], status: "beantragt", kommentar: "Begleitung meiner Mutter zur Reha." },
  { id: "hr-5", person: { name: "Thomas Haidler", role: "IT-Administrator", photo: a.reqAshton }, art: "DV Arzt", day: "2026-10-04", datum: "04.10.2026", zeit: "1 Tag", anhang: ["arztzeugnis.pdf", "bestätigung.pdf"], status: "beantragt" },
  { id: "hr-6", person: { name: "Sandra Lechner", role: "Marketing", photo: a.reqDavis }, art: "Urlaub", day: "2026-05-05", datum: "05.05.2026 - 09.05.2026", zeit: "4 Tage", anhang: [], status: "zurueckgesetzt", statusKommentar: "Wie besprochen ist es an diesem Zeitpunkt leider nicht möglich." },
  { id: "hr-7", person: { name: "Margret Moser", role: "Leitung Personenversicherungen", photo: a.empJasmin }, art: "DV Sonstiges", day: "2026-05-02", datum: "02.05.2026", zeit: "1 Tag", anhang: [], status: "zurueckgesetzt", statusKommentar: "Bitte Vertretung auswählen und neuen Antrag bitte stellen." },
  { id: "hr-8", person: { name: "Michael Slechta", role: "Leitung Betriebsversicherungen", photo: a.empPeter }, art: "Urlaub", day: "2026-07-25", datum: "25.07.2026", zeit: "09:15 - 11:45 (2h 30m)", anhang: [], status: "zurueckgesetzt", statusKommentar: "Es fehlen noch weitere Angaben zum Q1." },
  { id: "hr-9", person: { name: "Christian Huber", role: "Leitung Betriebliche Vorsorge", photo: a.empAlexander }, art: "Urlaub", day: "2027-01-08", datum: "08.01.2027 - 12.01.2027", zeit: "4 Tage", anhang: ["lalala.pdf"], status: "genehmigt", statusKommentar: "Bitte in Zukunft Dateien richtig benennen. Danke." },
  // Kundenberater / Schaden & Leistung – so the department tab (Figma 17685:116438) has its own requests.
  { id: "hr-10", person: { name: "Michael Pitzer", role: "Vertriebsleiter", photo: a.empAlexander }, art: "Krank", day: "2026-05-03", datum: "03.05.2026 - 07.05.2026", zeit: "4 Tage 4 Stunden", anhang: ["arztzeugnis.pdf", "bestätigung...2023.pdf"], status: "beantragt" },
  { id: "hr-11", person: { name: "Gertrud Badura", role: "Beraterin", photo: a.empChristine }, art: "Urlaub", day: "2026-12-22", datum: "22.12.2026 - 31.12.2026", zeit: "6 Tage", anhang: [], status: "beantragt" },
  { id: "hr-12", person: { name: "Silvia Fischbacher", role: "Leiterin Schaden & Leistung", photo: a.empChristineHs }, art: "DV Arzt", day: "2026-09-14", datum: "14.09.2026", zeit: "08:00 - 10:00 (2h)", anhang: ["bestätigung.pdf"], status: "genehmigt" },
];


/**
 * This year's history for every Mitarbeiter (seeded, the same on every load), so each person's own dashboard
 * has Homeoffice, Krankenstände, Urlaube and Dienstverhinderungen. Past ones are decided, a few new ones wait.
 */
/** Only Homeoffice and DV Sonstiges Anträge carry a comment (the others have no comment field). */
export const COMMENT_ARTS = ["Homeoffice", "DV Sonstiges"];
/** What people write into those Anträge. Own RNG so the figures stay the same. */
const KOMMENTARE: Record<string, string[]> = {
  Homeoffice: ["Handwerker kommt am Vormittag.", "Bin den ganzen Tag telefonisch erreichbar.", "Kind ist krank zu Hause, Arbeit läuft normal weiter.", "Arbeite an der Jahresauswertung, brauche Ruhe.", "Paketzustellung, bin ab 08:00 online."],
  "DV Sonstiges": ["Behördenweg.", "Übersiedlung, brauche einen Umzugstag.", "Termin beim Notar."],
};

function history(): HrAntrag[] {
  const random = seeded(2026);
  const say = seeded(77);
  const rows: HrAntrag[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const dayOf = (offset: number) => addDays(`${year}-01-05`, offset);
  const fmt = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
  TEAM.filter(isEmployee).forEach((m, index) => {
    const person: Person = { name: m.name, role: m.role, photo: m.photo || undefined };
    const plan: [Art, number][] = [
      ["Homeoffice", between(2, 5)],
      ["Urlaub", between(1, 3)],
      ["Krank", m.krank ? between(1, 2) : 0],
      [random() < 0.5 ? "DV Arzt" : "DV Sonstiges", m.dv ? between(0, 2) : 0],
    ];
    plan.forEach(([art, count]) => {
      for (let k = 0; k < count; k++) {
        const day = dayOf(between(0, 360));
        const future = day > today;
        const days = art === "Urlaub" ? between(2, 10) : art === "Krank" ? between(1, 4) : 1;
        const end = addDays(day, days - 1);
        const datum = days > 1 ? `${fmt(day)} - ${fmt(end)}` : fmt(day);
        const zeit =
          art === "Homeoffice" ? "08:00 - 16:30 (8h 30m)" : art === "DV Arzt" ? "08:00 - 10:30 (2h 30m)" : `${days} ${days === 1 ? "Tag" : "Tage"}`;
        const status: HrStatus = future ? (random() < 0.3 ? "beantragt" : "genehmigt") : random() < 0.97 ? "genehmigt" : "zurueckgesetzt";
        rows.push({
          id: `gen-${index}-${art}-${k}`,
          person,
          art,
          day,
          datum,
          zeit,
          anhang: art === "Krank" && days > 2 ? ["arztzeugnis.pdf"] : [],
          status,
          kommentar:
            art === "DV Sonstiges" || (art === "Homeoffice" && say() < 0.4) ? KOMMENTARE[art][Math.floor(say() * KOMMENTARE[art].length)] : undefined,
        });
      }
    });
  });
  return rows;
}

export const HISTORY = history();

export const pad = (n: number) => String(n).padStart(2, "0");
export const dmy = (day: string) => {
  const d = parseIso(day);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};
export const span = (min: number) => `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`;

export function homeofficeRows(antraege: HomeofficeAntrag[]): HrAntrag[] {
  return antraege.map((x) => ({
    id: `ho-${x.id}`,
    person: LUCY,
    art: "Homeoffice",
    day: x.day,
    datum: dmy(x.day),
    zeit: `${hhmm(x.start)} - ${hhmm(x.end)} (${span(x.end - x.start)})`,
    anhang: [],
    status: x.status === "offen" ? "beantragt" : x.status,
    kommentar: x.kommentar,
    statusKommentar: x.entscheidNotiz,
    homeofficeId: x.id,
  }));
}

let demoRows = [...DEMO, ...HISTORY];
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

/** The demo rows with their decisions; `setDemo` works like a state setter. */
export function useHrDemo(): [HrAntrag[], (next: HrAntrag[] | ((list: HrAntrag[]) => HrAntrag[])) => void] {
  const rows = useSyncExternalStore(subscribe, () => demoRows);
  const set = (next: HrAntrag[] | ((list: HrAntrag[]) => HrAntrag[])) => {
    demoRows = typeof next === "function" ? next(demoRows) : next;
    listeners.forEach((fn) => fn());
  };
  return [rows, set];
}
