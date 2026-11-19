import * as a from "../assets/index";
import type { Card } from "../person/stammdaten";
import { WEB, isEmployee, type TeamMember } from "./hrmTeam";
import { hrmOf, personValue } from "./inventar";

/** The one signed in to Wino in the HRM area (HR lead): new Dienstverträge are created by her. */
export const WINO_USER = "Julia Heigl";

/**
 * Mitarbeiter Kooperation: the Wino Zugang and the Dienstvertrag. Read by the Profil, edited in their own workflows,
 * checked by the Plausibilitäts Check (both mandatory for a Mitarbeiter: an active Zugang and a signed Dienstvertrag).
 * Bewerber have neither yet.
 */

export type KoopAreaId = "zugang" | "dienstvertrag";
export const KOOP_AREAS: { id: KoopAreaId; label: string; icon: string; empty: { title: string; link: string } }[] = [
  { id: "zugang", label: "Wino Zugang", icon: a.winoIconLogo, empty: { title: "Noch kein Wino Zugang eingerichtet", link: "einen Zugang hier einrichten" } },
  { id: "dienstvertrag", label: "Dienstvertrag", icon: a.docList, empty: { title: "Noch kein Dienstvertrag hinterlegt", link: "einen Dienstvertrag hier erstellen" } },
];

export type Freigabe = "idle" | "requested" | "granted";
export type WinoZugang = {
  benutzer: string;
  mail: string;
  mandant: string;
  rolle: string;
  abteilung: string;
  gueltigAb: string;
  freigabe: Freigabe;
  /** Who granted it ("selbst" or the IT-Management). */
  freigabeVon: string;
};

export type Dienstvertrag = {
  beginn: string;
  unternehmen: string;
  position: string;
  abteilung: string;
  art: string;
  stunden: string;
  gehalt: string;
  urlaub: string;
  probezeit: string;
  kuendigung: string;
  ort: string;
  besonderes: string;
  /** Digital signature (data URL) or the name of the uploaded signed PDF. */
  signatur: string | null;
  signFile: string | null;
  unterschriebenAm: string;
  /** Who created it in Wino, and when (set on the first Speichern). */
  erstelltVon: string;
  erstelltAm: string;
};

export const ROLLEN = ["Berater/in", "Innendienst", "Abteilungsleitung", "HR-Management", "Finanzmanagement", "Administrator"];
export const ARTEN = ["Vollzeit", "Teilzeit", "Geringfügig", "Lehrling", "Karenz"];
export const PROBEZEITEN = ["Keine", "1 Monat"];
export const KUENDIGUNG = ["4 Wochen", "6 Wochen", "2 Monate", "3 Monate"];
/** Legal name (Impressum of makler-winter.at). */
export const UNTERNEHMEN = ["Winter Versicherungsmakler Ges.m.b.H."];

const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const ascii = (text: string) => text.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

export function blankZugang(person: TeamMember): WinoZugang {
  return {
    benutzer: ascii(person.name),
    mail: WEB[person.name]?.mail || `${ascii(person.name)}@makler-winter.at`,
    mandant: "Makler Winter",
    rolle: /leitung/i.test(person.role) ? "Abteilungsleitung" : person.abteilung === "HR-Management" ? "HR-Management" : "Berater/in",
    abteilung: person.abteilung,
    gueltigAb: "",
    freigabe: "idle",
    freigabeVon: "",
  };
}

export function blankVertrag(person: TeamMember, anstellung?: { position: string; ausmass: string; wochenstunden: string; urlaub: string; standort: string; eintrittTag: string; eintrittMonat: string; eintrittJahr: string }): Dienstvertrag {
  return {
    beginn: anstellung ? `${anstellung.eintrittTag}.${anstellung.eintrittMonat}.${anstellung.eintrittJahr}` : "",
    unternehmen: UNTERNEHMEN[0],
    position: anstellung?.position ?? person.role,
    abteilung: person.abteilung,
    art: anstellung?.ausmass ?? "Vollzeit",
    stunden: anstellung?.wochenstunden ?? "38,5",
    gehalt: "",
    urlaub: anstellung?.urlaub ?? "25",
    probezeit: "1 Monat",
    kuendigung: "6 Wochen",
    ort: anstellung?.standort ?? "Schladming",
    besonderes: "",
    signatur: null,
    signFile: null,
    unterschriebenAm: "",
    erstelltVon: "",
    erstelltAm: "",
  };
}

const zugaenge = new Map<string, WinoZugang | null>();
const vertraege = new Map<string, Dienstvertrag | null>();
const seeded = (person: TeamMember) => isEmployee(person) && !person.angelegt;

/** The person's Wino Zugang: as set up in its workflow, else seeded (most seeded employees have an active one). */
export function zugangOf(person: TeamMember): WinoZugang | null {
  if (zugaenge.has(person.name)) return zugaenge.get(person.name) ?? null;
  if (!seeded(person) || hash(person.name) % 17 === 4) return null;
  const h = hash(person.name);
  return { ...blankZugang(person), gueltigAb: `01.${String((h % 12) + 1).padStart(2, "0")}.${2018 + (h % 7)}`, freigabe: "granted", freigabeVon: "IT-Management" };
}

