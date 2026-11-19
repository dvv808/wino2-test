import { useState } from "react";
import { createPortal } from "react-dom";
import * as a from "../assets/index";
import { DmsTable, type DmsColumn } from "../dms/ui";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import type { PersonVersion } from "./versions";

const KIND: Record<PersonVersion["kind"], string> = { added: "Hinzugefügt", changed: "Geändert", removed: "Entfernt" };
const sortKey = (v: PersonVersion) => v.date.split(".").reverse().join("") + v.time;

/**
 * New Verlauf (first try, Ash Atkinson only): every change of the file in one standard table, newest first.
 * The old Versionsverlauf window stays for every other file.
 */
export function VerlaufTable() {
  const { versionHistoryOpen, personModule } = useWorkflow();
  if (!versionHistoryOpen) return null;
  // Opened from Kommunikation → only E-Mail entries; from the Profil → only Profil entries; elsewhere everything.
  return <VerlaufWindow key={personModule} scope={SCOPES[personModule] ?? null} />;
}

type Scope = { label: string; match: (v: PersonVersion) => boolean };
const SCOPES: Partial<Record<string, Scope>> = {
  profil: { label: "Profil", match: (v) => v.place.app !== "kommunikation" },
  kommunikation: { label: "E-Mail", match: (v) => v.place.app === "kommunikation" && v.place.channel === "email" },
};

function VerlaufWindow({ scope: initial }: { scope: Scope | null }) {
  const { versions, closeVersionHistory } = useWorkflow();
  const [scope, setScope] = useState(initial);
  const rows = [...versions].filter((v) => !scope || scope.match(v)).sort((x, y) => sortKey(y).localeCompare(sortKey(x)));
  const columns: DmsColumn<PersonVersion>[] = [
    { key: "datum", label: "Datum", width: "minmax(140px, 140fr)", text: (r) => `${r.date} ${r.time}`, render: (r) => <span className="vt-date">{r.date}<small>{r.time}</small></span> },
    { key: "bereich", label: "Bereich", width: "minmax(200px, 200fr)", text: (r) => r.placeLabel },
    { key: "feld", label: "Feld", width: "minmax(170px, 170fr)", text: (r) => r.field },
    { key: "art", label: "Änderung", width: "minmax(130px, 130fr)", text: (r) => KIND[r.kind] },
    {
      key: "wert",
      label: "Wert",
      width: "minmax(320px, 320fr)",
      text: (r) => [r.from, r.to].filter(Boolean).join(" → "),
      render: (r) => (
        <span className="vt-value">
          {r.from ? <s>{r.from}</s> : null}
          {r.to ? <span>{r.to}</span> : null}
        </span>
      ),
    },
    {
      key: "von",
      label: "Bearbeitet von",
      width: "minmax(180px, 180fr)",
      text: (r) => r.editor.name,
      render: (r) => (
        <span className="vt-person">
          <img src={r.editor.photo} alt="" width={24} height={24} />
          {r.editor.name}
        </span>
      ),
    },
    { key: "version", label: "Version", width: "minmax(120px, 120fr)", text: (r) => `V${r.number}` },
  ];
  return createPortal(
    <div className="umw-modal verlauf-table" role="dialog" aria-label="Verlauf">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={closeVersionHistory} />
      <div className="umw-body verlauf-table-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">Verlauf</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={closeVersionHistory}>
            <Icon src={a.iconCloseDark} size={12} />
          </button>
        </header>
        <div className="verlauf-table-content">
          {scope ? (
            <div className="mb-ant-filterbar">
              <div className="mb-ant-bubbles">
                <button type="button" className="mb-ant-bubble" onClick={() => setScope(null)}>
                  {scope.label}
                  <img src={a.iconCloseDark} alt={`Filter ${scope.label} entfernen`} width={12} height={12} />
                </button>
              </div>
            </div>
          ) : null}
          <DmsTable key={scope?.label ?? "alle"} rows={rows} columns={columns} rowKey={(r) => r.id} label="Verlauf" unit="Einträge" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
