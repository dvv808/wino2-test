import { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { formatDate, formatDay, servicePeriod } from "../lib/honorar/format";
import { feeSettled, isOpenItemFee, partnerOf } from "../lib/honorar/queries";
import { ROLE_USER } from "../mocks/honorar/seed";
import type { Fee, HonorarState, InvoiceWorkflowType, Partner } from "../types/honorar";
import { Icon, Snackbar } from "../ui";
import { useWorkflow } from "../workflow";
import {
  WORKFLOW_STEPS,
  agreementLines,
  invoiceDate,
  invoiceNumberOf,
  statusPillOf,
  money,
  openAmount,
  rechnungenCells,
  workflowStepIndex,
  zahlartLabel,
  type Tone,
} from "./invoiceCells";
import { setFocusFee } from "./focusFee";
import { useHonorar } from "./store";
import { ConfirmModal } from "./ui";

type Tab = "data" | "docs" | "correction" | "history";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "data", label: "Rechnungsdaten", icon: a.docList },
  { id: "docs", label: "Dokumente / Mails", icon: a.mail },
  { id: "correction", label: "Rechnungskorrektur", icon: a.menuEdit },
  { id: "history", label: "Verlauf", icon: a.history },
];

function maskIban(iban?: string) {
  if (!iban) return "-";
  const parts = iban.split(" ");
  return parts.map((part, index) => (index === 0 || index === parts.length - 1 ? part : "XXXX")).join(" ");
}


/** What has to happen next with this invoice, for the "Aktueller Status" card. */
function nextStep(state: HonorarState, fee: Fee) {
  const request = fee.correction;
  if (request?.status === "verbucht") {
    const open = openAmount(state, fee);
    return open > 0
      ? `Einzelfaktura verbucht (${request.kind}). Offen bleiben € ${money(open)}.`
      : `Einzelfaktura verbucht (${request.kind}). Die Rechnung ist damit erledigt.`;
  }
  if (request?.status === "beantragt") return "Rechnungskorrektur wartet auf Freigabe durch den Bestandsmanager.";
  if (request?.status === "freigegeben") return "Honorarverwalter verbucht die Einzelfaktura.";
  if (feeSettled(fee)) return "Keine offenen Schritte. Die Rechnung ist abgeschlossen.";
  if (fee.invoiceStatus === "not_created") return "Die Rechnung wird im Rechnungsversand erstellt.";
  if (fee.invoiceStatus === "created" && fee.paymentMethod === "Rechnung") return "Die Rechnung wartet auf den Versand.";
  if (fee.invoiceStatus === "send_failed") return "Mail nicht zugestellt. Die Rechnung geht per Post an den Kunden.";
  const failed = fee.paymentStatus === "unpaid" || fee.paymentStatus === "handed_to_op";
  if (failed && fee.paymentMethod === "Abbucher") return "SEPA-Lastschrift fehlgeschlagen. Der Kundenberater entscheidet über eine Rechnungskorrektur.";
  if (failed && !fee.reminderSentAt) return "Zahlungsziel überschritten. Eine Zahlungserinnerung ist fällig.";
  if (failed) return "Zahlungserinnerung versendet. Zahlungseingang oder Rechnungskorrektur abwarten.";
  return `Zahlungseingang bis ${formatDay(fee.dueDate)} abwarten.`;
}

type Doc = { name: string; kind: string; date: string };

function documentsOf(fee: Fee, partner: Partner | undefined): Doc[] {
  const number = invoiceNumberOf(fee);
  if (!number) return [];
  const docs: Doc[] = [{ name: `${number}.pdf`, kind: "Rechnung", date: fee.createdAt }];
  if (fee.sentAt && fee.paymentMethod === "Rechnung") {
    docs.push(
      partner?.deliveryMethod === "print"
        ? { name: `${number}_Post.pdf`, kind: "Versand per Post", date: fee.sentAt }
        : { name: `${number}_Mail.msg`, kind: "Versand-Mail", date: fee.sentAt },
    );
  }
  if (fee.reminderSentAt) docs.push({ name: `Zahlungserinnerung_${number}.pdf`, kind: "Zahlungserinnerung", date: fee.reminderSentAt });
  return docs;
}

