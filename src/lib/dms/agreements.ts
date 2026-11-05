import type { DmsState, Dokument } from "../../types/dms";

export type AgreementSection = "gueltig" | "entwuerfe" | "abgelaufen";

/** Which Maklermandat section a Maklervereinbarung status belongs to. Grey states go to Abgelaufen. */
export function sectionOf(status: string | null): AgreementSection {
  if (status === "Aktiv") return "gueltig";
  if (status === "Abgelaufen" || status === "Gekündigt") return "abgelaufen";
  return "entwuerfe";
}

/**
 * The Maklervereinbarungen of one partner, straight from the DMS records: the cards in the Maklermandat module
 * and the files in the DMS are the same documents, so a status change in either place shows in both.
 */
export function partnerAgreements(state: Pick<DmsState, "documents">, partnerId: string, viewer: string) {
  const sections: Record<AgreementSection, Dokument[]> = { gueltig: [], entwuerfe: [], abgelaufen: [] };
  for (const doc of state.documents) {
    if (doc.dokumenttyp !== "maklervereinbarung") continue;
    if (!doc.links.some((l) => l.entityType === "Partner" && l.entityId === partnerId)) continue;
    if (doc.vertraulich && !doc.vertraulich.includes(viewer)) continue;
    sections[sectionOf(doc.status)].push(doc);
  }
  for (const list of Object.values(sections)) list.sort((x, y) => (y.meta.gueltig_von ?? "").localeCompare(x.meta.gueltig_von ?? ""));
  return sections;
}
