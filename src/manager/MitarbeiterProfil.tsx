import { useState } from "react";
import * as a from "../assets/index";
import { DateField, Icon } from "../ui";
import { DataCard } from "../person/cards";
import { Field, Select, Text } from "../person/forms";
import { ProfileShelfProvider, ShelfBody, ShelfTitle } from "../person/ProfileShelf";
import type { Card } from "../person/stammdaten";
import { contactOf } from "./MitarbeiterCard";
import { ABTEILUNGEN, ABTEILUNG_NAMEN, TEAM, isEmployee, nameParts, type Anstellung, type TeamMember } from "./hrmTeam";

/**
 * Mitarbeiter tab → Profil (Figma 17315:166324): the partner Stammdaten page, read with an employee in mind.
 * Side nav Profil with the Stammdaten tree (Allgemein, Adressen, Bankverbindung, Beschäftigungsdaten,
 * Kontaktdaten, Systemdaten) plus Inventar and Kooperation; the page has the business card with Plausibilitäts
 * Check, then one section per area built from the same DataCards as the partner Stammdaten.
 * Data comes from "Mitarbeiter anlegen" when the person was created there, otherwise it is seeded per name.
 */

const POSITIONEN = ["Berater/in Versicherungen", "Innendienst", "KFZ Innendienst", "Schadenreferent/in", "Abteilungsleitung", "Lehrling", "Assistenz"];
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = <T,>(list: T[], seed: number) => list[Math.abs(seed) % list.length];
const pad = (n: number) => String(n).padStart(2, "0");

const FEMALE = /^(Anna|Sophie|Lena|Katharina|Julia|Elena|Sarah|Theresa|Laura|Verena|Nina|Lisa|Hannah|Magdalena|Johanna|Eva|Marie|Carina|Sabine|Melanie|Christine|Tamara|Lucy|Jasmin|Sonja|Lily)$/;
const nameOf = nameParts;

/** The head of the person's Abteilung (from the side nav's lead line), or Peter Moser for the heads themselves. */
function vorgesetztOf(person: TeamMember) {
  const dept = ABTEILUNGEN.find((d) => d.name === person.abteilung);
  const lead = dept?.lead.map((line) => line.split(": ")[1]).find((name) => name && name !== person.name && TEAM.some((m) => m.name === name));
  return lead ?? (person.name === "Peter Moser" ? "" : "Peter Moser");
}

