import type {
  Ablageregel,
  Ansicht,
  DmsState,
  DocMeta,
  Dokument,
  Dokumenttyp,
  EntityLink,
  Gruppe,
  Knoten,
  Ordnervorlage,
} from "../../types/dms";
import { linkChain } from "./placeholders";
import { buildView, locateDocument } from "./views";
import { applyAutoTransitions } from "./workflow";

/** Pure edits of the DMS configuration. The store calls them; the tests use them directly. */

let idCounter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter += 1)}`;

// ---------------------------------------------------------------- Ordnervorlagen

export function findNode(root: Knoten, id: string): Knoten | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function mapTree(root: Knoten, fn: (node: Knoten) => Knoten): Knoten {
  const next = fn(root);
  return { ...next, children: next.children.map((child) => mapTree(child, fn)) };
}

export function editVorlage(state: DmsState, vorlageId: string, fn: (vorlage: Ordnervorlage) => Ordnervorlage): DmsState {
  return { ...state, vorlagen: state.vorlagen.map((v) => (v.id === vorlageId ? fn(v) : v)) };
}

export function updateNode(state: DmsState, vorlageId: string, nodeId: string, patch: Partial<Omit<Knoten, "id" | "children">>) {
  return editVorlage(state, vorlageId, (v) => ({ ...v, root: mapTree(v.root, (n) => (n.id === nodeId ? { ...n, ...patch } : n)) }));
}

/** `id` can be made before the state update, so a StrictMode double call keeps the same id. */
export function addChildNode(state: DmsState, vorlageId: string, parentId: string, name = "Neuer Ordner", id = newId("n")) {
  const node: Knoten = { id, name, filter: [], permissions: [], children: [] };
  const next = editVorlage(state, vorlageId, (v) => ({
    ...v,
    root: mapTree(v.root, (n) => (n.id === parentId ? { ...n, children: [...n.children, node] } : n)),
  }));
  return { state: next, nodeId: node.id };
}

export function removeNode(state: DmsState, vorlageId: string, nodeId: string) {
  return editVorlage(state, vorlageId, (v) =>
    v.root.id === nodeId ? v : { ...v, root: mapTree(v.root, (n) => ({ ...n, children: n.children.filter((c) => c.id !== nodeId) })) },
  );
}

function parentOf(root: Knoten, id: string): Knoten | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = parentOf(child, id);
    if (found) return found;
  }
  return null;
}

/** Up/down among siblings; "in" = into the sibling above; "out" = next to the parent. */
export function moveNode(state: DmsState, vorlageId: string, nodeId: string, dir: "up" | "down" | "in" | "out") {
  return editVorlage(state, vorlageId, (v) => {
    const parent = parentOf(v.root, nodeId);
    if (!parent) return v;
    const index = parent.children.findIndex((c) => c.id === nodeId);
    const node = parent.children[index];
    if (dir === "up" || dir === "down") {
      const target = dir === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= parent.children.length) return v;
      const children = [...parent.children];
      [children[index], children[target]] = [children[target], children[index]];
      return { ...v, root: mapTree(v.root, (n) => (n.id === parent.id ? { ...n, children } : n)) };
    }
    if (dir === "in") {
      if (index === 0) return v;
      const sibling = parent.children[index - 1];
      return {
        ...v,
        root: mapTree(v.root, (n) => {
          if (n.id === parent.id) return { ...n, children: n.children.filter((c) => c.id !== nodeId) };
          if (n.id === sibling.id) return { ...n, children: [...n.children, node] };
          return n;
        }),
      };
    }
    const grand = parentOf(v.root, parent.id);
    if (!grand) return v;
    return {
      ...v,
      root: mapTree(v.root, (n) => {
        if (n.id === parent.id) return { ...n, children: n.children.filter((c) => c.id !== nodeId) };
        if (n.id === grand.id) {
          const at = n.children.findIndex((c) => c.id === parent.id);
          const children = [...n.children];
          children.splice(at + 1, 0, node);
          return { ...n, children };
        }
        return n;
      }),
    };
  });
}

export function patchVorlage(state: DmsState, vorlageId: string, patch: Partial<Pick<Ordnervorlage, "name" | "ansichten" | "mount">>) {
  return editVorlage(state, vorlageId, (v) => ({ ...v, ...patch }));
}

// ---------------------------------------------------------------- Dokumenttypen

export function updateTyp(state: DmsState, typId: string, fn: (typ: Dokumenttyp) => Dokumenttyp): DmsState {
  return { ...state, dokumenttypen: state.dokumenttypen.map((t) => (t.id === typId ? fn(t) : t)) };
}

export function addTyp(state: DmsState, name: string, id = newId("typ")) {
  const typ: Dokumenttyp = { id, name, requiredFields: [], workflow: { states: [], transitions: [], auto: [] } };
  return { state: { ...state, dokumenttypen: [...state.dokumenttypen, typ] }, typId: typ.id };
}

/** Renaming or removing a state keeps transitions and documents consistent. */
export function renameState(state: DmsState, typId: string, from: string, to: string): DmsState {
  const swap = (s: string) => (s === from ? to : s);
  const next = updateTyp(state, typId, (t) => ({
    ...t,
    workflow: {
      states: t.workflow.states.map(swap),
      transitions: t.workflow.transitions.map((tr) => ({ from: swap(tr.from), to: swap(tr.to) })),
      auto: t.workflow.auto.map((a) => ({ ...a, from: a.from.map(swap), to: swap(a.to) })),
    },
  }));
  return { ...next, documents: next.documents.map((d) => (d.dokumenttyp === typId && d.status === from ? { ...d, status: to } : d)) };
}

export function removeState(state: DmsState, typId: string, name: string): DmsState {
  const typ = state.dokumenttypen.find((t) => t.id === typId);
  if (!typ) return state;
  const rest = typ.workflow.states.filter((s) => s !== name);
  const next = updateTyp(state, typId, (t) => ({
    ...t,
    workflow: {
      states: rest,
      transitions: t.workflow.transitions.filter((tr) => tr.from !== name && tr.to !== name),
      auto: t.workflow.auto.map((a) => ({ ...a, from: a.from.filter((f) => f !== name) })).filter((a) => a.to !== name && a.from.length > 0),
    },
  }));
  return {
    ...next,
    documents: next.documents.map((d) => (d.dokumenttyp === typId && d.status === name ? { ...d, status: rest[0] ?? null } : d)),
  };
}

// ---------------------------------------------------------------- Ablageregeln

export function upsertRegel(state: DmsState, rule: Ablageregel): DmsState {
  const exists = state.regeln.some((r) => r.id === rule.id);
  return { ...state, regeln: exists ? state.regeln.map((r) => (r.id === rule.id ? rule : r)) : [...state.regeln, rule] };
}

export function removeRegel(state: DmsState, ruleId: string): DmsState {
  return { ...state, regeln: state.regeln.filter((r) => r.id !== ruleId) };
}

// ---------------------------------------------------------------- Gruppen

export function setMembers(state: DmsState, groupId: string, members: string[]): DmsState {
  return { ...state, groups: state.groups.map((g) => (g.id === groupId ? { ...g, members } : g)) };
}

export function addGroup(state: DmsState, name: string, id = newId("g")) {
  const group: Gruppe = { id, name, members: [] };
  return { state: { ...state, groups: [...state.groups, group] }, groupId: group.id };
}

// ---------------------------------------------------------------- Eingang

/** Assigning an Eingang item gives the same record its type, links and metadata; nothing is copied. */
export function assignDokument(state: DmsState, docId: string, input: { dokumenttyp: string; link: EntityLink | null; meta: DocMeta }): DmsState {
  const typ = state.dokumenttypen.find((t) => t.id === input.dokumenttyp);
  if (!typ) return state;
  return {
    ...state,
    documents: state.documents.map((doc) => {
      if (doc.id !== docId) return doc;
      const links = [...doc.links];
      for (const link of linkChain(input.link, state.entities)) {
        if (!links.some((l) => l.entityType === link.entityType && l.entityId === link.entityId)) links.push(link);
      }
      const next: Dokument = {
        ...doc,
        dokumenttyp: typ.id,
        status: typ.workflow.states[0] ?? null,
        links,
        meta: { ...doc.meta, ...input.meta },
      };
      return applyAutoTransitions(next, typ, state.today);
    }),
  };
}

/**
 * "Als Regel speichern": a rule for the upload context the item came from, so the next upload like it is placed
 * automatically. The target path is taken from an existing rule for that Dokumenttyp when there is one.
 */
export function ruleFromDokument(state: DmsState, doc: Dokument, dokumenttyp: string, entityType: Ablageregel["entityType"]): Ablageregel {
  const typ = state.dokumenttypen.find((t) => t.id === dokumenttyp);
  const template = state.regeln.find((r) => r.dokumenttyp === dokumenttyp && r.entityType === entityType);
  return {
    id: newId("r"),
    name: `${doc.upload_context.source} → ${typ?.name ?? dokumenttyp}`,
    source: doc.upload_context.source,
    entityType,
    slot: doc.upload_context.slot || null,
    requires: typ?.requiredFields ?? [],
    dokumenttyp,
    targetPath: template?.targetPath ?? (entityType ? `{${entityType}.Name}` : "Eingang"),
    priority: 1,
  };
}

// ---------------------------------------------------------------- where a document would show up

/**
 * Where a document with this type, links and metadata shows up, per Ansicht. Folders are filters, so this is the
 * truth; the Ablageregel's target path is only the expectation. The Testen panel warns when they differ.
 */
export function predictLocation(
  state: DmsState,
  input: { dokumenttyp: string; links: EntityLink[]; meta: DocMeta },
): Record<Ansicht, string[][]> {
  const probe: Dokument = {
    id: "__probe__",
    name: "Testdokument",
    versions: [],
    dokumenttyp: input.dokumenttyp,
    status: null,
    links: input.links,
    meta: input.meta,
    upload_context: { source: "dms.dragdrop", entityType: null, entityId: null, slot: "", knownMetadata: {} },
    vertraulich: null,
    createdAt: state.today,
    createdBy: state.activePerson,
  };
  const docs = [...state.documents, probe];
  return {
    Verwaltung: locateDocument(buildView({ ...state, documents: docs }, "Verwaltung"), probe.id),
    Standard: locateDocument(buildView({ ...state, documents: docs }, "Standard"), probe.id),
  };
}

export function updateDocument(state: DmsState, docId: string, patch: Partial<Pick<Dokument, "kommentar" | "name">>): DmsState {
  return { ...state, documents: state.documents.map((d) => (d.id === docId ? { ...d, ...patch } : d)) };
}
