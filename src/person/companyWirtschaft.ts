import * as a from "../assets/index";
import type { Block, Card, FileEntry, Row } from "./stammdaten";

/** People that company Wirtschaftsdaten forms can pick as organs or GISA managers. */
export const COMPANY_PERSONS = [
  "Dave Vice",
  "Julia Atkinson",
  "Thomas Atkinson",
  "Michael Jordan",
  "Philip Weenter",
  "Bernhard Meyer",
  "Maria Gruber",
  "Lukas Hofer",
  "Anna Berger",
];

export type StaffYear = { jahr: string; anzahl: string };

export type CompanyFirmenbuchForm = {
  firmenwortlaut: string;
  strasse: string;
  nummer: string;
  zusatz: string;
  plz: string;
  ort: string;
  land: string;
  rechtsform: string;
  sitzIn: string;
  gericht: string;
  firmenbuchnummer: string;
  euid: string;
  uid: string;
  bilanzTag: string;
  bilanzMonat: string;
  mitarbeiter: StaffYear;
  mitarbeiterHistory: StaffYear[];
  erstTag: string;
  erstMonat: string;
  erstJahr: string;
};

export type OwnerEntry = {
  name: string;
  bezeichnung: string;
  anteile: string;
};

export type ControlOrganEntry = {
  person: string;
  funktion: string;
  beschreibung: string;
  notiz: string;
  tag: string;
  monat: string;
  jahr: string;
};

export type LegalRepEntry = {
  person: string;
  funktion: string;
  beschreibung: string;
  vertretungsArt: string;
  vertretungsbefugnis: string;
  tag: string;
  monat: string;
  jahr: string;
};

export type HoldingEntry = {
  name: string;
  art: string;
  anteile: string;
};

export type CompanyOrganeForm = {
  owners: OwnerEntry[];
  controlOrgans: ControlOrganEntry[];
  legalReps: LegalRepEntry[];
  holdings: HoldingEntry[];
  beneficialOwners: string[];
};

export type CompanyGewerbeEntry = {
  geschaeftsfuehrer: string;
  strasse: string;
  nummer: string;
  zusatz: string;
  plz: string;
  ort: string;
  land: string;
  wortlaut: string;
  gisa: string;
  tag: string;
  monat: string;
  jahr: string;
  aktiv: boolean;
  ruhendTag: string;
  ruhendMonat: string;
  ruhendJahr: string;
};

export type CompanyGisaForm = {
  gln: string;
  aktiveAnzahl: string;
  branche: string;
  produkte: string;
  taetigkeit: string;
  gewerbe: CompanyGewerbeEntry[];
};

const WORTLAUT =
  "Versicherungsvermittlung in der Form Versicherungsmakler und Berater in Versicherungsangelegenheiten";

export const EMPTY_OWNER: OwnerEntry = { name: "", bezeichnung: "Gesellschafter", anteile: "" };

export const EMPTY_CONTROL: ControlOrganEntry = {
  person: "",
  funktion: "",
  beschreibung: "",
  notiz: "",
  tag: "",
  monat: "",
  jahr: "",
};

export const EMPTY_LEGAL_REP: LegalRepEntry = {
  person: "",
  funktion: "Geschäftsführer",
  beschreibung: "",
  vertretungsArt: "gemeinsam",
  vertretungsbefugnis: "",
  tag: "",
  monat: "",
  jahr: "",
};

export const EMPTY_HOLDING: HoldingEntry = { name: "", art: "Als Gesellschafter", anteile: "" };

export const EMPTY_COMPANY_GEWERBE: CompanyGewerbeEntry = {
  geschaeftsfuehrer: "",
  strasse: "",
  nummer: "",
  zusatz: "",
  plz: "",
  ort: "",
  land: "Österreich",
  wortlaut: "",
  gisa: "",
  tag: "",
  monat: "",
  jahr: "",
  aktiv: true,
  ruhendTag: "",
  ruhendMonat: "",
  ruhendJahr: "",
};

