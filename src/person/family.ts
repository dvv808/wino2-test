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
