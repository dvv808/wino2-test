import { createAprilImportFees, INCOMPLETE_IMPORT_IDS } from "../../mocks/honorar/seed";
import type {
  CorrectionKind,
  Fee,
  HistoryEntry,
  HonorarRole,
  HonorarState,
  PaymentReason,
} from "../../types/honorar";
import { addDays, servicePeriod, uid } from "./format";
import { actionNeeded, partnerOf, previousFees } from "./queries";

function stamp(state: HonorarState) {
  return `${state.today}T12:00:00`;
}

function history(
  state: HonorarState,
  user: string,
  refType: HistoryEntry["refType"],
  refId: string,
  action: string,
  comment?: string,
): HistoryEntry {
  return { id: uid("hist"), refType, refId, timestamp: stamp(state), user, action, comment };
}

function withHistory(state: HonorarState, entries: HistoryEntry[]): HonorarState {
  return { ...state, history: [...state.history, ...entries] };
}

export function setRole(state: HonorarState, role: HonorarRole): HonorarState {
  return { ...state, role };
}

export function setToday(state: HonorarState, today: string): HonorarState {
  return processDueDates({ ...state, today });
}

export function setTestMode(state: HonorarState, testMode: boolean): HonorarState {
  return { ...state, testMode };
}

export function markPaid(
  state: HonorarState,
  feeId: string,
  user: string,
  comment: string,
): HonorarState {
  const fees = state.fees.map((fee) =>
    fee.id === feeId ? { ...fee, paymentStatus: "paid" as const, paid: fee.amount, paymentReason: undefined } : fee,
  );
  return withHistory({ ...state, fees }, [history(state, user, "fee", feeId, "Doch bezahlt markiert", comment)]);
}

export function receivePayment(state: HonorarState, feeId: string, amount: number, user: string): HonorarState {
  const fees = state.fees.map((fee) => {
    if (fee.id !== feeId) return fee;
    const paid = Math.min(fee.amount, fee.paid + amount);
    const paymentStatus = paid >= fee.amount ? ("paid" as const) : fee.paymentStatus;
    return { ...fee, paid, paymentStatus, paymentReason: paymentStatus === "paid" ? undefined : fee.paymentReason };
  });
  return withHistory({ ...state, fees }, [
    history(state, user, "fee", feeId, `Zahlung verbucht (${amount.toFixed(2)})`),
  ]);
}

export function handToOpenItems(state: HonorarState, feeId: string, user: string): HonorarState {
  const fee = state.fees.find((entry) => entry.id === feeId);
  if (!fee) return state;
  const itemId = uid("op");
  const openAmount = Math.max(0, fee.amount - fee.paid);
  const fees = state.fees.map((entry) =>
    entry.id === feeId ? { ...entry, paymentStatus: "handed_to_op" as const, openItemId: itemId } : entry,
  );
  const openItems = [
    ...state.openItems,
    {
      id: itemId,
      feeId,
      partnerId: fee.partnerId,
      dueMonth: fee.month,
      openAmount,
      reason: fee.paymentReason ?? "due_date_exceeded",
      status: "no_reminder" as const,
    },
  ];
  return withHistory({ ...state, fees, openItems }, [
    history(state, user, "fee", feeId, "An Offene Posten übergeben"),
    history(state, user, "openItem", itemId, "Offener Posten angelegt"),
  ]);
}

export function closeStatusStep(state: HonorarState, monthId: string, user: string): HonorarState {
  const previous = previousFees(state, monthId);
  if (previous.some(actionNeeded)) return state;
  const previousIds = new Set(previous.map((fee) => fee.id));
  const fees = state.fees.map((fee) =>
    previousIds.has(fee.id) && fee.paymentStatus === "open_before_due" ? { ...fee, watched: true } : fee,
  );
  const months = state.months.map((month) =>
    month.id === monthId ? { ...month, steps: { ...month.steps, status: true } } : month,
  );
  const watched = fees.filter((fee) => fee.watched && previousIds.has(fee.id));
  const entries = [
    history(state, user, "month", monthId, "Status abgeschlossen"),
    ...watched.map((fee) => history(state, user, "fee", fee.id, "wird beobachtet")),
  ];
  return withHistory({ ...state, fees, months }, entries);
}

