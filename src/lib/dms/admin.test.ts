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
import { addTopFolder, connectionPreview, effectiveRules, linkSource, placesOf, removeVerbindung, setVerbindung, unlinkSource } from "./links";
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
    const state = updateNode(fresh(), "tpl-partner", "p-korrespondenz", { name: "Schriftverkehr" });
    const view = buildView(state, "Verwaltung");
    expect(findFolder(view, ["Partner", "Dr. Maria Gruber", "Schriftverkehr"])!.docs).toHaveLength(1);
    expect(findFolder(view, ["Partner", "Dr. Maria Gruber", "Korrespondenz"])).toBeNull();
  });

  it("adding, moving and removing nodes", () => {
    const added = addChildNode(fresh(), "tpl-partner", "p-root", "Angebote");
    let state = added.state;
    const names = () => findFolder(buildView(state, "Verwaltung"), ["Partner", "Dr. Maria Gruber"])!.children.map((c) => c.name);
    expect(names().at(-1)).toBe("Angebote");
    state = moveNode(state, "tpl-partner", added.nodeId, "up");
    expect(names().at(-2)).toBe("Angebote");
    state = moveNode(state, "tpl-partner", added.nodeId, "in");
    expect(findNode(state.vorlagen.find((v) => v.id === "tpl-partner")!.root, "p-korrespondenz")!.children[0].id).toBe(added.nodeId);
    state = moveNode(state, "tpl-partner", added.nodeId, "out");
    expect(names()).toContain("Angebote");
    state = removeNode(state, "tpl-partner", added.nodeId);
    expect(names()).not.toContain("Angebote");
  });

  it("a filter change moves documents without touching them", () => {
    const state = updateNode(fresh(), "tpl-partner", "p-korrespondenz", { filter: [{ kind: "typ", in: ["korrespondenz", "vollmacht"] }] });
    const view = buildView(state, "Verwaltung");
    const zentral = findFolder(view, ["Partner", "Café Zentral Huber KG", "Korrespondenz"])!;
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
    // Unlink from Korrespondenz, link to Anhänge.
    const unlinked = unlinkSource(base, { source: "kommunikation.email", slot: null }, "p-korrespondenz");
    const { state } = linkSource(unlinked, "tpl-partner", "p-anhaenge", { source: "kommunikation.email", slot: null, dokumenttyp: "anhang" });
    const rule = effectiveRules(state).find((r) => r.source === "kommunikation.email")!;
    expect(rule.targetPath).toBe("Partner/{Partner.Name}/Anhänge");
    const context: UploadContext = { source: "kommunikation.email", entityType: "Partner", entityId: "k-gruber", slot: "", knownMetadata: {} };
    const { state: after, doc, result } = uploadToState(state, { id: "d-mail", file, context, now: NOW });
    const path = ["Partner", "Dr. Maria Gruber", "Anhänge"];
    expect((result as AblageMatch).targetPath).toEqual(path);
    expect(locateDocument(buildView(after, "Verwaltung"), doc.id)).toEqual([path]);
    expect(locateDocument(buildView(after, "Standard"), doc.id)).toEqual([path]);
    // Files from that upload point follow the link (one record, never in two sibling folders).
    const old = base.documents.find((d) => d.name === "E-Mail Rückfrage Rechtsschutz")!;
    expect(locateDocument(buildView(after, "Verwaltung"), old.id)).toEqual([path]);
  });

  it("dropping an upload point on a folder without its entity level creates that level", () => {
    const { state: withTop, vorlageId, nodeId } = addTopFolder(fresh(), ["Verwaltung", "Standard"], "Partnerakten");
    const { state, nodeId: level } = linkSource(withTop, vorlageId, nodeId, { source: "partner.stammdaten.anhang", slot: "anhang" });
    const top = state.vorlagen.find((v) => v.id === vorlageId)!.root;
    expect(top.children.map((c) => c.name)).toEqual(["{Partner.Name}"]);
    expect(level).toBe(top.children[0].id);
    // Then a sub-folder "Partnerdaten Anhänge" under it, linked as well: the deeper folder takes the file.
    const sub = addChildNode(state, vorlageId, level, "Partnerdaten Anhänge");
    const linked = linkSource(sub.state, vorlageId, sub.nodeId, { source: "partner.stammdaten.anhang", slot: "anhang" });
    expect(linked.nodeId).toBe(sub.nodeId);
    const link = { source: "partner.stammdaten.anhang" as const, slot: "anhang" };
    expect(placesOf(linked.state, link).map((p) => p.path.join("/"))).toEqual([
      "Partner/{Partner.Name}/Anhänge",
      "Partnerakten/{Partner.Name}",
      "Partnerakten/{Partner.Name}/Partnerdaten Anhänge",
    ]);
    const lunixo = linked.state.documents.find((d) => d.name === "Firmenbuchauszug Lunixo AG")!;
    // Stored once, shown in both linked places; inside Partnerakten only in the deeper folder.
    expect(locateDocument(buildView(linked.state, "Verwaltung"), lunixo.id)).toEqual([
      ["Partner", "Lunixo AG", "Anhänge"],
      ["Partnerakten", "Lunixo AG", "Partnerdaten Anhänge"],
    ]);
    // Unlinking the old place leaves the new one.
    const only = unlinkSource(linked.state, link, "p-anhaenge");
    expect(locateDocument(buildView(only, "Verwaltung"), lunixo.id)).toEqual([["Partnerakten", "Lunixo AG", "Partnerdaten Anhänge"]]);
    expect(linked.state.documents).toHaveLength(fresh().documents.length);
  });

  it("Ordner verbinden: Global / Fachbereiche shows every insurer's Fachbereiche, merged by name", () => {
    const base = fresh();
    const view = buildView(base, "Verwaltung");
    expect(findFolder(view, ["Versicherungen", "Allianz", "Fachbereiche", "Feuerversicherung", "2026"])!.docs.map((d) => d.name)).toEqual([
      "AVB Feuer Allianz 2026",
    ]);
    const global = findFolder(view, ["Global", "Fachbereiche"])!;
    expect(global.children.map((c) => c.name)).toEqual([
      "Feuerversicherung",
      "Haftpflichtversicherung",
      "Kfz-Versicherung",
      "Rechtsschutzversicherung",
      "Transportversicherung",
    ]);
    expect(global.count).toBe(70);
    // Same records, listed again: Transport 2026 has every insurer but UNIQA.
    expect(findFolder(view, ["Global", "Fachbereiche", "Transportversicherung", "2026"])!.docs).toHaveLength(4);
    expect(base.documents.filter((d) => d.dokumenttyp === "bedingungen")).toHaveLength(70);

    // The preview shows where the folder appears and how often each sub-folder recurs.
    const preview = connectionPreview(base, "vv-fachbereiche");
    expect(preview.instances).toHaveLength(5);
    const transport = preview.tree.find((t) => t.name === "Transportversicherung")!;
    expect(transport.occurrences).toBe(5);
    expect(transport.children.map((c) => `${c.name}:${c.occurrences}`)).toEqual(["2026:4", "2025:5", "2024:5"]);

    // Only Transportversicherung, only 2026.
    const picked = setVerbindung(base, "tpl-global", "gl-fachbereiche", {
      nodeId: "vv-fachbereiche",
      include: ["Transportversicherung", "Transportversicherung/2026"],
    });
    const next = findFolder(buildView(picked, "Verwaltung"), ["Global", "Fachbereiche"])!;
    expect(next.children.map((c) => c.name)).toEqual(["Transportversicherung"]);
    expect(next.children[0].children.map((c) => c.name)).toEqual(["2026"]);
    expect(next.count).toBe(4);
    // Disconnected: empty again.
    const off = removeVerbindung(picked, "tpl-global", "gl-fachbereiche", "vv-fachbereiche");
    expect(findFolder(buildView(off, "Verwaltung"), ["Global", "Fachbereiche"])!.count).toBe(0);
  });

  it("predictLocation tells where a document really shows, so a mismatching target path is visible", () => {
    const state = fresh();
    const where = predictLocation(state, { dokumenttyp: "polizze", links: [{ entityType: "Partner", entityId: "k-gruber" }], meta: { sparte: "Kfz-Versicherung" } });
    expect(where.Verwaltung).toEqual([["Partner", "Dr. Maria Gruber", "Polizzen", "Kfz-Versicherung"]]);
    expect(where.Standard).toEqual(where.Verwaltung);
    const nowhere = predictLocation(state, { dokumenttyp: "polizze", links: [], meta: {} });
    expect(nowhere.Verwaltung).toEqual([]);
  });
});

