import { useState } from "react";
import * as a from "../assets/index";
import { AppsNav, ContentNav, type ContentPane } from "../chrome";
import { CommentPrompt } from "../CommentPrompt";
import { DocumentRail, PdfViewer } from "../documents";
import { Summary } from "../Summary";
import { Icon } from "../ui";
import { DOCUMENTS, useWorkflow } from "../workflow";
import { BestandAreaNav, BestandMainNav } from "./BestandChrome";
import { StatusPill } from "./FreigabenPanel";
import { SCHRITT, type RequestRow } from "./requests";

type Tab = "aufgaben" | "kommentare" | "verlauf" | "zusammenfassung";

/** Findings the system raised while the advisor filled the workflow in. */
const AUFGABEN: { kind: "spezial" | "standard"; title: string; text: string }[] = [
  {
    kind: "spezial",
    title: "Besondere Bedingungen",
    text: "Es wurden besondere Bedingungen eingefügt. Bitte überprüfen.",
  },
  {
    kind: "spezial",
    title: "Honorar: Zahlweise zu knapp",
    text: "Bitte überprüfe die Zahlweise auf ihre Dauer.",
  },
  {
    kind: "standard",
    title: "Bankverbindung abweichend",
    text: "Achtung die Bankverbindung ist nicht die des Partners.",
  },
  {
    kind: "standard",
    title: "Honorar-Modell: Mail",
    text: "Achtung, die Mail ist nicht die des Partners.",
  },
  {
    kind: "standard",
    title: "Bankverbindung abweichend",
    text: "Achtung die Bankverbindung ist nicht die des Partners.",
  },
  {
    kind: "standard",
    title: "Leistungsumfang unvollständig",
    text: "Es wurde noch keine Sparte zur Betreuung ausgewählt.",
  },
];

type Change = "added" | "changed" | "removed" | "sent";

const CHANGE_LABEL: Record<Change, string> = {
  added: "hinzugefügt",
  changed: "geändert",
  removed: "entfernt",
  sent: "gesendet",
};

type Entry = {
  who: string;
  role: string;
  change: Change;
  field: string;
  from?: string;
  to?: string;
  at: string;
};

/** What the advisor did in the workflow, newest last. */
const VERLAUF: Entry[] = [
  {
    who: "Christine Auer",
    role: "Beratung & Service",
    change: "added",
    field: "Telefonnummer",
    to: "+43 3810 393 112 3",
    at: "12.03.2027, 09:14",
  },
  {
    who: "Christine Auer",
    role: "Beratung & Service",
    change: "added",
    field: "E-Mail",
    to: "julia.atkinson@mail.at",
    at: "12.03.2027, 09:16",
  },
  {
    who: "Christine Auer",
    role: "Beratung & Service",
    change: "added",
    field: "Postadresse",
    to: "Mondseestrasse 32, A-5310 Mondsee",
    at: "12.03.2027, 09:21",
  },
  {
    who: "Christine Auer",
    role: "Beratung & Service",
    change: "added",
    field: "Honorar-Modell",
    to: "Privat · EUR 120,00 / Jahr",
    at: "12.03.2027, 10:02",
  },
  {
    who: "Christine Auer",
    role: "Beratung & Service",
    change: "changed",
    field: "Zahlweise",
    from: "Rechnung",
    to: "Abbuchung",
    at: "12.03.2027, 10:05",
  },
  {
    who: "Christine Auer",
    role: "Beratung & Service",
    change: "added",
    field: "Bankverbindung",
    to: "Neon Bank · AT 2303 20002 0000 0002 0012",
    at: "12.03.2027, 10:07",
  },
  {
    who: "Christine Auer",
    role: "Beratung & Service",
    change: "added",
    field: "Individuelle Vereinbarungen",
    to: "Alleinvermittlungsauftrag",
    at: "12.03.2027, 11:40",
  },
  {
    who: "Christine Auer",
    role: "Beratung & Service",
    change: "removed",
    field: "Kündigungsverzicht 12 Monate",
    at: "12.03.2027, 11:44",
  },
];

