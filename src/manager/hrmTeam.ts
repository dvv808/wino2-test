import * as a from "../assets/index";
import { addDays, iso, parseIso, weekStart } from "../home/calendar/calendarData";

/**
 * Dummy HR figures for the HRM Dashboard (Figma 19056:77709). Wino has no Zeitkonto, Monatsabschluss,
 * Mitarbeitergespräche or team calendar yet, so these stand in until the real lists exist. Live data
 * (Anträge, Lucy's Homeoffice) is added on top in the dashboard.
 */

export type Anstellung = {
  position: string;
  vorgesetzt: string;
  eintrittTag: string;
  eintrittMonat: string;
  eintrittJahr: string;
  ausmass: string;
  wochenstunden: string;
  standort: string;
  urlaub: string;
};

export type MaChannel = { value: string; note: string; extra?: string };

/** A Mitarbeiter's / Bewerber's Stammdaten, the same fields as a partner's (Wino - Concepts 21739:41943). */
export type MaStamm = {
  mandant: string;
  personentyp: string;
  hrm: string;
  titelVor: string;
  vorname: string;
  nachname: string;
  titelNach: string;
  rufname: string;
  geschlecht: string;
  geburt: string;
  nationalitaet: string;
  svNummer: string;
  notiz: string;
  addressTyp: string;
  strasse: string;
  nummer: string;
  zusatz: string;
  plz: string;
  ort: string;
  land: string;
  addressNotiz: string;
  contactNotiz: string;
  phones: MaChannel[];
  mails: MaChannel[];
  websites: MaChannel[];
  bank: { inhaber: string; iban: string; bic: string; institut: string; notiz?: string } | null;
  /** Uploaded documents (Typ, Gültig von / bis, Aussteller), from the Allgemeine Partnerdaten. */
  dokumente?: { label: string; name: string; type?: "pdf" | "jpg"; docTyp?: string; von?: string; bis?: string; aussteller?: string }[];
};

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
  /** Stammdaten section Anstellung, edited in the Mitarbeiter tab. */
  anstellung?: Anstellung;
  /** Stammdaten (Partner anlegen → Profil → Stammdaten Workflow). Seeded people get theirs from `stammOf`. */
  stamm?: MaStamm;
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
  ["Adams Anna", "Leitung HR-Management", a.reqAnna, 30, 26, 1, 0, 0, 2, 0, 0, 520, true, 0, 880, { vorTagen: 33, art: "Jahresgespräch", status: "abgeschlossen" }],
  ["Adams Sonja", "Leitung KFZ-Versicherungen", a.reqSonja, 25, 8, 9, 0, 4, 9, 8, 0, 240, true, 1, -45],
  ["Bennett Mike", "KFZ-Versicherungen", a.reqMike, 25, 17, 4, 1, 0, 24, 0, 8, 190, false, 3, 130],
  ["Cooper Ashton", "IT-Administrator", a.reqAshton, 25, 5, 7, 0, 0, 8, 8, 0, 610, true, 0, 365],
  ["Davis Julia", "Marketing", a.reqDavis, 25, 23, 0, 0, 0, 4, 0, 0, 55, true, 0, 720, { vorTagen: 48, art: "Gespräch", status: "abgeschlossen" }],
  ["Dennett Lily", "Leitung Personenversicherungen", a.empJasmin, 25, 14, 6, 0, 1, 11, 0, 3, 495, true, 2, -180],
  ["Garcia Thomas", "Leitung Betriebsversicherungen", a.empPeter, 25, 10, 2, 0, 0, 5, 0, 0, 330, false, 5, -90, { vorTagen: 61, art: "Gespräch", status: "offen" }],
  ["Patel Aarav", "Leitung Betriebliche Vorsorge", a.empAlexander, 25, 7, 3, 1, 0, 0, 0, 0, 150, true, 0, 45],
];

