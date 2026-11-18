import { useState } from "react";
import { StepFade, WaveStepper } from "../stepperOverflow";
import * as a from "../assets/index";
import { ContextMenu, DateField, Icon, Snackbar } from "../ui";
import { DataCard, focusForm } from "../person/cards";
import { DmsUpload } from "../dms/upload";
import { BankFields, ContactFields, Drop, Field, Select, Text } from "../person/forms";
import type { BankForm } from "../person/stammdaten";
import { ProfileShelfProvider, ShelfBody, ShelfTitle } from "../person/ProfileShelf";
import type { Card } from "../person/stammdaten";
import { contactOf } from "./MitarbeiterCard";
import { Halo } from "../person/MaklermandatPage";
import { INV_AREAS, hasM365, hasOfficeKey, invAreaDone, invCards, inventarOf, type InvAreaId } from "./inventar";
import { KOOP_AREAS, koopAreaDone, koopCards, vertragOf, vertragSigned, zugangAktiv, zugangOf, type KoopAreaId } from "./kooperation";
import {
  ABTEILUNGEN,
  ABTEILUNG_NAMEN,
  TEAM,
  isEmployee,
  nameParts,
  slugOf,
  type Anstellung,
  type MaStamm,
  type MitarbeiterTyp,
  type TeamMember,
} from "./hrmTeam";

/**
 * Mitarbeiter tab → Profil (Wino - Concepts 21745:76795) and its Stammdaten Workflow (21745:72464): the partner
 * Stammdaten for an employee or applicant. One Stammdaten record per person (`MaStamm`): Partner anlegen fills it,
 * Profil shows it, the workflow edits it. Seeded team members get a made-up record per name.
 *
 * Bewerber and Mitarbeiter differ: a Bewerber has only private phone / mail (no Firmen-Telefon, no Chat), no
 * Beschäftigungsdaten and usually no Bankverbindung yet; a Mitarbeiter has all of it.
 */

const POSITIONEN = ["Berater/in Versicherungen", "Innendienst", "KFZ Innendienst", "Schadenreferent/in", "Abteilungsleitung", "Lehrling", "Assistenz"];
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = <T,>(list: T[], seed: number) => list[Math.abs(seed) % list.length];
const pad = (n: number) => String(n).padStart(2, "0");
const FEMALE = /^(Anna|Sophie|Lena|Katharina|Julia|Elena|Sarah|Theresa|Laura|Verena|Nina|Lisa|Hannah|Magdalena|Johanna|Eva|Marie|Carina|Sabine|Melanie|Christine|Tamara|Lucy|Jasmin|Sonja|Lily)$/;
const ascii = (text: string) => text.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

export const HRM_NAMES = () => TEAM.filter((m) => m.abteilung === "HR-Management").map((m) => m.name);

/** The head of the person's Abteilung (from the side nav's lead line), or Peter Moser for the heads themselves. */
function vorgesetztOf(person: TeamMember) {
  const dept = ABTEILUNGEN.find((d) => d.name === person.abteilung);
  const lead = dept?.lead.map((line) => line.split(": ")[1]).find((name) => name && name !== person.name && TEAM.some((m) => m.name === name));
  return lead ?? (person.name === "Peter Moser" ? "" : "Peter Moser");
}

const EMPTY_ANSTELLUNG: Anstellung = { position: "", vorgesetzt: "", eintrittTag: "", eintrittMonat: "", eintrittJahr: "", ausmass: "", wochenstunden: "", standort: "", urlaub: "" };

/** Are there Beschäftigungsdaten at all (Position or Eintrittsdatum)? */
export const hasAnstellung = (anstellung: Anstellung) => Boolean(anstellung.position.trim() || anstellung.eintrittJahr.trim());

/** The Anstellung as edited in Profil, or its seeded default. */
export function anstellungOf(person: TeamMember): Anstellung {
  // Someone created in "Mitarbeiter anlegen" has only what was entered there: no made-up Anstellung.
  if (!person.anstellung && person.angelegt) return { ...EMPTY_ANSTELLUNG };
  return (
    person.anstellung ?? {
      position: person.role,
      vorgesetzt: vorgesetztOf(person),
      eintrittTag: "01",
      eintrittMonat: pad((hash(person.name) % 12) + 1),
      eintrittJahr: String(2008 + (hash(person.name) % 18)),
      ausmass: "Vollzeit",
      wochenstunden: "38,5",
      standort: "Schladming",
      urlaub: String(person.urlaubAnspruch || 25),
    }
  );
}

const STRASSEN = ["Hauptplatz", "Coburgstraße", "Ramsauer Straße", "Salzburger Straße", "Erzherzog-Johann-Straße", "Martin-Luther-Straße", "Siedlungsstraße", "Ennsweg"];
const ORTE: [string, string][] = [
  ["8970", "Schladming"],
  ["8967", "Haus im Ennstal"],
  ["8972", "Ramsau am Dachstein"],
  ["8960", "Öblarn"],
  ["8940", "Liezen"],
  ["8605", "Kapfenberg"],
];
const BANKEN: [string, string, string][] = [
  ["Raiffeisenbank Schladming", "RZSTAT2G", "AT38 3818 0000 00"],
  ["Steiermärkische Sparkasse", "STSPAT2G", "AT61 2081 5000 00"],
  ["Bank Austria", "BKAUATWW", "AT21 1200 0100 00"],
  ["Volksbank Steiermark", "VBOEATWW", "AT45 4477 0000 00"],
];
const dmy = (seed: number, fromYear: number, span: number) => `${pad((seed % 28) + 1)}.${pad(((seed >>> 3) % 12) + 1)}.${fromYear + ((seed >>> 7) % span)}`;