export const INITIAL_COMPANY_FIRMENBUCH: CompanyFirmenbuchForm = {
  firmenwortlaut: "Lunixo AG",
  strasse: "Mondseestrasse",
  nummer: "32",
  zusatz: "-",
  plz: "5310",
  ort: "Mondsee",
  land: "Österreich",
  rechtsform: "Aktiengesellschaft",
  sitzIn: "politischer Gemeinde Mondsee",
  gericht: "Landesgericht Vöcklerbruck",
  firmenbuchnummer: "51209z",
  euid: "ATBRA.2032 12-0000",
  uid: "ATU20051022",
  bilanzTag: "31",
  bilanzMonat: "12",
  mitarbeiter: { jahr: "2027", anzahl: "42" },
  mitarbeiterHistory: [{ jahr: "2026", anzahl: "40" }],
  erstTag: "03",
  erstMonat: "02",
  erstJahr: "1993",
};

export const INITIAL_COMPANY_ORGANE: CompanyOrganeForm = {
  owners: [
    { name: "Lunixo AG", bezeichnung: "Gesellschafter", anteile: "70%" },
    { name: "Winter Habocha GesmbH", bezeichnung: "Gesellschafter", anteile: "30%" },
  ],
  controlOrgans: [
    {
      person: "Michael Jordan",
      funktion: "Geschäftsführer",
      beschreibung: "ARVors",
      notiz: "Stellvertreter des Vorsitzenden 1. Stellvertreter/in",
      tag: "",
      monat: "",
      jahr: "",
    },
  ],
  legalReps: [
    {
      person: "Dave Vice",
      funktion: "Geschäftsführer",
      beschreibung: "Risk Management, Betriebsorganisation, Datenschutz, Informationstechnologie",
      vertretungsArt: "gemeinsam",
      vertretungsbefugnis: "vertritt seit 01.03.2025 gemeinsam mit einem/einer weiteren Geschäftsführer/in",
      tag: "12",
      monat: "12",
      jahr: "2014",
    },
    {
      person: "Michael Jordan",
      funktion: "Funktionsträger",
      beschreibung: "Landesdirektion Vorarlberg",
      vertretungsArt: "gemeinsam",
      vertretungsbefugnis: "-",
      tag: "12",
      monat: "12",
      jahr: "2014",
    },
  ],
  holdings: [
    { name: "Winter Insurance Group", art: "Als Gesellschafter", anteile: "40%" },
    { name: "Lunixo Holding", art: "Als Aktionär", anteile: "60%" },
  ],
  beneficialOwners: ["Dave Vice", "Bernhard Meyer"],
};

export const INITIAL_COMPANY_GISA: CompanyGisaForm = {
  gln: "947945612",
  aktiveAnzahl: "2",
  branche: "Tätigkeiten der Versicherungsvermittlung (66.22-0)",
  produkte: "Versicherungsmakler",
  taetigkeit: "Versicherungsmakler",
  gewerbe: [
    {
      geschaeftsfuehrer: "Dave Vice",
      strasse: "Mondseestrasse",
      nummer: "32",
      zusatz: "-",
      plz: "5310",
      ort: "Mondsee",
      land: "Österreich",
      wortlaut: WORTLAUT,
      gisa: "20203202",
      tag: "03",
      monat: "02",
      jahr: "1993",
      aktiv: true,
      ruhendTag: "",
      ruhendMonat: "",
      ruhendJahr: "",
    },
    {
      geschaeftsfuehrer: "Philip Weenter",
      strasse: "Mondseestrasse",
      nummer: "32",
      zusatz: "-",
      plz: "5310",
      ort: "Mondsee",
      land: "Österreich",
      wortlaut: WORTLAUT,
      gisa: "15010924",
      tag: "03",
      monat: "02",
      jahr: "1993",
      aktiv: true,
      ruhendTag: "",
      ruhendMonat: "",
      ruhendJahr: "",
    },
    {
      geschaeftsfuehrer: "Philip Weenter",
      strasse: "Salzburgerstrasse",
      nummer: "304",
      zusatz: "-",
      plz: "8970",
      ort: "Schladming",
      land: "Österreich",
      wortlaut: WORTLAUT,
      gisa: "65151243",
      tag: "03",
      monat: "02",
      jahr: "2014",
      aktiv: false,
      ruhendTag: "03",
      ruhendMonat: "02",
      ruhendJahr: "2014",
    },
  ],
};

export const EMPTY_COMPANY_FIRMENBUCH: CompanyFirmenbuchForm = {
  firmenwortlaut: "",
  strasse: "",
  nummer: "",
  zusatz: "",
  plz: "",
  ort: "",
  land: "Österreich",
  rechtsform: "",
  sitzIn: "",
  gericht: "",
  firmenbuchnummer: "",
  euid: "",
  uid: "",
  bilanzTag: "",
  bilanzMonat: "",
  mitarbeiter: { jahr: "", anzahl: "" },
  mitarbeiterHistory: [],
  erstTag: "",
  erstMonat: "",
  erstJahr: "",
};

