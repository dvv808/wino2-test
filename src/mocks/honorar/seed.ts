import * as a from "../../assets/index";
import { addDays, aliquotSingle, servicePeriod } from "../../lib/honorar/format";
import type { Fee, HistoryEntry, HonorarNotice, HonorarState, InvoiceCorrection, Month, OpenItem, Partner, SingleInvoice } from "../../types/honorar";

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
    advisor: k % 2 === 0 ? PEOPLE.mike : k % 4 === 1 ? PEOPLE.sandra : PEOPLE.lucy,
    department: "Beratung & Service",
    photo: company ? (k % 2 === 0 ? a.companyBlank : a.clientBlank) : PERSON_PHOTOS[k % PERSON_PHOTOS.length],
  };
}

const generatedPartners: Partner[] = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap((month) =>
  Array.from({ length: 9 }, (_, slot) => generatedPartner(month, slot)),
);

/**
 * Szenarien-Matrix (Status zu Rechnungen): every case of the sheet is a partner of its own in March, because a
 * Kunde or company can only appear once in the table. The existing March partners cover the SEPA cases
 * (Ava: Info an Berater ausständig, Charlotte: erfolgreich), Caleb (Überweisung korrekt) and Gavin (Erinnerung, keine Überweisung).
 */
type Scenario = {
  id: string;
  /** What the sheet row says. */
  label: string;
  company?: boolean;
  method: Fee["paymentMethod"];
  paid?: number;
  status: Fee["paymentStatus"];
  /** Before the Zahlungsziel (15.04.) instead of already past it (31.03.). */
  beforeDue?: boolean;
  advisorNotice?: boolean;
  /** An Einzelfaktura exists for this invoice (booked workflow, or created from Offene Posten). */
  singleInvoice?: Partial<SingleInvoice>;
  extras?: Partial<Fee>;
};

const REMINDER = "2027-04-01T08:00:00";

/** A Rechnungskorrektur workflow of an invoice, at the given step. Antrag by the Kundenberater, Freigabe by the Bestandsmanager, Verbuchung by the Honorarverwalter. */
function workflowOf(
  workflow: InvoiceCorrection["workflow"],
  kind: InvoiceCorrection["kind"],
  status: InvoiceCorrection["status"],
  extra: Partial<InvoiceCorrection> = {},
): InvoiceCorrection {
  const requested = status !== "entwurf";
  const decided = status === "freigegeben" || status === "verbucht";
  return {
    workflow,
    kind,
    status,
    startedBy: PEOPLE.lucy,
    startedAt: "2027-04-01T09:00:00",
    reason: "Kunde hat Leistung nicht wie vereinbart erhalten.",
    ...(requested ? { requestedBy: PEOPLE.mike, requestedAt: "2027-04-01T09:30:00" } : {}),
    ...(decided ? { decidedBy: PEOPLE.thomas, decidedAt: "2027-04-01T10:15:00", decisionComment: "Passt, freigegeben." } : {}),
    ...(status === "verbucht" ? { bookedBy: PEOPLE.lucy, bookedAt: "2027-04-01T11:00:00" } : {}),
    ...extra,
  };
}

