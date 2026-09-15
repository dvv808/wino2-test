import { useState } from "react";
import {
  ADVISOR,
  ADVISOR_TASKS,
  ApprovalTabsBar,
  AufgabenList,
  buildComments,
  DocHeading,
  KommentareTab,
  VerlaufTab,
  ZusammenfassungTab,
  type ApprovalTab,
  type Entry,
} from "../approvalTabs";
import { DocumentRail, PdfViewer } from "../documents";
import { Notice, PersonSelect } from "../ui";
import { useWorkflow } from "../workflow";

export function DocsStep() {
  const { docsApproval, docSigner, grantedBy, requestNote, decisionNote, requestedAt } =
    useWorkflow();
  const [tab, setTab] = useState<ApprovalTab>("aufgaben");
  const tasks = ADVISOR_TASKS.docs;
  const comments = buildComments({
    note: requestNote.docs,
    noteBy: ADVISOR.who,
    decision: decisionNote.docs,
    rejected: docsApproval === "rejected",
  });

  /* The advisor sees the same timeline, closed out with their own request. */
  const timeline: Entry[] = [];
  const sent = requestedAt.docs;
  if (sent) {
    timeline.push({
      ...ADVISOR,
      change: "sent",
      field: "Freigabe angefordert",
      to: requestNote.docs,
      at: `${sent.date}, ${sent.time}`,
    });
  }
  if (decisionNote.docs) {
    timeline.push({
      who: "Bestandsmanager",
      role: "Bestandsmanagement",
      change: "changed",
      field: "Freigabe",
      from: "offen",
      to: docsApproval === "rejected" ? "abgelehnt" : "genehmigt",
      at: sent ? `${sent.date}, ${sent.time}` : "",
    });
  }

  return (
    <>
      <DocumentRail title="Dokumentenfreigabe" />

      <section className="doc-main">
        {docsApproval === "idle" && (
          <Notice tone="pending" title="Dokumentenfreigabe ausstehend">
            Eine Freigabeanforderung an den Bestandsmanager ist noch ausstehend.
          </Notice>
        )}
        {docsApproval === "requested" && (
          <Notice
            tone="pending"
            title="Freigabe ausstehend"
            comment={requestNote.docs}
            commentBy="an Bestandsmanager"
          >
            Der Bestandsmanager wurde benachrichtigt und muss dieses Dokument noch freigeben.
          </Notice>
        )}
        {docsApproval === "rejected" && (
          <Notice tone="error" title="Freigabe abgelehnt" comment={decisionNote.docs}>
            Der Bestandsmanager hat die Dokumente nicht freigegeben. Bitte überprüfe die Angaben
            und fordere die Freigabe erneut an.
          </Notice>
        )}
        {docsApproval === "granted" && (
          <Notice
            tone="success"
            title="Dokumente freigegeben"
            comment={grantedBy.docs === "manager" ? decisionNote.docs : undefined}
          >
            {grantedBy.docs === "manager"
              ? "Der Bestandsmanager hat diese Dokumente freigegeben. Im nächsten Schritt kannst du sie unterschrieben hochladen oder digital signieren lassen."
              : "Du hast diese Dokumente selbst freigegeben. Im nächsten Schritt kannst du sie unterschrieben hochladen oder digital signieren lassen."}
          </Notice>
        )}

        <DocHeading label="Dokumentenfreigabe" />

        <ApprovalTabsBar
          active={tab}
          onSelect={setTab}
          taskCount={tasks.length}
          commentCount={comments.length}
        />

        <div className="atab-body">
          {tab === "aufgaben" && (
            <>
              <p className="doc-lede">
                Folgende Dokumente wurden erfolgreich erstellt und sind zur Freigabe sowie zur
                Vervollständigung der Maklervereinbarung bereit.
              </p>
              <AufgabenList items={tasks} />

              {docsApproval === "granted" && (
                <div className="block">
                  <span className="field-label">Unterzeichnende Person definieren</span>
                  <PersonSelect name={docSigner} meta="12.09.1988" />
                </div>
              )}
            </>
          )}
          {tab === "kommentare" && <KommentareTab comments={comments} />}
          {tab === "verlauf" && <VerlaufTab extra={timeline} />}
          {tab === "zusammenfassung" && <ZusammenfassungTab />}
        </div>
      </section>

      <section className="doc-viewer">
        <PdfViewer />
      </section>
    </>
  );
}
