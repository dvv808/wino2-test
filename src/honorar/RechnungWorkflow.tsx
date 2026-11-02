import { useEffect, useState } from "react";
import * as a from "../assets/index";
import { APPS, WorkflowDockTab } from "../chrome";
import { formatDate, formatDay } from "../lib/honorar/format";
import { partnerOf } from "../lib/honorar/queries";
import { BestandMainNav } from "../manager/BestandChrome";
import { ROLE_USER } from "../mocks/honorar/seed";
import type { Fee, InvoiceCorrection, InvoiceCorrectionKind, InvoiceWorkflowType, Partner } from "../types/honorar";
import { Icon, Snackbar } from "../ui";
import { useWorkflow, type WorkflowPane } from "../workflow";
import { HistoryTab, InvoiceInfoModal } from "./InvoiceInfoModal";
import { WORKFLOW_STEPS, invoiceNumberOf, money, openAmount, rechnungenCells, statusPillOf, workflowStepIndex } from "./invoiceCells";
import { useHonorar } from "./store";
import { ConfirmModal } from "./ui";

const PANES: { id: WorkflowPane; label: string; icon: string }[] = [
  { id: "workflow", label: "Workflow", icon: a.moduleWorkflow },
  { id: "notizen", label: "Notizen", icon: a.navNotes },
  { id: "email", label: "E-Mail", icon: a.navMail },
  { id: "dateien", label: "Dateien", icon: a.navFolder },
  { id: "verlauf", label: "Verlauf", icon: a.navHistory },
];

const KINDS: { id: InvoiceCorrectionKind; hint: string }[] = [
  { id: "Zahlungsziel ändern", hint: "Neues Zahlungsziel, der Betrag bleibt." },
  { id: "Teilgutschrift", hint: "Ein Teil des Betrags wird gutgeschrieben." },
  { id: "Vollgutschrift", hint: "Der offene Betrag wird ganz gutgeschrieben." },
  { id: "Doch bezahlt", hint: "Die Zahlung ist eingegangen, wurde aber nicht zugeordnet." },
];

/** Which corrections each workflow allows in its Antrag. */
const KINDS_OF: Record<InvoiceWorkflowType, InvoiceCorrectionKind[]> = {
  Gutschrift: ["Teilgutschrift", "Vollgutschrift"],
  "Zahlungsziel anpassen": ["Zahlungsziel ändern"],
  "Doch bezahlt markieren": ["Doch bezahlt"],
  Rechnungskorrektur: ["Zahlungsziel ändern", "Teilgutschrift", "Vollgutschrift"],
};

/** Vollgutschrift has no amount until it is booked; until then it covers whatever is still open. */
function correctionSummary(correction: InvoiceCorrection, open: number) {
  if (correction.kind === "Zahlungsziel ändern") return `Neues Zahlungsziel ${correction.dueDate ? formatDay(correction.dueDate) : "-"}`;
  if (correction.kind === "Teilgutschrift") return `Gutschrift € ${money(correction.amount ?? 0)}`;
  if (correction.kind === "Doch bezahlt") return "Rechnung als bezahlt verbuchen";
  return correction.amount !== undefined ? `Gutschrift € ${money(correction.amount)}` : `Gutschrift € ${money(open)} (offener Betrag)`;
}

function personOf(index: 0 | 1 | 2, partner: Partner | undefined) {
  if (index === 0) return partner?.advisor ?? ROLE_USER.advisor;
  if (index === 1) return ROLE_USER.head;
  return ROLE_USER.backoffice;
}

