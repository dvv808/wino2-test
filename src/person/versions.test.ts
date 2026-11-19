import { describe, expect, it } from "vitest";
import type { Section } from "./stammdaten";
import { EDITOR_ADVISOR, historyFromStammdatenSave } from "./versions";

const extras = { number: 1, at: { date: "19.11.2026", time: "09:48" }, editor: EDITOR_ADVISOR, vorname: "Ash", nachname: "Atkinson" };
const withFile = (label: string, docTyp?: string): Section[] => [
  {
    id: "personendaten",
    title: "Allgemeine Personendaten",
    cards: [
      {
        id: "partner-ash",
        title: "Allgemeine Partnerdaten",
        blocks: [{ kind: "rows", rows: [{ label, value: { kind: "file", text: "Scan.gif", docTyp } }] }],
      },
    ],
  } as Section,
];

describe("Verlauf of uploaded documents", () => {
  it("records picking a Typ for an uploaded file as one change, not removed + added", () => {
    const entries = historyFromStammdatenSave(withFile("Scan.gif"), withFile("Führerschein", "Führerschein"), extras);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: "changed", field: "Dokument", from: "Scan.gif", to: "Scan.gif · Führerschein" });
  });
});
