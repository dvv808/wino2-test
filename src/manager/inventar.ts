import * as a from "../assets/index";
import type { Card } from "../person/stammdaten";
import { ABTEILUNGEN, TEAM, isEmployee, type TeamMember } from "./hrmTeam";

/**
 * Mitarbeiter Inventar: equipment (Inventar), Schlüssel & Badges and Benefits. One list per person, read by the
 * Profil, edited in the Inventar Workflow and checked by the Plausibilitäts Check. Bewerber have none: they get
 * equipment once they are Mitarbeiter.
 *
 * Mandatory for every Mitarbeiter: an active Microsoft 365 licence and an active office key or access badge.
 */

export type InvKind = "asset" | "key" | "benefit";
export type InvStatus = "Aktiv" | "Zurückgegeben" | "Defekt";
export type InvItem = {
  id: string;
  kind: InvKind;
  name: string;
  /** Asset: Kategorie · Schlüssel: Typ · Benefit: Kategorie. */
  kategorie: string;
  /** Asset: Inventar- / Seriennummer · Schlüssel: Nummer. */
  nummer: string;
  /** Schlüssel: Gebäude / Bereich. */
  beschreibung: string;
  /** Benefit: amount and interval, e.g. "€ 110" + "Monat". */
  wert: string;
  intervall: string;
  /** Zugewiesen am / Seit (dd.mm.yyyy). */
  datum: string;
  /** Schlüssel: Rückgabe am. */
  rueckgabe: string;
  status: InvStatus;
  notiz: string;
  /** Who handed it out: the HRM Zuständigkeit or the head of the person's Abteilung. */
  ausgabe: string;
};

/** The HR manager responsible for the person (HRM Zuständigkeit), else the HR lead. */
export const hrmOf = (person: TeamMember) => person.stamm?.hrm || "Julia Heigl";

/** The head of the person's Abteilung (Abteilungsleitung / Vorgesetzte/r from the side nav's lead lines). */
export function leadOf(person: TeamMember) {
  const dept = ABTEILUNGEN.find((d) => d.name === person.abteilung);
  return (
    dept?.lead
      .map((line) => teamName(line.split(": ")[1] ?? ""))
      .find((name) => name && name !== person.name) ?? ""
  );
}

/** A lead line names people loosely ("Christine Auer"): the team member whose name holds all of its parts. */
function teamName(name: string) {
  const parts = name.toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return TEAM.find((m) => m.name === name)?.name ?? TEAM.find((m) => parts.every((part) => m.name.toLowerCase().split(/[\s-]+/).includes(part)))?.name ?? "";
}

/** "Ausgegeben von": the HRM manager and the department heads, the person's own ones first. */
export function ausgabeOptions(person: TeamMember) {
  const leads = ABTEILUNGEN.flatMap((d) => d.lead.map((line) => teamName(line.split(": ")[1] ?? ""))).filter(Boolean);
  const hr = TEAM.filter((m) => m.abteilung === "HR-Management").map((m) => m.name);
  return [hrmOf(person), leadOf(person), ...hr, ...leads].filter((name, index, all) => name && name !== person.name && all.indexOf(name) === index);
}

export type InvAreaId = "inventar" | "schluessel" | "benefits";
export const INV_AREAS: {
  id: InvAreaId;
  kind: InvKind;
  label: string;
  step: string;
  icon: string;
  plus: string;
  empty: { title: string; link: string };
  /** Shown in the workflow while the mandatory item is missing. */
  mandatory?: string;
}[] = [
  {
    id: "inventar",
    kind: "asset",
    label: "Inventar",
    step: "Inventar",
    icon: a.inventory,
    plus: "+ Asset",
    empty: { title: "Noch kein Inventar angelegt", link: "neues Inventar hier anlegen" },
    mandatory: "Pflicht: Microsoft 365 Lizenz",
  },
  {
    id: "schluessel",
    kind: "key",
    label: "Schlüssel & Badges",
    step: "Schlüssel &\nBadges",
    icon: a.key,
    plus: "+ Schlüssel",
    empty: { title: "Noch keine Schlüssel angelegt", link: "neue Schlüssel und Badges hier anlegen" },
    mandatory: "Pflicht: Büroschlüssel oder Zugangskarte",
  },
  {
    id: "benefits",
    kind: "benefit",
    label: "Benefits",
    step: "Benefits",
    // Wino - Icons has no gift icon: the Abo icon (recurring) stands for a Benefit.
    icon: a.honorar,
    plus: "+ Benefit",
    empty: { title: "Noch keine Benefits angelegt", link: "neue Benefits hier anlegen" },
  },
];

