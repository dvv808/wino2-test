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
  QuellenLink,
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
  /** Every template node by id, for folder links. */
  nodes: Map<string, Knoten>;
  /** Upload points linked somewhere in this Ansicht: their files show only where they are linked. */
  linked: QuellenLink[];
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

export function quelleMatches(doc: Dokument, q: QuellenLink) {
  return doc.upload_context.source === q.source && (q.slot === null || doc.upload_context.slot === q.slot);
}

/** The sub-folders a node shows: its own, or those of the folder it links to (followed a few steps, no loops). */
export function childrenOf(node: Knoten, nodes: Map<string, Knoten>): Knoten[] {
  let current = node;
  const seen = new Set([node.id]);
  while (current.linkTo && nodes.has(current.linkTo) && !seen.has(current.linkTo)) {
    current = nodes.get(current.linkTo)!;
    seen.add(current.id);
  }
  return current.children;
}

/** The node's own conditions; "name = value" folders (e.g. "Feuerversicherung") add a metadata condition. */
function conditionsOf(node: Knoten, name: string): Bedingung[] {
  if (!node.nameMatches) return node.filter;
  const value = node.nameMatches === "jahr" ? Number(name) : name;
  return [...node.filter, { kind: "meta", field: node.nameMatches, op: "eq", value }];
}

/**
 * Whether a document belongs to a folder. "What" it holds is a Dokumenttyp filter or a linked upload point
 * (either is enough); every other condition (links, metadata, status) must hold as well.
 */
function nodeMatches(doc: Dokument, node: Knoten, conds: Bedingung[], entity: EntityLink | null, linked: QuellenLink[]) {
  const typ = conds.filter((c) => c.kind === "typ");
  if (!conds.filter((c) => c.kind !== "typ").every((c) => matches(doc, c, entity))) return false;
  const quellen = node.quellen ?? [];
  if (quellen.some((q) => quelleMatches(doc, q))) return true;
  if (!typ.length) return !quellen.length;
  // A file from an upload point linked elsewhere in this Ansicht is not taken by a Dokumenttyp filter.
  if (linked.some((q) => quelleMatches(doc, q))) return false;
  return typ.every((c) => matches(doc, c, entity));
}

/** Every upload point linked in a node or below it. */
export function subtreeQuellen(node: Knoten, nodes: Map<string, Knoten>, depth = 0): QuellenLink[] {
  if (depth > 12) return [];
  return [...(node.quellen ?? []), ...childrenOf(node, nodes).flatMap((c) => subtreeQuellen(c, nodes, depth + 1))];
}

function narrowDefaults(defaults: FolderDefaults, filter: Bedingung[], entity: EntityLink | null, quellen: QuellenLink[] = []): FolderDefaults {
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
  // A folder with only linked upload points: a drop here gets their Dokumenttyp.
  if (!filter.some((c) => c.kind === "typ") && quellen.length) typen = [...new Set(quellen.map((q) => q.dokumenttyp))];
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
  const kids = childrenOf(node, ctx.nodes);
  // A file from a linked upload point goes only to the sub-folder it is linked to, never also to a sibling
  // that would take it by its Dokumenttyp.
  const claims = kids.map((child) => {
    const quellen = subtreeQuellen(child, ctx.nodes);
    return new Set(quellen.length ? pool.filter((d) => quellen.some((q) => quelleMatches(d, q))).map((d) => d.id) : []);
  });
  kids.forEach((child, index) => {
    const own = claims[index];
    const childPool = pool.filter((d) => own.has(d.id) || !claims.some((c, j) => j !== index && c.has(d.id)));
    const result = instantiate(child, { ...ctx, path, pool: childPool, values, defaults: { ...defaults, path } });
    result.consumed.forEach((id) => consumed.add(id));
    children.push(...result.folders);
  });
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
  const staticName = node.groupBy ? "" : fillSegment(node.name, ctx.values).text;
  const conds = conditionsOf(node, staticName);
  let pool = ctx.pool.filter((doc) => nodeMatches(doc, node, conds, ctx.entity, ctx.linked));
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
  const defaults = narrowDefaults(ctx.defaults, conds, ctx.entity, node.quellen);
  const inner = {
    ...ctx,
    stale,
    // A level such as {Versicherer} only sorts; it does not make its folders hold leftover documents.
    filtered: ctx.filtered || conds.length > 0 || Boolean(node.quellen?.length),
  };

  if (!node.groupBy) {
    const made = folder(node, staticName, pool, inner, ctx.values, defaults);
    hidden.forEach((id) => made.consumed.add(id));
    return { folders: [made.folder], consumed: made.consumed };
  }

  const groupBy = node.groupBy;
  const groups = new Map<string, Dokument[]>();
  if (groupBy.kind === "link" && groupBy.allEntities) {
    // One folder for every entity in Stammdaten, also without documents. A Schaden only under its own Kunde.
    for (const e of [...ctx.entities].filter((x) => x.type === groupBy.entityType).sort(byName)) {
      const parent = e.parent;
      if (parent && ctx.entity && parent.entityType === ctx.entity.entityType && parent.entityId !== ctx.entity.entityId) continue;
      groups.set(e.id, []);
    }
  }
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
    let groupCtx = inner;
    if (groupBy.kind === "meta") {
      const typed = groupBy.field === "jahr" ? Number(value) : value;
      values = { ...ctx.values, [groupBy.field === "jahr" ? "Jahr" : "Sparte"]: typed };
      groupDefaults = { ...defaults, meta: { ...defaults.meta, [groupBy.field]: typed } };
    } else {
      const link = { entityType: groupBy.entityType, entityId: value };
      values = { ...ctx.values, ...entityValues(link, ctx.entities) };
      groupDefaults = { ...defaults, links: [...defaults.links, link] };
      groupCtx = { ...inner, entity: link };
    }
    const made = folder(node, fillSegment(node.name, values).text, docs, groupCtx, values, groupDefaults);
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

/** Every node of every template by id (a folder link may point into another template). */
export function nodeIndex(vorlagen: Ordnervorlage[]) {
  const map = new Map<string, Knoten>();
  const add = (n: Knoten) => {
    map.set(n.id, n);
    n.children.forEach(add);
  };
  vorlagen.forEach((v) => add(v.root));
  return map;
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
  const nodes = nodeIndex(state.vorlagen);
  const linked = state.vorlagen.filter((v) => v.ansichten.includes(ansicht)).flatMap((v) => subtreeQuellen(v.root, nodes));
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
        nodes,
        linked,
      });
      result.folders.forEach((f) => mergeInto(target, f));
    }
  }
  applyVerbindungen(roots, nodes);
  countAndSort(roots, false);
  return roots;
}

