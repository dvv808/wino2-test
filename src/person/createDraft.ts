import * as a from "../assets/index";
import { blankFileVersions, type PersonVersion } from "./versions";
import {
  listedPartners,
  partnerKindText,
  type FilePartner,
  type PartnerId,
  type PartnerKind,
} from "./partners";
import {
  applyAddress,
  applyContact,
  applyPartner,
  cloneAshleySections,
  countedTitle,
  EMPTY_ADDRESS,
  EMPTY_CONTACT,
  EMPTY_PARTNER,
  type AddressForm,
  type Card,
  type ContactChannel,
  type ContactForm,
  type PartnerForm,
  type Section,
} from "./stammdaten";
import {
  applyCompanyFirmenbuch,
  companyFn,
  companyShellFirmenbuch,
  companyWirtschaftCards,
  EMPTY_COMPANY_GISA,
  INITIAL_COMPANY_ORGANE,
  personBorn,
} from "./companyWirtschaft";

export type PersonTyp = "Privatperson" | "Unternehmen";
export type PartnerTyp = "Interessent" | "Kunde" | "Einfache Person";
export type CreateStep = "typ" | "daten" | "wico" | "summary";

export type CheckHit = {
  id: string;
  source: "wico" | "wino";
  name: string;
  sub: string;
  address: string;
  tag?: string;
  party: "person" | "company";
  partnerId?: PartnerId;
  phone?: string;
  mail?: string;
  website?: string;
  born?: string;
  fn?: string;
  strasse?: string;
  nummer?: string;
  plz?: string;
  ort?: string;
  alreadyInWino?: boolean;
};

export type PartnerDraft = {
  mandant: string;
  partnerTyp: PartnerTyp;
  personTyp: PersonTyp;
  berater: string;
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
  firmenwortlaut: string;
  addressTyp: string;
  strasse: string;
  nummer: string;
  zusatz: string;
  plz: string;
  ort: string;
  land: string;
  addressNotiz: string;
  contactTitle: string;
  contactNotiz: string;
  phones: ContactChannel[];
  mails: ContactChannel[];
  websites: ContactChannel[];
  assignedHit: CheckHit | null;
  wicoSelected: string[];
};

export type WicoLinkKind = "owner" | "control" | "legal" | "holding" | "beneficial";

export type WicoLink = {
  id: string;
  kind: WicoLinkKind;
  section: string;
  name: string;
  party: "person" | "company";
  sub: string;
  rows: { label: string; value: string }[];
};

export type CreatedPartner = ReturnType<typeof buildCreatedPartner>;

export const EMPTY_DRAFT: PartnerDraft = {
  mandant: "Makler Winter",
  partnerTyp: "Interessent",
  personTyp: "Privatperson",
  berater: "Lucy Dullon",
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
  firmenwortlaut: "",
  addressTyp: "Hauptwohnsitz",
  strasse: "",
  nummer: "",
  zusatz: "",
  plz: "",
  ort: "",
  land: "Österreich",
  addressNotiz: "",
  contactTitle: "",
  contactNotiz: "",
  phones: [{ value: "", note: "", extra: "Mobil" }],
  mails: [{ value: "", note: "" }],
  websites: [{ value: "", note: "" }],
  assignedHit: null,
  wicoSelected: [],
};

function localPhone(value: string) {
  return value.replace(/^\+43\s*/, "").trim();
}

function fullPhone(value: string) {
  const local = localPhone(value);
  return local ? `+43 ${local}` : "";
}

function firstValue(items: ContactChannel[]) {
  return items.find((item) => item.value.trim())?.value.trim() ?? "";
}

const WICO_PEOPLE: CheckHit[] = [
  {
    id: "wico-julia",
    source: "wico",
    name: "Julia Atkinson",
    sub: "04.07.1976",
    address: "Mondseestrasse 32,\nA-5310 Mondsee",
    party: "person",
    born: "04.07.1976",
    strasse: "Mondseestrasse",
    nummer: "32",
    plz: "5310",
    ort: "Mondsee",
  },
];

