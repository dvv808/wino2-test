import { useState, type DragEvent, type ReactNode } from "react";
import * as a from "../assets/index";
import { formatPath } from "../lib/dms/placeholders";
import { isUnmatched, resolveAblage, type FolderDefaults } from "../lib/dms/resolveAblage";
import { syncEntities, uploadToState, type UploadFile } from "../lib/dms/upload";
import { SPARTEN } from "../mocks/dms/seed";
import { listedPartners } from "../person/partners";
import type { DmsEntity, DmsState, DocMeta, MetaField, UploadContext } from "../types/dms";
import { Icon } from "../ui";
import { useDms } from "./store";

/**
 * The one upload of WINO. Every upload point renders `<DmsUpload context={…}>`; a raw file input anywhere else
 * fails the build (scripts/check-upload-inputs.mjs). The context is required, so an upload without it does not
 * compile. The dialog only asks for the fields routing could not fill; whatever cannot be placed goes to Eingang.
 */

const FIELD_LABEL: Record<MetaField, string> = {
  sparte: "Sparte",
  jahr: "Jahr",
  gueltig_von: "Gültig von",
  gueltig_bis: "Gültig bis",
};

export type UploadOutcome = { fileName: string; path: string[] | null };

/** Partners of Stammdaten (incl. those created in "Partner anlegen") as DMS entities. */
function appEntities(): DmsEntity[] {
  return listedPartners().map((p) => ({ id: p.id, type: "Partner", name: p.name }));
}

function toUploadFile(file: File): UploadFile {
  return { name: file.name, size: file.size, mime: file.type || "application/octet-stream" };
}

let uploadCounter = 0;

export function useDmsUpload(context: UploadContext, folder?: FolderDefaults) {
  const { state, apply } = useDms();
  const [pending, setPending] = useState<{ files: UploadFile[]; missing: MetaField[] } | null>(null);
  const [outcome, setOutcome] = useState<UploadOutcome[]>([]);

  /** Runs the same pure routing for the note and for the store; without the missing fields a file goes to Eingang. */
  function commit(files: UploadFile[], filled: DocMeta | undefined) {
    const now = new Date().toISOString().slice(0, 19);
    const inputs = files.map((file) => {
      uploadCounter += 1;
      return { id: `d-up-${Date.now().toString(36)}-${uploadCounter}`, file };
    });
    const run = (base: DmsState) => {
      let next = syncEntities(base, appEntities());
      const results: UploadOutcome[] = [];
      for (const input of inputs) {
        const made = uploadToState(next, { ...input, context, filled, folder, now });
        next = made.state;
        results.push({ fileName: input.file.name, path: made.doc.dokumenttyp === null ? null : placedPath(made.result) });
      }
      return { next, results };
    };
    setOutcome(run(state).results);
    apply((prev) => run(prev).next);
  }

  function upload(list: FileList | File[] | null) {
    const files = [...(list ?? [])].map(toUploadFile);
    if (!files.length) return;
    const env = { entities: syncEntities(state, appEntities()).entities, dokumenttypen: state.dokumenttypen, folder };
    const result = resolveAblage(context, state.regeln, env);
    if (!isUnmatched(result) && result.missingFields.length) setPending({ files, missing: result.missingFields });
    else commit(files, undefined);
  }

  const dialog = pending ? (
    <MissingFieldsDialog
      count={pending.files.length}
      fields={pending.missing}
      onCancel={() => {
        // Never lost: without the missing fields the files wait in Eingang.
        commit(pending.files, undefined);
        setPending(null);
      }}
      onConfirm={(filled) => {
        commit(pending.files, filled);
        setPending(null);
      }}
    />
  ) : null;

  return { upload, dialog, outcome };
}

function placedPath(result: ReturnType<typeof resolveAblage>) {
  return isUnmatched(result) ? null : result.targetPath;
}