/** Sub-folders of several folders merged by name: the same "Transportversicherung" everywhere becomes one. */
export type MergedFolder = {
  name: string;
  /** Name path below the connected folder, e.g. "Transportversicherung/2026". */
  rel: string;
  /** In how many of the connected places this sub-folder exists. */
  occurrences: number;
  docs: Dokument[];
  staleIds: string[];
  children: MergedFolder[];
};

const byMergedName = (a: { name: string }, b: { name: string }) =>
  /^\d+$/.test(a.name) && /^\d+$/.test(b.name) ? Number(b.name) - Number(a.name) : a.name.localeCompare(b.name, "de");

export function mergeByName(folders: FolderNode[], rel = ""): MergedFolder[] {
  const groups = new Map<string, FolderNode[]>();
  for (const f of folders) for (const c of f.children) groups.set(c.name, [...(groups.get(c.name) ?? []), c]);
  return [...groups.entries()]
    .map(([name, list]) => {
      const here = rel ? `${rel}/${name}` : name;
      const docs = list.flatMap((f) => f.docs);
      return {
        name,
        rel: here,
        occurrences: list.length,
        docs: docs.filter((d, i) => docs.findIndex((x) => x.id === d.id) === i),
        staleIds: list.flatMap((f) => f.staleIds),
        children: mergeByName(list, here),
      };
    })
    .sort(byMergedName);
}

/** Every folder in a view built from one template node (e.g. all five "Versicherungen / … / Fachbereiche"). */
export function instancesOfNode(roots: FolderNode[], nodeId: string) {
  const out: FolderNode[] = [];
  walk(roots, (f) => {
    if (f.nodeId === nodeId) out.push(f);
  });
  return out;
}

/**
 * Ordner verbinden: a folder shows the files of another folder from every place it appears, with the chosen
 * sub-folders merged by name. Nothing is copied: the same records are listed in a second place.
 */
function applyVerbindungen(roots: FolderNode[], nodes: Map<string, Knoten>) {
  const targets: FolderNode[] = [];
  walk(roots, (f) => {
    if (f.nodeId && nodes.get(f.nodeId)?.verbindungen?.length) targets.push(f);
  });
  for (const target of targets) {
    for (const v of nodes.get(target.nodeId!)!.verbindungen!) {
      const sources = instancesOfNode(roots, v.nodeId).filter((f) => !f.key.startsWith(target.key));
      if (!sources.length) continue;
      const take = (rel: string) => v.include === null || v.include.includes(rel);
      const ownDocs = sources.flatMap((f) => f.docs);
      target.docs.push(...ownDocs.filter((d) => !target.docs.some((x) => x.id === d.id)));
      const attach = (list: MergedFolder[], parent: FolderNode) => {
        for (const m of list) {
          if (!take(m.rel)) continue;
          const path = [...parent.path, m.name];
          let child = parent.children.find((c) => c.name === m.name);
          if (!child) {
            child = {
              key: path.join("/"),
              name: m.name,
              path,
              nodeId: `${target.nodeId}~${m.rel}`,
              templateId: target.templateId,
              entity: null,
              docs: [],
              staleIds: [],
              count: 0,
              children: [],
              permissions: [],
              defaults: { path, typen: [], meta: {}, links: [] },
            };
            parent.children.push(child);
          }
          child.docs.push(...m.docs.filter((d) => !child!.docs.some((x) => x.id === d.id)));
          child.staleIds.push(...m.staleIds);
          attach(m.children, child);
        }
      };
      attach(mergeByName(sources), target);
      target.children.sort(byMergedName);
    }
  }
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
