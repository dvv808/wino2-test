import { describe, expect, it } from "vitest";
import { TEAM } from "./hrmTeam";
import { areasOf } from "./MitarbeiterProfil";

describe("Mitarbeiter Profil", () => {
  it("builds the Stammdaten for every Mitarbeiter without gaps", () => {
    for (const person of TEAM) {
      const areas = areasOf(person);
      const values = areas.flatMap((area) => area.cards.flatMap((card) => (card.blocks ?? []).flatMap((block) => ("rows" in block ? block.rows.map((row) => row.value) : []))));
      expect(values.every((value) => value !== undefined && !JSON.stringify(value).includes("undefined"))).toBe(true);
    }
  });
});
