import type { DmsEntity, DocMeta, EntityLink } from "../../types/dms";

export type PlaceholderValues = Record<string, string | number | undefined>;

/** Names become one path segment: a "/" in a name must not open a sub-folder, so it is shown as "∕". "&" and umlauts stay. */
export function safeSegment(name: string) {
  return name.replace(/\//g, "∕").replace(/\s+/g, " ").trim();
}

/** Replaces {Key} in one segment. Unknown keys stay literally ("{Sparte}") and are reported. */
export function fillSegment(template: string, values: PlaceholderValues) {
  const missing: string[] = [];
  const text = template.replace(/\{([^}]+)\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined || value === "") {
      missing.push(key);
      return match;
    }
    return safeSegment(String(value));
  });
  return { text: missing.length ? text : safeSegment(text), missing };
}

/** A path template is split on "/" first, then filled, so slashes inside names never split it. */
export function fillPath(template: string, values: PlaceholderValues) {
  const segments = template.split("/").filter(Boolean);
  const missing: string[] = [];
  const path = segments.map((segment) => {
    const filled = fillSegment(segment, values);
    missing.push(...filled.missing);
    return filled.text;
  });
  return { path, missing };
}

/** Placeholder values an entity provides, including its parents: a Schaden knows its Kunde. */
export function entityValues(link: EntityLink | null, entities: DmsEntity[]): PlaceholderValues {
  const values: PlaceholderValues = {};
  let current = link ? entities.find((e) => e.type === link.entityType && e.id === link.entityId) : undefined;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    values[`${current.type}.Name`] ??= current.name;
    if (current.nummer) values[`${current.type}.Nummer`] ??= current.nummer;
    if (current.type === "Versicherer") values.Versicherer ??= current.name;
    const parent: EntityLink | undefined = current.parent;
    current = parent ? entities.find((e) => e.type === parent.entityType && e.id === parent.entityId) : undefined;
  }
  return values;
}

export function metaValues(meta: DocMeta): PlaceholderValues {
  return { Sparte: meta.sparte, Jahr: meta.jahr };
}

/** The entity and all its parents as links (a Schaden upload is also linked to its Kunde). */
export function linkChain(link: EntityLink | null, entities: DmsEntity[]): EntityLink[] {
  const chain: EntityLink[] = [];
  let current = link;
  while (current && !chain.some((l) => l.entityType === current!.entityType && l.entityId === current!.entityId)) {
    chain.push(current);
    const entity = entities.find((e) => e.type === current!.entityType && e.id === current!.entityId);
    current = entity?.parent ?? null;
  }
  return chain;
}

export const formatPath = (path: string[]) => path.join(" / ");
