export type PaymentMethod = "Abbucher" | "Rechnung";
export type Tariff = "Single" | "Business";

export type InvoiceStatus = "not_created" | "created" | "sent" | "send_failed";

export type PaymentStatus = "open_before_due" | "paid" | "unpaid" | "handed_to_op";

export type PaymentReason = "due_date_exceeded" | "direct_debit_failed" | "sepa_chargeback" | "amount_mismatch";

export type OpenItemStatus =
  | "no_reminder"
  | "reminder_sent"
  | "reminder_overdue"
  | "agreement_in_approval"
  | "agreement_made"
  | "done";

export type CorrectionKind = "Gutschrift" | "Zahlungserlass" | "Teilerlass" | "Ratenzahlung";
export type CorrectionStatus = "draft" | "in_approval" | "reset" | "approved";

export type HonorarRole = "backoffice" | "advisor" | "head" | "approver";

/** "status" is the month's Status page; the other four are the Rechnungsversand steps. */
export type HonorarStepKey = "status" | "data" | "carrier" | "dispatch" | "reminders";

export type FinanzenPage = "month" | "sammelfaktura" | "openItems" | "singleInvoices" | "inkasso" | "meinBereich";

export interface Partner {
  id: string;
  name: string;
  birthDate?: string;
  nickname?: string;
  type: "person" | "company";
  address: string;
  email: string;
  deliveryMethod: "digital" | "print";
  bankAccount?: string;
  advisor: string;
  department: string;
  photo?: string;
}

export interface Fee {
  id: string;
  partnerId: string;
  month: string;
  servicePeriod: string;
  freeText?: string;
  extraFields: Record<string, string>;
  amount: number;
  paid: number;
  tariff: Tariff;
  paymentMethod: PaymentMethod;
  dueDate: string;
  invoiceStatus: InvoiceStatus;
  sentAt?: string;
  sentTo?: string;
  /** One-time mail address for this invoice. The partner's own address stays untouched. */
  mailTo?: string;
  paymentStatus: PaymentStatus;
  /** Zahlungseingang: when the payment arrived (YYYY-MM-DD). */
  paidAt?: string;
  /** Set once a payment reminder (Zahlungserinnerung) went out for this invoice. */
  reminderSentAt?: string;
  paymentReason?: PaymentReason;
  /** Paid, but only after a reminder or after two months. */
  paidLate?: "reminder" | "two_months";
  /** A Gutschrift was granted for this invoice (seed data; granted single invoices count as well), with the amount. */
  creditAmount?: number;
  watched?: boolean;
  bmd?: { amount: number; address: string; email: string; servicePeriod: string };
  createdAt: string;
  createdBy: string;
  openItemId?: string;
  hiddenOpen?: boolean;
  /** Settled through Inkasso (Gutschrift or new Zahlungsziel): counts as done in Offene Posten. */
  settledVia?: "credit" | "due_date";
  /** Rechnungskorrektur of this invoice (Info zur Rechnung). */
  correction?: InvoiceCorrection;
  /** The invoice mail did not arrive: it went over to Post-Versand. Stays set once the letter is out. */
  mailFailed?: boolean;
  /** Zahlart switched in Daten erfassen (SEPA-Lastschrift ↔ Überweisung), with the required comment. */
  paymentMethodChange?: { from: PaymentMethod; comment: string };
}

export type InvoiceCorrectionKind = "Zahlungsziel ändern" | "Teilgutschrift" | "Vollgutschrift" | "Doch bezahlt";

/** The workflows that can be started for one invoice from Info zur Rechnung. */
export type InvoiceWorkflowType = "Gutschrift" | "Zahlungsziel anpassen" | "Doch bezahlt markieren" | "Rechnungskorrektur";

/**
 * Workflow of one invoice: Kundenberater fills in the Antrag, Bestandsmanager approves or rejects it,
 * Honorarverwalter books it (as Einzelfaktura, or as paid).
 */