const SCENARIOS: Scenario[] = [
  { id: "s01", label: "01.-05.: Daten erfasst, kein Datenträger erstellt", method: "Rechnung", status: "open_before_due", beforeDue: true, extras: { invoiceStatus: "not_created", sentAt: undefined, sentTo: undefined } },
  { id: "s02", label: "01.-05.: Daten erfasst, Datenträger erstellt (SEPA)", method: "Abbucher", status: "open_before_due", beforeDue: true, extras: { invoiceStatus: "not_created", sentAt: undefined, sentTo: undefined } },
  { id: "s03", label: "01.-05.: Datenträger in BMD geladen", method: "Rechnung", company: true, status: "open_before_due", beforeDue: true, extras: { invoiceStatus: "not_created", sentAt: undefined, sentTo: undefined } },
  { id: "s04", label: "01.-05.: Datenträger in BMD geladen, Daten im wino vorhanden", method: "Rechnung", status: "open_before_due", beforeDue: true, extras: { invoiceStatus: "created", sentAt: undefined, sentTo: undefined } },
  { id: "s05", label: "Rechnung per Mail verschickt, erfolgreich", method: "Rechnung", status: "open_before_due", beforeDue: true },
  { id: "s06", label: "Rechnung per Mail verschickt, nicht erfolgreich (Post)", method: "Rechnung", status: "open_before_due", beforeDue: true, extras: { invoiceStatus: "send_failed" } },
  { id: "s07", label: "SEPA: Abbucher noch nicht durchgeführt", method: "Abbucher", status: "open_before_due", beforeDue: true, extras: { invoiceStatus: "created", sentAt: undefined } },
  { id: "s10", label: "SEPA: Abbucher nicht erfolgreich, Info an Kundenberater ergangen", method: "Abbucher", status: "unpaid", advisorNotice: true, extras: { correction: workflowOf("Gutschrift", "Vollgutschrift", "entwurf"), paymentReason: "direct_debit_failed" } },
  { id: "s12", label: "Überweisung: keine Überweisung, Zahlungsziel noch nicht überschritten", method: "Rechnung", company: true, status: "open_before_due", beforeDue: true },
  { id: "s13", label: "Überweisung vor ZZ: Betrag zu niedrig", method: "Rechnung", paid: 700, status: "open_before_due", beforeDue: true, singleInvoice: { amount: 300, kind: "Zahlung korrigieren", status: "open" } },
  { id: "s14", label: "Überweisung vor ZZ: Betrag zu hoch", method: "Rechnung", paid: 1050, status: "open_before_due", beforeDue: true },
  { id: "s15", label: "Nach ZZ, keine Erinnerung: keine Überweisung", method: "Rechnung", status: "unpaid", extras: { correction: workflowOf("Gutschrift", "Vollgutschrift", "beantragt"), paymentReason: "due_date_exceeded" } },
  { id: "s16", label: "Nach ZZ, keine Erinnerung: Betrag zu niedrig", method: "Rechnung", paid: 400, status: "unpaid", extras: { correction: workflowOf("Zahlungsziel anpassen", "Zahlungsziel ändern", "freigegeben", { dueDate: "2027-05-15" }), paymentReason: "amount_mismatch" } },
  { id: "s17", label: "Nach ZZ, keine Erinnerung: Betrag zu hoch", method: "Rechnung", company: true, paid: 2000, status: "paid" },
  { id: "s18", label: "Nach ZZ, keine Erinnerung: Überweisung korrekt", method: "Rechnung", paid: 1000, status: "paid", extras: { paidAt: "2027-04-08" } },
  { id: "s20", label: "Mit Erinnerung, Berater ohne Notification: Betrag zu niedrig", method: "Rechnung", paid: 600, status: "unpaid", extras: { correction: workflowOf("Doch bezahlt markieren", "Doch bezahlt", "entwurf"), paymentReason: "amount_mismatch", reminderSentAt: REMINDER } },
  { id: "s21", label: "Mit Erinnerung, Berater ohne Notification: Betrag zu hoch", method: "Rechnung", company: true, paid: 1400, status: "paid", extras: { reminderSentAt: REMINDER } },
  { id: "s22", label: "Mit Erinnerung, Berater ohne Notification: Überweisung korrekt", method: "Rechnung", paid: 1000, status: "paid", extras: { reminderSentAt: REMINDER, paidLate: "reminder" } },
  { id: "s23", label: "Mit Erinnerung und Notification: keine Überweisung", method: "Rechnung", status: "unpaid", advisorNotice: true, extras: { correction: workflowOf("Gutschrift", "Teilgutschrift", "beantragt", { amount: 300 }), paymentReason: "due_date_exceeded", reminderSentAt: REMINDER } },
  { id: "s24", label: "Mit Erinnerung und Notification: Betrag zu niedrig", method: "Rechnung", paid: 800, status: "unpaid", advisorNotice: true, extras: { correction: workflowOf("Rechnungskorrektur", "Teilgutschrift", "abgelehnt", { amount: 100, ...{ decidedBy: PEOPLE.thomas, decidedAt: "2027-04-01T10:15:00", decisionComment: "Bitte Begründung ergänzen und Betrag prüfen." } }), paymentReason: "amount_mismatch", reminderSentAt: REMINDER } },
  { id: "s25", label: "Mit Erinnerung und Notification: Betrag zu hoch", method: "Rechnung", company: true, paid: 10000, status: "paid", advisorNotice: true, extras: { reminderSentAt: REMINDER } },
  { id: "s26", label: "Mit Erinnerung und Notification: Überweisung korrekt", method: "Rechnung", paid: 1000, status: "paid", advisorNotice: true, extras: { reminderSentAt: REMINDER, paidLate: "reminder" } },

  // Abgeschlossene Workflows (verbucht): every workflow type once, with the result the booking leaves behind.
  { id: "d1", label: "Workflow Gutschrift (Teilgutschrift) verbucht", method: "Rechnung", status: "unpaid", extras: { paymentReason: "due_date_exceeded", correction: workflowOf("Gutschrift", "Teilgutschrift", "verbucht", { amount: 300 }) }, singleInvoice: { status: "sent_to_bmd", credit: 300, comment: "Kunde hat Leistung nicht wie vereinbart erhalten.", grantedAt: "2027-04-01T11:00:00", grantedBy: PEOPLE.lucy } },
  { id: "d2", label: "Workflow Gutschrift (Vollgutschrift) verbucht", method: "Rechnung", company: true, status: "paid", extras: { correction: workflowOf("Gutschrift", "Vollgutschrift", "verbucht", { amount: 1000 }) }, singleInvoice: { status: "sent_to_bmd", credit: 1000, comment: "Kunde hat Leistung nicht wie vereinbart erhalten.", grantedAt: "2027-04-01T11:00:00", grantedBy: PEOPLE.lucy } },
  { id: "d3", label: "Workflow Zahlungsziel anpassen verbucht", method: "Rechnung", status: "open_before_due", beforeDue: true, extras: { dueDate: "2027-05-15", correction: workflowOf("Zahlungsziel anpassen", "Zahlungsziel ändern", "verbucht", { dueDate: "2027-05-15" }) }, singleInvoice: { status: "sent_to_bmd", dueDate: "2027-05-15", dueDateOriginal: "2027-03-31", comment: "Kunde hat Leistung nicht wie vereinbart erhalten.", grantedAt: "2027-04-01T11:00:00", grantedBy: PEOPLE.lucy } },
  { id: "d4", label: "Workflow Doch bezahlt markieren verbucht", method: "Rechnung", paid: 1000, status: "paid", extras: { paidAt: "2027-04-01", paidLate: "two_months", correction: workflowOf("Doch bezahlt markieren", "Doch bezahlt", "verbucht") } },
  { id: "d5", label: "Workflow Rechnungskorrektur verbucht, EF wartet auf Übergabe an BMD", method: "Rechnung", company: true, status: "unpaid", extras: { paymentReason: "due_date_exceeded", correction: workflowOf("Rechnungskorrektur", "Teilgutschrift", "verbucht", { amount: 150 }) }, singleInvoice: { status: "open", credit: 150, comment: "Kunde hat Leistung nicht wie vereinbart erhalten.", grantedAt: "2027-04-01T11:00:00", grantedBy: PEOPLE.lucy } },

  // Weitere laufende Workflows auf offenen Posten: jede Korrekturart in jedem Schritt (Antrag, Freigabe, Verbuchung).
  { id: "w1", label: "Workflow Gutschrift (Teilgutschrift), Verbuchung offen", method: "Rechnung", status: "unpaid", extras: { paymentReason: "due_date_exceeded", correction: workflowOf("Gutschrift", "Teilgutschrift", "freigegeben", { amount: 250 }) } },
  { id: "w2", label: "Workflow Gutschrift (Vollgutschrift), Verbuchung offen", method: "Rechnung", company: true, status: "unpaid", extras: { paymentReason: "due_date_exceeded", correction: workflowOf("Gutschrift", "Vollgutschrift", "freigegeben") } },
  { id: "w3", label: "Workflow Zahlungsziel anpassen, Antrag offen", method: "Rechnung", status: "unpaid", extras: { paymentReason: "due_date_exceeded", correction: workflowOf("Zahlungsziel anpassen", "Zahlungsziel ändern", "entwurf") } },
  { id: "w4", label: "Workflow Doch bezahlt markieren, Freigabe offen", method: "Rechnung", status: "unpaid", extras: { paymentReason: "due_date_exceeded", correction: workflowOf("Doch bezahlt markieren", "Doch bezahlt", "beantragt") } },
  { id: "w5", label: "Workflow Rechnungskorrektur (Zahlungsziel), abgelehnt", method: "Rechnung", company: true, status: "unpaid", extras: { paymentReason: "due_date_exceeded", correction: workflowOf("Rechnungskorrektur", "Zahlungsziel ändern", "abgelehnt", { dueDate: "2027-05-31", decidedBy: PEOPLE.thomas, decidedAt: "2027-04-01T10:15:00", decisionComment: "Bitte Begründung ergänzen und Betrag prüfen." }) } },
];