/** The person's Dienstvertrag: as created in its workflow, else seeded (signed) for most seeded employees. */
export function vertragOf(person: TeamMember, anstellung?: Parameters<typeof blankVertrag>[1]): Dienstvertrag | null {
  if (vertraege.has(person.name)) return vertraege.get(person.name) ?? null;
  if (!seeded(person) || hash(person.name) % 19 === 7) return null;
  const h = hash(person.name);
  const base = blankVertrag(person, anstellung);
  return { ...base, gehalt: String(2800 + (h % 32) * 100), signFile: "Dienstvertrag_unterschrieben.pdf", unterschriebenAm: base.beginn, erstelltVon: hrmOf(person), erstelltAm: base.beginn };
}

export const saveZugang = (person: TeamMember, zugang: WinoZugang) => zugaenge.set(person.name, zugang);
export const saveVertrag = (person: TeamMember, vertrag: Dienstvertrag) => vertraege.set(person.name, vertrag);

export const zugangAktiv = (zugang: WinoZugang | null) => zugang?.freigabe === "granted";
export const vertragSigned = (vertrag: Dienstvertrag | null) => Boolean(vertrag && (vertrag.signatur || vertrag.signFile));
export const koopAreaDone = (id: KoopAreaId, zugang: WinoZugang | null, vertrag: Dienstvertrag | null) =>
  id === "zugang" ? zugangAktiv(zugang) : vertragSigned(vertrag);

const or = (value: string) => (value && /\S/.test(value) && value !== ".." ? value : "-");
export const euro = (value: string) => (value ? `€ ${Number(value.replace(/\D/g, "")).toLocaleString("de-DE")}` : "-");

export function zugangCard(zugang: WinoZugang): Card {
  return {
    id: "ma-zugang",
    icon: a.winoIconLogo,
    title: "Wino Zugang",
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Benutzername", value: or(zugang.benutzer) },
          { label: "Firmen-Mail", value: or(zugang.mail) },
          { label: "Mandant", value: or(zugang.mandant) },
          { label: "Rolle", value: or(zugang.rolle) },
          { label: "Abteilung", value: or(zugang.abteilung) },
          { label: "Gültig ab", value: or(zugang.gueltigAb) },
          { label: "Status", value: zugang.freigabe === "granted" ? "Aktiv" : zugang.freigabe === "requested" ? "Freigabe ausstehend" : "Entwurf" },
        ],
      },
    ],
  };
}

export function vertragCard(vertrag: Dienstvertrag): Card {
  return {
    id: "ma-dienstvertrag",
    icon: a.docList,
    title: "Dienstvertrag",
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Dienstbeginn", value: or(vertrag.beginn) },
          { label: "Unternehmen", value: or(vertrag.unternehmen) },
          { label: "Position / Titel", value: or(vertrag.position) },
          { label: "Abteilung", value: or(vertrag.abteilung) },
          { label: "Beschäftigungsart", value: `${or(vertrag.art)}${vertrag.stunden ? `, ${vertrag.stunden} h / Woche` : ""}` },
          { label: "Monatsgehalt brutto", value: euro(vertrag.gehalt) },
          { label: "Urlaubstage / Jahr", value: or(vertrag.urlaub) },
          { label: "Probezeit / Kündigungsfrist", value: `${or(vertrag.probezeit)} / ${or(vertrag.kuendigung)}` },
          { label: "Arbeitsort", value: or(vertrag.ort) },
          {
            label: "Unterschrift",
            value: vertragSigned(vertrag)
              ? vertrag.signFile
                ? { kind: "file", text: vertrag.signFile, type: "pdf" }
                : `Digital unterschrieben${vertrag.unterschriebenAm ? ` am ${vertrag.unterschriebenAm}` : ""}`
              : "Noch nicht unterschrieben",
          },
          { label: "Erstellt von", value: personValue(vertrag.erstelltVon) },
          { label: "Erstellt am", value: or(vertrag.erstelltAm) },
        ],
      },
      ...(vertrag.besonderes ? [{ kind: "note" as const, caption: "Besondere Vereinbarungen", text: vertrag.besonderes }] : []),
    ],
  };
}

/** Cards of one area for the Profil, or its empty-state card. */
export function koopCards(id: KoopAreaId, zugang: WinoZugang | null, vertrag: Dienstvertrag | null): Card[] {
  const area = KOOP_AREAS.find((entry) => entry.id === id)!;
  const card = id === "zugang" ? zugang && zugangCard(zugang) : vertrag && vertragCard(vertrag);
  return card ? [card] : [{ id: `ma-${id}-leer`, empty: { icon: area.icon, title: area.empty.title, lead: "Du kannst", link: area.empty.link } }];
}