/** The person's Stammdaten: as entered / edited, or made up per name for the seeded team. */
export function stammOf(person: TeamMember): MaStamm {
  if (person.stamm) return person.stamm;
  const h = hash(person.name);
  const { vorname, nachname } = nameParts(person);
  const [plz, ort] = pick(ORTE, h >>> 2);
  const [bank, bic, iban] = pick(BANKEN, h >>> 4);
  const local = ascii(person.name);
  const employee = isEmployee(person);
  return {
    mandant: "Makler Winter",
    personentyp: employee ? "Mitarbeiter" : "Privatperson",
    hrm: "Adams Anna",
    titelVor: "",
    vorname,
    nachname,
    titelNach: "",
    rufname: "",
    geschlecht: FEMALE.test(vorname.split(" ")[0]) ? "Weiblich" : "Männlich",
    geburt: dmy(h, 1968, 36),
    nationalitaet: "Österreich",
    svNummer: employee ? `${1000 + (h % 8999)} ${dmy(h, 1968, 36).replace(/\./g, "").slice(0, 4)}${dmy(h, 1968, 36).slice(-2)}` : "",
    notiz: "",
    addressTyp: "Hauptwohnsitz",
    strasse: pick(STRASSEN, h >>> 5),
    nummer: String((h % 48) + 1),
    zusatz: "",
    plz,
    ort,
    land: "Österreich",
    addressNotiz: h % 3 === 0 ? "Zieht Ende des Jahres um. Neue Adresse folgt, sobald der Mietvertrag unterschrieben ist." : "",
    contactNotiz: "",
    phones: [{ value: `+43 664 ${String(1000000 + (h % 8999999)).replace(/(\d{3})(\d{4})/, "$1 $2")}`, note: "", extra: "Mobil" }],
    mails: [{ value: `${local}@gmx.at`, note: "" }],
    websites: [],
    bank: employee
      ? { inhaber: `${vorname} ${nachname}`.trim(), iban: `${iban}${String(100000 + (h % 899999))}`.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 "), bic, institut: bank }
      : null,
  };
}

const filled = (value?: string) => Boolean(value && value.trim() && value.trim() !== "-");
const addressLines = (s: MaStamm) => [[s.strasse, s.nummer].filter(filled).join(" "), [s.plz && `A-${s.plz}`, s.ort].filter(filled).join(" ")].filter(filled);

export type AreaId = "personendaten" | "kontakte" | "adressen" | "bank" | "beschaeftigung" | "systemdaten";
type Area = { id: AreaId; label: string; nav: string; icon: string; cards: Card[] };

export function areasOf(person: TeamMember): Area[] {
  const h = hash(person.name);
  const s = stammOf(person);
  const employee = isEmployee(person);
  const typ = person.typ ?? "Mitarbeiter";
  const anstellung = anstellungOf(person);
  const { phone, mail } = contactOf(person);

  const personendaten: Card = {
    id: "ma-person",
    icon: a.navPerson,
    title: "Allgemeine Partnerdaten",
    blocks: [
      {
        kind: "rows",
        rows: [
          ...(filled(s.titelVor) ? [{ label: "Titel vor", value: s.titelVor }] : []),
          { label: "Vorname", value: s.vorname || "-" },
          { label: "Nachname", value: s.nachname || "-" },
          ...(filled(s.titelNach) ? [{ label: "Titel nach", value: s.titelNach }] : []),
          ...(filled(s.rufname) ? [{ label: "Rufname", value: s.rufname }] : []),
          { label: "Geschlecht", value: s.geschlecht || "-" },
          { label: "Geburtsdatum", value: s.geburt || "-" },
          { label: "Nationalität", value: { kind: "flag", text: s.nationalitaet || "Österreich" } },
          ...(filled(s.svNummer) ? [{ label: "SV-Nummer", value: s.svNummer }] : []),
        ],
      },
      ...(employee
        ? [
            {
              kind: "group" as const,
              caption: "Personalnummer",
              rows: [
                { label: "Nummer", value: `MW-${String(1000 + (h % 9000))}` },
                { label: "Gültig ab", value: `${anstellung.eintrittTag}.${anstellung.eintrittMonat}.${anstellung.eintrittJahr}` },
              ],
            },
          ]
        : []),
      ...(filled(s.notiz) ? [{ kind: "note" as const, caption: "Allgemeine Notiz zum Partner", text: s.notiz }] : []),
      ...(s.dokumente?.length
        ? [
            {
              kind: "files" as const,
              caption: "Dokumente",
              rows: s.dokumente.map((file) => ({
                label: file.docTyp || file.label,
                value: { kind: "file" as const, text: file.name, type: file.type, docTyp: file.docTyp, von: file.von, bis: file.bis, aussteller: file.aussteller },
              })),
            },
          ]
        : []),
    ],
  };

  // Kontakte: the person's own (private) contact card; a Mitarbeiter also has the Firma card (Bewerber: none).
  const privat: Card = {
    id: "ma-kontakt",
    title: `Kontaktdaten von ${s.vorname || person.name}`,
    blocks: [
      { kind: "person", tag: typ, name: [s.vorname, s.nachname].filter(Boolean).join(" ") || person.name, sub: s.geburt },
      ...(filled(s.contactNotiz) ? [{ kind: "note" as const, caption: "Allgemeine Kontaktnotiz", text: s.contactNotiz }] : []),
      {
        kind: "rows",
        rows: [
          ...s.phones.filter((c) => filled(c.value)).map((c) => ({ label: c.extra || "Mobil", value: c.value, icon: a.phone, action: true })),
          ...s.mails.filter((c) => filled(c.value)).map((c) => ({ label: "Mail", value: c.value, icon: a.mail, action: true })),
          ...s.websites.filter((c) => filled(c.value)).map((c) => ({ label: "Website & Social Media", value: { kind: "link" as const, text: c.value }, icon: a.globe, action: true })),
        ],
      },
    ],
  };
  const firma: Card = {
    id: "ma-kontakt-firma",
    title: "Firma",
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Telefon Firma", value: phone, icon: a.phone, action: true },
          { label: "Mail Firma", value: mail, icon: a.mail, action: true },
          { label: "Chat", value: `@${mail.split("@")[0]}`, icon: a.comment },
        ],
      },
    ],
  };

  const lines = addressLines(s);
  const adresse: Card | null = lines.length
    ? {
        id: "ma-adresse",
        icon: a.flag,
        title: s.addressTyp || "Hauptwohnsitz",
        blocks: [
          { kind: "rows", rows: [{ label: "Adresse", value: { kind: "link", text: lines.join("\n") } }] },
          ...(filled(s.addressNotiz) ? [{ kind: "note" as const, caption: "Notiz zur Adresse", text: s.addressNotiz }] : []),
        ],
      }
    : null;

  const bank: Card | null = s.bank
    ? {
        id: "ma-bank-konto",
        title: `${s.bank.institut || "Bank"} - ${s.bank.inhaber}`,
        blocks: [
          {
            kind: "rows",
            rows: [
              { label: "Kontoinhaber", value: s.bank.inhaber || "-" },
              { label: "Kreditinstitut", value: s.bank.institut || "-" },
              { label: "IBAN", value: s.bank.iban || "-" },
              { label: "BIC", value: s.bank.bic || "-" },
            ],
          },
          ...(s.bank.notiz ? [{ kind: "note" as const, caption: "Notiz zur Bankverbindung", text: s.bank.notiz }] : []),
          ...(employee
            ? [
                {
                  kind: "usage" as const,
                  icon: a.bank,
                  caption: "Bankonto Verwendung",
                  text: "Diese Bankkonto wird wie folgt verwendet:",
                  rows: [
                    { label: "Gehalt", value: "Monatlich, Makler Winter" },
                    { label: "Reisekosten", value: "Nach Abrechnung" },
                  ],
                },
              ]
            : []),
        ],
      }
    : null;

  const anstellungCard: Card = {
    id: "ma-anstellung",
    icon: a.suitcaseWork,
    title: "Anstellung",
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Abteilung", value: person.abteilung || "-" },
          { label: "Position", value: anstellung.position || "-" },
          { label: "Vorgesetzte/r", value: anstellung.vorgesetzt || "-" },
          { label: "Eintrittsdatum", value: `${anstellung.eintrittTag}.${anstellung.eintrittMonat}.${anstellung.eintrittJahr}` },
          { label: "Standort", value: `Büro ${anstellung.standort}` },
        ],
      },
    ],
  };
  const arbeitszeit: Card = {
    id: "ma-zeit",
    icon: a.aktClock,
    title: "Arbeitszeit & Urlaub",
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Beschäftigungsausmaß", value: anstellung.ausmass },
          { label: "Wochenstunden", value: `${anstellung.wochenstunden} h` },
          { label: "Urlaubsanspruch", value: `${anstellung.urlaub} Tage / Jahr` },
          { label: "Resturlaub", value: `${Math.max(0, person.urlaubAnspruch - person.urlaubVerbraucht)} Tage` },
        ],
      },
    ],
  };

  const system: Card = {
    id: "ma-system-daten",
    title: "Systemdaten",
    blocks: [
      {
        kind: "rows",
        caption: "Allgemein",
        rows: [
          { label: "Personentyp", value: s.personentyp || "Mitarbeiter" },
          { label: "Partnertyp", value: typ },
        ],
      },
      {
        kind: "rows",
        caption: "Interne Zuordnung",
        rows: [
          { label: "HRM Zuständigkeit", value: s.hrm || "-" },
          { label: "Mandat", value: s.mandant || "Makler Winter" },
          ...(employee && person.abteilung ? [{ label: "Abteilung", value: person.abteilung }] : []),
        ],
      },
    ],
  };

  const empty = (id: string, icon: string, title: string, link: string): Card => ({ id, empty: { icon, title, lead: "Du kannst", link } });
  // No private phone, mail, website or note yet: the private card is the empty state (Figma 21755:28744 pattern).
  const privatEmpty = ![...s.phones, ...s.mails, ...s.websites].some((c) => filled(c.value)) && !filled(s.contactNotiz);
  const privatCard: Card = privatEmpty ? { id: "ma-kontakt-leer", empty: { icon: a.contacts, title: "Noch keine Kontakte angelegt", lead: "Du kannst", link: "neue Kontakte hier anlegen" } } : privat;
  const kontaktCards = employee ? (privatEmpty ? [firma] : [privat, firma]) : [privatCard];
  const kontaktCount = kontaktCards.filter((card) => !card.empty).length;
  return [
    { id: "personendaten", label: "Allgemeine Personendaten", nav: "Allg. Personendaten", icon: a.navPerson, cards: [personendaten] },
    { id: "kontakte", label: `Kontakte (${kontaktCount})`, nav: `Kontakte (${kontaktCount})`, icon: a.contacts, cards: kontaktCards },
    { id: "adressen", label: `Adressen (${adresse ? 1 : 0})`, nav: `Adressen (${adresse ? 1 : 0})`, icon: a.house, cards: adresse ? [adresse] : [empty("ma-adresse-leer", a.house, "Noch keine Adresse angelegt", "neue Adressen hier anlegen")] },
    { id: "bank", label: "Bankverbindungen", nav: "Bankverbindung", icon: a.bank, cards: bank ? [bank] : [empty("ma-bank-leer", a.bank, "Noch keine Bankverbindung angelegt", "neue Bankverbindungen hier anlegen")] },
    {
      id: "beschaeftigung",
      label: "Beschäftigungsdaten",
      nav: "Beschäftigungsdaten",
      icon: a.suitcaseWork,
      cards:
        employee && hasAnstellung(anstellung)
          ? [anstellungCard, arbeitszeit]
          : [empty("ma-beschaeftigung-leer", a.suitcaseWork, "Noch keine Beschäftigungsdaten angelegt", "neue Beschäftigungsdaten hier anlegen")],
    },
    { id: "systemdaten", label: "Systemdaten", nav: "Systemdaten", icon: a.systemRing, cards: [system] },
  ];
}

