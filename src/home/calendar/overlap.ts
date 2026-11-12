/**
 * Homeoffice is a request on top of erfasste Arbeitszeit. The hours still count as work; the calendar
 * labels them Homeoffice. A time that is only Arbeitszeit is not a request.
 */
import type { ArbeitszeitBlock, Arbeitszeiten } from "./arbeitszeit";
import { startBlocks, type HomeofficeAntrag, type HomeofficeBlock } from "./homeoffice";

export type Span = { start: number; end: number };

const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

/** What is left of `span` after cutting out every `cut` (0, 1 or more pieces, in order). */
export function subtract(span: Span, cuts: Span[]): Span[] {
  let pieces: Span[] = [{ start: span.start, end: span.end }];
  for (const cut of cuts) {
    pieces = pieces.flatMap((piece) => {
      if (!overlaps(piece, cut)) return [piece];
      const left = piece.start < cut.start ? [{ start: piece.start, end: cut.start }] : [];
      const right = cut.end < piece.end ? [{ start: cut.end, end: piece.end }] : [];
      return [...left, ...right];
    });
  }
  return pieces.filter((piece) => piece.end > piece.start);
}

/** Homeoffice of a day that still counts (a reset request is gone from the calendar). */
const activeHomeoffice = (antraege: HomeofficeAntrag[], day: string) =>
  antraege.filter((x) => x.day === day && x.status !== "zurueckgesetzt");

/** Requests of `day` that the Arbeitszeit `blocks` would shorten or remove. */
export function homeofficeHit(antraege: HomeofficeAntrag[], day: string, blocks: Span[]) {
  return activeHomeoffice(antraege, day).filter((x) => blocks.some((b) => overlaps(x, b)));
}

/** Arbeitszeit saved for `day`: overlapping Homeoffice is shortened, split or removed (status kept). */
export function replaceHomeoffice(antraege: HomeofficeAntrag[], day: string, blocks: Span[]): HomeofficeAntrag[] {
  return antraege.flatMap((x) => {
    if (x.day !== day || x.status === "zurueckgesetzt" || !blocks.some((b) => overlaps(x, b))) return [x];
    return subtract(x, blocks).map((piece, i) => ({ ...x, id: i === 0 ? x.id : `${x.id}-${i}`, start: piece.start, end: piece.end }));
  });
}

/** Arbeitszeit of `day` that the Homeoffice `blocks` would shorten or remove. */
export function arbeitszeitHit(arbeitszeiten: Arbeitszeiten, day: string, blocks: Span[]) {
  return (arbeitszeiten[day] ?? []).filter((b) => blocks.some((h) => overlaps(b, h)));
}

/** Homeoffice asked for on `day`: overlapping Arbeitszeit is shortened, split or removed. */
export function replaceArbeitszeit(arbeitszeiten: Arbeitszeiten, day: string, blocks: Span[]): Arbeitszeiten {
  const own = arbeitszeiten[day];
  if (!own) return arbeitszeiten;
  const next: ArbeitszeitBlock[] = own.flatMap((b) => subtract(b, blocks).map((piece) => ({ ...b, start: piece.start, end: piece.end })));
  return { ...arbeitszeiten, [day]: next };
}

/**
 * What the Homeoffice modal opens with. An existing request stays locked as that request.
 * Erfasste Arbeitszeit that is not already requested is a new block, so it can be beantragt
 * and is not shown as Genehmigung ausstehend. With no Arbeitszeit, the day keeps its requests
 * or the Figma default times.
 */
export function openHomeofficeBlocks(day: string, antraege: HomeofficeAntrag[], arbeitszeit: Span[]): HomeofficeBlock[] {
  const existing = startBlocks(day, antraege);
  const requested = existing.filter((b) => b.id && b.start !== null && b.end !== null);
  const cuts = requested.map((b) => ({ start: b.start!, end: b.end! }));
  const fresh = arbeitszeit
    .filter((b) => b.end > b.start)
    .flatMap((b) => subtract(b, cuts))
    .map((piece) => ({ key: `az-${piece.start}-${piece.end}`, start: piece.start, end: piece.end, kommentar: "" }));
  if (!fresh.length) return existing;
  return [...requested, ...fresh].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}

/** Minutes of work, counting overlapping Arbeitszeit and Homeoffice once. */
export function workMinutes(spans: Span[]): number {
  const sorted = spans.filter((s) => s.end > s.start).sort((a, b) => a.start - b.start || a.end - b.end);
  let total = 0;
  let end = -1;
  for (const span of sorted) {
    const start = Math.max(span.start, end);
    if (span.end > start) total += span.end - start;
    if (span.end > end) end = span.end;
  }
  return total;
}

/** Arbeitszeit strokes under an active Homeoffice request, so that time is labeled Homeoffice. */
export function withoutHomeoffice(blocks: ArbeitszeitBlock[], antraege: HomeofficeAntrag[], day: string): ArbeitszeitBlock[] {
  const home = activeHomeoffice(antraege, day);
  if (!home.length) return blocks;
  return blocks.flatMap((b) => subtract(b, home).map((piece) => ({ ...b, start: piece.start, end: piece.end })));
}

/**
 * Either-or for data saved before the rule: wherever Arbeitszeit lies under Homeoffice, the Homeoffice wins.
 * Returns the same object when nothing overlaps.
 */
export function normalizeArbeitszeit(arbeitszeiten: Arbeitszeiten, antraege: HomeofficeAntrag[]): Arbeitszeiten {
  let changed = false;
  const next: Arbeitszeiten = {};
  for (const [day, blocks] of Object.entries(arbeitszeiten)) {
    const kept = withoutHomeoffice(blocks, antraege, day);
    if (kept.length !== blocks.length || kept.some((b, i) => b.start !== blocks[i].start || b.end !== blocks[i].end)) changed = true;
    next[day] = kept;
  }
  return changed ? next : arbeitszeiten;
}
