import { describe, expect, it } from "vitest";
import { createDmsSeed } from "../../mocks/dms/seed";
import type { Ablageregel, DmsState, UploadContext } from "../../types/dms";
import { fillPath, safeSegment } from "./placeholders";
import { isUnmatched, resolveAblage, type AblageMatch } from "./resolveAblage";
import { uploadToState } from "./upload";
import { effectiveRules } from "./links";
import { buildView, eingang, findFolder, locateDocument, walk, type FolderNode } from "./views";
import { applyAllAutoTransitions, applyAutoTransitions, setStatus } from "./workflow";

const fresh = (): DmsState => applyAllAutoTransitions(createDmsSeed());
const env = (state: DmsState) => ({ entities: state.entities, dokumenttypen: state.dokumenttypen });
const ctx = (over: Partial<UploadContext> & Pick<UploadContext, "source">): UploadContext => ({
  entityType: null,
  entityId: null,
  slot: "",
  knownMetadata: {},
  ...over,
});
const matched = (result: ReturnType<typeof resolveAblage>) => {
  expect(isUnmatched(result), JSON.stringify(result)).toBe(false);
  return result as AblageMatch;
};
const file = { name: "Upload.pdf", size: 1024, mime: "application/pdf" };
const NOW = "2026-11-05T10:00:00";

describe("resolveAblage – specificity", () => {
  const base = fresh();
  // Priority above the folder links (10), so this hand-made rule wins at the same specificity.
  const wirtschaft: Ablageregel = {
    id: "r-wirtschaft",
    name: "Partner → Wirtschaftsdaten → Anhang",
    source: "partner.stammdaten.anhang",
    entityType: "Partner",
    slot: "wirtschaft",
    requires: [],
    dokumenttyp: "bankdokument",
    targetPath: "Partner/{Partner.Name}/Anhänge",
    priority: 20,
  };
  const generic: Ablageregel = { ...wirtschaft, id: "r-generic", entityType: null, slot: null, dokumenttyp: "nda", targetPath: "Allgemein" };

  it("the most specific rule wins, regardless of list order", () => {
    const rules = [generic, ...effectiveRules(base), wirtschaft];
    const context = ctx({ source: "partner.stammdaten.anhang", entityType: "Partner", entityId: "lunixo", slot: "wirtschaft" });
    expect(matched(resolveAblage(context, rules, env(base))).rule.id).toBe("r-wirtschaft");
    const other = { ...context, slot: "anhang" };
    expect(matched(resolveAblage(other, rules, env(base))).rule.id).toBe("link:p-anhaenge:partner.stammdaten.anhang:anhang");
    const noEntity = { ...context, entityType: null, entityId: null, slot: "" };
    expect(matched(resolveAblage(noEntity, rules, env(base))).rule.id).toBe("r-generic");
  });

  it("priority breaks a tie, then list order", () => {
    const a = { ...wirtschaft, id: "a", priority: 0 };
    const b = { ...wirtschaft, id: "b", priority: 5 };
    const context = ctx({ source: "partner.stammdaten.anhang", entityType: "Partner", entityId: "julia", slot: "wirtschaft" });
    expect(matched(resolveAblage(context, [a, b], env(base))).rule.id).toBe("b");
    expect(matched(resolveAblage(context, [a, { ...b, id: "c", priority: 0 }], env(base))).rule.id).toBe("a");
  });

  it("an entity rule needs the entity id", () => {
    const context = ctx({ source: "kunde.polizze", entityType: "Kunde", entityId: null, knownMetadata: { sparte: "Kfz-Versicherung" } });
    expect(isUnmatched(resolveAblage(context, effectiveRules(base), env(base)))).toBe(true);
  });
});

