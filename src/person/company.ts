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

/** A business partner (Unternehmen) in the CRM. Only Lunixo AG has its own openable file so far. */
export type CompanyRecord = {
  id: string;
  name: string;
  city: string;
  fn?: string;
};

/**
 * Every business partner the Konzernstruktur page can reference. Lunixo AG is the company
 * file this prototype can open; Lunixo Holding and Lunixo Immobilien GmbH are CRM-only
 * records (matches the "Lunixo Holding · FN 63241" entry already referenced in Julia's
 * Wirtschaftsdaten).
 */
export const COMPANY_DIRECTORY: CompanyRecord[] = [
  { id: "lunixo", name: "Lunixo AG", city: "Salzburg", fn: "232312" },
  { id: "lunixo-holding", name: "Lunixo Holding", city: "Salzburg", fn: "63241" },
  { id: "lunixo-immobilien", name: "Lunixo Immobilien GmbH", city: "Linz" },
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
