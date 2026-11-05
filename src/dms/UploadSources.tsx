import { useState } from "react";
import * as a from "../assets/index";
import { eingang } from "../lib/dms/views";
import { SPARTEN } from "../mocks/dms/seed";
import type { DocMeta, EntityType, UploadContext, UploadSource } from "../types/dms";
import { Icon } from "../ui";
import { useDms } from "./store";
import { DmsUpload } from "./upload";

/**
 * Upload-Quellen (Demo): Kunde, Schaden, Kommunikation and Versicherer have no module in the prototype yet.
 * Each card is a stand-in for that module's upload point and uses the real upload with the real context.
 */
type Source = {
  source: UploadSource;
  title: string;
  entityType: EntityType | null;
  slot: string;
  /** Metadata that module would already know (asked here, not in the upload dialog). */
  knows: ("sparte" | "jahr")[];
};

const SOURCES: Source[] = [
  { source: "kunde.polizze", title: "Kunde → Polizze anlegen", entityType: "Kunde", slot: "", knows: ["sparte"] },
  { source: "schaden.dokumente", title: "Schaden → Dokumente", entityType: "Schaden", slot: "", knows: [] },
  { source: "kommunikation.email", title: "Kommunikation → E-Mail-Anhang", entityType: "Kunde", slot: "", knows: [] },
  { source: "versicherer.bedingungen", title: "Versicherer → Bedingungen", entityType: "Versicherer", slot: "", knows: ["sparte", "jahr"] },
  { source: "partner.aktivitaet.anhang", title: "Partner → Aktivität → Anhang", entityType: "Partner", slot: "", knows: [] },
];

function SourceCard({ item }: { item: Source }) {
  const { state } = useDms();
  const options = state.entities.filter((e) => e.type === item.entityType);
  const [entityId, setEntityId] = useState(options[0]?.id ?? "");
  // Empty = the module does not know it either; the upload dialog then asks.
  const [meta, setMeta] = useState<DocMeta>({});
  const context: UploadContext = {
    source: item.source,
    entityType: entityId ? item.entityType : null,
    entityId: entityId || null,
    slot: item.slot,
    knownMetadata: meta,
  };

  return (
    <article className="dms-source">
      <h3>{item.title}</h3>
      <label className="dms-missing-field">
        <span className="field-label">{item.entityType}</span>
        <select className="dms-input" value={entityId} onChange={(event) => setEntityId(event.target.value)}>
          <option value="">– ohne Zuordnung –</option>
          {options.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nummer ? `${e.nummer} · ${e.name}` : e.name}
            </option>
          ))}
        </select>
      </label>
      {item.knows.includes("sparte") ? (
        <label className="dms-missing-field">
          <span className="field-label">Sparte (optional)</span>
          <select
            className="dms-input"
            value={meta.sparte ?? ""}
            onChange={(event) => setMeta((m) => ({ ...m, sparte: event.target.value || undefined }))}
          >
            <option value="">– nicht bekannt –</option>
            {SPARTEN.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      ) : null}
      {item.knows.includes("jahr") ? (
        <label className="dms-missing-field">
          <span className="field-label">Jahr (optional)</span>
          <input
            className="dms-input"
            type="number"
            value={meta.jahr ?? ""}
            onChange={(event) => setMeta((m) => ({ ...m, jahr: event.target.value ? Number(event.target.value) : undefined }))}
          />
        </label>
      ) : null}
      <DmsUpload context={context} className="dropzone dms-source-drop">
        <Icon src={a.upload} size={28} />
        <span>Datei hierher ziehen oder</span>
        <span className="dropzone-btn">Datei auswählen</span>
      </DmsUpload>
    </article>
  );
}

export function UploadSources() {
  const { state, reset } = useDms();
  const waiting = eingang(state).length;
  return (
    <section className="dms-sources" aria-label="Upload-Quellen (Demo)">
      <header className="dms-sources-head">
        <div>
          <h2>Upload-Quellen (Demo)</h2>
          <p>Stellvertretend für Module, die es im Prototyp noch nicht gibt. Jede Quelle nutzt den echten Upload.</p>
        </div>
        <span className={waiting ? "dms-eingang-badge" : "dms-eingang-badge empty"}>Eingang: {waiting}</span>
        <button type="button" className="btn-secondary" onClick={reset}>
          DMS zurücksetzen
        </button>
      </header>
      <div className="dms-sources-grid">
        {SOURCES.map((item) => (
          <SourceCard key={item.source} item={item} />
        ))}
      </div>
    </section>
  );
}