describe("resolveAblage – missing fields", () => {
  const base = fresh();

  it("asks only for what the context does not know", () => {
    const polizze = ctx({ source: "kunde.polizze", entityType: "Kunde", entityId: "k-gruber" });
    const open = matched(resolveAblage(polizze, effectiveRules(base), env(base)));
    expect(open.missingFields).toEqual(["sparte"]);
    expect(open.targetPath).toEqual(["Kunden", "Dr. Maria Gruber", "Polizzen", "{Sparte}"]);

    const known = matched(resolveAblage({ ...polizze, knownMetadata: { sparte: "Kfz-Versicherung" } }, effectiveRules(base), env(base)));
    expect(known.missingFields).toEqual([]);
    expect(known.targetPath).toEqual(["Kunden", "Dr. Maria Gruber", "Polizzen", "Kfz-Versicherung"]);
  });

  it("combines rule and Dokumenttyp requirements", () => {
    const mv = ctx({ source: "maklervereinbarung.vertrag", entityType: "Partner", entityId: "julia", slot: "vertrag", knownMetadata: { gueltig_von: "2027-01-01" } });
    expect(matched(resolveAblage(mv, effectiveRules(base), env(base))).missingFields).toEqual(["gueltig_bis"]);
    const bedingungen = ctx({ source: "versicherer.bedingungen", entityType: "Versicherer", entityId: "v-uniqa", knownMetadata: { jahr: 2026 } });
    const result = matched(resolveAblage(bedingungen, effectiveRules(base), env(base)));
    expect(result.missingFields).toEqual(["sparte"]);
    expect(result.targetPath).toEqual(["Versicherungen", "UNIQA", "Fachbereiche", "{Sparte}", "2026"]);
  });

  it("a Schaden upload resolves its Kunde through the parent", () => {
    const schaden = ctx({ source: "schaden.dokumente", entityType: "Schaden", entityId: "s-0142" });
    expect(matched(resolveAblage(schaden, effectiveRules(base), env(base))).targetPath).toEqual([
      "Kunden",
      "Transporte Steiner ∕ Wels GmbH",
      "Schäden",
      "S-2026-0142",
    ]);
  });
});

describe("unmatched → Eingang", () => {
  it("an upload no rule can place is kept in Eingang, never lost", () => {
    const base = fresh();
    const before = eingang(base).length;
    const context = ctx({ source: "kommunikation.email" });
    const { state, doc, result } = uploadToState(base, { id: "d-new", file, context, now: NOW });
    expect(isUnmatched(result)).toBe(true);
    expect(doc.dokumenttyp).toBeNull();
    expect(eingang(state)).toHaveLength(before + 1);
    expect(eingang(state).map((d) => d.id)).toContain("d-new");
    for (const ansicht of ["Verwaltung", "Standard"] as const) {
      expect(locateDocument(buildView(state, ansicht), "d-new")).toEqual([]);
    }
  });

  it("a drop on a folder without a single Dokumenttyp goes to Eingang", () => {
    const base = fresh();
    const kunde = findFolder(buildView(base, "Verwaltung"), ["Kunden", "Dr. Maria Gruber"])!;
    const context = ctx({ source: "dms.dragdrop", folderPath: kunde.path });
    const { doc } = uploadToState(base, { id: "d-drop", file, context, folder: kunde.defaults, now: NOW });
    expect(doc.dokumenttyp).toBeNull();
  });

  it("a drop on a typed folder takes type, links and metadata from the folder", () => {
    const base = fresh();
    const sparte = findFolder(buildView(base, "Verwaltung"), ["Kunden", "Dr. Maria Gruber", "Polizzen", "Kfz-Versicherung"])!;
    const context = ctx({ source: "dms.dragdrop", folderPath: sparte.path });
    const { state, doc } = uploadToState(base, { id: "d-drop", file, context, folder: sparte.defaults, now: NOW });
    expect(doc.dokumenttyp).toBe("polizze");
    expect(doc.meta.sparte).toBe("Kfz-Versicherung");
    expect(doc.links).toContainEqual({ entityType: "Kunde", entityId: "k-gruber" });
    expect(locateDocument(buildView(state, "Verwaltung"), "d-drop")).toEqual([sparte.path]);
  });
});

