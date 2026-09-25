import type {
  InvoiceStatus,
  OpenItemStatus,
  PaymentReason,
  PaymentStatus,
} from "../../types/honorar";

export function servicePeriod(monthId: string) {
  const [year, month] = monthId.split("-");
  return `01.${String(month).padStart(2, "0")}.${year} - 31.12.${year}`;
}

const MONTH_NAMES = [
  "Jänner",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function monthLabel(id: string) {
  const [, month] = id.split("-");
  return MONTH_NAMES[Number(month) - 1] ?? id;
}

export function monthYearLabel(id: string) {
  const [year] = id.split("-");
  return `${monthLabel(id)} ${year}`;
}

export function dueMonthLabel(id: string) {
  const [year, month] = id.split("-");
  return `aus ${month}/${year}`;
}

export function money(value: number) {
  return value.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    const [year, month, day] = iso.split("-");
    if (year && month && day) return `${day}.${month}.${year}`;
    return iso;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const hasTime = iso.includes("T");
  return hasTime ? `${day}.${month}.${year} ${hours}:${minutes}` : `${day}.${month}.${year}`;
}

export function formatDay(iso: string) {
  return formatDate(iso.includes("T") ? iso.slice(0, 10) : iso).split(" ")[0];
}

export function previousMonth(id: string) {
  const [year, month] = id.split("-").map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

export function nextMonth(id: string) {
  const [year, month] = id.split("-").map(Number);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function invoiceStatusLabel(status: InvoiceStatus, sentAt?: string, sentTo?: string) {
  if (status === "not_created") return { title: "Nicht erstellt" };
  if (status === "created") return { title: "Erstellt" };
  if (status === "send_failed") return { title: "Versand fehlgeschlagen" };
  return {
    title: sentAt ? `Versendet am ${formatDate(sentAt)}` : "Versendet",
    detail: sentTo ? `an ${sentTo}` : undefined,
  };
}

export function paymentReasonLabel(reason?: PaymentReason) {
  if (reason === "due_date_exceeded") return "Zahlungsziel überschritten";
  if (reason === "direct_debit_failed") return "Abbuchung fehlgeschlagen";
  if (reason === "sepa_chargeback") return "SEPA-Rücklastschrift";
  if (reason === "amount_mismatch") return "Betrag weicht ab";
  return "";
}

export function paymentStatusLabel(status: PaymentStatus, dueDate?: string, reason?: PaymentReason) {
  if (status === "open_before_due") {
    return { title: "Offen vor Zahlungsziel", detail: dueDate ? `fällig am ${formatDay(dueDate)}` : undefined };
  }
  if (status === "paid") return { title: "Bezahlt" };
  if (status === "unpaid") return { title: "Nicht bezahlt nach Zahlungsziel", detail: paymentReasonLabel(reason) };
  return { title: "An Offene Posten übergeben" };
}

export function openItemStatusLabel(status: OpenItemStatus, reminderSentAt?: string) {
  if (status === "no_reminder") return "Keine Zahlungserinnerung";
  if (status === "reminder_sent") {
    return reminderSentAt ? `Zahlungserinnerung versendet am ${formatDate(reminderSentAt)}` : "Zahlungserinnerung versendet";
  }
  if (status === "reminder_overdue") return "Erinnerung ohne Reaktion";
  if (status === "agreement_in_approval") return "Vereinbarung in Freigabe";
  if (status === "agreement_made") return "Vereinbarung getroffen";
  return "Erledigt";
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPast(today: string, dueDate: string) {
  return dueDate < today;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
