export type PaymentMethod = "Abbucher" | "Überweisung";
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

export type HonorarStepKey = "status" | "data" | "carrier" | "dispatch";

export type FinanzenPage = "month" | "openItems" | "singleInvoices" | "inkasso" | "meinBereich";

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
  paymentStatus: PaymentStatus;
  paymentReason?: PaymentReason;
  watched?: boolean;
  bmd?: { amount: number; address: string; email: string; servicePeriod: string };
  createdAt: string;
  createdBy: string;
  openItemId?: string;
}

export interface Month {
  id: string;
  steps: { status: boolean; data: boolean; dataCarrier: boolean; dispatch: boolean };
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
  bmdCorrectionImported?: boolean;
}
