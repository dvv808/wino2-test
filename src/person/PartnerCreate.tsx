import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { DateField, Icon, InfoBox } from "../ui";
import { useWorkflow } from "../workflow";
import { DataCard } from "./cards";
import { CreateContactFields, Field, Select, Text } from "./forms";
import {
  applyHit,
  buildCreatedPartner,
  EMPTY_DRAFT,
  ensureWicoSelection,
  relatedPartnersFromDraft,
  searchHits,
  summaryCards,
  wicoAlreadyInWino,
  toggleWicoLink,
  wicoLinksFor,
  wicoSectionsOf,
  type CheckHit,
  type CreateStep,
  type PartnerDraft,
  type WicoLink,
} from "./createDraft";

const STEPS: { id: CreateStep; label: string }[] = [
  { id: "typ", label: "Personen- &\nPartnertyp" },
  { id: "daten", label: "Daten" },
  { id: "wico", label: "WICO Daten" },
  { id: "summary", label: "Zusammenfassung" },
];

function stepsFor(draft: PartnerDraft) {
  if (draft.personTyp === "Unternehmen" && draft.assignedHit?.source === "wico") return STEPS;
  return STEPS.filter((step) => step.id !== "wico");
}

function CheckCard({
  hit,
  assigned,
  onAssign,
  onOpen,
}: {
  hit: CheckHit;
  assigned: boolean;
  onAssign: () => void;
  onOpen?: () => void;
}) {
  const blocked = hit.source === "wino" || Boolean(hit.alreadyInWino);
  return (
    <article
      className={blocked ? "pa-hit blocked" : assigned ? "pa-hit clickable assigned" : "pa-hit clickable"}
      onClick={blocked ? undefined : onAssign}
    >
      <header>
        <label className={blocked ? "pa-hit-assign dim" : "pa-hit-assign"} onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={assigned} disabled={blocked} onChange={onAssign} />
          Zuweisen
        </label>
        {hit.partnerId ? (
          <button
            type="button"
            className="pa-hit-open"
            onClick={(event) => {
              event.stopPropagation();
              onOpen?.();
            }}
          >
            Partner öffnen
            <Icon src={a.openTab} size={14} />
          </button>
        ) : (
          <button type="button" className="pa-hit-open" onClick={(event) => event.stopPropagation()}>
            Im WICO öffnen
            <Icon src={a.openTab} size={14} />
          </button>
        )}
      </header>
      {hit.alreadyInWino ? (
        <p className="pa-hit-warn">
          <Icon src={a.attention} size={16} />
          Bereits in Wino angelegt. Dieser Partner kann nicht neu zugewiesen werden.
        </p>
      ) : null}
      <div className="pa-hit-person">
        <span className="pp-person-avatar">
          <img src={a.avatarBg} alt="" width={32} height={32} />
          <img className="glyph" src={hit.party === "company" ? a.companyBlank : a.personSmall} alt="" width={21} height={21} />
        </span>
        <span>
          {hit.tag ? <span className={hit.tag === "Kunde" ? "chip kunde" : "chip"}>{hit.tag}</span> : null}
          <strong>{hit.name}</strong>
          {hit.sub ? <small>{hit.sub}</small> : null}
        </span>
      </div>
      {hit.address ? <p className="pa-hit-address">{hit.address}</p> : null}
      <footer>
        <Icon
          src={hit.source === "wico" ? a.iconWico : a.logoMark}
          size={16}
          className={hit.source === "wino" ? "mm-wino" : undefined}
        />
        {hit.source === "wico" ? "Treffer aus dem WICO" : "Treffer aus dem Wino"}
      </footer>
    </article>
  );
}

function checkQuery(draft: PartnerDraft) {
  return draft.personTyp === "Unternehmen"
    ? draft.firmenwortlaut.trim()
    : `${draft.vorname} ${draft.nachname}`.trim();
}

function CheckSkeleton() {
  return (
    <article className="pa-hit pa-hit-skel" aria-hidden>
      <header>
        <span className="pa-skel-bar short" />
        <span className="pa-skel-bar short" />
      </header>
      <div className="pa-hit-person">
        <span className="pa-skel-avatar" />
        <span className="pa-skel-copy">
          <span className="pa-skel-bar chip" />
          <span className="pa-skel-bar name" />
          <span className="pa-skel-bar sub" />
        </span>
      </div>
      <p className="pa-hit-address">
        <span className="pa-skel-bar addr" />
      </p>
      <footer>
        <span className="pa-skel-bar foot" />
      </footer>
    </article>
  );
}

