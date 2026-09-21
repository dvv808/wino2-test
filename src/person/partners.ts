export type PartnerId = "julia" | "ashley";
export type PartnerKind = "interessent" | "einfach";

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

export const FILE_PARTNERS: Record<PartnerId, FilePartner> = {
  julia: JULIA,
  ashley: ASHLEY,
};

export const PARTNER_BY_SLUG = new Map<string, PartnerId>(
  Object.values(FILE_PARTNERS).map((partner) => [partner.slug, partner.id]),
);

export function kindLabel(kind: PartnerKind) {
  return kind === "interessent" ? "Interessent" : "";
}
