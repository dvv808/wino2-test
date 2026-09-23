import type { Fee, HonorarState, OpenItem, Partner } from "../../types/honorar";

export function partnerOf(state: HonorarState, id: string) {
  return state.partners.find((partner) => partner.id === id);
}

export function monthOf(state: HonorarState, id: string) {
  return state.months.find((month) => month.id === id);
}

export function activeMonth(state: HonorarState) {
  return state.months.find((month) => !month.closed) ?? state.months[state.months.length - 1];
}

export function feesOfMonth(state: HonorarState, monthId: string) {
  return state.fees.filter((fee) => fee.month === monthId);
}

export function previousFees(state: HonorarState, monthId: string) {
  const [year, month] = monthId.split("-").map(Number);
  const previous = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  return feesOfMonth(state, previous);
}

export function actionNeeded(fee: Fee) {
  return fee.paymentStatus === "unpaid";
}

export function statusKpis(fees: Fee[]) {
  const needed = fees.filter(actionNeeded).length;
  const done = fees.filter((fee) => fee.paymentStatus === "paid" || fee.paymentStatus === "handed_to_op").length;
  return { needed, done };
}

export function totals(fees: Fee[]) {
  const due = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paid = fees.reduce((sum, fee) => sum + fee.paid, 0);
  return { due, paid, open: due - paid };
}

export function missingFields(fee: Fee, partner?: Partner) {
  const missing: string[] = [];
  if (!partner?.address.trim()) missing.push("address");
  if (!fee.servicePeriod.trim()) missing.push("servicePeriod");
  if (!fee.amount) missing.push("amount");
  if (fee.paymentMethod === "Abbucher" && !partner?.bankAccount?.trim()) missing.push("bankAccount");
  return missing;
}

export function incompleteFees(state: HonorarState, monthId: string) {
  return feesOfMonth(state, monthId).filter((fee) => missingFields(fee, partnerOf(state, fee.partnerId)).length > 0);
}

export function checklistReady(state: HonorarState) {
  return state.checklist.count && state.checklist.sum && state.checklist.banks;
}

export function dispatchMismatches(fee: Fee, partner?: Partner) {
  if (!fee.bmd || !partner) return [];
  const gaps: Array<"amount" | "address" | "email" | "servicePeriod"> = [];
  if (fee.bmd.amount !== fee.amount) gaps.push("amount");
  if (fee.bmd.address !== partner.address) gaps.push("address");
  if (fee.invoiceStatus !== "send_failed" && fee.bmd.email !== partner.email) gaps.push("email");
  if (fee.bmd.servicePeriod !== fee.servicePeriod) gaps.push("servicePeriod");
  return gaps;
}

export function monthCloseBlocked(state: HonorarState, monthId: string) {
  const month = monthOf(state, monthId);
  const fees = feesOfMonth(state, monthId);
  const reasons: string[] = [];
  if (!month?.bmdDataLoaded) reasons.push("BMD-Daten geladen");
  if (fees.some((fee) => dispatchMismatches(fee, partnerOf(state, fee.partnerId)).length > 0)) {
    reasons.push("keine Abweichungen");
  }
  if (fees.some((fee) => fee.invoiceStatus !== "sent" && fee.invoiceStatus !== "send_failed")) {
    reasons.push("alle versendet");
  }
  if (fees.some((fee) => fee.invoiceStatus === "send_failed")) reasons.push("kein fehlgeschlagener Versand");
  return reasons;
}

export function openItemsNeedingAction(items: OpenItem[]) {
  return items.filter((item) => item.status === "no_reminder" || item.status === "reminder_overdue");
}

export function openSingleInvoices(state: HonorarState) {
  return state.singleInvoices.filter((invoice) => invoice.status === "open");
}

export function advisorOpenItems(state: HonorarState) {
  return state.openItems.filter((item) => {
    if (item.status === "done") return false;
    const partner = partnerOf(state, item.partnerId);
    if (state.role === "advisor") return partner?.advisor === "Mike Bennett";
    if (state.role === "head") return partner?.department === "Beratung & Service";
    return true;
  });
}

export function historyFor(state: HonorarState, refType: string, refId: string) {
  return state.history
    .filter((entry) => entry.refType === refType && entry.refId === refId)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function partnerHistory(state: HonorarState, partnerId: string) {
  const feeIds = state.fees.filter((fee) => fee.partnerId === partnerId).map((fee) => fee.id);
  const itemIds = state.openItems.filter((item) => item.partnerId === partnerId).map((item) => item.id);
  const correctionIds = state.corrections.filter((entry) => entry.partnerId === partnerId).map((entry) => entry.id);
  const invoiceIds = state.singleInvoices.filter((entry) => entry.partnerId === partnerId).map((entry) => entry.id);
  return state.history
    .filter(
      (entry) =>
        (entry.refType === "fee" && feeIds.includes(entry.refId)) ||
        (entry.refType === "openItem" && itemIds.includes(entry.refId)) ||
        (entry.refType === "correction" && correctionIds.includes(entry.refId)) ||
        (entry.refType === "singleInvoice" && invoiceIds.includes(entry.refId)),
    )
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}
