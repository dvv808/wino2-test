import { useState } from "react";
import { assignDokument, predictLocation } from "../../lib/dms/admin";
import { linkSource } from "../../lib/dms/links";
import { formatPath, linkChain } from "../../lib/dms/placeholders";
import { SOURCE_LABEL } from "../../lib/dms/sources";
import { buildView, eingang, findFolder } from "../../lib/dms/views";
import { SPARTEN } from "../../mocks/dms/seed";
import type { DocMeta, Dokument, EntityType, MetaField } from "../../types/dms";
import { useDms } from "../store";
import { DmsModal, DmsTable, formatDate } from "../ui";

const ENTITY_TYPES: EntityType[] = ["Partner", "Kunde", "Versicherer", "Schaden"];
const META_LABEL: Record<MetaField, string> = { sparte: "Sparte", jahr: "Jahr", gueltig_von: "Gültig von", gueltig_bis: "Gültig bis" };

function AssignModal({ doc, onClose }: { doc: Dokument; onClose: () => void }) {
  const { state, apply } = useDms();
  const [typId, setTypId] = useState(state.dokumenttypen[0]?.id ?? "");
  const [entityType, setEntityType] = useState<EntityType>(doc.upload_context.entityType ?? "Kunde");
  const [entityId, setEntityId] = useState(doc.upload_context.entityId ?? state.entities.find((e) => e.type === entityType)?.id ?? "");
  const [meta, setMeta] = useState<DocMeta>({ ...doc.meta });
  const [asRule, setAsRule] = useState(false);
  const typ = state.dokumenttypen.find((t) => t.id === typId);
  const missing = (typ?.requiredFields ?? []).filter((f) => meta[f] === undefined || meta[f] === "");
  const link = entityId ? { entityType, entityId } : null;
  const where = typ && !missing.length ? predictLocation(state, { dokumenttyp: typ.id, links: linkChain(link, state.entities), meta }) : null;

  return (
    <DmsModal
      title="Zuordnen"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!typ || missing.length > 0}
            onClick={() => {
              apply((s) => {
                let next = assignDokument(s, doc.id, { dokumenttyp: typId, link, meta });
                // "Quelle hier verknüpfen": the upload point gets linked to the folder the file now lies in.
                const place = asRule ? predictLocation(next, { dokumenttyp: typId, links: linkChain(link, next.entities), meta }).Verwaltung[0] : null;
                const folder = place ? findFolder(buildView(next, "Verwaltung"), place) : null;
                if (folder?.nodeId && folder.templateId) {
                  const ctx = doc.upload_context;
                  next = linkSource(next, folder.templateId, folder.nodeId, { source: ctx.source, slot: ctx.slot || null, dokumenttyp: typId }).state;
                }
                return next;
              });
              onClose();
            }}
          >
            Zuordnen
          </button>
        </>
      }
    >
      <div className="dms-form">
        <p className="prompt-text">{doc.name}</p>
        <label className="dms-missing-field">
          <span className="field-label">Dokumenttyp</span>
          <select className="dms-input" value={typId} onChange={(e) => setTypId(e.target.value)}>
            {state.dokumenttypen.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="dms-form-row">
          <label className="dms-missing-field">
            <span className="field-label">Verknüpfen mit</span>
            <select
              className="dms-input"
              value={entityType}
              onChange={(e) => {
                const type = e.target.value as EntityType;
                setEntityType(type);
                setEntityId(state.entities.find((x) => x.type === type)?.id ?? "");
              }}
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="dms-missing-field">
            <span className="field-label">{entityType}</span>
            <select className="dms-input" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              <option value="">– keine –</option>
              {state.entities
                .filter((x) => x.type === entityType)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nummer ?? x.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {(typ?.requiredFields ?? []).map((field) => (
          <label className="dms-missing-field" key={field}>
            <span className="field-label">{META_LABEL[field]}</span>
            {field === "sparte" ? (
              <select className="dms-input" value={meta.sparte ?? ""} onChange={(e) => setMeta((m) => ({ ...m, sparte: e.target.value || undefined }))}>
                <option value="">Bitte wählen</option>
                {SPARTEN.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input
                className="dms-input"
                type={field === "jahr" ? "number" : "date"}
                value={meta[field] ?? ""}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, [field]: field === "jahr" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value || undefined }))
                }
              />
            )}
          </label>
        ))}
        {where ? (
          <p className="dms-test-line">
            <span>Landet in</span>
            <strong>{where.Verwaltung.map(formatPath).join(" · ") || "keinem Ordner – bleibt unsichtbar"}</strong>
          </p>
        ) : null}
        {doc.upload_context.source !== "dms.dragdrop" ? (
          <label className="dms-check">
            <input type="checkbox" checked={asRule} onChange={(e) => setAsRule(e.target.checked)} />
            Quelle mit diesem Ordner verknüpfen ({SOURCE_LABEL[doc.upload_context.source]})
          </label>
        ) : null}
      </div>
    </DmsModal>
  );
}

export function Eingang() {
  const { state } = useDms();
  const [assigning, setAssigning] = useState<Dokument | null>(null);
  const items = eingang(state);
  return (
    <section className="dms-panel dms-admin-full">
      <header className="dms-admin-head">
        <h3>Eingang / Nicht zugeordnet</h3>
        <span className={items.length ? "dms-eingang-badge" : "dms-eingang-badge empty"}>{items.length} offen</span>
      </header>
      <p className="dms-muted">Uploads, die keine Regel ablegen konnte. Sie bleiben hier, bis sie zugeordnet sind.</p>
      <DmsTable
        rows={items}
        rowKey={(d) => d.id}
        label="Eingang"
        unit="Dokumente"
        columns={[
          { key: "name", label: "Name", width: "minmax(220px, 1.4fr)", text: (d) => d.name },
          { key: "quelle", label: "Quelle", width: "minmax(220px, 1.3fr)", text: (d) => SOURCE_LABEL[d.upload_context.source] },
          { key: "am", label: "Hochgeladen", width: "minmax(150px, 0.9fr)", text: (d) => formatDate(d.createdAt, true) },
          { key: "von", label: "Von", width: "minmax(130px, 0.8fr)", text: (d) => state.people.find((p) => p.id === d.createdBy)?.name ?? d.createdBy },
          { key: "kommentar", label: "Kommentar", width: "minmax(180px, 1fr)", text: (d) => d.kommentar ?? "" },
          {
            key: "aktion",
            label: "Aktion",
            width: "minmax(130px, 0.6fr)",
            text: () => "Zuordnen",
            render: (d) => (
              <button type="button" className="btn-secondary dms-row-btn" onClick={() => setAssigning(d)}>
                Zuordnen
              </button>
            ),
          },
        ]}
        empty={<p className="dms-empty">Alles zugeordnet.</p>}
      />
      {assigning ? <AssignModal doc={assigning} onClose={() => setAssigning(null)} /> : null}
    </section>
  );
}
