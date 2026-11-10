import { describe, expect, it } from "vitest";
import { createDmsSeed } from "../../mocks/dms/seed";
import type { DmsState } from "../../types/dms";
import { effectiveLevel, filterView, whoHasAccess } from "./permissions";
import { buildView, findFolder, locateDocument } from "./views";
import { applyAllAutoTransitions } from "./workflow";

const state: DmsState = applyAllAutoTransitions(createDmsSeed());
const person = (id: string) => state.people.find((p) => p.id === id)!;
const verwaltung = buildView(state, "Verwaltung");
const standard = buildView(state, "Standard");
const level = (id: string, path: string[], view = verwaltung) => effectiveLevel(view, path, person(id), state.groups);

const STEINER = ["Partner", "Transporte Steiner ∕ Wels GmbH"];
const nda = state.documents.find((d) => d.vertraulich)!;

describe("permission inheritance", () => {
  it("a permission on a folder reaches every folder below it", () => {
    expect(level("anna", STEINER)).toBe("Bearbeiten");
    expect(level("anna", [...STEINER, "Polizzen", "Transportversicherung"])).toBe("Bearbeiten");
    expect(level("thomas", [...STEINER, "Korrespondenz"])).toBe("Sehen");
  });

  it("a permission below adds access only there", () => {
    expect(level("markus", STEINER)).toBeNull();
    expect(level("markus", [...STEINER, "Polizzen"])).toBeNull();
    expect(level("markus", [...STEINER, "Schäden"])).toBe("Bearbeiten");
    expect(level("markus", [...STEINER, "Schäden", "S-2026-0142"])).toBe("Bearbeiten");
    expect(level("markus", ["Partner", "Julia Atkinson"])).toBeNull();
    expect(level("markus", ["Partner", "Julia Atkinson", "Schäden"])).toBe("Bearbeiten");
  });

  it("the highest level wins; a lower one below never takes access away (no deny)", () => {
    expect(level("lucy", STEINER)).toBe("Verwalten"); // Backoffice Bearbeiten + Rolle DMS-Admin Verwalten
    expect(level("thomas", ["Partner", "Lunixo AG", "Anhänge"])).toBe("Sehen");
    expect(level("mike", ["Partner", "Lunixo AG", "Anhänge"])).toBe("Bearbeiten"); // Backoffice rule below does not limit Partnerbetreuung
  });

  it("Alle and top folders", () => {
    expect(level("elif", ["Unternehmen", "Versicherer", "Feuerversicherung"], standard)).toBe("Sehen");
    expect(level("lucy", ["Partner"])).toBe("Verwalten"); // the top folder carries the DMS-Admin rule
    expect(level("anna", ["Partner"])).toBeNull(); // Backoffice starts one level below
  });
});

describe("filtered views", () => {
  it("keeps the way to a visible folder but hides what is not allowed", () => {
    const markus = filterView(verwaltung, person("markus"), state.groups);
    const steiner = findFolder(markus, STEINER)!;
    expect(steiner.level).toBeNull();
    expect(steiner.docs).toEqual([]);
    expect(steiner.children.map((c) => c.name)).toEqual(["Schäden"]);
    expect(findFolder(markus, [...STEINER, "Schäden", "S-2026-0142"])!.docs).toHaveLength(2);
    expect(findFolder(markus, ["Partner"])!.level).toBeNull();
    // Every partner has a Schäden folder (empty ones too); Markus sees only that folder in each.
    for (const kunde of findFolder(markus, ["Partner"])!.children) {
      expect(kunde.children.map((c) => c.name)).toEqual(["Schäden"]);
    }
  });

  it("counts only what the person sees", () => {
    const markus = filterView(verwaltung, person("markus"), state.groups);
    expect(findFolder(markus, ["Partner"])!.count).toBe(2);
    const lucy = filterView(verwaltung, person("lucy"), state.groups);
    // Lucy sees all but the vertraulich NDA.
    expect(findFolder(lucy, ["Partner"])!.count).toBe(findFolder(verwaltung, ["Partner"])!.count - 1);
  });
});

describe("vertraulich", () => {
  const ndaPath = ["Partner", "Lunixo AG", "Vereinbarungen"];

  it("only the named person sees it, even an admin with Verwalten does not", () => {
    expect(locateDocument(verwaltung, nda.id)).toEqual([ndaPath]);
    expect(locateDocument(filterView(verwaltung, person("thomas"), state.groups), nda.id)).toEqual([ndaPath]);
    expect(level("lucy", ndaPath)).toBe("Verwalten");
    expect(locateDocument(filterView(standard, person("lucy"), state.groups), nda.id)).toEqual([]);
    expect(locateDocument(filterView(standard, person("mike"), state.groups), nda.id)).toEqual([]);
  });

  it("in Verwaltung it stays listed as locked instead of disappearing", () => {
    const lucy = findFolder(filterView(verwaltung, person("lucy"), state.groups, { lockConfidential: true }), ndaPath)!;
    expect(lucy.lockedIds).toEqual([nda.id]);
    const thomas = findFolder(filterView(verwaltung, person("thomas"), state.groups, { lockConfidential: true }), ndaPath)!;
    expect(thomas.lockedIds).toEqual([]);
    expect(thomas.docs.map((d) => d.id)).toContain(nda.id);
  });
});

describe("Wer hat Zugriff?", () => {
  it("lists every person with level and source, inheritance resolved", () => {
    const list = whoHasAccess(verwaltung, [...STEINER, "Schäden"], state);
    const row = (id: string) => list.find((e) => e.person.id === id);
    expect(row("lucy")).toMatchObject({ level: "Verwalten", inherited: true, via: "Rolle DMS-Admin · geerbt von Partner" });
    expect(row("markus")).toMatchObject({ level: "Bearbeiten", inherited: false, via: "Schadenabteilung" });
    expect(row("anna")).toMatchObject({ level: "Bearbeiten", inherited: true });
    expect(row("thomas")).toMatchObject({ level: "Sehen", via: "Geschäftsführung · geerbt von Partner / Transporte Steiner ∕ Wels GmbH" });
    expect(row("mike")).toMatchObject({ level: "Bearbeiten", via: "Partnerbetreuung · geerbt von Partner / Transporte Steiner ∕ Wels GmbH" });
    expect(list[0].level).toBe("Verwalten");
  });

  it("Alle reaches everyone", () => {
    const list = whoHasAccess(standard, ["Unternehmen", "Versicherer"], state);
    expect(list).toHaveLength(state.people.length);
    expect(list.find((e) => e.person.id === "elif")?.via).toBe("Alle · geerbt von Unternehmen");
  });
});
