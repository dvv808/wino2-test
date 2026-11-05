import { useState } from "react";
import * as a from "../../assets/index";
import { addChildNode, findNode, moveNode, patchVorlage, removeNode, updateNode } from "../../lib/dms/admin";
import { LEVELS, principalLabel } from "../../lib/dms/permissions";
import type { Ansicht, Bedingung, Berechtigung, EntityType, GroupBy, Knoten, Level, MetaField, Ordnervorlage, Principal } from "../../types/dms";
import { META_FIELDS } from "../../types/dms";
import { Icon } from "../../ui";
import { useDms } from "../store";

const ENTITY_TYPES: EntityType[] = ["Partner", "Kunde", "Versicherer", "Schaden"];
const PLACEHOLDERS: Record<string, string[]> = {
  global: ["{Sparte}", "{Jahr}", "{Versicherer}"],
  Partner: ["{Partner.Name}", "{Sparte}", "{Jahr}"],
  Kunde: ["{Kunde.Name}", "{Sparte}", "{Jahr}", "{Schaden.Nummer}", "{Versicherer}"],
  Versicherer: ["{Versicherer}", "{Sparte}", "{Jahr}"],
  Schaden: ["{Schaden.Nummer}", "{Kunde.Name}"],
};
const META_LABEL: Record<MetaField, string> = { sparte: "Sparte", jahr: "Jahr", gueltig_von: "Gültig von", gueltig_bis: "Gültig bis" };