type Event = { at: string; text: string[]; doc?: string; by: string };

/** Verlauf: what the invoice went through, from its data plus everything recorded in the history. */
function eventsOf(state: HonorarState, fee: Fee, partner: Partner | undefined): Event[] {
  const number = invoiceNumberOf(fee);
  const events: Event[] = [{ at: fee.createdAt, text: ["Rechnungsdaten im wino erfasst."], by: fee.createdBy }];
  if (number) {
    events.push({ at: fee.createdAt, text: ["Datenträger in Buchhaltung (BMD) importiert."], by: "System" });
    events.push({
      at: fee.createdAt,
      text: ["Rechnungsdokument an wino übermittelt. Bereit für Rechnungsversand."],
      doc: `${number}.pdf`,
      by: "System",
    });
  }
  if (fee.sentAt && fee.paymentMethod === "Rechnung") {
    if (partner?.deliveryMethod === "print") {
      events.push({ at: fee.sentAt, text: ["Rechnung per Post versendet an:", partner.address], doc: `${number}_Post.pdf`, by: "System" });
    } else {
      const text = [`Rechnung versendet an: ${fee.mailTo ?? fee.sentTo ?? partner?.email ?? "-"}`];
      if (fee.invoiceStatus === "send_failed") {
        text.push("Mail konnte nicht zugestellt werden!", "Bestandsmanager wurde über Unzustellbarkeit informiert.");
      }
      events.push({ at: fee.sentAt, text, doc: `${number}_Mail.msg`, by: "System" });
    }
  }
  if (fee.reminderSentAt) {
    events.push({ at: fee.reminderSentAt, text: ["Zahlungserinnerung versendet."], doc: `Zahlungserinnerung_${number}.pdf`, by: "System" });
  }
  if (fee.paid > 0 && fee.paidAt) {
    events.push({
      at: fee.paidAt,
      text:
        fee.paymentMethod === "Abbucher"
          ? [
              `Rechnungsbetrag € ${money(fee.paid)} wurde vom Konto des Kunden abgebucht.`,
              `Kontoinhaber: ${partner?.name ?? "-"}`,
              `IBAN: ${maskIban(partner?.bankAccount)}`,
            ]
          : [`Zahlungseingang € ${money(fee.paid)} verbucht.`],
      by: "System",
    });
  }
  const failed = fee.paymentStatus === "unpaid" || fee.paymentStatus === "handed_to_op";
  if (failed && fee.paymentMethod === "Abbucher") {
    const text = [fee.paymentReason === "sepa_chargeback" ? "Rücklastschrift eingegangen. Begründung unbekannt." : "SEPA-Lastschrift fehlgeschlagen."];
    if (isOpenItemFee(state, fee)) text.push("Rechnung wurde zur „Offene Posten Verwaltung“ hinzugefügt.");
    events.push({ at: fee.dueDate, text, by: "System" });
  } else if (failed && isOpenItemFee(state, fee)) {
    events.push({ at: fee.dueDate, text: ["Zahlungsziel überschritten.", "Rechnung wurde zur „Offene Posten Verwaltung“ hinzugefügt."], by: "System" });
  }
  for (const notice of state.notices) {
    if (notice.kind === "advisor" && notice.feeId === fee.id) {
      events.push({ at: notice.createdAt, text: [`Kundenberater ${partner?.advisor ?? ""} wurde informiert.`], by: "System" });
    }
  }
  const singleIds = new Set(state.singleInvoices.filter((invoice) => invoice.feeId === fee.id).map((invoice) => invoice.id));
  for (const entry of state.history) {
    const mine = (entry.refType === "fee" && entry.refId === fee.id) || (entry.refType === "singleInvoice" && singleIds.has(entry.refId));
    if (mine) events.push({ at: entry.timestamp, text: [entry.action, ...(entry.comment ? [`„${entry.comment}“`] : [])], by: entry.user });
  }
  return events
    .map((event, index) => ({ event, index }))
    .sort((x, y) => x.event.at.slice(0, 16).localeCompare(y.event.at.slice(0, 16)) || x.index - y.index)
    .map(({ event }) => event);
}

