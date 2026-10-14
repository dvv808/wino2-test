import * as a from "../../assets/index";
import { aliquotSingle, servicePeriod } from "../../lib/honorar/format";
import type { Fee, HistoryEntry, HonorarState, Month, OpenItem, Partner, SingleInvoice } from "../../types/honorar";

const YEAR = 2027;
const TODAY = "2027-04-01";

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

const marchPartners: Partner[] = [
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

/**
 * Every month has its own partners: March is hand-written above, all other months get nine generated partners
 * (ids "m01-0" ... "m12-8"), so no person or business shows up in two months.
 * Slots: 0-2 Abbucher persons, 3-5 Rechnung persons, 6 Abbucher business, 7-8 Rechnung businesses.
 */
const FIRST_NAMES = ["Emma", "Noah", "Mia", "Liam", "Sophie", "Lukas", "Hannah", "Jonas", "Lena", "Felix", "Laura", "Paul", "Julia", "David", "Anna", "Tobias", "Katharina", "Florian", "Sarah", "Michael", "Nina", "Stefan", "Eva", "Daniel", "Clara", "Matthias", "Elisa", "Patrick", "Theresa", "Simon", "Valentina"];
const LAST_NAMES = ["Auer", "Brandl", "Dorfer", "Egger", "Fischer", "Gruber", "Hinterberger", "Illmer", "Jäger", "Kainz", "Lechner", "Mayr", "Neuhold", "Oberhauser", "Pichler", "Resch", "Schwaiger", "Trattner", "Url", "Vogl", "Wimmer", "Zehetner", "Aigner", "Bauer", "Eder", "Hofmann", "Moser", "Pirker", "Steiner"];
const COMPANY_STEMS = ["Eder & Söhne", "Kainz Metallbau", "Moser Gastro", "Pichler Tischlerei", "Gruber & Partner", "Wallner Immobilien", "Aigner Elektrotechnik", "Lechner Garten", "Reiter Transporte", "Steiner Druck", "Sommer Reisen", "Haas Bäckerei", "Winkler Sport", "Berger Optik", "Fuchs Weinhandel", "Zauner Fliesen", "Ortner Mode"];
const COMPANY_FORMS = ["GmbH", "OG", "AG"];
const STREETS = ["Mondseestrasse", "Linzerstrasse", "Hauptstrasse", "Seestraße", "Bahnhofstrasse", "Gewerbepark", "Industriestrasse", "Marktplatz", "Kirchengasse", "Salzburgerstrasse"];
const PERSON_PHOTOS = [a.empJasmin, a.partnerBella, a.reqMike, a.empChristine, a.empAlexander];

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generatedPartner(month: number, slot: number): Partner {
  const company = slot >= 6;
  // Running number over all generated partners, so names never repeat between months.
  const k = (month - 1) * 9 + slot;
  const mm = String(month).padStart(2, "0");
  const personNo = (month - 1) * 6 + (slot < 6 ? slot : 0);
  const companyNo = (month - 1) * 3 + (slot - 6);
  const name = company
    ? `${COMPANY_STEMS[companyNo % COMPANY_STEMS.length]} ${COMPANY_FORMS[companyNo % COMPANY_FORMS.length]}`
    : `${FIRST_NAMES[personNo % FIRST_NAMES.length]} ${LAST_NAMES[(personNo * 7 + 3) % LAST_NAMES.length]}`;
  const digits = String(1000000000000000 + k * 7919 * 104729).slice(0, 16);
  return {
    id: `m${mm}-${slot}`,
    name,
    ...(company ? {} : { birthDate: `${String(1 + ((k * 5) % 28)).padStart(2, "0")}.${String(1 + ((k * 7) % 12)).padStart(2, "0")}.${1970 + ((k * 3) % 30)}` }),
    type: company ? "company" : "person",
    address: `${STREETS[k % STREETS.length]} ${1 + ((k * 3) % 24)}, 5310 Mondsee`,
    email: company ? `office@${slug(name)}.at` : `${slug(name)}@mail.at`,
    deliveryMethod: slot === 3 || slot === 7 || slot === 8 ? "print" : "digital",
    bankAccount: `AT${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)} ${digits.slice(10, 14)}`,
    advisor: k % 2 === 0 ? PEOPLE.mike : PEOPLE.sandra,
    department: "Beratung & Service",
    photo: company ? (k % 2 === 0 ? a.companyBlank : a.clientBlank) : PERSON_PHOTOS[k % PERSON_PHOTOS.length],
  };
}

const generatedPartners: Partner[] = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap((month) =>
  Array.from({ length: 9 }, (_, slot) => generatedPartner(month, slot)),
);

export const partners: Partner[] = [...marchPartners, ...generatedPartners];

/** Partners whose address is missing in the capture import of a month (slots 5 and 8, like Gavin and Hofer in March). */
export function incompleteImportIds(monthId: string) {
  const mm = monthId.slice(5, 7);
  return [`m${mm}-5`, `m${mm}-8`];
}

/** The BMD comparison shows deviations for these partners (slots 0 and 7, like Ava and Brown in March). */
export function hasBmdDeviation(partnerId: string) {
  return partnerId === "ava" || partnerId === "brown" || /^m\d\d-(0|7)$/.test(partnerId);
}

const IMPORT_SLOTS: Array<Pick<Fee, "amount" | "tariff" | "paymentMethod">> = [
  { amount: 120, tariff: "Single", paymentMethod: "Abbucher" },
  { amount: 120, tariff: "Single", paymentMethod: "Abbucher" },
  { amount: 120, tariff: "Single", paymentMethod: "Abbucher" },
  { amount: 120, tariff: "Single", paymentMethod: "Rechnung" },
  { amount: 120, tariff: "Single", paymentMethod: "Rechnung" },
  { amount: 120, tariff: "Single", paymentMethod: "Rechnung" },
  { amount: 3000, tariff: "Business", paymentMethod: "Abbucher" },
  { amount: 2000, tariff: "Business", paymentMethod: "Rechnung" },
  { amount: 2000, tariff: "Business", paymentMethod: "Rechnung" },
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
    servicePeriod: servicePeriod("2027-03"),
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

const marchSingle = aliquotSingle("2027-03");
const marchFees: Fee[] = [
  marchFee("ava", marchSingle, 0, "Abbucher", "Single", "unpaid", { paymentReason: "direct_debit_failed" }),
  marchFee("bella", marchSingle, 20, "Abbucher", "Single", "unpaid", { paymentReason: "amount_mismatch" }),
  marchFee("caleb", marchSingle, marchSingle, "Rechnung", "Single", "paid"),
  marchFee("charlotte", marchSingle, marchSingle, "Abbucher", "Single", "paid", { creditAmount: 30 }),
  marchFee("brown", 2000, 2000, "Rechnung", "Business", "paid"),
  marchFee("gavin", marchSingle, 0, "Rechnung", "Single", "unpaid", { paymentReason: "due_date_exceeded", reminderSentAt: "2027-04-10T09:00:00" }),
  marchFee("gartner", 3000, 3000, "Abbucher", "Business", "paid"),
  marchFee("hofer", 2000, 0, "Rechnung", "Business", "open_before_due", { dueDate: "2027-04-15", reminderSentAt: "2027-04-10T09:00:00" }),
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
    servicePeriod: servicePeriod(month),
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

const januarySingle = aliquotSingle("2027-01");
const februarySingle = aliquotSingle("2027-02");
const olderFeesRaw: Fee[] = [
  olderFee("2027-01", "m01-0", januarySingle, 0, "Abbucher", "Single", "direct_debit_failed", { reminderSentAt: "2027-02-12T09:00:00" }),
  olderFee("2027-01", "m01-3", januarySingle, 40, "Rechnung", "Single", "amount_mismatch", { creditAmount: 40 }),
  olderFee("2027-01", "m01-4", januarySingle, 0, "Rechnung", "Single", "due_date_exceeded", { reminderSentAt: "2027-02-12T09:00:00" }),
  olderFee("2027-01", "m01-7", 2000, 0, "Rechnung", "Business", "due_date_exceeded"),
  olderFee("2027-01", "m01-8", 2000, 500, "Rechnung", "Business", "amount_mismatch"),
  olderFee("2027-01", "m01-1", januarySingle, 0, "Abbucher", "Single", "sepa_chargeback"),
  olderFee("2027-02", "m02-0", februarySingle, 0, "Abbucher", "Single", "direct_debit_failed", { reminderSentAt: "2027-03-12T09:00:00" }),
  olderFee("2027-02", "m02-6", 3000, 0, "Abbucher", "Business", "sepa_chargeback"),
  olderFee("2027-02", "m02-4", februarySingle, 0, "Rechnung", "Single", "due_date_exceeded", { creditAmount: 60 }),
  olderFee("2027-01", "m01-5", januarySingle, 0, "Rechnung", "Single", "due_date_exceeded"),
  olderFee("2027-02", "m02-3", februarySingle, 60, "Rechnung", "Single", "amount_mismatch", { reminderSentAt: "2027-03-12T09:00:00" }),
  olderFee("2027-02", "m02-1", februarySingle, 0, "Abbucher", "Single", "direct_debit_failed"),
  paidLateFee("2027-01", "m01-6", 3000, "Abbucher", "Business", "reminder"),
  paidLateFee("2027-02", "m02-7", 2000, "Rechnung", "Business", "reminder"),
  paidLateFee("2027-02", "m02-8", 2000, "Rechnung", "Business", "two_months"),
];

/** January and February are closed: everything that was still open there has been settled late by now. */
const olderUnpaidFees: Fee[] = olderFeesRaw.map((fee) =>
  fee.paymentStatus === "paid"
    ? fee
    : {
        ...fee,
        paid: fee.amount,
        paymentStatus: "paid" as const,
        paymentReason: undefined,
        paidLate: fee.reminderSentAt ? ("reminder" as const) : ("two_months" as const),
      },
);

const februaryOpenItem: OpenItem = {
  id: "op-2027-02-m02-5",
  feeId: "fee-2027-02-m02-5",
  partnerId: "m02-5",
  dueMonth: "2027-02",
  openAmount: februarySingle,
  reason: "due_date_exceeded",
  status: "done",
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

/** Fees of the capture import of a month: that month's own nine partners (see generatedPartner). */
export function createImportFees(monthId: string, now: string): Fee[] {
  const mm = monthId.slice(5, 7);
  const incomplete = incompleteImportIds(monthId);
  const year = Number(monthId.slice(0, 4));
  const last = new Date(year, Number(mm), 0).getDate();
  return IMPORT_SLOTS.map((slot, index) => {
    const partnerId = `m${mm}-${index}`;
    return {
      id: `fee-${monthId}-${partnerId}`,
      partnerId,
      month: monthId,
      servicePeriod: incomplete.includes(partnerId) ? "" : servicePeriod(monthId),
      extraFields: { Thomas: "", Maria: "" },
      ...slot,
      amount: slot.tariff === "Single" ? aliquotSingle(monthId) : slot.amount,
      paid: 0,
      dueDate: `${monthId}-${last}`,
      invoiceStatus: "not_created" as const,
      paymentStatus: "open_before_due" as const,
      createdAt: now,
      createdBy: PEOPLE.lucy,
    };
  });
}

/** April is already half captured when the demo starts (the import of the last slot is still missing). */
function aprilFees(): Fee[] {
  return createImportFees("2027-04", "2026-12-12T12:33:00")
    .slice(0, 8)
    .map((fee) => ({ ...fee, createdBy: PEOPLE.mike }));
}

// Einzelfaktura starts empty: entries only appear once a credit or new due date is granted from Offene Posten.
const demoSingleInvoices: SingleInvoice[] = [];

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
