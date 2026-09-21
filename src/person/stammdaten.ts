import * as a from "../assets/index";

/**
 * The Stammdaten page is a long stack of sections, and every section holds one or
 * two cards of the same shape: a title, then blocks of label/value rows. Only the
 * data differs, so the cards are described here and rendered by PersonPage.
 */

/**
 * A value is either plain text or one of the richer cells the design uses.
 * Line breaks in plain text are kept, which is how the multi-line values render.
 */
export type Value =
  | string
  | { kind: "link"; text: string; icon?: string }
  | { kind: "flag"; text: string }
  | { kind: "file"; text: string; type?: "pdf" | "jpg" }
  | { kind: "entity"; tag: string; name: string; sub: string };

/** `icon` sits in front of the label, `action` adds the note button on the right. */
export type Row = { label: string; value: Value; icon?: string; action?: boolean };

export type Block =
  | { kind: "rows"; caption?: string; rows: Row[] }
  | { kind: "group"; caption: string; rows: Row[] }
  | { kind: "note"; caption: string; text: string }
  | { kind: "files"; caption: string; rows: Row[] }
  | { kind: "person"; tag?: string; name: string; sub: string }
  | { kind: "badge"; icon: string; caption?: string; text: string; open?: boolean; above?: boolean }
  | { kind: "usage"; icon: string; caption: string; text: string; rows: Row[] };

/** A section with nothing in it yet offers a way to link the data up. */
export type Empty = { icon: string; title: string; lead?: string; link: string };

export type Card = {
  id: string;
  icon?: string;
  title?: string;
  blocks?: Block[];
  /** Cards that overflow are cut off with a fade and a link to the full record. */
  clampTo?: number;
  empty?: Empty;
  /** A card added or edited in the workflow that has not been saved to Wino yet. */
  draft?: boolean;
  /** Last published version of this card, used to show before/after on drafts. */
  previous?: Card;
};

/** Drops draft metadata so two cards can be compared by their visible data. */
export function cardPayload(card: Card): Card {
  const { draft: _draft, previous: _previous, ...rest } = card;
  return rest;
}

/** Last published Wino stand, restoring `previous` on draft cards. */
export function publishedSnapshot(sections: Section[]): Section[] {
  return sections.map((section) => ({
    ...section,
    cards: section.cards
      .filter((card) => Boolean(card.previous) || !card.draft)
      .map((card) => cardPayload(card.previous ?? card)),
  }));
}

/** Visible card data only, so draft flags do not count as a change. */
export function sectionData(sections: Section[]) {
  return sections.map((section) => ({
    id: section.id,
    cards: section.cards.map((card) => cardPayload(card)),
  }));
}

export type Section = {
  id: string;
  icon: string;
  title: string;
  cards: Card[];
};

export type StammdatenAreaId =
  | "personendaten"
  | "wirtschaftsdaten"
  | "kontakte"
  | "adressen"
  | "bankverbindungen"
  | "systemdaten"
  | "verknuepfung"
  | "externe";

export const STAMMDATEN_AREAS: { id: StammdatenAreaId; label: string; icon: string }[] = [
  { id: "personendaten", label: "Allgemeine\nPartnerdaten", icon: a.navPerson },
  { id: "wirtschaftsdaten", label: "Wirtschaftsdaten", icon: a.cube },
  { id: "kontakte", label: "Kontakte", icon: a.contacts },
  { id: "adressen", label: "Adressen", icon: a.house },
  { id: "bankverbindungen", label: "Bankverbindung", icon: a.bank },
  { id: "systemdaten", label: "Systemdaten", icon: a.systemRing },
  { id: "verknuepfung", label: "Verknüpfung", icon: a.abteilung },
  { id: "externe", label: "Externe\nQuellen", icon: a.gisa },
];

export const BLANK_AREAS: StammdatenAreaId[] = ["systemdaten", "verknuepfung", "externe"];

export const MULTI_CARD_AREAS: StammdatenAreaId[] = [
  "wirtschaftsdaten",
  "kontakte",
  "adressen",
  "bankverbindungen",
];

export function areaForSection(sectionId: string): StammdatenAreaId {
  if (sectionId === "firmenbuch" || sectionId === "gisa") return "externe";
  if (STAMMDATEN_AREAS.some((area) => area.id === sectionId)) return sectionId as StammdatenAreaId;
  return "personendaten";
}

export function areaTitle(area: StammdatenAreaId) {
  return STAMMDATEN_AREAS.find((entry) => entry.id === area)?.label.replace("\n", " ") ?? area;
}

export function sectionIdForArea(area: StammdatenAreaId) {
  return area === "externe" ? "firmenbuch" : area;
}

export type FileEntry = { label: string; name: string; type?: "pdf" | "jpg" };