function MetaStrip({ row }: { row: RequestRow }) {
  const { partner } = row;

  return (
    <div className="fg-meta">
      <div className="fg-meta-cell">
        <span className="fg-meta-label">Kunde</span>
        <div className="fg-meta-person">
          <span className="fg-meta-avatar">
            {partner.photo ? (
              <img className="photo" src={partner.photo} alt="" />
            ) : (
              <img src={partner.kind === "company" ? a.companyBlank : a.clientBlank} alt="" />
            )}
          </span>
          <span className="fg-meta-copy">
            <strong>{partner.name}</strong>
            <span className="fg-meta-types">
              {row.types.map((type) => (
                <span className="type-tag" key={type}>
                  {type}
                </span>
              ))}
            </span>
          </span>
        </div>
      </div>

      <span className="fg-meta-rule" />

      <div className="fg-meta-cell">
        <span className="fg-meta-label">Angefordert von</span>
        <div className="fg-meta-person">
          <span className="fg-meta-avatar">
            <img className="photo" src={row.requester.photo} alt="" />
          </span>
          <span className="fg-meta-copy">
            <strong>{row.requester.name}</strong>
            <small>{row.requester.role}</small>
          </span>
        </div>
      </div>

      <span className="fg-meta-rule" />

      <div className="fg-meta-cell">
        <span className="fg-meta-label">am</span>
        <p className="fg-meta-stamp">
          {row.date}
          <br />
          {row.time}
        </p>
      </div>

      <span className="fg-meta-rule" />

      <div className="fg-meta-cell">
        <span className="fg-meta-label">Status</span>
        <StatusPill status={row.status} />
      </div>
    </div>
  );
}

