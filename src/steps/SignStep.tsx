import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ADVISOR,
  ADVISOR_TASKS,
  ApprovalTabsBar,
  approvalTimeline,
  AufgabenList,
  buildComments,
  DocHeading,
  KommentareTab,
  VerlaufTab,
  ZusammenfassungTab,
  type ApprovalTab,
} from "../approvalTabs";
import * as a from "../assets/index";
import { DocumentRail, SignedDocumentPanel } from "../documents";
import { DateField, Icon, InfoBox, Notice, PersonSelect, Segmented } from "../ui";
import { useWorkflow } from "../workflow";

const CONSENT = [
  "Der Kunde stimmt ausdrücklich zu, dass besondere Kategorien personenbezogener Daten (sensible Daten insb. Gesundheitsdaten) durch den Makler zum Zweck der Vertragserfüllung verarbeitet und – soweit erforderlich – an Versicherungsunternehmen sowie an weitere an der Vertragsabwicklung beteiligte Dritte übermittelt werden. Sofern zum Zwecke der Vertragserfüllung die Verarbeitung personenbezogener Daten oder sensible personenbezogener Daten weiterer Personen erforderlich ist, erklärt der Kunde, dass er die erforderlichen Einwilligungen der betroffenen Personen eingeholt hat.",
  "Der Kunde hat das Recht, die erteilten Einwilligungen jederzeit zu widerrufen. Der Widerruf berührt die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung nicht. Ein Widerruf der Einwilligung zur Verarbeitung von für die Vertragserfüllung notwendigen Daten kann dazu führen, dass der Versicherungsmakler seine vertraglichen Pflichten nicht mehr erfüllen kann und eine weitere Betreuung nicht mehr möglich ist.",
  "Der Kunde erklärt sich damit einverstanden, dass Gespräche, Telefonate, Videokonferenzen oder sonstige Besprechungen im Rahmen der Geschäftsbeziehung zum Zwecke der Dokumentation, Qualitätssicherung und der Vertragserfüllung vom Makler aufgezeichnet, gespeichert und transkribiert werden dürfen.",
  "Weitere Informationen zur Datenverarbeitung sind der Datenschutzerklärung des Maklers zu entnehmen. Diese ist abrufbar unter www.makler-winter.at.",
];

