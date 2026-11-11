import { describe, expect, it } from "vitest";
import { cloneAshleySections, cloneSections, openTasks } from "./stammdaten";

describe("Offene Aufgaben", () => {
  it("drops what is already in the Stammdaten (Julia has Reisepass, Bankverbindung and a contact)", () => {
    expect(openTasks(cloneSections())).toEqual([]);
  });

  it("keeps a task while its Stammdaten are missing", () => {
    const sections = cloneSections().map((section) => {
      if (section.id === "bankverbindungen") return { ...section, cards: [] };
      if (section.id === "personendaten")
        return {
          ...section,
          cards: section.cards.map((card) => ({ ...card, blocks: card.blocks?.filter((block) => block.kind !== "files") })),
        };
      return section;
    });
    expect(openTasks(sections)).toEqual(["id", "bank"]);
  });

  it("a new partner without Stammdaten has all three open", () => {
    expect(openTasks(cloneAshleySections())).toEqual(["id", "bank", "contact"]);
  });
});
