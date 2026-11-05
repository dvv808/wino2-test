import type {
  Ansicht,
  Bedingung,
  Berechtigung,
  DmsEntity,
  DmsState,
  Dokument,
  EntityLink,
  Knoten,
  Level,
  Ordnervorlage,
} from "../../types/dms";
import { entityValues, fillSegment, safeSegment, type PlaceholderValues } from "./placeholders";
import type { FolderDefaults } from "./resolveAblage";

/** One folder of a view. Nothing here is stored: the tree is computed from the templates and the documents. */
export type FolderNode = {
  /** Path segments joined with "/" (segments never contain "/", see `safeSegment`). */
  key: string;
  name: string;
  path: string[];
  /** Template node; null for the folders a template is mounted under (e.g. "Partner"). */
  nodeId: string | null;
  templateId: string | null;
  /** The entity a template instance belongs to (Partner/Kunde folder). */
  entity: EntityLink | null;
  /** Documents directly in this folder. */
  docs: Dokument[];
  /** Shown with "nicht aktuell": the newest year there is, but older than the current year. */
  staleIds: string[];
  /** Documents in this folder and below. */
  count: number;
  children: FolderNode[];
  /** Permissions set on this folder itself; inheritance is resolved in the permission phase. */
  permissions: Berechtigung[];
  /** What a file dropped here gets: Dokumenttyp candidates, metadata and links. */
  defaults: FolderDefaults;
  /** Set by `filterView`: the viewer's effective level here (null = only a way to sub-folders they may see). */
  level?: Level | null;
  /** Set by `filterView` in Verwaltung: vertraulich documents the viewer may not open, shown locked. */
  lockedIds?: string[];
};

type Ctx = {
  path: string[];
  pool: Dokument[];
  values: PlaceholderValues;
  entity: EntityLink | null;
  defaults: FolderDefaults;
  templateId: string;
  stale: Set<string>;
  entities: DmsEntity[];
  year: number;
  /** Whether this folder or one above has a filter. Without one a folder only groups its sub-folders. */
  filtered: boolean;
};

export function matches(doc: Dokument, cond: Bedingung, entity: EntityLink | null): boolean {
  switch (cond.kind) {
    case "typ":
      return doc.dokumenttyp !== null && cond.in.includes(doc.dokumenttyp);
    case "status":
      return doc.status !== null && cond.in.includes(doc.status);
    case "meta": {
      const value = doc.meta[cond.field];
      if (cond.op === "exists") return value !== undefined && value !== "";
      if (value === undefined || cond.value === undefined) return false;
      if (cond.op === "eq") return String(value) === String(cond.value);
      return cond.op === "lt" ? value < cond.value : value > cond.value;
    }
    case "link":
      return doc.links.some(
        (link) =>
          link.entityType === cond.entityType &&
          (cond.to === undefined || link.entityId === (cond.to === "$entity" ? entity?.entityId : cond.to)),
      );
  }
}

function narrowDefaults(defaults: FolderDefaults, filter: Bedingung[], entity: EntityLink | null): FolderDefaults {
  let { typen } = defaults;
  const meta = { ...defaults.meta };
  const links = [...defaults.links];
  for (const cond of filter) {
    if (cond.kind === "typ") typen = typen.length ? typen.filter((t) => cond.in.includes(t)) : [...cond.in];
    if (cond.kind === "meta" && cond.op === "eq" && cond.value !== undefined) {
      (meta as Record<string, string | number>)[cond.field] = cond.value;
    }
    if (cond.kind === "link" && cond.to) {
      const id = cond.to === "$entity" ? entity?.entityId : cond.to;
      if (id && !links.some((l) => l.entityType === cond.entityType && l.entityId === id)) {
        links.push({ entityType: cond.entityType, entityId: id });
      }
    }
  }
  return { ...defaults, typen, meta, links };
}

/** Per (Sparte, Versicherer, Dokumenttyp) only the highest Jahr; older than the current year = "nicht aktuell". */
export function latestPerInsurer(docs: Dokument[], year: number) {
  const best = new Map<string, Dokument>();
  for (const doc of docs) {
    const insurer = doc.links.find((l) => l.entityType === "Versicherer")?.entityId ?? "";
    const key = `${doc.meta.sparte ?? ""}|${insurer}|${doc.dokumenttyp}`;
    const current = best.get(key);
    if (!current || (doc.meta.jahr ?? 0) > (current.meta.jahr ?? 0)) best.set(key, doc);
  }
  const latest = [...best.values()];
  return { latest, stale: latest.filter((doc) => (doc.meta.jahr ?? 0) < year).map((doc) => doc.id) };
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "de");

