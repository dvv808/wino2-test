import * as a from "../../assets/index";
import type { Fee, HistoryEntry, HonorarState, Month, OpenItem, Partner, SingleInvoice } from "../../types/honorar";

const YEAR = 2027;
const TODAY = "2027-04-10";

function monthId(month: number) {
  return `${YEAR}-${String(month).padStart(2, "0")}`;
}

function months(): Month[] {
  return Array.from({ length: 12 }, (_, index) => {
    const id = monthId(index + 1);
    const closed = index < 3;
    return {
      id,
      steps: {
        status: closed,
        data: closed,
        dataCarrier: closed,
        dispatch: closed,
      },
      closed,
      bmdDataLoaded: closed,
    };
  });
}

export const PEOPLE = {
  lucy: "Lucy Dallon",
  mike: "Mike Bennett",
  sandra: "Sandra Huber",
  thomas: "Thomas Leitner",
  anna: "Anna Chan",
} as const;

export const ADVISORS = {
  mike: { name: PEOPLE.mike, department: "Beratung & Service", photo: a.reqMike },
  sandra: { name: PEOPLE.sandra, department: "Beratung & Service", photo: a.reqAnna },
} as const;

export const ROLE_USER: Record<HonorarState["role"], string> = {
  backoffice: PEOPLE.lucy,
  advisor: PEOPLE.mike,
  head: PEOPLE.thomas,
  approver: PEOPLE.anna,
};

export const partners: Partner[] = [
  {
    id: "ava",
    name: "Ava Grace Thompson",
    birthDate: "03.01.1992",
    nickname: "Stoanacha",
    type: "person",
    address: "Mondseestrasse 12, 5310 Mondsee",
    email: "ava.thompson@mail.at",
    deliveryMethod: "digital",
    bankAccount: "AT61 1904 3002 3457 3201",
    advisor: PEOPLE.mike,
    department: "Beratung & Service",
    photo: a.empJasmin,
  },
  {
    id: "bella",
    name: "Bella Marie Johnson",
    birthDate: "23.11.1985",
    type: "person",
    address: "Linzerstrasse 8, 5310 Mondsee",
    email: "bella.johnson@mail.at",
    deliveryMethod: "digital",
    bankAccount: "AT40 3200 0000 1234 5678",
    advisor: PEOPLE.mike,
    department: "Beratung & Service",
    photo: a.partnerBella,
  },
  {
    id: "caleb",
    name: "Caleb Alexander Smith",
    birthDate: "17.06.1990",
    type: "person",
    address: "Hauptstrasse 4, 5310 Mondsee",
    email: "caleb.smith@mail.at",
    deliveryMethod: "print",
    bankAccount: "AT02 2011 1000 0412 3456",
    advisor: PEOPLE.mike,
    department: "Beratung & Service",
    photo: a.reqMike,
  },
  {
    id: "charlotte",
    name: "Charlotte Elizabeth Taylor",
    birthDate: "30.03.1983",
    type: "person",
    address: "Seestraße 21, 5310 Mondsee",
    email: "charlotte.taylor@mail.at",
    deliveryMethod: "digital",
    bankAccount: "AT88 1200 0100 1234 8901",
    advisor: PEOPLE.sandra,
    department: "Beratung & Service",
    photo: a.empChristine,
  },
  {
    id: "brown",
    name: "Brown & Brown AG",
    nickname: "Tiki-Bar",
    type: "company",
    address: "Gewerbepark 3, 5310 Mondsee",
    email: "office@brown-ag.at",
    deliveryMethod: "print",
    bankAccount: "AT15 6000 0000 7890 1234",
    advisor: PEOPLE.sandra,
    department: "Beratung & Service",
    photo: a.companyBlank,
  },
  {
    id: "gavin",
    name: "Gavin Michael Wilson",
    birthDate: "26.08.1991",
    nickname: "Hommalechna",
    type: "person",
    address: "Bahnhofstrasse 9, 5310 Mondsee",
    email: "gavin.wilson@mail.at",
    deliveryMethod: "digital",
    advisor: PEOPLE.mike,
    department: "Beratung & Service",
    photo: a.empAlexander,
  },
  {
    id: "gartner",
    name: "Gartner & Gartner AG",
    type: "company",
    address: "Industriestrasse 14, 5310 Mondsee",
    email: "buchhaltung@gartner-ag.at",
    deliveryMethod: "digital",
    bankAccount: "AT23 1400 0001 2345 6789",
    advisor: PEOPLE.sandra,
    department: "Beratung & Service",
    photo: a.companyBlank,
  },
  {
    id: "hofer",
    name: "Hofer & Söhne OG",
    type: "company",
    address: "Marktplatz 1, 5310 Mondsee",
    email: "office@hofer-soehne.at",
    deliveryMethod: "print",
    bankAccount: "AT47 3200 0000 9876 5432",
    advisor: PEOPLE.sandra,
    department: "Beratung & Service",
    photo: a.clientBlank,
  },
];

