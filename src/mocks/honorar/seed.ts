import * as a from "../../assets/index";
import type { Fee, HistoryEntry, HonorarState, Month, OpenItem, Partner } from "../../types/honorar";

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
  marchFee("charlotte", 120, 120, "Abbucher", "Single", "paid"),
  marchFee("brown", 2000, 2000, "Überweisung", "Business", "paid"),
  marchFee("gavin", 120, 0, "Überweisung", "Single", "unpaid", { paymentReason: "due_date_exceeded" }),
  marchFee("gartner", 3000, 3000, "Abbucher", "Business", "paid"),
  marchFee("hofer", 2000, 0, "Überweisung", "Business", "open_before_due", { dueDate: "2027-04-15" }),
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

export function createSeedState(testMode = false): HonorarState {
  return {
    today: TODAY,
    role: "backoffice",
    testMode,
    months: months(),
    partners: partners.map((partner) => ({ ...partner })),
    fees: [...marchFees.map((fee) => ({ ...fee })), ...aprilFees()],
    openItems: [{ ...februaryOpenItem }],
    corrections: [],
    singleInvoices: [],
    history: history.map((entry) => ({ ...entry })),
    notices: [],
    checklist: { count: false, sum: false, banks: false },
  };
}