function TonePill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`hn-inv-pill hn-st-tone-${tone}`}>{children}</span>;
}

export function InvoiceInfoModal({ feeId, onClose }: { feeId: string; onClose: () => void }) {
  const { state } = useHonorar();
  const [tab, setTab] = useState<Tab>("history");
  const closeRef = useRef<HTMLButtonElement>(null);
  const fee = state.fees.find((entry) => entry.id === feeId);
  const partner = fee ? partnerOf(state, fee.partnerId) : undefined;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      // A Gutschrift or comment dialog on top handles its own Escape.
      if (event.key === "Escape" && document.querySelectorAll('[role="dialog"]').length === 1) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!fee) return null;
  const cells = rechnungenCells(state, fee);
  const pill = statusPillOf(cells, fee);
  const number = invoiceNumberOf(fee);
  const title = `${partner?.name ?? "Partner"} - Rechnung ${number ?? "(noch nicht erstellt)"}`;

  return (
    <div className="wmodal hn-inv" role="dialog" aria-modal="true" aria-labelledby="hn-inv-title">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="hn-inv-body">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onClose} ref={closeRef}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>
        <h2 id="hn-inv-title" className="hn-inv-title">
          {title}
        </h2>

        <div className="hn-inv-top">
          <section className="hn-inv-card hn-inv-preview" aria-label="Aktueller Status und Vorschau">
            <div className="hn-inv-paper" aria-hidden>
              <span className="hn-inv-paper-head">
                <strong>Rechnung</strong>
                <small>{number ?? "Entwurf"}</small>
              </span>
              <small>{partner?.name}</small>
              {partner?.address.split(", ").map((line) => <small key={line}>{line}</small>)}
              <span className="hn-inv-paper-lines">
                <i />
                <i />
                <i />
              </span>
              <span className="hn-inv-paper-sum">€ {money(fee.amount)}</span>
            </div>
            <div className="hn-inv-now">
              <span className="hn-inv-label">Aktueller Status</span>
              <p>{nextStep(state, fee)}</p>
              <dl className="hn-inv-figures">
                <div>
                  <dt>Rechnungsbetrag</dt>
                  <dd>€ {money(fee.amount)}</dd>
                </div>
                <div>
                  <dt>Zahlungseingang</dt>
                  <dd>€ {money(fee.paid)}</dd>
                </div>
                <div>
                  <dt>Offen</dt>
                  <dd>€ {money(openAmount(state, fee))}</dd>
                </div>
                <div>
                  <dt>Zahlungsziel</dt>
                  <dd>{formatDay(fee.dueDate)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="hn-inv-card hn-inv-agreement" aria-label="Vereinbarung zur Rechnung">
            <span className="hn-inv-label">Vereinbarung zur Rechnung</span>
            <strong>{cells.agreement[0]}</strong>
            <small>{cells.agreement[1]}</small>
            <small>Honorarmodell {fee.tariff}</small>
            <small>Kundenberater {partner?.advisor ?? "-"}</small>
          </section>
        </div>

        <div className="hn-inv-bar">
          <div className="freigaben-tabs hn-inv-tabs" role="tablist" aria-label="Info zur Rechnung">
            {TABS.map((entry) => (
              <button
                type="button"
                role="tab"
                id={`hn-inv-tab-${entry.id}`}
                aria-selected={tab === entry.id}
                aria-controls="hn-inv-panel"
                className={tab === entry.id ? "fg-tab active" : "fg-tab"}
                key={entry.id}
                onClick={() => setTab(entry.id)}
              >
                <Icon src={entry.icon} size={20} />
                {entry.label}
              </button>
            ))}
          </div>
          <div className="hn-inv-state" aria-label="Status der Rechnung">
            <TonePill tone={pill.tone}>{pill.text}</TonePill>
          </div>
        </div>

        <div className="hn-inv-panel" id="hn-inv-panel" role="tabpanel" aria-labelledby={`hn-inv-tab-${tab}`}>
          {tab === "data" ? <DataTab fee={fee} partner={partner} /> : null}
          {tab === "docs" ? <DocsTab fee={fee} partner={partner} /> : null}
          {tab === "correction" ? <CorrectionTab fee={fee} partner={partner} /> : null}
          {tab === "history" ? <HistoryTab fee={fee} partner={partner} /> : null}
        </div>
      </div>
    </div>
  );
}

