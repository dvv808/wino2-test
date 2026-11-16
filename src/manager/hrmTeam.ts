import * as a from "../assets/index";
import { addDays, iso, parseIso, weekStart } from "../home/calendar/calendarData";

/**
 * Dummy HR figures for the HRM Dashboard (Figma 19056:77709). Wino has no Zeitkonto, Monatsabschluss,
 * Mitarbeitergespräche or team calendar yet, so these stand in until the real lists exist. Live data
 * (Anträge, Lucy's Homeoffice) is added on top in the dashboard.
 */

export type TeamMember = {
  name: string;
  abteilung: string;
  /** Open HR workflows (dummy). */
  workflows: number;
  role: string;
  photo: string;
  /** Urlaubstage: Anspruch per year and already used. */
  urlaubAnspruch: number;
  urlaubVerbraucht: number;
  /** Krankenstand in days: this year, this week, the week before. */
  krank: number;
  krankWoche: number;
  krankVorwoche: number;
  /** Dienstverhinderung in hours: this year, this week, the week before. */
  dv: number;
  dvWoche: number;
  dvVorwoche: number;
  /** Hours this year: Homeoffice and Sollzeit. */
  homeoffice: number;
  soll: number;
  /** Last month's Monatsabschluss done? */
  abschluss: boolean;
  /** Days with a faulty time entry this month. */
  fehler: number;
  /** Zeitkonto balance in minutes. */
  zeitkonto: number;
  /** Last Mitarbeitergespräch: days ago, kind and status. None = "nicht vorhanden". */
  gespraech?: { vorTagen: number; art: "Gespräch" | "Jahresgespräch" | "Probezeitgespräch"; status: "abgeschlossen" | "offen" };
  /** Created with "Mitarbeiter anlegen": Bewerber and Bewerber Potential are not (yet) employed. */
  typ?: MitarbeiterTyp;
  /** Created with "Mitarbeiter anlegen": everything entered there, shown in the employee tab. */
  angelegt?: Record<string, string>;
};

export type MitarbeiterTyp = "Mitarbeiter" | "Bewerber" | "Bewerber Potential";

type Row = [string, string, string, number, number, number, number, number, number, number, number, number, boolean, number, number, TeamMember["gespraech"]?];

const SOLL = 1640;
const ROWS: Row[] = [
  ["Christine Auer Hammer-schmidt", "Leitung Beratung & Service", a.empChristineHs, 30, 24, 3, 0, 1, 6, 0, 2, 310, true, 0, 540, { vorTagen: 1, art: "Gespräch", status: "abgeschlossen" }],
  ["Alexander Doppler", "Leitung Beratung & Service", a.empAlexander, 30, 9, 11, 2, 0, 12, 4, 0, 560, true, 2, -320, { vorTagen: 4, art: "Jahresgespräch", status: "abgeschlossen" }],
  ["Tamara Auer", "Beraterin", a.empChristine, 25, 21, 2, 0, 0, 3, 0, 0, 120, false, 0, 95, { vorTagen: 7, art: "Gespräch", status: "offen" }],
  ["Peter Moser", "CEO & Geschäftsführer", a.empPeter, 30, 12, 0, 0, 0, 0, 0, 0, 430, true, 0, 1260],
  ["Lucy Dallon", "Innendienst", a.empLucy, 25, 6, 5, 0, 2, 8, 2, 0, 505, true, 1, 210, { vorTagen: 19, art: "Jahresgespräch", status: "abgeschlossen" }],
  ["Jasmin Gratzinger", "Berater", a.empJasmin, 25, 19, 14, 3, 2, 16, 0, 4, 80, false, 4, -610, { vorTagen: 26, art: "Probezeitgespräch", status: "offen" }],
  ["Adams Anna", "Geschäftsleitung", a.reqAnna, 30, 26, 1, 0, 0, 2, 0, 0, 520, true, 0, 880, { vorTagen: 33, art: "Jahresgespräch", status: "abgeschlossen" }],
  ["Adams Sonja", "KFZ Innendienst", a.reqSonja, 25, 8, 9, 0, 4, 9, 8, 0, 240, true, 1, -45],
  ["Bennett Mike", "KFZ Innendienst", a.reqMike, 25, 17, 4, 1, 0, 24, 0, 8, 190, false, 3, 130],
  ["Cooper Ashton", "KFZ Innendienst", a.reqAshton, 25, 5, 7, 0, 0, 8, 8, 0, 610, true, 0, 365],
  ["Davis Julia", "KFZ Innendienst", a.reqDavis, 25, 23, 0, 0, 0, 4, 0, 0, 55, true, 0, 720, { vorTagen: 48, art: "Gespräch", status: "abgeschlossen" }],
  ["Dennett Lily", "Schaden", a.empJasmin, 25, 14, 6, 0, 1, 11, 0, 3, 495, true, 2, -180],
  ["Garcia Thomas", "Schaden", a.empPeter, 25, 10, 2, 0, 0, 5, 0, 0, 330, false, 5, -90, { vorTagen: 61, art: "Gespräch", status: "offen" }],
  ["Patel Aarav", "Schaden", a.empAlexander, 25, 7, 3, 1, 0, 0, 0, 0, 150, true, 0, 45],
];

export type Abteilung = { name: string; lead: string[]; people: string[] };

