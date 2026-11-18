import { useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { DateField, Icon, Notice } from "../ui";
import { DataCard, focusForm } from "../person/cards";
import { Area, Field, Select, Text } from "../person/forms";
import { DmsUpload } from "../dms/upload";
import { SignaturePad } from "../steps/SignStep";
import { StepFade, WaveStepper } from "../stepperOverflow";
import { ABTEILUNG_NAMEN, type TeamMember } from "./hrmTeam";
import { MaBizCard, anstellungOf } from "./MitarbeiterProfil";
import {
  ARTEN,
  KOOP_AREAS,
  KUENDIGUNG,
  PROBEZEITEN,
  ROLLEN,
  UNTERNEHMEN,
  blankVertrag,
  blankZugang,
  euro,
  saveVertrag,
  saveZugang,
  vertragCard,
  vertragOf,
  vertragSigned,
  WINO_USER,
  zugangCard,
  zugangOf,
  type Dienstvertrag,
  type KoopAreaId,
  type WinoZugang,
} from "./kooperation";

type Step = { id: string; label: string; icon: string; done?: boolean };

/**
 * Profil → Kooperation → Editieren: Wino Zugang and Dienstvertrag each run as their own workflow, built like the
 * Stammdaten Workflow (wave steps, business card, form left, preview right, Abbrechen / Entwurf speichern / Weiter).
 */
export function MitarbeiterKoopWorkflow({ person, area, onClose }: { person: TeamMember; area: KoopAreaId; onClose: () => void }) {
  return area === "zugang" ? <ZugangWorkflow person={person} onClose={onClose} /> : <VertragWorkflow person={person} onClose={onClose} />;
}

/** The common frame: steps, business card, two columns, footer. */
function Shell({
  person,
  steps,
  step,
  onStep,
  left,
  right,
  onClose,
  onDraft,
  onNext,
  last,
  saved,
}: {
  person: TeamMember;
  steps: Step[];
  step: string;
  onStep: (id: string) => void;
  left: ReactNode;
  right: ReactNode;
  onClose: () => void;
  onDraft: () => void;
  onNext: () => void;
  last: boolean;
  saved: string | null;
}) {
  const index = steps.findIndex((entry) => entry.id === step);
  return (
    <div className="content-shell ma-wf">
      <WaveStepper active={step} className="sw-stepper">
        {(overflow) =>
          steps.map((entry, at) => (
            <button key={entry.id} type="button" className={`step${step === entry.id ? " active" : ""}`} onClick={() => onStep(entry.id)}>
              <span className={`step-num${step === entry.id ? " active" : ""}`}>
                <img src={step === entry.id ? a.stepActive : a.stepDone} alt="" />
                <span>{at + 1}</span>
              </span>
              {overflow && at === steps.length - 1 ? <StepFade /> : null}
              <span className="step-label">{entry.label}</span>
              {entry.done === undefined ? null : entry.done ? (
                <span className="badge done">
                  <Icon src={a.confirm} size={16} />
                  Fertig
                </span>
              ) : (
                <span className="badge">
                  <Icon src={a.onhold} size={16} />
                  Offen
                </span>
              )}
            </button>
          ))
        }
      </WaveStepper>

      <div className="sw-body">
        <div className="sw-strip">
          <MaBizCard person={person} />
          <button type="button" className="sw-version">
            <Icon src={a.history} size={16} />
            Version 1
          </button>
        </div>
        <main className="sw-main">
          <div className="sw-forms">{left}</div>
          {right}
        </main>
      </div>

      <footer className="footer sw-footer">
        <div className="sw-footer-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          {saved ? <span className="ma-wf-saved">{saved}</span> : null}
          {index > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => onStep(steps[index - 1].id)}>
              Zurück
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={onDraft}>
            Entwurf speichern
          </button>
          <button type="button" className="btn-primary" onClick={onNext}>
            {last ? (
              <>
                <Icon src={a.save} size={16} />
                Speichern
              </>
            ) : (
              "Weiter"
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

/** "Aktuell in Wino": the saved card, or the empty state (Figma 21755:28744). */
function Preview({ id, card, title }: { id: KoopAreaId; card: ReturnType<typeof zugangCard> | null; title?: string }) {
  const area = KOOP_AREAS.find((entry) => entry.id === id)!;
  return (
    <aside className={card ? "sw-preview" : "sw-preview empty"}>
      <header className="sw-preview-head">
        <span>
          <Icon src={area.icon} size={22} />
          {title ?? area.label}
        </span>
      </header>
      {card ? <p className="sw-now">Aktuell in Wino</p> : null}
      <div className="sw-cards">
        {card ? (
          <DataCard card={card} full />
        ) : (
          <DataCard card={{ id: `${id}-leer`, empty: { icon: area.icon, title: area.empty.title, lead: "Du kannst", link: area.empty.link } }} full onAdd={focusForm} />
        )}
      </div>
    </aside>
  );
}

const split = (date: string) => {
  const [d = "", m = "", y = ""] = date.split(".");
  return { d, m, y };
};

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { d, m, y } = split(value);
  return (
    <Field label={label}>
      <DateField prefix="Am" day={d} month={m} year={y} onDay={(v) => onChange([v, m, y].join("."))} onMonth={(v) => onChange([d, v, y].join("."))} onYear={(v) => onChange([d, m, v].join("."))} />
    </Field>
  );
}

const ZUGANG_STEPS = ["zugang", "freigabe", "summary"] as const;

function ZugangWorkflow({ person, onClose }: { person: TeamMember; onClose: () => void }) {
  const existing = zugangOf(person);
  const [draft, setDraft] = useState<WinoZugang>(() => existing ?? blankZugang(person));
  const [step, setStep] = useState<string>("zugang");
  const [saved, setSaved] = useState<string | null>(null);
  const patch = (fields: Partial<WinoZugang>) => setDraft((current) => ({ ...current, ...fields }));
  const formDone = Boolean(draft.benutzer.trim() && draft.mail.trim() && draft.rolle && /\d/.test(draft.gueltigAb));
  const steps: Step[] = [
    { id: "zugang", label: "Zugang", icon: a.winoIconLogo, done: formDone },
    { id: "freigabe", label: "Freigabe", icon: a.request, done: draft.freigabe === "granted" },
    { id: "summary", label: "Zusammenfassung", icon: a.docList },
  ];
  const save = (close: boolean) => {
    saveZugang(person, draft);
    if (close) onClose();
    else setSaved("Entwurf gespeichert.");
  };
  const next = () => {
    const at = ZUGANG_STEPS.indexOf(step as (typeof ZUGANG_STEPS)[number]);
    if (at === ZUGANG_STEPS.length - 1) save(true);
    else setStep(ZUGANG_STEPS[at + 1]);
  };

  const left =
    step === "zugang" ? (
      <form className="sw-form pa-card" onSubmit={(event) => event.preventDefault()}>
        <h2>Wino Zugang</h2>
        <Field label="Benutzername">
          <Text value={draft.benutzer} onChange={(v) => patch({ benutzer: v })} />
        </Field>
        <Field label="Firmen-Mail">
          <Text value={draft.mail} onChange={(v) => patch({ mail: v })} />
        </Field>
        <Field label="Mandant">
          <Select value={draft.mandant} onChange={(v) => patch({ mandant: v })} options={["Makler Winter"]} />
        </Field>
        <Field label="Rolle / Berechtigungsgruppe">
          <Select value={draft.rolle} onChange={(v) => patch({ rolle: v })} options={ROLLEN} />
        </Field>
        <Field label="Abteilung">
          <Select value={draft.abteilung} onChange={(v) => patch({ abteilung: v })} options={ABTEILUNG_NAMEN} />
        </Field>
        <DateInput label="Gültig ab" value={draft.gueltigAb} onChange={(v) => patch({ gueltigAb: v })} />
      </form>
    ) : step === "freigabe" ? (
      // The Freigabe of the Maklervereinbarung: grant it yourself or ask the IT-Management.
      <div className="sw-form pa-card ma-koop-freigabe">
        <h2>Freigabe</h2>
        {draft.freigabe === "idle" ? (
          <Notice tone="pending" title="Freigabe ausstehend">
            Der Wino Zugang wird erst nach der Freigabe aktiv.
          </Notice>
        ) : draft.freigabe === "requested" ? (
          <Notice tone="pending" title="Freigabe angefordert" commentBy="an IT-Management">
            Das IT-Management wurde benachrichtigt und muss den Zugang noch freigeben.
          </Notice>
        ) : (
          <Notice tone="success" title="Zugang freigegeben">
            {draft.freigabeVon === "selbst" ? "Du hast die Freigabe selbst erteilt." : `Freigegeben durch ${draft.freigabeVon}.`}
          </Notice>
        )}
        {draft.freigabe === "granted" ? null : (
          <div className="footer-actions">
            <button type="button" className="btn-secondary" disabled={!formDone} onClick={() => patch({ freigabe: "granted", freigabeVon: "selbst" })}>
              Freigabe selbst erteilen
            </button>
            <button type="button" className="btn-primary" disabled={!formDone || draft.freigabe === "requested"} onClick={() => patch({ freigabe: "requested" })}>
              Freigabe anfordern
            </button>
          </div>
        )}
        {formDone ? null : <p className="ma-wf-hint">Bitte zuerst den Zugang vollständig ausfüllen.</p>}
      </div>
    ) : (
      <div className="sw-form pa-card">
        <h2>Zusammenfassung</h2>
        <DataCard card={zugangCard(draft)} full />
      </div>
    );

  return (
    <Shell
      person={person}
      steps={steps}
      step={step}
      onStep={setStep}
      left={left}
      right={<Preview id="zugang" card={existing ? zugangCard(existing) : null} />}
      onClose={onClose}
      onDraft={() => save(false)}
      onNext={next}
      last={step === "summary"}
      saved={saved}
    />
  );
}

const VERTRAG_STEPS = ["vertrag", "signatur", "summary"] as const;

/** Today as dd.mm.yyyy. */
const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

function VertragWorkflow({ person, onClose }: { person: TeamMember; onClose: () => void }) {
  const anstellung = anstellungOf(person);
  const existing = vertragOf(person, anstellung);
  const [draft, setDraft] = useState<Dienstvertrag>(() => existing ?? blankVertrag(person, anstellung));
  const [step, setStep] = useState<string>("vertrag");
  const [saved, setSaved] = useState<string | null>(null);
  const patch = (fields: Partial<Dienstvertrag>) => setDraft((current) => ({ ...current, ...fields }));
  const formDone = Boolean(/\d/.test(draft.beginn) && draft.position.trim() && draft.abteilung && draft.gehalt.trim());
  const signed = vertragSigned(draft);
  const steps: Step[] = [
    { id: "vertrag", label: "Dienstvertrag", icon: a.docList, done: formDone },
    { id: "signatur", label: "Signaturen", icon: a.docList, done: signed },
    { id: "summary", label: "Zusammenfassung", icon: a.docList },
  ];
  const save = (close: boolean) => {
    // Created by whoever saves it first in Wino; later saves keep the original author.
    const stamped = draft.erstelltVon ? draft : { ...draft, erstelltVon: WINO_USER, erstelltAm: today() };
    setDraft(stamped);
    saveVertrag(person, stamped);
    // The contract and the Beschäftigungsdaten always match: its values are written back.
    const [tag = "", monat = "", jahr = ""] = draft.beginn.split(".");
    person.anstellung = {
      ...anstellung,
      position: draft.position || anstellung.position,
      ausmass: draft.art || anstellung.ausmass,
      wochenstunden: draft.stunden || anstellung.wochenstunden,
      urlaub: draft.urlaub || anstellung.urlaub,
      standort: draft.ort || anstellung.standort,
      ...(/\d/.test(draft.beginn) ? { eintrittTag: tag, eintrittMonat: monat, eintrittJahr: jahr } : {}),
    };
    if (close) onClose();
    else setSaved("Entwurf gespeichert.");
  };
  const next = () => {
    const at = VERTRAG_STEPS.indexOf(step as (typeof VERTRAG_STEPS)[number]);
    if (at === VERTRAG_STEPS.length - 1) save(true);
    else setStep(VERTRAG_STEPS[at + 1]);
  };

  const left =
    step === "vertrag" ? (
      <form className="sw-form pa-card" onSubmit={(event) => event.preventDefault()}>
        <h2>Dienstvertrag</h2>
        <p className="ma-wf-hint">
          {draft.erstelltVon ? `Erstellt von ${draft.erstelltVon} am ${draft.erstelltAm}` : `Wird beim Speichern von ${WINO_USER} erstellt`}
        </p>
        <DateInput label="Dienstbeginn" value={draft.beginn} onChange={(v) => patch({ beginn: v })} />
        <Field label="Unternehmen">
          <Select value={draft.unternehmen} onChange={(v) => patch({ unternehmen: v })} options={UNTERNEHMEN} />
        </Field>
        <Field label="Position / Titel">
          <Text value={draft.position} onChange={(v) => patch({ position: v })} />
        </Field>
        <Field label="Abteilung">
          <Select value={draft.abteilung} onChange={(v) => patch({ abteilung: v })} options={ABTEILUNG_NAMEN} />
        </Field>
        <Field label="Beschäftigungsart">
          <Select value={draft.art} onChange={(v) => patch({ art: v })} options={ARTEN} />
        </Field>
        <Field label="Wochenstunden">
          <Text value={draft.stunden} onChange={(v) => patch({ stunden: v })} />
        </Field>
        <Field label="Monatsgehalt brutto (€)">
          <Text value={draft.gehalt} onChange={(v) => patch({ gehalt: v.replace(/[^\d]/g, "") })} />
        </Field>
        <Field label="Urlaubstage / Jahr">
          <Text value={draft.urlaub} onChange={(v) => patch({ urlaub: v })} />
        </Field>
        <Field label="Probezeit">
          <Select value={draft.probezeit} onChange={(v) => patch({ probezeit: v })} options={PROBEZEITEN} />
        </Field>
        <Field label="Kündigungsfrist">
          <Select value={draft.kuendigung} onChange={(v) => patch({ kuendigung: v })} options={KUENDIGUNG} />
        </Field>
        <Field label="Arbeitsort">
          <Text value={draft.ort} onChange={(v) => patch({ ort: v })} />
        </Field>
        <Field label="Besondere Vereinbarungen">
          <Area value={draft.besonderes} onChange={(v) => patch({ besonderes: v })} />
        </Field>
      </form>
    ) : step === "signatur" ? (
      <div className="sw-form pa-card">
        <h2>Signaturen</h2>
        {signed ? (
          <Notice tone="success" title="Dienstvertrag unterschrieben">
            {draft.signFile ? `${draft.signFile} hochgeladen.` : `Digital unterschrieben am ${draft.unterschriebenAm}.`}
          </Notice>
        ) : (
          <Notice tone="pending" title="Signaturen ausstehend">
            Lade den unterschriebenen Dienstvertrag hoch oder lass ihn digital unterschreiben.
          </Notice>
        )}
        <div className="sw-group">
          <h3>Unterschriebenen Dienstvertrag hochladen</h3>
          <DmsUpload
            context={{ source: "partner.stammdaten.anhang", entityType: null, entityId: null, slot: "dienstvertrag", knownMetadata: {} }}
            accept="application/pdf"
            multiple={false}
            note={false}
            onFiles={(files) => files[0] && patch({ signFile: files[0].name, unterschriebenAm: today() })}
          >
            <Icon src={a.upload} size={36} />
            <span>Dateien hier hinziehen</span>
            <span>oder</span>
            <span className="dropzone-btn">Datei auswählen</span>
          </DmsUpload>
        </div>
        <div className="sw-group">
          <h3>Digital unterschreiben (Arbeitnehmer/in)</h3>
          <SignaturePad disabled={Boolean(draft.signFile)} value={draft.signatur} onChange={(signature) => patch({ signatur: signature, unterschriebenAm: signature ? today() : "" })} />
        </div>
      </div>
    ) : (
      <div className="sw-form pa-card">
        <h2>Zusammenfassung</h2>
        <DataCard card={vertragCard(draft)} full />
      </div>
    );

  return (
    <Shell
      person={person}
      steps={steps}
      step={step}
      onStep={setStep}
      left={left}
      right={
        // Live-Vorschau: the contract on a PDF page, "MUSTER" until it is signed.
        <aside className="sw-preview ma-dv-preview">
          <header className="sw-preview-head">
            <span>
              <Icon src={a.docList} size={22} />
              Live-Vorschau
            </span>
          </header>
          <ContractPage person={person} vertrag={draft} />
        </aside>
      }
      onClose={onClose}
      onDraft={() => save(false)}
      onNext={next}
      last={step === "summary"}
      saved={saved}
    />
  );
}

function ContractPage({ person, vertrag }: { person: TeamMember; vertrag: Dienstvertrag }) {
  const b = (value: string) => <strong>{value || "…"}</strong>;
  return (
    <div className={vertragSigned(vertrag) ? "pdf-page ma-dv-page" : "pdf-page ma-dv-page muster"}>
      <header>
        <strong>{vertrag.unternehmen}</strong>
        <small>Versicherungsmakler · Hauptplatz 1 · 8970 Schladming</small>
      </header>
      <h4>DIENSTVERTRAG</h4>
      <p>
        Zwischen {b(vertrag.unternehmen)} (im Folgenden „Arbeitgeber") und {b(person.name)} (im Folgenden „Arbeitnehmer/in") wird folgender Dienstvertrag geschlossen:
      </p>
      <h5>§1 Beginn des Dienstverhältnisses</h5>
      <p>Das Dienstverhältnis beginnt am {b(/\d/.test(vertrag.beginn) ? vertrag.beginn : "")}.</p>
      <h5>§2 Tätigkeit</h5>
      <p>
        Der/die Arbeitnehmer/in wird als {b(vertrag.position)} in der Abteilung {b(vertrag.abteilung)} eingestellt.
      </p>
      <h5>§3 Arbeitszeit</h5>
      <p>
        Die wöchentliche Arbeitszeit beträgt {b(vertrag.stunden)} Stunden ({vertrag.art}). Der Arbeitsort ist {b(vertrag.ort)}.
      </p>
      <h5>§4 Entgelt</h5>
      <p>Das monatliche Bruttogehalt beträgt {b(vertrag.gehalt ? euro(vertrag.gehalt) : "")}, zahlbar 14x jährlich.</p>
      <h5>§5 Urlaub</h5>
      <p>Der jährliche Urlaubsanspruch beträgt {b(vertrag.urlaub)} Arbeitstage.</p>
      <h5>§6 Probezeit &amp; Kündigung</h5>
      <p>
        Die Probezeit beträgt {b(vertrag.probezeit)}. Die Kündigungsfrist beträgt {b(vertrag.kuendigung)} zum Quartalsende.
      </p>
      {vertrag.besonderes ? (
        <>
          <h5>§7 Besondere Vereinbarungen</h5>
          <p>{vertrag.besonderes}</p>
        </>
      ) : null}
      <footer>
        <span>
          <small>Ort, Datum</small>
          {vertrag.ort || "Schladming"}, {today()}
          <i />
          <small>Arbeitgeber</small>
        </span>
        <span>
          <small>Ort, Datum</small>
          {vertrag.unterschriebenAm ? `${vertrag.ort || "Schladming"}, ${vertrag.unterschriebenAm}` : "________________"}
          {vertrag.signatur ? <img src={vertrag.signatur} alt="Unterschrift" /> : <i />}
          <small>Arbeitnehmer/in</small>
        </span>
      </footer>
    </div>
  );
}