describe("latest year per insurer", () => {
  const base = fresh();
  const standard = buildView(base, "Standard");
  const verwaltung = buildView(base, "Verwaltung");
  const entries = (folder: FolderNode) =>
    folder.docs.map((doc) => ({
      insurer: base.entities.find((e) => e.id === doc.links.find((l) => l.entityType === "Versicherer")?.entityId)?.name,
      jahr: doc.meta.jahr,
      stale: folder.staleIds.includes(doc.id),
    }));

  it("shows one entry per insurer with its newest year, older years only in Verwaltung", () => {
    const transport = findFolder(standard, ["Unternehmen", "Versicherer", "Transportversicherung"])!;
    expect(entries(transport)).toEqual(
      expect.arrayContaining([
        { insurer: "UNIQA", jahr: 2025, stale: true },
        { insurer: "Allianz", jahr: 2026, stale: false },
      ]),
    );
    expect(entries(transport)).toHaveLength(5);
    const uniqa = findFolder(verwaltung, ["Versicherungen", "UNIQA", "Fachbereiche", "Transportversicherung"])!;
    expect(uniqa.children.map((c) => c.name)).toEqual(["2025", "2024"]);
  });

  it("never hides an insurer, and a gap in the middle does not matter", () => {
    const feuer = entries(findFolder(standard, ["Unternehmen", "Versicherer", "Feuerversicherung"])!);
    expect(feuer.find((e) => e.insurer === "Donau")).toEqual({ insurer: "Donau", jahr: 2024, stale: true });
    const kfz = entries(findFolder(standard, ["Unternehmen", "Versicherer", "Kfz-Versicherung"])!);
    expect(kfz.find((e) => e.insurer === "Allianz")).toEqual({ insurer: "Allianz", jahr: 2026, stale: false });
    const allianzKfz = findFolder(verwaltung, ["Versicherungen", "Allianz", "Fachbereiche", "Kfz-Versicherung"])!;
    expect(allianzKfz.children.map((c) => c.name)).toEqual(["2026", "2024"]);
  });

  it("older years stay out of Standard completely, also from the parent folders", () => {
    const versicherer = findFolder(standard, ["Unternehmen", "Versicherer"])!;
    expect(versicherer.docs).toEqual([]);
    expect(versicherer.count).toBe(25);
    expect(findFolder(standard, ["Unternehmen"])!.count).toBe(25);
  });

  it("Standard has no year folders", () => {
    let years = 0;
    walk(standard, (f) => (years += /^\d{4}$/.test(f.name) ? 1 : 0));
    expect(years).toBe(0);
  });
});

describe("placeholders with special characters", () => {
  it("keeps umlauts and & and turns a slash into one segment", () => {
    expect(safeSegment("Bäckerei Höller & Söhne OG")).toBe("Bäckerei Höller & Söhne OG");
    expect(safeSegment("Transporte Steiner / Wels GmbH")).toBe("Transporte Steiner ∕ Wels GmbH");
    const { path, missing } = fillPath("Kunden/{Kunde.Name}/Polizzen/{Sparte}", {
      "Kunde.Name": "Transporte Steiner / Wels GmbH",
      Sparte: "Kfz-Versicherung",
    });
    expect(path).toEqual(["Kunden", "Transporte Steiner ∕ Wels GmbH", "Polizzen", "Kfz-Versicherung"]);
    expect(missing).toEqual([]);
  });

  it("resolved target and view folder are the same path", () => {
    const base = fresh();
    for (const kunde of ["k-hoeller", "k-steiner"]) {
      const context = ctx({ source: "kunde.polizze", entityType: "Kunde", entityId: kunde, knownMetadata: { sparte: "Feuerversicherung" } });
      const { state, doc, result } = uploadToState(base, { id: `d-${kunde}`, file, context, now: NOW });
      const target = matched(result).targetPath;
      expect(locateDocument(buildView(state, "Verwaltung"), doc.id)).toEqual([target]);
      expect(locateDocument(buildView(state, "Standard"), doc.id)).toEqual([target]);
    }
  });

  it("every Kunde gets its folder tree automatically, even without documents", () => {
    const view = buildView(fresh(), "Verwaltung");
    const kunden = findFolder(view, ["Kunden"])!;
    expect(kunden.children.map((c) => c.name)).toEqual([
      "Bäckerei Höller & Söhne OG",
      "Café Zentral Huber KG",
      "Dr. Maria Gruber",
      "Transporte Steiner ∕ Wels GmbH",
    ]);
    for (const k of kunden.children) {
      expect(k.children.map((c) => c.name)).toEqual(["Polizzen", "Schäden", "Vollmachten & Verträge", "Korrespondenz", "Anhänge"]);
    }
  });
});

