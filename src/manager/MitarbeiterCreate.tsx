import { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { DateField, Icon, InfoBox } from "../ui";
import { useWorkflow } from "../workflow";
import { CreateContactFields, Field, Select, Text } from "../person/forms";
import type { ContactChannel } from "../person/stammdaten";
import { PlausiState } from "../person/PlausiState";
import { ABTEILUNGEN, TEAM, registerMember, slugOf, type MitarbeiterTyp, type TeamMember } from "./hrmTeam";

/**
 * Mitarbeiter anlegen (Management → Module): the Partner-anlegen flow for people who work, or might work, at
 * Makler Winter. Three types: Mitarbeiter, Bewerber and Bewerber Potential (a candidate we would like to win).
 * The Plausibilitätscheck only looks at Wino (the team we already have), not at the WICO.
 */
type Step = "typ" | "daten" | "summary";
const STEPS: { id: Step; label: string }[] = [
  { id: "typ", label: "Mitarbeitertyp" },
  { id: "daten", label: "Daten" },
  { id: "summary", label: "Zusammenfassung" },
];

const TYPEN: MitarbeiterTyp[] = ["Mitarbeiter", "Bewerber", "Bewerber Potential"];
const MANDANTEN = ["Makler Winter", "Brombauer & Partner"];

type Draft = {
  mandant: string;
  typ: MitarbeiterTyp;
  verantwortlich: string;
  // Persönliche Daten
  titelVor: string;
  vorname: string;
  nachname: string;
  titelNach: string;
  geschlecht: string;
  gebTag: string;
  gebMonat: string;
  gebJahr: string;
  nationalitaet: string;
  svNummer: string;
  // Adressdaten (same fields as Partner anlegen)
  addressTyp: string;
  strasse: string;
  nummer: string;
  zusatz: string;
  plz: string;
  ort: string;
  land: string;
  addressNotiz: string;
  // Kontaktdaten (same panels as Partner anlegen)
  contactNotiz: string;
  phones: ContactChannel[];
  mails: ContactChannel[];
  websites: ContactChannel[];
  // Anstellung (Mitarbeiter)
  abteilung: string;
  position: string;
  vorgesetzt: string;
  eintrittTag: string;
  eintrittMonat: string;
  eintrittJahr: string;
  ausmass: string;
  wochenstunden: string;
  standort: string;
  urlaub: string;
  // Bewerbung (Bewerber)
  stelle: string;
  bewTag: string;
  bewMonat: string;
  bewJahr: string;
  quelle: string;
  verfuegbarAb: string;
  gehalt: string;
  // Potential (Bewerber Potential)
  wunschposition: string;
  kontaktUeber: string;
  naechsterKontakt: string;
  bewertung: string;
  notiz: string;
};

const EMPTY: Draft = {
  mandant: "Makler Winter",
  typ: "Mitarbeiter",
  verantwortlich: "Adams Anna",
  titelVor: "",
  vorname: "",
  nachname: "",
  titelNach: "",
  geschlecht: "",
  gebTag: "",
  gebMonat: "",
  gebJahr: "",
  nationalitaet: "Österreich",
  svNummer: "",
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
  websites: [{ value: "", note: "" }],
  abteilung: ABTEILUNGEN[0].name,
  position: "",
  vorgesetzt: "",
  eintrittTag: "01",
  eintrittMonat: "",
  eintrittJahr: "",
  ausmass: "Vollzeit",
  wochenstunden: "38,5",
  standort: "Schladming",
  urlaub: "25",
  stelle: "Berater/in Versicherungen",
  bewTag: "",
  bewMonat: "",
  bewJahr: "",
  quelle: "Karriereseite",
  verfuegbarAb: "",
  gehalt: "",
  wunschposition: "Berater/in Versicherungen",
  kontaktUeber: "Persönliche Empfehlung",
  naechsterKontakt: "",
  bewertung: "Sehr interessant",
  notiz: "",
};

const POSITIONEN = ["Berater/in Versicherungen", "Innendienst", "KFZ Innendienst", "Schadenreferent/in", "Abteilungsleitung", "Lehrling", "Assistenz"];
const fullName = (d: Draft) => [d.vorname.trim(), d.nachname.trim()].filter(Boolean).join(" ");
const date = (t: string, m: string, y: string) => (t && m && y ? `${t.padStart(2, "0")}.${m.padStart(2, "0")}.${y}` : "");

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
        <PlausiState mode="search" sources={["wino"]}>
          Suche in Wino…
        </PlausiState>
      ) : !ready ? (
        <PlausiState mode="hint" sources={["wino"]}>
          Durch Dateneingabe erscheinen hier Treffer aus dem Wino.
        </PlausiState>
      ) : hits.length === 0 ? (
        <PlausiState mode="empty" sources={["wino"]}>
          Keine Treffer im Wino. Die Person kann neu angelegt werden.
        </PlausiState>
      ) : (
        hits.map((m) => (
          <article className="pa-hit blocked" key={m.name}>
            <header>
              <span />
              <button type="button" className="pa-hit-open" onClick={() => onOpen(m)}>
                Mitarbeiter öffnen
                <Icon src={a.openTab} size={14} />
              </button>
            </header>
            <p className="pa-hit-warn">
              <Icon src={a.attention} size={16} />
              Bereits in Wino. Diese Person wird nicht neu angelegt.
            </p>
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
              <Icon src={a.logoMark} size={16} className="mm-wino" />
              Treffer aus dem Wino
            </footer>
          </article>
        ))
      )}
    </aside>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: [string, string][] }) {
  const shown = rows.filter(([, value]) => value.trim());
  if (!shown.length) return null;
  return (
    <article className="pp-card ma-sum-card">
      <header className="pp-card-head">
        <span className="pp-card-title">{title}</span>
      </header>
      <div className="pp-rows">
        {shown.map(([label, value]) => (
          <div className="pp-row" key={label}>
            <span className="pp-label">{label}</span>
            <span className="pp-val">{value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function MitarbeiterCreate({ onClose }: { onClose: () => void }) {
  const { openMitarbeiter } = useWorkflow();
  const [step, setStep] = useState<Step>("typ");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const patch = (partial: Partial<Draft>) => setDraft((d) => ({ ...d, ...partial }));
  const order = STEPS.map((s) => s.id);
  const index = order.indexOf(step);
  const name = fullName(draft);
  const duplicate = teamHits(draft).some((m) => m.name.toLowerCase() === name.toLowerCase());
  const nameMissing = !draft.vorname.trim() || !draft.nachname.trim();

  const personRows: [string, string][] = [
    ["Mandant", draft.mandant],
    ["Titel vor", draft.titelVor],
    ["Vorname", draft.vorname],
    ["Nachname", draft.nachname],
    ["Titel nach", draft.titelNach],
    ["Geschlecht", draft.geschlecht],
    ["Geburtsdatum", date(draft.gebTag, draft.gebMonat, draft.gebJahr)],
    ["Nationalität", draft.nationalitaet],
    ["SV-Nummer", draft.typ === "Mitarbeiter" ? draft.svNummer : ""],
  ];
  const filled = (items: ContactChannel[]) => items.map((item) => item.value.trim()).filter(Boolean).join(", ");
  const adressRows: [string, string][] = [
    ["Adressart", draft.addressTyp],
    [
      "Adresse",
      [[draft.strasse, draft.nummer].filter(Boolean).join(" "), draft.zusatz, [draft.plz, draft.ort].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", "),
    ],
    ["Land", draft.strasse || draft.plz || draft.ort ? draft.land : ""],
    ["Notiz zur Adresse", draft.addressNotiz],
  ];
  const kontaktRows: [string, string][] = [
    ["Telefon", filled(draft.phones)],
    ["E-Mail", filled(draft.mails)],
    ["Website", filled(draft.websites)],
    ["Kontaktnotiz", draft.contactNotiz],
  ];
  const typRows: [string, string][] =
    draft.typ === "Mitarbeiter"
      ? [
          ["Abteilung", draft.abteilung],
          ["Position", draft.position],
          ["Vorgesetzte/r", draft.vorgesetzt],
          ["Eintritt", date(draft.eintrittTag, draft.eintrittMonat, draft.eintrittJahr)],
          ["Beschäftigungsausmaß", draft.ausmass === "Teilzeit" ? `Teilzeit · ${draft.wochenstunden} h/Woche` : `Vollzeit · ${draft.wochenstunden} h/Woche`],
          ["Standort", draft.standort],
          ["Urlaubsanspruch", draft.urlaub ? `${draft.urlaub} Tage` : ""],
        ]
      : draft.typ === "Bewerber"
        ? [
            ["Stelle", draft.stelle],
            ["Beworben am", date(draft.bewTag, draft.bewMonat, draft.bewJahr)],
            ["Quelle", draft.quelle],
            ["Verfügbar ab", draft.verfuegbarAb],
            ["Gehaltsvorstellung", draft.gehalt ? `EUR ${draft.gehalt} brutto` : ""],
          ]
        : [
            ["Wunschposition", draft.wunschposition],
            ["Kontakt über", draft.kontaktUeber],
            ["Nächster Kontakt", draft.naechsterKontakt],
            ["Einschätzung", draft.bewertung],
          ];
  const typTitle = draft.typ === "Mitarbeiter" ? "Anstellung" : draft.typ === "Bewerber" ? "Bewerbung" : "Potential";

  function goNext() {
    if (step === "daten") {
      setTried(true);
      if (nameMissing || duplicate) return;
    }
    setStep(order[Math.min(index + 1, order.length - 1)]);
  }

  function finish() {
    if (nameMissing || duplicate) {
      setStep("daten");
      setTried(true);
      return;
    }
    const angelegt: Record<string, string> = {};
    for (const [label, value] of [...personRows, ...adressRows, ...kontaktRows, ...typRows, ["Notiz", draft.notiz] as [string, string]]) if (value.trim()) angelegt[label] = value;
    registerMember({
      name,
      role: draft.typ === "Mitarbeiter" ? draft.position || "Mitarbeiter/in" : draft.typ === "Bewerber" ? `Bewerbung: ${draft.stelle}` : `Potential: ${draft.wunschposition}`,
      abteilung: draft.abteilung,
      typ: draft.typ,
      urlaubAnspruch: Number(draft.urlaub) || 25,
      angelegt,
    });
    onClose();
    openMitarbeiter(slugOf(name));
  }

  return (
    <div className="umw-modal pa-modal" role="dialog" aria-label="Neuen Mitarbeiter anlegen">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="umw-body pa-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">Neuen Mitarbeiter anlegen</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onClose}>
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
              <h2>Mitarbeitertyp</h2>
              <Field label="Mandant">
                <Select value={draft.mandant} onChange={(v) => patch({ mandant: v })} options={MANDANTEN} />
              </Field>
              <Field label="Mitarbeitertyp">
                <Select value={draft.typ} onChange={(v) => patch({ typ: v as MitarbeiterTyp })} options={TYPEN} />
              </Field>
              <Field label="Verantwortlich (HR)">
                <Select value={draft.verantwortlich} onChange={(v) => patch({ verantwortlich: v })} options={["Adams Anna", "Peter Moser", "Christine Auer Hammer-schmidt"]} />
              </Field>
            </section>
          ) : null}

          {step === "daten" ? (
            <div className="pa-daten">
              <div className="pa-daten-forms">
                <section className="pa-card">
                  <h2>Persönliche Daten</h2>
                  <Field label="Titel vor">
                    <Select value={draft.titelVor} onChange={(v) => patch({ titelVor: v })} options={["Mag.", "Dr.", "Ing."]} />
                  </Field>
                  <Field label="Vorname*">
                    <Text value={draft.vorname} onChange={(v) => patch({ vorname: v })} />
                  </Field>
                  <Field label="Nachname*">
                    <Text value={draft.nachname} onChange={(v) => patch({ nachname: v })} />
                  </Field>
                  {tried && nameMissing ? <p className="ma-error">Bitte Vor- und Nachname angeben.</p> : null}
                  {tried && duplicate ? <p className="ma-error">{name} gibt es in Wino bereits.</p> : null}
                  <Field label="Titel nach">
                    <Select value={draft.titelNach} onChange={(v) => patch({ titelNach: v })} options={["BA", "MA", "MSc"]} />
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
                  {draft.typ === "Mitarbeiter" ? (
                    <Field label="Sozialversicherungsnummer">
                      <Text value={draft.svNummer} onChange={(v) => patch({ svNummer: v })} />
                    </Field>
                  ) : null}
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

                {draft.typ === "Mitarbeiter" ? (
                  <section className="pa-card">
                    <h2>Anstellung</h2>
                    <Field label="Abteilung">
                      <Select value={draft.abteilung} onChange={(v) => patch({ abteilung: v })} options={ABTEILUNGEN.map((d) => d.name)} />
                    </Field>
                    <Field label="Position">
                      <Select value={draft.position} onChange={(v) => patch({ position: v })} options={POSITIONEN} />
                    </Field>
                    <Field label="Vorgesetzte/r">
                      <Select value={draft.vorgesetzt} onChange={(v) => patch({ vorgesetzt: v })} options={TEAM.filter((m) => !m.typ || m.typ === "Mitarbeiter").map((m) => m.name)} />
                    </Field>
                    <Field label="Eintrittsdatum">
                      <DateField prefix="Am" day={draft.eintrittTag} month={draft.eintrittMonat} year={draft.eintrittJahr} onDay={(v) => patch({ eintrittTag: v })} onMonth={(v) => patch({ eintrittMonat: v })} onYear={(v) => patch({ eintrittJahr: v })} />
                    </Field>
                    <Field label="Beschäftigungsausmaß">
                      <Select value={draft.ausmass} onChange={(v) => patch({ ausmass: v, wochenstunden: v === "Vollzeit" ? "38,5" : "20" })} options={["Vollzeit", "Teilzeit", "Geringfügig"]} />
                    </Field>
                    <Field label="Wochenstunden">
                      <Text value={draft.wochenstunden} onChange={(v) => patch({ wochenstunden: v })} />
                    </Field>
                    <Field label="Standort">
                      <Select value={draft.standort} onChange={(v) => patch({ standort: v })} options={["Schladming", "Kapfenberg", "Homeoffice"]} />
                    </Field>
                    <Field label="Urlaubsanspruch (Tage/Jahr)">
                      <Text value={draft.urlaub} onChange={(v) => patch({ urlaub: v })} />
                    </Field>
                  </section>
                ) : draft.typ === "Bewerber" ? (
                  <section className="pa-card">
                    <h2>Bewerbung</h2>
                    <Field label="Stelle">
                      <Select value={draft.stelle} onChange={(v) => patch({ stelle: v })} options={POSITIONEN} />
                    </Field>
                    <Field label="Beworben am">
                      <DateField prefix="Am" day={draft.bewTag} month={draft.bewMonat} year={draft.bewJahr} onDay={(v) => patch({ bewTag: v })} onMonth={(v) => patch({ bewMonat: v })} onYear={(v) => patch({ bewJahr: v })} />
                    </Field>
                    <Field label="Quelle">
                      <Select value={draft.quelle} onChange={(v) => patch({ quelle: v })} options={["Karriereseite", "karriere.at", "AMS", "LinkedIn", "Initiativbewerbung", "Empfehlung"]} />
                    </Field>
                    <Field label="Verfügbar ab">
                      <Text value={draft.verfuegbarAb} onChange={(v) => patch({ verfuegbarAb: v })} />
                    </Field>
                    <Field label="Gehaltsvorstellung (EUR brutto/Monat)">
                      <Text value={draft.gehalt} onChange={(v) => patch({ gehalt: v })} />
                    </Field>
                    <InfoBox>Lebenslauf und Zeugnisse werden nach dem Anlegen im Mitarbeiter-Tab unter Dokumente hochgeladen.</InfoBox>
                  </section>
                ) : (
                  <section className="pa-card">
                    <h2>Potential</h2>
                    <Field label="Wunschposition">
                      <Select value={draft.wunschposition} onChange={(v) => patch({ wunschposition: v })} options={POSITIONEN} />
                    </Field>
                    <Field label="Kontakt über">
                      <Select value={draft.kontaktUeber} onChange={(v) => patch({ kontaktUeber: v })} options={["Persönliche Empfehlung", "Messe / Event", "LinkedIn", "Kunde", "Mitbewerber"]} />
                    </Field>
                    <Field label="Nächster Kontakt">
                      <Text value={draft.naechsterKontakt} onChange={(v) => patch({ naechsterKontakt: v })} />
                    </Field>
                    <Field label="Einschätzung">
                      <Select value={draft.bewertung} onChange={(v) => patch({ bewertung: v })} options={["Sehr interessant", "Interessant", "Später nochmal ansprechen"]} />
                    </Field>
                  </section>
                )}

                <section className="pa-card">
                  <h2>Notiz</h2>
                  <Field label={draft.typ === "Mitarbeiter" ? "Allgemeine Notiz zum Mitarbeiter" : "Notiz zur Person"}>
                    <textarea className="textarea" value={draft.notiz} onChange={(e) => patch({ notiz: e.target.value })} />
                  </Field>
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
                <p>
                  {draft.typ}: {name || "ohne Namen"}
                </p>
              </header>
              <div className="pa-summary-cards">
                <SummaryCard title="Persönliche Daten" rows={personRows} />
                <SummaryCard title="Adressdaten" rows={adressRows} />
                <SummaryCard title="Kontaktdaten" rows={kontaktRows} />
                <SummaryCard title={typTitle} rows={typRows} />
                <SummaryCard title="Notiz" rows={[["Notiz", draft.notiz]]} />
              </div>
            </section>
          ) : null}
        </div>

        <footer className="pa-foot">
          {step === "typ" ? (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Abbrechen
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => setStep(order[index - 1])}>
              Zurück
            </button>
          )}
          <span className="pa-foot-right">
            <button type="button" className="btn-primary" onClick={() => (step === "summary" ? finish() : goNext())}>
              {step === "summary" ? `${draft.typ} anlegen` : "Weiter"}
            </button>
          </span>
        </footer>
      </div>
    </div>
  );
}
