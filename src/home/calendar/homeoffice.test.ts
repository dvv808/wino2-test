import { describe, expect, it } from "vitest";
import { blockedReason, decide, forDay, nextBlock, parseTime, remove, saveDay, sollzeit, startBlocks, total, validate, type HomeofficeBlock } from "./homeoffice";

const NOW = "2026-11-09T09:00:00.000Z";
const LATER = "2026-11-09T10:00:00.000Z";
const T = "2026-11-09";
const none = new Set<string>();
const b = (key: string, start: number | null, end: number | null, kommentar = "", id?: string): HomeofficeBlock => ({ key, id, start, end, kommentar });

describe("Homeoffice-Anträge (Zeitblöcke)", () => {
  it("starts with the Figma default blocks; Friday only the morning", () => {
    expect(startBlocks("2026-11-11", []).map((x) => [x.start, x.end])).toEqual([
      [480, 750],
      [780, 1020],
    ]);
    expect(startBlocks("2026-11-13", []).map((x) => [x.start, x.end])).toEqual([[480, 750]]);
    expect(sollzeit("2026-11-11")).toBe(510);
    expect(sollzeit("2026-11-13")).toBe(270);
  });

  it("each block becomes its own open request with its comment", () => {
    const list = saveDay([], "2026-11-11", [b("b2", 780, 1020), b("b1", 480, 750, "  Handwerker kommt ")], NOW);
    expect(list.map((x) => [x.start, x.end, x.status, x.kommentar])).toEqual([
      [480, 750, "offen", "Handwerker kommt"],
      [780, 1020, "offen", undefined],
    ]);
    expect(startBlocks("2026-11-11", list).map((x) => x.id)).toEqual(list.map((x) => x.id));
  });

  it("validates missing times, Ende before Beginn and overlaps", () => {
    expect(validate([b("a", 480, null)])).toEqual({ a: "Bitte Beginn und Ende angeben." });
    expect(validate([b("a", 600, 540)])).toEqual({ a: "Ende muss nach Beginn liegen." });
    expect(Object.keys(validate([b("a", 480, 720), b("b", 700, 800)]))).toEqual(["a", "b"]);
    expect(validate([b("a", 480, 720), b("b", 720, 800)])).toEqual({});
    expect(total([b("a", 480, 750), b("b", 780, 1020), b("c", 900, null)])).toBe(510);
  });

  it("saving again keeps an unchanged approved block; a changed one is open again", () => {
    let list = saveDay([], "2026-11-11", [b("b1", 480, 750), b("b2", 780, 1020)], NOW);
    list = decide(list, list[0].id, "genehmigt", NOW);
    list = decide(list, list[1].id, "genehmigt", NOW);
    const blocks = startBlocks("2026-11-11", list);
    blocks[1] = { ...blocks[1], end: 960 };
    list = saveDay(list, "2026-11-11", blocks, LATER);
    expect(forDay(list, "2026-11-11").map((x) => [x.start, x.end, x.status])).toEqual([
      [480, 750, "genehmigt"],
      [780, 960, "offen"],
    ]);
  });

  it("a rejected block is replaced when its time is asked for again; deleting frees it", () => {
    let list = saveDay([], "2026-11-12", [b("b1", 480, 750)], NOW);
    list = decide(list, list[0].id, "zurueckgesetzt", NOW);
    // The rejected block is offered again; saved unchanged it is a new open request.
    const again = startBlocks("2026-11-12", list);
    expect(again.map((x) => [x.start, x.end])).toEqual([[480, 750]]);
    expect(saveDay(list, "2026-11-12", again, LATER).map((x) => x.status)).toEqual(["offen"]);
    list = saveDay(list, "2026-11-12", [b("n", 540, 600)], LATER);
    expect(list.map((x) => [x.start, x.status])).toEqual([[540, "offen"]]);
    expect(remove(list, list[0].id)).toEqual([]);
  });

  it("blocks past days, weekends and holidays", () => {
    expect(blockedReason("2026-11-06", T, none)).toMatch(/Vergangene/);
    expect(blockedReason("2026-11-14", T, none)).toMatch(/Wochenende/);
    expect(blockedReason("2026-11-10", T, new Set(["2026-11-10"]))).toMatch(/Feiertag/);
    expect(blockedReason("2026-11-09", T, none)).toBeNull();
  });

  it("reads typed times and adds the next block after the last", () => {
    expect([parseTime("8"), parseTime("830"), parseTime("8.30"), parseTime("17:00"), parseTime("25"), parseTime("")]).toEqual([480, 510, 510, 1020, null, null]);
    expect(nextBlock([b("a", 480, 750)], "n")).toMatchObject({ start: 780, end: 840 });
  });
});
