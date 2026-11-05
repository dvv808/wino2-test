import type { DmsState, Dokument, Dokumenttyp } from "../../types/dms";

/** States a document can move to by hand from its current state. */
export function nextStates(typ: Dokumenttyp | undefined, from: string | null) {
  if (!typ || from === null) return [];
  return typ.workflow.transitions.filter((t) => t.from === from).map((t) => t.to);
}

export function canTransition(typ: Dokumenttyp | undefined, from: string | null, to: string) {
  return nextStates(typ, from).includes(to);
}

/** Automatic transitions, e.g. Aktiv → Abgelaufen when gueltig_bis lies strictly before today. Pure. */
export function applyAutoTransitions(doc: Dokument, typ: Dokumenttyp | undefined, today: string): Dokument {
  if (!typ || doc.status === null) return doc;
  let status = doc.status;
  for (const rule of typ.workflow.auto) {
    if (!rule.from.includes(status)) continue;
    const value = doc.meta[rule.when.field];
    if (rule.when.op === "before_today" && value && value < today) status = rule.to;
  }
  return status === doc.status ? doc : { ...doc, status };
}

export function applyAllAutoTransitions(state: DmsState): DmsState {
  let changed = false;
  const documents = state.documents.map((doc) => {
    const next = applyAutoTransitions(doc, state.dokumenttypen.find((t) => t.id === doc.dokumenttyp), state.today);
    if (next !== doc) changed = true;
    return next;
  });
  return changed ? { ...state, documents } : state;
}

/** Hand status change; refused when the workflow does not allow it. The same record changes everywhere it is shown. */
export function setStatus(state: DmsState, docId: string, to: string): DmsState {
  const doc = state.documents.find((d) => d.id === docId);
  const typ = state.dokumenttypen.find((t) => t.id === doc?.dokumenttyp);
  if (!doc || !canTransition(typ, doc.status, to)) return state;
  return applyAllAutoTransitions({ ...state, documents: state.documents.map((d) => (d.id === docId ? { ...d, status: to } : d)) });
}
