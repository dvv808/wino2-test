import { describe, expect, it } from "vitest";
import { createDmsSeed } from "../../mocks/dms/seed";
import type { DmsState, UploadContext } from "../../types/dms";
import {
  addChildNode,
  assignDokument,
  findNode,
  moveNode,
  predictLocation,
  removeNode,
  removeState,
  renameState,
  updateNode,
} from "./admin";
import { addTopFolder, effectiveRules, linkSource, unlinkSource } from "./links";
import { isUnmatched, resolveAblage, type AblageMatch } from "./resolveAblage";
import { uploadToState } from "./upload";
import { buildView, eingang, findFolder, locateDocument } from "./views";
import { applyAllAutoTransitions } from "./workflow";

const fresh = (): DmsState => applyAllAutoTransitions(createDmsSeed());
const file = { name: "Upload.pdf", size: 1024, mime: "application/pdf" };
const NOW = "2026-11-05T10:00:00";
const env = (s: DmsState) => ({ entities: s.entities, dokumenttypen: s.dokumenttypen });

describe("Ordnervorlagen editing", () => {
  it("a renamed node renames the folder in every Kunde instance", () => {
    const state = updateNode(fresh(), "tpl-kunde", "k-korrespondenz", { name: "Schriftverkehr" });
    const view = buildView(state, "Verwaltung");
    expect(findFolder(view, ["Kunden", "Dr. Maria Gruber", "Schriftverkehr"])!.docs).toHaveLength(1);
    expect(findFolder(view, ["Kunden", "Dr. Maria Gruber", "Korrespondenz"])).toBeNull();
  });

  it("adding, moving and removing nodes", () => {
    const added = addChildNode(fresh(), "tpl-kunde", "k-root", "Angebote");
    let state = added.state;
    const names = () => findFolder(buildView(state, "Verwaltung"), ["Kunden", "Dr. Maria Gruber"])!.children.map((c) => c.name);
    expect(names().at(-1)).toBe("Angebote");
    state = moveNode(state, "tpl-kunde", added.nodeId, "up");
    expect(names().at(-2)).toBe("Angebote");
    state = moveNode(state, "tpl-kunde", added.nodeId, "in");
    expect(findNode(state.vorlagen.find((v) => v.id === "tpl-kunde")!.root, "k-korrespondenz")!.children[0].id).toBe(added.nodeId);
    state = moveNode(state, "tpl-kunde", added.nodeId, "out");
    expect(names()).toContain("Angebote");
    state = removeNode(state, "tpl-kunde", added.nodeId);
    expect(names()).not.toContain("Angebote");
  });

  it("a filter change moves documents without touching them", () => {
    const state = updateNode(fresh(), "tpl-kunde", "k-korrespondenz", { filter: [{ kind: "typ", in: ["korrespondenz", "vollmacht"] }] });
    const view = buildView(state, "Verwaltung");
    const zentral = findFolder(view, ["Kunden", "Café Zentral Huber KG", "Korrespondenz"])!;
    expect(zentral.docs.map((d) => d.dokumenttyp)).toContain("vollmacht");
    expect(state.documents).toEqual(fresh().documents);
  });
});

describe("Dokumenttypen editing", () => {
  it("renaming a state carries transitions and documents along", () => {
    const state = renameState(fresh(), "maklervereinbarung", "In Freigabe", "Zur Freigabe");
    const typ = state.dokumenttypen.find((t) => t.id === "maklervereinbarung")!;
    expect(typ.workflow.transitions).toContainEqual({ from: "Zur Freigabe", to: "Aktiv" });
    expect(state.documents.some((d) => d.status === "Zur Freigabe")).toBe(true);
    expect(state.documents.some((d) => d.status === "In Freigabe")).toBe(false);
  });

  it("removing a state drops its transitions and resets documents to the first state", () => {
    const state = removeState(fresh(), "maklervereinbarung", "In Freigabe");
    const typ = state.dokumenttypen.find((t) => t.id === "maklervereinbarung")!;
    expect(typ.workflow.transitions.some((t) => t.from === "In Freigabe" || t.to === "In Freigabe")).toBe(false);
    expect(state.documents.find((d) => d.name === "Maklervereinbarung Ashley Johnson 2027")!.status).toBe("Entwurf");
  });
});