export type PartnerForm = {
  titelVor: string;
  vorname: string;
  nachname: string;
  titelNach: string;
  rufname: string;
  geschlecht: string;
  geburtTag: string;
  geburtMonat: string;
  geburtJahr: string;
  nationalitaet: string;
  notiz: string;
  files: FileEntry[];
};

export type ContactChannel = { value: string; note: string; extra?: string };

export type ContactKind = "person" | "kanal";

export type ContactForm = {
  kind: ContactKind;
  partner: string;
  bezeichnung: string;
  notiz: string;
  phones: ContactChannel[];
  mails: ContactChannel[];
  websites: ContactChannel[];
};

/** System partners that a Person-contact must pick from. */
export const CONTACT_PARTNERS = [
  "Julia Atkinson",
  "Udo Ladraida",
  "Thomas Atkinson",
  "Dave Vice",
  "Maria Gruber",
  "Anna Berger",
  "Lukas Hofer",
  "Sophie Leitner",
  "Maximilian Steiner",
  "Eva Pichler",
];

export type AddressForm = {
  typ: string;
  strasse: string;
  nummer: string;
  zusatz: string;
  plz: string;
  ort: string;
  land: string;
  notiz: string;
};

export type BankForm = {
  person: string;
  iban: string;
  bic: string;
  institut: string;
  notiz: string;
  files: FileEntry[];
};

export type WirtschaftForm = {
  eigentuemerUnternehmen: string;
  eigentuemerArt: string;
  anteile: string;
  eingetragenTag: string;
  eingetragenMonat: string;
  eingetragenJahr: string;
  vertreterUnternehmen: string;
  funktion: string;
  funktionsbeschreibung: string;
  vertretungsArt: string;
  vertretungsbefugnis: string;
};

export type GewerbeEntry = {
  unternehmen: string;
  funktion: string;
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
};

export type VereinEntry = {
  verein: string;
  funktion: string;
  tag: string;
  monat: string;
  jahr: string;
};

const WORTLAUT =
  "Versicherungsvermittlung in der Form Versicherungsmakler und Berater in Versicherungsangelegenheiten";

export const EMPTY_GEWERBE: GewerbeEntry = {
  unternehmen: "",
  funktion: "Gewerberechtlicher Geschäftsführer",
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
};

export const INITIAL_GEWERBE: GewerbeEntry[] = [
  {
    unternehmen: "Lunixo AG",
    funktion: "Gewerberechtlicher Geschäftsführer",
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
  },
  {
    unternehmen: "Lunixo AG",
    funktion: "Gewerberechtlicher Geschäftsführer",
    strasse: "Mondseestrasse",
    nummer: "32",
    zusatz: "-",
    plz: "5310",
    ort: "Mondsee",
    land: "Österreich",
    wortlaut: WORTLAUT,
    gisa: "5125125",
    tag: "03",
    monat: "02",
    jahr: "2014",
  },
  {
    unternehmen: "Lunixo AG",
    funktion: "Gewerberechtlicher Geschäftsführer",
    strasse: "Salzburgerstrasse",
    nummer: "304",
    zusatz: "-",
    plz: "8970",
    ort: "Schladming",
    land: "Österreich",
    wortlaut: WORTLAUT,
    gisa: "6546456",
    tag: "03",
    monat: "02",
    jahr: "2022",
  },
  {
    unternehmen: "Winter Habocha KG",
    funktion: "Gewerberechtlicher Geschäftsführer",
    strasse: "Hauptstrasse",
    nummer: "44",
    zusatz: "-",
    plz: "8940",
    ort: "Unterschwenningen",
    land: "Österreich",
    wortlaut: WORTLAUT,
    gisa: "98984554",
    tag: "03",
    monat: "02",
    jahr: "1993",
  },
];

export const EMPTY_VEREIN: VereinEntry = {
  verein: "",
  funktion: "",
  tag: "",
  monat: "",
  jahr: "",
};

export const INITIAL_VEREIN: VereinEntry[] = [
  {
    verein: "Alpenverein Schladming",
    funktion: "Vorsitzender",
    tag: "03",
    monat: "02",
    jahr: "1993",
  },
];

export const INITIAL_WIRTSCHAFT_FILES: FileEntry[] = [
  { label: "GISA Auszug", name: "GISA-Auszug_2026.pdf", type: "pdf" },
];

const PARTNERDATEN: Card = {
  id: "partner-julia",
  icon: a.navPerson,
  title: "Allgemeine Partnerdaten",
  blocks: [
    {
      kind: "rows",
      rows: [
        { label: "Titel vor", value: "-" },
        { label: "Vorname", value: "Julia" },
        { label: "Nachname", value: "Atkinson" },
        { label: "Titel nach", value: "-" },
        { label: "Rufname", value: "-" },
        { label: "Geschlecht", value: "Weiblich" },
        { label: "Geburtsdatum", value: "12.08.1993" },
        { label: "Nationalität", value: { kind: "flag", text: "Österreich" } },
      ],
    },
    {
      kind: "note",
      caption: "Allgemeine Notiz zum Partner",
      text: "Geschäftsführerin von Atkinson Consulting OG",
    },
    {
      kind: "files",
      caption: "Anhänge",
      rows: [
        { label: "Heiratsurkunde", value: { kind: "file", text: "Heiratsurkunde.pdf" } },
        { label: "Reisepass", value: { kind: "file", text: "Reisepass.pdf" } },
      ],
    },
  ],
};

