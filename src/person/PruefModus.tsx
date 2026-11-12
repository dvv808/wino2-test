import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { AppsNav, FileIdentity, FileTabs, LogoButton, MeinBereichTab, ProfileMenu } from "../chrome";
import { GlobalSearch } from "../search/GlobalSearch";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import {
  addChange,
  addFiles,
  discardPruefung,
  draftFor,
  fmtSize,
  pendingFor,
  readFile,
  sendPruefung,
  stampOf,
  startPruefung,
  takeShownPruefung,
  updatePruefung,
  usePruefungen,
  type PruefChange,
  type Pruefung,
} from "./pruefung";
import { type Section, type StammdatenAreaId } from "./stammdaten";
import { DataCard } from "./cards";
import { partnerUpload } from "./forms";
import { DmsUpload } from "../dms/upload";
import { EDITOR_ADVISOR } from "./versions";

/** The areas the advisor goes through with the client, in that order (Systemdaten are internal). */
const PRUEF_AREAS: { id: StammdatenAreaId; label: string; icon: string }[] = [
  { id: "personendaten", label: "Allgemeine Personendaten", icon: a.navPerson },
  { id: "kontakte", label: "Kontakte", icon: a.contacts },
  { id: "adressen", label: "Adressen", icon: a.house },
  { id: "bankverbindungen", label: "Bankverbindung", icon: a.bank },
  { id: "wirtschaftsdaten", label: "Wirtschaftsdaten", icon: a.cube },
];

/** Which value a click in a DataCard hit: its card, label and shown value (rows and the contact person). */
function rowAt(target: HTMLElement) {
  if (target.closest(".pp-row-note")) return null;
  const card = target.closest<HTMLElement>(".pm-datacard");
  const row = target.closest<HTMLElement>(".pp-row, .pp-person");
  if (!card || !row) return null;
  const read = rowRead(row);
  if (!read) return null;
  return { cardId: card.dataset.card ?? "", target: `${card.dataset.title ?? ""} · ${read.label}`, value: read.value };
}

function rowRead(row: HTMLElement) {
  if (row.classList.contains("pp-person")) {
    const name = row.querySelector("strong")?.textContent?.trim() ?? "";
    return { label: "Kontaktperson", value: name };
  }
  const label = row.querySelector(".pp-label")?.textContent?.trim() ?? "";
  const value = [...row.children]
    .filter((child) => !child.classList.contains("pp-label") && !child.classList.contains("pp-row-note"))
    .map((child) => (child as HTMLElement).innerText.trim())
    .join(" ")
    .trim();
  return label ? { label, value: value === "-" ? "" : value } : null;
}

function areaCards(sections: Section[], area: StammdatenAreaId) {
  return (sections.find((section) => section.id === area)?.cards ?? []).filter((card) => !card.empty);
}

function ChangeLine({
  change,
  files,
  editable,
  focusRef,
  onChange,
  onRemove,
}: {
  change: PruefChange;
  files: Pruefung["files"];
  editable: boolean;
  focusRef?: (element: HTMLInputElement | null) => void;
  onChange: (patch: Partial<PruefChange>) => void;
  onRemove: () => void;
}) {
  const proof = files.filter((file) => file.changeId === change.id);
  return (
    <li className={`pm-change ${change.status}`}>
      <div className="pm-change-head">
        <strong>{change.target}</strong>
        {editable ? (
          <button type="button" className="pm-icon-btn" aria-label="Änderung entfernen" onClick={onRemove}>
            <img src={a.iconCloseDark} alt="" width={9} height={9} />
          </button>
        ) : (
          <span className={`pm-status ${change.status}`}>
            {change.status === "offen" ? "Offen" : change.status === "uebernommen" ? "Übernommen" : "Abgelehnt"}
          </span>
        )}
      </div>
      {change.from ? (
        <p className="pm-change-from">
          <small>Aktuell</small>
          <s>{change.from}</s>
        </p>
      ) : null}
      <label className="pm-change-to">
        <small>{change.from ? "Neu" : "Änderung"}</small>
        {editable ? (
          <input
            ref={focusRef}
            value={change.to}
            placeholder={change.from ? "Neuer Wert" : "Was soll sich ändern?"}
            onChange={(event) => onChange({ to: event.target.value })}
          />
        ) : (
          <span>{change.to || "–"}</span>
        )}
      </label>
      {proof.length ? (
        <p className="pm-change-files">
          <Icon src={a.paperclip} size={12} />
          {proof.map((file) => file.name).join(", ")}
        </p>
      ) : null}
      {change.reply ? <p className="pm-change-reply">Bestandsmanager: {change.reply}</p> : null}
    </li>
  );
}

