import { useState } from "react";
import * as a from "../../assets/index";
import { addTyp, removeState, renameState, updateTyp } from "../../lib/dms/admin";
import type { Dokumenttyp, MetaField } from "../../types/dms";
import { META_FIELDS } from "../../types/dms";
import { Icon } from "../../ui";
import { useDms } from "../store";
import { DmsTable, StatusChip } from "../ui";

const META_LABEL: Record<MetaField, string> = { sparte: "Sparte", jahr: "Jahr", gueltig_von: "Gültig von", gueltig_bis: "Gültig bis" };

function WorkflowEditor({ typ }: { typ: Dokumenttyp }) {
  const { apply } = useDms();
  const [draft, setDraft] = useState("");
  const states = typ.workflow.states;
  const has = (from: string, to: string) => typ.workflow.transitions.some((t) => t.from === from && t.to === to);
  const toggle = (from: string, to: string) =>
    apply((s) =>
      updateTyp(s, typ.id, (t) => ({
        ...t,
        workflow: {
          ...t.workflow,
          transitions: has(from, to)
            ? t.workflow.transitions.filter((x) => !(x.from === from && x.to === to))
            : [...t.workflow.transitions, { from, to }],
        },
      })),
    );
  const move = (index: number, dir: -1 | 1) =>
    apply((s) =>
      updateTyp(s, typ.id, (t) => {
        const next = [...t.workflow.states];
        const target = index + dir;
        if (target < 0 || target >= next.length) return t;
        [next[index], next[target]] = [next[target], next[index]];
        return { ...t, workflow: { ...t.workflow, states: next } };
      }),
    );
  const auto = typ.workflow.auto[0];

  return (
    <>
      <h4>Status (Reihenfolge, der erste ist der Startstatus)</h4>
      <ol className="dms-states">
        {states.map((state, index) => (
          <li key={state}>
            <StatusChip status={state} />
            <input
              className="dms-input"
              defaultValue={state}
              aria-label={`Status ${state} umbenennen`}
              onBlur={(event) => {
                const next = event.target.value.trim();
                if (next && next !== state && !states.includes(next)) apply((s) => renameState(s, typ.id, state, next));
                else event.target.value = state;
              }}
            />
            <button type="button" className="dms-icon-btn" title="Nach oben" onClick={() => move(index, -1)}>
              ↑
            </button>
            <button type="button" className="dms-icon-btn" title="Nach unten" onClick={() => move(index, 1)}>
              ↓
            </button>
            <button type="button" className="dms-icon-btn" aria-label={`${state} entfernen`} onClick={() => apply((s) => removeState(s, typ.id, state))}>
              <Icon src={a.trash} size={16} />
            </button>
          </li>
        ))}
      </ol>
      <form
        className="dms-cond"
        onSubmit={(event) => {
          event.preventDefault();
          const name = draft.trim();
          if (!name || states.includes(name)) return;
          apply((s) => updateTyp(s, typ.id, (t) => ({ ...t, workflow: { ...t.workflow, states: [...t.workflow.states, name] } })));
          setDraft("");
        }}
      >
        <input className="dms-input" placeholder="Neuer Status" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" className="btn-secondary" disabled={!draft.trim()}>
          Hinzufügen
        </button>
      </form>

      {states.length > 1 ? (
        <>
          <h4>Erlaubte Übergänge</h4>
          <div className="dms-matrix" style={{ gridTemplateColumns: `minmax(110px, auto) repeat(${states.length}, minmax(70px, 1fr))` }}>
            <span className="dms-muted">von ↓ / nach →</span>
            {states.map((to) => (
              <strong key={to}>{to}</strong>
            ))}
            {states.map((from) => (
              <div className="dms-matrix-row" key={from} style={{ display: "contents" }}>
                <strong>{from}</strong>
                {states.map((to) => (
                  <label key={to} className="dms-matrix-cell">
                    {from === to ? (
                      <span className="dms-muted">–</span>
                    ) : (
                      <input type="checkbox" checked={has(from, to)} onChange={() => toggle(from, to)} aria-label={`${from} → ${to}`} />
                    )}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <h4>Automatischer Übergang</h4>
          <div className="dms-cond">
            <label className="dms-check">
              <input
                type="checkbox"
                checked={Boolean(auto)}
                onChange={(event) =>
                  apply((s) =>
                    updateTyp(s, typ.id, (t) => ({
                      ...t,
                      workflow: {
                        ...t.workflow,
                        auto: event.target.checked
                          ? [{ from: [t.workflow.states[0]], to: t.workflow.states.at(-1)!, when: { field: "gueltig_bis", op: "before_today" } }]
                          : [],
                      },
                    })),
                  )
                }
              />
              Wenn „Gültig bis“ vor heute liegt
            </label>
            {auto ? (
              <>
                <span>von</span>
                <select
                  className="dms-input"
                  value={auto.from[0]}
                  onChange={(event) =>
                    apply((s) => updateTyp(s, typ.id, (t) => ({ ...t, workflow: { ...t.workflow, auto: [{ ...auto, from: [event.target.value] }] } })))
                  }
                >
                  {states.map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </select>
                <span>nach</span>
                <select
                  className="dms-input"
                  value={auto.to}
                  onChange={(event) =>
                    apply((s) => updateTyp(s, typ.id, (t) => ({ ...t, workflow: { ...t.workflow, auto: [{ ...auto, to: event.target.value }] } })))
                  }
                >
                  {states.map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}

export function Dokumenttypen() {
  const { state, apply } = useDms();
  const [selected, setSelected] = useState(state.dokumenttypen[0]?.id ?? "");
  const typ = state.dokumenttypen.find((t) => t.id === selected) ?? state.dokumenttypen[0];
  const count = (id: string) => state.documents.filter((d) => d.dokumenttyp === id).length;

  return (
    <div className="dms-admin-split wide-side">
      <section className="dms-panel dms-admin-side">
        <header className="dms-admin-head">
          <h3>Dokumenttypen</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              let id = "";
              apply((s) => {
                const made = addTyp(s, "Neuer Dokumenttyp");
                id = made.typId;
                return made.state;
              });
              window.setTimeout(() => setSelected(id));
            }}
          >
            + Dokumenttyp
          </button>
        </header>
        <DmsTable
          rows={state.dokumenttypen}
          rowKey={(t) => t.id}
          label="Dokumenttypen"
          unit="Dokumenttypen"
          selected={typ?.id}
          onSelect={(t) => setSelected(t.id)}
          columns={[
            { key: "name", label: "Name", width: "minmax(170px, 1.2fr)", text: (t) => t.name },
            { key: "felder", label: "Pflichtfelder", width: "minmax(150px, 1fr)", text: (t) => t.requiredFields.map((f) => META_LABEL[f]).join(", ") },
            { key: "status", label: "Status", width: "minmax(120px, 0.8fr)", text: (t) => (t.workflow.states.length ? `${t.workflow.states.length} Status` : "") },
            { key: "docs", label: "Dokumente", width: "minmax(100px, 0.6fr)", text: (t) => String(count(t.id)) },
          ]}
        />
      </section>
      {typ ? (
        <section className="dms-panel dms-admin-main">
          <label className="dms-missing-field">
            <span className="field-label">Name</span>
            <input className="dms-input" value={typ.name} onChange={(event) => apply((s) => updateTyp(s, typ.id, (t) => ({ ...t, name: event.target.value })))} />
          </label>
          <h4>Pflichtfelder (werden beim Upload abgefragt, wenn sie fehlen)</h4>
          <div className="dms-chips">
            {META_FIELDS.map((field) => (
              <label key={field} className={typ.requiredFields.includes(field) ? "dms-chip on" : "dms-chip"}>
                <input
                  type="checkbox"
                  checked={typ.requiredFields.includes(field)}
                  onChange={(event) =>
                    apply((s) =>
                      updateTyp(s, typ.id, (t) => ({
                        ...t,
                        requiredFields: event.target.checked ? [...t.requiredFields, field] : t.requiredFields.filter((f) => f !== field),
                      })),
                    )
                  }
                />
                {META_LABEL[field]}
              </label>
            ))}
          </div>
          <WorkflowEditor key={typ.id} typ={typ} />
        </section>
      ) : null}
    </div>
  );
}