const FIRMENBUCH: Card = {
  id: "wirtschaft-firmenbuch",
  icon: a.firmenbuch,
  title: "Firmenbuch",
  clampTo: 551,
  blocks: [
    {
      kind: "group",
      caption: "Eigentümer bei",
      rows: [
        {
          label: "Unternehmen",
          value: { kind: "entity", tag: "Interessent", name: "Lunixo AG", sub: "FN 232312" },
        },
        { label: "Eigentümerart", value: "Gesellschafter" },
        { label: "Anteile", value: "70%" },
        { label: "Eingetragen am", value: "03.02.1993" },
      ],
    },
    {
      kind: "group",
      caption: "Gesetzlicher Vertreter bei",
      rows: [
        {
          label: "Unternehmen",
          value: { kind: "entity", tag: "Interessent", name: "Lunixo Holding", sub: "FN 63241" },
        },
        { label: "Funktion", value: "Geschäftsführer" },
        {
          label: "Funktionsbeschreibung",
          value: "Risk Management, Betriebsorganisation, Datenschutz, Informationstechnologie",
        },
      ],
    },
  ],
};

const GEWERBEINHABER: Card = {
  id: "wirtschaft-gewerbe",
  icon: a.gisa,
  title: "Gewerbeinhaber",
  clampTo: 551,
  blocks: gewerbeBlocks(INITIAL_GEWERBE),
};

const VEREINSFUNKTION: Card = {
  id: "wirtschaft-verein",
  icon: a.abteilung,
  title: "Vereinsfunktion",
  blocks: vereinBlocks(INITIAL_VEREIN),
};

const WIRTSCHAFT_ANHAENGE: Card = {
  id: "wirtschaft-anhaenge",
  icon: a.paperclip,
  title: "Anhänge",
  blocks: anhaengeBlocks(INITIAL_WIRTSCHAFT_FILES),
};

const KONTAKT_JULIA: Card = {
  id: "kontakt-julia",
  title: "Kontaktdaten von Julia",
  blocks: [
    { kind: "person", tag: "Interessent", name: "Julia Aktinson", sub: "12.09.1988" },
    {
      kind: "note",
      caption: "Allgemeine Kontaktnotiz",
      text: "Julia ist am besten auf ihrer mobilen Privatnummer zu erreichen.",
    },
    {
      kind: "rows",
      rows: [
        { label: "Telefon", value: "+43 3810 393 112 3", icon: a.phone, action: true },
        { label: "Mail", value: "julia.atkinson@mail.at", icon: a.mail, action: true },
        { label: "Mail", value: "ja@kabsi.at", icon: a.mail, action: true },
        {
          label: "Webseite",
          value: { kind: "link", text: "www.lunixo.com" },
          icon: a.globe,
        },
      ],
    },
  ],
};

const KONTAKT_EHEMANN: Card = {
  id: "kontakt-ehemann",
  title: "Ehemann",
  blocks: [
    { kind: "person", name: "Udo Ladraida", sub: "12.09.1988" },
    {
      kind: "note",
      caption: "Allgemeine Kontaktnotiz",
      text: "Darf kontaktiert werden wenn Julia nicht erreichbar ist.",
    },
    {
      kind: "rows",
      rows: [
        { label: "Telefon", value: "+43 3810 393 112 3", icon: a.phone },
        { label: "Mail", value: "udo ladreiter@mail.at", icon: a.mail },
      ],
    },
  ],
};

const HAUPTWOHNSITZ: Card = {
  id: "adresse-haupt",
  icon: a.flag,
  title: "Hauptwohnsitz",
  blocks: [
    {
      kind: "rows",
      rows: [
        {
          label: "Adresse",
          value: { kind: "link", text: "Mondseestrasse 32\nA-5310 Mondseet" },
        },
      ],
    },
    {
      kind: "note",
      caption: "Notiz zur Adresse",
      text:
        "Die Hauptadresse wird sich mit Ende 2027 ändern. Julia wird umziehen. Sie gibt uns bald bescheid.",
    },
    {
      kind: "badge",
      icon: a.house,
      caption: "Postadresse",
      text: "Diese Adresse ist die Postadresse",
    },
    {
      kind: "badge",
      icon: a.riskTarget,
      caption: "Risikoadresse",
      text: "Diese Adresse ist eine Risikoadresse",
      open: true,
    },
  ],
};