export function clearMonthFees(state: HonorarState, monthId: string, user: string): HonorarState {
  const fees = state.fees.filter((fee) => fee.month !== monthId);
  return withHistory({ ...state, fees }, [history(state, user, "month", monthId, "Liste geleert")]);
}

export function importCaptureData(state: HonorarState, monthId: string, user: string): HonorarState {
  const incoming = createAprilImportFees(stamp(state)).map((fee) => ({ ...fee, month: monthId }));
  const partners = state.partners.map((partner) =>
    partner.id === "hofer" ? { ...partner, address: "" } : partner,
  );
  const fees = [...state.fees.filter((fee) => fee.month !== monthId), ...incoming];
  return withHistory({ ...state, partners, fees, importedFileName: `Honorarimport_${monthId}.xlsx` }, [
    history(state, user, "month", monthId, "Daten importiert"),
  ]);
}

export function fillRequiredFields(state: HonorarState, monthId: string, user: string): HonorarState {
  const partners = state.partners.map((partner) =>
    INCOMPLETE_IMPORT_IDS.includes(partner.id as (typeof INCOMPLETE_IMPORT_IDS)[number]) && !partner.address
      ? { ...partner, address: "Marktplatz 1, 5310 Mondsee" }
      : partner,
  );
  const fees = state.fees.map((fee) =>
    fee.month === monthId && !fee.servicePeriod
      ? { ...fee, servicePeriod: servicePeriod(monthId) }
      : fee,
  );
  return withHistory({ ...state, partners, fees }, [history(state, user, "month", monthId, "Pflichtfelder ergänzt")]);
}

export function patchFee(
  state: HonorarState,
  feeId: string,
  patch: Partial<Pick<Fee, "servicePeriod" | "freeText" | "amount" | "tariff" | "paymentMethod">> & {
    extraFields?: Record<string, string>;
  },
): HonorarState {
  const fees = state.fees.map((fee) =>
    fee.id === feeId
      ? { ...fee, ...patch, extraFields: { ...fee.extraFields, ...patch.extraFields } }
      : fee,
  );
  return { ...state, fees };
}

export function patchPartner(
  state: HonorarState,
  partnerId: string,
  patch: Partial<Pick<import("../../types/honorar").Partner, "address" | "email" | "bankAccount">>,
): HonorarState {
  const partners = state.partners.map((partner) => (partner.id === partnerId ? { ...partner, ...patch } : partner));
  return { ...state, partners };
}

export function closeDataStep(state: HonorarState, monthId: string, user: string): HonorarState {
  const months = state.months.map((month) =>
    month.id === monthId ? { ...month, steps: { ...month.steps, data: true } } : month,
  );
  return withHistory({ ...state, months }, [history(state, user, "month", monthId, "Daten fertig erfasst")]);
}

function invoicesWaiting(state: HonorarState, monthId: string): HonorarState {
  let changed = false;
  const fees = state.fees.map((fee) => {
    if (fee.month !== monthId || fee.invoiceStatus !== "not_created") return fee;
    changed = true;
    return { ...fee, invoiceStatus: "created" as const };
  });
  return changed ? { ...state, fees } : state;
}

export function createCarrier(state: HonorarState, monthId: string, user: string): HonorarState {
  const name = `Honorar_${monthId}.xml`;
  const next = invoicesWaiting(state, monthId);
  return withHistory({ ...next, carrierFileName: name }, [history(state, user, "month", monthId, "Datenträger erstellt")]);
}

export function syncCarrierInvoices(state: HonorarState, monthId: string): HonorarState {
  const created = state.history.some(
    (entry) => entry.refType === "month" && entry.refId === monthId && entry.action === "Datenträger erstellt",
  );
  if (!created) return state;
  return invoicesWaiting(state, monthId);
}

export function setChecklist(state: HonorarState, key: keyof HonorarState["checklist"], value: boolean): HonorarState {
  return { ...state, checklist: { ...state.checklist, [key]: value } };
}