/** What Editieren opens: a Stammdaten, Inventar or Kooperation area (each in its own workflow). */
export type EditTarget = AreaId | InvAreaId | KoopAreaId;
export const isInvArea = (target: EditTarget): target is InvAreaId => INV_AREAS.some((area) => area.id === target);
export const isKoopArea = (target: EditTarget): target is KoopAreaId => KOOP_AREAS.some((area) => area.id === target);

/** The Profil's main levels: each is its own page (side nav group → page with its sections). */
export type ProfilLevel = "stammdaten" | "inventar" | "kooperation";
export const levelOf = (target: EditTarget): ProfilLevel => (isInvArea(target) ? "inventar" : isKoopArea(target) ? "kooperation" : "stammdaten");

const kuerzelOf = (s: MaStamm) => `${s.nachname.replace(/[^A-Za-zÄÖÜäöü]/g, "").slice(0, 2)}${s.vorname.slice(0, 2)}`.toUpperCase();

/**
 * The dark business card (Figma 20379:190350). Mitarbeiter: Telefon Firma, Mail Firma, Chat and a status line.
 * Bewerber: only Telefon Privat and Mail Privat (no company phone yet), no status.
 */
export function MaBizCard({ person, stamm }: { person: TeamMember; stamm?: MaStamm }) {
  const s = stamm ?? stammOf(person);
  const employee = isEmployee(person);
  const { phone, mail } = contactOf(person);
  const contacts = employee
    ? [
        { caption: "Telefon Firma", value: phone, icon: a.phone },
        { caption: "Mail Firma", value: mail, icon: a.mail },
        { caption: "Chat", value: `@${mail.split("@")[0]}`, icon: a.comment },
      ]
    : [
        { caption: "Telefon Privat", value: s.phones.find((c) => filled(c.value))?.value ?? "", icon: a.phone },
        { caption: "Mail Privat", value: s.mails.find((c) => filled(c.value))?.value ?? "", icon: a.mail },
      ].filter((c) => c.value);
  const weiblich = s.geschlecht === "Weiblich";
  const name = [s.vorname, s.nachname].filter(Boolean).join(" ") || person.name;
  return (
    // Bewerber / Bewerber Potential (Figma 21745:77159): lighter card, no "W" and no Winter mark – not (yet) Makler Winter.
    <div className={employee ? "ma-bizcard" : "ma-bizcard bewerber"}>
      <img className="ma-bizcard-bg" src={employee ? a.maCardBg : a.maCardBgBewerber} alt="" />
      <img className="ma-bizcard-deco" src={a.maCardDeco} alt="" />
      {employee ? <img className="ma-bizcard-w" src={a.maCardW} alt="" /> : null}
      <span className="ma-bizcard-code">{kuerzelOf(s)}</span>
      <div className="ma-bizcard-head">
        {/* No uploaded Profilfoto: the partner avatar (light disc with the person glyph), not an empty white circle. */}
        <span className={person.photo ? "ma-bizcard-photo" : "ma-bizcard-photo none"}>
          {person.photo ? (
            <img src={person.photo} alt="" />
          ) : !employee ? (
            // Bewerber without Profilfoto (Figma 21748:25274): light disc with the Winter "W".
            <img src={a.bewerberAvatar} alt="" />
          ) : (
            <>
              <img src={a.avatarBg} alt="" />
              <img className="glyph" src={a.clientBlank} alt="" />
            </>
          )}
          {employee ? <img className="ma-bizcard-dot" src={a.statusDot} alt="Online" /> : null}
        </span>
        <div className="ma-bizcard-who">
          <span className={employee ? "chip kunde" : "chip einfach"}>{employee ? (weiblich ? "Mitarbeiterin" : "Mitarbeiter") : person.typ}</span>
          <span className="ma-bizcard-name">
            {employee ? (
              <span className="ma-bizcard-mark">
                <img src={a.maCardWinterBg} alt="" />
                <img className="glyph" src={a.maCardWinter} alt="" />
              </span>
            ) : null}
            {name}
          </span>
          {employee ? <span className="ma-bizcard-status">Verfügbar</span> : null}
        </div>
      </div>
      <div className="ma-bizcard-contacts">
        {contacts.map((contact) => (
          <div className="ma-bizcard-contact" key={contact.caption}>
            <span className="ma-bizcard-icon">
              <img src={a.maCardCircle} alt="" />
              <Icon src={contact.icon} size={18} />
            </span>
            <span>
              <small>{contact.caption}</small>
              <strong>{contact.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MitarbeiterProfil({
  person,
  onEdit,
  level: startLevel = "stammdaten",
}: {
  person: TeamMember;
  onEdit: (area: EditTarget) => void;
  level?: ProfilLevel;
}) {
  const employee = isEmployee(person);
  const [level, setLevel] = useState<ProfilLevel>(startLevel);
  // Bewerber → Mitarbeiter (as Einfache Person → Interessent in the Maklermandat): card, then a confirm dialog.
  const [converting, setConverting] = useState(false);
  const [, rerender] = useState(0);
  const [open, setOpen] = useState<Record<ProfilLevel, boolean>>({ stammdaten: true, inventar: true, kooperation: true });
  const areas = areasOf(person);
  const s = stammOf(person);
  // Inventar and Kooperation: Mitarbeiter only (a Bewerber gets equipment, access and contract once hired).
  const items = inventarOf(person);
  const zugang = zugangOf(person);
  const vertrag = vertragOf(person, anstellungOf(person));
  const invAreas = employee
    ? INV_AREAS.map((area) => ({ id: area.id as EditTarget, label: area.label, nav: area.label, icon: area.icon, cards: invCards(items, area), done: invAreaDone(area.id, items) }))
    : [];
  const koopAreas = employee
    ? KOOP_AREAS.map((area) => ({ id: area.id as EditTarget, label: area.label, nav: area.label, icon: area.icon, cards: koopCards(area.id, zugang, vertrag), done: koopAreaDone(area.id, zugang, vertrag) }))
    : [];
  const groups: { id: ProfilLevel; label: string; icon: string; areas: { id: EditTarget; label: string; nav: string; icon: string; cards: Card[]; done?: boolean }[] }[] = [
    { id: "stammdaten", label: "Stammdaten", icon: a.stammdaten, areas },
    { id: "inventar", label: "Inventar", icon: a.inventory, areas: invAreas },
    { id: "kooperation", label: "Kooperation", icon: a.docList, areas: koopAreas },
  ];
  const group = groups.find((entry) => entry.id === level) ?? groups[0];
  const go = (target: ProfilLevel, id?: string) => {
    setLevel(target);
    setOpen((current) => ({ ...current, [target]: true }));
    if (id) window.setTimeout(() => document.getElementById(`ma-area-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const done = (id: AreaId) => !areas.find((area) => area.id === id)?.cards.some((card) => card.empty);
  const plausi = [
    { label: "Kontakte", target: "kontakte" as EditTarget, icon: a.contacts, done: s.phones.some((c) => filled(c.value)) || s.mails.some((c) => filled(c.value)) },
    { label: "Adressen", target: "adressen" as EditTarget, icon: a.house, done: done("adressen") },
    { label: "Bankverbindung", target: "bank" as EditTarget, icon: a.bank, done: done("bank") },
    { label: "Beschäftigungsdaten", target: "beschaeftigung" as EditTarget, icon: a.suitcaseWork, done: done("beschaeftigung") },
    // Mandatory for a Mitarbeiter: Microsoft 365, an office key or badge, an active Wino Zugang, a signed Dienstvertrag.
    ...(employee
      ? [
          { label: "Inventar", target: "inventar" as EditTarget, icon: a.inventory, done: hasM365(items) },
          { label: "Schlüssel & Badges", target: "schluessel" as EditTarget, icon: a.key, done: hasOfficeKey(items) },
          { label: "Wino Zugang", target: "zugang" as EditTarget, icon: a.winoIconLogo, done: zugangAktiv(zugang) },
          { label: "Dienstvertrag", target: "dienstvertrag" as EditTarget, icon: a.docList, done: vertragSigned(vertrag) },
        ]
      : []),
  ];

  return (
    <ProfileShelfProvider>
      <ShelfBody>
        <aside className="pp-side">
          <header className="pp-side-head">
            <span className="pp-side-glyph">
              <Icon src={a.moduleProfile} size={24} />
            </span>
            <span className="pp-side-title">
              <strong>Profil</strong>
              <small>{person.name}</small>
            </span>
          </header>
          <div className="pp-side-search">
            <Icon src={a.searchDark} size={18} />
            Suchen...
          </div>

          {groups.map((entry) => {
            const active = entry.id === level;
            const expanded = active && open[entry.id] && entry.areas.length > 0;
            return (
              <div key={entry.id}>
                <button
                  type="button"
                  className={active ? "pp-area open" : "pp-area"}
                  aria-expanded={expanded}
                  onClick={() => (active ? setOpen((current) => ({ ...current, [entry.id]: !current[entry.id] })) : go(entry.id))}
                >
                  <span className="pp-area-label">
                    <Icon src={entry.icon} size={18} />
                    {entry.label}
                  </span>
                  <Icon src={expanded ? a.chevronDown : a.chevronDark} size={18} className={expanded ? undefined : "caret-side"} />
                </button>
                {expanded ? (
                  <div className="pp-tree">
                    <div className="pp-tree-group">
                      {entry.areas.map((area) => (
                        <div className="pp-tree-item" key={area.id}>
                          <button type="button" className="pp-tree-main" onClick={() => go(entry.id, area.id)}>
                            <span className="pp-tree-name">
                              <Icon src={area.icon} size={18} />
                              {area.nav}
                            </span>
                            {/* Mandatory item missing: the yellow Offen clock, as in the Plausibilitäts Check. */}
                            {area.done === false ? <Icon src={a.onhold} size={16} className="ma-tree-open" /> : null}
                          </button>
                          {/* Second level (as in the partner Stammdaten): no arrow; ⋮ Editieren shows on hover. */}
                          <span className="pp-tree-trail">
                            <span className="pp-tree-menu">
                              <ContextMenu
                                items={[{ label: "Editieren", icon: a.menuEdit, onSelect: () => onEdit(area.id) }]}
                                label={`${area.label} bearbeiten`}
                              />
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </aside>

        <main className="pp-main">
          <header className="fg-head pp-main-head">
            <ShelfTitle icon={group.icon}>{group.label}</ShelfTitle>
            <span className="fg-head-actions">
              <button type="button" className="fg-head-search" aria-label="Suche">
                <Icon src={a.searchDark} size={18} />
              </button>
            </span>
          </header>

          <div className="pp-strip">
            <div className="pp-strip-main">
              <MaBizCard person={person} />
              <div className="pp-info">
                <small>Info</small>
                <p>{s.notiz || (employee ? `${person.role} in ${person.abteilung || "Makler Winter"}${anstellungOf(person).standort ? `, Büro ${anstellungOf(person).standort}` : ""}.` : `${person.typ} bei Makler Winter.`)}</p>
              </div>
            </div>

            {!employee && level === "kooperation" ? (
              <div className="mm-overview mm-convert ma-convert">
                <header>
                  <Icon src={a.docList} size={22} />
                  Kooperation
                </header>
                <Halo />
                <strong>
                  Zu Mitarbeiter
                  <br />
                  umwandeln
                </strong>
                <p>Als Mitarbeiter bekommt {person.name} Beschäftigungsdaten, Inventar, einen Wino Zugang und einen Dienstvertrag.</p>
                <button type="button" className="btn-secondary mm-start" onClick={() => setConverting(true)}>
                  Umwandlung starten
                </button>
              </div>
            ) : (
            <div className="pp-plausi">
              <header>
                <Icon src={a.plausiCheck} size={22} />
                Plausibilitäts Check
              </header>
              <ul>
                {plausi.map((entry) => (
                  <li key={entry.label}>
                    {/* Every entry opens its own workflow tab on that area. */}
                    <button type="button" className="pp-plausi-link" onClick={() => onEdit(entry.target)} aria-label={`${entry.label} im Workflow öffnen`}>
                      <span className="pp-plausi-icon">
                        <Icon src={entry.icon} size={18} />
                      </span>
                      <span className="pp-plausi-copy">
                        <strong>{entry.label}</strong>
                        <small>{entry.done ? "Abgeschlossen" : "Offen"}</small>
                      </span>
                      <Icon src={entry.done ? a.checkGreen : a.onhold} size={18} />
                    </button>
                  </li>
                ))}
              </ul>
              <a href="#plausi">+2 weitere</a>
            </div>
            )}
          </div>
          {converting ? (
            <ConvertDialog
              person={person}
              onCancel={() => setConverting(false)}
              onConfirm={() => {
                // The new Mitarbeiter lands on the Profil's Stammdaten page (Beschäftigungsdaten still to fill).
                convertToMitarbeiter(person, "");
                setConverting(false);
                rerender((v) => v + 1);
                go("stammdaten");
                window.scrollTo({ top: 0 });
              }}
            />
          ) : null}

          {group.areas.length === 0 ? (
            // Bewerber: Inventar and Kooperation start once the person is a Mitarbeiter.
            <section className="pp-section">
              <div className="pp-cards center">
                <article className="pp-card empty">
                  <div className="pp-empty-art">
                    <span className="plate p3" />
                    <span className="plate p2" />
                    <span className="plate p1" />
                    <span className="orb">
                      <Icon src={group.icon} size={40} />
                    </span>
                  </div>
                  <strong>Noch kein {group.label}</strong>
                  <p>{group.label} gibt es ab dem Partnertyp Mitarbeiter (Systemdaten).</p>
                </article>
              </div>
            </section>
          ) : null}

          {group.areas.map((area) => {
            const isEmpty = area.cards.every((card) => card.empty);
            return (
              <section className="pp-section" id={`ma-area-${area.id}`} key={area.id}>
                <header className="pp-section-head">
                  <span className="pp-section-title">
                    <Icon src={area.icon} size={32} />
                    {area.label}
                  </span>
                  <button type="button" className="btn-primary pp-edit" onClick={() => onEdit(area.id)}>
                    Editieren
                  </button>
                </header>
                <div className={isEmpty ? "pp-cards center" : "pp-cards"}>
                  {area.cards.map((card) => (
                    <div id={card.id} key={card.id} className="ma-card-anchor">
                      <DataCard card={card} onEdit={card.empty ? undefined : () => onEdit(area.id)} onAdd={() => onEdit(area.id)} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </main>
      </ShelfBody>
    </ProfileShelfProvider>
  );
}

/** Bewerber → Mitarbeiter: the person moves from the Bewerber group into the chosen Abteilung. */
export function convertToMitarbeiter(person: TeamMember, abteilung: string) {
  for (const dept of ABTEILUNGEN) dept.people = dept.people.filter((name) => name !== person.name);
  ABTEILUNGEN.find((dept) => dept.name === abteilung)?.people.push(person.name);
  person.typ = "Mitarbeiter";
  person.abteilung = abteilung;
  person.role = person.anstellung?.position || "Mitarbeiter/in";
  if (person.stamm) person.stamm = { ...person.stamm, personentyp: "Mitarbeiter" };
}

const MA_FEATURES = ["Beschäftigungsdaten", "Inventar, Schlüssel & Badges, Benefits", "Wino Zugang", "Dienstvertrag", "und mehr"];

/** The confirm dialog of the Umwandlung (same as "Umwandlung zu Interessenten" in the Maklermandat). */
/**
 * Umwandlung: Bewerber zu Mitarbeiter (Wino - Concepts 21760:103411), the Mitarbeiter version of "Umwandlung zu
 * Interessenten": the compact dark card with Bewerber → Mitarbeiter, what the person gets, Abbrechen / Bestätigen.
 * The Abteilung is set right after, in the Beschäftigungsdaten of the Stammdaten Workflow.
 */
function ConvertDialog({ person, onCancel, onConfirm }: { person: TeamMember; onCancel: () => void; onConfirm: () => void }) {
  const s = stammOf(person);
  const name = [s.vorname, s.nachname].filter(Boolean).join(" ") || person.name;
  // Only what was entered: Telefon / Mail Privat (Bewerber have no Firma contacts).
  const contacts = [
    { caption: "Telefon Privat", value: s.phones.find((c) => filled(c.value))?.value, icon: a.phone },
    { caption: "Mail Privat", value: s.mails.find((c) => filled(c.value))?.value, icon: a.mail },
  ].filter((contact): contact is { caption: string; value: string; icon: string } => Boolean(contact.value));
  return (
    <div className="umw-modal" role="dialog" aria-label="Umwandlung: Bewerber zu Mitarbeiter">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="umw-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">Umwandlung: Bewerber zu Mitarbeiter</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onCancel}>
            <Icon src={a.iconCloseDark} size={12} />
          </button>
        </header>
        <div className="umw-content">
          <Halo size={96} icon={40} />
          <h2 className="ma-umw-title">
            <span>Umwandlung:</span>
            <strong>Bewerber zu Mitarbeiter</strong>
          </h2>
          <div className="umw-panel ma-umw-panel">
            <span className="pp-card-shape" aria-hidden="true" />
            {/* Figma 21760:103433: photo, Bewerber → Mitarbeiter, name, birth date, then Telefon / Mail Privat as entered. */}
            <div className="ma-bizcard ma-umw-card">
              <img className="ma-bizcard-bg" src={a.maCardBg} alt="" />
              <img className="ma-bizcard-deco" src={a.maCardDeco} alt="" />
              <img className="ma-bizcard-w" src={a.maCardW} alt="" />
              <span className="ma-umw-id">ID: {String(1000 + (hash(person.name) % 9000))}</span>
              <div className="ma-umw-head">
                <span className={person.photo ? "ma-bizcard-photo" : "ma-bizcard-photo none"}>
                  {person.photo ? <img src={person.photo} alt="" /> : <img src={a.bewerberAvatar} alt="" />}
                </span>
                <span className="ma-umw-copy">
                  <span className="ma-umw-chips">
                    <span className="chip einfach faded">{person.typ ?? "Bewerber"}</span>
                    <Icon src={a.arrowRight} size={17} className="ma-umw-arrow" />
                    <span className="chip kunde">Mitarbeiter</span>
                  </span>
                  <strong>{name}</strong>
                  {filled(s.geburt) ? <span>{s.geburt}</span> : null}
                </span>
              </div>
              {contacts.length ? (
                <div className="ma-bizcard-contacts ma-umw-contacts">
                  {contacts.map((contact) => (
                    <div className="ma-bizcard-contact" key={contact.caption}>
                      <span className="ma-bizcard-icon">
                        <img src={a.maCardCircle} alt="" />
                        <Icon src={contact.icon} size={18} />
                      </span>
                      <span>
                        <small>{contact.caption}</small>
                        <strong>{contact.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <p>Als Mitarbeiter bekommt diese Person Zugang zu weiteren Funktionen:</p>
            <ul className="umw-features">
              {MA_FEATURES.map((feature) => (
                <li key={feature}>
                  <Icon src={a.tick} size={14} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <footer className="umw-foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Umwandlung bestätigen
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Where a just-created person's tab opens (Profil, or straight into the Stammdaten Workflow). Read once. */
const nextViews = new Map<string, { page: "Profil" | "Dashboard"; edit?: AreaId }>();
export function setNextView(slug: string, view: { page: "Profil" | "Dashboard"; edit?: AreaId }) {
  nextViews.set(slug, view);
}
export function takeNextView(slug: string) {
  const view = nextViews.get(slug);
  nextViews.delete(slug);
  return view;
}

const WORKFLOW_STEPS: { id: AreaId; label: string; icon: string }[] = [
  { id: "personendaten", label: "Allgemeine\nPartnerdaten", icon: a.navPerson },
  { id: "kontakte", label: "Kontakte", icon: a.contacts },
  { id: "adressen", label: "Adressen", icon: a.house },
  { id: "bank", label: "Bankverbindung", icon: a.bank },
  { id: "beschaeftigung", label: "Beschäftigungs-\ndaten", icon: a.suitcaseWork },
  { id: "systemdaten", label: "Systemdaten", icon: a.systemRing },
];

/** "+" pill of an empty area (Figma: "+ Bankverb."). */
const PLUS: Partial<Record<AreaId, string>> = { kontakte: "+ Kontakt", adressen: "+ Adresse", bank: "+ Bankverb." };

type WorkDraft = { stamm: MaStamm; anstellung: Anstellung; abteilung: string; typ: MitarbeiterTyp; photo: string };

/** Puts a saved draft onto the person (and moves them between Abteilung / Bewerber group when that changed). */
function applyDraft(person: TeamMember, draft: WorkDraft) {
  person.stamm = draft.stamm;
  person.photo = draft.photo;
  const name = [draft.stamm.vorname, draft.stamm.nachname].filter(Boolean).join(" ");
  const nowEmployee = draft.typ === "Mitarbeiter";
  for (const dept of ABTEILUNGEN) dept.people = dept.people.filter((p) => p !== person.name);
  if (nowEmployee) {
    person.anstellung = draft.anstellung;
    person.abteilung = draft.abteilung;
    ABTEILUNGEN.find((d) => d.name === draft.abteilung)?.people.push(person.name);
    if (!person.typ || person.typ !== "Mitarbeiter") person.role = draft.anstellung.position || "Mitarbeiter/in";
  } else {
    person.abteilung = "";
    ABTEILUNGEN.find((d) => d.bewerber)?.people.push(person.name);
  }
  person.typ = draft.typ;
  // The tab and lists keep the person's id (their name as created); the Stammdaten carry any spelling change.
  void name;
}

/**
 * Profil → Editieren (Wino - Concepts 21745:72464): the partner Stammdaten workflow for one person. Wave steps per
 * area, the business card on top, the form on the left and "Aktuell in Wino" on the right. Speichern writes the
 * Stammdaten; Abbrechen leaves them as they were.
 */
export function MitarbeiterStammdatenWorkflow({
  person,
  area,
  onArea,
  onClose,
}: {
  person: TeamMember;
  area: AreaId;
  onArea: (area: AreaId) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<WorkDraft>(() => ({
    stamm: structuredClone(stammOf(person)),
    anstellung: { ...anstellungOf(person) },
    abteilung: person.abteilung || ABTEILUNG_NAMEN[0],
    typ: person.typ ?? "Mitarbeiter",
    photo: person.photo,
  }));
  const [saved, setSaved] = useState<string | null>(null);
  const s = draft.stamm;
  const patch = (partial: Partial<MaStamm>) => setDraft((d) => ({ ...d, stamm: { ...d.stamm, ...partial } }));
  const [bankFiles, setBankFiles] = useState<BankForm["files"]>([]);
  const patchA = (partial: Partial<Anstellung>) => setDraft((d) => ({ ...d, anstellung: { ...d.anstellung, ...partial } }));
  const [gebTag = "", gebMonat = "", gebJahr = ""] = s.geburt.split(".");
  const setGeb = (t: string, m: string, y: string) => patch({ geburt: [t, m, y].join(".") });
  const current = areasOf(person).find((entry) => entry.id === area);
  const isEmptyArea = Boolean(current?.cards.length) && Boolean(current?.cards.every((card) => card.empty));
  const bank = s.bank ?? { inhaber: [s.vorname, s.nachname].filter(Boolean).join(" "), iban: "", bic: "", institut: "" };
  const [snack, setSnack] = useState<{ id: number; message: string } | null>(null);
  // As in the partner Stammdaten Workflow: Speichern stays in the workflow, shows a snackbar and the
  // "Aktuell in Wino" cards on the right show the saved data right away.
  const save = (publish: boolean) => {
    applyDraft(person, draft);
    if (publish) {
      setSaved(null);
      setSnack({ id: Date.now(), message: "Änderungen gespeichert." });
    } else setSaved("Entwurf gespeichert.");
  };

  return (
    <div className="content-shell ma-wf">
      <WaveStepper active={area} className="sw-stepper">
        {(overflow) =>
          WORKFLOW_STEPS.map((step, index) => (
            <button key={step.id} type="button" className={`step${area === step.id ? " active" : ""}`} onClick={() => onArea(step.id)}>
              <span className={`step-num${area === step.id ? " active" : ""}`}>
                <img src={area === step.id ? a.stepActive : a.stepDone} alt="" />
                <span className="sw-step-icon">
                  <Icon src={step.icon} size={16} />
                </span>
              </span>
              {overflow && index === WORKFLOW_STEPS.length - 1 ? <StepFade /> : null}
              <span className="step-label">
                {step.label.split("\n").map((line) => (
                  <span key={line} style={{ display: "block" }}>
                    {line}
                  </span>
                ))}
              </span>
            </button>
          ))
        }
      </WaveStepper>

      <div className="sw-body">
        <div className="sw-strip">
          <MaBizCard person={{ ...person, photo: draft.photo, typ: draft.typ }} stamm={s} />
          <button type="button" className="sw-version">
            <Icon src={a.history} size={16} />
            Version 1
          </button>
        </div>

        <main className="sw-main">
          <div className="sw-forms">
            <form className="sw-form pa-card" onSubmit={(event) => event.preventDefault()}>
              {area === "personendaten" ? (
                <>
                  <h2>Allgemeine Partnerdaten</h2>
                  <Field label="Titel vor">
                    <Select value={s.titelVor} onChange={(v) => patch({ titelVor: v })} options={["Mag.", "Dr.", "Ing."]} />
                  </Field>
                  <Field label="Vorname">
                    <Text value={s.vorname} onChange={(v) => patch({ vorname: v })} />
                  </Field>
                  <Field label="Nachname">
                    <Text value={s.nachname} onChange={(v) => patch({ nachname: v })} />
                  </Field>
                  <Field label="Titel nach">
                    <Select value={s.titelNach} onChange={(v) => patch({ titelNach: v })} options={["BA", "MA", "MSc"]} />
                  </Field>
                  <Field label="Rufname">
                    <Text value={s.rufname} onChange={(v) => patch({ rufname: v })} />
                  </Field>
                  <Field label="Geschlecht">
                    <Select value={s.geschlecht} onChange={(v) => patch({ geschlecht: v })} options={["Weiblich", "Männlich", "Divers"]} />
                  </Field>
                  <Field label="Geburtsdatum">
                    <DateField prefix="Am" day={gebTag} month={gebMonat} year={gebJahr} onDay={(v) => setGeb(v, gebMonat, gebJahr)} onMonth={(v) => setGeb(gebTag, v, gebJahr)} onYear={(v) => setGeb(gebTag, gebMonat, v)} />
                  </Field>
                  <Field label="Nationalität">
                    <Select value={s.nationalitaet} onChange={(v) => patch({ nationalitaet: v })} options={["Österreich", "Deutschland", "Schweiz", "Andere"]} />
                  </Field>
                  <Field label="Sozialversicherungsnummer">
                    <Text value={s.svNummer} onChange={(v) => patch({ svNummer: v })} />
                  </Field>
                  <Field label="Allgemeine Notiz zum Partner">
                    <textarea className="textarea" value={s.notiz} onChange={(event) => patch({ notiz: event.target.value })} />
                  </Field>
                  {/* Profilfoto: Mitarbeiter only (the partner Stammdaten have none). */}
                  <PhotoUpload photo={draft.photo} onPhoto={(photo) => setDraft((d) => ({ ...d, photo }))} />
                  <div className="sw-group">
                    <h3>Dokumente hochladen</h3>
                    <Drop
                      documents
                      files={s.dokumente ?? []}
                      onFiles={(dokumente) => patch({ dokumente })}
                      context={{ source: "partner.stammdaten.anhang", entityType: null, entityId: null, slot: "dokument", knownMetadata: {} }}
                    />
                  </div>
                </>
              ) : area === "kontakte" ? (
                <>
                  {/* Wino - Concepts 21745:72955: the partner contact form for the person's own card. */}
                  <ContactFields
                    own={{ photo: draft.photo }}
                    form={{
                      kind: "person",
                      partner: [s.vorname, s.nachname].filter(Boolean).join(" ") || person.name,
                      bezeichnung: `Kontaktdaten von ${s.vorname || person.name}`,
                      notiz: s.contactNotiz,
                      phones: s.phones,
                      mails: s.mails,
                      websites: s.websites,
                    }}
                    onChange={(form) => patch({ contactNotiz: form.notiz, phones: form.phones, mails: form.mails, websites: form.websites })}
                  />
                </>
              ) : area === "adressen" ? (
                <>
                  <h2>Adressdaten</h2>
                  <Field label="Adressart">
                    <Select value={s.addressTyp} onChange={(v) => patch({ addressTyp: v })} options={["Hauptwohnsitz", "Nebenwohnsitz", "Postadresse"]} />
                  </Field>
                  <Field label="Strasse">
                    <Text value={s.strasse} onChange={(v) => patch({ strasse: v })} />
                  </Field>
                  <Field label="Nummer">
                    <Text value={s.nummer} onChange={(v) => patch({ nummer: v })} />
                  </Field>
                  <Field label="Adresszusatz">
                    <Text value={s.zusatz} onChange={(v) => patch({ zusatz: v })} />
                  </Field>
                  <Field label="PLZ">
                    <Text value={s.plz} onChange={(v) => patch({ plz: v })} />
                  </Field>
                  <Field label="Ort">
                    <Text value={s.ort} onChange={(v) => patch({ ort: v })} />
                  </Field>
                  <Field label="Land">
                    <Select value={s.land} onChange={(v) => patch({ land: v })} options={["Österreich", "Deutschland", "Schweiz"]} />
                  </Field>
                  <Field label="Notiz zur Adresse">
                    <textarea className="textarea" value={s.addressNotiz} onChange={(event) => patch({ addressNotiz: event.target.value })} />
                  </Field>
                </>
              ) : area === "bank" ? (
                // Figma 21755:28744: the partner "Konto Details" form (Person auswählen, IBAN, BIC, Kreditinstitut,
                // Notiz, Dokumente hochladen); the person is the Kontoinhaber.
                <BankFields
                  form={{ person: bank.inhaber, iban: bank.iban, bic: bank.bic, institut: bank.institut, notiz: bank.notiz ?? "", files: bankFiles }}
                  onChange={(form: BankForm) => {
                    setBankFiles(form.files);
                    patch({ bank: { inhaber: form.person || person.name, iban: form.iban, bic: form.bic, institut: form.institut, notiz: form.notiz } });
                  }}
                  partnerId={slugOf(person.name)}
                  holder={person.name}
                  people={[]}
                  lookup={() => null}
                  onOpenOwner={() => undefined}
                />
              ) : area === "beschaeftigung" ? (
                <>
                  <h2>Beschäftigungsdaten</h2>
                  {draft.typ !== "Mitarbeiter" ? (
                    <p className="ma-wf-hint">Beschäftigungsdaten gibt es ab dem Partnertyp Mitarbeiter (Systemdaten).</p>
                  ) : null}
                  <fieldset className="sw-fieldset" disabled={draft.typ !== "Mitarbeiter"}>
                    <Field label="Abteilung">
                      <Select value={draft.abteilung} onChange={(v) => setDraft((d) => ({ ...d, abteilung: v }))} options={ABTEILUNG_NAMEN} />
                    </Field>
                    <Field label="Position">
                      <Select
                        value={draft.anstellung.position}
                        onChange={(v) => patchA({ position: v })}
                        options={POSITIONEN.includes(draft.anstellung.position) || !draft.anstellung.position ? POSITIONEN : [draft.anstellung.position, ...POSITIONEN]}
                      />
                    </Field>
                    <Field label="Vorgesetzte/r">
                      <Select value={draft.anstellung.vorgesetzt} onChange={(v) => patchA({ vorgesetzt: v })} options={TEAM.filter((m) => isEmployee(m) && m.name !== person.name).map((m) => m.name)} />
                    </Field>
                    <Field label="Eintrittsdatum">
                      <DateField
                        prefix="Am"
                        day={draft.anstellung.eintrittTag}
                        month={draft.anstellung.eintrittMonat}
                        year={draft.anstellung.eintrittJahr}
                        onDay={(v) => patchA({ eintrittTag: v })}
                        onMonth={(v) => patchA({ eintrittMonat: v })}
                        onYear={(v) => patchA({ eintrittJahr: v })}
                      />
                    </Field>
                    <Field label="Beschäftigungsausmaß">
                      <Select value={draft.anstellung.ausmass} onChange={(v) => patchA({ ausmass: v, wochenstunden: v === "Vollzeit" ? "38,5" : "20" })} options={["Vollzeit", "Teilzeit", "Geringfügig"]} />
                    </Field>
                    <Field label="Wochenstunden">
                      <Text value={draft.anstellung.wochenstunden} onChange={(v) => patchA({ wochenstunden: v })} />
                    </Field>
                    <Field label="Standort">
                      <Select value={draft.anstellung.standort} onChange={(v) => patchA({ standort: v })} options={["Schladming", "Kapfenberg", "Homeoffice"]} />
                    </Field>
                    <Field label="Urlaubsanspruch (Tage/Jahr)">
                      <Text value={draft.anstellung.urlaub} onChange={(v) => patchA({ urlaub: v })} />
                    </Field>
                  </fieldset>
                </>
              ) : (
                <>
                  <h2>Systemdaten</h2>
                  <Field label="Mandant">
                    <Select value={s.mandant} onChange={(v) => patch({ mandant: v })} options={["Makler Winter", "Brombauer & Partner"]} />
                  </Field>
                  <Field label="Partnertyp">
                    <Select
                      value={draft.typ}
                      onChange={(v) => setDraft((d) => ({ ...d, typ: v as MitarbeiterTyp, stamm: { ...d.stamm, personentyp: v === "Mitarbeiter" ? "Mitarbeiter" : d.stamm.personentyp } }))}
                      options={["Bewerber Potential", "Bewerber", "Mitarbeiter"]}
                    />
                  </Field>
                  <Field label="Personentyp">
                    <Select value={s.personentyp} onChange={(v) => patch({ personentyp: v })} options={["Privatperson", "Unternehmen (Firmenb.)", "Öffentl. Einrichtung", "Vereine (ZVR-Nr.)", "Mitarbeiter"]} />
                  </Field>
                  <Field label="HRM Zuständigkeit">
                    <Select value={s.hrm} onChange={(v) => patch({ hrm: v })} options={HRM_NAMES().length ? HRM_NAMES() : ["Adams Anna"]} />
                  </Field>
                </>
              )}
            </form>
          </div>

          {/* Empty area (Figma 21755:28744, the empty-state pattern): the form is open on the left; the right panel
              only reports that Wino has nothing yet, its link and "+" pill lead into the form. */}
          <aside className={isEmptyArea ? "sw-preview empty" : "sw-preview"}>
            <header className="sw-preview-head">
              <span>
                <Icon src={current?.icon ?? a.stammdaten} size={22} />
                {area === "bank" ? "Bankverbindung" : (current?.label ?? "Stammdaten")}
              </span>
              {isEmptyArea && PLUS[area] ? (
                <button type="button" className="btn-primary sw-plus" onClick={focusForm}>
                  <Icon src={current?.icon ?? a.stammdaten} size={16} className="sw-plus-icon" />
                  {PLUS[area]}
                </button>
              ) : null}
            </header>
            {isEmptyArea ? null : <p className="sw-now">Aktuell in Wino</p>}
            <div className="sw-cards">
              {(current?.cards ?? []).map((card) => (
                <DataCard key={card.id} card={card} full onAdd={focusForm} />
              ))}
            </div>
          </aside>
        </main>
      </div>

      <footer className="footer sw-footer">
        <div className="sw-footer-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          {saved ? <span className="ma-wf-saved">{saved}</span> : null}
          <button type="button" className="btn-secondary" onClick={() => save(false)}>
            Entwurf speichern
          </button>
          <button type="button" className="btn-primary" onClick={() => save(true)}>
            <Icon src={a.save} size={16} />
            Speichern
          </button>
        </div>
      </footer>
      {snack ? <Snackbar key={snack.id} message={snack.message} onClose={() => setSnack(null)} /> : null}
    </div>
  );
}

/** "Profilfoto hochladen" (Figma): drop or pick an image; it becomes the person's photo. */
export function PhotoUpload({ photo, onPhoto }: { photo: string; onPhoto: (photo: string) => void }) {
  const read = (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && onPhoto(reader.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="block ma-photo">
      <span className="field-label">Profilfoto hochladen</span>
      {/* Every upload goes through DmsUpload; the picture also lands in the person's DMS (Stammdaten-Anhang). */}
      <DmsUpload
        className="dropzone ma-photo-drop"
        context={{ source: "partner.stammdaten.anhang", entityType: null, entityId: null, slot: "profilfoto", knownMetadata: {} }}
        accept="image/*"
        multiple={false}
        note={false}
        onFiles={(files) => read(files[0])}
      >
        {photo ? <img className="ma-photo-preview" src={photo} alt="Profilfoto" /> : <img src={a.upload} alt="" width={36} height={34} />}
        <span>Dateien hier hinziehen</span>
        <span>oder</span>
        <span className="dropzone-btn">Datei auswählen</span>
      </DmsUpload>
    </div>
  );
}