const BANK_NEON: Card = {
  id: "bank-neon",
  title: "Neon Bank - Julia Atkinson",
  blocks: [
    {
      kind: "rows",
      rows: [
        { label: "Kontoinhaber", value: "Julia Atkinson" },
        { label: "Kreditinstitut", value: "Neon Bank" },
        { label: "IBAN", value: "AT 2303 2000 1231 2232 22" },
      ],
    },
    {
      kind: "files",
      caption: "Anhänge",
      rows: [{ label: "Bankomatkarte", value: { kind: "file", text: "Foto_bankomat.jpg", type: "jpg" } }],
    },
    { kind: "note", caption: "Notiz zur Bankverbindung", text: "-" },
    {
      kind: "usage",
      icon: a.bank,
      caption: "Bankonto Verwendung",
      text: "Diese Bankkonto wird wie folgt verwendet:",
      rows: [
        {
          label: "Maklervereinbarung",
          value: { kind: "link", text: "Privatkunden", icon: a.personSmall },
        },
        {
          label: "Haftpflicht",
          value: { kind: "link", text: "K4.1123.123-4", icon: a.allianz },
        },
        {
          label: "Rechtschutz",
          value: { kind: "link", text: "X9.8745.678-2", icon: a.donau },
        },
      ],
    },
  ],
};

const BANK_SPARKASSE: Card = {
  id: "bank-sparkasse",
  title: "Sparkasse Mondsee - Thomas Atkinson",
  blocks: [
    {
      kind: "rows",
      rows: [
        { label: "Kontoinhaber", value: "Thomas Atkinson" },
        { label: "Kreditinstitut", value: "Sparkasse Mondsee" },
        { label: "IBAN", value: "AT 2332 2222 1331 1112 22" },
      ],
    },
    {
      kind: "files",
      caption: "Anhänge",
      rows: [{ label: "Bankomatkarte", value: { kind: "file", text: "Foto_IBAN.jpg", type: "jpg" } }],
    },
    {
      kind: "note",
      caption: "Notiz zur Bankverbindung",
      text: "Thomas zahlt für die Haftpflicht. SEPA beigelegt.",
    },
    { kind: "badge", icon: a.bank, caption: "Verwendung", text: "Konto nicht in Verwendung", above: true },
  ],
};

const SYSTEMDATEN: Card = {
  id: "system-daten",
  title: "Systemdaten",
  blocks: [
    {
      kind: "rows",
      caption: "Allgemein",
      rows: [
        { label: "Personentyp", value: "Privatperson" },
        { label: "Partnertyp", value: "Interessent" },
      ],
    },
    {
      kind: "rows",
      caption: "Interne Zuordnung",
      rows: [
        { label: "Mandat", value: "Makler Winter" },
        { label: "Vermittler", value: "Winter" },
        { label: "Kundenberater", value: "Lucy Dullon" },
        { label: "Fachabteilung KFZ", value: "kfz@makler-winter.at" },
        { label: "Fachabteilung SACH", value: "Herbert Miller" },
        { label: "Fachabteilung HAFT", value: "Marianne Mittag" },
        { label: "Fachabteilung PERS", value: "person@makler-winter.at" },
        { label: "Fachabteilung Schaden", value: "schaden@makler-winter.at" },
      ],
    },
    {
      kind: "rows",
      caption: "Vertraulichkeit",
      rows: [
        { label: "Rollen die Zugriff haben", value: "Alle" },
        {
          label: "Personen die Zugriff haben",
          value: "Michael Sunderland\nOmar Suttner\nLucy Dullon\nCaroline Jackson",
        },
      ],
    },
  ],
};

export const SECTIONS: Section[] = [
  {
    id: "personendaten",
    icon: a.navPerson,
    title: "Allgemeine Personendaten",
    cards: [PARTNERDATEN],
  },
  {
    id: "wirtschaftsdaten",
    icon: a.cube,
    title: "Wirtschaftsdaten",
    cards: [FIRMENBUCH, GEWERBEINHABER, VEREINSFUNKTION, WIRTSCHAFT_ANHAENGE],
  },
  {
    id: "kontakte",
    icon: a.contacts,
    title: "Kontakte (2)",
    cards: [KONTAKT_JULIA, KONTAKT_EHEMANN],
  },
  {
    id: "adressen",
    icon: a.house,
    title: "Adressen (1)",
    cards: [HAUPTWOHNSITZ],
  },
  {
    id: "bankverbindungen",
    icon: a.bank,
    title: "Bankverbindungen (2)",
    cards: [BANK_NEON, BANK_SPARKASSE],
  },
  {
    id: "systemdaten",
    icon: a.systemRing,
    title: "Systemdaten",
    cards: [SYSTEMDATEN],
  },
  {
    id: "verknuepfung",
    icon: a.abteilung,
    title: "Verknüpfung",
    cards: [
      {
        id: "verknuepfung-empty",
        empty: {
          icon: a.abteilung,
          title: "Noch keine Verknüpfung angelegt",
          lead: "Du kannst",
          link: "neue Verknüpfungen hier anlegen",
        },
      },
    ],
  },
  {
    id: "firmenbuch",
    icon: a.firmenbuch,
    title: "Firmenbuch",
    cards: [
      {
        id: "externe-firmenbuch",
        empty: {
          icon: a.firmenbuch,
          title: "Noch keine Firmenbuchdaten verknüpft",
          link: "Firmenbuchdaten verknüpfen",
        },
      },
    ],
  },
  {
    id: "gisa",
    icon: a.gisa,
    title: "GISA",
    cards: [
      {
        id: "externe-gisa",
        empty: {
          icon: a.gisa,
          title: "Noch keine Gisa-Daten verknüpft",
          link: "GISA-Daten verknüpfen",
        },
      },
    ],
  },
];

