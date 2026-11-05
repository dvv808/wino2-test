import * as a from "../../assets/index";
import { LEVELS, principalLabel } from "../../lib/dms/permissions";
import type { Bedingung, Berechtigung, EntityType, Level, MetaField, Principal } from "../../types/dms";
import { META_FIELDS } from "../../types/dms";
import { Icon } from "../../ui";
import { useDms } from "../store";

const ENTITY_TYPES: EntityType[] = ["Partner", "Kunde", "Versicherer", "Schaden"];
const META_LABEL: Record<MetaField, string> = { sparte: "Sparte", jahr: "Jahr", gueltig_von: "Gültig von", gueltig_bis: "Gültig bis" };

export function principalKey(p: Principal) {
  return p.kind === "Alle" ? "Alle" : `${p.kind}:${p.id}`;
}

export function parsePrincipal(key: string): Principal {
  if (key === "Alle") return { kind: "Alle" };
  const [kind, id] = key.split(":");
  if (kind === "Rolle") return { kind: "Rolle", id: id as "DMS-Admin" | "Mitarbeiter:in" };
  return { kind: kind as "Person" | "Gruppe", id };
}

export function ConditionRow({ cond, onChange, onRemove }: { cond: Bedingung; onChange: (c: Bedingung) => void; onRemove: () => void }) {
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

/** Allow-only rules on a folder; they hold for everything below it. */
export function PermissionsEditor({ permissions, onChange }: { permissions: Berechtigung[]; onChange: (next: Berechtigung[]) => void }) {
  const { state } = useDms();
  const principals: Principal[] = [
    { kind: "Alle" },
    { kind: "Rolle", id: "DMS-Admin" },
    { kind: "Rolle", id: "Mitarbeiter:in" },
    ...state.groups.map((g): Principal => ({ kind: "Gruppe", id: g.id })),
    ...state.people.map((p): Principal => ({ kind: "Person", id: p.id })),
  ];
  const set = (index: number, perm: Berechtigung | null) =>
    onChange(perm ? permissions.map((p, i) => (i === index ? perm : p)) : permissions.filter((_, i) => i !== index));
  return (
    <>
      {permissions.map((perm, index) => (
        <div className="dms-cond" key={index}>
          <select className="dms-input" value={principalKey(perm.principal)} onChange={(event) => set(index, { ...perm, principal: parsePrincipal(event.target.value) })}>
            {principals.map((p) => (
              <option key={principalKey(p)} value={principalKey(p)}>
                {p.kind === "Person" ? "Person: " : p.kind === "Gruppe" ? "Gruppe: " : ""}
                {principalLabel(p, state)}
              </option>
            ))}
          </select>
          <select className="dms-input" value={perm.level} onChange={(event) => set(index, { ...perm, level: event.target.value as Level })}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <button type="button" className="dms-icon-btn" aria-label="Berechtigung entfernen" onClick={() => set(index, null)}>
            <Icon src={a.trash} size={16} />
          </button>
        </div>
      ))}
      <button type="button" className="hn-link" onClick={() => onChange([...permissions, { principal: { kind: "Alle" }, level: "Sehen" }])}>
        + Berechtigung
      </button>
    </>
  );
}
