import type { Ablageregel, Ansicht, DmsState, EntityType, Knoten, Ordnervorlage, QuellenLink, UploadSource, Verbindung } from "../../types/dms";
import { editVorlage, findNode, newId } from "./admin";
import { safeSegment } from "./placeholders";
import { sourceItem, sourceLabel } from "./sources";
import { buildView, childrenOf, instancesOfNode, mergeByName, nodeIndex } from "./views";

/**
 * Ordner Zuordnung: upload points are linked to folders. Each link is the Ablageregel for that upload point,
 * so there is nothing to keep in sync: the rules are derived from the folder structure.
 */

export type LinkPlace = {
  link: QuellenLink;
  vorlage: Ordnervorlage;
  node: Knoten;
  /** Template path, e.g. ["Partner", "{Partner.Name}", "Anhänge"]. */
  path: string[];
  entityType: EntityType | null;
};

function walkTemplate(
  vorlage: Ordnervorlage,
  visit: (node: Knoten, path: string[], entityType: EntityType | null) => void,
  nodes: Map<string, Knoten>,
) {
  const go = (node: Knoten, parent: string[], entityType: EntityType | null, depth: number) => {
    if (depth > 12) return;
    const path = [...parent, node.name];
    const here = node.groupBy?.kind === "link" ? node.groupBy.entityType : entityType;
    visit(node, path, here);
    // Children of a linked folder are visited through the link, so their rules get this folder's path.
    childrenOf(node, nodes).forEach((c) => go(c, path, here, depth + 1));
  };
  go(vorlage.root, vorlage.mount.map(safeSegment), null, 0);
}

/** Where each upload point is linked, per Ansicht (Verwaltung first, so its path is the one shown). */
export function linkPlaces(state: Pick<DmsState, "vorlagen">, ansicht?: Ansicht): LinkPlace[] {
  const nodes = nodeIndex(state.vorlagen);
  const order = [...state.vorlagen].sort((a, b) => Number(b.ansichten.includes("Verwaltung")) - Number(a.ansichten.includes("Verwaltung")));
  const places: LinkPlace[] = [];
  for (const vorlage of order) {
    if (ansicht && !vorlage.ansichten.includes(ansicht)) continue;
    walkTemplate(
      vorlage,
      (node, path, entityType) => {
        // Only the node itself carries the link (a linked folder's children are not visited twice).
        for (const link of node.quellen ?? []) {
          if (!places.some((p) => p.node.id === node.id && p.link.source === link.source && p.link.slot === link.slot)) {
            places.push({ link, vorlage, node, path, entityType });
          }
        }
      },
      nodes,
    );
  }
  return places;
}

/** The levels below a linked folder a file still goes through: {Sparte}, {Jahr}, folders named after a value … */
function levelsBelow(node: Knoten, nodes: Map<string, Knoten>): string[] {
  const out: string[] = [];
  let current = node;
  for (let i = 0; i < 6; i += 1) {
    const kids = childrenOf(current, nodes);
    if (kids.length === 1 && kids[0].groupBy) {
      out.push(kids[0].name);
      current = kids[0];
    } else if (kids.length > 0 && kids.every((k) => k.nameMatches && k.nameMatches === kids[0].nameMatches)) {
      out.push(kids[0].nameMatches === "jahr" ? "{Jahr}" : "{Sparte}");
      current = kids[0];
    } else break;
  }
  return out;
}

/** The rules uploads use: one per link (priority 10), plus the configured ones (DMS drag & drop). */
export function effectiveRules(state: Pick<DmsState, "vorlagen" | "regeln">): Ablageregel[] {
  const nodes = nodeIndex(state.vorlagen);
  const derived = linkPlaces(state).map(
    (place): Ablageregel => ({
      id: `link:${place.node.id}:${place.link.source}:${place.link.slot ?? "*"}`,
      name: sourceLabel(place.link.source, place.link.slot),
      source: place.link.source,
      // The upload point's own entity (a Schaden upload knows its Schaden; the Kunde comes through it).
      entityType: sourceItem(place.link.source, place.link.slot)?.entityType ?? place.entityType,
      slot: place.link.slot,
      requires: [],
      dokumenttyp: place.link.dokumenttyp,
      targetPath: [...place.path, ...levelsBelow(place.node, nodes)].join("/"),
      priority: 10,
    }),
  );
  return [...derived, ...state.regeln];
}

