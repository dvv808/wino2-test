import { useState } from "react";
import * as a from "../../assets/index";
import { newId, predictLocation, removeRegel, upsertRegel } from "../../lib/dms/admin";
import { formatPath, linkChain } from "../../lib/dms/placeholders";
import { isUnmatched, resolveAblage } from "../../lib/dms/resolveAblage";
import { SPARTEN } from "../../mocks/dms/seed";
import type { Ablageregel, DocMeta, EntityType, MetaField, UploadContext, UploadSource } from "../../types/dms";
import { META_FIELDS } from "../../types/dms";
import { Icon } from "../../ui";
import { useDms } from "../store";
import { DmsModal, DmsTable } from "../ui";

export const SOURCE_LABEL: Record<UploadSource, string> = {
  "maklervereinbarung.vertrag": "Maklervereinbarung → Vertrag hochladen",
  "partner.aktivitaet.anhang": "Partner → Aktivität → Anhang",
  "partner.stammdaten.anhang": "Partner → Stammdaten → Anhänge",
  "partner.bank": "Partner → Bankverbindung",
  "kunde.polizze": "Kunde → Polizze anlegen",
  "schaden.dokumente": "Schaden → Dokumente",
  "kommunikation.email": "Kommunikation → E-Mail-Anhang",
  "versicherer.bedingungen": "Versicherer → Bedingungen",
  "dms.dragdrop": "DMS → Drag & Drop",
};
const SOURCES = Object.keys(SOURCE_LABEL) as UploadSource[];
const ENTITY_TYPES: EntityType[] = ["Partner", "Kunde", "Versicherer", "Schaden"];
const META_LABEL: Record<MetaField, string> = { sparte: "Sparte", jahr: "Jahr", gueltig_von: "Gültig von", gueltig_bis: "Gültig bis" };