export function cloneSections(): Section[] {
  return structuredClone(SECTIONS);
}

export function countedTitle(section: Section) {
  const n = section.cards.filter((card) => !card.empty && !card.draft).length;
  if (section.id === "kontakte") return `Kontakte (${n})`;
  if (section.id === "adressen") return `Adressen (${n})`;
  if (section.id === "bankverbindungen") return `Bankverbindungen (${n})`;
  return section.title;
}

export function navLabel(item: { label: string; target?: string }, sections: Section[]) {
  if (item.target === "kontakte" || item.target === "adressen" || item.target === "bankverbindungen") {
    const section = sections.find((entry) => entry.id === item.target);
    return section ? countedTitle(section) : item.label;
  }
  return item.label;
}

function dash(value: string) {
  return value.trim() || "-";
}

function companySub(name: string) {
  if (name === "Winter Habocha KG") return "FN 98984";
  if (name === "Alpenverein Schladming") return "FN 232312";
  if (name === "Lunixo Holding") return "FN 63241";
  return "FN 232312";
}

function standortLine(entry: GewerbeEntry) {
  const street = [entry.strasse, entry.nummer].filter(Boolean).join(" ");
  const city = [entry.plz && `A-${entry.plz}`, entry.ort].filter(Boolean).join(" ");
  return [city, street].filter(Boolean).join(", ");
}

function gewerbeRows(entry: GewerbeEntry): Row[] {
  return [
    {
      label: "Unternehmen",
      value: {
        kind: "entity",
        tag: "Interessent",
        name: entry.unternehmen || "-",
        sub: companySub(entry.unternehmen),
      },
    },
    { label: "Funktion", value: dash(entry.funktion) },
    {
      label: "Standort",
      value: standortLine(entry) ? { kind: "link", text: standortLine(entry) } : "-",
    },
    { label: "Berechtigungswortlaut", value: dash(entry.wortlaut) },
    { label: "GISA-Zahl", value: entry.gisa ? { kind: "link", text: entry.gisa } : "-" },
    { label: "Eingetragen am", value: joinDate(entry.tag, entry.monat, entry.jahr) },
  ];
}

function gewerbeBlocks(entries: GewerbeEntry[]): Block[] {
  return entries.map((entry, index) => ({
    kind: "group" as const,
    caption: index === 0 ? `Aktive Gewerbe (${entries.length})` : "",
    rows: gewerbeRows(entry),
  }));
}

