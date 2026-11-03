import { useState } from "react";
import {
  ApprovalTabsBar,
  approvalTimeline,
  AufgabenList,
  buildComments,
  DocHeading,
  KommentareTab,
  MANAGER,
  MANAGER_TASKS,
  VerlaufTab,
  ZusammenfassungTab,
  type ApprovalTab,
} from "../approvalTabs";
import * as a from "../assets/index";
import { APPS, WorkflowDockTab } from "../chrome";
import { CommentPrompt } from "../CommentPrompt";
import { DocumentRail, PdfViewer } from "../documents";
import { DateField, Icon, InfoBox, PersonSelect } from "../ui";
import { useWorkflow, type PostedComment, type WorkflowPane } from "../workflow";
import { BestandMainNav } from "./BestandChrome";
import { WorkflowSteps } from "../honorar/RechnungWorkflow";
import { Requester, StatusPill } from "./FreigabenPanel";
import { StammdatenChangeCard } from "./StammdatenChangeCard";
import { formatDay } from "../lib/honorar/format";
import { partnerOf } from "../lib/honorar/queries";
import { invoiceNumberOf, money, openAmount } from "../honorar/invoiceCells";
import { useHonorar } from "../honorar/store";
import { isRechnungRequest, isStammdatenRequest, isWicoRequest, SCHRITT, type RequestRow } from "./requests";

const STAMMDATEN_TASKS = [
  {
    title: "Wer hat geändert",
    text: "Prüfe, ob die Änderung von einer Mitarbeiterin oder von WICO stammt.",
  },
  {
    title: "Was wurde geändert",
    text: "Vergleiche die Winmakler-Werte mit den neuen Wino-2-Werten.",
  },
];

const RECHNUNG_TASKS = [
  {
    title: "Antrag prüfen",
    text: "Prüfe Art der Korrektur, Betrag oder Zahlungsziel und die Begründung des Kundenberaters.",
  },
  {
    title: "Freigeben oder ablehnen",
    text: "Bei Freigabe verbucht der Honorarverwalter die Korrektur. Bei Ablehnung geht der Antrag zurück an den Kundenberater (Kommentar Pflicht).",
  },
];

function localStamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function MetaStrip({ row, signed }: { row: RequestRow; signed: boolean }) {
  const { partner } = row;
  const stammdaten = isStammdatenRequest(row) || isRechnungRequest(row);
  const wico = isWicoRequest(row);

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
          {wico ? (
            <Requester row={row} />
          ) : (
            <>
              <span className="fg-meta-avatar">
                <img className="photo" src={row.requester.photo} alt="" />
              </span>
              <span className="fg-meta-copy">
                <strong>{row.requester.name}</strong>
                <small>{row.requester.role}</small>
              </span>
            </>
          )}
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

      <span className="fg-meta-rule" />

      <div className="fg-meta-cell">
        <span className="fg-meta-label">Schritt</span>
        <p className="fg-meta-stamp">
          {stammdaten ? row.stepPosition ?? row.schritt : signed ? "5 von 5" : "4 von 5"}
          <br />
          {stammdaten ? row.stepLabel ?? row.schritt : signed ? "Signatur" : "Dokumentenfreigabe"}
        </p>
      </div>
    </div>
  );
}

