import { describe, expect, it } from "vitest";
import type { HomeofficeAntrag } from "./homeoffice";
import { arbeitszeitHit, homeofficeHit, normalizeArbeitszeit, openHomeofficeBlocks, replaceArbeitszeit, replaceHomeoffice, subtract, withoutHomeoffice, workMinutes } from "./overlap";

const ho = (id: string, day: string, start: number, end: number, status: HomeofficeAntrag["status"] = "offen"): HomeofficeAntrag => ({
  id,
  day,
  start,
  end,
  status,
  beantragt: "2026-11-10T09:00:00.000Z",
});

describe("Homeoffice and Arbeitszeit replace each other", () => {
  it("subtract cuts out, splits and removes", () => {
    expect(subtract({ start: 480, end: 750 }, [{ start: 600, end: 660 }])).toEqual([
      { start: 480, end: 600 },
      { start: 660, end: 750 },
    ]);
    expect(subtract({ start: 480, end: 750 }, [{ start: 400, end: 800 }])).toEqual([]);
    expect(subtract({ start: 480, end: 750 }, [{ start: 780, end: 900 }])).toEqual([{ start: 480, end: 750 }]);
  });

  it("Arbeitszeit shortens or removes the overlapping Homeoffice of that day only", () => {
    const list = [ho("a", "2026-11-12", 480, 750), ho("b", "2026-11-12", 780, 1020, "genehmigt"), ho("c", "2026-11-13", 480, 750)];
    const next = replaceHomeoffice(list, "2026-11-12", [{ start: 480, end: 750 }, { start: 780, end: 900 }]);
    expect(next.map((x) => [x.id, x.day, x.start, x.end, x.status])).toEqual([
      ["b", "2026-11-12", 900, 1020, "genehmigt"],
      ["c", "2026-11-13", 480, 750, "offen"],
    ]);
    expect(homeofficeHit(list, "2026-11-12", [{ start: 700, end: 800 }]).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("Homeoffice shortens or removes the overlapping Arbeitszeit of that day", () => {
    const az = { "2026-11-12": [{ start: 480, end: 750 }, { start: 780, end: 1020 }] };
    expect(replaceArbeitszeit(az, "2026-11-12", [{ start: 780, end: 1020 }])["2026-11-12"]).toEqual([{ start: 480, end: 750 }]);
    expect(arbeitszeitHit(az, "2026-11-12", [{ start: 700, end: 800 }])).toHaveLength(2);
    expect(replaceArbeitszeit(az, "2026-11-13", [{ start: 480, end: 750 }])).toBe(az);
  });

  it("either-or: Arbeitszeit under Homeoffice gives way, untouched data stays the same object", () => {
    const az = { "2026-11-12": [{ start: 480, end: 750 }, { start: 780, end: 1020 }] };
    const list = [ho("a", "2026-11-12", 780, 1020)];
    expect(normalizeArbeitszeit(az, list)["2026-11-12"]).toEqual([{ start: 480, end: 750 }]);
    expect(normalizeArbeitszeit(az, [ho("b", "2026-11-13", 780, 1020)])).toBe(az);
  });

  it("offers erfasste Arbeitszeit as a new Homeoffice block and leaves an existing request as the request", () => {
    const friday = [
      ho("afternoon", "2026-11-13", 780, 1020),
      ho("late", "2026-11-13", 1050, 1110),
    ];
    const blocks = openHomeofficeBlocks("2026-11-13", friday, [{ start: 480, end: 750 }]);
    expect(blocks.map((b) => [b.id ?? "", b.start, b.end])).toEqual([
      ["", 480, 750],
      ["afternoon", 780, 1020],
      ["late", 1050, 1110],
    ]);
    expect(openHomeofficeBlocks("2026-11-13", friday, [])).toEqual(
      friday.map((x) => ({ key: x.id, id: x.id, start: x.start, end: x.end, kommentar: "" })),
    );
    expect(workMinutes([{ start: 480, end: 750 }, { start: 480, end: 750 }, { start: 780, end: 1020 }])).toBe(510);
  });

  it("the default Arbeitszeit of a day leaves its Homeoffice times out", () => {
    const blocks = [{ start: 480, end: 750 }, { start: 780, end: 1020 }];
    expect(withoutHomeoffice(blocks, [ho("a", "2026-11-12", 780, 1020)], "2026-11-12")).toEqual([{ start: 480, end: 750 }]);
    expect(withoutHomeoffice(blocks, [ho("a", "2026-11-12", 780, 1020, "zurueckgesetzt")], "2026-11-12")).toEqual(blocks);
  });
});