function vereinBlocks(entries: VereinEntry[]): Block[] {
  return entries.map((entry, index) => ({
    kind: "group" as const,
    caption: index === 0 ? `Aktive Vereinsfunktionen (${entries.length})` : "",
    rows: [
      {
        label: "Verein",
        value: {
          kind: "entity" as const,
          tag: "Interessent",
          name: entry.verein || "-",
          sub: companySub(entry.verein),
        },
      },
      { label: "Funktion", value: dash(entry.funktion) },
      { label: "Eingetragen am", value: joinDate(entry.tag, entry.monat, entry.jahr) },
    ],
  }));
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

export function valueText(value: Value) {
  if (typeof value === "string") return value === "-" ? "" : value;
  if (value.kind === "link" || value.kind === "flag" || value.kind === "file") return value.text;
  return value.name;
}

export function rowValue(card: Card, label: string) {
  const entry = card.blocks?.flatMap((block) => ("rows" in block ? block.rows : [])).find((row) => row.label === label);
  return entry ? valueText(entry.value) : "";
}

function noteText(card: Card) {
  const note = card.blocks?.find((block) => block.kind === "note");
  return note?.kind === "note" && note.text !== "-" ? note.text : "";
}

function fileEntries(card: Card): FileEntry[] {
  const files = card.blocks?.find((block) => block.kind === "files");
  if (files?.kind !== "files") return [];
  return files.rows.map((row) => ({
    label: row.label,
    name: valueText(row.value),
    type: typeof row.value === "object" && row.value.kind === "file" ? row.value.type : "pdf",
  }));
}

function splitDate(value: string) {
  const [tag = "", monat = "", jahr = ""] = value.split(".");
  return { tag, monat, jahr };
}

function joinDate(tag: string, monat: string, jahr: string) {
  return [tag, monat, jahr].filter(Boolean).join(".") || "-";
}

export const EMPTY_PARTNER: PartnerForm = {
  titelVor: "",
  vorname: "",
  nachname: "",
  titelNach: "",
  rufname: "",
  geschlecht: "",
  geburtTag: "",
  geburtMonat: "",
  geburtJahr: "",
  nationalitaet: "Österreich",
  notiz: "",
  files: [],
};

export const EMPTY_CONTACT: ContactForm = {
  kind: "person",
  partner: "",
  bezeichnung: "",
  notiz: "",
  phones: [{ value: "", note: "", extra: "Mobil" }],
  mails: [{ value: "", note: "" }],
  websites: [{ value: "", extra: "Webseite", note: "" }],
};

export const EMPTY_ADDRESS: AddressForm = {
  typ: "Hauptwohnsitz",
  strasse: "",
  nummer: "",
  zusatz: "",
  plz: "",
  ort: "",
  land: "Österreich",
  notiz: "",
};

export const EMPTY_BANK: BankForm = {
  person: "",
  iban: "",
  bic: "",
  institut: "",
  notiz: "",
  files: [],
};

export const INITIAL_WIRTSCHAFT: WirtschaftForm = {
  eigentuemerUnternehmen: "Lunixo AG",
  eigentuemerArt: "Gesellschafter",
  anteile: "70%",
  eingetragenTag: "03",
  eingetragenMonat: "02",
  eingetragenJahr: "1993",
  vertreterUnternehmen: "Lunixo Holding",
  funktion: "Geschäftsführer",
  funktionsbeschreibung: "Risk Management, Betriebsorganisation, Datenschutz, Informationstechnologie",
  vertretungsArt: "gemeinsam",
  vertretungsbefugnis: "vertritt seit 01.03.2025 gemeinsam mit einem/einer weiteren Geschäftsführer/in",
};

export function partnerForm(card: Card): PartnerForm {
  const born = splitDate(rowValue(card, "Geburtsdatum"));
  return {
    titelVor: rowValue(card, "Titel vor"),
    vorname: rowValue(card, "Vorname"),
    nachname: rowValue(card, "Nachname"),
    titelNach: rowValue(card, "Titel nach"),
    rufname: rowValue(card, "Rufname"),
    geschlecht: rowValue(card, "Geschlecht"),
    geburtTag: born.tag,
    geburtMonat: born.monat,
    geburtJahr: born.jahr,
    nationalitaet: rowValue(card, "Nationalität") || "Österreich",
    notiz: noteText(card),
    files: fileEntries(card),
  };
}

export function contactForm(card: Card): ContactForm {
  const person = card.blocks?.find((block) => block.kind === "person");
  const rows = card.blocks?.flatMap((block) => ("rows" in block ? block.rows : [])) ?? [];
  const kanal = person?.kind === "person" && person.tag === "Kanal";
  const named = person?.kind === "person" && person.name !== "Partner" && !kanal ? person.name : "";
  return {
    kind: kanal ? "kanal" : "person",
    partner: named,
    bezeichnung: card.title === "Nicht definiert" ? "" : card.title ?? "",
    notiz: noteText(card),
    phones: rows
      .filter((row) => row.label.trim() === "Telefon")
      .map((row) => ({ value: valueText(row.value), note: "" })),
    mails: rows
      .filter((row) => row.label.trim() === "Mail")
      .map((row) => {
        const value = valueText(row.value);
        return {
          value,
          note:
            value === "julia.atkinson@mail.at"
              ? "Julia wird eventuell ihre Mail bald ändern."
              : value === "ja@kabsi.at"
                ? "Bitte nur für Werbematerial benutzen"
                : "",
        };
      }),
    websites: rows
      .filter((row) => row.label === "Webseite")
      .map((row) => ({ value: valueText(row.value), extra: "Webseite", note: "" })),
  };
}

export function addressForm(card: Card): AddressForm {
  const raw = rowValue(card, "Adresse") || "";
  const [streetLine = "", cityLine = ""] = raw.split("\n");
  const streetParts = streetLine.trim().split(" ");
  const nummer = streetParts.find((part) => /\d/.test(part)) ?? "";
  const strasse = streetParts.filter((part) => part !== nummer).join(" ");
  const [plz = "", ...ortParts] = cityLine.replace(/^A-/, "").trim().split(" ");
  return {
    typ: card.title === "Nicht definiert" ? "Hauptwohnsitz" : card.title ?? "Hauptwohnsitz",
    strasse,
    nummer,
    zusatz: "",
    plz,
    ort: ortParts.join(" "),
    land: "Österreich",
    notiz: noteText(card),
  };
}

export function bankForm(card: Card): BankForm {
  return {
    person: rowValue(card, "Kontoinhaber"),
    iban: rowValue(card, "IBAN"),
    bic: rowValue(card, "BIC"),
    institut: rowValue(card, "Kreditinstitut"),
    notiz: noteText(card),
    files: fileEntries(card),
  };
}

export function applyPartner(card: Card, form: PartnerForm, draft = false): Card {
  return {
    ...card,
    draft,
    title: "Allgemeine Partnerdaten",
    icon: a.navPerson,
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Titel vor", value: dash(form.titelVor) },
          { label: "Vorname", value: dash(form.vorname) },
          { label: "Nachname", value: dash(form.nachname) },
          { label: "Titel nach", value: dash(form.titelNach) },
          { label: "Rufname", value: dash(form.rufname) },
          { label: "Geschlecht", value: dash(form.geschlecht) },
          { label: "Geburtsdatum", value: joinDate(form.geburtTag, form.geburtMonat, form.geburtJahr) },
          { label: "Nationalität", value: { kind: "flag", text: dash(form.nationalitaet) } },
        ],
      },
      { kind: "note", caption: "Allgemeine Notiz zum Partner", text: form.notiz || "-" },
      {
        kind: "files",
        caption: "Anhänge",
        rows: form.files.map((file) => ({
          label: file.label,
          value: { kind: "file", text: file.name, type: file.type },
        })),
      },
    ],
  };
}

