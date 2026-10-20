import { CONTACT_PARTNERS } from "./stammdaten";

/** Rolle on a Person+Gesellschaft link - free text, e.g. Geschäftsführung or CEO. */
export type CompanyRole = string;

export const COMPANY_ROLES: CompanyRole[] = [
  "CEO",
  "CFO",
  "Geschäftsführung",
  "Prokura",
  "Aufsichtsrat",
  "Ansprechperson",
];

/** A business partner (Unternehmen) in the CRM. Lunixo AG, Holding, and Immobilien are openable files. */
export type CompanyRecord = {
  id: string;
  name: string;
  city: string;
  fn?: string;
};

/**
 * Every business partner the Konzernstruktur page can reference. Lunixo AG, Lunixo Holding,
 * and Lunixo Immobilien GmbH each have an openable file.
 */
export const COMPANY_DIRECTORY: CompanyRecord[] = [
  { id: "lunixo", name: "Lunixo AG", city: "Salzburg", fn: "232312" },
  { id: "lunixo-holding", name: "Lunixo Holding", city: "Salzburg", fn: "63241" },
  { id: "lunixo-immobilien", name: "Lunixo Immobilien GmbH", city: "Linz" },
  { id: "alpine-cover", name: "Alpine Cover AG", city: "Innsbruck", fn: "441208" },
  { id: "sommer", name: "Sommer GmbH", city: "Wels", fn: "318902" },
  { id: "winter-holding", name: "Winter Holding GmbH", city: "Wien", fn: "120447" },
];

const LEGAL_FORM = /\s+(AG|GmbH|KG|OG|SE)\.?$/i;

/** Firmenbuch line when we have an FN, otherwise the city. */
export function companyMetaLine(company?: CompanyRecord) {
  if (!company) return "-";
  const seeded = COMPANY_DIRECTORY.find((entry) => entry.id === company.id);
  const fn = company.fn || seeded?.fn;
  if (fn) return `FN ${fn}`;
  return company.city || seeded?.city || "-";
}

/** Drops the trailing legal form, e.g. "Lunixo Immobilien GmbH" -> "Lunixo Immobilien". */
export function companyShortName(name: string) {
  return name.replace(LEGAL_FORM, "").trim() || name;
}

/** Initials for the icon tile, e.g. "Alpina Holding AG" -> "AH", "Lunixo AG" -> "LU". */
export function companyInitials(name: string) {
  const words = companyShortName(name).split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "").slice(0, 2).toUpperCase();
}

export function personInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return (words[0] ?? "").slice(0, 2).toUpperCase();
}

/** The people pool the Konzernstruktur page can link - every contact already known to the CRM. */
export const COMPANY_CONTACTS: string[] = CONTACT_PARTNERS;