export interface InvoiceCorrection {
  workflow: InvoiceWorkflowType;
  startedBy: string;
  startedAt: string;
  kind: InvoiceCorrectionKind;
  /** Teilgutschrift only. */
  amount?: number;
  /** Zahlungsziel ändern only (YYYY-MM-DD). */
  dueDate?: string;
  reason: string;
  /** entwurf: started, Antrag not sent yet. abgelehnt: back with the Kundenberater for a new Antrag. */
  status: "entwurf" | "beantragt" | "freigegeben" | "abgelehnt" | "verbucht";
  requestedBy?: string;
  requestedAt?: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionComment?: string;
  bookedBy?: string;
  bookedAt?: string;
}

/** The tabs of Rechnungsversand: BMD comparison, mail dispatch, post dispatch. */
export type DispatchTab = "check" | "mail" | "post";

/** The tabs of Zahlungserinnerungen: reminders by mail and by post. */
export type ReminderTab = "mail" | "post";

export interface Month {
  id: string;
  steps: { status: boolean; data: boolean; dataCarrier: boolean; dispatch: boolean };
  /** Rechnungsversand (step 3) is split into three tabs, each marked Fertig by hand. */
  dispatchDone?: Partial<Record<DispatchTab, boolean>>;
  /** Zahlungserinnerungen (step 4) is split into Mail and Post, each marked Fertig by hand. */
  remindersDone?: Partial<Record<ReminderTab, boolean>>;
  closed: boolean;
  bmdDataLoaded: boolean;
}

export interface OpenItem {
  id: string;
  feeId: string;
  partnerId: string;
  dueMonth: string;
  openAmount: number;
  reason: PaymentReason;
  status: OpenItemStatus;
  reminderSentAt?: string;
}

export interface Correction {
  id: string;
  partnerId: string;
  openItemId?: string;
  kind: CorrectionKind;
  amount: number;
  justification: string;
  status: CorrectionStatus;
  comment?: string;
}

export interface SingleInvoice {
  id: string;
  correctionId: string;
  partnerId: string;
  amount: number;
  kind: string;
  status: "open" | "sent_to_bmd";
  feeId?: string;
  month?: string;
  credit?: number;
  comment?: string;
  grantedAt?: string;
  grantedBy?: string;
  /** New Zahlungsziel (YYYY-MM-DD) set when the invoice was moved here from Offene Posten. */
  dueDate?: string;
  /** The Zahlungsziel before it was changed (YYYY-MM-DD). */
  dueDateOriginal?: string;
}

export interface HistoryEntry {
  id: string;
  refType: "fee" | "openItem" | "correction" | "singleInvoice" | "month";
  refId: string;
  timestamp: string;
  user: string;
  action: string;
  comment?: string;
}

export interface HonorarNotice {
  id: string;
  text: string;
  createdAt: string;
  read: boolean;
  /** Notices saved before the widget existed have no kind and show as "openItems". */
  kind?: "openItems" | "advisor" | "workflow";
  title?: string;
  subject?: string;
  feeId?: string;
  /** Every invoice the notice is about (e.g. all new Offene Posten), so "Ansehen" can highlight their rows. */
  feeIds?: string[];
  /** The person the notice is for; notices without one go to whoever is responsible for their invoices. */
  to?: string;
}

export interface HonorarState {
  today: string;
  role: HonorarRole;
  testMode: boolean;
  months: Month[];
  partners: Partner[];
  fees: Fee[];
  openItems: OpenItem[];
  corrections: Correction[];
  singleInvoices: SingleInvoice[];
  history: HistoryEntry[];
  notices: HonorarNotice[];
  importedFileName?: string;
  carrierFileName?: string;
  checklist: { count: boolean; sum: boolean; banks: boolean };
  /** Ticked "Nächste Schritte" of step 2 per month. All ticked finishes step 2. */
  carrierTicks: Record<string, boolean[]>;
  bmdCorrectionImported?: boolean;
}