function hasEntityLevel(vorlage: Ordnervorlage, nodeId: string, entityType: EntityType) {
  const chain: Knoten[] = [];
  const find = (node: Knoten, trail: Knoten[]): boolean => {
    const next = [...trail, node];
    if (node.id === nodeId) {
      chain.push(...next);
      return true;
    }
    return node.children.some((c) => find(c, next));
  };
  find(vorlage.root, []);
  return chain.some((n) => n.groupBy?.kind === "link" && n.groupBy.entityType === entityType);
}

const sameLink = (a: Pick<QuellenLink, "source" | "slot">, b: Pick<QuellenLink, "source" | "slot">) => a.source === b.source && a.slot === b.slot;

function stripLink(node: Knoten, link: Pick<QuellenLink, "source" | "slot">): Knoten {
  return {
    ...node,
    quellen: (node.quellen ?? []).filter((q) => !sameLink(q, link)),
    children: node.children.map((c) => stripLink(c, link)),
  };
}

/**
 * Drops an upload point on a folder; it can be linked to several folders (the file is stored once and shows in
 * each). When the folder has no level for its entity yet (e.g. "Partner" without "{Partner.Name}"), that level
 * is created and the link goes there. In one branch the deepest linked folder takes the file, so a link on
 * "Partnerdaten Anhänge" below "{Partner.Name}" wins over one on "{Partner.Name}".
 */
export function linkSource(
  state: DmsState,
  vorlageId: string,
  nodeId: string,
  link: { source: UploadSource; slot: string | null; dokumenttyp?: string },
  levelId = newId("n"),
): { state: DmsState; nodeId: string } {
  const item = sourceItem(link.source, link.slot);
  const quelle: QuellenLink = { source: link.source, slot: link.slot, dokumenttyp: link.dokumenttyp ?? item?.dokumenttyp ?? "anhang" };
  let next: DmsState = state;
  let target = nodeId;
  const vorlage = next.vorlagen.find((v) => v.id === vorlageId);
  const entityType = item?.entityType ?? null;
  if (vorlage && entityType && !hasEntityLevel(vorlage, nodeId, entityType)) {
    const parent = findNode(vorlage.root, nodeId);
    const existing = parent?.children.find((c) => c.groupBy?.kind === "link" && c.groupBy.entityType === entityType);
    if (existing) target = existing.id;
    else {
      const level: Knoten = {
        id: levelId,
        name: `{${entityType === "Versicherer" ? "Versicherer" : entityType === "Schaden" ? "Schaden.Nummer" : `${entityType}.Name`}}`,
        filter: [],
        groupBy: { kind: "link", entityType, allEntities: true },
        permissions: [],
        children: [],
      };
      target = level.id;
      next = editVorlage(next, vorlageId, (v) => ({ ...v, root: mapNode(v.root, nodeId, (n) => ({ ...n, children: [...n.children, level] })) }));
    }
  }
  next = editVorlage(next, vorlageId, (v) => ({
    ...v,
    root: mapNode(v.root, target, (n) => ({
      ...n,
      quellen: (n.quellen ?? []).some((q) => sameLink(q, quelle)) ? n.quellen : [...(n.quellen ?? []), quelle],
    })),
  }));
  return { state: next, nodeId: target };
}

function mapNode(root: Knoten, id: string, fn: (n: Knoten) => Knoten): Knoten {
  const next = root.id === id ? fn(root) : root;
  return { ...next, children: next.children.map((c) => mapNode(c, id, fn)) };
}

/** Removes the link from one folder, or (without `nodeId`) from every folder. */
export function unlinkSource(state: DmsState, link: Pick<QuellenLink, "source" | "slot">, nodeId?: string): DmsState {
  if (!nodeId) return { ...state, vorlagen: state.vorlagen.map((v) => ({ ...v, root: stripLink(v.root, link) })) };
  return {
    ...state,
    vorlagen: state.vorlagen.map((v) => ({
      ...v,
      root: mapNode(v.root, nodeId, (n) => ({ ...n, quellen: (n.quellen ?? []).filter((q) => !sameLink(q, link)) })),
    })),
  };
}