function marchFee(
  partnerId: string,
  amount: number,
  paid: number,
  paymentMethod: Fee["paymentMethod"],
  tariff: Fee["tariff"],
  paymentStatus: Fee["paymentStatus"],
  extras: Partial<Fee> = {},
): Fee {
  const partner = partners.find((entry) => entry.id === partnerId)!;
  return {
    id: `fee-2027-03-${partnerId}`,
    partnerId,
    month: "2027-03",
    servicePeriod: "01.03.2027 – 31.03.2027",
    extraFields: { Thomas: "", Maria: "" },
    amount,
    paid,
    tariff,
    paymentMethod,
    dueDate: extras.dueDate ?? "2027-03-31",
    invoiceStatus: "sent",
    sentAt: "2027-03-12T13:33:00",
    sentTo: partner.email,
    paymentStatus,
    createdAt: "2027-03-12T13:33:00",
    createdBy: PEOPLE.mike,
    ...extras,
  };
}

const marchFees: Fee[] = [
  marchFee("ava", 120, 0, "Abbucher", "Single", "unpaid", { paymentReason: "direct_debit_failed" }),
  marchFee("bella", 120, 20, "Abbucher", "Single", "unpaid", { paymentReason: "amount_mismatch" }),
  marchFee("caleb", 120, 120, "Überweisung", "Single", "paid"),
  marchFee("charlotte", 120, 120, "Abbucher", "Single", "paid", { creditAmount: 30 }),
  marchFee("brown", 2000, 2000, "Überweisung", "Business", "paid"),
  marchFee("gavin", 120, 0, "Überweisung", "Single", "unpaid", { paymentReason: "due_date_exceeded" }),
  marchFee("gartner", 3000, 3000, "Abbucher", "Business", "paid"),
  marchFee("hofer", 2000, 0, "Überweisung", "Business", "open_before_due", { dueDate: "2027-04-15" }),
];

/** Older unpaid invoices so that Offene Posten has a realistic list (3 from March + 12 here). */
function olderFee(
  month: "2027-01" | "2027-02",
  partnerId: string,
  amount: number,
  paid: number,
  paymentMethod: Fee["paymentMethod"],
  tariff: Fee["tariff"],
  paymentReason: NonNullable<Fee["paymentReason"]>,
  extras: Partial<Fee> = {},
): Fee {
  const partner = partners.find((entry) => entry.id === partnerId)!;
  const [, mm] = month.split("-");
  const last = mm === "01" ? "31" : "28";
  return {
    id: `fee-${month}-${partnerId}`,
    partnerId,
    month,
    servicePeriod: `01.${mm}.2027 – ${last}.${mm}.2027`,
    extraFields: { Thomas: "", Maria: "" },
    amount,
    paid,
    tariff,
    paymentMethod,
    dueDate: `2027-${mm}-${last}`,
    invoiceStatus: "sent",
    sentAt: `2027-${mm}-12T13:33:00`,
    sentTo: partner.email,
    paymentStatus: "unpaid",
    paymentReason,
    createdAt: `2027-${mm}-12T13:33:00`,
    createdBy: PEOPLE.mike,
    ...extras,
  };
}

/** Invoices of earlier months that were paid late. */
function paidLateFee(
  month: "2027-01" | "2027-02",
  partnerId: string,
  amount: number,
  paymentMethod: Fee["paymentMethod"],
  tariff: Fee["tariff"],
  paidLate: NonNullable<Fee["paidLate"]>,
): Fee {
  return olderFee(month, partnerId, amount, amount, paymentMethod, tariff, "due_date_exceeded", {
    paymentStatus: "paid",
    paymentReason: undefined,
    paidLate,
    // Paid after a reminder means that a reminder went out first.
    ...(paidLate === "reminder" ? { reminderSentAt: `2027-${month === "2027-01" ? "02" : "03"}-12T09:00:00` } : {}),
  });
}