export type Abteilung = { name: string; lead: string[]; people: string[]; /** The Bewerber group of the tree: not an Abteilung you can pick. */ bewerber?: true };

/** The company tree of the Mitarbeiter side nav and its filter (Makler Winter → Abteilungen → Mitarbeiter). */
export const FIRMA = "Makler Winter";
export const ABTEILUNGEN: Abteilung[] = [
  {
    name: "Beratung & Service",
    lead: ["Vorgesetzter der Abteilung: Adams Lucy", "Abteilungsleitung: Christine Auer"],
    people: ["Christine Auer Hammer-schmidt", "Alexander Doppler", "Tamara Auer"],
  },
  { name: "Fachabteilung Betriebliche Vorsorge", lead: ["Abteilungsleitung: Patel Aarav"], people: ["Patel Aarav"] },
  { name: "Fachabteilung Betriebsversicherungen", lead: ["Abteilungsleitung: Garcia Thomas"], people: ["Garcia Thomas"] },
  { name: "Fachabteilung KFZ-Versicherungen", lead: ["Abteilungsleitung: Adams Sonja"], people: ["Adams Sonja", "Bennett Mike"] },
  { name: "Fachabteilung Personenversicherungen", lead: ["Abteilungsleitung: Dennett Lily"], people: ["Dennett Lily"] },
  { name: "Finanzmanagement", lead: ["Vorgesetzter der Abteilung: Peter Moser"], people: [] },
  { name: "HR-Management", lead: ["Abteilungsleitung: Adams Anna"], people: ["Adams Anna"] },
  { name: "IT-Management", lead: ["Abteilungsleitung: Cooper Ashton"], people: ["Cooper Ashton"] },
  { name: "Kundenberater", lead: ["Vorgesetzter der Abteilung: Peter Moser"], people: ["Jasmin Gratzinger"] },
  { name: "Marketing", lead: ["Abteilungsleitung: Davis Julia"], people: ["Davis Julia"] },
  { name: "Office-Management", lead: ["Abteilungsleitung: Lucy Dallon"], people: ["Lucy Dallon"] },
  { name: "Unternehmensführung", lead: ["Leiter des Unternehmens: Peter Moser"], people: ["Peter Moser"] },
  // Last in the tree, but a group of its own in the filter: everyone who is not (yet) employed.
  { name: "Bewerber", lead: ["Zuständig: HR-Management"], people: [], bewerber: true },
];

/**
 * Makler Winter has 100 Mitarbeiter. Headcount per Abteilung (business standard for a broker of that size):
 * the Kundenberater and the Fachabteilungen are the big teams, Unternehmensführung, HR and Marketing are small.
 * The 14 named people above come first; the rest are generated (seeded, the same on every load).
 */
const HEADCOUNT: Record<string, number> = {
  "Beratung & Service": 12,
  "Fachabteilung Betriebliche Vorsorge": 8,
  "Fachabteilung Betriebsversicherungen": 10,
  "Fachabteilung KFZ-Versicherungen": 12,
  "Fachabteilung Personenversicherungen": 10,
  Finanzmanagement: 6,
  "HR-Management": 4,
  "IT-Management": 5,
  Kundenberater: 20,
  Marketing: 4,
  "Office-Management": 5,
  Unternehmensführung: 4,
};

/** The Abteilungen you can assign someone to (everything but the Bewerber group). */
export const ABTEILUNG_NAMEN = ABTEILUNGEN.filter((d) => !d.bewerber).map((d) => d.name);

const WORKFLOW_COUNT: Record<string, number> = { "Tamara Auer": 2, "Peter Moser": 3, "Jasmin Gratzinger": 2, "Bennett Mike": 1 };