export function handToBmd(state: HonorarState, monthId: string, user: string): HonorarState {
  const months = state.months.map((month) =>
    month.id === monthId ? { ...month, steps: { ...month.steps, dataCarrier: true } } : month,
  );
  const fees = state.fees.map((fee) =>
    fee.month === monthId && fee.invoiceStatus === "not_created" ? { ...fee, invoiceStatus: "created" as const } : fee,
  );
  return withHistory({ ...state, months, fees }, [history(state, user, "month", monthId, "Datenträger übermittelt")]);
}

const CARRIER_RESET_ACTIONS = new Set([
  "Datenträger erstellt",
  "Datenträger übermittelt",
  "An BMD übergeben",
  "Rechnungen versendet",
]);

/** Open months always start with Datenträger Offen so the create → status flow can be retested. */
export function resetOpenCarrier(state: HonorarState, monthId: string): HonorarState {
  const month = state.months.find((entry) => entry.id === monthId);
  if (!month || month.closed) return state;

  const months = state.months.map((entry) =>
    entry.id === monthId
      ? { ...entry, steps: { ...entry.steps, dataCarrier: false, dispatch: false }, bmdDataLoaded: false }
      : entry,
  );
  const fees = state.fees.map((fee) => {
    if (fee.month !== monthId) return fee;
    if (fee.paymentStatus === "paid" || fee.paymentStatus === "handed_to_op") return fee;
    return {
      ...fee,
      invoiceStatus: "not_created" as const,
      sentAt: undefined,
      sentTo: undefined,
      paymentStatus: "open_before_due" as const,
      paymentReason: undefined,
    };
  });
  const history = state.history.filter(
    (entry) => !(entry.refType === "month" && entry.refId === monthId && CARRIER_RESET_ACTIONS.has(entry.action)),
  );
  const carrierFileName =
    state.carrierFileName === `Honorar_${monthId}.xml` ? undefined : state.carrierFileName;

  return { ...state, months, fees, history, carrierFileName };
}

export function loadBmd(state: HonorarState, monthId: string, mismatches: boolean, user: string): HonorarState {
  const fees = state.fees.map((fee) => {
    if (fee.month !== monthId) return fee;
    const partner = partnerOf(state, fee.partnerId);
    if (!partner) return fee;
    const breakRow = mismatches && (fee.partnerId === "ava" || fee.partnerId === "brown");
    return {
      ...fee,
      bmd: {
        amount: breakRow ? fee.amount + 20 : fee.amount,
        address: breakRow ? "abweichend, 5310 Mondsee" : partner.address,
        email: partner.email,
        servicePeriod: fee.servicePeriod,
      },
    };
  });
  const months = state.months.map((month) => (month.id === monthId ? { ...month, bmdDataLoaded: true } : month));
  return withHistory({ ...state, fees, months, bmdCorrectionImported: false }, [
    history(state, user, "month", monthId, mismatches ? "BMD-Daten geladen (2 Abweichungen)" : "BMD-Daten geladen"),
  ]);
}

export function importBmdCorrection(state: HonorarState, monthId: string, user: string): HonorarState {
  return withHistory({ ...state, bmdCorrectionImported: true }, [
    history(state, user, "month", monthId, "BMD-Korrektur importiert"),
  ]);
}

export function realignFee(state: HonorarState, feeId: string, user: string): HonorarState {
  const fee = state.fees.find((entry) => entry.id === feeId);
  const partner = fee ? partnerOf(state, fee.partnerId) : undefined;
  if (!fee || !partner || !fee.bmd || !state.bmdCorrectionImported) return state;
  const fees = state.fees.map((entry) =>
    entry.id === feeId
      ? { ...entry, bmd: { amount: entry.amount, address: partner.address, email: partner.email, servicePeriod: entry.servicePeriod } }
      : entry,
  );
  return withHistory({ ...state, fees }, [history(state, user, "fee", feeId, "Neu abgeglichen")]);
}