const WICO_COMPANIES: CheckHit[] = [
  {
    id: "wico-lunixo",
    source: "wico",
    name: "Lunixo AG",
    sub: "FN 232312",
    address: "Mondseestrasse 32,\nA-5310 Mondsee",
    party: "company",
    fn: "232312",
    phone: "+43 3810 393 112 3",
    mail: "office@lunixo.com",
    website: "www.lunixo.com",
    born: "12.09.1988",
    strasse: "Mondseestrasse",
    nummer: "32",
    plz: "5310",
    ort: "Mondsee",
  },
  {
    id: "wico-lunixo-holding",
    source: "wico",
    name: "Lunixo Holding",
    sub: "FN 63241",
    address: "Mirabellplatz 4,\nA-5020 Salzburg",
    party: "company",
    fn: "63241",
    strasse: "Mirabellplatz",
    nummer: "4",
    plz: "5020",
    ort: "Salzburg",
  },
  {
    id: "wico-lunixo-immobilien",
    source: "wico",
    name: "Lunixo Immobilien GmbH",
    sub: "FN 441208",
    address: "Hauptplatz 8,\nA-4020 Linz",
    party: "company",
    fn: "441208",
    strasse: "Hauptplatz",
    nummer: "8",
    plz: "4020",
    ort: "Linz",
  },
  {
    id: "wico-lunixo-consulting",
    source: "wico",
    name: "Lunixo Consulting GmbH",
    sub: "FN 781204",
    address: "Getreidegasse 18,\nA-5020 Salzburg",
    party: "company",
    fn: "781204",
    phone: "+43 662 210 440",
    mail: "office@lunixo-consulting.at",
    website: "www.lunixo-consulting.at",
    strasse: "Getreidegasse",
    nummer: "18",
    plz: "5020",
    ort: "Salzburg",
  },
  {
    id: "wico-lunixo-digital",
    source: "wico",
    name: "Lunixo Digital GmbH",
    sub: "FN 902311",
    address: "Linzer Straße 12,\nA-5020 Salzburg",
    party: "company",
    fn: "902311",
    strasse: "Linzer Straße",
    nummer: "12",
    plz: "5020",
    ort: "Salzburg",
  },
];

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "partner"
  );
}

function kindFromTyp(typ: PartnerTyp): PartnerKind {
  if (typ === "Kunde") return "kunde";
  if (typ === "Einfache Person") return "einfach";
  return "interessent";
}

function queryOf(draft: PartnerDraft) {
  return draft.personTyp === "Unternehmen"
    ? draft.firmenwortlaut.trim()
    : `${draft.vorname} ${draft.nachname}`.trim();
}

function matches(name: string, query: string, min = 3) {
  const q = query.toLowerCase();
  return q.length >= min && name.toLowerCase().includes(q);
}

function existingPartner(name: string) {
  const needle = name.trim().toLowerCase();
  return listedPartners().find((partner) => partner.name.trim().toLowerCase() === needle);
}