/** The company tree of the Mitarbeiter side nav and its filter (Makler Winter → Abteilungen → Mitarbeiter). */
export const FIRMA = "Makler Winter";
export const ABTEILUNGEN: Abteilung[] = [
  {
    name: "Beratung & Service",
    lead: ["Vorgesetzter der Abteilung: Adams Lucy", "Abteilungsleitung: Christine Auer"],
    people: ["Christine Auer Hammer-schmidt", "Alexander Doppler", "Tamara Auer"],
  },
  { name: "Unternehmensleitung", lead: ["Leiter des Unternehmens: Peter Moser"], people: ["Peter Moser", "Lucy Dallon", "Jasmin Gratzinger", "Adams Anna"] },
  {
    name: "Schadenabteilung",
    lead: ["Vorgesetzter der Abteilung: Julia Huber", "Abteilungsleitung: Werner Barthos"],
    people: ["Dennett Lily", "Garcia Thomas", "Patel Aarav"],
  },
  { name: "KFZ Innendienst", lead: ["Abteilungsleitung: Adams Sonja"], people: ["Adams Sonja", "Bennett Mike", "Cooper Ashton", "Davis Julia"] },
];

const WORKFLOW_COUNT: Record<string, number> = { "Tamara Auer": 2, "Peter Moser": 3, "Jasmin Gratzinger": 2, "Bennett Mike": 1 };

export const TEAM: TeamMember[] = ROWS.map(
  ([name, role, photo, urlaubAnspruch, urlaubVerbraucht, krank, krankWoche, krankVorwoche, dv, dvWoche, dvVorwoche, homeoffice, abschluss, fehler, zeitkonto, gespraech]) => ({
    name, role, photo, urlaubAnspruch, urlaubVerbraucht, krank, krankWoche, krankVorwoche, dv, dvWoche, dvVorwoche, homeoffice, soll: SOLL, abschluss, fehler, zeitkonto, gespraech,
    abteilung: ABTEILUNGEN.find((x) => x.people.includes(name))?.name ?? "",
    workflows: WORKFLOW_COUNT[name] ?? 0,
  }),
);

export const member = (name: string) => TEAM.find((m) => m.name === name);

/** URL id of an employee ("tamara-auer"), for the employee tab. */
export const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const memberBySlug = (slug: string) => TEAM.find((m) => slugOf(m.name) === slug);

/** Resturlaub above this many days counts as "hoher Resturlaub". */
export const HOHER_RESTURLAUB = 12;
/** Homeoffice share of the Sollzeit that is "knapp/über 30%". */
export const HOMEOFFICE_GRENZE = 0.28;

export const TERMINARTEN = ["Projekte", "Weiterbildung", "Interne Besprechungen", "Termin - ohne Beratung", "Termine", "Termine - mit Beratung"] as const;
export type Terminart = (typeof TERMINARTEN)[number];
export type TeamTermin = { day: string; art: Terminart; extern: boolean; reise: boolean; wer: string };

/** Small seeded generator, so the team calendar is the same on every load. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const WEIGHTS: [Terminart, number][] = [
  ["Projekte", 33],
  ["Weiterbildung", 4],
  ["Interne Besprechungen", 24],
  ["Termin - ohne Beratung", 5],
  ["Termine", 27],
  ["Termine - mit Beratung", 12],
];

/** The team's Termine from 1 January to the end of this week (weekdays only). */
export function teamTermine(today: string): TeamTermin[] {
  const year = parseIso(today).getFullYear();
  const end = addDays(weekStart(today), 6);
  const random = seeded(year * 7919);
  const total = WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  const list: TeamTermin[] = [];
  for (let day = `${year}-01-01`; day <= end; day = addDays(day, 1)) {
    const weekday = parseIso(day).getDay();
    if (weekday === 0 || weekday === 6) continue;
    const count = 3 + Math.floor(random() * 7);
    for (let i = 0; i < count; i++) {
      let pick = random() * total;
      const art = (WEIGHTS.find(([, w]) => (pick -= w) < 0) ?? WEIGHTS[0])[0];
      const extern = art !== "Interne Besprechungen" && art !== "Projekte" && random() < 0.55;
      list.push({ day, art, extern, reise: extern && random() < 0.35, wer: TEAM[Math.floor(random() * TEAM.length)].name });
    }
  }
  return list;
}

export const todayIso = () => iso(new Date());

/** A department by the slug of its name, e.g. "beratung-service". */
export const abteilungBySlug = (slug: string) => ABTEILUNGEN.find((dept) => slugOf(dept.name) === slug);

/**
 * "Mitarbeiter anlegen": adds a person to the team. A Mitarbeiter joins their Abteilung (and so the side nav);
 * Bewerber and Bewerber Potential only get their own tab for now.
 */
export function registerMember(entry: { name: string; role: string; abteilung: string; typ: MitarbeiterTyp; urlaubAnspruch: number; angelegt: Record<string, string> }) {
  const existing = TEAM.find((m) => m.name === entry.name);
  if (existing) return existing;
  const created: TeamMember = {
    name: entry.name,
    role: entry.role,
    photo: "",
    abteilung: entry.typ === "Mitarbeiter" ? entry.abteilung : "",
    workflows: 0,
    urlaubAnspruch: entry.urlaubAnspruch,
    urlaubVerbraucht: 0,
    krank: 0,
    krankWoche: 0,
    krankVorwoche: 0,
    dv: 0,
    dvWoche: 0,
    dvVorwoche: 0,
    homeoffice: 0,
    soll: SOLL,
    abschluss: true,
    fehler: 0,
    zeitkonto: 0,
    typ: entry.typ,
    angelegt: entry.angelegt,
  };
  TEAM.push(created);
  if (entry.typ === "Mitarbeiter") ABTEILUNGEN.find((d) => d.name === entry.abteilung)?.people.push(entry.name);
  return created;
}
