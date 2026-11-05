import type { DmsState, DocMeta, Dokument, PersonId, UploadContext } from "../../types/dms";
import { linkChain } from "./placeholders";
import { isUnmatched, resolveAblage, type AblageEnv, type AblageResult } from "./resolveAblage";
import { applyAutoTransitions } from "./workflow";

export type UploadFile = { name: string; size: number; mime: string };

/**
 * The one record an upload creates. Placed uploads get their Dokumenttyp, links and metadata; unmatched uploads
 * (or placed ones with fields still missing) land in Eingang with dokumenttyp = null. Nothing is copied.
 */
export function buildDokument(input: {
  id: string;
  file: UploadFile;
  context: UploadContext;
  result: AblageResult;
  /** Values the dialog asked for (only the missing fields). */
  filled?: DocMeta;
  env: AblageEnv;
  dokumenttypen: DmsState["dokumenttypen"];
  by: PersonId;
  now: string;
  today: string;
}): Dokument {
  const { result, context, env } = input;
  const meta: DocMeta = { ...(env.folder?.meta ?? {}), ...context.knownMetadata, ...(input.filled ?? {}) };
  const placed = !isUnmatched(result) && result.missingFields.every((field) => meta[field] !== undefined && meta[field] !== "");
  const entityLink = context.entityType && context.entityId ? { entityType: context.entityType, entityId: context.entityId } : null;
  const links = [...linkChain(entityLink, env.entities)];
  for (const link of env.folder?.links ?? []) {
    if (!links.some((l) => l.entityType === link.entityType && l.entityId === link.entityId)) links.push(link);
  }
  const typ = placed ? input.dokumenttypen.find((t) => t.id === (result as { dokumenttyp: string }).dokumenttyp) : undefined;
  const doc: Dokument = {
    id: input.id,
    name: input.file.name.replace(/\.[^.]+$/, ""),
    versions: [{ nr: 1, fileName: input.file.name, size: input.file.size, mime: input.file.mime, uploadedAt: input.now, uploadedBy: input.by }],
    dokumenttyp: typ?.id ?? null,
    status: typ?.workflow.states[0] ?? null,
    links,
    meta,
    upload_context: context,
    vertraulich: null,
    createdAt: input.now,
    createdBy: input.by,
  };
  return applyAutoTransitions(doc, typ, input.today);
}

/** Routing + record in one step, for the store and the tests. */
export function uploadToState(
  state: DmsState,
  input: { id: string; file: UploadFile; context: UploadContext; filled?: DocMeta; folder?: AblageEnv["folder"]; now: string },
) {
  const env: AblageEnv = { entities: state.entities, dokumenttypen: state.dokumenttypen, folder: input.folder };
  const known = { ...input.context, knownMetadata: { ...input.context.knownMetadata, ...(input.filled ?? {}) } };
  const result = resolveAblage(known, state.regeln, env);
  const doc = buildDokument({
    ...input,
    result,
    env,
    dokumenttypen: state.dokumenttypen,
    by: state.activePerson,
    today: state.today,
  });
  return { state: { ...state, documents: [...state.documents, doc] }, doc, result };
}

/**
 * Stammdaten entities (e.g. a partner created in "Partner anlegen") join the DMS automatically, so their folder
 * tree exists and uploads for them can be placed. Existing entities keep their data; names are refreshed.
 */
export function syncEntities(state: DmsState, entities: DmsState["entities"]): DmsState {
  let changed = false;
  const list = [...state.entities];
  for (const entity of entities) {
    const index = list.findIndex((e) => e.type === entity.type && e.id === entity.id);
    if (index === -1) {
      list.push(entity);
      changed = true;
    } else if (list[index].name !== entity.name) {
      list[index] = { ...list[index], name: entity.name };
      changed = true;
    }
  }
  return changed ? { ...state, entities: list } : state;
}
