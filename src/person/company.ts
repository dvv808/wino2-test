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
  zip?: string;
  street?: string;
  fn?: string;
};

/** Austria only for now. City lines always carry country code + zip, e.g. A-5020 Salzburg. */
const COUNTRY_CODE = "A";

export function cityNameOnly(city: string) {
  return city.replace(/^[A-Z]{1,3}-\d{4,5}\s+/, "").trim();
}

export function austrianCityLine(city: string, zip?: string) {
  const name = cityNameOnly(city);
  if (!name) return "";
  const digits = (zip ?? city.match(/\d{4,5}/)?.[0] ?? "").replace(/\D/g, "");
  if (!digits) return name;
  return `${COUNTRY_CODE}-${digits} ${name}`;
}

/**
 * Every business partner the Konzernstruktur page can reference. Lunixo AG, Lunixo Holding,
 * and Lunixo Immobilien GmbH each have an openable file.
 */
export const COMPANY_DIRECTORY: CompanyRecord[] = [
  { id: "lunixo", name: "Lunixo AG", city: "Salzburg", zip: "5020", street: "Getreidegasse 12", fn: "232312" },
  { id: "lunixo-holding", name: "Lunixo Holding", city: "Salzburg", zip: "5020", street: "Mirabellplatz 4", fn: "63241" },
  { id: "lunixo-immobilien", name: "Lunixo Immobilien GmbH", city: "Linz", zip: "4020", street: "Hauptplatz 8" },
  { id: "alpine-cover", name: "Alpine Cover AG", city: "Innsbruck", zip: "6020", street: "Maria-Theresien-Straße 18", fn: "441208" },
  { id: "sommer", name: "Sommer GmbH", city: "Wels", zip: "4600", street: "Kaiser-Josef-Platz 3", fn: "318902" },
  { id: "winter-holding", name: "Winter Holding GmbH", city: "Wien", zip: "1010", street: "Kärntner Straße 21", fn: "120447" },
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

/** Street and city for Konzern cards and partner search. */
export function companyAddressLine(company?: CompanyRecord) {
  if (!company) return "";
  const seeded = COMPANY_DIRECTORY.find((entry) => entry.id === company.id) ?? company;
  return [seeded.street, austrianCityLine(seeded.city, seeded.zip)].filter(Boolean).join(", ");
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