/** Names continue after the generated months (person 72+, company 36+), so nobody appears twice. */
function scenarioPartner(scenario: Scenario, index: number): Partner {
  const company = Boolean(scenario.company);
  const companyNo = 36 + SCENARIOS.slice(0, index).filter((entry) => entry.company).length;
  const personNo = 72 + SCENARIOS.slice(0, index).filter((entry) => !entry.company).length;
  const name = company
    ? `${COMPANY_STEMS[companyNo % COMPANY_STEMS.length]} ${COMPANY_FORMS[companyNo % COMPANY_FORMS.length]}`
    : `${FIRST_NAMES[personNo % FIRST_NAMES.length]} ${LAST_NAMES[(personNo * 7 + 3) % LAST_NAMES.length]}`;
  const k = 300 + index;
  const digits = String(1000000000000000 + k * 7919 * 104729).slice(0, 16);
  return {
    id: `m03-${scenario.id}`,
    name,
    ...(company ? {} : { birthDate: `${String(1 + ((k * 5) % 28)).padStart(2, "0")}.${String(1 + ((k * 7) % 12)).padStart(2, "0")}.${1970 + ((k * 3) % 30)}` }),
    type: company ? "company" : "person",
    address: `${STREETS[k % STREETS.length]} ${1 + ((k * 3) % 24)}, 5310 Mondsee`,
    email: company ? `office@${slug(name)}.at` : `${slug(name)}@mail.at`,
    deliveryMethod: "digital",
    bankAccount: `AT${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)} ${digits.slice(10, 14)}`,
    advisor: k % 2 === 0 ? PEOPLE.mike : k % 4 === 1 ? PEOPLE.sandra : PEOPLE.lucy,
    department: "Beratung & Service",
    photo: company ? a.companyBlank : PERSON_PHOTOS[k % PERSON_PHOTOS.length],
  };
}

