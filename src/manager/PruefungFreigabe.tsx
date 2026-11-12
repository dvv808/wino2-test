import { useState } from "react";
import * as a from "../assets/index";
import { APPS, WorkflowDockTab } from "../chrome";
import { ROLE_USER } from "../mocks/honorar/seed";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { BestandMainNav } from "./BestandChrome";
import {
  closePruefung,
  fmtSize,
  setChangeStatus,
  stampOf,
  usePruefungen,
  type PruefChange,
} from "../person/pruefung";
import { areaTitle, STAMMDATEN_AREAS, type StammdatenAreaId } from "../person/stammdaten";
import { PersonAvatar } from "../approvalTabs";
import { ADVISOR } from "../approvalTabs";

const STATUS_LABEL: Record<PruefChange["status"], string> = { offen: "Offen", uebernommen: "Übernommen", abgelehnt: "Abgelehnt" };

const isArea = (area: string): area is StammdatenAreaId => STAMMDATEN_AREAS.some((entry) => entry.id === area);

/** Remembers which Prüfung the Bestandsmanager is working off, so the Stammdaten workflow can dock its list. */
export const PRUEF_RETURN_KEY = "wino.pruefung.working";

/**
 * Bestandsmanager view of one Stammdaten-Prüfung: the advisor's Änderungswünsche from the client meeting, each
 * with its attachment. "Im Stammdaten öffnen" jumps to exactly that card (the list docks beside the form there),
 * "Übernommen" / "Ablehnen" closes the line; when nothing is open the Prüfung can be closed.
 */