export function searchHits(draft: PartnerDraft): CheckHit[] {
  const query = queryOf(draft);
  const company = draft.personTyp === "Unternehmen";
  const min = company ? 2 : 3;
  if (query.length < min) return [];
  const catalog = company ? WICO_COMPANIES : WICO_PEOPLE;
  const wico = catalog
    .filter((hit) => matches(hit.name, query, min))
    .map((hit) => {
      const existing = existingPartner(hit.name);
      return existing ? { ...hit, alreadyInWino: true, partnerId: existing.id, tag: partnerKindText(existing.kind) } : hit;
    });
  if (wico.length === 0) {
    const existing = existingPartner(query);
    wico.push({
      id: `wico-typed-${query.toLowerCase()}`,
      source: "wico",
      name: query,
      sub: company ? "Firmenbuch" : "",
      address: "",
      party: company ? "company" : "person",
      alreadyInWino: Boolean(existing),
      partnerId: existing?.id,
      tag: existing ? partnerKindText(existing.kind) : undefined,
    });
  }
  const taken = new Set(wico.map((hit) => hit.name.trim().toLowerCase()));
  const wino = listedPartners()
    .filter((partner) => (company ? partner.fileKind === "company" : partner.fileKind !== "company"))
    .filter((partner) => matches(partner.name, query, min))
    .filter((partner) => !taken.has(partner.name.trim().toLowerCase()))
    .map((partner) => ({
      id: `wino-${partner.id}`,
      source: "wino" as const,
      name: partner.name,
      sub: partner.born ?? (partner.fn ? `FN ${partner.fn}` : ""),
      address: partner.address ? partner.address.join(",\n") : "",
      tag: partnerKindText(partner.kind),
      party: partner.fileKind === "company" ? ("company" as const) : ("person" as const),
      partnerId: partner.id,
      alreadyInWino: true,
    }));
  return [...wico, ...wino];
}

export function applyHit(draft: PartnerDraft, hit: CheckHit): PartnerDraft {
  const next = { ...draft, assignedHit: hit };
  if (hit.source !== "wico") return next;
  if (hit.party === "company") {
    const filled = {
      ...next,
      firmenwortlaut: hit.name,
      strasse: hit.strasse ?? draft.strasse,
      nummer: hit.nummer ?? draft.nummer,
      plz: hit.plz ?? draft.plz,
      ort: hit.ort ?? draft.ort,
      addressTyp: draft.addressTyp === "Hauptwohnsitz" ? "Firmensitz" : draft.addressTyp,
      phones: hit.phone ? [{ value: localPhone(hit.phone), note: "", extra: "Mobil" }] : draft.phones,
      mails: hit.mail ? [{ value: hit.mail, note: "" }] : draft.mails,
      websites: hit.website ? [{ value: hit.website, note: "" }] : draft.websites,
      contactTitle: draft.contactTitle || "Office",
      contactNotiz: draft.contactNotiz || "Für alle Fragen rundum die Firma.",
    };
    return { ...filled, wicoSelected: selectableWicoIds(filled) };
  }
  const [vorname = "", ...rest] = hit.name.split(" ");
  return {
    ...next,
    vorname,
    nachname: rest.join(" "),
    geburtTag: hit.born?.split(".")[0] ?? draft.geburtTag,
    geburtMonat: hit.born?.split(".")[1] ?? draft.geburtMonat,
    geburtJahr: hit.born?.split(".")[2] ?? draft.geburtJahr,
    strasse: hit.strasse ?? draft.strasse,
    nummer: hit.nummer ?? draft.nummer,
    plz: hit.plz ?? draft.plz,
    ort: hit.ort ?? draft.ort,
  };
}

function joinParts(tag: string, monat: string, jahr: string) {
  return [tag, monat, jahr].filter(Boolean).join(".") || "-";
}

