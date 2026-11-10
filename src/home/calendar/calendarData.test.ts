import { describe, expect, it } from "vitest";
import { addDays, headerDate, isoWeek, monthGrid, placeInLanes, seedWeek, topOf, weekDays, weekStart } from "./calendarData";

describe("Kalender dates", () => {
  it("weeks start on Monday and KW follows ISO 8601", () => {
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(weekStart("2026-11-15")).toBe("2026-11-09");
    expect(weekDays("2026-11-12")[0]).toBe("2026-11-09");
    expect(isoWeek("2026-11-09")).toBe(46);
    expect(isoWeek("2026-01-01")).toBe(1);
    expect(isoWeek("2027-01-01")).toBe(53);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("formats the header date the Austrian way", () => {
    expect(headerDate("2026-11-09")).toBe("09. Nov. 2026");
    expect(headerDate("2026-01-05")).toBe("05. Jän. 2026");
  });

  it("builds a 6-row mini month with KW and days of the neighbour months", () => {
    const rows = monthGrid(2025, 7); // August 2025
    expect(rows).toHaveLength(6);
    expect(rows[0].kw).toBe(31);
    expect(rows[0].days[0]).toEqual({ day: "2025-07-28", inMonth: false });
    expect(rows[0].days[4]).toEqual({ day: "2025-08-01", inMonth: true });
  });
});

describe("Kalender layout", () => {
  it("puts overlapping entries side by side, separate clusters keep full width", () => {
    const placed = placeInLanes([
      { id: "a", start: 420, end: 660 },
      { id: "b", start: 540, end: 720 },
      { id: "c", start: 1020, end: 1065 },
    ]);
    const by = (id: string) => placed.find((p) => p.id === id)!;
    expect([by("a").lane, by("a").lanes]).toEqual([0, 2]);
    expect([by("b").lane, by("b").lanes]).toEqual([1, 2]);
    expect([by("c").lane, by("c").lanes]).toEqual([0, 1]);
  });

  it("reuses a free lane inside a cluster", () => {
    const placed = placeInLanes([
      { id: "a", start: 0, end: 60 },
      { id: "b", start: 30, end: 120 },
      { id: "c", start: 60, end: 90 },
    ]);
    expect(placed.find((p) => p.id === "c")!.lane).toBe(0);
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
  });

  it("46 px per hour from the start of the visible range", () => {
    expect(topOf(7 * 60, 6 * 60)).toBe(46);
    expect(topOf(7 * 60 + 30, 6 * 60)).toBe(69);
  });

  it("seeds a full demo week around today", () => {
    const week = seedWeek("2026-11-11");
    expect(new Set(week.entries.map((e) => e.day)).size).toBeGreaterThanOrEqual(4);
    expect(week.holidays.has("2026-11-10")).toBe(true);
    expect(week.entries.filter((e) => e.kind === "urlaub").map((e) => e.status)).toEqual(["offen", "abgelehnt"]);
  });
});