describe("automatic Abgelaufen", () => {
  it("expires an Aktiv agreement once gueltig_bis lies before today", () => {
    const state = fresh();
    const status = (name: string) => state.documents.find((d) => d.name === `Maklervereinbarung ${name}`)?.status;
    expect(status("Julia Atkinson 2023")).toBe("Abgelaufen");
    expect(status("Julia Atkinson 2026")).toBe("Aktiv");
    expect(status("Ashley Johnson 2022")).toBe("Gekündigt");
    expect(status("Ashley Johnson 2027")).toBe("In Freigabe");
  });

  it("does not expire on the last valid day", () => {
    const state = fresh();
    const typ = state.dokumenttypen.find((t) => t.id === "maklervereinbarung");
    const doc = { ...state.documents[0], status: "Aktiv", meta: { gueltig_von: "2026-01-01", gueltig_bis: state.today } };
    expect(applyAutoTransitions(doc, typ, state.today).status).toBe("Aktiv");
    expect(applyAutoTransitions(doc, typ, "2026-11-06").status).toBe("Abgelaufen");
  });

  it("hand transitions follow the workflow and keep one record", () => {
    const state = fresh();
    const draft = state.documents.find((d) => d.name === "Maklervereinbarung Lunixo AG 2027")!;
    expect(setStatus(state, draft.id, "Aktiv")).toBe(state); // Entwurf → Aktiv is not allowed
    const next = setStatus(state, draft.id, "In Freigabe");
    expect(next.documents.find((d) => d.id === draft.id)?.status).toBe("In Freigabe");
    expect(next.documents).toHaveLength(state.documents.length);
  });

  it("an uploaded agreement starts as Entwurf, or expired if its end already passed", () => {
    const base = fresh();
    const context = ctx({
      source: "maklervereinbarung.vertrag",
      entityType: "Partner",
      entityId: "ashley",
      slot: "vertrag",
      knownMetadata: { gueltig_von: "2027-01-01", gueltig_bis: "2029-12-31" },
    });
    expect(uploadToState(base, { id: "x", file, context, now: NOW }).doc.status).toBe("Entwurf");
  });
});

describe("views", () => {
  it("Partner folders hold the agreements of that partner only", () => {
    const view = buildView(fresh(), "Verwaltung");
    const vereinbarungen = findFolder(view, ["Partner", "Ashley Johnson", "Vereinbarungen"])!;
    expect(vereinbarungen.docs.map((d) => d.name).sort()).toEqual(["Maklervereinbarung Ashley Johnson 2022", "Maklervereinbarung Ashley Johnson 2027"]);
    expect(findFolder(view, ["Partner"])!.count).toBe(10);
  });

  it("one record shows in both views without copies", () => {
    const state = fresh();
    const polizze = state.documents.find((d) => d.name === "Polizze UQ-T-5512")!;
    const path = ["Kunden", "Transporte Steiner ∕ Wels GmbH", "Polizzen", "Transportversicherung"];
    expect(locateDocument(buildView(state, "Verwaltung"), polizze.id)).toEqual([path]);
    expect(locateDocument(buildView(state, "Standard"), polizze.id)).toEqual([path]);
    expect(findFolder(buildView(state, "Standard"), path)!.docs[0]).toBe(polizze);
  });
});

describe("Stammdaten sync", () => {
  it("a new partner gets its folder tree and uploads for it are placed", async () => {
    const { syncEntities } = await import("./upload");
    const base = syncEntities(fresh(), [{ id: "neu", type: "Partner", name: "Neue Partnerin & Co" }]);
    expect(findFolder(buildView(base, "Verwaltung"), ["Partner", "Neue Partnerin & Co", "Anhänge"])).not.toBeNull();
    const context = ctx({ source: "partner.stammdaten.anhang", entityType: "Partner", entityId: "neu", slot: "anhang" });
    const { state, doc } = uploadToState(base, { id: "d-neu", file, context, now: NOW });
    expect(locateDocument(buildView(state, "Standard"), doc.id)).toEqual([["Partner", "Neue Partnerin & Co", "Anhänge"]]);
    expect(syncEntities(state, [{ id: "neu", type: "Partner", name: "Neue Partnerin & Co" }])).toBe(state);
  });
});
