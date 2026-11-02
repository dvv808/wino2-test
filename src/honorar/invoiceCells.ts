import { formatDay, paymentReasonLabel, servicePeriod } from "../lib/honorar/format";
import { isOpenItemFee } from "../lib/honorar/queries";
import type { CorrectionStatus, Fee, HonorarState, InvoiceCorrection, PaymentMethod } from "../types/honorar";

/** Status zu Rechnungen cell logic, shared by the table and the "Info zur Rechnung" modal. */

export function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

/** Zahlart as shown to the user: a direct debit is a SEPA-Lastschrift, everything else is a Rechnung. */
export function zahlartLabel(method: PaymentMethod) {
  return method === "Abbucher" ? "SEPA-Lastschrift" : "Rechnung";
}

/** Vereinbarung, derived from the tariff (there is no separate field yet): a Maklervereinbarung runs over a Laufzeit. */
export function agreementLines(fee: Fee) {
  return fee.tariff === "Business"
    ? ["Maklervereinbarung", `LZ ${servicePeriod(fee.month)}`]
    : ["Beratungsvereinbarung", formatDay(fee.createdAt)];
}

/** Stable pseudo Rechnungsnummer derived from the fee id - only once an invoice actually exists for it. */
export function invoiceNumberOf(fee: Fee) {
  if (fee.invoiceStatus === "not_created") return undefined;
  let hash = 0;
  for (const char of fee.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `RE${fee.month.slice(0, 4)}-${1000 + (hash % 9000)}`;
}

function correctionStatusLabel(status: CorrectionStatus) {
  if (status === "in_approval") return "in Freigabe";
  if (status === "reset") return "Zurückgesetzt";
  if (status === "approved") return "Freigegeben";
  return "Entwurf";
}

/** Cell background, as in the scenario sheet: grey = not applicable yet, green = done, yellow = pending, red = problem. */
export type Tone = "plain" | "muted" | "ok" | "warn" | "fail";
export type Cell = { lines: string[]; tone: Tone };

export type RechnungenCells = {
  agreement: string[];
  invoice: string[];
  status: Cell;
  dates: Cell;
  openItem: Cell;
  correction: Cell & { link?: boolean };
};

/** Rechnungsdatum: the send date once the invoice went out, until then the day it was created. */
export function invoiceDate(fee: Fee) {
  return formatDay(fee.sentAt ?? fee.createdAt);
}

/**
 * Status zu Rechnungen cells, following the scenario sheet (Szenarien 01.-05. des Monats, SEPA-Lastschrift, Überweisung).
 * A Rechnung is "issued" once it is sent; a SEPA-Lastschrift once its Datenträger exists.
 */
export function rechnungenCells(state: HonorarState, fee: Fee): RechnungenCells {
  const sepa = fee.paymentMethod === "Abbucher";
  const number = invoiceNumberOf(fee);
  const issued =
    fee.paymentStatus !== "open_before_due" ||
    fee.invoiceStatus === "sent" ||
    fee.invoiceStatus === "send_failed" ||
    (sepa && fee.invoiceStatus === "created");
  const done = fee.paymentStatus === "paid" || Boolean(fee.settledVia);
  const failed = fee.paymentStatus === "unpaid" || fee.paymentStatus === "handed_to_op";
  const inOpenItems = isOpenItemFee(state, fee);
  const singleInvoice = state.singleInvoices.find((invoice) => invoice.feeId === fee.id);
  const openItem = state.openItems.find((item) => item.feeId === fee.id);
  const correction = openItem ? state.corrections.find((entry) => entry.openItemId === openItem.id) : undefined;
  const advisorInformed = state.notices.some((notice) => notice.kind === "advisor" && notice.feeId === fee.id);
  const overpaid = fee.paid > fee.amount;
  // Paid, but only after the Zahlungsziel: the Offener Posten existed and is closed now.
  const paidAfterDue = done && !overpaid && Boolean(fee.paidLate || (fee.paidAt && fee.paidAt > fee.dueDate));

  let status: Cell;
  if (done && !overpaid) status = { lines: ["abgeschlossen"], tone: "ok" };
  else if (!issued) status = { lines: ["Warte auf Rechnungsversand"], tone: "muted" };
  else if (sepa && failed) status = { lines: ["falsch"], tone: "fail" };
  else if (failed && !singleInvoice) status = { lines: ["offen nach Zahlungsziel"], tone: "fail" };
  else status = { lines: ["offen"], tone: "plain" };

  const dates: Cell = issued
    ? {
        lines: [
          `RE Datum: ${invoiceDate(fee)}`,
          `ZZ Datum: ${formatDay(fee.dueDate)}`,
          `ZE Datum: ${fee.paidAt ? formatDay(fee.paidAt) : "-"}`,
        ],
        tone: fee.invoiceStatus === "send_failed" ? "fail" : sepa && fee.paymentStatus === "open_before_due" ? "warn" : "muted",
      }
    : { lines: ["-"], tone: "plain" };

  let correctionCell: RechnungenCells["correction"];
  const request = fee.correction;
  if (request && request.status !== "verbucht") {
    const step = WORKFLOW_STEPS[Math.min(workflowStepIndex(request), 2) as 0 | 1 | 2];
    correctionCell = {
      lines: [`Workflow ${request.workflow}`, request.status === "abgelehnt" ? "Antrag abgelehnt" : `${step.label} offen (${step.role})`],
      tone: request.status === "abgelehnt" ? "fail" : "warn",
    };
  } else if (singleInvoice) {
    correctionCell = {
      lines: [
        singleInvoice.status !== "open"
          ? "EF an BMD übergeben"
          : request?.status === "verbucht"
            ? "EF besteht, aktueller Schritt: Übergabe an BMD"
            : "EF besteht, aktueller Schritt: Freigabe BM offen",
      ],
      tone: "plain",
    };
  } else if (overpaid) {
    correctionCell = { lines: ["Einzelfaktura noch nicht abgeschlossen (zurück überweisen)"], tone: "plain" };
  } else if (sepa && failed) {
    correctionCell = advisorInformed
      ? { lines: ["offen"], tone: "plain", link: true }
      : { lines: ["Entscheidung Kundenberater offen …"], tone: "plain" };
  } else if (inOpenItems && advisorInformed && !correction) {
    correctionCell = { lines: ["Entscheidung Kundenberater benötigt"], tone: "plain" };
  } else if (inOpenItems || paidAfterDue) {
    const reminder = fee.reminderSentAt
      ? `Zahlungserinnerung versendet am ${formatDay(fee.reminderSentAt)}.`
      : "Keine Zahlungserinnerung versendet.";
    const step = correction ? `${correction.kind} ${correctionStatusLabel(correction.status)}` : "-";
    correctionCell = {
      lines: [reminder, paidAfterDue ? "Einzelfaktura: -" : `Rechnungskorrektur: ${step}`],
      tone: paidAfterDue ? "muted" : "plain",
    };
  } else {
    correctionCell = { lines: ["-"], tone: done ? "muted" : "plain" };
  }

  return {
    agreement: agreementLines(fee),
    invoice: number ? [number, invoiceDate(fee)] : ["-"],
    status,
    dates,
    openItem: inOpenItems
      ? { lines: ["Eintrag in OP vorhanden"], tone: "warn" }
      : paidAfterDue
        ? { lines: ["Eintrag in OP vorhanden, abgeschlossen"], tone: "muted" }
        : { lines: ["-"], tone: "muted" },
    correction: correctionCell,
  };
}

/** The three steps of an invoice workflow and who is responsible for each. */
export const WORKFLOW_STEPS = [
  { label: "Antrag", role: "Kundenberater" },
  { label: "Freigabe", role: "Bestandsmanager" },
  { label: "Verbuchung", role: "Honorarverwalter" },
] as const;

/** 0 Antrag, 1 Freigabe, 2 Verbuchung, 3 done. A rejected Antrag goes back to step 0. */
export function workflowStepIndex(correction: InvoiceCorrection): 0 | 1 | 2 | 3 {
  if (correction.status === "beantragt") return 1;
  if (correction.status === "freigegeben") return 2;
  if (correction.status === "verbucht") return 3;
  return 0;
}

/** Still to pay: the amount minus payments and any granted Gutschrift. */
export function openAmount(state: HonorarState, fee: Fee) {
  const credit = fee.creditAmount ?? state.singleInvoices.find((invoice) => invoice.feeId === fee.id && invoice.credit)?.credit ?? 0;
  return Math.max(0, fee.amount - fee.paid - credit);
}

/**
 * The one status pill of an invoice (workflow page and Info zur Rechnung). A "falsch" always says what is wrong,
 * and an Eintrag in OP is part of the same pill.
 */
export function statusPillOf(cells: RechnungenCells, fee: Fee): { text: string; tone: Tone } {
  let main = cells.status.lines.join(" ");
  if (main === "falsch") {
    const reason =
      fee.paymentReason === "amount_mismatch"
        ? `Betrag weicht ab (€ ${money(fee.paid)} von € ${money(fee.amount)} abgebucht)`
        : paymentReasonLabel(fee.paymentReason) || "Abbuchung fehlgeschlagen";
    main = `falsch: ${reason}`;
  }
  const inOp = cells.openItem.tone === "warn";
  const tone = inOp && (cells.status.tone === "plain" || cells.status.tone === "muted") ? "warn" : cells.status.tone;
  return { text: inOp ? `${main} · ${cells.openItem.lines[0]}` : main, tone };
}
