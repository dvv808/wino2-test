import * as a from "../assets";
import type { StammdatenAreaId } from "./stammdaten";
import {
  applyPartner,
  areaForSection,
  areaTitle,
  partnerForm,
  valueText,
  type Card,
  type FileEntry,
  type Section,
} from "./stammdaten";

export type HistoryEditor = { name: string; photo: string };

export const EDITOR_ADVISOR: HistoryEditor = { name: "Auer Christine", photo: a.empChristine };
export const EDITOR_MANAGER: HistoryEditor = { name: "Adams Anna", photo: a.reqAnna };
export const EDITOR_LEAD: HistoryEditor = { name: "Dullon Lucy", photo: a.empLucy };

export type MaklerStep = "tasks" | "comms" | "fee" | "terms" | "scope" | "docs" | "sign";

export type HistoryPlace =
  | { app: "stammdaten"; area: StammdatenAreaId; cardId?: string }
  | { app: "makler"; step: MaklerStep }
  | { app: "person"; sectionId?: string };

/** One published change. Only `legal` entries bump the person version number. */
export type HistoryKind = "added" | "changed" | "removed";

export type PersonVersion = {
  id: string;
  number: number;
  legal: boolean;
  kind: HistoryKind;
  date: string;
  time: string;
  field: string;
  from?: string;
  to?: string;
  placeLabel: string;
  place: HistoryPlace;
  editor: HistoryEditor;
  vorname: string;
  nachname: string;
  attachment?: { label: string; name: string };
};