function folder(node: Knoten, name: string, pool: Dokument[], ctx: Ctx, values: PlaceholderValues, defaults: FolderDefaults) {
  const path = [...ctx.path, name];
  const consumed = new Set<string>();
  const children: FolderNode[] = [];
  for (const child of node.children) {
    const result = instantiate(child, { ...ctx, path, pool, values, defaults: { ...defaults, path } });
    result.consumed.forEach((id) => consumed.add(id));
    children.push(...result.folders);
  }
  const own = ctx.filtered ? pool.filter((doc) => !consumed.has(doc.id)) : [];
  own.forEach((doc) => consumed.add(doc.id));
  const node_: FolderNode = {
    key: path.join("/"),
    name,
    path,
    nodeId: node.id,
    templateId: ctx.templateId,
    entity: ctx.entity,
    docs: own.sort(byName),
    staleIds: own.filter((doc) => ctx.stale.has(doc.id)).map((doc) => doc.id),
    count: 0,
    children,
    permissions: node.permissions,
    defaults: { ...defaults, path },
  };
  return { folder: node_, consumed };
}

function instantiate(node: Knoten, ctx: Ctx): { folders: FolderNode[]; consumed: Set<string> } {
  let pool = ctx.pool.filter((doc) => node.filter.every((cond) => matches(doc, cond, ctx.entity)));
  let stale = ctx.stale;
  // Older years left out by "latest only" are taken by this node too, so they never fall back into the parent.
  const hidden: string[] = [];
  if (node.latestOnly) {
    const latest = latestPerInsurer(pool, ctx.year);
    const kept = new Set(latest.latest.map((d) => d.id));
    pool.forEach((d) => (kept.has(d.id) ? null : hidden.push(d.id)));
    pool = latest.latest;
    stale = new Set([...ctx.stale, ...latest.stale]);
  }
  const defaults = narrowDefaults(ctx.defaults, node.filter, ctx.entity);
  const inner = { ...ctx, stale, filtered: ctx.filtered || node.filter.length > 0 || Boolean(node.groupBy) };

  if (!node.groupBy) {
    const name = fillSegment(node.name, ctx.values).text;
    const made = folder(node, name, pool, inner, ctx.values, defaults);
    hidden.forEach((id) => made.consumed.add(id));
    return { folders: [made.folder], consumed: made.consumed };
  }

  const groupBy = node.groupBy;
  const groups = new Map<string, Dokument[]>();
  for (const doc of pool) {
    const value =
      groupBy.kind === "meta" ? doc.meta[groupBy.field] : doc.links.find((l) => l.entityType === groupBy.entityType)?.entityId;
    if (value === undefined || value === "") continue;
    const key = String(value);
    groups.set(key, [...(groups.get(key) ?? []), doc]);
  }
  const folders: FolderNode[] = [];
  const consumed = new Set<string>();
  for (const [value, docs] of groups) {
    let values: PlaceholderValues;
    let groupDefaults: FolderDefaults;
    if (groupBy.kind === "meta") {
      const typed = groupBy.field === "jahr" ? Number(value) : value;
      values = { ...ctx.values, [groupBy.field === "jahr" ? "Jahr" : "Sparte"]: typed };
      groupDefaults = { ...defaults, meta: { ...defaults.meta, [groupBy.field]: typed } };
    } else {
      const link = { entityType: groupBy.entityType, entityId: value };
      values = { ...ctx.values, ...entityValues(link, ctx.entities) };
      groupDefaults = { ...defaults, links: [...defaults.links, link] };
    }
    const made = folder(node, fillSegment(node.name, values).text, docs, inner, values, groupDefaults);
    made.consumed.forEach((id) => consumed.add(id));
    folders.push(made.folder);
  }
  folders.sort(groupBy.kind === "meta" && groupBy.field === "jahr" ? (a, b) => b.name.localeCompare(a.name) : byName);
  hidden.forEach((id) => consumed.add(id));
  return { folders, consumed };
}