export const ASSET_KATEGORIEN = ["Hardware", "Software", "Lizenz", "Mobilgerät", "Sonstiges"];
export const KEY_TYPEN = ["Büroschlüssel", "Zugangskarte", "Chip", "Token"];
export const BENEFIT_KATEGORIEN = ["Verpflegung", "Lifestyle", "Mobilität", "Gesundheit"];
export const INTERVALLE = ["Monat", "Jahr", "Saison", "Einmalig"];
export const STATUS: InvStatus[] = ["Aktiv", "Zurückgegeben", "Defekt"];

export const isM365 = (item: InvItem) => item.kind === "asset" && /365/.test(item.name);
export const isOfficeKey = (item: InvItem) => item.kind === "key" && (item.kategorie === "Büroschlüssel" || item.kategorie === "Zugangskarte");
export const hasM365 = (items: InvItem[]) => items.some((item) => isM365(item) && item.status === "Aktiv");
export const hasOfficeKey = (items: InvItem[]) => items.some((item) => isOfficeKey(item) && item.status === "Aktiv");

export const blankItem = (kind: InvKind): InvItem => ({
  id: `inv-${kind}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4)}`,
  kind,
  name: "",
  kategorie: kind === "asset" ? "Hardware" : kind === "key" ? "Zugangskarte" : "Verpflegung",
  nummer: "",
  beschreibung: "",
  wert: "",
  intervall: "Monat",
  datum: "",
  rueckgabe: "",
  status: "Aktiv",
  notiz: "",
  ausgabe: "",
});

const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pad = (n: number) => String(n).padStart(2, "0");

/** Seeded per name: everyone gets a laptop, most the 365 licence and an access card; a few miss one of them. */
function seed(person: TeamMember): InvItem[] {
  const h = hash(person.name);
  const year = 2018 + (h % 7);
  const on = (seedDay: number) => `${pad((seedDay % 28) + 1)}.${pad(((seedDay >>> 3) % 12) + 1)}.${year}`;
  const id = (suffix: string) => `inv-${person.name.toLowerCase().replace(/[^a-z]+/g, "-")}-${suffix}`;
  const hrm = hrmOf(person);
  const lead = leadOf(person) || hrm;
  // Equipment and keys come from the HRM manager or the department head; Benefits always from HR.
  const item = (suffix: string, kind: InvKind, fields: Partial<InvItem>): InvItem => ({
    ...blankItem(kind),
    id: id(suffix),
    datum: on(h >>> 2),
    ausgabe: kind === "benefit" || (hash(suffix) + h) % 2 ? hrm : lead,
    ...fields,
  });
  const it = person.abteilung === "IT-Management";
  const missing365 = h % 11 === 3;
  const missingKey = h % 13 === 5;
  const benefits: InvItem[] = [
    item("essen", "benefit", { name: "Essensgutscheine", kategorie: "Verpflegung", wert: "€ 110", intervall: "Monat", datum: `01.01.${year}` }),
    ...(h % 2 ? [item("oeffi", "benefit", { name: "Öffi-Ticket", kategorie: "Mobilität", wert: "€ 1.095", intervall: "Jahr", datum: `01.03.${year}` })] : []),
    ...(h % 3 === 0 ? [item("fitness", "benefit", { name: "Fitnesszuschuss", kategorie: "Gesundheit", wert: "€ 50", intervall: "Monat", datum: `01.06.${year}` })] : []),
    ...(h % 4 === 1 ? [item("fussball", "benefit", { name: "Fußballkarten", kategorie: "Lifestyle", wert: "2 Karten", intervall: "Saison", datum: `01.08.${year}` })] : []),
    ...(h % 5 === 2 ? [item("homeoffice", "benefit", { name: "Home-Office Pauschale", kategorie: "Lifestyle", wert: "€ 60", intervall: "Monat", datum: `01.06.${year}` })] : []),
  ];
  return [
    item("laptop", "asset", { name: it ? "MacBook Pro 14" : "ThinkPad X1 Carbon", kategorie: "Hardware", nummer: `INV-${10000 + (h % 89999)}` }),
    ...(missing365 ? [] : [item("m365", "asset", { name: "Microsoft 365 Lizenz", kategorie: "Software", nummer: `M365-${(h % 9000) + 1000}` })]),
    ...(h % 3 === 1 ? [item("handy", "asset", { name: "iPhone 15", kategorie: "Mobilgerät", nummer: `INV-${20000 + (h % 79999)}` })] : []),
    ...(missingKey ? [] : [item("karte", "key", { name: "Büro-Zugangskarte", kategorie: "Zugangskarte", beschreibung: "Gebäude-Zugangskarte – Zentrale", nummer: `ZK-${(h % 900) + 100}` })]),
    ...(h % 2 === 0 ? [item("garage", "key", { name: "Parkgaragen-Chip", kategorie: "Chip", beschreibung: "Zugang Parkgarage Zentrale", nummer: `PG-${(h % 90) + 10}` })] : []),
    ...benefits,
  ];
}