export function applyContact(card: Card, form: ContactForm, draft = false): Card {
  const kanal = form.kind === "kanal";
  const defined = kanal ? Boolean(form.bezeichnung) : Boolean(form.partner || form.bezeichnung);
  const person = card.blocks?.find((block) => block.kind === "person");
  return {
    ...card,
    draft,
    title: defined ? form.bezeichnung || (kanal ? "Kanal" : "Kontaktperson") : "Nicht definiert",
    blocks: [
      {
        kind: "person",
        tag: kanal
          ? "Kanal"
          : person?.kind === "person" && person.tag !== "Kanal"
            ? person.tag
            : form.partner
              ? "Interessent"
              : undefined,
        name: kanal ? form.bezeichnung || "Kanal" : form.partner || "Partner",
        sub: kanal ? "-" : person?.kind === "person" ? person.sub : "-",
      },
      { kind: "note", caption: "Allgemeine Notiz zur Kontaktperson", text: form.notiz || "-" },
      {
        kind: "rows",
        rows: [
          ...form.phones.map((phone) => ({
            label: "Telefon",
            value: phone.value ? phone.value : "-",
            icon: a.phone,
            action: true,
          })),
          ...form.mails.map((mail) => ({
            label: "Mail",
            value: mail.value ? mail.value : "-",
            icon: a.mail,
            action: true,
          })),
          ...form.websites
            .filter((site) => site.value)
            .map((site) => ({
              label: site.extra || "Webseite",
              value: { kind: "link" as const, text: site.value.replace(/^https?:\/\//, "") },
              icon: a.globe,
            })),
        ],
      },
    ],
  };
}

export function applyAddress(card: Card, form: AddressForm, draft = false): Card {
  const line = [form.strasse, form.nummer].filter(Boolean).join(" ");
  const city = [form.plz && `A-${form.plz}`, form.ort].filter(Boolean).join(" ");
  const defined = Boolean(line || city);
  const extras = (card.blocks ?? []).filter((block) => block.kind === "badge");
  return {
    ...card,
    draft,
    icon: a.flag,
    title: defined ? form.typ || "Adresse" : "Nicht definiert",
    blocks: [
      {
        kind: "rows",
        rows: [
          {
            label: "Adresse",
            value: defined
              ? { kind: "link", text: [line, city].filter(Boolean).join("\n") }
              : "-",
          },
        ],
      },
      { kind: "note", caption: "Notiz zur Adresse", text: form.notiz || "-" },
      ...extras,
    ],
  };
}

export function applyBank(card: Card, form: BankForm, draft = false): Card {
  const defined = Boolean(form.person || form.iban || form.institut);
  const extras = (card.blocks ?? []).filter((block) => block.kind === "usage" || block.kind === "badge");
  return {
    ...card,
    draft,
    title: defined
      ? [form.institut, form.person].filter(Boolean).join(" - ") || "Bankverbindung"
      : "Nicht definiert",
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Kontoinhaber", value: dash(form.person) },
          { label: "Kreditinstitut", value: dash(form.institut) },
          { label: "IBAN", value: dash(form.iban) },
        ],
      },
      {
        kind: "files",
        caption: "Anhänge",
        rows: form.files.map((file) => ({
          label: file.label,
          value: { kind: "file", text: file.name, type: file.type },
        })),
      },
      { kind: "note", caption: "Notiz zur Bankverbindung", text: form.notiz || "-" },
      ...extras,
    ],
  };
}