function StatusBanner({ row, signed }: { row: RequestRow; signed: boolean }) {
  if (row.status === "abgeschlossen") {
    return (
      <div className="rev-banner success">
        <div className="rev-banner-line">
          <Icon src={a.checkGreen} size={24} />
          <p>
            <strong>Dokument freigegeben</strong>
            <br />
            Der Bestandsmanager hat dieses Dokument freigegeben.
          </p>
        </div>
        {row.comment ? (
          <div className="rev-comment">
            <strong>Kommentar Bestandsmanager</strong>
            {row.comment}
          </div>
        ) : null}
      </div>
    );
  }

  if (row.status === "abgelehnt") {
    return (
      <div className="rev-banner error">
        <div className="rev-banner-line">
          <Icon src={a.warningCircle} size={24} />
          <p>
            <strong>Freigabe abgelehnt</strong>
            <br />
            Achtung, die Freigabe wurde abgelehnt.
          </p>
        </div>
        {row.comment ? (
          <div className="rev-comment">
            <strong>Kommentar Bestandsmanager</strong>
            {row.comment}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rev-banner pending">
      <div className="rev-banner-line">
        <Icon src={a.onhold} size={24} />
        <p>
          <strong>Freigabe ausstehend</strong>
          <br />
          Der Bestandsmanager muss dieses Dokument noch{" "}
          {signed ? "freigeben" : "genehmigen"}.
        </p>
      </div>
    </div>
  );
}

function AufgabenTab() {
  const spezial = AUFGABEN.filter((task) => task.kind === "spezial").length;
  const standard = AUFGABEN.length - spezial;

  return (
    <>
      <div className="fg-counts">
        <span className="fg-counts-label">Aufgaben</span>
        <span className="fg-count">
          <img src={a.dotSpecial} alt="" width={18} height={18} />
          <span>
            <strong>{spezial}</strong>
            Spezial
          </span>
        </span>
        <span className="fg-count">
          <img src={a.dotStandard} alt="" width={18} height={18} />
          <span>
            <strong>{standard}</strong>
            Standard Aufgaben
          </span>
        </span>
      </div>

      <ul className="fg-tasks">
        {AUFGABEN.map((task, index) => (
          <li className="fg-task" key={`${task.title}-${index}`}>
            <img
              className="fg-task-dot"
              src={task.kind === "spezial" ? a.dotSpecial : a.dotStandard}
              alt=""
              width={18}
              height={18}
            />
            <p>
              <strong>{task.title}</strong>
              {task.text}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

type Comment = { who: string; role: string; text: string };

/** The advisor's note from the request and the manager's note from the decision. */
function commentsFor(row: RequestRow): Comment[] {
  return [
    row.note
      ? { who: row.requester.name, role: "Anfrage an den Bestandsmanager", text: row.note }
      : null,
    row.comment
      ? {
          who: "Bestandsmanager",
          role:
            row.status === "abgelehnt"
              ? "Begründung der Ablehnung"
              : "Anmerkung zur Genehmigung",
          text: row.comment,
        }
      : null,
  ].filter((entry): entry is Comment => Boolean(entry));
}

function KommentareTab({ row }: { row: RequestRow }) {
  const comments = commentsFor(row);

  if (!comments.length) {
    return (
      <p className="fg-empty-note">
        Zu dieser Freigabe wurde noch kein Kommentar erfasst.
      </p>
    );
  }

  return (
    <ul className="fg-comments">
      {comments.map((entry) => (
        <li className="fg-comment" key={entry.who}>
          <span className="fg-comment-head">
            <Icon src={a.comment} size={18} />
            <span>
              <strong>{entry.who}</strong>
              <small>{entry.role}</small>
            </span>
          </span>
          <p>{entry.text}</p>
        </li>
      ))}
    </ul>
  );
}

function VerlaufTab({ row }: { row: RequestRow }) {
  const entries: Entry[] = [...VERLAUF];

  if (row.status !== "offen" || row.note) {
    entries.push({
      who: row.requester.name,
      role: "Beratung & Service",
      change: "sent",
      field: "Freigabe angefordert",
      to: row.note,
      at: `${row.date}, ${row.time}`,
    });
  }

  if (row.status !== "offen") {
    entries.push({
      who: "Bestandsmanager",
      role: "Bestandsmanagement",
      change: "changed",
      field: "Freigabe",
      from: "offen",
      to: row.status === "abgelehnt" ? "abgelehnt" : "genehmigt",
      at: row.decided ?? `${row.date}, ${row.time}`,
    });
  }

  return (
    <ol className="fg-verlauf">
      {entries.map((entry, index) => (
        <li className={`fg-entry ${entry.change}`} key={`${entry.field}-${index}`}>
          <span className="fg-entry-mark" />
          <div className="fg-entry-body">
            <span className="fg-entry-top">
              <strong>{entry.who}</strong>
              <small>{entry.role}</small>
              <time>{entry.at}</time>
            </span>
            <p className="fg-entry-what">
              <span className={`fg-chip ${entry.change}`}>{CHANGE_LABEL[entry.change]}</span>
              {entry.field}
            </p>
            {entry.from || entry.to ? (
              <p className="fg-entry-diff">
                {entry.from ? <s>{entry.from}</s> : null}
                {entry.from && entry.to ? <em>→</em> : null}
                {entry.to ? <b>{entry.to}</b> : null}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FreigabePage({
  row,
  onClose,
  onDecide,
}: {
  row: RequestRow;
  onClose: () => void;
  onDecide: (decision: "granted" | "rejected", note: string) => void;
}) {
  const { activeDoc, signMode, signature } = useWorkflow();
  const [pane, setPane] = useState<ContentPane>("freigabe");
  const [tab, setTab] = useState<Tab>("aufgaben");
  const [deciding, setDeciding] = useState<"granted" | "rejected" | null>(null);
  const signed = row.schritt === SCHRITT.sign;
  const decided = row.status !== "offen";
  /* Only these two carry a count; Verlauf and Zusammenfassung stay plain. */
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "aufgaben", label: "Aufgaben", count: AUFGABEN.length },
    { id: "kommentare", label: "Kommentare", count: commentsFor(row).length },
    { id: "verlauf", label: "Verlauf" },
    { id: "zusammenfassung", label: "Zusammenfassung" },
  ];

  return (
    <div className="app">
      <div className="shell">
        <BestandMainNav partner={row.partner.name} onClosePartner={onClose} />
        <BestandAreaNav />
        <AppsNav kicker="Maklervereinbarung" name={row.partner.name} />
        <ContentNav
          active={pane}
          pending={row.status === "offen" ? 1 : undefined}
          onSelect={setPane}
        />

        {pane === "workflow" ? (
          <div className="fg-page">
            <p className="fg-empty-note center">
              Der Workflow dieses Partners wird hier angezeigt.
            </p>
          </div>
        ) : (
          <div className="fg-page">
            <header className="fg-head">
              <div className="fg-head-title">
                <span className="fg-head-badge">
                  <Icon src={a.request} size={24} />
                </span>
                <p>
                  <strong>Freigabe prüfen:</strong>
                  <span>
                    {row.art} – {row.schritt}
                  </span>
                </p>
              </div>

              <MetaStrip row={row} />

              <div className="fg-head-actions">
                <button
                  type="button"
                  className="btn-secondary fg-verlauf-btn"
                  onClick={() => setTab("verlauf")}
                >
                  <Icon src={a.history} size={18} />
                  Verlauf
                </button>
                <button type="button" className="fg-head-search" aria-label="Suchen">
                  <Icon src={a.searchDark} size={20} />
                </button>
              </div>
            </header>

            <div className="review-main fg-body">
              <DocumentRail title={signed ? "Signaturen" : "Dokumente"} />
              <div className="review-card">
                <section className="review-content">
                  <StatusBanner row={row} signed={signed} />

                  <div className="fg-doc-title">
                    <strong>{DOCUMENTS[activeDoc] ?? DOCUMENTS[0]}</strong>
                    <span>
                      <Icon src={a.shelveToggle} size={18} />
                      {signed ? "Signaturfreigabe" : "Dokumentenfreigabe"}
                    </span>
                  </div>

                  <div className="fg-switch">
                    {tabs.map((entry) => (
                      <button
                        type="button"
                        key={entry.id}
                        className={`fg-switch-item${tab === entry.id ? " active" : ""}`}
                        onClick={() => setTab(entry.id)}
                      >
                        {entry.count === undefined
                          ? entry.label
                          : `${entry.label} (${entry.count})`}
                      </button>
                    ))}
                  </div>

                  <div className="fg-tab-body">
                    {tab === "aufgaben" && <AufgabenTab />}
                    {tab === "kommentare" && <KommentareTab row={row} />}
                    {tab === "verlauf" && <VerlaufTab row={row} />}
                    {tab === "zusammenfassung" && (
                      <div className="fg-summary">
                        <Summary cards={["contact", "honorar", "terms"]} />
                      </div>
                    )}
                  </div>
                </section>

                <section className="review-viewer">
                  <PdfViewer signature={signed && signMode === "digital" ? signature : null} />
                </section>
              </div>
            </div>

            <footer className="review-foot fg-foot">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Zurück zur Liste
              </button>
              <div className="review-foot-actions">
                <button
                  type="button"
                  className="btn-danger"
                  disabled={decided}
                  onClick={() => setDeciding("rejected")}
                >
                  Ablehnen...
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={decided}
                  onClick={() => setDeciding("granted")}
                >
                  Genehmigen...
                </button>
              </div>
            </footer>
          </div>
        )}
      </div>

      {deciding ? (
        <CommentPrompt
          title={deciding === "granted" ? "Genehmigen" : "Ablehnen"}
          confirmLabel={deciding === "granted" ? "Genehmigen" : "Ablehnen"}
          tone={deciding === "granted" ? "dark" : "danger"}
          onCancel={() => setDeciding(null)}
          onConfirm={(note) => {
            setDeciding(null);
            onDecide(deciding, note);
          }}
        />
      ) : null}
    </div>
  );
}