export function wicoLinksFor(draft: PartnerDraft): WicoLink[] {
  if (draft.personTyp !== "Unternehmen" || draft.assignedHit?.source !== "wico") return [];
  const form = INITIAL_COMPANY_ORGANE;
  const links: WicoLink[] = [];
  form.owners.forEach((owner, index) => {
    links.push({
      id: `owner-${index}`,
      kind: "owner",
      section: "Eigentümer des Partners",
      name: owner.name,
      party: "company",
      sub: companyFn(owner.name),
      rows: [
        { label: "Bezeichnung", value: owner.bezeichnung || "-" },
        { label: "Anteile", value: owner.anteile || "-" },
      ],
    });
  });
  form.controlOrgans.forEach((organ, index) => {
    links.push({
      id: `control-${index}`,
      kind: "control",
      section: "Kontrollorgane des Partners",
      name: organ.person,
      party: "person",
      sub: personBorn(organ.person) || "-",
      rows: [
        { label: "Funktion", value: organ.funktion || "-" },
        { label: "Funktionsbeschreibung", value: organ.beschreibung || "-" },
        { label: "Notiz zum Kontrollorgan", value: organ.notiz || "-" },
        { label: "Eingetragen am", value: joinParts(organ.tag, organ.monat, organ.jahr) },
      ],
    });
  });
  form.legalReps.forEach((organ, index) => {
    links.push({
      id: `legal-${index}`,
      kind: "legal",
      section: "Gesetzliche Vertreter des Partners",
      name: organ.person,
      party: "person",
      sub: personBorn(organ.person) || "-",
      rows: [
        { label: "Funktion", value: organ.funktion || "-" },
        { label: "Funktionsbeschreibung", value: organ.beschreibung || "-" },
        { label: "Vertretungsbefugnis", value: organ.vertretungsbefugnis || "-" },
        { label: "Eingetragen am", value: joinParts(organ.tag, organ.monat, organ.jahr) },
      ],
    });
  });
  form.holdings.forEach((holding, index) => {
    links.push({
      id: `holding-${index}`,
      kind: "holding",
      section: "Partner ist beteiligt an",
      name: holding.name,
      party: "company",
      sub: companyFn(holding.name),
      rows: [
        { label: "Beteiligungsart", value: holding.art || "-" },
        { label: "Anteile", value: holding.anteile || "-" },
      ],
    });
  });
  form.beneficialOwners.forEach((name, index) => {
    links.push({
      id: `beneficial-${index}`,
      kind: "beneficial",
      section: "Wirtschaftlicher Eigentümer",
      name,
      party: "person",
      sub: personBorn(name) || "-",
      rows: [{ label: "Wirtschaftlicher Eigentümer", value: name }],
    });
  });
  return links;
}

export function wicoSectionsOf(links: WicoLink[]) {
  const order: WicoLinkKind[] = ["owner", "control", "legal", "holding", "beneficial"];
  return order
    .map((kind) => {
      const items = links.filter((link) => link.kind === kind);
      return items.length ? { kind, title: items[0].section, items } : null;
    })
    .filter((section): section is { kind: WicoLinkKind; title: string; items: WicoLink[] } => Boolean(section));
}

export function wicoAlreadyInWino(name: string) {
  return Boolean(existingPartner(name));
}

export function selectableWicoIds(draft: PartnerDraft) {
  return wicoLinksFor(draft)
    .filter((link) => !existingPartner(link.name))
    .map((link) => link.id);
}

export function ensureWicoSelection(draft: PartnerDraft): PartnerDraft {
  const allowed = selectableWicoIds(draft);
  const cleaned = draft.wicoSelected.filter((id) => allowed.includes(id));
  if (cleaned.length > 0) {
    return cleaned.length === draft.wicoSelected.length ? draft : { ...draft, wicoSelected: cleaned };
  }
  return allowed.length ? { ...draft, wicoSelected: allowed } : { ...draft, wicoSelected: [] };
}

export function toggleWicoLink(draft: PartnerDraft, id: string): PartnerDraft {
  const link = wicoLinksFor(draft).find((entry) => entry.id === id);
  if (link && existingPartner(link.name)) return draft;
  const on = draft.wicoSelected.includes(id);
  return {
    ...draft,
    wicoSelected: on ? draft.wicoSelected.filter((entry) => entry !== id) : [...draft.wicoSelected, id],
  };
}

export function selectedWicoNames(draft: PartnerDraft) {
  const selected = new Set(draft.wicoSelected);
  return new Set(
    wicoLinksFor(draft)
      .filter((link) => selected.has(link.id) || Boolean(existingPartner(link.name)))
      .map((link) => link.name),
  );
}

function knownPartnerName(name: string, skip: string) {
  const needle = name.trim().toLowerCase();
  if (needle === skip.trim().toLowerCase()) return true;
  return listedPartners().some((partner) => partner.name.trim().toLowerCase() === needle);
}

