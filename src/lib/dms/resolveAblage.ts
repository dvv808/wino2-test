import type { Ablageregel, DmsEntity, DocMeta, Dokumenttyp, EntityLink, MetaField, UploadContext } from "../../types/dms";
import { entityValues, fillPath, metaValues } from "./placeholders";

/** What a DMS folder implies for a file dropped on it (computed by the view engine). */
export type FolderDefaults = { path: string[]; typen: string[]; meta: DocMeta; links: EntityLink[] };

export type AblageEnv = {
  entities: DmsEntity[];
  dokumenttypen: Dokumenttyp[];
  /** DMS drag & drop: the folder under the pointer. */
  folder?: FolderDefaults;
};

export type AblageMatch = {
  rule: Ablageregel;
  dokumenttyp: string;
  /** Folder segments. Placeholders of missing fields stay literally, e.g. "{Sparte}". */
  targetPath: string[];
  /** Only these are asked in the upload dialog. */
  missingFields: MetaField[];
};

export type AblageResult = AblageMatch | { unmatched: true; reason: string };

export const isUnmatched = (result: AblageResult): result is { unmatched: true; reason: string } => "unmatched" in result;

const FIELD_OF_PLACEHOLDER: Record<string, MetaField> = { Sparte: "sparte", Jahr: "jahr" };

/** How specific a rule is for this context; null = the rule does not apply. */
export function specificity(rule: Ablageregel, context: UploadContext): number | null {
  if (rule.source !== context.source) return null;
  let score = 1;
  if (rule.entityType !== null) {
    if (rule.entityType !== context.entityType || !context.entityId) return null;
    score += 1;
  }
  if (rule.slot !== null) {
    if (rule.slot !== context.slot) return null;
    score += 1;
  }
  return score;
}

/** The rule that wins: highest specificity, then highest priority, then the first in the list. */
export function pickRule(context: UploadContext, rules: Ablageregel[]): Ablageregel | null {
  let best: { rule: Ablageregel; score: number; index: number } | null = null;
  rules.forEach((rule, index) => {
    const score = specificity(rule, context);
    if (score === null) return;
    if (
      !best ||
      score > best.score ||
      (score === best.score && rule.priority > best.rule.priority)
    ) {
      best = { rule, score, index };
    }
  });
  return best ? (best as { rule: Ablageregel }).rule : null;
}

/**
 * Upload routing. Pure: no store, no UI. Decides the Dokumenttyp and the folder for an upload, and which
 * metadata the dialog still has to ask. Anything it cannot place goes to "Eingang / Nicht zugeordnet".
 */
export function resolveAblage(context: UploadContext, rules: Ablageregel[], env: AblageEnv): AblageResult {
  const rule = pickRule(context, rules);
  if (!rule) return { unmatched: true, reason: "Keine Ablageregel passt zu dieser Upload-Quelle." };

  const fromFolder = rule.dokumenttyp === null;
  if (fromFolder && !env.folder) return { unmatched: true, reason: "Kein Zielordner." };
  const typId = rule.dokumenttyp ?? (env.folder!.typen.length === 1 ? env.folder!.typen[0] : null);
  if (!typId) return { unmatched: true, reason: "Der Ordner legt keinen eindeutigen Dokumenttyp fest." };
  const typ = env.dokumenttypen.find((t) => t.id === typId);
  if (!typ) return { unmatched: true, reason: `Dokumenttyp „${typId}“ existiert nicht.` };

  const known: DocMeta = { ...(fromFolder ? env.folder!.meta : {}), ...context.knownMetadata };
  const required = [...new Set([...rule.requires, ...typ.requiredFields])];
  const missingFields = required.filter((field) => known[field] === undefined || known[field] === "");

  if (fromFolder) return { rule, dokumenttyp: typId, targetPath: env.folder!.path, missingFields };

  const link = context.entityType && context.entityId ? { entityType: context.entityType, entityId: context.entityId } : null;
  const values = { ...entityValues(link, env.entities), ...metaValues(known) };
  const { path, missing } = fillPath(rule.targetPath, values);
  // A placeholder that is not a metadata field (e.g. {Kunde.Name}) cannot be asked: the context is incomplete.
  const unknown = missing.filter((key) => !FIELD_OF_PLACEHOLDER[key]);
  if (unknown.length) return { unmatched: true, reason: `Zielpfad unvollständig: ${unknown.join(", ")}.` };
  for (const key of missing) {
    const field = FIELD_OF_PLACEHOLDER[key];
    if (!missingFields.includes(field)) missingFields.push(field);
  }
  return { rule, dokumenttyp: typId, targetPath: path, missingFields };
}
