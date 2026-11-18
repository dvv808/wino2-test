import { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { DateField, Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { DataCard } from "../person/cards";
import { CreateContactFields, Field, Select, Text } from "../person/forms";
import type { ContactChannel } from "../person/stammdaten";
import { PlausiState } from "../person/PlausiState";
import { LeaveConfirm } from "../person/LeaveConfirm";
import { ABTEILUNG_NAMEN, TEAM, registerMember, slugOf, type MaStamm, type MitarbeiterTyp, type TeamMember } from "./hrmTeam";
import { PhotoUpload, areasOf, setNextView, type AreaId } from "./MitarbeiterProfil";

/**
 * Partner anlegen for Mitarbeiter (Wino - Concepts 21726:121330 → 21739:41943 → 21745:72129): the partner create
 * flow for people who work, or might work, at Makler Winter. 1 Personen- & Partnertyp, 2 Daten (Allgemeine
 * Partnerdaten with Profilfoto, Adressdaten, Kontaktdaten; Plausibilitätscheck on Wino and WICO), 3 Zusammenfassung.
 * Contact data is private here: a Bewerber has no company phone or mail yet (that comes once they are Mitarbeiter).
 */
type Step = "typ" | "daten" | "summary";
const STEPS: { id: Step; label: string }[] = [
  { id: "typ", label: "Personen- & Partnertyp" },
  { id: "daten", label: "Daten" },
  { id: "summary", label: "Zusammenfassung" },
];

// Partnertyp and Personentyp go together: a Mitarbeiter is Personentyp Mitarbeiter; Bewerber start as Privatperson.
const TYPEN: MitarbeiterTyp[] = ["Bewerber Potential", "Bewerber", "Mitarbeiter"];
const PERSONENTYPEN = ["Privatperson", "Unternehmen (Firmenb.)", "Öffentl. Einrichtung", "Vereine (ZVR-Nr.)", "Mitarbeiter"];
const personentypFor = (typ: MitarbeiterTyp) => (typ === "Mitarbeiter" ? "Mitarbeiter" : "Privatperson");
const MANDANTEN = ["Makler Winter", "Brombauer & Partner"];

type Draft = {
  mandant: string;
  typ: MitarbeiterTyp;
  personentyp: string;
  verantwortlich: string;
  abteilung: string;
  titelVor: string;
  vorname: string;
  nachname: string;
  titelNach: string;
  rufname: string;
  geschlecht: string;
  gebTag: string;
  gebMonat: string;
  gebJahr: string;
  nationalitaet: string;
  svNummer: string;
  notiz: string;
  photo: string;
  addressTyp: string;
  strasse: string;
  nummer: string;
  zusatz: string;
  plz: string;
  ort: string;
  land: string;
  addressNotiz: string;
  contactNotiz: string;
  phones: ContactChannel[];
  mails: ContactChannel[];
  websites: ContactChannel[];
};

const EMPTY: Draft = {
  mandant: "Makler Winter",
  typ: "Mitarbeiter",
  personentyp: "Mitarbeiter",
  verantwortlich: "Adams Anna",
  abteilung: ABTEILUNG_NAMEN[0],
  titelVor: "",
  vorname: "",
  nachname: "",
  titelNach: "",
  rufname: "",
  geschlecht: "",
  gebTag: "",
  gebMonat: "",
  gebJahr: "",
  nationalitaet: "Österreich",
  svNummer: "",
  notiz: "",
  photo: "",
  addressTyp: "Hauptwohnsitz",
  strasse: "",
  nummer: "",
  zusatz: "",
  plz: "",
  ort: "",
  land: "Österreich",
  addressNotiz: "",
  contactNotiz: "",
  phones: [{ value: "", note: "", extra: "Mobil" }],
  mails: [{ value: "", note: "" }],
  websites: [],
};

const fullName = (d: Draft) => [d.vorname.trim(), d.nachname.trim()].filter(Boolean).join(" ");
const date = (t: string, m: string, y: string) => (t && m && y ? `${t.padStart(2, "0")}.${m.padStart(2, "0")}.${y}` : "");

/** The draft as the person's Stammdaten record. */
function stammFrom(d: Draft): MaStamm {
  return {
    mandant: d.mandant,
    personentyp: d.personentyp,
    hrm: d.verantwortlich,
    titelVor: d.titelVor,
    vorname: d.vorname.trim(),
    nachname: d.nachname.trim(),
    titelNach: d.titelNach,
    rufname: d.rufname,
    geschlecht: d.geschlecht,
    geburt: date(d.gebTag, d.gebMonat, d.gebJahr),
    nationalitaet: d.nationalitaet,
    svNummer: d.svNummer,
    notiz: d.notiz,
    addressTyp: d.addressTyp,
    strasse: d.strasse,
    nummer: d.nummer,
    zusatz: d.zusatz,
    plz: d.plz,
    ort: d.ort,
    land: d.land,
    addressNotiz: d.addressNotiz,
    contactNotiz: d.contactNotiz,
    phones: d.phones.map((c) => ({ ...c, value: c.value.trim() && !c.value.startsWith("+") ? `+43 ${c.value.trim()}` : c.value.trim() })),
    mails: d.mails,
    websites: d.websites,
    bank: null,
  };
}

/** A not yet saved person, so the Zusammenfassung shows the same cards as the Profil later. */
function previewPerson(d: Draft): TeamMember {
  return {
    name: fullName(d) || "Neue Person",
    abteilung: d.typ === "Mitarbeiter" ? d.abteilung : "",
    workflows: 0,
    role: d.typ,
    photo: d.photo,
    urlaubAnspruch: 25,
    urlaubVerbraucht: 0,
    krank: 0,
    krankWoche: 0,
    krankVorwoche: 0,
    dv: 0,
    dvWoche: 0,
    dvVorwoche: 0,
    homeoffice: 0,
    soll: 1640,
    abschluss: true,
    fehler: 0,
    zeitkonto: 0,
    typ: d.typ,
    stamm: stammFrom(d),
  };
}

/** Wino only: people already in the team whose name matches. */
function teamHits(d: Draft): TeamMember[] {
  const vor = d.vorname.trim().toLowerCase();
  const nach = d.nachname.trim().toLowerCase();
  if ((vor + nach).length < 3) return [];
  return TEAM.filter((m) => {
    const name = m.name.toLowerCase();
    return (!nach || name.includes(nach)) && (!vor || name.includes(vor) || name.includes(vor.slice(0, 3)));
  });
}

function CheckPanel({ draft, onOpen }: { draft: Draft; onOpen: (m: TeamMember) => void }) {
  const query = fullName(draft).toLowerCase();
  const ready = query.replace(/\s/g, "").length >= 3;
  const [hits, setHits] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!ready) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      setHits(teamHits(draftRef.current));
      setLoading(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [query, ready]);

  return (
    <aside className="pa-check" aria-busy={loading}>
      <h3>Plausibilitätscheck</h3>
      {loading ? (
        <PlausiState mode="search" sources={["wico", "wino"]}>
          Suche in Wino und WICO…
        </PlausiState>
      ) : !ready ? (
        <PlausiState mode="hint" sources={["wico", "wino"]}>
          Durch Dateneingabe erscheinen hier Treffer aus dem Wino oder WICO.
        </PlausiState>
      ) : hits.length === 0 ? (
        <PlausiState mode="empty" sources={["wico", "wino"]}>
          Keine Treffer im Wino oder WICO.
        </PlausiState>
      ) : (
        hits.map((m) => (
          <article className="pa-hit blocked" key={m.name}>
            <header>
              <span />
              <button type="button" className="pa-hit-open" onClick={() => onOpen(m)}>
                Partner öffnen
                <Icon src={a.openTab} size={14} />
              </button>
            </header>
            <div className="pa-hit-person">
              <span className="emp-avatar ma-hit-avatar">
                {m.photo ? <img src={m.photo} alt="" /> : <img src={a.clientBlank} alt="" />}
              </span>
              <span>
                <span className="chip">{m.typ ?? "Mitarbeiter"}</span>
                <strong>{m.name}</strong>
                <small>
                  {m.role}
                  {m.abteilung ? ` · ${m.abteilung}` : ""}
                </small>
              </span>
            </div>
            <footer>
              <Icon src={a.infoRing20} size={16} />
              Partner gibt es bereits in Wino
            </footer>
          </article>
        ))
      )}
    </aside>
  );
}

export function MitarbeiterCreate({ onClose }: { onClose: () => void }) {
  const { openMitarbeiter } = useWorkflow();
  const [step, setStep] = useState<Step>("typ");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leave = () => setLeaving(true);
  const patch = (partial: Partial<Draft>) => setDraft((d) => ({ ...d, ...partial }));
  const order = STEPS.map((s) => s.id);
  const index = order.indexOf(step);
  const name = fullName(draft);
  const duplicate = teamHits(draft).some((m) => m.name.toLowerCase() === name.toLowerCase());
  const nameMissing = !draft.vorname.trim() || !draft.nachname.trim();
  // Zusammenfassung (Figma 21745:72129): Systemdaten, Allgemeine Partnerdaten, Hauptwohnsitz, Kontaktdaten.
  const areas = areasOf(previewPerson(draft));
  const summary = ["ma-system-daten", "ma-person", "ma-adresse", "ma-kontakt"]
    .map((id) => areas.flatMap((area) => area.cards).find((card) => card.id === id))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));

  function goNext() {
    if (step === "daten") {
      setTried(true);
      if (nameMissing || duplicate) return;
    }
    setStep(order[Math.min(index + 1, order.length - 1)]);
  }

  /** draft: saved, the dialog closes; done: the new person's Profil opens; stammdaten: straight into the workflow. */
  function finish(mode: "draft" | "done" | "stammdaten") {
    if (nameMissing || duplicate) {
      setStep("daten");
      setTried(true);
      return;
    }
    const created = registerMember({
      name,
      role: draft.typ === "Mitarbeiter" ? "Mitarbeiter/in" : draft.typ,
      abteilung: draft.abteilung,
      typ: draft.typ,
      urlaubAnspruch: 25,
      angelegt: {},
    });
    created.stamm = stammFrom(draft);
    created.photo = draft.photo;
    onClose();
    if (mode === "draft") return;
    const slug = slugOf(name);
    // Vervollständigen starts at the first area that is still empty (Bank for a Bewerber).
    const firstOpen = areasOf(created).find((area) => area.cards.some((card) => card.empty))?.id as AreaId | undefined;
    setNextView(slug, mode === "stammdaten" ? { page: "Profil", edit: firstOpen ?? "personendaten" } : { page: "Profil" });
    openMitarbeiter(slug);
  }

  return (
    <div className="umw-modal pa-modal" role="dialog" aria-label="Neuen Partner anlegen">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={leave} />
      <div className="umw-body pa-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">Neuen Partner anlegen</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={leave}>
            <Icon src={a.iconCloseDark} size={12} />
          </button>
        </header>

        <nav className="pa-steps" aria-label="Schritte">
          {STEPS.map((entry, i) => {
            const current = entry.id === step;
            const done = index > i;
            return (
              <button type="button" className={current ? "pa-step active" : done ? "pa-step done" : "pa-step"} key={entry.id} onClick={() => (i <= index ? setStep(entry.id) : goNext())}>
                <span className="pa-step-num">{done ? <img src={a.snackConfirm} alt="" width={34} height={34} /> : i + 1}</span>
                <span>{entry.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pa-main">
          {step === "typ" ? (
            <section className="pa-typ">
              <h2>Personen- &amp; Partnertyp</h2>
              <Field label="Mandant">
                <Select value={draft.mandant} onChange={(v) => patch({ mandant: v })} options={MANDANTEN} />
              </Field>
              <Field label="Partnertyp">
                <Select value={draft.typ} onChange={(v) => patch({ typ: v as MitarbeiterTyp, personentyp: personentypFor(v as MitarbeiterTyp) })} options={TYPEN} />
              </Field>
              <Field label="Personentyp">
                <Select value={draft.personentyp} onChange={(v) => patch({ personentyp: v })} options={PERSONENTYPEN} />
              </Field>
              <HrBeraterPick value={draft.verantwortlich} onPick={(v) => patch({ verantwortlich: v })} />
              {draft.typ === "Mitarbeiter" ? (
                <Field label="Abteilung">
                  <Select value={draft.abteilung} onChange={(v) => patch({ abteilung: v })} options={ABTEILUNG_NAMEN} />
                </Field>
              ) : null}
            </section>
          ) : null}

          {step === "daten" ? (
            <div className="pa-daten">
              <div className="pa-daten-forms">
                <section className="pa-card">
                  <h2>Allgemeine Partnerdaten</h2>
                  <Field label="Titel vor">
                    <Select value={draft.titelVor} onChange={(v) => patch({ titelVor: v })} options={["Mag.", "Dr.", "Ing."]} />
                  </Field>
                  <Field label="Vorname">
                    <Text value={draft.vorname} onChange={(v) => patch({ vorname: v })} />
                  </Field>
                  <Field label="Nachname">
                    <Text value={draft.nachname} onChange={(v) => patch({ nachname: v })} />
                  </Field>
                  {tried && nameMissing ? <p className="ma-error">Bitte Vor- und Nachname angeben.</p> : null}
                  {tried && duplicate ? <p className="ma-error">{name} gibt es in Wino bereits.</p> : null}
                  <Field label="Titel nach">
                    <Select value={draft.titelNach} onChange={(v) => patch({ titelNach: v })} options={["BA", "MA", "MSc"]} />
                  </Field>
                  <Field label="Rufname">
                    <Text value={draft.rufname} onChange={(v) => patch({ rufname: v })} />
                  </Field>
                  <Field label="Geschlecht">
                    <Select value={draft.geschlecht} onChange={(v) => patch({ geschlecht: v })} options={["Weiblich", "Männlich", "Divers"]} />
                  </Field>
                  <Field label="Geburtsdatum">
                    <DateField prefix="Am" day={draft.gebTag} month={draft.gebMonat} year={draft.gebJahr} onDay={(v) => patch({ gebTag: v })} onMonth={(v) => patch({ gebMonat: v })} onYear={(v) => patch({ gebJahr: v })} />
                  </Field>
                  <Field label="Nationalität">
                    <Select value={draft.nationalitaet} onChange={(v) => patch({ nationalitaet: v })} options={["Österreich", "Deutschland", "Schweiz", "Andere"]} />
                  </Field>
                  <Field label="Sozialversicherungsnummer">
                    <Text value={draft.svNummer} onChange={(v) => patch({ svNummer: v })} />
                  </Field>
                  <Field label="Allgemeine Notiz zum Partner">
                    <textarea className="textarea" value={draft.notiz} onChange={(e) => patch({ notiz: e.target.value })} />
                  </Field>
                  <PhotoUpload photo={draft.photo} onPhoto={(photo) => patch({ photo })} />
                </section>

                <section className="pa-card">
                  <h2>Adressdaten</h2>
                  <Field label="Adressart">
                    <Select value={draft.addressTyp} onChange={(v) => patch({ addressTyp: v })} options={["Hauptwohnsitz", "Nebenwohnsitz", "Postadresse"]} />
                  </Field>
                  <Field label="Strasse">
                    <Text value={draft.strasse} onChange={(v) => patch({ strasse: v })} />
                  </Field>
                  <Field label="Nummer">
                    <Text value={draft.nummer} onChange={(v) => patch({ nummer: v })} />
                  </Field>
                  <Field label="Adresszusatz">
                    <Text value={draft.zusatz} onChange={(v) => patch({ zusatz: v })} />
                  </Field>
                  <Field label="PLZ">
                    <Text value={draft.plz} onChange={(v) => patch({ plz: v })} />
                  </Field>
                  <Field label="Ort">
                    <Text value={draft.ort} onChange={(v) => patch({ ort: v })} />
                  </Field>
                  <Field label="Land">
                    <Select value={draft.land} onChange={(v) => patch({ land: v })} options={["Österreich", "Deutschland", "Schweiz"]} />
                  </Field>
                  <Field label="Notiz zur Adresse">
                    <textarea className="textarea" value={draft.addressNotiz} onChange={(event) => patch({ addressNotiz: event.target.value })} />
                  </Field>
                </section>

                <section className="pa-card">
                  <h2>Kontaktdaten</h2>
                  <CreateContactFields
                    notiz={draft.contactNotiz}
                    phones={draft.phones}
                    mails={draft.mails}
                    websites={draft.websites}
                    onNotiz={(contactNotiz) => patch({ contactNotiz })}
                    onPhones={(phones) => patch({ phones })}
                    onMails={(mails) => patch({ mails })}
                    onWebsites={(websites) => patch({ websites })}
                  />
                </section>
              </div>
              <CheckPanel
                draft={draft}
                onOpen={(m) => {
                  onClose();
                  openMitarbeiter(slugOf(m.name));
                }}
              />
            </div>
          ) : null}

          {step === "summary" ? (
            <section className="pa-summary">
              <header>
                <h2>Zusammenfassung</h2>
                <p>Die bisher erfassten Eingaben:</p>
              </header>
              <div className="pa-summary-cards">
                {summary.map((card) => (
                  <DataCard key={card.id} card={card} full />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="pa-foot">
          {step === "typ" ? (
            <button type="button" className="btn-secondary" onClick={leave}>
              Abbrechen
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => setStep(order[index - 1])}>
              Zurück
            </button>
          )}
          <span className="pa-foot-right">
            {step !== "typ" ? (
              <button type="button" className="btn-secondary" onClick={() => finish("draft")}>
                Entwurf speichern
              </button>
            ) : null}
            {step === "summary" ? (
              <button type="button" className="btn-secondary" onClick={() => finish("stammdaten")}>
                Fertig & Stammdaten vervollständigen
              </button>
            ) : null}
            <button type="button" className="btn-primary" onClick={() => (step === "summary" ? finish("done") : goNext())}>
              {step === "summary" ? "Fertig" : "Weiter"}
            </button>
          </span>
        </footer>
      </div>
      {leaving ? (
        <LeaveConfirm
          onStay={() => setLeaving(false)}
          onLeave={onClose}
          onDraft={nameMissing ? undefined : () => finish("draft")}
        />
      ) : null}
    </div>
  );
}

/** HRM Zuständigkeit (Wino - Concepts 21726:121330): the team as an avatar dropdown, "Auswählen" on top. */
function HrBeraterPick({ value, onPick }: { value: string; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const people = TEAM.filter((m) => !m.typ || m.typ === "Mitarbeiter");
  const current = people.find((m) => m.name === value);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => ref.current && !ref.current.contains(event.target as Node) && setOpen(false);
    const key = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="block comms-field hr-pick" ref={ref}>
      <span className="field-label">HRM Zuständigkeit</span>
      <button type="button" className={`text-field hr-pick-field${open ? " open" : ""}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        {current ? <img className="hr-pick-avatar" src={current.photo || a.clientBlank} alt="" /> : null}
        <span>{current?.name ?? "Auswählen"}</span>
        <Icon src={a.selectCaret} size={16} className={open ? "kal-open" : undefined} />
      </button>
      {open ? (
        <div className="comms-menu hr-pick-menu" role="listbox" aria-label="HRM Zuständigkeit">
          <p className="comms-menu-head">Auswählen</p>
          <ul>
            {people.map((m) => {
              const selected = m.name === value;
              return (
                <li key={m.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={selected ? "comms-option selected" : "comms-option"}
                    onClick={() => {
                      onPick(m.name);
                      setOpen(false);
                    }}
                  >
                    <img className="hr-pick-avatar big" src={m.photo || a.clientBlank} alt="" />
                    <span className="comms-option-copy">{m.name}</span>
                    {selected ? <Icon src={a.tick} size={12} className="comms-tick" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