describe("Ordner Zuordnung: moving a link → upload lands elsewhere in both views", () => {
  it("linking the e-mail attachments to Anhänge", () => {
    const base = fresh();
    const { state } = linkSource(base, "tpl-kunde", "k-anhaenge", { source: "kommunikation.email", slot: null, dokumenttyp: "anhang" });
    const rule = effectiveRules(state).find((r) => r.source === "kommunikation.email")!;
    expect(rule.targetPath).toBe("Kunden/{Kunde.Name}/Anhänge");
    const context: UploadContext = { source: "kommunikation.email", entityType: "Kunde", entityId: "k-gruber", slot: "", knownMetadata: {} };
    const { state: after, doc, result } = uploadToState(state, { id: "d-mail", file, context, now: NOW });
    const path = ["Kunden", "Dr. Maria Gruber", "Anhänge"];
    expect((result as AblageMatch).targetPath).toEqual(path);
    expect(locateDocument(buildView(after, "Verwaltung"), doc.id)).toEqual([path]);
    expect(locateDocument(buildView(after, "Standard"), doc.id)).toEqual([path]);
    // Files from that upload point follow the link (one record, never in two sibling folders).
    const old = base.documents.find((d) => d.name === "E-Mail Rückfrage Rechtsschutz")!;
    expect(locateDocument(buildView(after, "Verwaltung"), old.id)).toEqual([path]);
  });

  it("dropping an upload point on a folder without its entity level creates that level", () => {
    const { state: withTop, vorlageId, nodeId } = addTopFolder(fresh(), "Verwaltung", "Partnerakten");
    const { state, nodeId: level } = linkSource(withTop, vorlageId, nodeId, { source: "partner.stammdaten.anhang", slot: "anhang" });
    const top = state.vorlagen.find((v) => v.id === vorlageId)!.root;
    expect(top.children.map((c) => c.name)).toEqual(["{Partner.Name}"]);
    expect(level).toBe(top.children[0].id);
    // Then a sub-folder "Partnerdaten Anhänge" under it, and the link moves there.
    const sub = addChildNode(state, vorlageId, level, "Partnerdaten Anhänge");
    const moved = linkSource(sub.state, vorlageId, sub.nodeId, { source: "partner.stammdaten.anhang", slot: "anhang" });
    expect(moved.nodeId).toBe(sub.nodeId);
    const rule = effectiveRules(moved.state).filter((r) => r.source === "partner.stammdaten.anhang" && r.slot === "anhang");
    expect(rule.map((r) => r.targetPath)).toEqual(["Partnerakten/{Partner.Name}/Partnerdaten Anhänge"]);
    const lunixo = moved.state.documents.find((d) => d.name === "Firmenbuchauszug Lunixo AG")!;
    const view = buildView(moved.state, "Verwaltung");
    expect(locateDocument(view, lunixo.id)).toEqual([["Partnerakten", "Lunixo AG", "Partnerdaten Anhänge"]]);
    // The old Partner/…/Anhänge no longer has it: the link moved.
    expect(findFolder(view, ["Partner", "Lunixo AG", "Anhänge"])!.docs.map((d) => d.id)).not.toContain(lunixo.id);
  });

  it("a folder link takes over the sub-folders of Global / Fachbereiche by name", () => {
    const view = buildView(fresh(), "Verwaltung");
    const allianz = findFolder(view, ["Versicherungen", "Allianz", "Fachbereiche"])!;
    expect(allianz.children.map((c) => c.name)).toEqual(findFolder(view, ["Global", "Fachbereiche"])!.children.map((c) => c.name));
    expect(findFolder(view, ["Versicherungen", "Allianz", "Fachbereiche", "Feuerversicherung", "2026"])!.docs.map((d) => d.name)).toEqual([
      "AVB Feuer Allianz 2026",
    ]);
    // Global / Fachbereiche is the master list of names; the Bedingungen sit where their upload point is linked.
    expect(findFolder(view, ["Global", "Fachbereiche"])!.count).toBe(0);
    // A new Fachbereich in Global appears in every linked folder at once.
    const added = addChildNode(fresh(), "tpl-global", "gl-fachbereiche", "Cyberversicherung");
    const next = buildView(added.state, "Verwaltung");
    expect(findFolder(next, ["Versicherungen", "UNIQA", "Fachbereiche", "Cyberversicherung"])).not.toBeNull();
  });

  it("predictLocation tells where a document really shows, so a mismatching target path is visible", () => {
    const state = fresh();
    const where = predictLocation(state, { dokumenttyp: "polizze", links: [{ entityType: "Kunde", entityId: "k-gruber" }], meta: { sparte: "Kfz-Versicherung" } });
    expect(where.Verwaltung).toEqual([["Kunden", "Dr. Maria Gruber", "Polizzen", "Kfz-Versicherung"]]);
    expect(where.Standard).toEqual(where.Verwaltung);
    const nowhere = predictLocation(state, { dokumenttyp: "polizze", links: [], meta: {} });
    expect(nowhere.Verwaltung).toEqual([]);
  });
});