function RuleModal({ rule, onClose }: { rule: Ablageregel; onClose: () => void }) {
  const { state, apply } = useDms();
  const [draft, setDraft] = useState(rule);
  const set = <K extends keyof Ablageregel>(key: K, value: Ablageregel[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const isNew = !state.regeln.some((r) => r.id === rule.id);
  return (
    <DmsModal
      title={isNew ? "Neue Ablageregel" : "Ablageregel bearbeiten"}
      onClose={onClose}
      footer={
        <>
          {!isNew ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                apply((s) => removeRegel(s, rule.id));
                onClose();
              }}
            >
              Löschen
            </button>
          ) : null}
          <button
            type="button"
            className="btn-primary"
            disabled={!draft.name.trim() || !draft.targetPath.trim()}
            onClick={() => {
              apply((s) => upsertRegel(s, draft));
              onClose();
            }}
          >
            Speichern
          </button>
        </>
      }
    >
      <div className="dms-form">
        <label className="dms-missing-field">
          <span className="field-label">Name</span>
          <input className="dms-input" value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="dms-missing-field">
          <span className="field-label">Quelle</span>
          <select className="dms-input" value={draft.source} onChange={(e) => set("source", e.target.value as UploadSource)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="dms-form-row">
          <label className="dms-missing-field">
            <span className="field-label">Entität</span>
            <select className="dms-input" value={draft.entityType ?? ""} onChange={(e) => set("entityType", (e.target.value || null) as EntityType | null)}>
              <option value="">beliebig</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="dms-missing-field">
            <span className="field-label">Slot</span>
            <input className="dms-input" value={draft.slot ?? ""} placeholder="beliebig" onChange={(e) => set("slot", e.target.value.trim() || null)} />
          </label>
          <label className="dms-missing-field">
            <span className="field-label">Priorität</span>
            <input className="dms-input" type="number" value={draft.priority} onChange={(e) => set("priority", Number(e.target.value) || 0)} />
          </label>
        </div>
        <label className="dms-missing-field">
          <span className="field-label">Dokumenttyp</span>
          <select className="dms-input" value={draft.dokumenttyp ?? ""} onChange={(e) => set("dokumenttyp", e.target.value || null)}>
            <option value="">aus dem Ordner (Drag & Drop)</option>
            {state.dokumenttypen.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="dms-missing-field">
          <span className="field-label">Zielpfad</span>
          <input className="dms-input" value={draft.targetPath} onChange={(e) => set("targetPath", e.target.value)} />
        </label>
        <span className="field-label">Benötigt</span>
        <div className="dms-chips">
          {META_FIELDS.map((f) => (
            <label key={f} className={draft.requires.includes(f) ? "dms-chip on" : "dms-chip"}>
              <input
                type="checkbox"
                checked={draft.requires.includes(f)}
                onChange={(e) => set("requires", e.target.checked ? [...draft.requires, f] : draft.requires.filter((x) => x !== f))}
              />
              {META_LABEL[f]}
            </label>
          ))}
        </div>
      </div>
    </DmsModal>
  );
}

/** "Testen": the same resolveAblage the uploads use, plus where a document would really show up. */
function TestPanel() {
  const { state } = useDms();
  const [source, setSource] = useState<UploadSource>("kunde.polizze");
  const [entityType, setEntityType] = useState<EntityType | "">("Kunde");
  const [entityId, setEntityId] = useState("k-gruber");
  const [slot, setSlot] = useState("");
  const [meta, setMeta] = useState<DocMeta>({});
  const entities = state.entities.filter((e) => e.type === entityType);
  const context: UploadContext = {
    source,
    entityType: entityType || null,
    entityId: entityType && entityId ? entityId : null,
    slot,
    knownMetadata: meta,
  };
  const result = resolveAblage(context, state.regeln, { entities: state.entities, dokumenttypen: state.dokumenttypen });
  const link = context.entityType && context.entityId ? { entityType: context.entityType, entityId: context.entityId } : null;
  const where =
    !isUnmatched(result) && result.missingFields.length === 0
      ? predictLocation(state, { dokumenttyp: result.dokumenttyp, links: linkChain(link, state.entities), meta })
      : null;
  const mismatch = where && !isUnmatched(result) && !where.Verwaltung.some((p) => p.join("/") === result.targetPath.join("/"));

  return (
    <section className="dms-panel dms-test">
      <h3>Testen</h3>
      <div className="dms-form">
        <label className="dms-missing-field">
          <span className="field-label">Quelle</span>
          <select className="dms-input" value={source} onChange={(e) => setSource(e.target.value as UploadSource)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="dms-form-row">
          <label className="dms-missing-field">
            <span className="field-label">Entität</span>
            <select
              className="dms-input"
              value={entityType}
              onChange={(e) => {
                const type = e.target.value as EntityType | "";
                setEntityType(type);
                setEntityId(state.entities.find((x) => x.type === type)?.id ?? "");
              }}
            >
              <option value="">keine</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          {entityType ? (
            <label className="dms-missing-field">
              <span className="field-label">{entityType}</span>
              <select className="dms-input" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                {entities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nummer ?? x.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="dms-form-row">
          <label className="dms-missing-field">
            <span className="field-label">Slot</span>
            <input className="dms-input" value={slot} onChange={(e) => setSlot(e.target.value)} placeholder="optional" />
          </label>
          <label className="dms-missing-field">
            <span className="field-label">Sparte</span>
            <select className="dms-input" value={meta.sparte ?? ""} onChange={(e) => setMeta((m) => ({ ...m, sparte: e.target.value || undefined }))}>
              <option value="">–</option>
              {SPARTEN.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="dms-missing-field">
            <span className="field-label">Jahr</span>
            <input
              className="dms-input"
              type="number"
              value={meta.jahr ?? ""}
              onChange={(e) => setMeta((m) => ({ ...m, jahr: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </label>
        </div>
        <div className="dms-form-row">
          <label className="dms-missing-field">
            <span className="field-label">Gültig von</span>
            <input className="dms-input" type="date" value={meta.gueltig_von ?? ""} onChange={(e) => setMeta((m) => ({ ...m, gueltig_von: e.target.value || undefined }))} />
          </label>
          <label className="dms-missing-field">
            <span className="field-label">Gültig bis</span>
            <input className="dms-input" type="date" value={meta.gueltig_bis ?? ""} onChange={(e) => setMeta((m) => ({ ...m, gueltig_bis: e.target.value || undefined }))} />
          </label>
        </div>
      </div>
      <div className="dms-test-result" role="status">
        {isUnmatched(result) ? (
          <p className="dms-upload-note eingang">
            <img src={a.hnAttention} alt="" width={16} height={15} />
            <span>
              <strong>Eingang / Nicht zugeordnet.</strong> {result.reason}
            </span>
          </p>
        ) : (
          <>
            <p className="dms-test-line">
              <span>Regel</span>
              <strong>{result.rule.name}</strong>
            </p>
            <p className="dms-test-line">
              <span>Dokumenttyp</span>
              <strong>{state.dokumenttypen.find((t) => t.id === result.dokumenttyp)?.name}</strong>
            </p>
            <p className="dms-test-line">
              <span>Zielpfad</span>
              <strong>{formatPath(result.targetPath)}</strong>
            </p>
            {result.missingFields.length ? (
              <p className="dms-upload-note eingang">
                <img src={a.hnAttention} alt="" width={16} height={15} />
                <span>
                  Der Upload-Dialog fragt: <strong>{result.missingFields.map((f) => META_LABEL[f]).join(", ")}</strong>
                </span>
              </p>
            ) : null}
            {where ? (
              <>
                <p className="dms-test-line">
                  <span>Sichtbar in Verwaltung</span>
                  <strong>{where.Verwaltung.map(formatPath).join(" · ") || "nirgends"}</strong>
                </p>
                <p className="dms-test-line">
                  <span>Sichtbar in Standard</span>
                  <strong>{where.Standard.map(formatPath).join(" · ") || "nirgends"}</strong>
                </p>
                {mismatch ? (
                  <p className="dms-upload-note eingang">
                    <img src={a.hnAttention} alt="" width={16} height={15} />
                    <span>Zielpfad passt nicht zu den Ordnerfiltern. Angezeigt wird, was die Ordner zeigen.</span>
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export function Ablageregeln() {
  const { state } = useDms();
  const [editing, setEditing] = useState<Ablageregel | null>(null);
  const typName = (id: string | null) => (id ? (state.dokumenttypen.find((t) => t.id === id)?.name ?? id) : "aus dem Ordner");
  return (
    <div className="dms-admin-split wide-main reverse">
      <section className="dms-panel dms-admin-main">
        <header className="dms-admin-head">
          <h3>Ablageregeln</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setEditing({
                id: newId("r"),
                name: "Neue Regel",
                source: "kunde.polizze",
                entityType: "Kunde",
                slot: null,
                requires: [],
                dokumenttyp: "anhang",
                targetPath: "Kunden/{Kunde.Name}/Anhänge",
                priority: 1,
              })
            }
          >
            + Regel
          </button>
        </header>
        <p className="dms-muted">Die spezifischste passende Regel gewinnt (Quelle + Entität + Slot), dann die höhere Priorität.</p>
        <DmsTable
          rows={state.regeln}
          rowKey={(r) => r.id}
          label="Ablageregeln"
          unit="Regeln"
          onSelect={(r) => setEditing(r)}
          columns={[
            { key: "quelle", label: "Quelle", width: "minmax(230px, 1.4fr)", text: (r) => SOURCE_LABEL[r.source] },
            { key: "kontext", label: "Kontext", width: "minmax(130px, 0.8fr)", text: (r) => [r.entityType ?? "beliebig", r.slot ? `Slot ${r.slot}` : ""].filter(Boolean).join(" · ") },
            { key: "typ", label: "Dokumenttyp", width: "minmax(150px, 0.9fr)", text: (r) => typName(r.dokumenttyp) },
            { key: "ziel", label: "Zielpfad", width: "minmax(260px, 1.6fr)", text: (r) => r.targetPath },
            { key: "benoetigt", label: "Benötigt", width: "minmax(130px, 0.8fr)", text: (r) => r.requires.map((f) => META_LABEL[f]).join(", ") },
            { key: "prio", label: "Priorität", width: "minmax(90px, 0.5fr)", text: (r) => String(r.priority) },
            {
              key: "edit",
              label: "Bearbeiten",
              width: "minmax(110px, 0.5fr)",
              text: () => "",
              render: () => (
                <span className="dms-edit-cell">
                  <Icon src={a.edit} size={16} />
                </span>
              ),
            },
          ]}
        />
      </section>
      <TestPanel />
      {editing ? <RuleModal rule={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
