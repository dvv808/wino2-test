import * as a from "../assets/index";

/**
 * The Stammdaten page is a long stack of sections, and every section holds one or
 * two cards of the same shape: a title, then blocks of label/value rows. Only the
 * data differs, so the cards are described here and rendered by PersonPage.
 */

/** A value is either plain text or one of the richer cells the design uses. */
export type Value =
  | string
  | { kind: "link"; text: string }
  | { kind: "flag"; text: string }
  | { kind: "file"; text: string }
  | { kind: "entity"; tag: string; name: string; sub: string };

export type Row = { label: string; value: Value };

export type Block =
  | { kind: "rows"; rows: Row[] }
  | { kind: "group"; caption: string; rows: Row[] }
  | { kind: "note"; caption: string; text: string }
  | { kind: "files"; caption: string; rows: Row[] };

export type Card = {
  icon: string;
  title: string;
  blocks: Block[];
  /** Cards that overflow are cut off with a fade and a link to the full record. */
  clampTo?: number;
};

export type Section = {
  id: string;
  icon: string;
  title: string;
  cards: Card[];
};

const PARTNERDATEN: Card = {
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
  icon: a.gisa,
  title: "Gewerbeinhaber",
  clampTo: 551,
  blocks: [
    {
      kind: "group",
      caption: "Aktive Gewerbe (4)",
      rows: [
        {
          label: "Unternehmen",
          value: { kind: "entity", tag: "Interessent", name: "Lunixo AG", sub: "FN 232312" },
        },
        { label: "Funktion", value: "Gewerberechtlicher Geschäftsführer" },
        {
          label: "Standort",
          value: { kind: "link", text: "A-5210 Mondsee, Mondseestrasse 22" },
        },
        {
          label: "Berechtigungswortlaut",
          value:
            "Versicherungsvermittlung in der Form Versicherungsmakler und Berater in Versicherungsangelegenheiten",
        },
        { label: "GISA-Zahl", value: { kind: "link", text: "20203202" } },
        { label: "Eingetragen am", value: "03.02.1993" },
      ],
    },
    {
      kind: "group",
      caption: "",
      rows: [
        {
          label: "Unternehmen",
          value: { kind: "entity", tag: "Interessent", name: "Lunixo AG", sub: "FN 232312" },
        },
      ],
    },
  ],
};

const VEREINSFUNKTION: Card = {
  icon: a.abteilung,
  title: "Vereinsfunktion",
  blocks: [
    {
      kind: "group",
      caption: "Aktive Vereinsfunktionen (1)",
      rows: [
        {
          label: "Verein",
          value: {
            kind: "entity",
            tag: "Interessent",
            name: "Alpenverein Schladming",
            sub: "FN 232312",
          },
        },
        { label: "Funktion", value: "Vorsitzender" },
        { label: "Eingetragen am", value: "03.02.1993" },
      ],
    },
  ],
};

const WIRTSCHAFT_ANHAENGE: Card = {
  icon: a.paperclip,
  title: "Anhänge",
  blocks: [
    {
      kind: "rows",
      rows: [{ label: "GISA Auszug", value: { kind: "file", text: "Bilanz_2026.pdf" } }],
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
];

/** The left sidebar. `soon` marks the areas that are not built yet. */
export const NAV_GROUPS = [
  {
    label: "Wino Daten",
    items: [
      { label: "Allg. Personendaten", icon: a.navPerson, target: "personendaten" },
      { label: "Wirtschaftsdaten", icon: a.cube, target: "wirtschaftsdaten" },
      { label: "Kontakte (2)", icon: a.contacts, soon: true },
      { label: "Adressen", icon: a.house, soon: true },
      { label: "Bankverbindung (2)", icon: a.bank, soon: true },
      { label: "Systemdaten", icon: a.systemRing, soon: true },
      { label: "Verknüpfung", icon: a.abteilung, soon: true },
    ],
  },
  {
    label: "Externe Quellen",
    items: [
      { label: "Firmenbuch", icon: a.firmenbuch, soon: true },
      { label: "GISA", icon: a.gisa, soon: true },
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