export function sendInvoices(state: HonorarState, monthId: string, user: string): HonorarState {
  const now = stamp(state);
  const fees = state.fees.map((fee) => {
    if (fee.month !== monthId) return fee;
    const partner = partnerOf(state, fee.partnerId);
    const settled = fee.paymentStatus === "paid" || fee.paymentStatus === "handed_to_op";
    return {
      ...fee,
      invoiceStatus: "sent" as const,
      sentAt: now,
      sentTo: partner?.deliveryMethod === "print" ? "Post" : partner?.email,
      paymentStatus: settled ? fee.paymentStatus : ("open_before_due" as const),
      paymentReason: settled ? fee.paymentReason : undefined,
    };
  });
  return withHistory({ ...state, fees }, [history(state, user, "month", monthId, "Rechnungen versendet")]);
}

export function bounceMail(state: HonorarState, feeId: string, user: string): HonorarState {
  const fees = state.fees.map((fee) => (fee.id === feeId ? { ...fee, invoiceStatus: "send_failed" as const } : fee));
  return withHistory({ ...state, fees }, [history(state, user, "fee", feeId, "Versand fehlgeschlagen")]);
}

export function resendInvoice(state: HonorarState, feeId: string, byPost: boolean, user: string): HonorarState {
  const partner = (() => {
    const fee = state.fees.find((entry) => entry.id === feeId);
    return fee ? partnerOf(state, fee.partnerId) : undefined;
  })();
  const fees = state.fees.map((fee) =>
    fee.id === feeId
      ? {
          ...fee,
          invoiceStatus: "sent" as const,
          sentAt: stamp(state),
          sentTo: byPost ? "Post" : partner?.email,
          bmd: fee.bmd
            ? {
                ...fee.bmd,
                email: byPost ? fee.bmd.email : partner?.email ?? fee.bmd.email,
              }
            : fee.bmd,
        }
      : fee,
  );
  return withHistory({ ...state, fees }, [history(state, user, "fee", feeId, byPost ? "Per Post gesendet" : "Erneut gesendet")]);
}

export function closeMonth(state: HonorarState, monthId: string, user: string): HonorarState {
  const months = state.months.map((month) => {
    if (month.id === monthId) {
      return { ...month, closed: true, steps: { status: true, data: true, dataCarrier: true, dispatch: true } };
    }
    return month;
  });
  return withHistory({ ...state, months }, [history(state, user, "month", monthId, "Monat abgeschlossen")]);
}

export function processDueDates(state: HonorarState, onlyFeeIds?: string[]): HonorarState {
  let next: HonorarState = { ...state, fees: [...state.fees], openItems: [...state.openItems], history: [...state.history] };
  for (const fee of state.fees) {
    if (onlyFeeIds && !onlyFeeIds.includes(fee.id)) continue;
    if (fee.paymentStatus !== "open_before_due" || fee.dueDate >= state.today) continue;
    if (next.openItems.some((item) => item.feeId === fee.id)) {
      next = {
        ...next,
        fees: next.fees.map((entry) => (entry.id === fee.id ? { ...entry, paymentStatus: "handed_to_op" } : entry)),
      };
      continue;
    }
    const itemId = uid("op");
    next = {
      ...next,
      fees: next.fees.map((entry) =>
        entry.id === fee.id ? { ...entry, paymentStatus: "handed_to_op", paymentReason: "due_date_exceeded", openItemId: itemId } : entry,
      ),
      openItems: [
        ...next.openItems,
        {
          id: itemId,
          feeId: fee.id,
          partnerId: fee.partnerId,
          dueMonth: fee.month,
          openAmount: Math.max(0, fee.amount - fee.paid),
          reason: "due_date_exceeded",
          status: "no_reminder",
        },
      ],
      history: [
        ...next.history,
        history(state, "System", "fee", fee.id, "Automatisch übergeben"),
        history(state, "System", "openItem", itemId, "Automatisch übergeben"),
      ],
    };
  }
  return next;
}

export function exceedDueDates(state: HonorarState): HonorarState {
  const watched = state.fees.filter((fee) => fee.paymentStatus === "open_before_due" && fee.watched);
  const fallback = state.fees.filter((fee) => fee.paymentStatus === "open_before_due");
  const target = watched.length ? watched : fallback;
  const latest = target.reduce((max, fee) => (fee.dueDate > max ? fee.dueDate : max), state.today);
  return processDueDates({ ...state, today: addDays(latest, 1) }, target.map((fee) => fee.id));
}