/** Every folder an upload point is linked to. */
export function placesOf(state: Pick<DmsState, "vorlagen">, link: Pick<QuellenLink, "source" | "slot">) {
  return linkPlaces(state).filter((p) => sameLink(p.link, link));
}

export function setLinkTyp(state: DmsState, vorlageId: string, nodeId: string, link: Pick<QuellenLink, "source" | "slot">, dokumenttyp: string) {
  return editVorlage(state, vorlageId, (v) => ({
    ...v,
    root: mapNode(v.root, nodeId, (n) => ({ ...n, quellen: (n.quellen ?? []).map((q) => (sameLink(q, link) ? { ...q, dokumenttyp } : q)) })),
  }));
}

/** A folder that takes over the sub-folders of another one (by name), with its own documents. */
export function setFolderLink(state: DmsState, vorlageId: string, nodeId: string, targetId: string | null) {
  return editVorlage(state, vorlageId, (v) => ({ ...v, root: mapNode(v.root, nodeId, (n) => ({ ...n, linkTo: targetId ?? undefined })) }));
}

/** A new top-level folder; it shows in both Ansichten (Spaces shows the outcome of each). */
export function addTopFolder(state: DmsState, ansichten: Ansicht[], name: string, ids = { vorlage: newId("tpl"), node: newId("n") }) {
  const vorlage: Ordnervorlage = {
    id: ids.vorlage,
    name,
    ansichten,
    scope: "global",
    mount: [],
    root: { id: ids.node, name, filter: [], permissions: [{ principal: { kind: "Rolle", id: "DMS-Admin" }, level: "Verwalten" }], children: [] },
  };
  return { state: { ...state, vorlagen: [...state.vorlagen, vorlage] }, vorlageId: vorlage.id, nodeId: vorlage.root.id };
}

export function removeTopFolder(state: DmsState, vorlageId: string) {
  return { ...state, vorlagen: state.vorlagen.filter((v) => v.id !== vorlageId) };
}

/** Every folder a folder link can point to, with its template path (optionally of one Ansicht). */
export function linkTargets(state: Pick<DmsState, "vorlagen">, ansicht?: Ansicht) {
  const nodes = nodeIndex(state.vorlagen);
  const out: { id: string; path: string[] }[] = [];
  for (const vorlage of state.vorlagen.filter((v) => !ansicht || v.ansichten.includes(ansicht))) {
    const go = (node: Knoten, parent: string[]) => {
      const path = [...parent, node.name];
      out.push({ id: node.id, path });
      node.children.forEach((c) => go(c, path));
    };
    go(vorlage.root, vorlage.mount);
  }
  return out.filter((t) => nodes.has(t.id));
}

// ---------------------------------------------------------------- Ordner verbinden

/** Connects (or updates the connection to) another folder; `include` = chosen sub-folder name paths, null = all. */
export function setVerbindung(state: DmsState, vorlageId: string, nodeId: string, verbindung: Verbindung) {
  return editVorlage(state, vorlageId, (v) => ({
    ...v,
    root: mapNode(v.root, nodeId, (n) => ({
      ...n,
      verbindungen: [...(n.verbindungen ?? []).filter((x) => x.nodeId !== verbindung.nodeId), verbindung],
    })),
  }));
}

export function removeVerbindung(state: DmsState, vorlageId: string, nodeId: string, sourceNodeId: string) {
  return editVorlage(state, vorlageId, (v) => ({
    ...v,
    root: mapNode(v.root, nodeId, (n) => ({ ...n, verbindungen: (n.verbindungen ?? []).filter((x) => x.nodeId !== sourceNodeId) })),
  }));
}

/**
 * What connecting a folder brings along: every place it appears (e.g. the Fachbereiche of five insurers) and its
 * recurring sub-folders merged by name, with how often each occurs.
 */
export function connectionPreview(state: DmsState, sourceNodeId: string) {
  const vorlage = state.vorlagen.find((v) => findNode(v.root, sourceNodeId));
  const ansicht: Ansicht = vorlage?.ansichten.includes("Verwaltung") ? "Verwaltung" : "Standard";
  const view = buildView(state, ansicht);
  const instances = instancesOfNode(view, sourceNodeId);
  return { ansicht, instances, tree: mergeByName(instances), docs: instances.reduce((n, f) => n + f.count, 0) };
}