function SignaturePad({ disabled }: { disabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const { signature, setSignature } = useWorkflow();
  const [empty, setEmpty] = useState(!signature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#313537";

    /* Restore an existing signature, e.g. after the trip through the Bestandsmanager. */
    if (signature) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = signature;
    }
  }, []);

  useEffect(() => {
    if (signature) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  }, [signature]);

  function position(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const { x, y } = position(event);
    drawing.current = true;
    setEmpty(false);
    context.beginPath();
    context.moveTo(x, y);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const { x, y } = position(event);
    context.lineTo(x, y);
    context.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) setSignature(canvas.toDataURL("image/png"));
  }

  return (
    <div className={`sign-pad${disabled ? " disabled" : ""}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      {empty && !signature ? <span>Mit Finger, Stift oder Maus unterschreiben</span> : null}
    </div>
  );
}

export function SignStep() {
  const {
    signApproval,
    grantedBy,
    requestNote,
    decisionNote,
    requestedAt,
    decidedAt,
    comments: posted,
    addComment,
  } = useWorkflow();
  const [tab, setTab] = useState<ApprovalTab>("aufgaben");

  /** A rejected request unlocks the step again so the signature can be corrected. */
  const locked = signApproval === "requested" || signApproval === "granted";
  const tasks = ADVISOR_TASKS.sign;
  const comments = buildComments({
    note: requestNote.sign,
    notePerson: ADVISOR,
    noteAt: requestedAt.sign,
    decision: decisionNote.sign,
    decisionAt: decidedAt.sign,
    posted: posted.sign,
  });
  const timeline = approvalTimeline({
    sentAt: requestedAt.sign,
    note: requestNote.sign,
    decidedAt: decidedAt.sign,
    decision:
      signApproval === "granted" || signApproval === "rejected" ? signApproval : null,
  });

  return (
    <>
      <DocumentRail title="Signaturen" />

      <section className="doc-main">
        {signApproval === "idle" && (
          <Notice tone="pending" title="Signaturen ausstehend">
            Signaturen müssen im Dokument noch ergänzt und bestätigt werden.
          </Notice>
        )}
        {signApproval === "requested" && (
          <Notice
            tone="pending"
            title="Freigabe ausstehend"
            comment={requestNote.sign}
            commentBy="an Bestandsmanager"
          >
            Der Bestandsmanager wurde benachrichtigt und muss dieses Dokument noch freigeben.
          </Notice>
        )}
        {signApproval === "rejected" && (
          <Notice tone="error" title="Freigabe abgelehnt" comment={decisionNote.sign}>
            Der Bestandsmanager hat die Signatur nicht freigegeben. Bitte korrigiere das Dokument
            und fordere die Freigabe erneut an.
          </Notice>
        )}
        {signApproval === "granted" && (
          <Notice
            tone="success"
            title="Workflow abgeschlossen"
            comment={grantedBy.sign === "manager" ? decisionNote.sign : undefined}
          />
        )}

        <DocHeading label="Signaturen" />

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
              <SignaturFields locked={locked} />
            </>
          )}
          {tab === "kommentare" && (
            <KommentareTab
              comments={comments}
              author={ADVISOR}
              onPost={(text) => addComment("sign", ADVISOR, text)}
            />
          )}
          {tab === "verlauf" && <VerlaufTab extra={timeline} />}
          {tab === "zusammenfassung" && <ZusammenfassungTab />}
        </div>
      </section>

      <SignedDocumentPanel />
    </>
  );
}

/** Upload or draw the signature. Locked once the Freigabe is out of the advisor's hands. */
function SignaturFields({ locked }: { locked: boolean }) {
  const {
    docSigner,
    signMode,
    setSignMode,
    signFile,
    setSignFile,
    setSignature,
    consent,
    setConsent,
    signDay,
    setSignDay,
    signMonth,
    setSignMonth,
    signYear,
    setSignYear,
  } = useWorkflow();

  return (
    <>
        <Segmented
          className="sign-switch"
          value={signMode}
          onChange={setSignMode}
          disabled={locked}
          options={[
            { id: "upload", label: "Unterz. Dokument hochladen" },
            { id: "digital", label: "Digitale Unterschrift" },
          ]}
        />

        {signMode === "upload" ? (
          <div className="block">
            <span className="field-label">Dokument hochladen:</span>
            {signFile ? (
              <div className="file-chip">
                <span className="stack-icon" style={{ width: 22, height: 22 }}>
                  <img src={a.pdf} alt="" width={22} height={22} />
                  <img src={a.pdfLabel} alt="" width={22} height={22} style={{ inset: 0 }} />
                </span>
                <span className="file-copy">
                  <strong>{signFile}</strong>
                  <small>PDF</small>
                </span>
                <button
                  type="button"
                  className="file-remove"
                  aria-label="Dokument entfernen"
                  disabled={locked}
                  onClick={() => setSignFile(null)}
                >
                  <Icon src={a.trash} size={18} />
                </button>
              </div>
            ) : (
              <label className="dropzone">
                <Icon src={a.upload} size={36} />
                <span>Dateien hier hinziehen</span>
                <small>oder</small>
                <span className="dropzone-btn">Datei auswählen</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSignFile(file ? file.name.replace(/\.pdf$/i, "") : "Maklervereinbarung");
                  }}
                />
              </label>
            )}
          </div>
        ) : null}

        {signMode === "digital" && (
          <div className="block">
            <span className="field-label">Unterzeichnet von</span>
            <PersonSelect name={docSigner} meta="12.09.1988" locked />
          </div>
        )}

        <div className="block">
          <span className="field-label">Unterzeichnet am</span>
          <DateField
            prefix="Am"
            day={signDay}
            month={signMonth}
            year={signYear}
            onDay={setSignDay}
            onMonth={setSignMonth}
            onYear={setSignYear}
            disabled={locked}
          />
        </div>

        {signMode === "upload" && (
          <div className="block">
            <span className="field-label">Unterzeichnet von</span>
            <PersonSelect name={docSigner} meta="12.09.1988" locked />
          </div>
        )}

        {signMode === "digital" && (
          <>
            <div className="block">
              <div className="label-row">
                <span className="field-label">Digital Unterschrift</span>
                <button
                  type="button"
                  className="edit-link plain"
                  disabled={locked}
                  onClick={() => setSignature(null)}
                >
                  Unterschrift löschen
                </button>
              </div>
              <InfoBox>
                Mit dieser Unterschrift werden alle angeführten Dokumente unterzeichnet.
              </InfoBox>
              <SignaturePad disabled={locked} />
            </div>

            <div className="consent">
              <h4>Einwilligung zur Verarbeitung von sensiblen Daten</h4>
              {CONSENT.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
              <button
                type="button"
                className="consent-row"
                disabled={locked}
                onClick={() => setConsent(!consent)}
                aria-pressed={consent}
              >
                <span className={`switch${consent ? " on" : ""}`} />
                Wir bestätigen dies ausdrücklich.
              </button>
            </div>
          </>
        )}
    </>
  );
}