export const EMPTY_COMPANY_ORGANE: CompanyOrganeForm = {
  owners: [],
  controlOrgans: [],
  legalReps: [],
  holdings: [],
  beneficialOwners: [],
};

export const EMPTY_COMPANY_GISA: CompanyGisaForm = {
  gln: "",
  aktiveAnzahl: "",
  branche: "",
  produkte: "",
  taetigkeit: "",
  gewerbe: [],
};

/** Name / city / FN only — the rest of Wirtschaftsdaten is still empty. */
export function companyShellFirmenbuch(name: string, city = "", fn = ""): CompanyFirmenbuchForm {
  return {
    ...EMPTY_COMPANY_FIRMENBUCH,
    firmenwortlaut: name,
    ort: city.replace(/^[A-Z]{1,3}-\d{4,5}\s+/, "").trim(),
    firmenbuchnummer: fn,
  };
}

export const INITIAL_COMPANY_FILES: FileEntry[] = [
  { label: "Bilanz", name: "bilanz_2026.pdf", type: "pdf" },
];

export const INITIAL_WICO_ID = "203212";

export type WicoRecord = {
  id: string;
  name: string;
  firmenbuch: CompanyFirmenbuchForm;
  organe: CompanyOrganeForm;
  gisa: CompanyGisaForm;
};

const WINTER_WICO_ID = "98984";

const WICO_WINTER: WicoRecord = {
  id: WINTER_WICO_ID,
  name: "Winter Insurance Group",
  firmenbuch: {
    firmenwortlaut: "Winter Insurance Group",
    strasse: "Getreidegasse",
    nummer: "12",
    zusatz: "-",
    plz: "5020",
    ort: "Salzburg",
    land: "Österreich",
    rechtsform: "GmbH",
    sitzIn: "politischer Gemeinde Salzburg",
    gericht: "Landesgericht Salzburg",
    firmenbuchnummer: "98984",
    euid: "ATBRA.98984-0000",
    uid: "ATU61299884",
    bilanzTag: "30",
    bilanzMonat: "06",
    mitarbeiter: { jahr: "2026", anzahl: "18" },
    mitarbeiterHistory: [{ jahr: "2025", anzahl: "15" }],
    erstTag: "14",
    erstMonat: "05",
    erstJahr: "2008",
  },
  organe: {
    owners: [{ name: "Winter Holding GmbH", bezeichnung: "Gesellschafter", anteile: "100%" }],
    controlOrgans: [
      {
        person: "Bernhard Meyer",
        funktion: "Aufsichtsratsvorsitzender",
        beschreibung: "ARVors",
        notiz: "Vorsitzender des Aufsichtsrats",
        tag: "01",
        monat: "03",
        jahr: "2019",
      },
    ],
    legalReps: [
      {
        person: "Anna Berger",
        funktion: "Geschäftsführer",
        beschreibung: "Gesamtverantwortung",
        vertretungsArt: "einzeln",
        vertretungsbefugnis: "vertritt seit 01.03.2019 selbstständig",
        tag: "01",
        monat: "03",
        jahr: "2019",
      },
    ],
    holdings: [{ name: "Alpine Cover AG", art: "Als Gesellschafter", anteile: "25%" }],
    beneficialOwners: ["Anna Berger", "Bernhard Meyer"],
  },
  gisa: {
    gln: "908745612",
    aktiveAnzahl: "1",
    branche: "Tätigkeiten der Versicherungsvermittlung (66.22-0)",
    produkte: "Versicherungsmakler",
    taetigkeit: "Versicherungsmakler",
    gewerbe: [
      {
        geschaeftsfuehrer: "Anna Berger",
        strasse: "Getreidegasse",
        nummer: "12",
        zusatz: "-",
        plz: "5020",
        ort: "Salzburg",
        land: "Österreich",
        wortlaut: WORTLAUT,
        gisa: "30881220",
        tag: "14",
        monat: "05",
        jahr: "2008",
        aktiv: true,
        ruhendTag: "",
        ruhendMonat: "",
        ruhendJahr: "",
      },
    ],
  },
};

function copy<T>(value: T): T {
  return structuredClone(value);
}