function StatusBanner({ row, signed }: { row: RequestRow; signed: boolean }) {
  const rechnung = isRechnungRequest(row);
  const stammdaten = isStammdatenRequest(row) || rechnung;

  if (row.status === "abgeschlossen") {
    return (
      <div className="rev-banner success">
        <div className="rev-banner-line">
          <Icon src={a.checkGreen} size={24} />
          <p>
            <strong>{rechnung ? "Antrag freigegeben" : stammdaten ? "Änderung freigegeben" : "Dokument freigegeben"}</strong>
            <br />
            {rechnung
              ? "Der Bestandsmanager hat diesen Antrag freigegeben. Der Honorarverwalter verbucht ihn als Nächstes."
              : stammdaten
              ? "Der Bestandsmanager hat diese Stammdaten-Änderung freigegeben."
              : "Der Bestandsmanager hat dieses Dokument freigegeben."}
          </p>
        </div>
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
            {rechnung ? "Der Antrag ging zur Anpassung zurück an den Kundenberater." : "Achtung, die Freigabe wurde abgelehnt."}
          </p>
        </div>
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
          {rechnung
            ? "Der Bestandsmanager muss diesen Antrag noch genehmigen."
            : stammdaten
            ? "Der Bestandsmanager muss diese Stammdaten-Änderung noch genehmigen."
            : `Der Bestandsmanager muss diese ${signed ? "Signatur noch genehmigen" : "Dokument noch genehmigen"}.`}
        </p>
      </div>
    </div>
  );
}

/** The Antrag of an invoice workflow, shown where a Maklervereinbarung shows the PDF. */
function RechnungAntragCard({ row }: { row: RequestRow }) {
  const { state } = useHonorar();
  const fee = state.fees.find((entry) => entry.id === row.feeId);
  const correction = fee?.correction;
  if (!fee || !correction) return <p className="atab-empty center">Der Antrag ist nicht mehr verfügbar.</p>;
  const partner = partnerOf(state, fee.partnerId);
  const open = openAmount(state, fee);
  const summary =
    correction.kind === "Zahlungsziel ändern"
      ? `Neues Zahlungsziel ${correction.dueDate ? formatDay(correction.dueDate) : "-"}`
      : correction.kind === "Teilgutschrift"
        ? `Gutschrift € ${money(correction.amount ?? 0)}`
        : correction.kind === "Doch bezahlt"
          ? "Rechnung als bezahlt verbuchen"
          : `Gutschrift € ${money(correction.amount ?? open)}${correction.amount === undefined ? " (offener Betrag)" : ""}`;
  return (
    <div className="rw-card">
      <span className="hn-inv-label">Antrag {correction.workflow}</span>
      <h2 className="rw-title">
        {partner?.name} - Rechnung {invoiceNumberOf(fee) ?? ""}
      </h2>
      <dl className="hn-inv-figures">
        <div>
          <dt>Rechnungsbetrag</dt>
          <dd>€ {money(fee.amount)}</dd>
        </div>
        <div>
          <dt>Offen</dt>
          <dd>€ {money(open)}</dd>
        </div>
        <div>
          <dt>Zahlungsziel</dt>
          <dd>{formatDay(fee.dueDate)}</dd>
        </div>
      </dl>
      <p className="hn-inv-fact">
        <span>
          <strong>{correction.kind}</strong>: {summary}
        </span>
        <small>Begründung: {correction.reason}</small>
      </p>
    </div>
  );
}

/** The advisor already signed; the manager only reads the result back. */
function SignatureReviewFields() {
  const { docSigner, signature, signDay, signMonth, signYear } = useWorkflow();

  return (
    <>
      <div className="block">
        <span className="field-label">Unterzeichnet von</span>
        <PersonSelect name={docSigner} meta="Geschäftsführer Makler Winter" locked />
      </div>

      <div className="block">
        <span className="field-label">Unterzeichnet am</span>
        <DateField
          prefix="Am"
          day={signDay}
          month={signMonth}
          year={signYear}
          onDay={() => {}}
          onMonth={() => {}}
          onYear={() => {}}
          disabled
        />
      </div>

      <div className="block">
        <div className="label-row">
          <span className="field-label">Digital Unterschrift</span>
          <span className="edit-link plain">Unterschrift löschen</span>
        </div>
        <InfoBox>
          Mit dieser Unterschrift werden alle angeführten Dokumente unterzeichnet.
        </InfoBox>
        <div className="sign-pad readonly">
          {signature ? <img src={signature} alt="Unterschrift" /> : null}
          <span>Mit Finger, Stift oder Maus unterschreiben</span>
        </div>
      </div>
    </>
  );
}

type FreigabePane = WorkflowPane | "freigabe";

/** The partner's workflow nav, as in the standard workflow, with the Freigabe the Bestandsmanager opened right after Workflow. */
const FREIGABE_PANES: { id: FreigabePane; label: string; icon: string }[] = [
  { id: "workflow", label: "Workflow", icon: a.moduleWorkflow },
  { id: "freigabe", label: "Freigabe", icon: a.request },
  { id: "notizen", label: "Notizen", icon: a.navNotes },
  { id: "email", label: "E-Mail", icon: a.navMail },
  { id: "dateien", label: "Dateien", icon: a.navFolder },
  { id: "verlauf", label: "Verlauf", icon: a.navHistory },
];

export function FreigabePage({
  row,
  onClose,
  onPark,
  onDecide,
}: {
  row: RequestRow;
  onClose: () => void;
  /** Leaves the Freigabe open as a parked tab (Management or another tab comes to the front). */
  onPark: () => void;
  onDecide: (decision: "granted" | "rejected", note: string) => void;
}) {
  const {
    signMode,
    signature,
    decidedAt,
    comments: posted,
    addComment,
    editComment,
    removeComment,
    openStammdaten,
    openRechnungWorkflow,
  } = useWorkflow();
  const [pane, setPane] = useState<FreigabePane>("freigabe");
  const { state: honorar } = useHonorar();
  const [tab, setTab] = useState<ApprovalTab>("aufgaben");
  const [deciding, setDeciding] = useState<"granted" | "rejected" | null>(null);
  const [stammdatenPosted, setStammdatenPosted] = useState<PostedComment[]>([]);
  const rechnung = isRechnungRequest(row);
  const rechnungFee = rechnung && row.feeId ? honorar.fees.find((fee) => fee.id === row.feeId) : undefined;
  const stammdaten = isStammdatenRequest(row) || rechnung;
  const signed = row.schritt === SCHRITT.sign;
  const decided = row.status !== "offen";
  const step = signed ? "sign" : "docs";
  const tasks = rechnung ? RECHNUNG_TASKS : stammdaten ? STAMMDATEN_TASKS : MANAGER_TASKS[step];
  const sentAt = { date: row.date, time: row.time };
  const comments = buildComments({
    note: row.note,
    notePerson: row.requester,
    noteAt: sentAt,
    decision: row.comment,
    decisionAt: decidedAt[step] ?? sentAt,
    posted: stammdaten ? stammdatenPosted : posted[step],
  });
  const timeline = approvalTimeline({
    requester: row.requester,
    sentAt,
    note: row.note,
    decidedAt: decidedAt[step] ?? sentAt,
    decision: decided ? (row.status === "abgelehnt" ? "rejected" : "granted") : null,
  });

  return (
    <div className="app">
      <div className="shell">
        {/* The partner's file is the open tab; Management stays parked beside it as the way back to the list. */}
        <BestandMainNav partner={row.partner.name} onClosePartner={onClose} onOpenManagement={onPark} />

        <nav className="apps-nav">
          <div className="app-pills">
            {APPS.map((label) => (
              <button type="button" className="app-pill" key={label}>
                {label}
              </button>
            ))}
          </div>
          <div className="workflow-dock">
            <WorkflowDockTab
              kicker={(rechnung && rechnungFee?.correction?.workflow) || row.art}
              name={row.partner.name}
              active
              onClose={onClose}
            />
          </div>
        </nav>

        <div className="content-nav">
          <div className="content-nav-items">
            {FREIGABE_PANES.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={`content-nav-item${pane === entry.id ? " active" : ""}`}
                onClick={() => setPane(entry.id)}
              >
                <Icon src={entry.icon} size={24} className={entry.id === "freigabe" ? "icon-dark" : undefined} />
                {entry.label}
                {entry.id === "freigabe" && row.status === "offen" ? <span className="content-nav-badge">1</span> : null}
              </button>
            ))}
          </div>
        </div>

        {pane === "workflow" ? (
          rechnungFee?.correction ? (
            <div className="content-shell">
              <WorkflowSteps fee={rechnungFee} partner={partnerOf(honorar, rechnungFee.partnerId)} correction={rechnungFee.correction} />
            </div>
          ) : (
            <div className="fg-page">
              <p className="atab-empty center">Der Workflow dieses Partners wird hier angezeigt.</p>
            </div>
          )
        ) : pane !== "freigabe" ? (
          <div className="content-shell">
            <main className="page single wf-blank" />
          </div>
        ) : (
          <div className="fg-page">
            <header className="fg-head">
              <div className="fg-head-title">
                <span className="fg-head-badge">
                  <Icon src={a.request} size={24} className="icon-dark" />
                </span>
                <p>
                  <strong>Freigabe prüfen:</strong>
                  <span>
                    {row.art} – {row.stepLabel ?? row.schritt}
                  </span>
                </p>
              </div>

              <MetaStrip row={row} signed={signed} />

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

            <div className={stammdaten ? "review-main fg-body sd-review" : "review-main fg-body"}>
              {stammdaten ? null : (
                <DocumentRail title={signed ? "Signaturen" : "Dokumentenfreigabe"} />
              )}
              <div className="review-card">
                <section className="review-content">
                  <StatusBanner row={row} signed={signed} />

                  {stammdaten ? (
                    <div className="doc-heading">
                      <strong>{row.partner.name}</strong>
                      <span>
                        <Icon src={rechnung ? a.request : a.stammdaten} size={18} className={rechnung ? "icon-dark" : undefined} />
                        {rechnung ? "Rechnungs-Freigabe" : "Stammdaten-Freigabe"}
                      </span>
                    </div>
                  ) : (
                    <DocHeading label={signed ? "Signaturfreigabe" : "Dokumentenfreigabe"} />
                  )}

                  <ApprovalTabsBar
                    active={tab}
                    onSelect={setTab}
                    taskCount={tasks.length}
                    commentCount={comments.length}
                  />

                  <div className="atab-body">
                    {tab === "aufgaben" && (
                      <>
                        <AufgabenList items={tasks} />
                        {signed ? <SignatureReviewFields /> : null}
                      </>
                    )}
                    {tab === "kommentare" && (
                      <KommentareTab
                        comments={comments}
                        author={MANAGER}
                        onPost={(text) => {
                          if (stammdaten) {
                            setStammdatenPosted((current) => [
                              ...current,
                              { person: MANAGER, text, at: localStamp() },
                            ]);
                            return;
                          }
                          addComment(step, MANAGER, text);
                        }}
                        onEdit={(index, text) => {
                          if (stammdaten) {
                            setStammdatenPosted((current) =>
                              current.map((entry, i) => (i === index ? { ...entry, text } : entry)),
                            );
                            return;
                          }
                          editComment(step, index, text);
                        }}
                        onRemove={(index) => {
                          if (stammdaten) {
                            setStammdatenPosted((current) => current.filter((_, i) => i !== index));
                            return;
                          }
                          removeComment(step, index);
                        }}
                      />
                    )}
                    {tab === "verlauf" && <VerlaufTab extra={timeline} />}
                    {tab === "zusammenfassung" && <ZusammenfassungTab />}
                  </div>
                </section>

                <section className="review-viewer">
                  {rechnung ? (
                    <RechnungAntragCard row={row} />
                  ) : stammdaten && row.diff ? (
                    <StammdatenChangeCard diff={row.diff} />
                  ) : (
                    <PdfViewer signature={signed && signMode === "digital" ? signature : null} />
                  )}
                </section>
              </div>
            </div>

            <footer className="review-foot fg-foot">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Zurück zur Liste
              </button>
              <div className="review-foot-actions">
                {stammdaten && row.partnerId && row.stammdatenArea ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      openStammdaten(row.stammdatenArea!, row.stammdatenCardId, row.partnerId)
                    }
                  >
                    Zum Workflow
                  </button>
                ) : null}
                {rechnung && row.feeId ? (
                  <button type="button" className="btn-secondary" onClick={() => openRechnungWorkflow(row.feeId!)}>
                    Zum Workflow
                  </button>
                ) : null}
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