/** The Anstellung as edited in Profil, or its seeded default. */
export function anstellungOf(person: TeamMember): Anstellung {
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

type Area = { id: string; label: string; icon: string; cards: Card[] };

export function areasOf(person: TeamMember): Area[] {
  const h = hash(person.name);
  const { vorname, nachname } = nameOf(person);
  const given = person.angelegt ?? {};
  const weiblich = given.Geschlecht ? given.Geschlecht === "Weiblich" : FEMALE.test(vorname.split(" ")[0]);
  const geburt = given.Geburtsdatum || dmy(h, 1968, 36);
  const { phone, mail } = contactOf(person);
  const anstellung = anstellungOf(person);
  const employee = isEmployee(person);
  const [plz, ort] = pick(ORTE, h >>> 2);
  const [bank, bic, iban] = pick(BANKEN, h >>> 4);
  const adresse = given.Adresse || `${pick(STRASSEN, h >>> 5)} ${(h % 48) + 1}, ${plz} ${ort}`;

  // One card, like the partner's "Allgemeine Partnerdaten": the person, then the Personalnummer (employees only).
  const personendaten: Card = {
    id: "ma-person",
    icon: a.navPerson,
    title: "Allgemeine Personendaten",
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Vorname", value: vorname || "-" },
          { label: "Nachname", value: nachname || "-" },
          { label: "Anrede", value: weiblich ? "Frau" : "Herr" },
          { label: "Titel", value: given["Titel vor"] || "Keine" },
          { label: "Geburtsdatum", value: geburt },
          { label: "Nationalität", value: { kind: "flag", text: given.Nationalität || "Österreich" } },
          { label: "Familienstand", value: pick(["Ledig", "Verheiratet", "Verheiratet", "Lebensgemeinschaft", "Geschieden"], h >>> 6) },
          { label: "Beruf", value: anstellung.position || person.role },
        ],
      },
      ...(employee
        ? [
            {
              kind: "group" as const,
              caption: "Personalnummer",
              rows: [
                { label: "Nummer", value: `MW-${String(1000 + (h % 9000))}` },
                { label: "Mandant", value: given.Mandant || "Makler Winter" },
                { label: "Gültig ab", value: `${anstellung.eintrittTag}.${anstellung.eintrittMonat}.${anstellung.eintrittJahr}` },
                { label: "SV-Nummer", value: given["SV-Nummer"] || `${1000 + (h % 8999)} ${geburt.replace(/\./g, "").slice(0, 4)}${geburt.slice(-2)}` },
              ],
            },
          ]
        : []),
      ...(given.Notiz ? [{ kind: "note" as const, caption: "Allgemeine Notiz zum Mitarbeiter", text: given.Notiz }] : []),
    ],
  };

  // Same content as a partner's (Einzelperson) Stammdaten: address as a link, note, Postadresse badge.
  const [strasse, ortZeile] = adresse.split(", ");
  const wohnsitz: Card = {
    id: "ma-adresse",
    icon: a.flag,
    title: given.Adressart || "Hauptwohnsitz",
    blocks: [
      { kind: "rows", rows: [{ label: "Adresse", value: { kind: "link", text: `${strasse}\nA-${ortZeile ?? ""}` } }] },
      {
        kind: "note",
        caption: "Notiz zur Adresse",
        text: given["Notiz zur Adresse"] || (h % 3 === 0 ? "Zieht Ende des Jahres um. Neue Adresse folgt, sobald der Mietvertrag unterschrieben ist." : "-"),
      },
      { kind: "badge", icon: a.house, caption: "Postadresse", text: "Diese Adresse ist die Postadresse" },
    ],
  };

  const kontoinhaber = `${vorname} ${nachname}`.trim();
  const gehaltskonto: Card = {
    id: "ma-bank-konto",
    title: `${bank} - ${kontoinhaber}`,
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Kontoinhaber", value: kontoinhaber },
          { label: "Kreditinstitut", value: bank },
          { label: "IBAN", value: `${iban}${String(100000 + (h % 899999))}`.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ") },
          { label: "BIC", value: bic },
        ],
      },
      { kind: "files", caption: "Anhänge", rows: [{ label: "Bankomatkarte", value: { kind: "file", text: "Foto_bankomat.jpg", type: "jpg" } }] },
      { kind: "note", caption: "Notiz zur Bankverbindung", text: "-" },
      {
        kind: "usage",
        icon: a.bank,
        caption: "Bankonto Verwendung",
        text: "Diese Bankkonto wird wie folgt verwendet:",
        rows: [
          { label: "Gehalt", value: "Monatlich, Makler Winter" },
          { label: "Reisekosten", value: "Nach Abrechnung" },
        ],
      },
    ],
  };

  const anstellungCard: Card = {
    id: "ma-anstellung",
    icon: a.abteilung,
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
          { label: "Homeoffice", value: person.homeoffice ? "erlaubt, bis 30 %" : "nicht vereinbart" },
        ],
      },
    ],
  };

  // Kontakte like the partner Stammdaten: the person, the general contact note, then phones and mails.
  const firma: Card = {
    id: "ma-kontakt-firma",
    title: `Kontaktdaten von ${vorname || person.name}`,
    blocks: [
      { kind: "person", tag: person.typ ?? "Mitarbeiter", name: person.name, sub: [person.role, person.abteilung].filter(Boolean).join(" · ") },
      { kind: "note", caption: "Allgemeine Kontaktnotiz", text: `Am besten über Teams oder die Firmennummer erreichbar, Büro ${anstellung.standort}.` },
      {
        kind: "rows",
        rows: [
          ...(employee ? [{ label: "Telefon", value: phone, icon: a.phone, action: true }] : []),
          { label: "Telefon", value: given.Telefon || `+43 664 ${String(1000000 + (h % 8999999)).replace(/(\d{3})(\d{4})/, "$1 $2")}`, icon: a.phone, action: true },
          ...(employee ? [{ label: "Mail", value: mail, icon: a.mail, action: true }] : []),
          { label: "Mail", value: given["E-Mail"] || `${mail.split("@")[0]}@gmx.at`, icon: a.mail, action: true },
        ],
      },
    ],
  };

  const notfall: Card = {
    id: "ma-kontakt-notfall",
    title: "Notfallkontakt",
    blocks: [
      {
        kind: "person",
        tag: "Einfache Person",
        name: `${pick(["Maria", "Thomas", "Sandra", "Michael", "Barbara", "Josef"], h >>> 8)} ${nachname.split(" ")[0]}`,
        sub: pick(["Partner/in", "Mutter", "Vater", "Schwester", "Bruder"], h >>> 8),
      },
      { kind: "note", caption: "Allgemeine Kontaktnotiz", text: "Nur im Notfall kontaktieren." },
      { kind: "rows", rows: [{ label: "Telefon", value: `+43 676 ${String(1000000 + ((h >>> 3) % 8999999)).replace(/(\d{3})(\d{4})/, "$1 $2")}`, icon: a.phone }] },
    ],
  };

  const system: Card = {
    id: "ma-system-daten",
    icon: a.systemRing,
    title: "Systemdaten",
    blocks: [
      {
        kind: "rows",
        rows: [
          { label: "Wino Benutzer", value: mail.split("@")[0] },
          { label: "Berechtigung", value: person.abteilung === "Unternehmensführung" ? "Administrator" : person.abteilung === "HR-Management" ? "HR" : "Mitarbeiter" },
          { label: "HRM Berater", value: given["HRM Berater"] || "Adams Anna" },
          { label: "Angelegt am", value: dmy(h >>> 9, 2019, 6) },
          { label: "Angelegt von", value: "Adams Anna" },
        ],
      },
    ],
  };

  const areas: Area[] = [
    { id: "ma-allgemein", label: "Allgemeine Personendaten", icon: a.navPerson, cards: [personendaten] },
    { id: "ma-adressen", label: "Adressen", icon: a.house, cards: [wohnsitz] },
    ...(employee ? [{ id: "ma-bank", label: "Bankverbindung", icon: a.bank, cards: [gehaltskonto] }] : []),
    ...(employee ? [{ id: "ma-beschaeftigung", label: "Beschäftigungsdaten", icon: a.abteilung, cards: [anstellungCard, arbeitszeit] }] : []),
    { id: "ma-kontakt", label: "Kontaktdaten", icon: a.contacts, cards: [firma, notfall] },
    { id: "ma-system", label: "Systemdaten", icon: a.systemRing, cards: [system] },
  ];
  return areas;
}

