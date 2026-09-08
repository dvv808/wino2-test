import * as a from "../assets/index";
import { DocumentRail, PdfViewer } from "../documents";
import { Icon, Notice, PersonSelect } from "../ui";
import { DOCUMENTS, useWorkflow } from "../workflow";

export function DocsStep() {
  const { docsApproval, docSigner, grantedBy, requestNote, decisionNote, activeDoc } =
    useWorkflow();

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

        <h1 className="doc-title">
          <Icon src={a.docList} size={16} />
          Dokumentenfreigabe
        </h1>
        <p className="doc-subtitle">{DOCUMENTS[activeDoc] ?? DOCUMENTS[0]}</p>

        <div className="doc-copy">
          <p>
            Folgende Dokumente wurden erfolgreich erstellt und sind zur Freigabe sowie zur
            Vervollständigung der Maklervereinbarung bereit.
          </p>
          <p>
            Bitte gehe die Dokumente noch einmal durch und bestätige diese unten durch die
            Freigabeanforderung.
          </p>
          <p>
            Anschließend werden diese durch den Bestandsmanager geprüft und zur finalen Signatur
            freigegeben.
          </p>
        </div>

        {docsApproval === "granted" && (
          <div className="block">
            <span className="field-label">Unterzeichnende Person definieren</span>
            <PersonSelect name={docSigner} meta="12.09.1988" />
          </div>
        )}
      </section>

      <section className="doc-viewer">
        <PdfViewer />
      </section>
    </>
  );
}
