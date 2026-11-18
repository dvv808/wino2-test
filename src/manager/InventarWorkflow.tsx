import { useState } from "react";
import * as a from "../assets/index";
import { DateField, Icon } from "../ui";
import { DataCard, focusForm } from "../person/cards";
import { Area, Field, Select, Text } from "../person/forms";
import { StepFade, WaveStepper } from "../stepperOverflow";
import type { TeamMember } from "./hrmTeam";
import { MaBizCard } from "./MitarbeiterProfil";
import {
  ASSET_KATEGORIEN,
  BENEFIT_KATEGORIEN,
  INTERVALLE,
  INV_AREAS,
  KEY_TYPEN,
  STATUS,
  ausgabeOptions,
  hrmOf,
  blankItem,
  invAreaDone,
  invCard,
  inventarOf,
  saveInventar,
  type InvAreaId,
  type InvItem,
  type InvStatus,
} from "./inventar";

/**
 * Profil → Inventar → Editieren: the Inventar Workflow, built like the Stammdaten Workflow (Wino - Concepts
 * 21745:72464): wave steps Inventar | Schlüssel & Badges | Benefits, the business card on top, the form on the left,
 * "Aktuell in Wino" with one card per item on the right. Empty area → the empty-state pattern (21755:28744).
 */
export function MitarbeiterInventarWorkflow({
  person,
  area,
  onArea,
  onClose,
}: {
  person: TeamMember;
  area: InvAreaId;
  onArea: (area: InvAreaId) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<InvItem[]>(() => structuredClone(inventarOf(person)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<InvItem | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const current = INV_AREAS.find((entry) => entry.id === area) ?? INV_AREAS[0];
  const own = items.filter((item) => item.kind === current.kind);
  const selected = own.find((item) => item.id === selectedId) ?? null;
  // The form edits the selected item, else the first one, else a new (pending) entry: an empty area opens on the form.
  const form = selected ?? (pending?.kind === current.kind ? pending : null) ?? own[0] ?? { ...blankItem(current.kind), ausgabe: hrmOf(person) };
  const isNew = !items.some((item) => item.id === form.id);
  const empty = own.length === 0;
  const done = invAreaDone(current.id, items);

  const patch = (fields: Partial<InvItem>) => {
    const next = { ...form, ...fields };
    if (isNew) {
      // A new entry joins the list (and the cards on the right) as soon as it has a name.
      if (next.name.trim()) {
        setItems((list) => [...list, next]);
        setSelectedId(next.id);
        setPending(null);
      } else setPending(next);
      return;
    }
    setItems((list) => list.map((item) => (item.id === next.id ? next : item)));
  };
  const addNew = () => {
    // A new item is handed out by the person's HRM manager unless someone else is picked.
    const fresh = { ...blankItem(current.kind), ausgabe: hrmOf(person) };
    setPending(fresh);
    setSelectedId(fresh.id);
    window.setTimeout(focusForm, 0);
  };
  const setStatus = (id: string, status: InvStatus) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, status, rueckgabe: status === "Zurückgegeben" && item.kind === "key" && !item.rueckgabe ? today() : item.rueckgabe } : item)));
  const remove = (id: string) => {
    setItems((list) => list.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const save = (close: boolean) => {
    saveInventar(person, items.filter((item) => item.name.trim()));
    if (close) onClose();
    else setSaved("Entwurf gespeichert.");
  };
  const [tag = "", monat = "", jahr = ""] = form.datum.split(".");
  const [rTag = "", rMonat = "", rJahr = ""] = form.rueckgabe.split(".");

  return (
    <div className="content-shell ma-wf">
      <WaveStepper active={area} className="sw-stepper">
        {(overflow) =>
          INV_AREAS.map((step, index) => {
            const stepDone = invAreaDone(step.id, items);
            return (
              <button
                key={step.id}
                type="button"
                className={`step${area === step.id ? " active" : ""}`}
                onClick={() => {
                  setSelectedId(null);
                  onArea(step.id);
                }}
              >
                <span className={`step-num${area === step.id ? " active" : ""}`}>
                  <img src={area === step.id ? a.stepActive : a.stepDone} alt="" />
                  <span className="sw-step-icon">
                    <Icon src={step.icon} size={16} />
                  </span>
                </span>
                {overflow && index === INV_AREAS.length - 1 ? <StepFade /> : null}
                <span className="step-label">
                  {step.step.split("\n").map((line) => (
                    <span key={line} style={{ display: "block" }}>
                      {line}
                    </span>
                  ))}
                </span>
                {/* Mandatory areas: the Maklervereinbarung's Offen / Fertig badge. */}
                {step.mandatory ? (
                  stepDone ? (
                    <span className="badge done">
                      <Icon src={a.confirm} size={16} />
                      Fertig
                    </span>
                  ) : (
                    <span className="badge">
                      <Icon src={a.onhold} size={16} />
                      Offen
                    </span>
                  )
                ) : null}
              </button>
            );
          })
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
          <div className="sw-forms">
            <form className="sw-form pa-card" onSubmit={(event) => event.preventDefault()}>
              <h2>{isNew ? `Neu: ${current.label}` : form.name || current.label}</h2>
              {current.mandatory && !done ? <p className="ma-wf-hint">{current.mandatory}</p> : null}
              <Field label={current.kind === "asset" ? "Bezeichnung" : current.kind === "key" ? "Bezeichnung" : "Benefit"}>
                <Text value={form.name} onChange={(v) => patch({ name: v })} />
              </Field>
              <Field label={current.kind === "key" ? "Typ" : "Kategorie"}>
                <Select
                  value={form.kategorie}
                  onChange={(v) => patch({ kategorie: v })}
                  options={current.kind === "asset" ? ASSET_KATEGORIEN : current.kind === "key" ? KEY_TYPEN : BENEFIT_KATEGORIEN}
                />
              </Field>
              {current.kind === "key" ? (
                <Field label="Beschreibung">
                  <Text value={form.beschreibung} onChange={(v) => patch({ beschreibung: v })} />
                </Field>
              ) : null}
              {current.kind !== "benefit" ? (
                <Field label={current.kind === "asset" ? "Inventar- / Seriennummer" : "Nummer"}>
                  <Text value={form.nummer} onChange={(v) => patch({ nummer: v })} />
                </Field>
              ) : (
                <>
                  <Field label="Wert">
                    <Text value={form.wert} onChange={(v) => patch({ wert: v })} />
                  </Field>
                  <Field label="Intervall">
                    <Select value={form.intervall} onChange={(v) => patch({ intervall: v })} options={INTERVALLE} />
                  </Field>
                </>
              )}
              <Field label={current.kind === "benefit" ? "Seit" : "Zugewiesen am"}>
                <DateField
                  prefix="Am"
                  day={tag}
                  month={monat}
                  year={jahr}
                  onDay={(v) => patch({ datum: [v, monat, jahr].join(".") })}
                  onMonth={(v) => patch({ datum: [tag, v, jahr].join(".") })}
                  onYear={(v) => patch({ datum: [tag, monat, v].join(".") })}
                />
              </Field>
              {current.kind === "key" ? (
                <Field label="Rückgabe am">
                  <DateField
                    prefix="Am"
                    day={rTag}
                    month={rMonat}
                    year={rJahr}
                    onDay={(v) => patch({ rueckgabe: [v, rMonat, rJahr].join(".") })}
                    onMonth={(v) => patch({ rueckgabe: [rTag, v, rJahr].join(".") })}
                    onYear={(v) => patch({ rueckgabe: [rTag, rMonat, v].join(".") })}
                  />
                </Field>
              ) : null}
              <Field label="Ausgegeben von">
                <Select value={form.ausgabe} onChange={(v) => patch({ ausgabe: v })} options={ausgabeOptions(person)} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(v) => patch({ status: v as InvStatus })} options={STATUS} />
              </Field>
              <Field label="Notiz">
                <Area value={form.notiz} onChange={(v) => patch({ notiz: v })} />
              </Field>
            </form>
          </div>

          <aside className={empty ? "sw-preview empty" : "sw-preview"}>
            <header className="sw-preview-head">
              <span>
                <Icon src={current.icon} size={22} />
                {current.label} ({own.length})
              </span>
              <button type="button" className="btn-primary sw-plus" onClick={empty ? focusForm : addNew}>
                {empty ? <Icon src={current.icon} size={16} className="sw-plus-icon" /> : null}
                {current.plus}
              </button>
            </header>
            {empty ? null : <p className="sw-now">Aktuell in Wino</p>}
            <div className="sw-cards">
              {empty ? (
                <DataCard
                  card={{ id: `${current.id}-leer`, empty: { icon: current.icon, title: current.empty.title, lead: "Du kannst", link: current.empty.link } }}
                  full
                  onAdd={focusForm}
                />
              ) : (
                own.map((item) => (
                  <DataCard
                    key={item.id}
                    card={invCard(item)}
                    full
                    selected={item.id === form.id}
                    onSelect={() => setSelectedId(item.id)}
                    onEdit={() => setSelectedId(item.id)}
                    onDelete={() => remove(item.id)}
                    menuItems={
                      item.status === "Aktiv"
                        ? [{ label: "Zurückgeben", icon: a.history, onSelect: () => setStatus(item.id, "Zurückgegeben") }]
                        : [{ label: "Wieder aktiv", icon: a.confirm, onSelect: () => setStatus(item.id, "Aktiv") }]
                    }
                  />
                ))
              )}
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
    </div>
  );
}

function today() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