/** Further areas of the employee profile (Figma): shown in the side nav, content still to come. */
const MORE_AREAS = [
  { label: "Inventar", icon: a.category, items: ["Inventar", "Schlüssel & Tokens", "Benefits"] },
  { label: "Kooperation", icon: a.docList, items: ["Dienstvertrag", "Wino Zugang", "DSGVO"] },
];

const PLAUSI = [
  { label: "Adressen", state: "Abgeschlossen", icon: a.house, done: true },
  { label: "Bankdaten", state: "Abgeschlossen", icon: a.bank, done: true },
  { label: "Dienstvertrag", state: "Offen", icon: a.docList, done: false },
  { label: "Anhänge", state: "Offen", icon: a.paperclip, done: false },
];

export function MitarbeiterProfil({ person }: { person: TeamMember }) {
  const [, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [stammOpen, setStammOpen] = useState(true);
  const areas = areasOf(person);
  const employee = isEmployee(person);
  const { phone, mail } = contactOf(person);
  const { vorname, nachname } = nameParts(person);
  const weiblich = person.angelegt?.Geschlecht ? person.angelegt.Geschlecht === "Weiblich" : FEMALE.test(vorname.split(" ")[0]);
  // Kürzel like Figma's "BEAL" (BEnedict ALexandra): first two letters of Nachname and Vorname.
  const kuerzel = `${nachname.replace(/[^A-Za-zÄÖÜäöü]/g, "").slice(0, 2)}${vorname.slice(0, 2)}`.toUpperCase();
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

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

          <button type="button" className="pp-area open" aria-expanded={stammOpen} onClick={() => setStammOpen((open) => !open)}>
            <span className="pp-area-label">
              <Icon src={a.stammdaten} size={18} />
              Stammdaten
            </span>
            <Icon src={stammOpen ? a.chevronDown : a.chevronDark} size={18} className={stammOpen ? undefined : "caret-side"} />
          </button>
          {stammOpen ? (
            <div className="pp-tree">
              <div className="pp-tree-group">
                {areas.map((area) => (
                  <div key={area.id}>
                    <div className="pp-tree-item">
                      <button
                        type="button"
                        className="pp-tree-main"
                        onClick={() => go(area.id)}
                      >
                        <span className="pp-tree-name">
                          <Icon src={area.icon} size={18} />
                          {area.label.replace("Allgemeine", "Allg.")}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {MORE_AREAS.map((area) => (
            <button type="button" className="pp-area" key={area.label} title={area.items.join(", ")}>
              <span className="pp-area-label">
                <Icon src={area.icon} size={18} />
                {area.label}
              </span>
              <Icon src={a.chevronDark} size={18} className="caret-side" />
            </button>
          ))}
        </aside>

        <main className="pp-main">
          <header className="fg-head pp-main-head">
            <ShelfTitle icon={a.stammdaten}>Stammdaten</ShelfTitle>
            <span className="fg-head-actions">
              <button type="button" className="fg-head-search" aria-label="Suche">
                <Icon src={a.searchDark} size={18} />
              </button>
            </span>
          </header>

          <div className="pp-strip">
            <div className="pp-strip-main">
              {/* Mitarbeiter business card (Figma 20379:190350): dark card, photo with coded status dot, Winter mark. */}
              <div className="ma-bizcard">
                <img className="ma-bizcard-bg" src={a.maCardBg} alt="" />
                <img className="ma-bizcard-deco" src={a.maCardDeco} alt="" />
                <img className="ma-bizcard-w" src={a.maCardW} alt="" />
                <span className="ma-bizcard-code">{kuerzel}</span>
                <div className="ma-bizcard-head">
                  <span className="ma-bizcard-photo">
                    <img src={person.photo || a.clientBlank} alt="" className={person.photo ? undefined : "blank"} />
                    {employee ? <img className="ma-bizcard-dot" src={a.statusDot} alt="Online" /> : null}
                  </span>
                  <div className="ma-bizcard-who">
                    <span className={employee ? "chip kunde" : "chip einfach"}>{employee ? (weiblich ? "Mitarbeiterin" : "Mitarbeiter") : person.typ}</span>
                    <span className="ma-bizcard-name">
                      <span className="ma-bizcard-mark">
                        <img src={a.maCardWinterBg} alt="" />
                        <img className="glyph" src={a.maCardWinter} alt="" />
                      </span>
                      {person.name}
                    </span>
                    <span className="ma-bizcard-status">{employee ? "Verfügbar" : "Kein Wino Zugang"}</span>
                  </div>
                </div>
                <div className="ma-bizcard-contacts">
                  {[
                    { caption: "Telefon Firma", value: phone, icon: a.phone },
                    { caption: "Mail Firma", value: mail, icon: a.mail },
                    { caption: "Chat", value: `@${mail.split("@")[0]}`, icon: a.comment },
                  ].map((contact) => (
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
              <div className="pp-info">
                <small>Info</small>
                <p>
                  {person.angelegt?.Notiz ||
                    (employee
                      ? `${person.role} in ${person.abteilung || "Makler Winter"}, Büro ${anstellungOf(person).standort}.`
                      : `${person.typ} bei Makler Winter.`)}
                </p>
              </div>
            </div>

            <div className="pp-plausi">
              <header>
                <Icon src={a.plausiCheck} size={22} />
                Plausibilitäts Check
              </header>
              <ul>
                {PLAUSI.map((entry) => (
                  <li key={entry.label}>
                    <span className="pp-plausi-icon">
                      <Icon src={entry.icon} size={18} />
                    </span>
                    <span className="pp-plausi-copy">
                      <strong>{entry.label}</strong>
                      <small>{entry.state}</small>
                    </span>
                    <Icon src={entry.done ? a.checkGreen : a.onhold} size={18} />
                  </li>
                ))}
              </ul>
              <a href="#plausi">+2 weitere</a>
            </div>
          </div>

          {areas.map((area) => (
            <section className="pp-section" id={area.id} key={area.id}>
              <header className="pp-section-head">
                <span className="pp-section-title">
                  <Icon src={area.icon} size={32} />
                  {area.label}
                </span>
                {area.id === "ma-beschaeftigung" ? (
                  <button type="button" className="btn-primary pp-edit" onClick={() => setEditing((value) => !value)}>
                    {editing ? "Fertig" : "Editieren"}
                  </button>
                ) : null}
              </header>
              {area.id === "ma-beschaeftigung" && editing ? (
                <AnstellungForm
                  person={person}
                  onChange={() => setVersion((v) => v + 1)}
                />
              ) : (
                <div className="pp-cards">
                  {area.cards.map((card) => (
                    <div id={card.id} key={card.id} className="ma-card-anchor">
                      <DataCard card={card} onEdit={area.id === "ma-beschaeftigung" ? () => setEditing(true) : undefined} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </main>
      </ShelfBody>
    </ProfileShelfProvider>
  );
}

/** Beschäftigungsdaten → Editieren: Abteilung, Position, Vorgesetzte/r, Eintritt, Ausmaß, Standort and Urlaub. */
function AnstellungForm({ person, onChange }: { person: TeamMember; onChange: () => void }) {
  const [abteilung, setAbteilung] = useState(person.abteilung);
  const [data, setData] = useState<Anstellung>(() => anstellungOf(person));
  const patch = (partial: Partial<Anstellung>) =>
    setData((d) => {
      const next = { ...d, ...partial };
      person.anstellung = next;
      if (partial.urlaub && Number(partial.urlaub)) person.urlaubAnspruch = Number(partial.urlaub);
      onChange();
      return next;
    });
  const changeAbteilung = (name: string) => {
    for (const dept of ABTEILUNGEN) dept.people = dept.people.filter((p) => p !== person.name);
    ABTEILUNGEN.find((d) => d.name === name)?.people.push(person.name);
    person.abteilung = name;
    setAbteilung(name);
    onChange();
  };
  return (
    <div className="pp-card ma-anstellung">
      <div className="ma-anstellung-grid">
        <Field label="Abteilung">
          <Select value={abteilung} onChange={changeAbteilung} options={ABTEILUNG_NAMEN} />
        </Field>
        <Field label="Position">
          <Select value={data.position} onChange={(v) => patch({ position: v })} options={POSITIONEN.includes(data.position) || !data.position ? POSITIONEN : [data.position, ...POSITIONEN]} />
        </Field>
        <Field label="Vorgesetzte/r">
          <Select value={data.vorgesetzt} onChange={(v) => patch({ vorgesetzt: v })} options={TEAM.filter((m) => isEmployee(m) && m.name !== person.name).map((m) => m.name)} />
        </Field>
        <Field label="Eintrittsdatum">
          <DateField prefix="Am" day={data.eintrittTag} month={data.eintrittMonat} year={data.eintrittJahr} onDay={(v) => patch({ eintrittTag: v })} onMonth={(v) => patch({ eintrittMonat: v })} onYear={(v) => patch({ eintrittJahr: v })} />
        </Field>
        <Field label="Beschäftigungsausmaß">
          <Select value={data.ausmass} onChange={(v) => patch({ ausmass: v, wochenstunden: v === "Vollzeit" ? "38,5" : "20" })} options={["Vollzeit", "Teilzeit", "Geringfügig"]} />
        </Field>
        <Field label="Wochenstunden">
          <Text value={data.wochenstunden} onChange={(v) => patch({ wochenstunden: v })} />
        </Field>
        <Field label="Standort">
          <Select value={data.standort} onChange={(v) => patch({ standort: v })} options={["Schladming", "Kapfenberg", "Homeoffice"]} />
        </Field>
        <Field label="Urlaubsanspruch (Tage/Jahr)">
          <Text value={data.urlaub} onChange={(v) => patch({ urlaub: v })} />
        </Field>
      </div>
    </div>
  );
}
