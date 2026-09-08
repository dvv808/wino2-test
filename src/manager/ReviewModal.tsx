import { useState } from "react";
import * as a from "../assets/index";
import { CommentPrompt } from "../CommentPrompt";
import { DocumentRail, PdfViewer } from "../documents";
import { DateField, Icon, InfoBox, PersonSelect } from "../ui";
import { useWorkflow } from "../workflow";
import { StatusPill } from "./FreigabenPanel";
import { SCHRITT, type RequestRow } from "./requests";

function StatusBanner({ row, signed }: { row: RequestRow; signed: boolean }) {
  if (row.status === "abgeschlossen") {
    return (
      <div className="rev-banner success">
        <div className="rev-banner-line">
          <Icon src={a.checkGreen} size={24} />
          <p>
            Dokument freigegeben - Workflow abgeschlossen
            <br />
            Der Bestandsmanager hat dieses Dokument freigegeben.
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
          Freigabe ausstehend
          <br />
          Der Bestandsmanager muss dieses Dokument noch{" "}
          {signed ? "freigeben" : "genehmigen"}.
        </p>
      </div>
      {row.note ? (
        <div className="rev-comment">
          <strong>Kommentar {row.requester.name}</strong>
          {row.note}
        </div>
      ) : null}
    </div>
  );
}

function PartnerCard({ row }: { row: RequestRow }) {
  const { partner } = row;

  return (
    <div className="rev-partner">
      <button type="button" className="rev-partner-open" aria-label={`${partner.name} öffnen`}>
        <Icon src={a.openTab} size={15} />
      </button>

      <div className="rev-partner-top">
        <span className="rev-partner-avatar">
          {partner.photo ? (
            <img className="photo" src={partner.photo} alt="" />
          ) : (
            <img src={partner.kind === "company" ? a.companyBlank : a.clientBlank} alt="" />
          )}
        </span>
        <div className="rev-partner-copy">
          <strong>{partner.name}</strong>
          <small>
            {partner.meta}
            {partner.alias ? <em>{partner.alias}</em> : null}
          </small>
          <span className="rev-partner-types">
            {row.types.map((type) => (
              <span className="type-tag" key={type}>
                {type}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="rev-partner-grid">
        <div>
          <span className="rev-label">Angefordert von</span>
          <div className="requester-cell">
            <span className="requester-avatar">
              <img src={row.requester.photo} alt="" />
            </span>
            <span className="requester-copy">
              <strong>{row.requester.name}</strong>
              <small>{row.requester.role}</small>
            </span>
          </div>
        </div>
        <div>
          <span className="rev-label">Angefordert am</span>
          <p className="rev-stamp">
            {row.date}
            <br />
            {row.time}
          </p>
        </div>
        <div>
          <span className="rev-label">Status</span>
          <StatusPill status={row.status} />
        </div>
      </div>
    </div>
  );
}

function DokumentReview() {
  return (
    <>
      <h1 className="doc-title">
        <Icon src={a.shelveToggle} size={18} />
        Dokumentenfreigabe
      </h1>
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
    </>
  );
}

function SignaturReview() {
  const { docSigner, signMode, signature, signDay, signMonth, signYear } = useWorkflow();

  return (
    <>
      <h1 className="doc-title">
        <Icon src={a.shelveToggle} size={18} />
        Dokument unterzeichnet hochladen oder digital signieren
      </h1>
      <p className="doc-lede">
        Lade das unterzeichnete Dokument hoch oder nutze die digitale Unterschrift.
      </p>

      {/* The advisor already made this choice; the manager only reviews it. */}
      <div className="segmented sign-switch readonly">
        <span className={`segment${signMode === "upload" ? " active" : ""}`}>
          Unterz. Dokument definieren
        </span>
        <span className={`segment${signMode === "digital" ? " active" : ""}`}>
          Digitale Unterschrift
        </span>
      </div>

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

      {signMode === "digital" ? (
        <div className="block">
          <div className="label-row">
            <span className="field-label">Digital Unterschrift</span>
            <span className="edit-link plain">Unterschrift löschen</span>
          </div>
          <InfoBox>Mit dieser Unterschrift werden alle angeführten Dokumente unterzeichnet.</InfoBox>
          <div className="sign-pad readonly">
            {signature ? <img src={signature} alt="Unterschrift" /> : null}
            <span>Mit Finger, Stift oder Maus unterschreiben</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ReviewModal({
  row,
  onClose,
  onDecide,
}: {
  row: RequestRow;
  onClose: () => void;
  onDecide: (decision: "granted" | "rejected", note: string) => void;
}) {
  const { signature, signMode } = useWorkflow();
  /** Set while the manager is writing the note that goes with the decision. */
  const [deciding, setDeciding] = useState<"granted" | "rejected" | null>(null);
  const signed = row.schritt === SCHRITT.sign;
  const decided = row.status !== "offen";

  return (
    <>
    <div className="review-modal" role="dialog" aria-label={`Freigabe überprüfen: ${row.schritt}`}>
      <button type="button" className="review-scrim" aria-label="Schließen" onClick={onClose} />

      <div className="review-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">
            <Icon src={a.request} size={16} />
            Freigabe überprüfen
          </span>
          <button
            type="button"
            className="review-titlebar-close"
            aria-label="Schließen"
            onClick={onClose}
          >
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>

        <div className="review-head">
          <div className="review-head-col">
            <div className="rev-intro">
              <span className="rev-intro-badge">
                <Icon src={a.request} size={24} />
              </span>
              <p>
                <strong>Freigabe prüfen:</strong>
                <span>
                  {row.art} – {row.schritt}
                </span>
              </p>
            </div>
            <button type="button" className="btn-primary rev-jump" onClick={onClose}>
              <Icon src={a.openTab} size={18} />
              Workflow bearbeiten
            </button>
          </div>

          <span className="review-head-rule" />

          <div className="review-head-col">
            <span className="rev-label">Freigabe Status</span>
            <StatusBanner row={row} signed={signed} />
          </div>

          <span className="review-head-rule" />

          <div className="review-head-col">
            <PartnerCard row={row} />
          </div>
        </div>

        <div className="review-main">
          <DocumentRail title="Signaturen" />
          <div className="review-card">
            <section className="review-content">
              {signed ? <SignaturReview /> : <DokumentReview />}
            </section>
            <section className="review-viewer">
              <PdfViewer signature={signed && signMode === "digital" ? signature : null} />
            </section>
          </div>
        </div>

        <footer className="review-foot">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
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
    </>
  );
}