export function sepaChargeback(state: HonorarState, feeId: string, user: string): HonorarState {
  const fees = state.fees.map((fee) =>
    fee.id === feeId
      ? { ...fee, paymentStatus: "unpaid" as const, paid: 0, paymentReason: "sepa_chargeback" as PaymentReason }
      : fee,
  );
  return withHistory({ ...state, fees }, [history(state, user, "fee", feeId, "SEPA-Rücklastschrift")]);
}

export function sendReminder(state: HonorarState, itemId: string, user: string): HonorarState {
  const openItems = state.openItems.map((item) =>
    item.id === itemId ? { ...item, status: "reminder_sent" as const, reminderSentAt: stamp(state) } : item,
  );
  return withHistory({ ...state, openItems }, [history(state, user, "openItem", itemId, "Zahlungserinnerung versendet")]);
}

export function reminderOverdue(state: HonorarState, itemId: string, user: string): HonorarState {
  const openItems = state.openItems.map((item) =>
    item.id === itemId ? { ...item, status: "reminder_overdue" as const } : item,
  );
  return withHistory({ ...state, openItems }, [history(state, user, "openItem", itemId, "Erinnerung ohne Reaktion")]);
}

export function bookOpenPayment(state: HonorarState, itemId: string, amount: number, user: string): HonorarState {
  const openItems = state.openItems.map((item) => {
    if (item.id !== itemId) return item;
    const openAmount = Math.max(0, item.openAmount - amount);
    return { ...item, openAmount, status: openAmount === 0 ? ("done" as const) : item.status };
  });
  return withHistory({ ...state, openItems }, [
    history(state, user, "openItem", itemId, `Zahlung verbucht (${amount.toFixed(2)})`),
  ]);
}

export function startCorrection(
  state: HonorarState,
  partnerId: string,
  openItemId: string,
  kind: CorrectionKind,
  amount: number,
  justification: string,
  user: string,
): HonorarState {
  const id = uid("corr");
  const corrections = [
    ...state.corrections,
    { id, partnerId, openItemId, kind, amount, justification, status: "draft" as const },
  ];
  return withHistory({ ...state, corrections }, [history(state, user, "correction", id, "Korrektur gestartet")]);
}

export function submitCorrection(state: HonorarState, correctionId: string, user: string): HonorarState {
  const correction = state.corrections.find((entry) => entry.id === correctionId);
  const corrections = state.corrections.map((entry) =>
    entry.id === correctionId ? { ...entry, status: "in_approval" as const } : entry,
  );
  const openItems = state.openItems.map((item) =>
    item.id === correction?.openItemId ? { ...item, status: "agreement_in_approval" as const } : item,
  );
  return withHistory({ ...state, corrections, openItems }, [
    history(state, user, "correction", correctionId, "Zur Freigabe"),
  ]);
}

export function resetCorrection(state: HonorarState, correctionId: string, comment: string, user: string): HonorarState {
  const correction = state.corrections.find((entry) => entry.id === correctionId);
  const corrections = state.corrections.map((entry) =>
    entry.id === correctionId ? { ...entry, status: "reset" as const, comment } : entry,
  );
  const openItems = state.openItems.map((item) => {
    if (item.id !== correction?.openItemId) return item;
    return {
      ...item,
      status: item.reminderSentAt ? ("reminder_overdue" as const) : ("no_reminder" as const),
    };
  });
  return withHistory({ ...state, corrections, openItems }, [
    history(state, user, "correction", correctionId, "Zurückgesetzt", comment),
  ]);
}

export function patchCorrection(
  state: HonorarState,
  correctionId: string,
  patch: Partial<{ kind: CorrectionKind; amount: number; justification: string }>,
): HonorarState {
  const corrections = state.corrections.map((entry) => (entry.id === correctionId ? { ...entry, ...patch } : entry));
  return { ...state, corrections };
}