/**
 * Prüfmodus – Stammdaten beim Kunden prüfen. One page instead of the eight-step workflow: every area read-only,
 * "✓ Passt" or "✎ Ändern" per value, and a box with the Änderungswünsche and attachments on the right. Nothing
 * is saved here; "Freigabe anfordern" sends the list to the Bestandsmanager, who enters it in the Stammdaten.
 */
export function PruefModus() {
  const { filePartnerId, displaySections, personName, closePruefung } = useWorkflow();
  const list = usePruefungen();
  const pending = pendingFor(list, filePartnerId);
  const [draftId, setDraftId] = useState<string | null>(null);
  const draft = draftFor(list, filePartnerId);
  // Opened from a widget notification: show that Prüfung (e.g. a closed one with its result).
  const [shownId, setShownId] = useState<string | null>(takeShownPruefung);
  const shown = shownId ? list.find((item) => item.id === shownId && item.partnerId === filePartnerId) ?? null : null;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // A draft opens with the mode (unless a request is already with the Bestandsmanager).
  useEffect(() => {
    if (shown || pending || draft) return;
    setDraftId(startPruefung(filePartnerId, personName, EDITOR_ADVISOR.name));
  }, [shown, pending, draft, filePartnerId, personName]);

  const entry = shown ?? draft ?? (draftId ? list.find((item) => item.id === draftId) ?? null : null) ?? pending;
  const closedEntry = entry?.status === "abgeschlossen" ? entry : null;
  const editable = entry?.status === "entwurf";
  const areas = PRUEF_AREAS;
  const changesBy = useMemo(() => {
    const map = new Map<string, PruefChange[]>();
    for (const change of entry?.changes ?? []) map.set(change.area, [...(map.get(change.area) ?? []), change]);
    return map;
  }, [entry]);
  // Rows with an Änderungswunsch stay highlighted in the cards.
  const bodyRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const targets = new Set((entry?.changes ?? []).map((change) => change.target));
    bodyRef.current?.querySelectorAll<HTMLElement>(".pm-datacard").forEach((card) => {
      card.querySelectorAll<HTMLElement>(".pp-row, .pp-person").forEach((row) => {
        const read = rowRead(row);
        row.classList.toggle("pm-marked", Boolean(read && targets.has(`${card.dataset.title ?? ""} · ${read.label}`)));
      });
    });
  });
  const done = areas.filter((area) => entry?.checked.includes(area.id) || changesBy.has(area.id)).length;
  const changes = entry?.changes ?? [];
  const incomplete = changes.some((change) => !change.to.trim());
  const canSend = Boolean(entry && editable && done === areas.length && !incomplete);

  function startChange(area: PruefChange["area"], target: string, from?: string, cardId?: string) {
    if (!entry || !editable) return;
    // "Ändern" on an area that was ticked "passt" takes the tick back.
    updatePruefung(entry.id, (current) => ({ ...current, checked: current.checked.filter((id) => id !== area) }));
    setFocusId(addChange(entry.id, { area, target, from, cardId, to: "" }));
  }

  function toggleChecked(area: StammdatenAreaId) {
    if (!entry || !editable) return;
    updatePruefung(entry.id, (current) => ({
      ...current,
      checked: current.checked.includes(area) ? current.checked.filter((id) => id !== area) : [...current.checked, area],
    }));
  }

  async function attach(files: File[]) {
    if (!entry || !files.length) return;
    addFiles(entry.id, await Promise.all(files.map(readFile)));
  }

  return (
    <div className="app person pm-app">
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
            <MeinBereichTab />
          </div>
          <div className="main-nav-right">
            <GlobalSearch />
            <ProfileMenu />
          </div>
        </header>
        <AppsNav />

        <div className="content-shell pm-shell">
          <header className="pm-top">
            <div>
              <h1>Stammdaten prüfen</h1>
              <p>
                Gemeinsam mit {personName} durchgehen: was stimmt, mit <strong>Passt</strong> bestätigen; was nicht stimmt,
                einfach anklicken und den neuen Wert notieren. Eingetragen wird es danach vom Bestandsmanager.
              </p>
            </div>
            <div className="pm-progress" aria-label="Fortschritt">
              <span>
                <strong>
                  {done} / {areas.length}
                </strong>{" "}
                Bereiche geprüft
              </span>
              <i>
                <b style={{ width: `${(done / areas.length) * 100}%` }} />
              </i>
            </div>
          </header>

          <div className="pm-body">
            <main className="pm-areas" ref={bodyRef}>
              <FileIdentity className="pp-id pm-id" />
              {areas.map((area) => {
                const cards = areaCards(displaySections, area.id);
                const checked = Boolean(entry?.checked.includes(area.id));
                const own = changesBy.get(area.id) ?? [];
                const state = own.length ? "changed" : checked ? "checked" : "open";
                return (
                  <section key={area.id} className={`pp-section pm-area ${state}`}>
                    <header className="pp-section-head pm-area-head">
                      <span className="pp-section-title pm-area-title">
                        <Icon src={area.icon} size={32} />
                        {area.label}
                        {state === "checked" ? <em className="pm-badge ok">Passt</em> : null}
                        {own.length ? (
                          <em className="pm-badge">
                            {own.length} {own.length === 1 ? "Änderung" : "Änderungen"}
                          </em>
                        ) : null}
                      </span>
                      {editable ? (
                        <span className="pm-area-actions">
                          <button
                            type="button"
                            className={checked ? "pm-pass on" : "pm-pass"}
                            disabled={own.length > 0}
                            title={own.length ? "Bereich hat Änderungswünsche" : undefined}
                            onClick={() => toggleChecked(area.id)}
                          >
                            <Icon src={a.checkGreen} size={14} />
                            Passt
                          </button>
                          <button type="button" className="pm-add" onClick={() => startChange(area.id, `${area.label} · Neu`)}>
                            + Ergänzen
                          </button>
                        </span>
                      ) : null}
                    </header>
                    {cards.length === 0 ? <p className="pm-empty">Noch nichts hinterlegt.</p> : null}
                    {/* The real Stammdaten cards; a click on a value row starts "Ändern" for exactly that value. */}
                    <div
                      className={editable ? "pm-cards editable" : "pm-cards"}
                      onClick={(event) => {
                        if (!editable) return;
                        const pick = rowAt(event.target as HTMLElement);
                        if (pick) startChange(area.id, pick.target, pick.value, pick.cardId);
                      }}
                    >
                      {cards.map((card) => (
                        <div key={card.id} className="pm-datacard" data-card={card.id} data-title={card.title ?? area.label}>
                          <DataCard card={card} full />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </main>

            <aside className="pm-side">
              <section className="pm-box">
                <header>
                  <h2>Änderungswünsche</h2>
                  <span>{changes.length}</span>
                </header>
                {closedEntry ? (
                  <p className="pm-sent done">
                    Abgeschlossen am {stampOf(closedEntry.closed).date} von {closedEntry.closedBy}. Übernommene Änderungen
                    stehen jetzt in den Stammdaten.
                  </p>
                ) : pending ? (
                  <p className="pm-sent">
                    Am {stampOf(pending.sent).date} um {stampOf(pending.sent).time} an den Bestandsmanager gesendet. Er
                    trägt die Änderungen ein; du siehst hier den Stand jeder Zeile.
                  </p>
                ) : null}
                {changes.length === 0 ? (
                  <p className="pm-hint">
                    In einer Karte auf den Wert klicken, der nicht stimmt – er erscheint hier, du tippst nur noch den neuen
                    Wert. Für etwas Neues (z.B. zweite Adresse) <strong>+ Ergänzen</strong>.
                  </p>
                ) : (
                  <ul className="pm-changes">
                    {changes.map((change) => (
                      <ChangeLine
                        key={change.id}
                        change={change}
                        files={entry?.files ?? []}
                        editable={editable}
                        focusRef={
                          change.id === focusId
                            ? (element) => {
                                if (element) {
                                  element.focus();
                                  setFocusId(null);
                                }
                              }
                            : undefined
                        }
                        onChange={(patch) =>
                          entry &&
                          updatePruefung(entry.id, (current) => ({
                            ...current,
                            changes: current.changes.map((item) => (item.id === change.id ? { ...item, ...patch } : item)),
                          }))
                        }
                        onRemove={() =>
                          entry &&
                          updatePruefung(entry.id, (current) => ({
                            ...current,
                            changes: current.changes.filter((item) => item.id !== change.id),
                            files: current.files.map((file) => (file.changeId === change.id ? { ...file, changeId: undefined } : file)),
                          }))
                        }
                      />
                    ))}
                  </ul>
                )}
                {editable ? (
                  <button type="button" className="pm-free" onClick={() => startChange("sonstiges", "Sonstiges")}>
                    + Freie Änderung
                  </button>
                ) : null}

                <label className="pm-note">
                  <small>Notiz an den Bestandsmanager</small>
                  {editable ? (
                    <textarea
                      value={entry?.note ?? ""}
                      placeholder="z.B. Kunde ist umgezogen, Meldezettel liegt bei."
                      onChange={(event) =>
                        entry && updatePruefung(entry.id, (current) => ({ ...current, note: event.target.value }))
                      }
                    />
                  ) : (
                    <p>{entry?.note || "–"}</p>
                  )}
                </label>
              </section>

              <section className="pm-box pm-files">
                <header>
                  <h2>Anhänge</h2>
                  <span>{entry?.files.length ?? 0}</span>
                </header>
                {/* The one upload of WINO (DmsUpload): files also land in the partner's DMS. */}
                {editable ? (
                  <DmsUpload
                    context={partnerUpload("partner.stammdaten.anhang", filePartnerId, "pruefung")}
                    className="pm-drop"
                    accept="image/*,application/pdf"
                    note={false}
                    onFiles={(files) => void attach(files)}
                  >
                    <Icon src={a.paperclip} size={18} />
                    <span>
                      <strong>Datei hierher ziehen oder auswählen</strong>
                      <small>Meldezettel, Ausweis, Bankbestätigung … – am Tablet auch direkt fotografieren</small>
                    </span>
                  </DmsUpload>
                ) : null}
                <ul className="pm-file-list">
                  {(entry?.files ?? []).map((file) => (
                    <li key={file.id}>
                      {file.url && file.type.startsWith("image/") ? (
                        <img className="pm-thumb" src={file.url} alt="" />
                      ) : (
                        <img className="pm-thumb pdf" src={a.pdf} alt="" />
                      )}
                      <span className="pm-file-copy">
                        <strong title={file.name}>{file.name}</strong>
                        <small>{fmtSize(file.size)}</small>
                        {editable && changes.length ? (
                          <select
                            value={file.changeId ?? ""}
                            aria-label="Gehört zu Änderung"
                            onChange={(event) =>
                              entry &&
                              updatePruefung(entry.id, (current) => ({
                                ...current,
                                files: current.files.map((item) =>
                                  item.id === file.id ? { ...item, changeId: event.target.value || undefined } : item,
                                ),
                              }))
                            }
                          >
                            <option value="">Gehört zu: allgemein</option>
                            {changes.map((change) => (
                              <option key={change.id} value={change.id}>
                                Gehört zu: {change.target}
                              </option>
                            ))}
                          </select>
                        ) : file.changeId ? (
                          <small>Gehört zu: {changes.find((change) => change.id === file.changeId)?.target}</small>
                        ) : null}
                      </span>
                      {editable ? (
                        <button
                          type="button"
                          className="pm-icon-btn"
                          aria-label={`${file.name} entfernen`}
                          onClick={() =>
                            entry &&
                            updatePruefung(entry.id, (current) => ({ ...current, files: current.files.filter((item) => item.id !== file.id) }))
                          }
                        >
                          <img src={a.iconCloseDark} alt="" width={9} height={9} />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          <footer className="footer pm-footer">
            {editable ? (
              confirmDiscard ? (
                <span className="pm-discard">
                  Prüfung verwerfen? Alle Notizen und Anhänge gehen verloren.
                  <button type="button" className="btn-secondary" onClick={() => setConfirmDiscard(false)}>
                    Nein
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (entry) discardPruefung(entry.id);
                      closePruefung();
                    }}
                  >
                    Verwerfen
                  </button>
                </span>
              ) : (
                <span className="pm-footer-left">
                  <button type="button" className="btn-secondary" onClick={closePruefung}>
                    Später weiter
                  </button>
                  <button type="button" className="pm-link" onClick={() => setConfirmDiscard(true)}>
                    Verwerfen
                  </button>
                </span>
              )
            ) : (
              <span className="pm-footer-left">
                <button type="button" className="btn-secondary" onClick={closePruefung}>
                  Zurück zum Profil
                </button>
                {closedEntry && !pending ? (
                  <button type="button" className="btn-primary" onClick={() => setShownId(null)}>
                    Neue Prüfung starten
                  </button>
                ) : null}
              </span>
            )}
            {editable ? (
              <span className="pm-footer-right">
                <small>
                  {incomplete
                    ? "Bei jeder Änderung den neuen Wert eintragen."
                    : done < areas.length
                      ? `Noch ${areas.length - done} ${areas.length - done === 1 ? "Bereich" : "Bereiche"} prüfen.`
                      : changes.length
                        ? `${changes.length} ${changes.length === 1 ? "Änderung" : "Änderungen"} zur Freigabe.`
                        : "Alles korrekt – wird als geprüft vermerkt."}
                </small>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canSend}
                  onClick={() => {
                    if (!entry) return;
                    sendPruefung(entry.id);
                  }}
                >
                  Freigabe anfordern
                </button>
              </span>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}
