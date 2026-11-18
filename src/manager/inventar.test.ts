import { describe, expect, it } from "vitest";
import { TEAM, isEmployee } from "./hrmTeam";
import { blankItem, hasM365, hasOfficeKey, invAreaDone, inventarOf } from "./inventar";

describe("Mitarbeiter Inventar", () => {
  it("seeds equipment for employees only, with a few missing the mandatory items", () => {
    const employees = TEAM.filter(isEmployee);
    const lists = employees.map(inventarOf);
    expect(lists.every((items) => items.some((item) => item.kind === "asset"))).toBe(true);
    expect(lists.some((items) => !hasM365(items))).toBe(true);
    expect(lists.some((items) => !hasOfficeKey(items))).toBe(true);
    expect(lists.filter((items) => hasM365(items) && hasOfficeKey(items)).length).toBeGreaterThan(employees.length / 2);
  });

  it("counts only active Microsoft 365 licences and office keys / badges as mandatory", () => {
    const m365 = { ...blankItem("asset"), name: "Microsoft 365 Lizenz" };
    const chip = { ...blankItem("key"), name: "Parkgaragen-Chip", kategorie: "Chip" };
    const card = { ...blankItem("key"), name: "Büro-Zugangskarte", kategorie: "Zugangskarte" };
    expect(invAreaDone("inventar", [m365])).toBe(true);
    expect(invAreaDone("inventar", [{ ...m365, status: "Zurückgegeben" }])).toBe(false);
    expect(invAreaDone("schluessel", [chip])).toBe(false);
    expect(invAreaDone("schluessel", [chip, card])).toBe(true);
    expect(invAreaDone("benefits", [])).toBe(true);
  });
});