function fabricateWico(id: string): WicoRecord {
  const digits = id.replace(/\D/g, "") || "10000000";
  return {
    id,
    name: `Betrieb ${id}`,
    firmenbuch: {
      firmenwortlaut: `Betrieb ${id}`,
      strasse: "Hauptstrasse",
      nummer: "1",
      zusatz: "-",
      plz: "1010",
      ort: "Wien",
      land: "Österreich",
      rechtsform: "GmbH",
      sitzIn: "politischer Gemeinde Wien",
      gericht: "Handelsgericht Wien",
      firmenbuchnummer: id,
      euid: `ATBRA.${id}`,
      uid: `ATU${digits.padEnd(8, "0").slice(0, 8)}`,
      bilanzTag: "31",
      bilanzMonat: "12",
      mitarbeiter: { jahr: "2026", anzahl: "8" },
      mitarbeiterHistory: [{ jahr: "2025", anzahl: "6" }],
      erstTag: "01",
      erstMonat: "01",
      erstJahr: "2018",
    },
    organe: {
      owners: [{ name: `Holding ${id}`, bezeichnung: "Gesellschafter", anteile: "100%" }],
      controlOrgans: [],
      legalReps: [
        {
          ...EMPTY_LEGAL_REP,
          person: "Anna Berger",
          funktion: "Geschäftsführer",
          beschreibung: "Gesamtverantwortung",
          vertretungsArt: "einzeln",
          vertretungsbefugnis: "vertritt selbstständig",
          tag: "01",
          monat: "01",
          jahr: "2018",
        },
      ],
      holdings: [],
      beneficialOwners: ["Anna Berger"],
    },
    gisa: {
      gln: digits.padEnd(9, "0").slice(0, 9),
      aktiveAnzahl: "1",
      branche: "Tätigkeiten der Versicherungsvermittlung (66.22-0)",
      produkte: "Versicherungsmakler",
      taetigkeit: "Versicherungsmakler",
      gewerbe: [
        {
          ...EMPTY_COMPANY_GEWERBE,
          geschaeftsfuehrer: "Anna Berger",
          strasse: "Hauptstrasse",
          nummer: "1",
          zusatz: "-",
          plz: "1010",
          ort: "Wien",
          wortlaut: WORTLAUT,
          gisa: digits.slice(0, 8) || "10000001",
          tag: "01",
          monat: "01",
          jahr: "2018",
          aktiv: true,
        },
      ],
    },
  };
}

export function lookupWico(id: string): WicoRecord {
  const key = id.trim();
  if (key === INITIAL_WICO_ID) {
    return copy({
      id: INITIAL_WICO_ID,
      name: INITIAL_COMPANY_FIRMENBUCH.firmenwortlaut,
      firmenbuch: INITIAL_COMPANY_FIRMENBUCH,
      organe: INITIAL_COMPANY_ORGANE,
      gisa: INITIAL_COMPANY_GISA,
    });
  }
  if (key === WINTER_WICO_ID) return copy(WICO_WINTER);
  return copy(fabricateWico(key || "neu"));
}

export function wicoHint(current: string, original: string | undefined): string | undefined {
  if (original === undefined) return undefined;
  if (current.trim() === original.trim()) return undefined;
  return original.trim() || "-";
}

export function wicoJoinDate(tag: string, monat: string, jahr: string) {
  return [tag, monat, jahr].filter((part) => part.trim()).join(".") || "-";
}

export function wicoDateHint(
  tag: string,
  monat: string,
  jahr: string,
  original: { tag: string; monat: string; jahr: string } | undefined,
): string | undefined {
  if (!original) return undefined;
  return wicoHint(wicoJoinDate(tag, monat, jahr), wicoJoinDate(original.tag, original.monat, original.jahr));
}

export function wicoStaffHint(entry: StaffYear, original: StaffYear | undefined): string | undefined {
  if (!original) return undefined;
  return wicoHint(`${entry.jahr}: ${entry.anzahl}`, `${original.jahr}: ${original.anzahl}`);
}

function dash(value: string) {
  return value.trim() || "-";
}

function joinDate(tag: string, monat: string, jahr: string) {
  return [tag, monat, jahr].filter(Boolean).join(".") || "-";
}

export function companyFn(name: string) {
  if (name === "Winter Habocha GesmbH") return "FN 351251";
  if (name === "Winter Insurance Group") return "FN 98984";
  if (name === "Lunixo Holding") return "FN 63241";
  return "FN 232312";
}

