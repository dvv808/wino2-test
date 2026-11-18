import { describe, expect, it } from "vitest";
import { TEAM, isEmployee } from "./hrmTeam";
import { blankVertrag, blankZugang, koopAreaDone, vertragOf, zugangOf } from "./kooperation";

describe("Mitarbeiter Kooperation", () => {
  it("seeds an active Zugang and a signed Dienstvertrag for most employees, none for Bewerber", () => {
    const employees = TEAM.filter(isEmployee);
    const withBoth = employees.filter((m) => koopAreaDone("zugang", zugangOf(m), null) && koopAreaDone("dienstvertrag", null, vertragOf(m)));
    expect(withBoth.length).toBeGreaterThan(employees.length / 2);
    expect(employees.some((m) => !zugangOf(m))).toBe(true);
    expect(TEAM.filter((m) => !isEmployee(m)).every((m) => !zugangOf(m) && !vertragOf(m))).toBe(true);
  });

  it("needs a granted Freigabe for the Zugang and a signature for the Dienstvertrag", () => {
    const person = TEAM[0];
    const zugang = blankZugang(person);
    expect(koopAreaDone("zugang", zugang, null)).toBe(false);
    expect(koopAreaDone("zugang", { ...zugang, freigabe: "requested" }, null)).toBe(false);
    expect(koopAreaDone("zugang", { ...zugang, freigabe: "granted" }, null)).toBe(true);
    const vertrag = blankVertrag(person);
    expect(koopAreaDone("dienstvertrag", null, vertrag)).toBe(false);
    expect(koopAreaDone("dienstvertrag", null, { ...vertrag, signFile: "Dienstvertrag.pdf" })).toBe(true);
  });
});
