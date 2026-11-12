import { useState } from "react";
import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { pendingFor, setChangeStatus, stampOf, usePruefungen } from "./pruefung";

/**
 * In the Stammdaten workflow, while a Stammdaten-Prüfung of this partner is open: the Änderungswünsche dock beside
 * the form. The ones for the area on screen come first; "Übernommen" ticks a line off right where it was entered,
 * "Zur Prüfung" goes back to the request (to reject a line with a reason, or to close it).
 */
export function PruefDock() {
  const { filePartnerId, stammdatenArea, openFreigabe } = useWorkflow();
  const list = usePruefungen();
  const entry = pendingFor(list, filePartnerId);
  const [collapsed, setCollapsed] = useState(false);
  if (!entry) return null;

  const open = entry.changes.filter((change) => change.status === "offen");
  const sorted = [...open].sort((left, right) => Number(right.area === stammdatenArea) - Number(left.area === stammdatenArea));
  const sent = stampOf(entry.sent);

  return (
    <aside className={collapsed ? "pd-dock collapsed" : "pd-dock"} aria-label="Änderungswünsche aus der Prüfung">
      <button type="button" className="pd-head" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed}>
        <Icon src={a.tickList} size={16} />
        <span>
          <strong>Änderungswünsche ({open.length} offen)</strong>
          <small>
            Prüfung von {entry.advisor} · {sent.date}
          </small>
        </span>
        <Icon src={a.chevronDown} size={14} className="pd-caret" />
      </button>
      {collapsed ? null : (
        <>
          {sorted.length === 0 ? <p className="pd-empty">Alle Änderungen erledigt.</p> : null}
          <ul className="pd-list">
            {sorted.map((change) => (
              <li key={change.id} className={change.area === stammdatenArea ? "here" : undefined}>
                <strong>{change.target}</strong>
                <p>
                  {change.from ? <s>{change.from}</s> : null}
                  {change.from ? " → " : null}
                  <span>{change.to}</span>
                </p>
                <button type="button" className="pd-done" onClick={() => setChangeStatus(entry.id, change.id, "uebernommen")}>
                  <Icon src={a.checkGreen} size={12} />
                  Übernommen
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="pd-back" onClick={() => openFreigabe(`pruefung-${entry.id}`, entry.partnerName)}>
            Zur Prüfung
          </button>
        </>
      )}
    </aside>
  );
}