const scenarioPartners: Partner[] = SCENARIOS.map(scenarioPartner);

export const partners: Partner[] = [...marchPartners, ...scenarioPartners, ...generatedPartners];

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
const marchBaseFees: Fee[] = [
  marchFee("ava", marchSingle, 0, "Abbucher", "Single", "unpaid", { paymentReason: "direct_debit_failed", correction: workflowOf("Rechnungskorrektur", "Teilgutschrift", "entwurf", { amount: 30 }) }),
  marchFee("bella", marchSingle, 20, "Abbucher", "Single", "unpaid", { paymentReason: "amount_mismatch", correction: workflowOf("Doch bezahlt markieren", "Doch bezahlt", "freigegeben") }),
  marchFee("caleb", marchSingle, marchSingle, "Rechnung", "Single", "paid"),
  marchFee("charlotte", marchSingle, marchSingle, "Abbucher", "Single", "paid", { creditAmount: 30 }),
  marchFee("brown", 2000, 2000, "Rechnung", "Business", "paid"),
  marchFee("gavin", marchSingle, 0, "Rechnung", "Single", "unpaid", { paymentReason: "due_date_exceeded", reminderSentAt: "2027-04-10T09:00:00", correction: workflowOf("Zahlungsziel anpassen", "Zahlungsziel ändern", "beantragt", { dueDate: "2027-05-15" }) }),
  marchFee("gartner", 3000, 3000, "Abbucher", "Business", "paid"),
  marchFee("hofer", 2000, 0, "Rechnung", "Business", "open_before_due", { dueDate: "2027-04-15", reminderSentAt: "2027-04-10T09:00:00" }),
];