export function relatedPartnersFromDraft(draft: PartnerDraft, startSeq: number) {
  const companyName = draftName(draft);
  const selected = new Set(draft.wicoSelected);
  const byName = new Map<string, WicoLink[]>();
  for (const link of wicoLinksFor(draft)) {
    const group = byName.get(link.name) ?? [];
    group.push(link);
    byName.set(link.name, group);
  }
  const created: CreatedPartner[] = [];
  let seq = startSeq;
  for (const [name, group] of byName) {
    if (knownPartnerName(name, companyName)) continue;
    const picked = group.some((link) => selected.has(link.id));
    const sample = group[0];
    const [vorname, nachname] = splitName(name);
    const born = sample.party === "person" ? sample.sub.split(".") : [];
    const note = picked
      ? `Über WICO mit ${companyName} verbunden und an Makler Winter angebunden.`
      : `Aus dem WICO zu ${companyName} übernommen, aber nicht mit WICO synchronisiert. Noch nicht an Makler Winter angebunden und daher weniger relevant.`;
    const fn = sample.party === "company" ? sample.sub.replace(/^FN\s*/, "") : undefined;
    const mini: PartnerDraft = {
      ...EMPTY_DRAFT,
      personTyp: sample.party === "company" ? "Unternehmen" : "Privatperson",
      partnerTyp: picked ? "Interessent" : "Einfache Person",
      vorname: sample.party === "company" ? "" : vorname,
      nachname: sample.party === "company" ? "" : nachname,
      firmenwortlaut: sample.party === "company" ? name : "",
      geburtTag: born[0] ?? "",
      geburtMonat: born[1] ?? "",
      geburtJahr: born[2] ?? "",
      notiz: note,
      assignedHit:
        sample.party === "company"
          ? {
              id: `related-${seq}`,
              source: "wino",
              name,
              sub: sample.sub,
              address: "",
              party: "company",
              fn,
            }
          : null,
    };
    const built = buildCreatedPartner(mini, seq++);
    built.file.info = note;
    if (fn) built.file.fn = fn;
    created.push(built);
  }
  return created;
}

function retagOrganeCard(card: Card, draft: PartnerDraft): Card {
  if (card.id !== "wirtschaft-organe") return card;
  const picked = selectedWicoNames(draft);
  return {
    ...card,
    blocks: card.blocks?.map((block) => {
      if (block.kind !== "group") return block;
      return {
        ...block,
        rows: block.rows.map((row) => {
          const value = row.value;
          if (typeof value === "object" && value.kind === "entity") {
            return {
              ...row,
              value: {
                ...value,
                tag: picked.has(value.name) ? "Interessent" : "",
              },
            };
          }
          return row;
        }),
      };
    }),
  };
}

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return [parts[0] ?? "", ""];
  return [parts[0], parts.slice(1).join(" ")];
}

function draftName(draft: PartnerDraft) {
  return draft.personTyp === "Unternehmen"
    ? draft.firmenwortlaut.trim() || "Neues Unternehmen"
    : `${draft.vorname} ${draft.nachname}`.trim() || "Neuer Partner";
}

function partnerFormOf(draft: PartnerDraft): PartnerForm {
  if (draft.personTyp === "Unternehmen") {
    const [vorname, nachname] = splitName(draft.firmenwortlaut.trim() || "Neues Unternehmen");
    return {
      ...EMPTY_PARTNER,
      vorname,
      nachname,
      rufname: draft.rufname,
      nationalitaet: draft.nationalitaet,
      notiz: draft.notiz,
    };
  }
  return {
    ...EMPTY_PARTNER,
    titelVor: draft.titelVor,
    vorname: draft.vorname,
    nachname: draft.nachname,
    titelNach: draft.titelNach,
    rufname: draft.rufname,
    geschlecht: draft.geschlecht,
    geburtTag: draft.geburtTag,
    geburtMonat: draft.geburtMonat,
    geburtJahr: draft.geburtJahr,
    nationalitaet: draft.nationalitaet,
    notiz: draft.notiz,
  };
}