function NodeTree({ node, depth, selected, onSelect }: { node: Knoten; depth: number; selected: string; onSelect: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        className={`dms-tree-row dms-tpl-node${selected === node.id ? " selected" : ""}`}
        style={{ paddingLeft: 8 + depth * 18 }}
        onClick={() => onSelect(node.id)}
      >
        <Icon src={a.folder} size={18} />
        <span className="dms-tree-label">{node.name}</span>
        {node.groupBy ? <span className="dms-tag">je Wert</span> : null}
        {node.permissions.length ? <img src={a.hnLock} alt="Eigene Rechte" width={12} height={12} /> : null}
      </button>
      {node.children.length ? (
        <ul>
          {node.children.map((c) => (
            <NodeTree key={c.id} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function principalKey(p: Principal) {
  return p.kind === "Alle" ? "Alle" : `${p.kind}:${p.id}`;
}

function parsePrincipal(key: string): Principal {
  if (key === "Alle") return { kind: "Alle" };
  const [kind, id] = key.split(":");
  if (kind === "Rolle") return { kind: "Rolle", id: id as "DMS-Admin" | "Mitarbeiter:in" };
  return { kind: kind as "Person" | "Gruppe", id };
}

function ConditionRow({ cond, onChange, onRemove }: { cond: Bedingung; onChange: (c: Bedingung) => void; onRemove: () => void }) {
  const { state } = useDms();
  return (
    <div className="dms-cond">
      <select
        className="dms-input"
        value={cond.kind}
        onChange={(event) => {
          const kind = event.target.value as Bedingung["kind"];
          if (kind === "typ") onChange({ kind, in: [] });
          if (kind === "status") onChange({ kind, in: [] });
          if (kind === "meta") onChange({ kind, field: "sparte", op: "eq", value: "" });
          if (kind === "link") onChange({ kind, entityType: "Kunde", to: "$entity" });
        }}
      >
        <option value="typ">Dokumenttyp ist</option>
        <option value="status">Status ist</option>
        <option value="meta">Metadatum</option>
        <option value="link">Verknüpft mit</option>
      </select>
      {cond.kind === "typ" ? (
        <span className="dms-chips">
          {state.dokumenttypen.map((t) => (
            <label key={t.id} className={cond.in.includes(t.id) ? "dms-chip on" : "dms-chip"}>
              <input
                type="checkbox"
                checked={cond.in.includes(t.id)}
                onChange={(event) => onChange({ ...cond, in: event.target.checked ? [...cond.in, t.id] : cond.in.filter((x) => x !== t.id) })}
              />
              {t.name}
            </label>
          ))}
        </span>
      ) : null}
      {cond.kind === "status" ? (
        <input
          className="dms-input"
          value={cond.in.join(", ")}
          placeholder="z. B. Aktiv, In Freigabe"
          onChange={(event) => onChange({ ...cond, in: event.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      ) : null}
      {cond.kind === "meta" ? (
        <span className="dms-cond-inline">
          <select className="dms-input" value={cond.field} onChange={(event) => onChange({ ...cond, field: event.target.value as MetaField })}>
            {META_FIELDS.map((f) => (
              <option key={f} value={f}>
                {META_LABEL[f]}
              </option>
            ))}
          </select>
          <select className="dms-input" value={cond.op} onChange={(event) => onChange({ ...cond, op: event.target.value as "eq" })}>
            <option value="eq">=</option>
            <option value="lt">&lt;</option>
            <option value="gt">&gt;</option>
            <option value="exists">ist gesetzt</option>
          </select>
          {cond.op !== "exists" ? (
            <input className="dms-input" value={cond.value ?? ""} onChange={(event) => onChange({ ...cond, value: event.target.value })} />
          ) : null}
        </span>
      ) : null}
      {cond.kind === "link" ? (
        <span className="dms-cond-inline">
          <select className="dms-input" value={cond.entityType} onChange={(event) => onChange({ ...cond, entityType: event.target.value as EntityType })}>
            {ENTITY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="dms-input" value={cond.to ?? ""} onChange={(event) => onChange({ ...cond, to: event.target.value ? "$entity" : undefined })}>
            <option value="$entity">dieser Instanz</option>
            <option value="">beliebig</option>
          </select>
        </span>
      ) : null}
      <button type="button" className="dms-icon-btn" aria-label="Bedingung entfernen" onClick={onRemove}>
        <Icon src={a.trash} size={16} />
      </button>
    </div>
  );
}

function NodeEditor({ vorlage, node }: { vorlage: Ordnervorlage; node: Knoten }) {
  const { state, apply } = useDms();
  const patch = (p: Partial<Omit<Knoten, "id" | "children">>) => apply((s) => updateNode(s, vorlage.id, node.id, p));
  const isRoot = vorlage.root.id === node.id;
  const principals: Principal[] = [
    { kind: "Alle" },
    { kind: "Rolle", id: "DMS-Admin" },
    { kind: "Rolle", id: "Mitarbeiter:in" },
    ...state.groups.map((g): Principal => ({ kind: "Gruppe", id: g.id })),
    ...state.people.map((p): Principal => ({ kind: "Person", id: p.id })),
  ];
  const setPerm = (index: number, perm: Berechtigung | null) =>
    patch({ permissions: perm ? node.permissions.map((p, i) => (i === index ? perm : p)) : node.permissions.filter((_, i) => i !== index) });

  return (
    <div className="dms-editor">
      <div className="dms-editor-tools">
        <button type="button" className="btn-secondary" onClick={() => apply((s) => addChildNode(s, vorlage.id, node.id).state)}>
          + Unterordner
        </button>
        {!isRoot ? (
          <>
            <button type="button" className="dms-icon-btn" title="Nach oben" onClick={() => apply((s) => moveNode(s, vorlage.id, node.id, "up"))}>
              ↑
            </button>
            <button type="button" className="dms-icon-btn" title="Nach unten" onClick={() => apply((s) => moveNode(s, vorlage.id, node.id, "down"))}>
              ↓
            </button>
            <button type="button" className="dms-icon-btn" title="Einrücken" onClick={() => apply((s) => moveNode(s, vorlage.id, node.id, "in"))}>
              →
            </button>
            <button type="button" className="dms-icon-btn" title="Ausrücken" onClick={() => apply((s) => moveNode(s, vorlage.id, node.id, "out"))}>
              ←
            </button>
            <button type="button" className="dms-icon-btn danger" title="Löschen" onClick={() => apply((s) => removeNode(s, vorlage.id, node.id))}>
              <Icon src={a.trash} size={16} />
            </button>
          </>
        ) : null}
      </div>

      <label className="dms-missing-field">
        <span className="field-label">Name</span>
        <input className="dms-input" value={node.name} onChange={(event) => patch({ name: event.target.value })} />
      </label>
      <div className="dms-chips">
        {(PLACEHOLDERS[vorlage.scope] ?? []).map((ph) => (
          <button type="button" key={ph} className="dms-chip" onClick={() => patch({ name: `${node.name}${ph}` })}>
            {ph}
          </button>
        ))}
      </div>

      <label className="dms-missing-field">
        <span className="field-label">Ebene</span>
        <select
          className="dms-input"
          value={node.groupBy ? `${node.groupBy.kind}:${node.groupBy.kind === "meta" ? node.groupBy.field : node.groupBy.entityType}` : ""}
          onChange={(event) => {
            const [kind, value] = event.target.value.split(":");
            const groupBy: GroupBy | undefined = !kind
              ? undefined
              : kind === "meta"
                ? { kind: "meta", field: value as MetaField }
                : { kind: "link", entityType: value as EntityType };
            patch({ groupBy });
          }}
        >
          <option value="">Fester Ordner</option>
          <option value="meta:sparte">Ein Ordner je Sparte</option>
          <option value="meta:jahr">Ein Ordner je Jahr</option>
          <option value="link:Versicherer">Ein Ordner je Versicherer</option>
          <option value="link:Schaden">Ein Ordner je Schaden</option>
        </select>
      </label>
      <label className="dms-check">
        <input type="checkbox" checked={Boolean(node.latestOnly)} onChange={(event) => patch({ latestOnly: event.target.checked || undefined })} />
        Nur neuestes Jahr je Versicherer zeigen
      </label>

      <h4>Filterregel</h4>
      {node.filter.length === 0 ? <p className="dms-muted">Keine eigene Bedingung: zeigt, was der Ordner darüber zeigt.</p> : null}
      {node.filter.map((cond, index) => (
        <ConditionRow
          key={index}
          cond={cond}
          onChange={(c) => patch({ filter: node.filter.map((x, i) => (i === index ? c : x)) })}
          onRemove={() => patch({ filter: node.filter.filter((_, i) => i !== index) })}
        />
      ))}
      <button type="button" className="hn-link" onClick={() => patch({ filter: [...node.filter, { kind: "typ", in: [] }] })}>
        + Bedingung
      </button>

      <h4>Berechtigungen</h4>
      <p className="dms-muted">Gelten für diesen Ordner und alles darunter. Nur Erlaubnisse.</p>
      {node.permissions.map((perm, index) => (
        <div className="dms-cond" key={index}>
          <select className="dms-input" value={principalKey(perm.principal)} onChange={(event) => setPerm(index, { ...perm, principal: parsePrincipal(event.target.value) })}>
            {principals.map((p) => (
              <option key={principalKey(p)} value={principalKey(p)}>
                {p.kind === "Person" ? "Person: " : p.kind === "Gruppe" ? "Gruppe: " : ""}
                {principalLabel(p, state)}
              </option>
            ))}
          </select>
          <select className="dms-input" value={perm.level} onChange={(event) => setPerm(index, { ...perm, level: event.target.value as Level })}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <button type="button" className="dms-icon-btn" aria-label="Berechtigung entfernen" onClick={() => setPerm(index, null)}>
            <Icon src={a.trash} size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="hn-link"
        onClick={() => patch({ permissions: [...node.permissions, { principal: { kind: "Alle" }, level: "Sehen" }] })}
      >
        + Berechtigung
      </button>
    </div>
  );
}

export function Ordnervorlagen() {
  const { state, apply } = useDms();
  const [vorlageId, setVorlageId] = useState(state.vorlagen[0]?.id ?? "");
  const vorlage = state.vorlagen.find((v) => v.id === vorlageId) ?? state.vorlagen[0];
  const [nodeId, setNodeId] = useState(vorlage?.root.id ?? "");
  const node = vorlage ? (findNode(vorlage.root, nodeId) ?? vorlage.root) : null;
  if (!vorlage || !node) return null;
  const instances = vorlage.scope === "global" ? null : state.entities.filter((e) => e.type === vorlage.scope).length;

  return (
    <div className="dms-admin-split">
      <section className="dms-panel dms-admin-side">
        <h3>Ordnervorlagen</h3>
        <ul className="dms-pick-list">
          {state.vorlagen.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className={v.id === vorlage.id ? "active" : ""}
                onClick={() => {
                  setVorlageId(v.id);
                  setNodeId(v.root.id);
                }}
              >
                <strong>{v.name}</strong>
                <small>
                  {v.scope === "global" ? "Global" : `Je ${v.scope}`} · {v.ansichten.join(" + ")}
                </small>
              </button>
            </li>
          ))}
        </ul>
        <div className="dms-tpl-meta">
          <p className="dms-muted">
            {instances === null
              ? "Ein Baum für alle."
              : `Wird automatisch für jede:n ${vorlage.scope} aus den Stammdaten angelegt (${instances}).`}
          </p>
          <label className="dms-missing-field">
            <span className="field-label">Liegt unter</span>
            <input
              className="dms-input"
              value={vorlage.mount.join("/")}
              placeholder="oberste Ebene"
              onChange={(event) => apply((s) => patchVorlage(s, vorlage.id, { mount: event.target.value.split("/").filter(Boolean) }))}
            />
          </label>
          <span className="field-label">Ansichten</span>
          <div className="dms-chips">
            {(["Verwaltung", "Standard"] as Ansicht[]).map((ansicht) => (
              <label key={ansicht} className={vorlage.ansichten.includes(ansicht) ? "dms-chip on" : "dms-chip"}>
                <input
                  type="checkbox"
                  checked={vorlage.ansichten.includes(ansicht)}
                  onChange={(event) =>
                    apply((s) =>
                      patchVorlage(s, vorlage.id, {
                        ansichten: event.target.checked ? [...vorlage.ansichten, ansicht] : vorlage.ansichten.filter((x) => x !== ansicht),
                      }),
                    )
                  }
                />
                {ansicht}
              </label>
            ))}
          </div>
        </div>
        <h3>Struktur</h3>
        <ul className="dms-tree-list">
          <NodeTree node={vorlage.root} depth={0} selected={node.id} onSelect={setNodeId} />
        </ul>
      </section>
      <section className="dms-panel dms-admin-main">
        <h3>Ordner „{node.name}“</h3>
        <NodeEditor vorlage={vorlage} node={node} />
      </section>
    </div>
  );
}
