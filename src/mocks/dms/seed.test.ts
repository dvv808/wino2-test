import { describe, expect, it } from "vitest";
import { createDmsSeed, SPARTEN, VERSICHERER } from "./seed";
import { DMS_STORAGE_KEY, loadDmsState } from "../../dms/store";
import { effectiveRules } from "../../lib/dms/links";

const seed = createDmsSeed();
const byType = (typ: string | null) => seed.documents.filter((doc) => doc.dokumenttyp === typ);

describe("DMS seed", () => {
  it("has unique ids everywhere", () => {
    for (const list of [seed.documents, seed.people, seed.groups, seed.entities, seed.dokumenttypen, seed.vorlagen, seed.regeln]) {
      const ids = list.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("only references things that exist", () => {
    const types = new Set(seed.dokumenttypen.map((t) => t.id));
    const entities = new Set(seed.entities.map((e) => `${e.type}:${e.id}`));
    const people = new Set(seed.people.map((p) => p.id));
    for (const doc of seed.documents) {
      if (doc.dokumenttyp) expect(types.has(doc.dokumenttyp), doc.name).toBe(true);
      for (const link of doc.links) expect(entities.has(`${link.entityType}:${link.entityId}`), doc.name).toBe(true);
      expect(people.has(doc.createdBy), doc.name).toBe(true);
      for (const person of doc.vertraulich ?? []) expect(people.has(person)).toBe(true);
    }
    for (const g of seed.groups) for (const m of g.members) expect(people.has(m)).toBe(true);
    for (const rule of seed.regeln) if (rule.dokumenttyp) expect(types.has(rule.dokumenttyp)).toBe(true);
  });

  it("fills the required fields and uses valid states", () => {
    for (const doc of seed.documents) {
      const typ = seed.dokumenttypen.find((t) => t.id === doc.dokumenttyp);
      if (!typ) continue;
      for (const field of typ.requiredFields) expect(doc.meta[field], `${doc.name}.${field}`).toBeDefined();
      if (typ.workflow.states.length) expect(typ.workflow.states).toContain(doc.status);
      else expect(doc.status).toBeNull();
    }
  });

  it("has the test scenarios", () => {
    expect(seed.entities.filter((e) => e.type === "Versicherer").map((e) => e.name)).toEqual([...VERSICHERER]);
    expect(new Set(byType("bedingungen").map((d) => d.meta.sparte))).toEqual(new Set(SPARTEN));
    // UNIQA Transport stops at 2025.
    const uniqaTransport = byType("bedingungen").filter(
      (d) => d.meta.sparte === "Transportversicherung" && d.name.includes("UNIQA"),
    );
    expect(Math.max(...uniqaTransport.map((d) => d.meta.jahr ?? 0))).toBe(2025);

    const mv = byType("maklervereinbarung");
    expect(new Set(mv.map((d) => d.links[0].entityId)).size).toBe(3);
    expect(new Set(mv.map((d) => d.status))).toEqual(new Set(["Entwurf", "In Freigabe", "Aktiv", "Gekündigt"]));
    // Seeded as Aktiv, but gueltig_bis lies before today: the automatic transition (phase b) makes it Abgelaufen.
    expect(mv.some((d) => d.status === "Aktiv" && (d.meta.gueltig_bis ?? "") < seed.today)).toBe(true);

    expect(seed.entities.filter((e) => e.type === "Kunde")).toHaveLength(4);
    expect(seed.entities.filter((e) => e.type === "Schaden")).toHaveLength(1);
    expect(byType("polizze").length).toBeGreaterThanOrEqual(4);
    expect(byType("korrespondenz").length).toBeGreaterThan(0);
    expect(seed.groups.map((g) => g.name)).toEqual(["Geschäftsführung", "Schadenabteilung", "Partnerbetreuung", "Backoffice"]);
    expect(seed.groups.every((g) => g.members.length > 0)).toBe(true);
    expect(seed.documents.filter((d) => d.vertraulich)).toHaveLength(1);
    expect(byType(null)).toHaveLength(2);
  });

  it("has names with umlauts, & and slashes for placeholder tests", () => {
    const names = seed.entities.map((e) => e.name);
    expect(names.some((n) => /[äöüÄÖÜß]/.test(n) && n.includes("&"))).toBe(true);
    expect(names.some((n) => n.includes("/"))).toBe(true);
  });

  it("links every upload point from the spec to a folder (the links are the Ablageregeln)", () => {
    expect(effectiveRules(seed).map((r) => r.source)).toEqual(
      expect.arrayContaining([
        "maklervereinbarung.vertrag",
        "partner.aktivitaet.anhang",
        "kunde.polizze",
        "schaden.dokumente",
        "kommunikation.email",
        "versicherer.bedingungen",
        "dms.dragdrop",
      ]),
    );
  });
});

describe("loadDmsState", () => {
  const storage = (value: string | null) => ({ getItem: (key: string) => (key === DMS_STORAGE_KEY ? value : null) });

  it("starts from the seed without a save, with a broken save or an outdated version", () => {
    expect(loadDmsState(storage(null)).documents).toHaveLength(seed.documents.length);
    expect(loadDmsState(storage("{nope")).documents).toHaveLength(seed.documents.length);
    expect(loadDmsState(storage(JSON.stringify({ version: 0, documents: [] }))).documents).toHaveLength(seed.documents.length);
  });

  it("keeps a valid save", () => {
    const saved = { ...seed, activePerson: "mike", documents: seed.documents.slice(0, 3) };
    const state = loadDmsState(storage(JSON.stringify(saved)));
    expect(state.activePerson).toBe("mike");
    expect(state.documents).toHaveLength(3);
  });
});