export function approveCorrection(state: HonorarState, correctionId: string, user: string): HonorarState {
  const correction = state.corrections.find((entry) => entry.id === correctionId);
  if (!correction) return state;
  const corrections = state.corrections.map((entry) =>
    entry.id === correctionId ? { ...entry, status: "approved" as const } : entry,
  );
  const reduces = correction.kind !== "Ratenzahlung";
  const openItems = state.openItems.map((item) => {
    if (item.id !== correction.openItemId) return item;
    const openAmount = reduces ? Math.max(0, item.openAmount - correction.amount) : item.openAmount;
    return {
      ...item,
      openAmount,
      status: openAmount === 0 ? ("done" as const) : ("agreement_made" as const),
    };
  });
  const invoiceId = uid("inv");
  const singleInvoices = [
    ...state.singleInvoices,
    {
      id: invoiceId,
      correctionId,
      partnerId: correction.partnerId,
      amount: correction.amount,
      kind: correction.kind,
      status: "open" as const,
    },
  ];
  return withHistory({ ...state, corrections, openItems, singleInvoices }, [
    history(state, user, "correction", correctionId, "Freigegeben"),
    history(state, user, "singleInvoice", invoiceId, "Einzelfaktura erstellt"),
    correction.openItemId ? history(state, user, "openItem", correction.openItemId, "Vereinbarung getroffen") : undefined,
  ].filter(Boolean) as HistoryEntry[]);
}

export function moveFeeToSingleInvoice(state: HonorarState, feeId: string, user: string): HonorarState {
  const fee = state.fees.find((entry) => entry.id === feeId);
  if (!fee || state.singleInvoices.some((invoice) => invoice.feeId === feeId)) return state;
  const id = uid("inv");
  const singleInvoices = [
    ...state.singleInvoices,
    {
      id,
      correctionId: "",
      feeId,
      partnerId: fee.partnerId,
      amount: fee.amount,
      kind: "Einzelfaktura/Gutschrift",
      status: "open" as const,
      month: fee.month,
    },
  ];
  return withHistory({ ...state, singleInvoices }, [
    history(state, user, "singleInvoice", id, "Einzelfaktura erstellt"),
  ]);
}

export function hideOpenFee(state: HonorarState, feeId: string, user: string): HonorarState {
  const fees = state.fees.map((fee) => (fee.id === feeId ? { ...fee, hiddenOpen: true } : fee));
  return withHistory({ ...state, fees }, [history(state, user, "fee", feeId, "Offener Posten gelöscht")]);
}

export function grantSingleCredit(
  state: HonorarState,
  invoiceId: string,
  amount: number,
  comment: string,
  user: string,
): HonorarState {
  const grantedAt = stamp(state);
  const singleInvoices = state.singleInvoices.map((invoice) =>
    invoice.id === invoiceId
      ? { ...invoice, credit: amount, comment, grantedAt, grantedBy: user }
      : invoice,
  );
  return withHistory({ ...state, singleInvoices }, [
    history(state, user, "singleInvoice", invoiceId, "Gutschrift gewährt", comment || undefined),
  ]);
}

export function clearSingleInvoices(state: HonorarState, user: string): HonorarState {
  return withHistory({ ...state, singleInvoices: [] }, [
    history(state, user, "month", state.months[0]?.id ?? "single", "Einzelfaktura-Liste geleert"),
  ]);
}

export function sendSingleInvoice(state: HonorarState, invoiceId: string, user: string): HonorarState {
  const singleInvoices = state.singleInvoices.map((invoice) =>
    invoice.id === invoiceId ? { ...invoice, status: "sent_to_bmd" as const } : invoice,
  );
  return withHistory({ ...state, singleInvoices }, [history(state, user, "singleInvoice", invoiceId, "An BMD gesendet")]);
}

export function simulateLastWorkingDay(state: HonorarState): HonorarState {
  const count = state.openItems.filter((item) => {
    const partner = partnerOf(state, item.partnerId);
    return item.status !== "done" && partner?.advisor === "Mike Bennett";
  }).length;
  const notices = [
    ...state.notices,
    {
      id: uid("note"),
      text: `Offene Posten prüfen: ${count} offen in deinem Bereich`,
      createdAt: stamp(state),
      read: false,
    },
  ];
  return { ...state, notices };
}

export function markNoticesRead(state: HonorarState): HonorarState {
  return { ...state, notices: state.notices.map((notice) => ({ ...notice, read: true })) };
}
