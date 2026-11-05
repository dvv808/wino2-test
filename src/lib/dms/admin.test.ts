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
  ruleFromDokument,
  updateNode,
  upsertRegel,
} from "./admin";
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

describe("Ablageregel change → upload lands elsewhere in both views", () => {
  it("routing an e-mail attachment to Anhänge", () => {
    const base = fresh();
    const rule = base.regeln.find((r) => r.id === "r-email")!;
    const state = upsertRegel(base, { ...rule, dokumenttyp: "anhang", targetPath: "Kunden/{Kunde.Name}/Anhänge" });
    const context: UploadContext = { source: "kommunikation.email", entityType: "Kunde", entityId: "k-gruber", slot: "", knownMetadata: {} };
    const { state: after, doc, result } = uploadToState(state, { id: "d-mail", file, context, now: NOW });
    const path = ["Kunden", "Dr. Maria Gruber", "Anhänge"];
    expect((result as AblageMatch).targetPath).toEqual(path);
    expect(locateDocument(buildView(after, "Verwaltung"), doc.id)).toEqual([path]);
    expect(locateDocument(buildView(after, "Standard"), doc.id)).toEqual([path]);
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

  it("Als Regel speichern: the next upload like it is placed automatically", () => {
    const base = fresh();
    const item = eingang(base)[1]; // dragged onto the DMS root
    const rule = ruleFromDokument(base, item, "anhang", null);
    expect(rule.source).toBe("dms.dragdrop");
    const email = eingang(base)[0];
    const emailRule = ruleFromDokument(base, email, "korrespondenz", "Kunde");
    expect(emailRule.targetPath).toBe("Kunden/{Kunde.Name}/Korrespondenz");
    const state = upsertRegel(base, emailRule);
    const context: UploadContext = { source: "kommunikation.email", entityType: "Kunde", entityId: "k-zentral", slot: "", knownMetadata: {} };
    const result = resolveAblage(context, state.regeln, env(state));
    expect(isUnmatched(result)).toBe(false);
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