function addressFormOf(draft: PartnerDraft): AddressForm {
  return {
    ...EMPTY_ADDRESS,
    typ: draft.personTyp === "Unternehmen" ? draft.addressTyp || "Firmensitz" : draft.addressTyp || "Hauptwohnsitz",
    strasse: draft.strasse,
    nummer: draft.nummer,
    zusatz: draft.zusatz,
    plz: draft.plz,
    ort: draft.ort,
    land: draft.land,
    notiz: draft.addressNotiz,
  };
}

function contactFormOf(draft: PartnerDraft): ContactForm {
  const name = draftName(draft);
  return {
    ...EMPTY_CONTACT,
    kind: "person",
    partner: name,
    bezeichnung: draft.contactTitle || (draft.personTyp === "Unternehmen" ? "Office" : `Kontaktdaten ${draft.vorname || name}`),
    notiz: draft.contactNotiz,
    phones: draft.phones.map((phone) => ({ ...phone, value: fullPhone(phone.value) })),
    mails: draft.mails,
    websites: draft.websites,
  };
}

function withSystem(sections: Section[], draft: PartnerDraft): Section[] {
  return sections.map((section) => {
    if (section.id === "systemdaten") {
      return {
        ...section,
        cards: section.cards.map((card) => ({
          ...card,
          blocks: card.blocks?.map((block) => {
            if (block.kind === "rows" && block.caption === "Allgemein") {
              return {
                ...block,
                rows: [
                  { label: "Personentyp", value: draft.personTyp },
                  { label: "Partnertyp", value: draft.partnerTyp },
                ],
              };
            }
            if (block.kind === "rows" && block.caption === "Interne Zuordnung") {
              return {
                ...block,
                rows: [
                  { label: "Mandat", value: draft.mandant },
                  { label: "Vermittler", value: "Winter" },
                  { label: "Kundenberater", value: draft.berater },
                ],
              };
            }
            return block;
          }),
        })),
      };
    }
    if (section.id === "kontakte" || section.id === "adressen") {
      return { ...section, title: countedTitle({ ...section, title: section.title }) };
    }
    return section;
  });
}

export function draftSections(draft: PartnerDraft, cardId: string, asDraft = false): Section[] {
  const [vorname, nachname] =
    draft.personTyp === "Unternehmen"
      ? splitName(draft.firmenwortlaut.trim() || "Neues Unternehmen")
      : [draft.vorname || "Neu", draft.nachname || "Partner"];
  const personTyp = draft.personTyp === "Unternehmen" ? "Unternehmen" : "Privatperson";
  let sections = cloneAshleySections(vorname, nachname, cardId, personTyp);

  const partnerCard = applyPartner({ id: cardId }, partnerFormOf(draft), asDraft);
  const addressCard = applyAddress({ id: "adresse-1", icon: a.flag }, addressFormOf(draft), asDraft);
  const contactCard = applyContact({ id: "kontakt-1" }, contactFormOf(draft), asDraft);
  if (draft.personTyp === "Unternehmen") {
    contactCard.blocks = contactCard.blocks?.map((block) =>
      block.kind === "person" ? { ...block, tag: draft.partnerTyp, party: "company" as const, sub: draft.assignedHit?.born || "-" } : block,
    );
  } else {
    contactCard.blocks = contactCard.blocks?.map((block) =>
      block.kind === "person"
        ? { ...block, tag: draft.partnerTyp, sub: [draft.geburtTag, draft.geburtMonat, draft.geburtJahr].filter(Boolean).join(".") || "-" }
        : block,
    );
  }

  sections = sections.map((section) => {
    if (section.id === "personendaten") return { ...section, title: "Allgemeine Partnerdaten", cards: [partnerCard] };
    if (section.id === "adressen") return { ...section, title: "Adressen (1)", cards: [addressCard] };
    if (section.id === "kontakte") return { ...section, title: "Kontakte (1)", cards: [contactCard] };
    return section;
  });

  if (draft.personTyp === "Unternehmen" && draft.assignedHit?.source === "wico") {
    const hit = draft.assignedHit;
    const firmenbuch = applyCompanyFirmenbuch(
      { id: "wirtschaft-firmenbuch" },
      {
        ...companyShellFirmenbuch(hit.name, hit.ort, hit.fn),
        strasse: hit.strasse ?? draft.strasse,
        nummer: hit.nummer ?? draft.nummer,
        plz: hit.plz ?? draft.plz,
        ort: hit.ort ?? draft.ort,
      },
      asDraft,
    );
    const wirtschaft = companyWirtschaftCards({
      firmenbuch: {
        ...companyShellFirmenbuch(hit.name, hit.ort, hit.fn),
        strasse: hit.strasse ?? draft.strasse,
        nummer: hit.nummer ?? draft.nummer,
        plz: hit.plz ?? draft.plz,
        ort: hit.ort ?? draft.ort,
      },
      organe: INITIAL_COMPANY_ORGANE,
      gisa: EMPTY_COMPANY_GISA,
      files: [],
    }).map((card) => (card.id === "wirtschaft-firmenbuch" ? firmenbuch : retagOrganeCard(card, draft)));
    sections = sections.map((section) =>
      section.id === "wirtschaftsdaten" ? { ...section, cards: wirtschaft } : section,
    );
  }

  return withSystem(sections, draft);
}