function CheckPanel({
  draft,
  onAssign,
  onOpen,
}: {
  draft: PartnerDraft;
  onAssign: (hit: CheckHit) => void;
  onOpen: (id: NonNullable<CheckHit["partnerId"]>) => void;
}) {
  const query = checkQuery(draft);
  const min = draft.personTyp === "Unternehmen" ? 2 : 3;
  const ready = query.length >= min;
  const queryKey = `${draft.personTyp}|${query.toLowerCase()}`;
  const assignedId = draft.assignedHit?.id ?? "";
  const [hits, setHits] = useState<CheckHit[]>([]);
  const [loading, setLoading] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!ready) {
      setHits([]);
      setLoading(false);
      return;
    }
    if (assignedId) {
      setHits(searchHits(draftRef.current));
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      setHits(searchHits(draftRef.current));
      setLoading(false);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [assignedId, queryKey, ready]);

  return (
    <aside className="pa-check" aria-busy={loading}>
      <h3>Plausibilitätscheck</h3>
      {loading ? (
        <>
          <p className="pa-check-status">WICO und Wino werden geprüft…</p>
          <CheckSkeleton />
          <CheckSkeleton />
          <CheckSkeleton />
        </>
      ) : hits.length === 0 ? (
        <p className="pa-check-empty">Sobald ein Name eingegeben wird, prüfen wir WICO und Wino.</p>
      ) : (
        hits.map((hit) => (
          <CheckCard
            key={hit.id}
            hit={hit}
            assigned={draft.assignedHit?.id === hit.id}
            onAssign={() => {
              if (hit.source !== "wino" && !hit.alreadyInWino) onAssign(hit);
            }}
            onOpen={hit.partnerId ? () => onOpen(hit.partnerId!) : undefined}
          />
        ))
      )}
    </aside>
  );
}

function WicoCard({
  link,
  picked,
  onToggle,
}: {
  link: WicoLink;
  picked: boolean;
  onToggle: () => void;
}) {
  const known = wicoAlreadyInWino(link.name);
  return (
    <DataCard
      card={{
        id: link.id,
        title: link.name,
        icon: link.party === "company" ? a.companyBlank : a.personSmall,
        blocks: [{ kind: "rows", rows: [{ label: link.party === "company" ? "Firmenbuch" : "Geboren", value: link.sub }, ...link.rows] }],
      }}
      selected={known ? false : picked}
      onSelect={known ? undefined : onToggle}
      headerExtra={
        known ? (
          <span className="pa-wico-known">
            <Icon src={a.infoFull} size={16} />
            Bereits in Wino
          </span>
        ) : (
          <label className={picked ? "pa-hit-assign" : "pa-hit-assign dim"} onClick={(event) => event.stopPropagation()}>
            <input type="checkbox" checked={picked} onChange={onToggle} />
            {picked ? "In Wino übernehmen" : "Ungetaggt belassen"}
          </label>
        )
      }
    />
  );
}