/** Adds a folder to a list, merging it with a folder of the same path (two templates under "Unternehmen" …). */
function mergeInto(list: FolderNode[], next: FolderNode) {
  const existing = list.find((f) => f.key === next.key);
  if (!existing) {
    list.push(next);
    return;
  }
  existing.docs.push(...next.docs.filter((doc) => !existing.docs.some((d) => d.id === doc.id)));
  existing.staleIds.push(...next.staleIds);
  existing.permissions = [...existing.permissions, ...next.permissions];
  for (const child of next.children) mergeInto(existing.children, child);
}

function mountFolder(roots: FolderNode[], mount: string[]): FolderNode[] {
  let list = roots;
  const path: string[] = [];
  for (const segment of mount.map(safeSegment)) {
    path.push(segment);
    let existing = list.find((f) => f.name === segment);
    if (!existing) {
      existing = {
        key: path.join("/"),
        name: segment,
        path: [...path],
        nodeId: null,
        templateId: null,
        entity: null,
        docs: [],
        staleIds: [],
        count: 0,
        children: [],
        permissions: [],
        defaults: { path: [...path], typen: [], meta: {}, links: [] },
      };
      list.push(existing);
    }
    list = existing.children;
  }
  return list;
}

function countAndSort(list: FolderNode[], sortList: boolean) {
  if (sortList) list.sort(byName);
  for (const f of list) {
    // Template children keep the order the admin defined; mounted instances are sorted by name.
    countAndSort(f.children, f.nodeId === null);
    const ids = new Set(f.docs.map((d) => d.id));
    const below = (node: FolderNode) => node.children.forEach((c) => (c.docs.forEach((d) => ids.add(d.id)), below(c)));
    below(f);
    f.count = ids.size;
  }
}

function instancesOf(vorlage: Ordnervorlage, entities: DmsEntity[]) {
  if (vorlage.scope === "global") return [null];
  return entities.filter((e) => e.type === vorlage.scope).sort(byName);
}

/**
 * The folder tree of an Ansicht. Each template becomes one tree (global) or one tree per entity of its type,
 * created automatically for every Partner/Kunde in Stammdaten. Documents without a Dokumenttyp (Eingang) never show.
 */
export function buildView(state: Pick<DmsState, "vorlagen" | "entities" | "documents" | "today">, ansicht: Ansicht, docs = state.documents) {
  const roots: FolderNode[] = [];
  const pool = docs.filter((doc) => doc.dokumenttyp !== null);
  const year = Number(state.today.slice(0, 4));
  for (const vorlage of state.vorlagen.filter((v) => v.ansichten.includes(ansicht))) {
    const target = mountFolder(roots, vorlage.mount);
    const mountPath = vorlage.mount.map(safeSegment);
    for (const entity of instancesOf(vorlage, state.entities)) {
      const link = entity ? { entityType: entity.type, entityId: entity.id } : null;
      const result = instantiate(vorlage.root, {
        path: mountPath,
        pool,
        values: entityValues(link, state.entities),
        entity: link,
        defaults: { path: mountPath, typen: [], meta: {}, links: [] },
        templateId: vorlage.id,
        stale: new Set(),
        entities: state.entities,
        year,
        filtered: false,
      });
      result.folders.forEach((f) => mergeInto(target, f));
    }
  }
  countAndSort(roots, false);
  return roots;
}

export function walk(list: FolderNode[], visit: (folder: FolderNode) => void) {
  for (const f of list) {
    visit(f);
    walk(f.children, visit);
  }
}

export function findFolder(list: FolderNode[], path: string[]): FolderNode | null {
  let found: FolderNode | null = null;
  walk(list, (f) => {
    if (!found && f.key === path.join("/")) found = f;
  });
  return found;
}

/** Every folder a document shows up in (one record, possibly several views and folders). */
export function locateDocument(list: FolderNode[], docId: string) {
  const paths: string[][] = [];
  walk(list, (f) => {
    if (f.docs.some((d) => d.id === docId)) paths.push(f.path);
  });
  return paths;
}

/** "Eingang / Nicht zugeordnet": uploads no rule could place. They never disappear. */
export function eingang(state: Pick<DmsState, "documents">) {
  return state.documents.filter((doc) => doc.dokumenttyp === null);
}