export function summaryCards(draft: PartnerDraft): Card[] {
  const sections = draftSections(draft, "partner-new");
  const ids = ["systemdaten", "personendaten", "adressen", "kontakte"];
  if (draft.personTyp === "Unternehmen" && draft.assignedHit?.source === "wico") ids.splice(1, 0, "wirtschaftsdaten");
  return ids.flatMap((id) => sections.find((section) => section.id === id)?.cards ?? []).filter((card) => !card.empty);
}

export function buildCreatedPartner(draft: PartnerDraft, seq: number, asDraft = false) {
  const id = `neu-${seq}` as PartnerId;
  const name = draftName(draft);
  const [vorname, nachname] = splitName(name);
  const slug = `${slugify(name)}-${seq}`;
  const address: [string, string] | undefined =
    draft.strasse || draft.ort
      ? [[draft.strasse, draft.nummer].filter(Boolean).join(" "), [draft.plz && `A-${draft.plz}`, draft.ort].filter(Boolean).join(" ")]
      : undefined;
  const file: FilePartner = {
    id,
    slug,
    name,
    born: [draft.geburtTag, draft.geburtMonat, draft.geburtJahr].filter(Boolean).join(".") || undefined,
    address,
    fileId: String(5000 + seq),
    phone: fullPhone(firstValue(draft.phones)) || undefined,
    email: firstValue(draft.mails) || undefined,
    contacts: [
      ...draft.phones
        .filter((phone) => phone.value.trim())
        .map((phone) => ({ kind: "phone" as const, caption: phone.extra || "Mobil", value: fullPhone(phone.value) })),
      ...draft.mails
        .filter((mail) => mail.value.trim())
        .map((mail) => ({ kind: "mail" as const, caption: "Mail", value: mail.value.trim() })),
    ],
    moreContacts: 0,
    kind: kindFromTyp(draft.partnerTyp),
    fileKind: draft.personTyp === "Unternehmen" ? "company" : "person",
    fn: draft.assignedHit?.fn,
    website: firstValue(draft.websites) || undefined,
    info: draft.notiz || undefined,
  };
  const cardId = `partner-${id}`;
  const sections = draftSections(draft, cardId, asDraft);
  const versions: PersonVersion[] = blankFileVersions(vorname, nachname, cardId, `${id}-v1`);
  return { file, sections, versions, viewingVersionId: `${id}-v1` };
}