export function personBorn(name: string) {
  if (name === "Dave Vice" || name === "Philip Weenter") return "06.11.1972";
  if (name === "Michael Jordan") return "17.03.1963";
  if (name === "Bernhard Meyer") return "22.04.1968";
  return "";
}

function addressLine(strasse: string, nummer: string, plz: string, ort: string) {
  const street = [strasse, nummer].filter((part) => part && part !== "-").join(" ");
  const city = [plz && `A-${plz}`, ort].filter(Boolean).join(" ");
  return [city, street].filter(Boolean).join(", ");
}

function entity(name: string, company: boolean): Row["value"] {
  return {
    kind: "entity",
    tag: "Interessent",
    name: name || "-",
    sub: company ? companyFn(name) : personBorn(name) || "-",
  };
}

function firmenbuchBlocks(form: CompanyFirmenbuchForm): Block[] {
  const staff = [form.mitarbeiter, ...form.mitarbeiterHistory]
    .filter((entry) => entry.jahr || entry.anzahl)
    .map((entry) => `${entry.jahr}: ${entry.anzahl}`)
    .join("\n");
  return [
    {
      kind: "rows",
      caption: "Stammdaten",
      rows: [
        { label: "Firmenwortlaut", value: dash(form.firmenwortlaut) },
        { label: "Adresse", value: addressLine(form.strasse, form.nummer, form.plz, form.ort) || "-" },
        { label: "Rechtsform", value: dash(form.rechtsform) },
        { label: "Sitz in", value: dash(form.sitzIn) },
        { label: "Gericht", value: dash(form.gericht) },
        { label: "Firmenbuchnummer", value: dash(form.firmenbuchnummer) },
        { label: "EUID", value: dash(form.euid) },
        { label: "UID", value: dash(form.uid) },
        { label: "Bilanzstichtag", value: joinDate(form.bilanzTag, form.bilanzMonat, "") },
        { label: "Mitarbeiter", value: staff || "-" },
        { label: "Ersteintragung", value: joinDate(form.erstTag, form.erstMonat, form.erstJahr) },
      ],
    },
  ];
}

function organeBlocks(form: CompanyOrganeForm): Block[] {
  const ownerGroups: Block[] = form.owners.map((owner, index) => ({
    kind: "group" as const,
    caption: index === 0 ? `Eigentümer des Partners (${form.owners.length})` : "",
    rows: [
      { label: "Eigentümer", value: entity(owner.name, true) },
      { label: "Bezeichnung", value: dash(owner.bezeichnung) },
      { label: "Anteile", value: dash(owner.anteile) },
    ],
  }));
  const controlGroups: Block[] = form.controlOrgans.map((organ, index) => ({
    kind: "group" as const,
    caption: index === 0 ? `Kontrollorgane des Partners (${form.controlOrgans.length})` : "",
    rows: [
      { label: "Kontrollorgan", value: entity(organ.person, false) },
      { label: "Funktion", value: dash(organ.funktion) },
      { label: "Funktionsbeschreibung", value: dash(organ.beschreibung) },
      { label: "Notiz zum Kontrollorgan", value: dash(organ.notiz) },
      { label: "Eingetragen am", value: joinDate(organ.tag, organ.monat, organ.jahr) },
    ],
  }));
  const legalGroups: Block[] = form.legalReps.map((organ, index) => ({
    kind: "group" as const,
    caption: index === 0 ? `Gesetzliche Vertreter des Partners (${form.legalReps.length})` : "",
    rows: [
      { label: "Gesetzlicher Vertreter", value: entity(organ.person, false) },
      { label: "Funktion", value: dash(organ.funktion) },
      { label: "Funktionsbeschreibung", value: dash(organ.beschreibung) },
      { label: "Vertretungsbefugnis", value: dash(organ.vertretungsbefugnis) },
    ],
  }));
  const holdingGroups: Block[] = form.holdings.map((holding, index) => ({
    kind: "group" as const,
    caption: index === 0 ? `Partner ist beteiligt an (${form.holdings.length})` : "",
    rows: [
      { label: "Gesellschafter", value: entity(holding.name, true) },
      { label: "Beteiligungsart", value: dash(holding.art) },
      { label: "Anteile", value: dash(holding.anteile) },
    ],
  }));
  const beneficial: Block[] = form.beneficialOwners.map((name, index) => ({
    kind: "group" as const,
    caption: index === 0 ? `Wirtschaftlicher Eigentümer (${form.beneficialOwners.length})` : "",
    rows: [{ label: "Wirtschaftlicher Eigentümer", value: entity(name, false) }],
  }));
  return [...ownerGroups, ...controlGroups, ...legalGroups, ...holdingGroups, ...beneficial];
}