const olderUnpaidFees: Fee[] = [
  olderFee("2027-01", "ava", 120, 0, "Abbucher", "Single", "direct_debit_failed", { reminderSentAt: "2027-02-12T09:00:00" }),
  olderFee("2027-01", "bella", 120, 40, "Überweisung", "Single", "amount_mismatch", { creditAmount: 40 }),
  olderFee("2027-01", "gavin", 120, 0, "Überweisung", "Single", "due_date_exceeded", { reminderSentAt: "2027-02-12T09:00:00" }),
  olderFee("2027-01", "brown", 2000, 0, "Überweisung", "Business", "due_date_exceeded"),
  olderFee("2027-01", "hofer", 2000, 500, "Überweisung", "Business", "amount_mismatch"),
  olderFee("2027-01", "charlotte", 120, 0, "Abbucher", "Single", "sepa_chargeback"),
  olderFee("2027-02", "ava", 120, 0, "Abbucher", "Single", "direct_debit_failed", { reminderSentAt: "2027-03-12T09:00:00" }),
  olderFee("2027-02", "gartner", 3000, 0, "Abbucher", "Business", "sepa_chargeback"),
  olderFee("2027-02", "gavin", 120, 0, "Überweisung", "Single", "due_date_exceeded", { creditAmount: 60 }),
  olderFee("2027-01", "caleb", 120, 0, "Überweisung", "Single", "due_date_exceeded"),
  olderFee("2027-02", "bella", 120, 60, "Überweisung", "Single", "amount_mismatch", { reminderSentAt: "2027-03-12T09:00:00" }),
  olderFee("2027-02", "charlotte", 120, 0, "Abbucher", "Single", "direct_debit_failed"),
  paidLateFee("2027-01", "gartner", 3000, "Abbucher", "Business", "reminder"),
  paidLateFee("2027-02", "brown", 2000, "Überweisung", "Business", "reminder"),
  paidLateFee("2027-02", "hofer", 2000, "Überweisung", "Business", "two_months"),
];

const februaryOpenItem: OpenItem = {
  id: "op-2027-02-caleb",
  feeId: "fee-2027-02-caleb",
  partnerId: "caleb",
  dueMonth: "2027-02",
  openAmount: 120,
  reason: "due_date_exceeded",
  status: "reminder_sent",
  reminderSentAt: "2027-03-02T09:00:00",
};

const history: HistoryEntry[] = [
  {
    id: "hist-seed-caleb-op",
    refType: "openItem",
    refId: februaryOpenItem.id,
    timestamp: "2027-03-02T09:00:00",
    user: PEOPLE.lucy,
    action: "Zahlungserinnerung versendet",
  },
];

export const INCOMPLETE_IMPORT_IDS = ["gavin", "hofer"] as const;

export function createAprilImportFees(now: string): Fee[] {
  return partners.map((partner) => {
    const incomplete = INCOMPLETE_IMPORT_IDS.includes(partner.id as (typeof INCOMPLETE_IMPORT_IDS)[number]);
    const business = partner.type === "company";
    return {
      id: `fee-2027-04-${partner.id}`,
      partnerId: partner.id,
      month: "2027-04",
      servicePeriod: incomplete ? "" : "01.04.2027 – 30.04.2027",
      extraFields: { Thomas: "", Maria: "" },
      amount: business ? (partner.id === "gartner" ? 3000 : 2000) : 120,
      paid: 0,
      tariff: business ? "Business" : "Single",
      paymentMethod: partner.bankAccount ? "Abbucher" : "Überweisung",
      dueDate: "2027-04-30",
      invoiceStatus: "not_created" as const,
      paymentStatus: "open_before_due" as const,
      createdAt: now,
      createdBy: PEOPLE.lucy,
    };
  });
}

const APRIL_ROWS: Array<Pick<Fee, "partnerId" | "amount" | "tariff" | "paymentMethod">> = [
  { partnerId: "ava", amount: 120, tariff: "Single", paymentMethod: "Abbucher" },
  { partnerId: "bella", amount: 120, tariff: "Single", paymentMethod: "Abbucher" },
  { partnerId: "caleb", amount: 120, tariff: "Single", paymentMethod: "Überweisung" },
  { partnerId: "charlotte", amount: 120, tariff: "Single", paymentMethod: "Abbucher" },
  { partnerId: "brown", amount: 2000, tariff: "Business", paymentMethod: "Überweisung" },
  { partnerId: "gavin", amount: 120, tariff: "Single", paymentMethod: "Überweisung" },
  { partnerId: "gartner", amount: 3000, tariff: "Business", paymentMethod: "Abbucher" },
];

