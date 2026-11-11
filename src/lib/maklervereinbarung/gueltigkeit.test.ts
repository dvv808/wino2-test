import { describe, expect, it } from "vitest";
import { amountOf, ddmmyyyy, ersteVerrechnung, gueltigAb, naechsterMonatserster } from "./gueltigkeit";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("Gültigkeit & Erstmalige Verrechnung", () => {
  it("is valid from the last signature (Kunde 01.08., Winter 20.08. → 20.08.)", () => {
    expect(ddmmyyyy(gueltigAb(d(2026, 8, 1), d(2026, 8, 20))!)).toBe("20.08.2026");
    expect(ddmmyyyy(gueltigAb(d(2026, 8, 20), d(2026, 8, 1))!)).toBe("20.08.2026");
    expect(gueltigAb(d(2026, 8, 1), null)).toBeNull();
  });

  it("bills first on the next 1st of the month after the agreement is valid", () => {
    expect(ddmmyyyy(naechsterMonatserster(d(2026, 8, 20)))).toBe("01.09.2026");
    expect(ddmmyyyy(naechsterMonatserster(d(2026, 9, 1)))).toBe("01.09.2026");
    expect(ddmmyyyy(naechsterMonatserster(d(2026, 12, 5)))).toBe("01.01.2027");
  });

  it("bills the Rumpfjahr pro rata up to the next Hauptfälligkeit", () => {
    const v = ersteVerrechnung(d(2026, 9, 1), 120, 1, 1);
    expect([ddmmyyyy(v.bis), v.tage, v.betrag, v.rumpfjahr]).toEqual(["01.01.2027", 122, 40.11, true]);
  });

  it("no Rumpfjahr when the first billing falls on the Hauptfälligkeit", () => {
    const v = ersteVerrechnung(d(2027, 1, 1), 120, 1, 1);
    expect([v.tage, v.betrag, v.rumpfjahr]).toEqual([0, 120, false]);
  });

  it("reads the yearly amount", () => {
    expect(amountOf("EUR 120,00")).toBe(120);
  });
});
