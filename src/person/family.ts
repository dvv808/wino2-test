import { FILE_PARTNERS, type PartnerId, type PartnerKind } from "./partners";

/**
 * Verknüpfung links Privatperson files together to form a family. Companies are not
 * linkable yet. Every member is a real partner file that can be opened.
 */
export type FamilyMemberId = PartnerId;
export type FamilyKind = PartnerKind;

export type FamilyInfo = { id: FamilyMemberId; name: string; kind: FamilyKind; born: string };

/** Every Privatperson file in the system; the Verknüpfung partner search lists these. Companies are excluded. */
export const FAMILY_CANDIDATES: FamilyInfo[] = Object.values(FILE_PARTNERS)
  .filter((partner) => partner.fileKind !== "company")
  .map((partner) => familyMember(partner.id));

export function familyMember(id: FamilyMemberId): FamilyInfo {
  const partner = FILE_PARTNERS[id];
  return {
    id,
    name: partner.name,
    kind: partner.kind ?? (id === "julia" ? "interessent" : "einfach"),
    born: partner.born ?? "",
  };
}

export function familyKindLabel(kind: FamilyKind) {
  if (kind === "interessent") return "Interessent";
  if (kind === "kunde") return "Kunde";
  return "Einfache Person";
}

export type FamilyGender = "f" | "m";

const FEMALE_IDS = new Set<FamilyMemberId>(["julia", "johanna", "ashley", "sophie"]);

export function familyGender(id: FamilyMemberId): FamilyGender {
  return FEMALE_IDS.has(id) ? "f" : "m";
}

const RECIPROCAL: Record<string, { f: string; m: string }> = {
  vater: { f: "Tochter", m: "Sohn" },
  mutter: { f: "Tochter", m: "Sohn" },
  sohn: { f: "Mutter", m: "Vater" },
  tochter: { f: "Mutter", m: "Vater" },
  bruder: { f: "Schwester", m: "Bruder" },
  schwester: { f: "Schwester", m: "Bruder" },
  "partner/ehemann": { f: "Partner/Ehefrau", m: "Partner/Ehemann" },
  "partner/ehefrau": { f: "Partner/Ehefrau", m: "Partner/Ehemann" },
  ehemann: { f: "Ehefrau", m: "Ehemann" },
  ehefrau: { f: "Ehefrau", m: "Ehemann" },
  partner: { f: "Partnerin", m: "Partner" },
  partnerin: { f: "Partnerin", m: "Partner" },
  großvater: { f: "Enkelin", m: "Enkel" },
  grossvater: { f: "Enkelin", m: "Enkel" },
  großmutter: { f: "Enkelin", m: "Enkel" },
  grossmutter: { f: "Enkelin", m: "Enkel" },
  enkel: { f: "Großmutter", m: "Großvater" },
  enkelin: { f: "Großmutter", m: "Großvater" },
  onkel: { f: "Nichte", m: "Neffe" },
  tante: { f: "Nichte", m: "Neffe" },
  nichte: { f: "Tante", m: "Onkel" },
  neffe: { f: "Tante", m: "Onkel" },
  schwager: { f: "Schwägerin", m: "Schwager" },
  schwägerin: { f: "Schwägerin", m: "Schwager" },
  schwiegervater: { f: "Schwiegertochter", m: "Schwiegersohn" },
  schwiegermutter: { f: "Schwiegertochter", m: "Schwiegersohn" },
  schwiegertochter: { f: "Schwiegermutter", m: "Schwiegervater" },
  schwiegersohn: { f: "Schwiegermutter", m: "Schwiegervater" },
  cousine: { f: "Cousine", m: "Cousin" },
  cousin: { f: "Cousine", m: "Cousin" },
  freundin: { f: "Freundin", m: "Freund" },
  freund: { f: "Freundin", m: "Freund" },
};

/** What the owner is to the partner, given the label the owner wrote for the partner. */
export function reciprocalFamilyLabel(label: string, ownerGender: FamilyGender) {
  const key = label.trim().toLowerCase().replace(/\s+/g, " ");
  return RECIPROCAL[key]?.[ownerGender] ?? label;
}