export function applyWirtschaft(card: Card, form: WirtschaftForm, draft = false): Card {
  if (card.id !== "wirtschaft-firmenbuch") return card;
  return {
    ...card,
    draft,
    blocks: [
      {
        kind: "group",
        caption: "Eigentümer bei",
        rows: [
          {
            label: "Unternehmen",
            value: { kind: "entity", tag: "Interessent", name: form.eigentuemerUnternehmen || "-", sub: "FN 232312" },
          },
          { label: "Eigentümerart", value: dash(form.eigentuemerArt) },
          { label: "Anteile", value: dash(form.anteile) },
          {
            label: "Eingetragen am",
            value: joinDate(form.eingetragenTag, form.eingetragenMonat, form.eingetragenJahr),
          },
        ],
      },
      {
        kind: "group",
        caption: "Gesetzlicher Vertreter bei",
        rows: [
          {
            label: "Unternehmen",
            value: {
              kind: "entity",
              tag: "Interessent",
              name: form.vertreterUnternehmen || "-",
              sub: "FN 63241",
            },
          },
          { label: "Funktion", value: dash(form.funktion) },
          { label: "Funktionsbeschreibung", value: dash(form.funktionsbeschreibung) },
        ],
      },
    ],
  };
}

export function applyGewerbe(card: Card, entries: GewerbeEntry[], draft = false): Card {
  return { ...card, draft, blocks: gewerbeBlocks(entries) };
}

export function applyVerein(card: Card, entries: VereinEntry[], draft = false): Card {
  return { ...card, draft, blocks: vereinBlocks(entries) };
}

export function applyWirtschaftFiles(card: Card, files: FileEntry[], draft = false): Card {
  return { ...card, draft, blocks: anhaengeBlocks(files) };
}

export function emptyContactCard(id: string): Card {
  return applyContact({ id, title: "Nicht definiert" }, EMPTY_CONTACT, true);
}

export function emptyAddressCard(id: string): Card {
  return applyAddress({ id, title: "Nicht definiert", icon: a.flag }, EMPTY_ADDRESS, true);
}

export function emptyBankCard(id: string): Card {
  return applyBank({ id, title: "Nicht definiert" }, EMPTY_BANK, true);
}

export function emptyWirtschaftCard(id: string): Card {
  return {
    id,
    icon: a.firmenbuch,
    title: "Nicht definiert",
    draft: true,
    blocks: [
      {
        kind: "group",
        caption: "Eigentümer bei",
        rows: [
          { label: "Unternehmen", value: "-" },
          { label: "Eigentümerart", value: "-" },
          { label: "Anteile", value: "-" },
          { label: "Eingetragen am", value: "-" },
        ],
      },
    ],
  };
}

export function plusLabel(area: StammdatenAreaId) {
  if (area === "kontakte") return "+ Kontakt";
  if (area === "adressen") return "+ Adresse";
  if (area === "bankverbindungen") return "+ Bankverbindung";
  if (area === "wirtschaftsdaten") return "+ Eintrag";
  return "+ Eintrag";
}

/** The left sidebar. `soon` marks the areas that are not built yet. */
export const NAV_GROUPS = [
  {
    label: "Wino Daten",
    items: [
      { label: "Allg. Personendaten", icon: a.navPerson, target: "personendaten" },
      { label: "Wirtschaftsdaten", icon: a.cube, target: "wirtschaftsdaten" },
      { label: "Kontakte (2)", icon: a.contacts, target: "kontakte" },
      { label: "Adressen", icon: a.house, target: "adressen" },
      { label: "Bankverbindung (2)", icon: a.bank, target: "bankverbindungen" },
      { label: "Systemdaten", icon: a.systemRing, target: "systemdaten" },
      { label: "Verknüpfung", icon: a.abteilung, target: "verknuepfung" },
    ],
  },
  {
    label: "Externe Quellen",
    items: [
      { label: "Firmenbuch", icon: a.firmenbuch, target: "firmenbuch" },
      { label: "GISA", icon: a.gisa, target: "gisa" },
      { label: "Winmakler", icon: a.winmakler, soon: true },
    ],
  },
];

/** The Plausibilitäts-Check panel in the page header. */
export const PLAUSI = [
  { label: "Adressen", state: "Abgeschlossen", icon: a.house, done: true },
  { label: "Verknüpfung", state: "Offen", icon: a.abteilung, done: false },
  { label: "Bankdaten", state: "Abgeschlossen", icon: a.bank, done: true },
  { label: "Anhänge", state: "Offen", icon: a.paperclip, done: false },
];