describe("Eingang", () => {
  it("assigning gives the same record a place; nothing is copied", () => {
    const base = fresh();
    const item = eingang(base)[0];
    const state = assignDokument(base, item.id, { dokumenttyp: "korrespondenz", link: { entityType: "Partner", entityId: "k-hoeller" }, meta: {} });
    expect(state.documents).toHaveLength(base.documents.length);
    expect(eingang(state)).toHaveLength(1);
    expect(locateDocument(buildView(state, "Verwaltung"), item.id)).toEqual([["Partner", "Bäckerei Höller & Söhne OG", "Korrespondenz"]]);
  });

  it("assigning a Schaden also links its Kunde", () => {
    const base = fresh();
    const item = eingang(base)[1];
    const state = assignDokument(base, item.id, { dokumenttyp: "schadendokument", link: { entityType: "Schaden", entityId: "s-0142" }, meta: {} });
    expect(locateDocument(buildView(state, "Verwaltung"), item.id)).toEqual([["Partner", "Transporte Steiner ∕ Wels GmbH", "Schäden", "S-2026-0142"]]);
  });

  it("Quelle verknüpfen: the next upload like it is placed automatically", () => {
    const base = fresh();
    // The e-mail had no Kunde, so no link could place it. With a Kunde the e-mail link places it.
    const context: UploadContext = { source: "kommunikation.email", entityType: "Partner", entityId: "k-zentral", slot: "", knownMetadata: {} };
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

describe("Quellen catalog", () => {
  it("lists every upload point of WINO; none can be added by hand", async () => {
    const { SOURCE_ITEMS, SOURCE_LABEL } = await import("./sources");
    const all = Object.keys(SOURCE_LABEL).filter((s) => s !== "dms.dragdrop");
    expect(new Set(SOURCE_ITEMS.map((s) => s.source))).toEqual(new Set(all));
    // The slots used by the upload points in the app (Stammdaten, Bank, Maklervereinbarung).
    for (const [source, slot] of [
      ["partner.stammdaten.anhang", "anhang"],
      ["partner.stammdaten.anhang", "wirtschaft"],
      ["partner.bank", "bank"],
      ["maklervereinbarung.vertrag", "vertrag"],
    ]) {
      expect(SOURCE_ITEMS.some((s) => s.source === source && s.slot === slot), `${source}#${slot}`).toBe(true);
    }
  });
});