export function PruefungFreigabe({ id, onClose, onPark }: { id: string; onClose: () => void; onPark: () => void }) {
  const { openStammdaten } = useWorkflow();
  const list = usePruefungen();
  const entry = list.find((item) => item.id === id) ?? null;
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  if (!entry) {
    return (
      <div className="app">
        <div className="shell">
          <BestandMainNav onOpenManagement={onPark} />
          <p className="pf-missing">Diese Prüfung gibt es nicht mehr.</p>
        </div>
      </div>
    );
  }

  const sent = stampOf(entry.sent);
  const open = entry.changes.filter((change) => change.status === "offen").length;
  const doneCount = entry.changes.length - open;
  const closed = entry.status === "abgeschlossen";
  const shown = entry.files.find((file) => file.id === preview) ?? null;

  function openInStammdaten(change: PruefChange) {
    if (!entry) return;
    try {
      sessionStorage.setItem(PRUEF_RETURN_KEY, entry.id);
    } catch {
      // Without storage the dock still shows (it reads the open Prüfung of the partner).
    }
    const area: StammdatenAreaId = isArea(change.area) ? change.area : "personendaten";
    openStammdaten(area, change.cardId, entry.partnerId);
  }

  return (
    <div className="app">
      <div className="shell">
        <BestandMainNav partner={entry.partnerName} onClosePartner={onClose} onOpenManagement={onPark} />
        <nav className="apps-nav">
          <div className="app-pills">
            {APPS.map((label) => (
              <button type="button" className="app-pill" key={label}>
                {label}
              </button>
            ))}
          </div>
          <div className="workflow-dock">
            <WorkflowDockTab kicker="Stammdaten-Prüfung" name={entry.partnerName} active onClose={onClose} />
          </div>
        </nav>

        <div className="content-shell pf-shell">
          <header className="pf-head">
            <div className="pf-head-copy">
              <span className="pf-kicker">Stammdaten-Prüfung · beim Kunden</span>
              <h1>{entry.partnerName}</h1>
              <p className="pf-from">
                <PersonAvatar person={ADVISOR} size={28} />
                <span>
                  {entry.advisor} · gesendet am {sent.date} um {sent.time}
                </span>
              </p>
            </div>
            <div className="pf-head-state">
              <span className={`pf-state ${closed ? "done" : "open"}`}>{closed ? "Abgeschlossen" : "Offen"}</span>
              <span className="pf-count">
                <strong>
                  {doneCount} / {entry.changes.length}
                </strong>{" "}
                erledigt
              </span>
            </div>
          </header>

          <div className="pf-body">
            <main className="pf-main">
              <section className="pf-card">
                <h2>Mit dem Kunden bestätigt</h2>
                <div className="pf-checked">
                  {STAMMDATEN_AREAS.filter((area) => entry.checked.includes(area.id)).map((area) => (
                    <span key={area.id} className="pf-check">
                      <Icon src={a.checkGreen} size={12} />
                      {areaTitle(area.id)}
                    </span>
                  ))}
                  {entry.checked.length === 0 ? <span className="pf-muted">–</span> : null}
                </div>
                {entry.note ? (
                  <blockquote className="pf-note">
                    <small>Notiz von {entry.advisor}</small>
                    {entry.note}
                  </blockquote>
                ) : null}
              </section>

              <section className="pf-card">
                <h2>
                  Änderungswünsche <span className="pf-muted">({entry.changes.length})</span>
                </h2>
                {entry.changes.length === 0 ? (
                  <p className="pf-muted">Keine Änderungen – der Kunde hat alle Stammdaten bestätigt.</p>
                ) : (
                  <ol className="pf-changes">
                    {entry.changes.map((change) => {
                      const files = entry.files.filter((file) => file.changeId === change.id);
                      return (
                        <li key={change.id} className={`pf-change ${change.status}`}>
                          <div className="pf-change-what">
                            <small>{change.area === "sonstiges" ? "Sonstiges" : isArea(change.area) ? areaTitle(change.area) : change.area}</small>
                            <strong>{change.target}</strong>
                            <p className="pf-diff">
                              {change.from ? (
                                <>
                                  <s>{change.from}</s>
                                  <Icon src={a.arrowRight} size={14} />
                                </>
                              ) : null}
                              <span>{change.to}</span>
                            </p>
                            {files.length ? (
                              <p className="pf-proof">
                                <Icon src={a.paperclip} size={12} />
                                {files.map((file) => (
                                  <button key={file.id} type="button" onClick={() => setPreview(file.id)}>
                                    {file.name}
                                  </button>
                                ))}
                              </p>
                            ) : null}
                            {change.reply ? <p className="pf-reply">Begründung: {change.reply}</p> : null}
                            {rejecting === change.id ? (
                              <div className="pf-reject">
                                <input
                                  autoFocus
                                  value={reason}
                                  placeholder="Warum nicht übernommen? (geht an die Beratung)"
                                  onChange={(event) => setReason(event.target.value)}
                                />
                                <button type="button" className="btn-secondary" onClick={() => setRejecting(null)}>
                                  Abbrechen
                                </button>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  disabled={!reason.trim()}
                                  onClick={() => {
                                    setChangeStatus(entry.id, change.id, "abgelehnt", reason.trim());
                                    setRejecting(null);
                                    setReason("");
                                  }}
                                >
                                  Ablehnen
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="pf-change-actions">
                            {change.status === "offen" && !closed ? (
                              <>
                                {change.area !== "sonstiges" ? (
                                  <button type="button" className="btn-secondary" onClick={() => openInStammdaten(change)}>
                                    Im Stammdaten öffnen
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => setChangeStatus(entry.id, change.id, "uebernommen")}
                                >
                                  Übernommen
                                </button>
                                <button
                                  type="button"
                                  className="pf-link"
                                  onClick={() => {
                                    setRejecting(change.id);
                                    setReason("");
                                  }}
                                >
                                  Ablehnen
                                </button>
                              </>
                            ) : (
                              <>
                                <span className={`pm-status ${change.status}`}>{STATUS_LABEL[change.status]}</span>
                                {!closed ? (
                                  <button
                                    type="button"
                                    className="pf-link"
                                    onClick={() => setChangeStatus(entry.id, change.id, "offen")}
                                  >
                                    Zurücksetzen
                                  </button>
                                ) : null}
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </main>

            <aside className="pf-side">
              <section className="pf-card">
                <h2>
                  Anhänge <span className="pf-muted">({entry.files.length})</span>
                </h2>
                {entry.files.length === 0 ? <p className="pf-muted">Keine Anhänge.</p> : null}
                <ul className="pf-files">
                  {entry.files.map((file) => (
                    <li key={file.id}>
                      <button type="button" className={preview === file.id ? "pf-file on" : "pf-file"} onClick={() => setPreview(file.id)}>
                        {file.url && file.type.startsWith("image/") ? (
                          <img className="pm-thumb" src={file.url} alt="" />
                        ) : (
                          <img className="pm-thumb pdf" src={a.pdf} alt="" />
                        )}
                        <span>
                          <strong>{file.name}</strong>
                          <small>
                            {fmtSize(file.size)}
                            {file.changeId ? ` · ${entry.changes.find((change) => change.id === file.changeId)?.target ?? ""}` : ""}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {shown ? (
                  <div className="pf-preview">
                    {shown.url && shown.type.startsWith("image/") ? (
                      <img src={shown.url} alt={shown.name} />
                    ) : shown.url && shown.type === "application/pdf" ? (
                      <iframe title={shown.name} src={shown.url} />
                    ) : (
                      <p className="pf-muted">Keine Vorschau für diese Datei.</p>
                    )}
                    {shown.url ? (
                      <a href={shown.url} download={shown.name} className="pf-link">
                        Herunterladen
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </aside>
          </div>

          <footer className="footer pf-footer">
            <button type="button" className="btn-secondary" onClick={onPark}>
              Zur Liste
            </button>
            {closed ? (
              <span className="pf-muted">
                Abgeschlossen am {stampOf(entry.closed).date} von {entry.closedBy}
              </span>
            ) : (
              <span className="pf-footer-right">
                <small>{open ? `Noch ${open} ${open === 1 ? "Änderung" : "Änderungen"} offen.` : "Alles erledigt."}</small>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={open > 0}
                  onClick={() => closePruefung(entry.id, ROLE_USER.head)}
                >
                  Prüfung abschließen
                </button>
              </span>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
