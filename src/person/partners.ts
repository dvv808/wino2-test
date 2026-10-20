export type PartnerId =
  | "julia"
  | "ashley"
  | "karl"
  | "johanna"
  | "ash"
  | "marcus"
  | "sophie"
  | "lunixo"
  | "lunixo-holding"
  | "lunixo-immobilien";
export type PartnerKind = "interessent" | "kunde" | "einfach";
/** Privatperson files are "person"; business partners (not linkable into a family yet) are "company". */
export type FileKind = "person" | "company";

export type FileContact = {
  kind: "phone" | "mail";
  caption: string;
  value: string;
};

export type FilePartner = {
  id: PartnerId;
  slug: string;
  name: string;
  born?: string;
  address?: [string, string];
  fileId: string;
  phone?: string;
  email?: string;
  info?: string;
  contacts: FileContact[];
  moreContacts: number;
  /** Set for the family members; Julia and Ashley derive it from the file state. */
  kind?: PartnerKind;
  /** Defaults to "person"; set to "company" for business partners like Lunixo AG. */
  fileKind?: FileKind;
  /** Firmenbuchnummer, shown for company files. */
  fn?: string;
  website?: string;
};

export const JULIA: FilePartner = {
  id: "julia",
  slug: "julia-atkinson",
  name: "Julia Atkinson",
  born: "12.09.1988",
  address: ["Mondseestrasse 32", "A-5310 Mondsee"],
  fileId: "2813",
  phone: "+43 3810 393 112 3",
  email: "julia.atkinson@mail.at",
  info: "Julia ist auch noch Geschäftsführerin der Lunixo AG.",
  contacts: [
    { kind: "phone", caption: "Mobil Privat", value: "+43 3810 393 112 3" },
    { kind: "mail", caption: "Mail Privat", value: "julia.atkinson@mail.at" },
  ],
  moreContacts: 1,
};

export const ASHLEY: FilePartner = {
  id: "ashley",
  slug: "ashley-johnson",
  name: "Ashley Johnson",
  fileId: "3041",
  contacts: [],
  moreContacts: 0,
};

function familyPartner(
  id: PartnerId,
  slug: string,
  name: string,
  born: string,
  fileId: string,
  kind: PartnerKind,
): FilePartner {
  return { id, slug, name, born, fileId, kind, contacts: [], moreContacts: 0 };
}

export const KARL = familyPartner("karl", "karl-atkinson", "Karl Atkinson", "12.09.1965", "3112", "interessent");
export const JOHANNA = familyPartner("johanna", "johanna-atkinson", "Johanna Atkinson", "03.10.1964", "3113", "kunde");
export const ASH = familyPartner("ash", "ash-atkinson", "Ash Atkinson", "22.11.2014", "3114", "einfach");
export const MARCUS = familyPartner(
  "marcus",
  "marcus-atkinson-sullivan",
  "Marcus Atkinson-Sullivan",
  "13.11.1994",
  "3115",
  "interessent",
);
export const SOPHIE = familyPartner("sophie", "sophie-lang", "Sophie Lang", "15.04.1990", "3116", "einfach");

export const LUNIXO: FilePartner = {
  id: "lunixo",
  slug: "lunixo-ag",
  name: "Lunixo AG",
  fileId: "4001",
  fileKind: "company",
  kind: "interessent",
  fn: "232312",
  website: "www.lunixo.com",
  contacts: [],
  moreContacts: 0,
};

export const LUNIXO_HOLDING: FilePartner = {
  id: "lunixo-holding",
  slug: "lunixo-holding",
  name: "Lunixo Holding",
  fileId: "4002",
  fileKind: "company",
  kind: "interessent",
  fn: "63241",
  address: ["", "Salzburg"],
  contacts: [],
  moreContacts: 0,
};

export const LUNIXO_IMMOBILIEN: FilePartner = {
  id: "lunixo-immobilien",
  slug: "lunixo-immobilien-gmbh",
  name: "Lunixo Immobilien GmbH",
  fileId: "4003",
  fileKind: "company",
  kind: "interessent",
  address: ["", "Linz"],
  contacts: [],
  moreContacts: 0,
};

export const FILE_PARTNERS: Record<PartnerId, FilePartner> = {
  julia: JULIA,
  ashley: ASHLEY,
  karl: KARL,
  johanna: JOHANNA,
  ash: ASH,
  marcus: MARCUS,
  sophie: SOPHIE,
  lunixo: LUNIXO,
  "lunixo-holding": LUNIXO_HOLDING,
  "lunixo-immobilien": LUNIXO_IMMOBILIEN,
};

export const PARTNER_BY_SLUG = new Map<string, PartnerId>(
  Object.values(FILE_PARTNERS).map((partner) => [partner.slug, partner.id]),
);

export function kindLabel(kind: PartnerKind) {
  return kind === "interessent" ? "Interessent" : "";
}