export function UploadNote({ outcome }: { outcome: UploadOutcome[] }) {
  if (!outcome.length) return null;
  const placed = outcome.filter((o) => o.path);
  const eingang = outcome.length - placed.length;
  return (
    <div className="dms-upload-notes" role="status">
      {placed.length ? (
        <p className="dms-upload-note">
          <Icon src={a.confirm} size={16} />
          <span>
            {placed.length === 1 ? "Abgelegt in" : `${placed.length} Dateien abgelegt in`} <strong>{formatPath(placed[0].path!)}</strong>
          </span>
        </p>
      ) : null}
      {eingang ? (
        <p className="dms-upload-note eingang">
          <img src={a.hnAttention} alt="" width={16} height={15} />
          <span>
            {eingang === 1 ? "Nicht zugeordnet:" : `${eingang} Dateien nicht zugeordnet:`} liegt im <strong>Eingang</strong> des DMS.
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Asks only what is missing. "Später zuordnen" keeps the file in Eingang. */
function MissingFieldsDialog({
  count,
  fields,
  onCancel,
  onConfirm,
}: {
  count: number;
  fields: MetaField[];
  onCancel: () => void;
  onConfirm: (filled: DocMeta) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const complete = fields.every((field) => (values[field] ?? "").trim() !== "");
  const filled = (): DocMeta => {
    const meta: DocMeta = {};
    for (const field of fields) {
      const value = values[field].trim();
      if (field === "jahr") meta.jahr = Number(value);
      else meta[field] = value;
    }
    return meta;
  };
  return (
    <div className="prompt-modal" role="dialog" aria-label="Fehlende Angaben">
      <button type="button" className="prompt-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="prompt-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">Fehlende Angaben</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onCancel}>
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>
        <div className="prompt-main dms-missing">
          <p className="prompt-text">{count === 1 ? "Für die Ablage fehlt noch:" : `Für die Ablage der ${count} Dateien fehlt noch:`}</p>
          {fields.map((field, index) => (
            <label className="dms-missing-field" key={field}>
              <span className="field-label">{FIELD_LABEL[field]}</span>
              {field === "sparte" ? (
                <select
                  className="dms-input"
                  value={values[field] ?? ""}
                  autoFocus={index === 0}
                  onChange={(event) => setValues((v) => ({ ...v, [field]: event.target.value }))}
                >
                  <option value="">Bitte wählen</option>
                  {SPARTEN.map((sparte) => (
                    <option key={sparte}>{sparte}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="dms-input"
                  type={field === "jahr" ? "number" : "date"}
                  value={values[field] ?? ""}
                  autoFocus={index === 0}
                  onChange={(event) => setValues((v) => ({ ...v, [field]: event.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
        <footer className="prompt-foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Später zuordnen
          </button>
          <button type="button" className="btn-primary" disabled={!complete} onClick={() => onConfirm(filled())}>
            Ablegen
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Dropzone or button around the one file input. `children` is the look of the upload point (kept as it was);
 * `onFiles` still hands the files to the form, so existing file chips keep working.
 */
export function DmsUpload({
  context,
  folder,
  className = "dropzone",
  accept,
  multiple = true,
  disabled,
  onFiles,
  children,
  note = true,
}: {
  context: UploadContext;
  folder?: FolderDefaults;
  className?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles?: (files: File[]) => void;
  children: ReactNode;
  /** Show where the files landed under the dropzone. */
  note?: boolean;
}) {
  const { upload, dialog, outcome } = useDmsUpload(context, folder);
  const [over, setOver] = useState(false);

  function take(list: FileList | null) {
    if (disabled || !list?.length) return;
    const files = [...list];
    onFiles?.(files);
    upload(files);
  }

  const drag = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      if (!disabled) setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setOver(false);
      take(event.dataTransfer.files);
    },
  };

  return (
    <>
      <label className={`${className}${over ? " drag-over" : ""}`} {...drag}>
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
        {children}
      </label>
      {note ? <UploadNote outcome={outcome} /> : null}
      {dialog}
    </>
  );
}

/**
 * A folder panel that accepts dropped files (DMS → Drag & Drop) and offers an upload button. Both use the same
 * routing; `children` places the button and the note wherever the panel wants them.
 */
export function DmsDropArea({
  context,
  folder,
  disabled,
  className,
  children,
}: {
  context: UploadContext;
  folder?: FolderDefaults;
  disabled?: boolean;
  className?: string;
  children: (parts: { button: ReactNode; note: ReactNode; over: boolean }) => ReactNode;
}) {
  const { upload, dialog, outcome } = useDmsUpload(context, folder);
  const [over, setOver] = useState(false);
  const button = (
    <label className={`dms-upload-btn${disabled ? " disabled" : ""}`} title={disabled ? "Keine Berechtigung zum Hochladen" : "Hochladen"}>
      <input
        type="file"
        multiple
        disabled={disabled}
        onChange={(event) => {
          upload(event.target.files ? [...event.target.files] : null);
          event.target.value = "";
        }}
      />
      <Icon src={a.upload} size={20} />
    </label>
  );
  return (
    <div
      className={`${className ?? ""}${over ? " drag-over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!disabled) upload([...event.dataTransfer.files]);
      }}
    >
      {children({ button, note: <UploadNote outcome={outcome} />, over })}
      {dialog}
    </div>
  );
}
