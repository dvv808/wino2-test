import { describe, expect, it } from "vitest";
import { FILE_PARTNERS } from "./partners";
import { bankOwner, cloneAshleySections, cloneSections, linkBankOwners, ownBankAccounts, rowValue } from "./stammdaten";

describe("linked Bankverbindungen", () => {
  const files = linkBankOwners(
    {
      julia: { sections: cloneSections() },
      "thomas-atkinson": { sections: cloneAshleySections("Thomas", "Atkinson", "partner-thomas-atkinson") },
    },
    Object.values(FILE_PARTNERS),
  );
  const bank = (id: string) => files[id].sections.find((section) => section.id === "bankverbindungen")!.cards;

  it("shows the owner of a linked account as a partner in the holder's file", () => {
    const sparkasse = bank("julia").find((card) => card.id === "bank-sparkasse")!;
    const person = sparkasse.blocks?.find((block) => block.kind === "person");
    expect(person?.kind === "person" && person.caption).toBe("Kontoinhaber");
    expect(bankOwner(sparkasse)).toBe("Thomas Atkinson");
  });

  it("gives the owner the account in his own profile", () => {
    const own = ownBankAccounts(files["thomas-atkinson"].sections, "Thomas Atkinson");
    expect(own.map((account) => account.iban)).toEqual(["AT 2332 2222 1331 1112 22"]);
    expect(bank("thomas-atkinson").some((card) => card.empty)).toBe(false);
    expect(rowValue(bank("thomas-atkinson")[0], "Kreditinstitut")).toBe("Sparkasse Mondsee");
  });

  it("is idempotent", () => {
    const again = linkBankOwners(files, Object.values(FILE_PARTNERS));
    expect(again["thomas-atkinson"].sections.find((section) => section.id === "bankverbindungen")!.cards).toHaveLength(1);
  });
});