function aprilFees(): Fee[] {
  return APRIL_ROWS.map((row) => ({
    id: `fee-2027-04-${row.partnerId}`,
    partnerId: row.partnerId,
    month: "2027-04",
    servicePeriod: row.partnerId === "gavin" ? "" : "01.04.2027 – 30.04.2027",
    extraFields: { Thomas: "", Maria: "" },
    amount: row.amount,
    paid: 0,
    tariff: row.tariff,
    paymentMethod: row.paymentMethod,
    dueDate: "2027-04-30",
    invoiceStatus: "not_created",
    paymentStatus: "open_before_due",
    createdAt: "2026-12-12T12:33:00",
    createdBy: PEOPLE.mike,
  }));
}

/**
 * Sammelfaktura examples: new Zahlungsziel (paid and unpaid), credits, and combinations.
 * Their fees get the new due date in createSeedState.
 */
function demoInvoice(
  key: string,
  feeId: string,
  partnerId: string,
  amount: number,
  month: string,
  dueDateOriginal: string,
  extras: Partial<SingleInvoice>,
): SingleInvoice {
  return {
    id: `inv-seed-${key}`,
    correctionId: "",
    feeId,
    partnerId,
    amount,
    kind: "Sammelfaktura/Gutschrift",
    status: "open",
    month,
    dueDateOriginal,
    grantedBy: PEOPLE.lucy,
    ...extras,
  };
}

const demoSingleInvoices: SingleInvoice[] = [
  demoInvoice("brown-feb", "fee-2027-02-brown", "brown", 2000, "2027-02", "2027-02-28", {
    dueDate: "2027-03-31",
    grantedAt: "2027-02-20T10:15:00",
    comment: "Zahlungsziel verlängert, Partner hat nach der Erinnerung bezahlt.",
  }),
  demoInvoice("gartner-jan", "fee-2027-01-gartner", "gartner", 3000, "2027-01", "2027-01-31", {
    dueDate: "2027-02-28",
    grantedAt: "2027-01-25T09:40:00",
    comment: "Zahlungsziel um einen Monat verlängert.",
  }),
  demoInvoice("caleb-jan", "fee-2027-01-caleb", "caleb", 120, "2027-01", "2027-01-31", {
    dueDate: "2027-04-30",
    grantedAt: "2027-02-03T14:05:00",
    comment: "Neues Zahlungsziel nach Rücksprache mit dem Partner.",
  }),
  demoInvoice("charlotte-feb", "fee-2027-02-charlotte", "charlotte", 120, "2027-02", "2027-02-28", {
    credit: 40,
    dueDate: "2027-04-15",
    grantedAt: "2027-03-05T11:20:00",
    comment: "Teilgutschrift und neues Zahlungsziel vereinbart.",
  }),
  demoInvoice("hofer-mar", "fee-2027-03-hofer", "hofer", 2000, "2027-03", "2027-04-15", {
    dueDate: "2027-05-15",
    grantedAt: "2027-03-18T16:00:00",
    comment: "Zahlungsziel auf Wunsch verschoben.",
  }),
  demoInvoice("hofer-feb", "fee-2027-02-hofer", "hofer", 2000, "2027-02", "2027-02-28", {
    credit: 100,
    dueDate: "2027-03-31",
    grantedAt: "2027-03-02T10:00:00",
    comment: "Gutschrift und Zahlungsziel angepasst, danach bezahlt.",
  }),
];

export function createSeedState(testMode = false): HonorarState {
  const changedDue = new Map(demoSingleInvoices.map((invoice) => [invoice.feeId, invoice.dueDate]));
  return {
    today: TODAY,
    role: "backoffice",
    testMode,
    months: months(),
    partners: partners.map((partner) => ({ ...partner })),
    fees: [...olderUnpaidFees.map((fee) => ({ ...fee })), ...marchFees.map((fee) => ({ ...fee })), ...aprilFees()].map(
      (fee) => {
        const due = changedDue.get(fee.id);
        if (!due) return fee;
        // A new due date in the future means the fee is no longer overdue.
        const status = fee.paymentStatus === "unpaid" && due >= TODAY ? ("open_before_due" as const) : fee.paymentStatus;
        return { ...fee, dueDate: due, paymentStatus: status };
      },
    ),
    openItems: [{ ...februaryOpenItem }],
    corrections: [],
    singleInvoices: demoSingleInvoices.map((invoice) => ({ ...invoice })),
    history: history.map((entry) => ({ ...entry })),
    notices: [],
    checklist: { count: false, sum: false, banks: false },
    carrierTicks: {},
  };
}