const store = new Map<string, InvItem[]>();

/** The person's items: as edited in the Inventar Workflow, else seeded (employees only). */
export function inventarOf(person: TeamMember): InvItem[] {
  const saved = store.get(person.name);
  if (saved) return saved;
  // Seeded team members come with equipment; someone created in "Mitarbeiter anlegen" starts empty.
  return isEmployee(person) && !person.angelegt ? seed(person) : [];
}

export function saveInventar(person: TeamMember, items: InvItem[]) {
  store.set(person.name, items);
}

/** A team member as a card value: name with their photo. */
export const personValue = (name: string) =>
  name ? { kind: "person" as const, name, photo: TEAM.find((m) => m.name === name)?.photo } : "-";

/**
 * The item's own icon (Wino - Icons): Hardware = Laptop, Mobilgerät = Mobile, Software / Lizenz = Inventar (no CD
 * icon in the library yet), Zugangskarte = Profile (ID badge), Chip = Car (Parkgarage), Büroschlüssel / Token = Key,
 * Verpflegung = Food, Gesundheit = Gym; else the area icon.
 */
export function itemIcon(item: InvItem) {
  if (item.kind === "asset") return item.kategorie === "Hardware" ? a.laptop : item.kategorie === "Mobilgerät" ? a.commsPhone : a.inventory;
  if (item.kind === "key") return item.kategorie === "Zugangskarte" ? a.moduleProfile : item.kategorie === "Chip" ? a.car : a.key;
  if (item.kategorie === "Verpflegung") return a.food;
  if (item.kategorie === "Gesundheit") return a.gym;
  return a.honorar;
}

const dateOr = (value: string) => (/\d/.test(value) ? value : "-");

/** One DataCard per item, like a Bankverbindung or Adresse in the Stammdaten. */
export function invCard(item: InvItem): Card {
  const rows =
    item.kind === "asset"
      ? [
          { label: "Kategorie", value: item.kategorie || "-" },
          { label: "Inventarnummer", value: item.nummer || "-" },
          { label: "Zugewiesen am", value: dateOr(item.datum) },
          { label: "Ausgegeben von", value: personValue(item.ausgabe) },
          { label: "Status", value: item.status },
        ]
      : item.kind === "key"
        ? [
            { label: "Typ", value: item.kategorie || "-" },
            { label: "Beschreibung", value: item.beschreibung || "-" },
            { label: "Nummer", value: item.nummer || "-" },
            { label: "Zugewiesen am", value: dateOr(item.datum) },
            ...(/\d/.test(item.rueckgabe) ? [{ label: "Rückgabe am", value: item.rueckgabe }] : []),
            { label: "Ausgegeben von", value: personValue(item.ausgabe) },
            { label: "Status", value: item.status },
          ]
        : [
            { label: "Kategorie", value: item.kategorie || "-" },
            { label: "Wert", value: item.wert ? `${item.wert}${item.intervall && item.intervall !== "Einmalig" ? ` / ${item.intervall}` : ""}` : "-" },
            { label: "Seit", value: dateOr(item.datum) },
            { label: "Ausgegeben von", value: personValue(item.ausgabe) },
            { label: "Status", value: item.status },
          ];
  return {
    id: item.id,
    icon: itemIcon(item),
    title: item.name || "Neuer Eintrag",
    blocks: [
      { kind: "rows", rows },
      ...(item.notiz ? [{ kind: "note" as const, caption: "Notiz", text: item.notiz }] : []),
    ],
  };
}

/** Cards of one area, or its empty-state card. */
export function invCards(items: InvItem[], area: (typeof INV_AREAS)[number]): Card[] {
  const own = items.filter((item) => item.kind === area.kind);
  return own.length
    ? own.map(invCard)
    : [{ id: `ma-${area.id}-leer`, empty: { icon: area.icon, title: area.empty.title, lead: "Du kannst", link: area.empty.link } }];
}

/** Is the area's mandatory item there (Inventar: Microsoft 365, Schlüssel & Badges: office key or badge)? */
export function invAreaDone(id: InvAreaId, items: InvItem[]) {
  if (id === "inventar") return hasM365(items);
  if (id === "schluessel") return hasOfficeKey(items);
  return true;
}