function gisaBlocks(form: CompanyGisaForm): Block[] {
  const head: Block = {
    kind: "rows",
    rows: [
      { label: "Global Location Number (GLN)", value: dash(form.gln) },
      { label: "Aktive Gewerbeberechtigungen", value: dash(form.aktiveAnzahl) },
      { label: "Branche (Firmenbuch)", value: dash(form.branche) },
      { label: "Produkte (Firmenbuch)", value: dash(form.produkte) },
      { label: "Tätigkeit (Firmenbuch)", value: dash(form.taetigkeit) },
    ],
  };
  const gewerbe: Block[] = form.gewerbe.map((entry, index) => {
    const rows: Row[] = [
      { label: "Gewerberechtlicher Geschäftsführer", value: entity(entry.geschaeftsfuehrer, false) },
      {
        label: "Standort",
        value: addressLine(entry.strasse, entry.nummer, entry.plz, entry.ort) || "-",
      },
      { label: "Berechtigungswortlaut", value: dash(entry.wortlaut) },
      { label: "GISA-Zahl", value: entry.gisa ? { kind: "link", text: entry.gisa } : "-" },
      { label: "Eingetragen am", value: joinDate(entry.tag, entry.monat, entry.jahr) },
      { label: "Gewerbestatus", value: entry.aktiv ? "Aktiv" : "Ruhend" },
    ];
    if (!entry.aktiv) {
      rows.push({
        label: "Gewerbe ruhend ab",
        value: joinDate(entry.ruhendTag, entry.ruhendMonat, entry.ruhendJahr),
      });
    }
    return {
      kind: "group" as const,
      caption: index === 0 ? `Gewerbe (${form.gewerbe.length})` : "",
      rows,
    };
  });
  return [head, ...gewerbe];
}

function anhaengeBlocks(files: FileEntry[]): Block[] {
  return [
    {
      kind: "rows",
      rows: files.map((file) => ({
        label: file.label,
        value: { kind: "file" as const, text: file.name, type: file.type },
      })),
    },
  ];
}

export function applyCompanyFirmenbuch(card: Card, form: CompanyFirmenbuchForm, draft = false): Card {
  return { ...card, draft, blocks: firmenbuchBlocks(form) };
}

export function applyCompanyOrgane(card: Card, form: CompanyOrganeForm, draft = false): Card {
  return { ...card, draft, blocks: organeBlocks(form) };
}

export function applyCompanyGisa(card: Card, form: CompanyGisaForm, draft = false): Card {
  return { ...card, draft, blocks: gisaBlocks(form) };
}

export function applyCompanyFiles(card: Card, files: FileEntry[], draft = false): Card {
  return { ...card, draft, blocks: anhaengeBlocks(files) };
}

export function companyWirtschaftCards(forms?: {
  firmenbuch?: CompanyFirmenbuchForm;
  organe?: CompanyOrganeForm;
  gisa?: CompanyGisaForm;
  files?: FileEntry[];
}): Card[] {
  return [
    applyCompanyFirmenbuch(
      {
        id: "wirtschaft-firmenbuch",
        icon: a.firmenbuch,
        title: "Stammdaten laut Firmenbuch",
        clampTo: 551,
      },
      forms?.firmenbuch ?? INITIAL_COMPANY_FIRMENBUCH,
    ),
    applyCompanyOrgane(
      {
        id: "wirtschaft-organe",
        icon: a.cube,
        title: "Organe & Beteiligungen",
        clampTo: 551,
      },
      forms?.organe ?? INITIAL_COMPANY_ORGANE,
    ),
    applyCompanyGisa(
      {
        id: "wirtschaft-gisa",
        icon: a.gisa,
        title: "Stammdaten laut GISA",
        clampTo: 551,
      },
      forms?.gisa ?? INITIAL_COMPANY_GISA,
    ),
    applyCompanyFiles(
      {
        id: "wirtschaft-anhaenge",
        icon: a.paperclip,
        title: "Anhänge",
      },
      forms?.files ?? INITIAL_COMPANY_FILES,
    ),
  ];
}