export const INITIAL_VERSIONS: PersonVersion[] = [
  {
    id: "c01",
    number: 1,
    legal: true,
    kind: "added",
    date: "03.06.2019",
    time: "09:14",
    field: "Person",
    to: "Julia Berger",
    placeLabel: "Stammdaten · Partnerdaten",
    place: { app: "stammdaten", area: "personendaten", cardId: "partner-julia" },
    editor: EDITOR_ADVISOR,
    vorname: "Julia",
    nachname: "Berger",
  },
  {
    id: "c02",
    number: 1,
    legal: false,
    kind: "added",
    date: "12.06.2019",
    time: "09:21",
    field: "Hauptwohnsitz",
    to: "Mondseestrasse 32, A-5310 Mondsee",
    placeLabel: "Stammdaten · Adressen",
    place: { app: "stammdaten", area: "adressen", cardId: "adresse-haupt" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c03",
    number: 1,
    legal: false,
    kind: "added",
    date: "18.06.2019",
    time: "09:16",
    field: "E-Mail",
    to: "julia.atkinson@mail.at",
    placeLabel: "Stammdaten · Kontakte",
    place: { app: "stammdaten", area: "kontakte", cardId: "kontakt-julia" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c04",
    number: 1,
    legal: false,
    kind: "added",
    date: "02.07.2019",
    time: "10:07",
    field: "Bankverbindung",
    to: "Neon Bank · AT 2303 20002 0000 0002 0012",
    placeLabel: "Stammdaten · Bankverbindung",
    place: { app: "stammdaten", area: "bankverbindungen", cardId: "bank-neon" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c05",
    number: 1,
    legal: false,
    kind: "added",
    date: "15.08.2019",
    time: "11:40",
    field: "Firmenbuch",
    to: "Lunixo AG · Gesellschafterin mit 70% Anteilen",
    placeLabel: "Stammdaten · Wirtschaftsdaten",
    place: { app: "stammdaten", area: "wirtschaftsdaten", cardId: "wirtschaft-firmenbuch" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c06",
    number: 1,
    legal: false,
    kind: "added",
    date: "03.09.2019",
    time: "08:30",
    field: "Maklervereinbarung",
    to: "Neuer Workflow mit offenen Aufgaben",
    placeLabel: "Maklervereinbarung · Offene Aufgaben",
    place: { app: "makler", step: "tasks" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c07",
    number: 1,
    legal: false,
    kind: "added",
    date: "10.09.2019",
    time: "09:16",
    field: "Kommunikationsdaten",
    to: "Zustellung per E-Mail, Rechnungsadresse übernommen",
    placeLabel: "Maklervereinbarung · Kommunikationsdaten",
    place: { app: "makler", step: "comms" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c08",
    number: 1,
    legal: false,
    kind: "added",
    date: "12.09.2019",
    time: "10:01",
    field: "Honorar-Modell",
    to: "Privat · EUR 120,00 pro Jahr, zahlbar in vier Teilbeträgen",
    placeLabel: "Maklervereinbarung · Honorar",
    place: { app: "makler", step: "fee" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c09",
    number: 1,
    legal: false,
    kind: "added",
    date: "20.09.2019",
    time: "10:01",
    field: "Individuelle Vereinbarungen",
    to: "Es wird vereinbart, dass für die Dauer von zwölf Monaten ein Alleinvermittlungsauftrag besteht.",
    placeLabel: "Maklervereinbarung · Vereinbarungen",
    place: { app: "makler", step: "terms" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c10",
    number: 1,
    legal: false,
    kind: "added",
    date: "22.09.2019",
    time: "14:22",
    field: "Leistungsumfang",
    to: "Beratung ausschließlich über den Makler",
    placeLabel: "Maklervereinbarung · Leistungsumfang",
    place: { app: "makler", step: "scope" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c11",
    number: 1,
    legal: false,
    kind: "added",
    date: "01.10.2019",
    time: "09:05",
    field: "Dokumentenfreigabe",
    to: "Maklervereinbarung, SEPA und Vollmachten",
    placeLabel: "Maklervereinbarung · Dokumentenfreigabe",
    place: { app: "makler", step: "docs" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c12",
    number: 1,
    legal: false,
    kind: "added",
    date: "05.10.2019",
    time: "16:48",
    field: "Signatur",
    to: "Digitale Unterschrift der Interessentin",
    placeLabel: "Maklervereinbarung · Signaturen",
    place: { app: "makler", step: "sign" },
    vorname: "Julia",
    nachname: "Berger",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c13",
    number: 2,
    legal: true,
    kind: "changed",
    date: "18.09.2022",
    time: "11:12",
    field: "Nachname",
    from: "Berger",
    to: "Atkinson",
    placeLabel: "Stammdaten · Partnerdaten",
    place: { app: "stammdaten", area: "personendaten", cardId: "partner-julia" },
    vorname: "Julia",
    nachname: "Atkinson",
    editor: EDITOR_ADVISOR,
    attachment: { label: "Heiratsurkunde", name: "Heiratsurkunde.pdf" },
  },
  {
    id: "c14",
    number: 2,
    legal: false,
    kind: "changed",
    date: "20.09.2022",
    time: "13:01",
    field: "Notiz",
    from: "–",
    to: "Geschäftsführerin von Atkinson Consulting OG.",
    placeLabel: "Stammdaten · Partnerdaten",
    place: { app: "stammdaten", area: "personendaten", cardId: "partner-julia" },
    vorname: "Julia",
    nachname: "Atkinson",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c15",
    number: 2,
    legal: false,
    kind: "added",
    date: "14.11.2022",
    time: "10:44",
    field: "Kontakt",
    to: "Ehemann im Dossier hinterlegt",
    placeLabel: "Stammdaten · Kontakte",
    place: { app: "stammdaten", area: "kontakte", cardId: "kontakt-ehemann" },
    vorname: "Julia",
    nachname: "Atkinson",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c16",
    number: 2,
    legal: false,
    kind: "changed",
    date: "02.03.2025",
    time: "08:18",
    field: "Vertretung",
    from: "alleinige Vertretung",
    to: "Geschäftsführerin, gemeinsame Vertretung ab 01.03.2025",
    placeLabel: "Stammdaten · Wirtschaftsdaten",
    place: { app: "stammdaten", area: "wirtschaftsdaten", cardId: "wirtschaft-firmenbuch" },
    vorname: "Julia",
    nachname: "Atkinson",
    editor: EDITOR_MANAGER,
  },
  {
    id: "c17",
    number: 2,
    legal: false,
    kind: "added",
    date: "08.11.2025",
    time: "15:02",
    field: "Bankverbindung",
    to: "Sparkasse",
    placeLabel: "Stammdaten · Bankverbindung",
    place: { app: "stammdaten", area: "bankverbindungen", cardId: "bank-sparkasse" },
    vorname: "Julia",
    nachname: "Atkinson",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c18",
    number: 2,
    legal: false,
    kind: "added",
    date: "03.02.2026",
    time: "09:33",
    field: "Anhang",
    to: "GISA-Auszug_2026.pdf",
    placeLabel: "Stammdaten · Wirtschaftsdaten",
    place: { app: "stammdaten", area: "wirtschaftsdaten", cardId: "wirtschaft-anhaenge" },
    vorname: "Julia",
    nachname: "Atkinson",
    editor: EDITOR_ADVISOR,
  },
  {
    id: "c19",
    number: 2,
    legal: false,
    kind: "changed",
    date: "11.03.2026",
    time: "13:01",
    field: "Honorarbetrag",
    from: "EUR 120,00",
    to: "EUR 170,00",
    placeLabel: "Maklervereinbarung · Honorar",
    place: { app: "makler", step: "fee" },
    vorname: "Julia",
    nachname: "Atkinson",
    editor: EDITOR_MANAGER,
  },
  {
    id: "c20",
    number: 2,
    legal: false,
    kind: "removed",
    date: "18.09.2026",
    time: "13:33",
    field: "Individuelle Vereinbarungen",
    to: "Es wird vereinbart, dass für die Dauer von zwölf Monaten ein Kündigungsverzicht besteht.",
    placeLabel: "Maklervereinbarung · Vereinbarungen",
    place: { app: "makler", step: "terms" },
    vorname: "Julia",
    nachname: "Atkinson",
    editor: EDITOR_LEAD,
  },
];

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("de-AT");
}

export function namesDiffer(left: string, right: string) {
  return normalizeName(left) !== normalizeName(right);
}

export function isMarriageCertificate(file: FileEntry) {
  const hay = `${file.label} ${file.name}`.toLowerCase();
  return hay.includes("heirat") || hay.includes("eheschliess") || hay.includes("eheschließ");
}

export function latestLegalNumber(versions: PersonVersion[]) {
  return Math.max(...versions.map((version) => version.number), 1);
}

export function currentVersion(versions: PersonVersion[]) {
  const number = latestLegalNumber(versions);
  return [...versions].reverse().find((version) => version.number === number) ?? versions[versions.length - 1];
}

export function personNameFromVersion(version: PersonVersion | undefined, fallback = "Julia Atkinson") {
  if (!version) return fallback;
  return `${version.vorname} ${version.nachname}`.trim() || fallback;
}

type HistoryDraft = Omit<PersonVersion, "id" | "date" | "time" | "editor" | "vorname" | "nachname" | "number"> & {
  number?: number;
};

function flattenCard(card: Card) {
  const fields: { key: string; field: string; value: string }[] = [];

  function add(key: string, field: string, raw: string) {
    const value = raw.replace(/\s+/g, " ").trim();
    if (!value || value === "-") return;
    fields.push({ key, field, value });
  }

  (card.blocks ?? []).forEach((block, bi) => {
    if ("rows" in block) {
      block.rows.forEach((row, ri) => add(`${bi}:${row.label}:${ri}`, row.label, valueText(row.value)));
    }
    if (block.kind === "note") add(`${bi}:note`, block.caption, block.text);
    if (block.kind === "person") {
      add(`${bi}:person`, "Kontakt", [block.name, block.sub].filter(Boolean).join(" · "));
    }
    if (block.kind === "badge") add(`${bi}:badge`, block.caption || "Kennzeichen", block.text);
    if (block.kind === "usage") add(`${bi}:usage`, block.caption, block.text);
  });
  return fields;
}

function liveCards(section: Section | undefined) {
  return (section?.cards ?? []).filter((card) => !card.empty);
}

function cardPlace(sectionId: string, cardId: string) {
  const area = areaForSection(sectionId);
  return {
    placeLabel: `Stammdaten · ${areaTitle(area)}`,
    place: { app: "stammdaten" as const, area, cardId },
  };
}

function diffCard(before: Card | undefined, after: Card | undefined, sectionId: string): HistoryDraft[] {
  const card = after ?? before;
  if (!card) return [];
  const { placeLabel, place } = cardPlace(sectionId, card.id);
  const was = before ? flattenCard(before) : [];
  const now = after ? flattenCard(after) : [];

  if (!before && after) {
    if (!now.length) {
      return [{ legal: false, kind: "added", field: after.title || "Eintrag", to: after.title || "Eintrag", placeLabel, place }];
    }
    return now.map((field) => ({
      legal: false,
      kind: "added" as const,
      field: field.field,
      to: field.value,
      placeLabel,
      place,
    }));
  }

  if (before && !after) {
    return [
      {
        legal: false,
        kind: "removed",
        field: before.title || "Eintrag",
        to: was[0]?.value || before.title || "Eintrag",
        placeLabel,
        place,
      },
    ];
  }

  const previous = new Map(was.map((field) => [field.key, field]));
  const next = new Map(now.map((field) => [field.key, field]));
  const changes: HistoryDraft[] = [];

  for (const [key, field] of next) {
    const earlier = previous.get(key);
    if (!earlier) {
      changes.push({ legal: false, kind: "added", field: field.field, to: field.value, placeLabel, place });
      continue;
    }
    if (earlier.value !== field.value) {
      changes.push({
        legal: false,
        kind: "changed",
        field: field.field,
        from: earlier.value,
        to: field.value,
        placeLabel,
        place,
      });
    }
  }

  for (const [key, field] of previous) {
    if (!next.has(key)) {
      changes.push({ legal: false, kind: "removed", field: field.field, to: field.value, placeLabel, place });
    }
  }

  return changes;
}

/** Field-level Verlauf rows for one Stammdaten save. */
export function historyFromStammdatenSave(
  before: Section[],
  after: Section[],
  extras: {
    number: number;
    at: { date: string; time: string };
    editor: HistoryEditor;
    vorname: string;
    nachname: string;
    legalNachname?: { from: string; to: string; attachment?: PersonVersion["attachment"] };
  },
): PersonVersion[] {
  const sectionIds = [...new Set([...before, ...after].map((section) => section.id))];
  const drafts: HistoryDraft[] = [];

  for (const sectionId of sectionIds) {
    const was = liveCards(before.find((section) => section.id === sectionId));
    const now = liveCards(after.find((section) => section.id === sectionId));
    const ids = [...new Set([...was, ...now].map((card) => card.id))];
    for (const id of ids) {
      drafts.push(
        ...diffCard(
          was.find((card) => card.id === id),
          now.find((card) => card.id === id),
          sectionId,
        ),
      );
    }
  }

  if (extras.legalNachname && !drafts.some((draft) => draft.field === "Nachname" && draft.kind === "changed")) {
    drafts.unshift({
      legal: true,
      kind: "changed",
      field: "Nachname",
      from: extras.legalNachname.from,
      to: extras.legalNachname.to,
      placeLabel: "Stammdaten · Partnerdaten",
      place: { app: "stammdaten", area: "personendaten", cardId: "partner-julia" },
      attachment: extras.legalNachname.attachment,
    });
  }

  return drafts.map((draft, index) => ({
    id: `c${Date.now()}-${index}`,
    number: extras.number,
    legal: Boolean(extras.legalNachname && draft.field === "Nachname" && draft.kind === "changed") || Boolean(draft.legal && extras.legalNachname),
    kind: draft.kind,
    date: extras.at.date,
    time: extras.at.time,
    field: draft.field,
    from: draft.from,
    to: draft.to,
    placeLabel: draft.placeLabel,
    place: draft.place,
    editor: extras.editor,
    vorname: extras.vorname,
    nachname: extras.nachname,
    attachment: extras.legalNachname && draft.field === "Nachname" ? extras.legalNachname.attachment : draft.attachment,
  }));
}

/** Swap the live partner card for an older published name when inspecting history. */
export function overlayPersonVersion(sections: Section[], version: PersonVersion | undefined): Section[] {
  if (!version) return sections;
  return sections.map((section) => {
    if (section.id !== "personendaten") return section;
    return {
      ...section,
      cards: section.cards.map((card) => {
        if (card.id !== "partner-julia") return card;
        const form = partnerForm(card);
        const files = version.attachment
          ? [
              { label: version.attachment.label, name: version.attachment.name, type: "pdf" as const },
              ...form.files.filter((file) => !isMarriageCertificate(file)),
            ]
          : form.files.filter((file) => !isMarriageCertificate(file));
        return applyPartner(card, {
          ...form,
          vorname: version.vorname,
          nachname: version.nachname,
          files,
        });
      }),
    };
  });
}
