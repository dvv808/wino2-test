import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createSeedState, ROLE_USER } from "../mocks/honorar/seed";
import * as t from "../lib/honorar/transitions";
import type { CorrectionKind, Fee, HistoryEntry, HonorarRole, HonorarState } from "../types/honorar";

export const STORAGE_KEY = "wino.honorar.v1";

function readTestFlag() {
  return new URLSearchParams(window.location.search).get("test") === "1";
}

function keepOpenFlags(seedFees: Fee[], savedFees: Fee[] | undefined) {
  if (!savedFees?.length) return seedFees;
  const saved = new Map(savedFees.map((fee) => [fee.id, fee]));
  return seedFees.map((fee) => {
    const previous = saved.get(fee.id);
    if (!previous?.hiddenOpen) return fee;
    return { ...fee, hiddenOpen: true };
  });
}

function keepListHistory(seedHistory: HistoryEntry[], saved: Partial<HonorarState>) {
  const kept = new Set([
    ...(saved.openItems ?? []).map((item) => item.id),
    ...(saved.singleInvoices ?? []).map((invoice) => invoice.id),
    ...(saved.corrections ?? []).map((correction) => correction.id),
  ]);
  const extra = (saved.history ?? []).filter((entry) => {
    if (entry.refType === "month") return false;
    if (entry.refType === "fee") return entry.action === "Offener Posten gelöscht";
    return kept.has(entry.refId);
  });
  const seen = new Set(seedHistory.map((entry) => entry.id));
  return [...seedHistory, ...extra.filter((entry) => !seen.has(entry.id))];
}

/** Refresh restores the month tables. Offene Posten and Einzelfaktura stay. */
function loadState(): HonorarState {
  const testMode = readTestFlag();
  const seed = createSeedState(testMode);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<HonorarState>;
    return {
      ...seed,
      testMode: Boolean(parsed.testMode) || testMode,
      role: parsed.role ?? seed.role,
      fees: keepOpenFlags(seed.fees, parsed.fees),
      openItems: parsed.openItems ?? seed.openItems,
      corrections: parsed.corrections ?? seed.corrections,
      singleInvoices: parsed.singleInvoices ?? seed.singleInvoices,
      history: keepListHistory(seed.history, parsed),
    };
  } catch {
    return seed;
  }
}