const scenarioFees: Fee[] = SCENARIOS.map((scenario) =>
  marchFee(`m03-${scenario.id}`, 1000, scenario.paid ?? 0, scenario.method, scenario.company ? "Business" : "Single", scenario.status, {
    ...(scenario.beforeDue ? { dueDate: "2027-04-15" } : {}),
    ...scenario.extras,
  }),
);

/** Advisor messages already sent for the scenarios that say "Notification an Berater versendet". */
const scenarioNotices: HonorarNotice[] = SCENARIOS.filter((scenario) => scenario.advisorNotice).map((scenario) => {
  const partner = partners.find((entry) => entry.id === `m03-${scenario.id}`)!;
  return {
    id: `note-${scenario.id}`,
    kind: "advisor",
    title: `Nachricht an ${partner.advisor}`,
    subject: partner.name,
    text: "Bitte kontaktiere den Kunden.",
    feeId: `fee-2027-03-m03-${scenario.id}`,
    createdAt: "2027-04-01T08:30:00",
    read: true,
  };
});

/** "Überweisung vor ZZ, Betrag zu niedrig": the Einzelfaktura already exists and waits for the Freigabe of the Bestandsmanager. */
const scenarioSingleInvoices: SingleInvoice[] = SCENARIOS.filter((scenario) => scenario.singleInvoice).map((scenario) => ({
  id: `ef-${scenario.id}`,
  correctionId: "",
  partnerId: `m03-${scenario.id}`,
  amount: 1000,
  kind: "Einzelfaktura/Gutschrift",
  status: "open" as const,
  feeId: `fee-2027-03-m03-${scenario.id}`,
  month: "2027-03",
  ...scenario.singleInvoice,
}));

const marchFees: Fee[] = [...marchBaseFees, ...scenarioFees];

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
const demoSingleInvoices: SingleInvoice[] = [...scenarioSingleInvoices];

/** Zahlungseingang for seeded payments: a few days before the due date, or after the reminder / two months when late. */
function seedPaidAt(fee: Fee) {
  if (fee.paidLate === "reminder" && fee.reminderSentAt) return addDays(fee.reminderSentAt.slice(0, 10), 7);
  if (fee.paidLate === "two_months") return addDays(fee.dueDate, 60);
  return addDays(fee.dueDate, -5);
}

export function createSeedState(testMode = false): HonorarState {
  const changedDue = new Map(demoSingleInvoices.map((invoice) => [invoice.feeId, invoice.dueDate]));
  return {
    today: TODAY,
    role: "backoffice",
    testMode,
    months: months(),
    partners: partners.map((partner) => ({ ...partner })),
    fees: [...olderUnpaidFees.map((fee) => ({ ...fee })), ...marchFees.map((fee) => ({ ...fee })), ...aprilFees()].map(
      (seeded) => {
        const fee = seeded.paid > 0 && !seeded.paidAt ? { ...seeded, paidAt: seedPaidAt(seeded) } : seeded;
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
    notices: scenarioNotices.map((notice) => ({ ...notice })),
    checklist: { count: false, sum: false, banks: false },
    carrierTicks: {},
  };
}