/** The workflow of one invoice (Gutschrift, Zahlungsziel, Doch bezahlt, Rechnungskorrektur), beside its partner tab. */
export function RechnungWorkflowPage() {
  const { rechnungFeeId, closeRechnungWorkflow, backToFinanzen } = useWorkflow();
  const { state } = useHonorar();
  const [pane, setPane] = useState<WorkflowPane>("workflow");
  const fee = state.fees.find((entry) => entry.id === rechnungFeeId);
  const partner = fee ? partnerOf(state, fee.partnerId) : undefined;
  const correction = fee?.correction;
  const name = partner?.name ?? "Partner";

  return (
    <div className="app">
      <div className="shell">
        <BestandMainNav partner={name} onClosePartner={closeRechnungWorkflow} onOpenManagement={backToFinanzen} />

        <nav className="apps-nav">
          <div className="app-pills">
            {APPS.map((label) => (
              <button type="button" className="app-pill" key={label}>
                {label}
              </button>
            ))}
          </div>
          {correction ? (
            <div className="workflow-dock">
              <WorkflowDockTab kicker={correction.workflow} name={name} active onClose={closeRechnungWorkflow} />
            </div>
          ) : null}
        </nav>

        <div className="content-nav">
          <div className="content-nav-items">
            {PANES.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={`content-nav-item${pane === entry.id ? " active" : ""}`}
                onClick={() => setPane(entry.id)}
              >
                <Icon src={entry.icon} size={24} />
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="content-shell">
          {!fee || !correction ? (
            <main className="page single rw-page">
              <section className="rw-card">
                <h1 className="rw-title">Kein laufender Workflow</h1>
                <p>Für diese Rechnung läuft gerade kein Workflow. Er wurde abgebrochen oder ist nach dem Neuladen der Seite zurückgesetzt.</p>
                <button type="button" className="btn-primary" onClick={closeRechnungWorkflow}>
                  Zurück zu den Forderungen
                </button>
              </section>
            </main>
          ) : pane === "workflow" ? (
            <WorkflowSteps fee={fee} partner={partner} correction={correction} />
          ) : pane === "verlauf" ? (
            <main className="page single rw-page">
              <HistoryTab fee={fee} partner={partner} />
            </main>
          ) : (
            <main className="page single wf-blank" />
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowSteps({ fee, partner, correction }: { fee: Fee; partner: Partner | undefined; correction: InvoiceCorrection }) {
  const { closeRechnungWorkflow } = useWorkflow();
  const { state } = useHonorar();
  const current = workflowStepIndex(correction);
  const [viewed, setViewed] = useState<0 | 1 | 2>(Math.min(current, 2) as 0 | 1 | 2);
  const [info, setInfo] = useState(false);
  // Follow the workflow when it moves on (Antrag sent, freigegeben, verbucht).
  useEffect(() => setViewed(Math.min(current, 2) as 0 | 1 | 2), [current]);
  const pill = statusPillOf(rechnungenCells(state, fee), fee);
  const open = openAmount(state, fee);

  return (
    <>
      <div className="stepper-wrap">
        <div className="stepper">
          {WORKFLOW_STEPS.map((step, index) => (
            <button
              type="button"
              key={step.label}
              className={`step${viewed === index ? " active" : ""}`}
              onClick={() => setViewed(index as 0 | 1 | 2)}
            >
              <span className={`step-num${viewed === index ? " active" : ""}`}>
                <img src={viewed === index ? a.stepActive : a.stepDone} alt="" />
                <span>{index + 1}</span>
              </span>
              <span className="step-label">
                {step.label}
                <small className="rw-step-role">{step.role}</small>
              </span>
              {current > index ? (
                <span className="badge done">
                  <Icon src={a.confirm} size={16} />
                  Fertig
                </span>
              ) : (
                <span className="badge">
                  <Icon src={a.onhold} size={16} />
                  Offen
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="page single rw-page">
        <section className="rw-card rw-head">
          <div>
            <span className="hn-inv-label">Workflow {correction.workflow}</span>
            <h1 className="rw-title">
              {partner?.name} - Rechnung {invoiceNumberOf(fee) ?? ""}
            </h1>
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
              <div>
                <dt>Gestartet</dt>
                <dd>
                  {formatDate(correction.startedAt)} von {correction.startedBy}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rw-head-side">
            <span className={`hn-inv-pill hn-st-tone-${pill.tone}`}>{pill.text}</span>
            <button type="button" className="hn-drop" onClick={() => setInfo(true)}>
              Info zur Rechnung
            </button>
          </div>
        </section>

        {viewed === 0 ? <AntragStep fee={fee} partner={partner} correction={correction} open={open} /> : null}
        {viewed === 1 ? <FreigabeStep fee={fee} correction={correction} open={open} /> : null}
        {viewed === 2 ? <VerbuchungStep fee={fee} partner={partner} correction={correction} open={open} /> : null}
      </main>

      <footer className="footer">
        {viewed === 0 ? (
          <span />
        ) : (
          <button type="button" className="btn-secondary" onClick={() => setViewed((viewed - 1) as 0 | 1 | 2)}>
            Zurück
          </button>
        )}
        {current === 3 ? (
          <button type="button" className="btn-primary" onClick={closeRechnungWorkflow}>
            Workflow schließen
          </button>
        ) : viewed < 2 ? (
          <button type="button" className="btn-primary" onClick={() => setViewed((viewed + 1) as 0 | 1 | 2)}>
            Weiter
          </button>
        ) : (
          <span />
        )}
      </footer>
      {info ? <InvoiceInfoModal feeId={fee.id} onClose={() => setInfo(false)} /> : null}
    </>
  );
}

function StepCard({
  index,
  partner,
  title,
  done,
  children,
}: {
  index: 0 | 1 | 2;
  partner: Partner | undefined;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  const step = WORKFLOW_STEPS[index];
  return (
    <section className="rw-card" aria-label={title}>
      <header className="rw-step-head">
        <span className={`hn-inv-dot${done ? " done" : ""}`} aria-hidden>
          {done ? <Icon src={a.confirm} size={16} /> : null}
        </span>
        <div>
          <h2>{title}</h2>
          <small>
            {step.role}: {personOf(index, partner)}
          </small>
        </div>
      </header>
      {children}
    </section>
  );
}

function AntragStep({ fee, partner, correction, open }: { fee: Fee; partner: Partner | undefined; correction: InvoiceCorrection; open: number }) {
  const { state, requestInvoiceCorrection, cancelInvoiceWorkflow } = useHonorar();
  const { closeRechnungWorkflow } = useWorkflow();
  const allowed = KINDS_OF[correction.workflow];
  const [kind, setKind] = useState<InvoiceCorrectionKind>(allowed.includes(correction.kind) ? correction.kind : allowed[0]);
  const [amount, setAmount] = useState(correction.amount ? money(correction.amount) : "");
  const [dueDate, setDueDate] = useState(correction.dueDate ?? "");
  const [reason, setReason] = useState(correction.reason);
  const [cancelAsk, setCancelAsk] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const editable = correction.status === "entwurf" || correction.status === "abgelehnt";
  const advisor = personOf(0, partner);

  const amountValue = Number(amount.replace(/\./g, "").replace(",", "."));
  const formError =
    !reason.trim()
      ? "Bitte eine Begründung angeben."
      : kind === "Teilgutschrift" && !(amountValue > 0 && amountValue < open)
        ? `Der Betrag muss zwischen € 0,01 und € ${money(Math.max(0, open - 0.01))} liegen.`
        : kind === "Zahlungsziel ändern" && !(dueDate > state.today)
          ? `Das neue Zahlungsziel muss nach dem ${formatDay(state.today)} liegen.`
          : null;

  return (
    <StepCard index={0} partner={partner} title="Antrag" done={!editable}>
      {correction.status === "abgelehnt" ? (
        <p className="hn-inv-note fail">
          Abgelehnt von {correction.decidedBy}
          {correction.decisionComment ? `: „${correction.decisionComment}“` : "."} Passe den Antrag an oder brich den Workflow ab.
        </p>
      ) : editable ? (
        <p className="hn-inv-duty">Lege fest, wie die Rechnung korrigiert wird. Danach geht der Antrag an den Bestandsmanager zur Freigabe.</p>
      ) : (
        <p className="hn-inv-fact">
          <small>
            Gestellt am {formatDate(correction.requestedAt ?? "")} von {correction.requestedBy}. Der Antrag ist versendet und nicht mehr änderbar.
          </small>
        </p>
      )}
      <div className="hn-inv-form">
        {allowed.length > 1 ? (
          <fieldset className="hn-inv-kinds">
            <legend>Art der Korrektur</legend>
            {KINDS.filter((entry) => allowed.includes(entry.id)).map((entry) => (
              <label key={entry.id} className={kind === entry.id ? "active" : undefined}>
                <input type="radio" name="rw-kind" checked={kind === entry.id} disabled={!editable} onChange={() => setKind(entry.id)} />
                <span>
                  <strong>{entry.id}</strong>
                  <small>{entry.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {kind === "Teilgutschrift" ? (
          <label className="hn-inv-field">
            Betrag der Gutschrift (offen: € {money(open)})
            <input id="rw-amount" inputMode="decimal" disabled={!editable} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" />
          </label>
        ) : null}
        {kind === "Zahlungsziel ändern" ? (
          <label className="hn-inv-field">
            Neues Zahlungsziel (bisher {formatDay(fee.dueDate)})
            <input id="rw-due" type="date" disabled={!editable} min={state.today} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        ) : null}
        {kind === "Vollgutschrift" ? <p className="hn-inv-duty">Gutschrift über den offenen Betrag von € {money(open)}.</p> : null}
        {kind === "Doch bezahlt" ? <p className="hn-inv-duty">Die Rechnung über € {money(fee.amount)} wird nach der Freigabe als bezahlt verbucht.</p> : null}
        <label className="hn-inv-field">
          Begründung
          <textarea id="rw-reason" rows={3} disabled={!editable} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        {editable ? (
        <div className="hn-inv-actions">
          {formError && reason ? <span className="hn-inv-error">{formError}</span> : <span />}
          <button type="button" className="btn-secondary" onClick={() => setCancelAsk(true)}>
            Workflow abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={Boolean(formError)}
            onClick={() => {
              requestInvoiceCorrection(
                fee.id,
                {
                  kind,
                  reason: reason.trim(),
                  ...(kind === "Teilgutschrift" ? { amount: amountValue } : {}),
                  ...(kind === "Zahlungsziel ändern" ? { dueDate } : {}),
                },
                advisor,
              );
              setToast(`Antrag an ${ROLE_USER.head} (Bestandsmanager) gesendet.`);
            }}
          >
            Zur Freigabe senden
          </button>
        </div>
        ) : null}
      </div>
      {cancelAsk ? (
        <ConfirmModal
          title="Workflow abbrechen?"
          text={`Der Workflow „${correction.workflow}“ wird beendet. Die Rechnung bleibt, wie sie ist.`}
          confirmLabel="Workflow abbrechen"
          onCancel={() => setCancelAsk(false)}
          onConfirm={() => {
            cancelInvoiceWorkflow(fee.id, advisor);
            setCancelAsk(false);
            closeRechnungWorkflow();
          }}
        />
      ) : null}
      {toast ? <Snackbar message={toast} onClose={() => setToast(null)} /> : null}
    </StepCard>
  );
}

/** Status only: the Bestandsmanager decides the Antrag in his Freigaben list (Management Winter Vers.), not here. */
function FreigabeStep({ fee, correction, open }: { fee: Fee; correction: InvoiceCorrection; open: number }) {
  const { state } = useHonorar();
  const { openManager } = useWorkflow();
  const partner = partnerOf(state, fee.partnerId);
  const index = workflowStepIndex(correction);

  return (
    <StepCard index={1} partner={partner} title="Freigabe" done={index > 1}>
      {correction.status === "beantragt" ? (
        <>
          <p className="hn-inv-fact">
            <span>
              Antrag: <strong>{correction.kind}</strong>, {correctionSummary(correction, open)}
            </span>
            <small>
              von {correction.requestedBy} am {formatDate(correction.requestedAt ?? "")}. Begründung: {correction.reason}
            </small>
          </p>
          <p className="hn-inv-wait">
            Wartet auf die Freigabe durch den Bestandsmanager {ROLE_USER.head}. Er findet den Antrag unter Freigaben im Management.
          </p>
          <div className="hn-inv-actions">
            <span />
            <button type="button" className="btn-secondary" onClick={openManager}>
              Freigaben öffnen (Bestandsmanager)
            </button>
          </div>
        </>
      ) : index > 1 ? (
        <p className="hn-inv-fact">
          <span>
            <strong>Freigegeben</strong>: {correctionSummary(correction, open)}
          </span>
          <small>
            am {formatDate(correction.decidedAt ?? "")} von {correction.decidedBy}
            {correction.decisionComment ? `: „${correction.decisionComment}“` : ""}
          </small>
        </p>
      ) : correction.status === "abgelehnt" ? (
        <p className="hn-inv-note fail">
          Abgelehnt von {correction.decidedBy}
          {correction.decisionComment ? `: „${correction.decisionComment}“` : "."} Der Kundenberater passt den Antrag in Schritt 1 an.
        </p>
      ) : (
        <p className="hn-inv-wait">Wartet auf den Antrag des Kundenberaters.</p>
      )}
    </StepCard>
  );
}

function VerbuchungStep({ fee, partner, correction, open }: { fee: Fee; partner: Partner | undefined; correction: InvoiceCorrection; open: number }) {
  const { bookInvoiceCorrection } = useHonorar();
  const index = workflowStepIndex(correction);
  const paidKind = correction.kind === "Doch bezahlt";

  return (
    <StepCard index={2} partner={partner} title="Verbuchung" done={index > 2}>
      {correction.status === "freigegeben" ? (
        <div className="hn-inv-actions">
          <span>
            {paidKind ? "Verbuchung" : "Einzelfaktura"}: <strong>{correctionSummary(correction, open)}</strong>
          </span>
          <button type="button" className="btn-primary" onClick={() => bookInvoiceCorrection(fee.id, ROLE_USER.backoffice)}>
            {paidKind ? "Als bezahlt verbuchen" : "Einzelfaktura verbuchen"}
          </button>
        </div>
      ) : index > 2 ? (
        <p className="hn-inv-fact">
          <span>
            <strong>Verbucht</strong>: {correctionSummary(correction, open)}
          </span>
          <small>
            am {formatDate(correction.bookedAt ?? "")} von {correction.bookedBy}.{" "}
            {paidKind ? "Die Rechnung ist als bezahlt verbucht." : "Die Einzelfaktura liegt jetzt unter Einzelfaktura."} Der Workflow ist abgeschlossen.
          </small>
        </p>
      ) : (
        <p className="hn-inv-wait">Wartet auf die Freigabe durch den Bestandsmanager.</p>
      )}
    </StepCard>
  );
}