describe("Eingang", () => {
  it("assigning gives the same record a place; nothing is copied", () => {
    const base = fresh();
    const item = eingang(base)[0];
    const state = assignDokument(base, item.id, { dokumenttyp: "korrespondenz", link: { entityType: "Kunde", entityId: "k-hoeller" }, meta: {} });
    expect(state.documents).toHaveLength(base.documents.length);
    expect(eingang(state)).toHaveLength(1);
    expect(locateDocument(buildView(state, "Verwaltung"), item.id)).toEqual([["Kunden", "Bäckerei Höller & Söhne OG", "Korrespondenz"]]);
  });

  it("assigning a Schaden also links its Kunde", () => {
    const base = fresh();
    const item = eingang(base)[1];
    const state = assignDokument(base, item.id, { dokumenttyp: "schadendokument", link: { entityType: "Schaden", entityId: "s-0142" }, meta: {} });
    expect(locateDocument(buildView(state, "Verwaltung"), item.id)).toEqual([["Kunden", "Transporte Steiner ∕ Wels GmbH", "Schäden", "S-2026-0142"]]);
  });

  it("Quelle verknüpfen: the next upload like it is placed automatically", () => {
    const base = fresh();
    // The e-mail had no Kunde, so no link could place it. With a Kunde the e-mail link places it.
    const context: UploadContext = { source: "kommunikation.email", entityType: "Kunde", entityId: "k-zentral", slot: "", knownMetadata: {} };
    expect(isUnmatched(resolveAblage(context, effectiveRules(base), env(base)))).toBe(false);
    const unlinked = unlinkSource(base, { source: "kommunikation.email", slot: null });
    expect(isUnmatched(resolveAblage(context, effectiveRules(unlinked), env(unlinked)))).toBe(true);
  });

});

describe("Maklervereinbarung cards = DMS records", () => {
  it("cards are grouped by status, and a status change moves the card", async () => {
    const { partnerAgreements } = await import("./agreements");
    const { setStatus } = await import("./workflow");
    const base = fresh();
    const julia = partnerAgreements(base, "julia", "lucy");
    expect(julia.gueltig.map((d) => d.name)).toEqual(["Maklervereinbarung Julia Atkinson 2026"]);
    expect(julia.abgelaufen.map((d) => d.name)).toEqual(["Maklervereinbarung Julia Atkinson 2023"]);
    const lunixo = partnerAgreements(base, "lunixo", "lucy");
    expect(lunixo.entwuerfe).toHaveLength(1);
    const draft = lunixo.entwuerfe[0];
    let state = setStatus(base, draft.id, "In Freigabe");
    state = setStatus(state, draft.id, "Aktiv");
    expect(partnerAgreements(state, "lunixo", "lucy").gueltig.map((d) => d.id)).toEqual([draft.id]);
    // Same record in the DMS view.
    const folder = findFolder(buildView(state, "Verwaltung"), ["Partner", "Lunixo AG", "Vereinbarungen"])!;
    expect(folder.docs.find((d) => d.id === draft.id)?.status).toBe("Aktiv");
  });
});