function DataTab({ fee, partner }: { fee: Fee; partner: Partner | undefined }) {
  const { state } = useHonorar();
  const number = invoiceNumberOf(fee);
  const rows: [string, string][] = [
    ["Rechnungsnummer", number ?? "-"],
    ["Rechnungsdatum", number ? invoiceDate(fee) : "-"],
    ["Leistungszeitraum", servicePeriod(fee.month)],
    ["Vereinbarung", agreementLines(fee).join(", ")],
    ["Honorarmodell", fee.tariff],
    ["Rechnungsbetrag", `€ ${money(fee.amount)}`],
    ["Zahlungseingang", `€ ${money(fee.paid)}${fee.paidAt ? ` am ${formatDay(fee.paidAt)}` : ""}`],
    ["Offener Betrag", `€ ${money(openAmount(state, fee))}`],
    ["Zahlart", zahlartLabel(fee.paymentMethod)],
    ["Zahlungsziel", formatDay(fee.dueDate)],
    ["Empfänger", [partner?.name, partner?.address].filter(Boolean).join(", ")],
    [
      "Versand",
      fee.paymentMethod === "Abbucher"
        ? "Kein Rechnungsversand (SEPA-Lastschrift)"
        : partner?.deliveryMethod === "print"
          ? "per Post"
          : `per Mail an ${fee.mailTo ?? partner?.email ?? "-"}`,
    ],
    ["Bankverbindung", maskIban(partner?.bankAccount)],
    ["Erfasst", `${formatDate(fee.createdAt)} von ${fee.createdBy}`],
  ];
  return (
    <dl className="hn-inv-data">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DocsTab({ fee, partner }: { fee: Fee; partner: Partner | undefined }) {
  const docs = documentsOf(fee, partner);
  if (docs.length === 0) {
    return <p className="hn-inv-empty">Noch keine Dokumente. Das Rechnungsdokument kommt aus BMD, sobald der Datenträger importiert ist.</p>;
  }
  return (
    <div className="hn-inv-table docs" role="table" aria-label="Dokumente und Mails">
      <div className="hn-inv-tr head" role="row">
        <span role="columnheader">Datum</span>
        <span role="columnheader">Dokument</span>
        <span role="columnheader">Art</span>
      </div>
      {docs.map((doc) => (
        <div className="hn-inv-tr" role="row" key={doc.name}>
          <span role="cell">{formatDay(doc.date)}</span>
          <span role="cell">
            <span className="hn-inv-doc">
              <Icon src={a.docList} size={16} />
              {doc.name}
            </span>
          </span>
          <span role="cell">{doc.kind}</span>
        </div>
      ))}
    </div>
  );
}

export function HistoryTab({ fee, partner }: { fee: Fee; partner: Partner | undefined }) {
  const { state } = useHonorar();
  const events = eventsOf(state, fee, partner);
  return (
    <div className="hn-inv-table history" role="table" aria-label="Verlauf">
      <div className="hn-inv-tr head" role="row">
        <span role="columnheader">Datum</span>
        <span role="columnheader">Ereignis</span>
        <span role="columnheader">Dokumente</span>
        <span role="columnheader">Bearbeiter</span>
      </div>
      {events.map((event, index) => (
        <div className="hn-inv-tr" role="row" key={index}>
          <span role="cell">{formatDay(event.at)}</span>
          <span role="cell" className="hn-inv-lines">
            {event.text.map((line, lineIndex) => (
              <span key={lineIndex}>{line}</span>
            ))}
          </span>
          <span role="cell">
            {event.doc ? (
              <span className="hn-inv-doc">
                <Icon src={a.docList} size={16} />
                {event.doc}
              </span>
            ) : null}
          </span>
          <span role="cell">{event.by}</span>
        </div>
      ))}
    </div>
  );
}

type FixId = "berater" | "erinnerung" | "gutschrift" | "zahlungsziel" | "bezahlt" | "post" | "mail" | "einzelfaktura" | "versand" | "antrag";

/** These buttons start a workflow with approval; the others act right away. */
const WORKFLOW_OF: Partial<Record<FixId, InvoiceWorkflowType>> = {
  gutschrift: "Gutschrift",
  zahlungsziel: "Zahlungsziel anpassen",
  bezahlt: "Doch bezahlt markieren",
  antrag: "Rechnungskorrektur",
};

/** What the status of the invoice says needs fixing, and which actions do it (first one is recommended). */
function adviceOf(state: HonorarState, fee: Fee): { text: string; fixes: FixId[] } {
  const failed = fee.paymentStatus === "unpaid" || fee.paymentStatus === "handed_to_op";
  const hasSingle = state.singleInvoices.some((invoice) => invoice.feeId === fee.id);
  if (fee.paid > fee.amount) {
    return { text: "Der Kunde hat zu viel bezahlt. Der Betrag wird über eine Einzelfaktura zurücküberwiesen.", fixes: ["einzelfaktura"] };
  }
  if (feeSettled(fee)) {
    return { text: "Die Rechnung ist abgeschlossen. Es ist nichts zu korrigieren.", fixes: hasSingle ? ["einzelfaktura"] : [] };
  }
  if (fee.invoiceStatus === "not_created" || (fee.invoiceStatus === "created" && fee.paymentMethod === "Rechnung")) {
    return { text: "Die Rechnung ist noch nicht versendet. Sie wird im Rechnungsversand erstellt und verschickt.", fixes: ["versand"] };
  }
  if (fee.invoiceStatus === "send_failed") {
    return { text: "Die Mail wurde nicht zugestellt. Schicke die Rechnung per Post oder noch einmal per Mail.", fixes: ["post", "mail"] };
  }
  const advisorInformed = state.notices.some((notice) => notice.kind === "advisor" && notice.feeId === fee.id);
  const decide: FixId[] = ["gutschrift", "zahlungsziel", "bezahlt", "antrag"];
  if (failed && fee.paymentMethod === "Abbucher") {
    return advisorInformed
      ? { text: "Die SEPA-Lastschrift ist fehlgeschlagen, der Kundenberater ist informiert. Setze seine Entscheidung um.", fixes: decide }
      : { text: "Die SEPA-Lastschrift ist fehlgeschlagen. Informiere zuerst den Kundenberater.", fixes: ["berater", ...decide] };
  }
  if (failed && !fee.reminderSentAt) {
    return { text: "Das Zahlungsziel ist überschritten. Schicke zuerst eine Zahlungserinnerung.", fixes: ["erinnerung", "berater", ...decide] };
  }
  if (failed || fee.reminderSentAt) {
    return {
      text: "Die Zahlungserinnerung ist versendet, die Zahlung fehlt weiterhin. Kläre mit dem Kundenberater, wie es weitergeht.",
      fixes: advisorInformed ? decide : ["berater", ...decide],
    };
  }
  return {
    text: `Die Rechnung ist offen, das Zahlungsziel ist der ${formatDay(fee.dueDate)}. Bei Bedarf kannst du es anpassen oder eine Gutschrift erstellen.`,
    fixes: ["zahlungsziel", "gutschrift", "antrag"],
  };
}

const FIX_LABELS: Record<FixId, string> = {
  berater: "Berater kontaktieren",
  erinnerung: "Zahlungserinnerung versenden",
  gutschrift: "Gutschrift erstellen",
  zahlungsziel: "Zahlungsziel anpassen",
  bezahlt: "Doch bezahlt markieren",
  post: "Per Post versenden",
  mail: "Erneut per Mail senden",
  einzelfaktura: "In Einzelfaktura übernehmen",
  versand: "Zum Rechnungsversand",
  antrag: "Rechnungskorrektur beantragen",
};

function CorrectionTab({ fee, partner }: { fee: Fee; partner: Partner | undefined }) {
  const { state, moveFeeToSingleInvoice, notifyAdvisor, sendPaymentReminders, resendInvoice, startInvoiceWorkflow } = useHonorar();
  const { openFinanzen, openRechnungWorkflow } = useWorkflow();
  const [confirm, setConfirm] = useState<InvoiceWorkflowType | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const running = fee.correction && fee.correction.status !== "verbucht" ? fee.correction : undefined;
  const singleInvoice = state.singleInvoices.find((invoice) => invoice.feeId === fee.id);
  const advice = adviceOf(state, fee);
  // One workflow per invoice: while one runs, it is the way to fix the invoice.
  const fixes = advice.fixes.filter((id) => !(running && WORKFLOW_OF[id]));
  const advisor = partner?.advisor ?? ROLE_USER.advisor;
  const number = invoiceNumberOf(fee);

  function run(id: FixId) {
    const workflow = WORKFLOW_OF[id];
    if (workflow) {
      setConfirm(workflow);
    } else if (id === "berater") {
      notifyAdvisor(fee.id, fee.paymentMethod === "Abbucher" ? "SEPA-Lastschrift fehlgeschlagen" : "Zahlung offen nach Zahlungsziel");
      setToast(`${advisor} wurde kontaktiert.`);
    } else if (id === "erinnerung") {
      sendPaymentReminders(fee.month, [fee.id]);
      setToast("Zahlungserinnerung versendet.");
    } else if (id === "post" || id === "mail") {
      resendInvoice(fee.id, id === "post");
      setToast(id === "post" ? "Rechnung per Post versendet." : "Rechnung erneut per Mail versendet.");
    } else if (id === "einzelfaktura") {
      if (!singleInvoice) moveFeeToSingleInvoice(fee.id);
      setFocusFee(fee.id);
      openFinanzen("singleInvoices");
    } else if (id === "versand") {
      openFinanzen("month", fee.month, fee.invoiceStatus === "not_created" ? "data" : "dispatch");
    }
  }

  const step = running ? WORKFLOW_STEPS[Math.min(workflowStepIndex(running), 2) as 0 | 1 | 2] : undefined;

  return (
    <div className="hn-inv-corr">
      <section className="hn-inv-advice" aria-label="Was ist zu tun">
        <span className="hn-inv-label">Was ist zu tun</span>
        <p>{advice.text}</p>
        {fixes.length > 0 ? (
          <div className="hn-inv-fixes">
            {fixes.map((id, index) => (
              <button type="button" key={id} className={index === 0 ? "btn-primary" : "btn-secondary"} onClick={() => run(id)}>
                {id === "einzelfaktura" && singleInvoice ? "In Einzelfaktura ansehen" : FIX_LABELS[id]}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {running && step ? (
        <section className="hn-inv-advice hn-inv-running" aria-label="Laufender Workflow">
          <span className="hn-inv-label">Laufender Workflow</span>
          <p>
            <strong>{running.workflow}</strong>
            {running.status === "abgelehnt"
              ? ": Antrag abgelehnt, der Kundenberater passt ihn an."
              : `: ${step.label} offen bei ${step.role === "Kundenberater" ? advisor : step.role === "Bestandsmanager" ? ROLE_USER.head : ROLE_USER.backoffice} (${step.role}).`}
          </p>
          <div className="hn-inv-fixes">
            <button type="button" className="btn-primary" onClick={() => openRechnungWorkflow(fee.id)}>
              Workflow öffnen
            </button>
          </div>
        </section>
      ) : null}

      {confirm ? (
        <ConfirmModal
          title="Achtung"
          text={`Damit startest du den Workflow „${confirm}“ für die Rechnung ${number ?? ""} von ${partner?.name ?? "diesem Partner"}. Die zuständigen Personen werden informiert und in den Workflow eingebunden: Kundenberater ${advisor}, Bestandsmanager ${ROLE_USER.head} und Honorarverwalter ${ROLE_USER.backoffice}.`}
          confirmLabel="Bestätigen"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            startInvoiceWorkflow(fee.id, confirm);
            setConfirm(null);
            openRechnungWorkflow(fee.id);
          }}
        />
      ) : null}
      {toast ? <Snackbar message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