export const TEAM: TeamMember[] = ROWS.map(
  ([name, role, photo, urlaubAnspruch, urlaubVerbraucht, krank, krankWoche, krankVorwoche, dv, dvWoche, dvVorwoche, homeoffice, abschluss, fehler, zeitkonto, gespraech]) => ({
    name, role, photo, urlaubAnspruch, urlaubVerbraucht, krank, krankWoche, krankVorwoche, dv, dvWoche, dvVorwoche, homeoffice, soll: SOLL, abschluss, fehler, zeitkonto, gespraech,
    abteilung: ABTEILUNGEN.find((x) => x.people.includes(name))?.name ?? "",
    workflows: WORKFLOW_COUNT[name] ?? 0,
  }),
);

const VORNAMEN = ["Anna", "Lukas", "Sophie", "Florian", "Lena", "Maximilian", "Katharina", "Tobias", "Julia", "Stefan", "Elena", "Markus", "Sarah", "David", "Theresa", "Michael", "Laura", "Andreas", "Verena", "Patrick", "Nina", "Christoph", "Lisa", "Matthias", "Hannah", "Daniel", "Magdalena", "Bernhard", "Johanna", "Simon", "Eva", "Georg", "Marie", "Philipp", "Carina", "Martin", "Sabine", "Thomas", "Melanie", "Fabian"];
const NACHNAMEN = ["Gruber", "Huber", "Wagner", "Pichler", "Steiner", "Moser", "Mayer", "Hofer", "Leitner", "Berger", "Fuchs", "Eder", "Fischer", "Schmid", "Winkler", "Weber", "Schwarz", "Maier", "Schneider", "Reiter", "Mayr", "Schmidt", "Wimmer", "Egger", "Brunner", "Lang", "Baumgartner", "Auer", "Binder", "Lechner", "Wolf", "Wallner", "Aigner", "Ebner", "Koller", "Lehner", "Haas", "Schuster", "Holzer", "Strasser"];
const ROLLEN: Record<string, string[]> = {
  "Beratung & Service": ["Berater/in", "Kundenservice", "Innendienst"],
  "Fachabteilung Betriebliche Vorsorge": ["Referent/in Vorsorge", "Sachbearbeiter/in"],
  "Fachabteilung Betriebsversicherungen": ["Referent/in Betriebsversicherungen", "Sachbearbeiter/in", "Schadenreferent/in"],
  "Fachabteilung KFZ-Versicherungen": ["KFZ-Versicherungen", "KFZ Innendienst", "Schadenreferent/in KFZ"],
  "Fachabteilung Personenversicherungen": ["Referent/in Personenversicherungen", "Sachbearbeiter/in"],
  Finanzmanagement: ["Buchhaltung", "Controlling", "Leitung Finanzen"],
  "HR-Management": ["HR-Referent/in", "Lohnverrechnung"],
  "IT-Management": ["IT-Support", "Systemadministration"],
  Kundenberater: ["Kundenberater/in", "Junior Kundenberater/in", "Senior Kundenberater/in"],
  Marketing: ["Marketing", "Content & Social Media"],
  "Office-Management": ["Empfang", "Assistenz", "Office-Management"],
  Unternehmensführung: ["Prokurist/in", "Geschäftsführung", "Assistenz der Geschäftsführung"],
};