function WicoLinks({ draft, onToggle }: { draft: PartnerDraft; onToggle: (id: string) => void }) {
  const links = wicoLinksFor(draft);
  const sections = wicoSectionsOf(links);
  const takeable = links.filter((link) => !wicoAlreadyInWino(link.name));
  const pickedCount = takeable.filter((link) => draft.wicoSelected.includes(link.id)).length;
  const company = draft.assignedHit?.name ?? draft.firmenwortlaut;
  return (
    <section className="pa-wico">
      <header>
        <h2>WICO Daten zuweisen</h2>
        <p>
          Parteien aus dem WICO zu {company || "diesem Unternehmen"}. Markierte werden in Wino angelegt und mit WICO
          verbunden.
        </p>
      </header>
      <InfoBox>
        Markierte Karten werden als Partner in Wino übernommen und mit WICO synchronisiert. Nicht markierte bleiben als
        ungetaggte Partner im System – sie werden nicht mit WICO verbunden und sind weniger relevant, weil sie noch nicht
        zu Makler Winter beitragen.
      </InfoBox>
      <p className="pa-wico-count">
        {pickedCount} von {takeable.length} ausgewählt
      </p>
      {sections.map((section) => (
        <div className="pa-wico-group" key={section.kind}>
          <h3>
            {section.title} ({section.items.length})
          </h3>
          <div className="pa-wico-cards">
            {section.items.map((link) => (
              <WicoCard
                key={link.id}
                link={link}
                picked={draft.wicoSelected.includes(link.id)}
                onToggle={() => onToggle(link.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function PartnerCreate() {
  const { partnerCreateOpen, closePartnerCreate, createPartner, openPartner } = useWorkflow();
  const [step, setStep] = useState<CreateStep>("typ");
  const [draft, setDraft] = useState<PartnerDraft>(EMPTY_DRAFT);
  const steps = stepsFor(draft);
  const cards = useMemo(() => (step === "summary" ? summaryCards(draft) : []), [draft, step]);

  if (!partnerCreateOpen) return null;

  const patch = (partial: Partial<PartnerDraft>) => setDraft((current) => ({ ...current, ...partial }));

  function close() {
    setStep("typ");
    setDraft(EMPTY_DRAFT);
    closePartnerCreate();
  }

  function goNext() {
    const order = steps.map((entry) => entry.id);
    const index = order.indexOf(step);
    const next = order[index + 1] ?? "summary";
    if (next === "wico") setDraft(ensureWicoSelection);
    setStep(next);
  }

  function goBack() {
    const order = steps.map((entry) => entry.id);
    const index = order.indexOf(step);
    setStep(order[Math.max(0, index - 1)]);
  }

  function finish(mode: "done" | "stammdaten" | "draft") {
    const seq = Date.now() % 100000;
    createPartner(buildCreatedPartner(draft, seq, mode === "draft"), mode, relatedPartnersFromDraft(draft, seq + 1));
    setStep("typ");
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className="umw-modal pa-modal" role="dialog" aria-label="Neuen Partner anlegen">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={close} />
      <div className="umw-body pa-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">Neuen Partner anlegen</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={close}>
            <Icon src={a.iconCloseDark} size={12} />
          </button>
        </header>

        <nav className="pa-steps" aria-label="Schritte">
          {steps.map((entry, index) => {
            const current = entry.id === step;
            const done = steps.findIndex((item) => item.id === step) > index;
            return (
              <button
                type="button"
                className={current ? "pa-step active" : done ? "pa-step done" : "pa-step"}
                key={entry.id}
                onClick={() => {
                  if (entry.id === "wico") setDraft(ensureWicoSelection);
                  setStep(entry.id);
                }}
              >
                <span className="pa-step-num">{done ? <Icon src={a.confirm} size={18} /> : index + 1}</span>
                {entry.label.split("\n").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </button>
            );
          })}
        </nav>

        <div className="pa-main">
          {step === "typ" ? (
            <section className="pa-typ">
              <h2>Personen- & Partnertyp</h2>
              <Field label="Mandant">
                <Select value={draft.mandant} onChange={(value) => patch({ mandant: value })} options={["Makler Winter"]} />
              </Field>
              <Field label="Partnertyp">
                <Select
                  value={draft.partnerTyp}
                  onChange={(value) => patch({ partnerTyp: value as PartnerDraft["partnerTyp"] })}
                  options={["Interessent", "Kunde", "Einfache Person"]}
                />
              </Field>
              <Field label="Personentyp">
                <Select
                  value={draft.personTyp}
                  onChange={(value) =>
                    patch({
                      personTyp: value as PartnerDraft["personTyp"],
                      addressTyp: value === "Unternehmen" ? "Firmensitz" : "Hauptwohnsitz",
                      assignedHit: null,
                      wicoSelected: [],
                    })
                  }
                  options={["Privatperson", "Unternehmen"]}
                />
              </Field>
              <Field label="Kundenberater">
                <Select value={draft.berater} onChange={(value) => patch({ berater: value })} options={["Lucy Dullon", "Auer Christine", "Ashley Dutton"]} />
              </Field>
            </section>
          ) : null}

          {step === "daten" ? (
            <div className="pa-daten">
              <div className="pa-daten-forms">
                <section className="pa-card">
                  <h2>Allgemeine Partnerdaten</h2>
                  {draft.personTyp === "Unternehmen" ? (
                    <>
                      <Field label="Firmenwortlaut">
                        <Text value={draft.firmenwortlaut} onChange={(value) => patch({ firmenwortlaut: value, assignedHit: null })} />
                      </Field>
                      <Field label="Nationalität">
                        <Select value={draft.nationalitaet} onChange={(value) => patch({ nationalitaet: value })} options={["Österreich", "Deutschland", "Schweiz"]} />
                      </Field>
                      <Field label="Rufname">
                        <Text value={draft.rufname} onChange={(value) => patch({ rufname: value })} />
                      </Field>
                      <Field label="Allgemeine Notiz zum Partner">
                        <textarea className="textarea" value={draft.notiz} onChange={(event) => patch({ notiz: event.target.value })} />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Titel vor">
                        <Select value={draft.titelVor} onChange={(value) => patch({ titelVor: value })} options={["Mag.", "Dr.", "Ing."]} />
                      </Field>
                      <Field label="Vorname">
                        <Text value={draft.vorname} onChange={(value) => patch({ vorname: value, assignedHit: null })} />
                      </Field>
                      <Field label="Nachname">
                        <Text value={draft.nachname} onChange={(value) => patch({ nachname: value, assignedHit: null })} />
                      </Field>
                      <Field label="Titel nach">
                        <Select value={draft.titelNach} onChange={(value) => patch({ titelNach: value })} options={["BA", "MA", "MSc"]} />
                      </Field>
                      <Field label="Rufname">
                        <Text value={draft.rufname} onChange={(value) => patch({ rufname: value })} />
                      </Field>
                      <Field label="Geschlecht">
                        <Select value={draft.geschlecht} onChange={(value) => patch({ geschlecht: value })} options={["Weiblich", "Männlich", "Divers"]} />
                      </Field>
                      <Field label="Geburtsdatum">
                        <DateField
                          prefix="Am"
                          day={draft.geburtTag}
                          month={draft.geburtMonat}
                          year={draft.geburtJahr}
                          onDay={(value) => patch({ geburtTag: value })}
                          onMonth={(value) => patch({ geburtMonat: value })}
                          onYear={(value) => patch({ geburtJahr: value })}
                        />
                      </Field>
                      <Field label="Nationalität">
                        <Select value={draft.nationalitaet} onChange={(value) => patch({ nationalitaet: value })} options={["Österreich", "Deutschland", "Schweiz"]} />
                      </Field>
                      <Field label="Allgemeine Notiz zum Partner">
                        <textarea className="textarea" value={draft.notiz} onChange={(event) => patch({ notiz: event.target.value })} />
                      </Field>
                    </>
                  )}
                </section>

                <section className="pa-card">
                  <h2>Adressdaten</h2>
                  <Field label="Adressart">
                    <Select
                      value={draft.addressTyp}
                      onChange={(value) => patch({ addressTyp: value })}
                      options={draft.personTyp === "Unternehmen" ? ["Firmensitz", "Rechnungsadresse", "Postadresse"] : ["Hauptwohnsitz", "Nebenwohnsitz", "Postadresse"]}
                    />
                  </Field>
                  <Field label="Strasse">
                    <Text value={draft.strasse} onChange={(value) => patch({ strasse: value })} />
                  </Field>
                  <Field label="Nummer">
                    <Text value={draft.nummer} onChange={(value) => patch({ nummer: value })} />
                  </Field>
                  <Field label="Adresszusatz">
                    <Text value={draft.zusatz} onChange={(value) => patch({ zusatz: value })} />
                  </Field>
                  <Field label="PLZ">
                    <Text value={draft.plz} onChange={(value) => patch({ plz: value })} />
                  </Field>
                  <Field label="Ort">
                    <Text value={draft.ort} onChange={(value) => patch({ ort: value })} />
                  </Field>
                  <Field label="Land">
                    <Select value={draft.land} onChange={(value) => patch({ land: value })} options={["Österreich", "Deutschland", "Schweiz"]} />
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
                onAssign={(hit) =>
                  setDraft((current) =>
                    current.assignedHit?.id === hit.id ? { ...current, assignedHit: null } : applyHit(current, hit),
                  )
                }
                onOpen={(id) => {
                  close();
                  openPartner(id);
                }}
              />
            </div>
          ) : null}

          {step === "wico" ? <WicoLinks draft={draft} onToggle={(id) => setDraft((current) => toggleWicoLink(current, id))} /> : null}

          {step === "summary" ? (
            <section className="pa-summary">
              <header>
                <h2>Zusammenfassung</h2>
                <p>Die bisher erfassten Eingaben:</p>
              </header>
              <div className="pa-summary-cards">
                {cards.map((card) => (
                  <DataCard key={card.id} card={card} full />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="pa-foot">
          {step === "typ" ? (
            <button type="button" className="btn-secondary" onClick={close}>
              Abbrechen
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={goBack}>
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
              {step === "summary" ? "Fertigstellen" : "Weiter"}
            </button>
          </span>
        </footer>
      </div>
    </div>
  );
}
