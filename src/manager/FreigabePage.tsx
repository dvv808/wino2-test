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
import { AppsNav, ContentNav, type ContentPane } from "../chrome";
import { CommentPrompt } from "../CommentPrompt";
import { DocumentRail, PdfViewer } from "../documents";
import { DateField, Icon, InfoBox, PersonSelect } from "../ui";
import { useWorkflow, type PostedComment } from "../workflow";
import { BestandAreaNav, BestandMainNav } from "./BestandChrome";
import { Requester, StatusPill } from "./FreigabenPanel";
import { StammdatenChangeCard } from "./StammdatenChangeCard";
import { isStammdatenRequest, isWicoRequest, SCHRITT, type RequestRow } from "./requests";

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
  const stammdaten = isStammdatenRequest(row);
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
  const stammdaten = isStammdatenRequest(row);

  if (row.status === "abgeschlossen") {
    return (
      <div className="rev-banner success">
        <div className="rev-banner-line">
          <Icon src={a.checkGreen} size={24} />
          <p>
            <strong>{stammdaten ? "Änderung freigegeben" : "Dokument freigegeben"}</strong>
            <br />
            {stammdaten
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
            Achtung, die Freigabe wurde abgelehnt.
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
          {stammdaten
            ? "Der Bestandsmanager muss diese Stammdaten-Änderung noch genehmigen."
            : `Der Bestandsmanager muss diese ${signed ? "Signatur noch genehmigen" : "Dokument noch genehmigen"}.`}
        </p>
      </div>
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

export function FreigabePage({
  row,
  onClose,
  onDecide,
}: {
  row: RequestRow;
  onClose: () => void;
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
  } = useWorkflow();
  const [pane, setPane] = useState<ContentPane>("freigabe");
  const [tab, setTab] = useState<ApprovalTab>("aufgaben");
  const [deciding, setDeciding] = useState<"granted" | "rejected" | null>(null);
  const [stammdatenPosted, setStammdatenPosted] = useState<PostedComment[]>([]);
  const stammdaten = isStammdatenRequest(row);
  const signed = row.schritt === SCHRITT.sign;
  const decided = row.status !== "offen";
  const step = signed ? "sign" : "docs";
  const tasks = stammdaten ? STAMMDATEN_TASKS : MANAGER_TASKS[step];
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
        <BestandMainNav partner={row.partner.name} onClosePartner={onClose} />
        <BestandAreaNav />
        <AppsNav />
        <ContentNav
          active={pane}
          pending={row.status === "offen" ? 1 : undefined}
          onSelect={setPane}
        />

        {pane === "workflow" ? (
          <div className="fg-page">
            <p className="atab-empty center">
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
                        <Icon src={a.stammdaten} size={18} />
                        Stammdaten-Freigabe
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
                  {stammdaten && row.diff ? (
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