(function fillTeam() {
  const random = seeded(4242);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const used = new Set(TEAM.map((m) => m.name));
  let n = 0;
  for (const dept of ABTEILUNGEN) {
    const want = HEADCOUNT[dept.name] ?? 0;
    while (dept.people.length < want) {
      let name = "";
      do name = `${NACHNAMEN[(n * 7 + between(0, 39)) % NACHNAMEN.length]} ${pick(VORNAMEN)}`;
      while (used.has(name));
      used.add(name);
      n++;
      const anspruch = random() < 0.3 ? 30 : 25;
      const krankWoche = random() < 0.12 ? between(1, 3) : 0;
      const dvWoche = random() < 0.15 ? between(2, 8) : 0;
      const gespraechArt = pick(["Gespräch", "Jahresgespräch", "Probezeitgespräch"] as const);
      TEAM.push({
        name,
        role: pick(ROLLEN[dept.name] ?? ["Mitarbeiter/in"]),
        photo: "",
        abteilung: dept.name,
        workflows: random() < 0.2 ? between(1, 3) : 0,
        urlaubAnspruch: anspruch,
        urlaubVerbraucht: between(3, anspruch - 1),
        krank: between(0, 14),
        krankWoche,
        krankVorwoche: random() < 0.12 ? between(1, 3) : 0,
        dv: between(0, 20),
        dvWoche,
        dvVorwoche: random() < 0.15 ? between(2, 8) : 0,
        homeoffice: between(40, 560),
        soll: SOLL,
        abschluss: random() < 0.8,
        fehler: random() < 0.25 ? between(1, 5) : 0,
        zeitkonto: between(-480, 1200),
        gespraech: random() < 0.75 ? { vorTagen: between(2, 300), art: gespraechArt, status: random() < 0.75 ? "abgeschlossen" : "offen" } : undefined,
      });
      dept.people.push(name);
    }
  }
})();

/** Employees only (no Bewerber / Bewerber Potential): what the HRM figures count. */
export const isEmployee = (m: TeamMember) => !m.typ || m.typ === "Mitarbeiter";

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
export function seeded(seed: number) {
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
  const staff = TEAM.filter(isEmployee);
  for (let day = `${year}-01-01`; day <= end; day = addDays(day, 1)) {
    const weekday = parseIso(day).getDay();
    if (weekday === 0 || weekday === 6) continue;
    // About five Termine per person and week, whatever the team size.
    const count = Math.round((3 + random() * 7) * (staff.length / 14));
    for (let i = 0; i < count; i++) {
      let pick = random() * total;
      const art = (WEIGHTS.find(([, w]) => (pick -= w) < 0) ?? WEIGHTS[0])[0];
      const extern = art !== "Interne Besprechungen" && art !== "Projekte" && random() < 0.55;
      list.push({ day, art, extern, reise: extern && random() < 0.35, wer: staff[Math.floor(random() * staff.length)].name });
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
  else ABTEILUNGEN.find((d) => d.bewerber)?.people.push(entry.name);
  return created;
}


/** Named people written "Vorname Nachname"; everyone else (and every generated person) is "Nachname Vorname". */
const FIRST_LAST = ["Christine Auer Hammer-schmidt", "Alexander Doppler", "Tamara Auer", "Peter Moser", "Lucy Dallon", "Jasmin Gratzinger"];

/** Vorname and Nachname of a team member (from "Mitarbeiter anlegen" when entered there). */
export function nameParts(person: TeamMember) {
  if (person.stamm) return { vorname: person.stamm.vorname, nachname: person.stamm.nachname };
  if (person.angelegt?.Vorname || person.angelegt?.Nachname) return { vorname: person.angelegt.Vorname ?? "", nachname: person.angelegt.Nachname ?? "" };
  const words = person.name.split(" ");
  if (FIRST_LAST.includes(person.name)) return { vorname: words[0], nachname: words.slice(1).join(" ") };
  return { vorname: words.slice(1).join(" "), nachname: words[0] };
}

/** Three Bewerber from the start (Benjamin Atkinson is the Bewerber of the Figma screens). */
for (const [vorname, nachname, typ, notiz] of [
  ["Benjamin", "Atkinson", "Bewerber", "War vorher bei der Allianz tätig."],
  ["Lena", "Hofbauer", "Bewerber", "Bewerbung als Innendienst, Gespräch am 25.11.2026."],
  ["Maximilian", "Steiner", "Bewerber Potential", "Initiativbewerbung, für 2027 vorgemerkt."],
] as const) {
  registerMember({ name: `${vorname} ${nachname}`, role: typ, abteilung: "", typ, urlaubAnspruch: 25, angelegt: { Vorname: vorname, Nachname: nachname, Notiz: notiz } });
}