function persist(state: HonorarState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function useHonorarState() {
  const [state, setState] = useState<HonorarState>(loadState);

  useEffect(() => {
    persist(state);
  }, [state]);

  const user = ROLE_USER[state.role];
  const apply = (fn: (prev: HonorarState) => HonorarState) => setState(fn);
  const asUser = (fn: (prev: HonorarState, actor: string) => HonorarState) =>
    apply((prev) => fn(prev, ROLE_USER[prev.role]));

  return {
    state,
    user,
    reset: () => apply((prev) => createSeedState(prev.testMode)),
    setRole: (role: HonorarRole) => apply((prev) => t.setRole(prev, role)),
    setToday: (today: string) => apply((prev) => t.setToday(prev, today)),
    setTestMode: (on: boolean) => apply((prev) => t.setTestMode(prev, on)),
    markPaid: (feeId: string, comment: string) => asUser((prev, actor) => t.markPaid(prev, feeId, actor, comment)),
    receivePayment: (feeId: string, amount: number) => asUser((prev, actor) => t.receivePayment(prev, feeId, amount, actor)),
    handToOpenItems: (feeId: string) => asUser((prev, actor) => t.handToOpenItems(prev, feeId, actor)),
    closeStatusStep: (monthId: string) => asUser((prev, actor) => t.closeStatusStep(prev, monthId, actor)),
    importCaptureData: (monthId: string) => asUser((prev, actor) => t.importCaptureData(prev, monthId, actor)),
    clearMonthFees: (monthId: string) => asUser((prev, actor) => t.clearMonthFees(prev, monthId, actor)),
    fillRequiredFields: (monthId: string) => asUser((prev, actor) => t.fillRequiredFields(prev, monthId, actor)),
    patchFee: (...args: Parameters<typeof t.patchFee> extends [HonorarState, ...infer Rest] ? Rest : never) =>
      apply((prev) => t.patchFee(prev, ...args)),
    patchPartner: (...args: Parameters<typeof t.patchPartner> extends [HonorarState, ...infer Rest] ? Rest : never) =>
      apply((prev) => t.patchPartner(prev, ...args)),
    closeDataStep: (monthId: string) => asUser((prev, actor) => t.closeDataStep(prev, monthId, actor)),
    createCarrier: (monthId: string) => asUser((prev, actor) => t.createCarrier(prev, monthId, actor)),
    setChecklist: (key: keyof HonorarState["checklist"], value: boolean) =>
      apply((prev) => t.setChecklist(prev, key, value)),
    handToBmd: (monthId: string) => asUser((prev, actor) => t.handToBmd(prev, monthId, actor)),
    resetOpenCarrier: (monthId: string) => apply((prev) => t.resetOpenCarrier(prev, monthId)),
    syncCarrierInvoices: (monthId: string) => apply((prev) => t.syncCarrierInvoices(prev, monthId)),
    loadBmd: (monthId: string, mismatches: boolean) => asUser((prev, actor) => t.loadBmd(prev, monthId, mismatches, actor)),
    importBmdCorrection: (monthId: string) => asUser((prev, actor) => t.importBmdCorrection(prev, monthId, actor)),
    realignFee: (feeId: string) => asUser((prev, actor) => t.realignFee(prev, feeId, actor)),
    sendInvoices: (monthId: string) => asUser((prev, actor) => t.sendInvoices(prev, monthId, actor)),
    bounceMail: (feeId: string) => asUser((prev, actor) => t.bounceMail(prev, feeId, actor)),
    resendInvoice: (feeId: string, byPost: boolean) => asUser((prev, actor) => t.resendInvoice(prev, feeId, byPost, actor)),
    closeMonth: (monthId: string) => asUser((prev, actor) => t.closeMonth(prev, monthId, actor)),
    exceedDueDates: () => apply((prev) => t.exceedDueDates(prev)),
    sepaChargeback: (feeId: string) => asUser((prev, actor) => t.sepaChargeback(prev, feeId, actor)),
    sendReminder: (itemId: string) => asUser((prev, actor) => t.sendReminder(prev, itemId, actor)),
    reminderOverdue: (itemId: string) => asUser((prev, actor) => t.reminderOverdue(prev, itemId, actor)),
    bookOpenPayment: (itemId: string, amount: number) =>
      asUser((prev, actor) => t.bookOpenPayment(prev, itemId, amount, actor)),
    startCorrection: (
      partnerId: string,
      openItemId: string,
      kind: CorrectionKind,
      amount: number,
      justification: string,
    ) =>
      asUser((prev, actor) => {
        const started = t.startCorrection(prev, partnerId, openItemId, kind, amount, justification, actor);
        const created = started.corrections[started.corrections.length - 1];
        return created ? t.submitCorrection(started, created.id, actor) : started;
      }),
    submitCorrection: (correctionId: string) => asUser((prev, actor) => t.submitCorrection(prev, correctionId, actor)),
    resetCorrection: (correctionId: string, comment: string) =>
      asUser((prev, actor) => t.resetCorrection(prev, correctionId, comment, actor)),
    patchCorrection: (...args: Parameters<typeof t.patchCorrection> extends [HonorarState, ...infer Rest] ? Rest : never) =>
      apply((prev) => t.patchCorrection(prev, ...args)),
    approveCorrection: (correctionId: string) => asUser((prev, actor) => t.approveCorrection(prev, correctionId, actor)),
    moveFeeToSingleInvoice: (feeId: string) => asUser((prev, actor) => t.moveFeeToSingleInvoice(prev, feeId, actor)),
    hideOpenFee: (feeId: string) => asUser((prev, actor) => t.hideOpenFee(prev, feeId, actor)),
    grantSingleCredit: (invoiceId: string, amount: number, comment: string) =>
      asUser((prev, actor) => t.grantSingleCredit(prev, invoiceId, amount, comment, actor)),
    clearSingleInvoices: () => asUser((prev, actor) => t.clearSingleInvoices(prev, actor)),
    sendSingleInvoice: (invoiceId: string) => asUser((prev, actor) => t.sendSingleInvoice(prev, invoiceId, actor)),
    simulateLastWorkingDay: () => apply((prev) => t.simulateLastWorkingDay(prev)),
    markNoticesRead: () => apply((prev) => t.markNoticesRead(prev)),
  };
}

type HonorarStore = ReturnType<typeof useHonorarState>;

const HonorarContext = createContext<HonorarStore | null>(null);

export function HonorarProvider({ children }: { children: ReactNode }) {
  const value = useHonorarState();
  const memo = useMemo(() => value, [value]);
  return <HonorarContext.Provider value={memo}>{children}</HonorarContext.Provider>;
}

export function useHonorar() {
  const value = useContext(HonorarContext);
  if (!value) throw new Error("useHonorar must be used inside HonorarProvider");
  return value;
}
