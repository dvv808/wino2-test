import { useEffect, useMemo, useState } from "react";
import * as a from "../assets/index";
import { atLeast, documentLevel, filterView, whoHasAccess } from "../lib/dms/permissions";
import { formatPath } from "../lib/dms/placeholders";
import { buildView, findFolder, locateDocument, walk, type FolderNode } from "../lib/dms/views";
import { nextStates, setStatus } from "../lib/dms/workflow";
import type { Ansicht, DmsState, Dokument } from "../types/dms";
import { Icon, ShelveToggleIcon } from "../ui";
import { useDms } from "./store";
import { Avatar, DmsModal, DmsTable, DocIcon, formatDate, formatSize, LevelChip, StatusChip, type DmsColumn } from "./ui";
import { DmsDropArea } from "./upload";
import { peekDmsFocus, takeDmsFocus } from "./focus";

/**
 * The DMS in the Figma layout (Mein Bereich → Dokumente, 17315-166798): folder tree, folder table, preview.
 * The same component shows the Verwaltung (admin) and the Standard (user) view; only the Ansicht differs.
 */

function typName(state: DmsState, id: string | null) {
  return state.dokumenttypen.find((t) => t.id === id)?.name ?? "Nicht zugeordnet";
}

function lastChange(doc: Dokument) {
  return doc.versions.at(-1)?.uploadedAt ?? doc.createdAt;
}

function linkNames(state: DmsState, doc: Dokument) {
  return doc.links
    .map((l) => {
      const e = state.entities.find((x) => x.type === l.entityType && x.id === l.entityId);
      return e ? `${l.entityType}: ${e.nummer ?? e.name}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

/** Who switches the demo between persons: everyone sees the same records through their own permissions. */
export function PersonSwitch({ title }: { title: string }) {
  const { state, setActivePerson } = useDms();
  const [open, setOpen] = useState(false);
  const person = state.people.find((p) => p.id === state.activePerson);
  const groupsOf = (id: string) => state.groups.filter((g) => g.members.includes(id)).map((g) => g.name);
  return (
    <div className="dms-person">
      <button type="button" className="dms-person-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Avatar person={person} size={40} />
        <span className="dms-person-copy">
          <strong>{title}</strong>
          <small>
            {person?.name}
            {person?.id === "lucy" ? " (Ich)" : ""}
          </small>
        </span>
        <Icon src={a.chevronDown} size={18} />
      </button>
      {open ? (
        <div className="dms-person-pop" role="menu">
          <p className="dms-person-pop-head">Ansehen als</p>
          {state.people.map((p) => (
            <button
              type="button"
              role="menuitem"
              key={p.id}
              className={p.id === state.activePerson ? "active" : ""}
              onClick={() => {
                setActivePerson(p.id);
                setOpen(false);
              }}
            >
              <Avatar person={p} size={28} />
              <span>
                <strong>{p.name}</strong>
                <small>{[...(p.rollen.includes("DMS-Admin") ? ["DMS-Admin"] : []), ...groupsOf(p.id)].join(" · ")}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AccessModal({ view, path, onClose }: { view: FolderNode[]; path: string[]; onClose: () => void }) {
  const { state } = useDms();
  const list = whoHasAccess(view, path, state);
  return (
    <DmsModal title="Wer hat Zugriff?" onClose={onClose}>
      <p className="prompt-text">{formatPath(path)}</p>
      <ul className="dms-access-list">
        {list.map((entry) => (
          <li key={entry.person.id}>
            <Avatar person={entry.person} size={28} />
            <span>
              <strong>{entry.person.name}</strong>
              <small>{entry.via}</small>
            </span>
            <LevelChip level={entry.level} />
          </li>
        ))}
        {list.length === 0 ? <li className="dms-muted">Niemand.</li> : null}
      </ul>
    </DmsModal>
  );
}

function matchesSearch(folder: FolderNode, needle: string): boolean {
  if (!needle) return true;
  if (folder.name.toLocaleLowerCase("de-AT").includes(needle)) return true;
  if (folder.docs.some((d) => d.name.toLocaleLowerCase("de-AT").includes(needle))) return true;
  return folder.children.some((c) => matchesSearch(c, needle));
}

function TreeRow({
  folder,
  depth,
  ctx,
}: {
  folder: FolderNode;
  depth: number;
  ctx: {
    selected: string | null;
    docId: string | null;
    open: Set<string>;
    needle: string;
    toggle: (key: string) => void;
    select: (folder: FolderNode, docId?: string) => void;
    access: (path: string[]) => void;
    lockedIds: Set<string>;
  };
}) {
  if (!matchesSearch(folder, ctx.needle)) return null;
  const isOpen = ctx.open.has(folder.key) || Boolean(ctx.needle);
  const expandable = folder.children.length > 0 || folder.docs.length > 0;
  const restricted = folder.permissions.length > 0;
  const docs = ctx.needle ? folder.docs.filter((d) => d.name.toLocaleLowerCase("de-AT").includes(ctx.needle)) : folder.docs;
  return (
    <li>
      <div
        className={`dms-tree-row${ctx.selected === folder.key && !ctx.docId ? " selected" : ""}${folder.level === null ? " passage" : ""}`}
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <button
          type="button"
          className={`dms-caret${isOpen ? " open" : ""}`}
          aria-label={isOpen ? "Zuklappen" : "Aufklappen"}
          disabled={!expandable}
          onClick={() => ctx.toggle(folder.key)}
        >
          {expandable ? <Icon src={a.chevronDown} size={14} /> : null}
        </button>
        <button type="button" className="dms-tree-name" onClick={() => ctx.select(folder)}>
          <span className="dms-folder-icon">
            <Icon src={a.folder} size={20} />
            {restricted ? <img className="dms-folder-lock" src={a.hnLock} alt="" width={10} height={10} /> : null}
          </span>
          <span className="dms-tree-label">{folder.name}</span>
        </button>
        <span className="dms-count">{folder.count}</span>
        <button type="button" className="dms-kebab" aria-label={`Wer hat Zugriff auf ${folder.name}?`} onClick={() => ctx.access(folder.path)}>
          <Icon src={a.contextMenu} size={18} />
        </button>
      </div>
      {isOpen ? (
        <ul>
          {folder.children.map((child) => (
            <TreeRow key={child.key} folder={child} depth={depth + 1} ctx={ctx} />
          ))}
          {docs.map((doc) => {
            const locked = ctx.lockedIds.has(doc.id);
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  className={`dms-tree-row dms-tree-file${ctx.docId === doc.id ? " selected" : ""}${locked ? " locked" : ""}`}
                  style={{ paddingLeft: 8 + (depth + 1) * 18 + 22 }}
                  disabled={locked}
                  onClick={() => ctx.select(folder, doc.id)}
                >
                  {locked ? <img src={a.hnLock} alt="" width={16} height={16} /> : <DocIcon doc={doc} size={18} />}
                  <span className="dms-tree-label">{locked ? "Vertraulich" : doc.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function Preview({ doc, folder, canEdit }: { doc: Dokument | null; folder: FolderNode | null; canEdit: boolean }) {
  const { state, apply } = useDms();
  const [zoom, setZoom] = useState(100);
  const verwaltung = useMemo(() => buildView(state, "Verwaltung"), [state]);
  const standard = useMemo(() => buildView(state, "Standard"), [state]);
  if (!doc || !folder) {
    return (
      <section className="dms-panel dms-preview empty">
        <img src={a.docList} alt="" width={40} height={40} />
        <p>Dokument auswählen, um es hier anzusehen.</p>
      </section>
    );
  }
  const version = doc.versions.at(-1);
  const typ = state.dokumenttypen.find((t) => t.id === doc.dokumenttyp);
  const next = canEdit ? nextStates(typ, doc.status) : [];
  const uploader = state.people.find((p) => p.id === version?.uploadedBy);
  const places = [
    ...locateDocument(verwaltung, doc.id).map((p) => ({ ansicht: "Verwaltung", path: p })),
    ...locateDocument(standard, doc.id).map((p) => ({ ansicht: "Standard", path: p })),
  ];
  return (
    <section className="dms-panel dms-preview">
      <header className="dms-panel-head dms-preview-head">
        <div className="dms-preview-title">
          <strong title={version?.fileName}>{version?.fileName ?? doc.name}</strong>
          <small>
            {version?.mime.includes("pdf") ? "PDF" : "Datei"} • {version ? formatSize(version.size) : "–"}
          </small>
        </div>
        <div className="dms-preview-tools">
          <button type="button" className="dms-round" aria-label="Ansehen">
            <Icon src={a.eye} size={18} className="icon-dark" />
          </button>
          <button type="button" className="dms-round" aria-label="Kommentar">
            <Icon src={a.comment} size={18} className="icon-dark" />
          </button>
          <span className="dms-zoom">
            <button type="button" aria-label="Verkleinern" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
              <Icon src={a.zoomOut} size={16} className="icon-dark" />
            </button>
            <button type="button" aria-label="Vergrößern" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
              <Icon src={a.zoomIn} size={16} className="icon-dark" />
            </button>
            <span>{zoom}%</span>
          </span>
        </div>
      </header>
      <div className="dms-preview-body">
        <div className="dms-page" style={{ transform: `scale(${zoom / 100})` }}>
          <Icon src={a.logoMark} size={28} className="icon-dark dms-page-mark" />
          <strong>{doc.name}</strong>
          <span>{typName(state, doc.dokumenttyp)}</span>
          <i />
          <i />
          <i className="short" />
          <i />
          <i className="short" />
        </div>
        <dl className="dms-details">
          <dt>Status</dt>
          <dd>
            <StatusChip status={doc.status} />
            {next.length ? (
              <span className="dms-next">
                {next.map((to) => (
                  <button type="button" key={to} className="dms-next-btn" onClick={() => apply((s) => setStatus(s, doc.id, to))}>
                    → {to}
                  </button>
                ))}
              </span>
            ) : null}
          </dd>
          <dt>Dokumenttyp</dt>
          <dd>{typName(state, doc.dokumenttyp)}</dd>
          <dt>Verknüpft mit</dt>
          <dd>{linkNames(state, doc) || "–"}</dd>
          {doc.meta.sparte ? (
            <>
              <dt>Sparte</dt>
              <dd>{doc.meta.sparte}</dd>
            </>
          ) : null}
          {doc.meta.jahr ? (
            <>
              <dt>Jahr</dt>
              <dd>
                {doc.meta.jahr}
                {folder.staleIds.includes(doc.id) ? <span className="dms-stale">nicht aktuell</span> : null}
              </dd>
            </>
          ) : null}
          {doc.meta.gueltig_von || doc.meta.gueltig_bis ? (
            <>
              <dt>Gültig</dt>
              <dd>
                {formatDate(doc.meta.gueltig_von)} – {formatDate(doc.meta.gueltig_bis)}
              </dd>
            </>
          ) : null}
          <dt>Hochgeladen</dt>
          <dd>
            {formatDate(version?.uploadedAt, true)} · {uploader?.name ?? "–"}
          </dd>
          <dt>Quelle</dt>
          <dd>{doc.upload_context.source}</dd>
          {doc.vertraulich ? (
            <>
              <dt>Vertraulich</dt>
              <dd>Nur {doc.vertraulich.map((id) => state.people.find((p) => p.id === id)?.name ?? id).join(", ")}</dd>
            </>
          ) : null}
          <dt>Ablage</dt>
          <dd className="dms-places">
            {places.map((p) => (
              <span key={`${p.ansicht}-${p.path.join("/")}`}>
                <em>{p.ansicht}</em> {formatPath(p.path)}
              </span>
            ))}
            <small>Ein Datensatz, gespeichert einmal.</small>
          </dd>
        </dl>
      </div>
    </section>
  );
}

export function DmsBrowser({ ansicht, title, lockConfidential = false }: { ansicht: Ansicht; title: string; lockConfidential?: boolean }) {
  const { state } = useDms();
  const person = state.people.find((p) => p.id === state.activePerson) ?? state.people[0];
  const full = useMemo(() => buildView(state, ansicht), [state, ansicht]);
  const view = useMemo(() => filterView(full, person, state.groups, { lockConfidential }), [full, person, state.groups, lockConfidential]);
  const [selected, setSelected] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [treeOpen, setTreeOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [accessPath, setAccessPath] = useState<string[] | null>(null);

  // A folder that is no longer visible (other person, other Ansicht) falls back to the first one.
  const folder = (selected ? findFolder(view, selected.split("/")) : null) ?? view[0] ?? null;
  useEffect(() => {
    if (folder && selected !== folder.key) {
      setSelected(folder.key);
      setOpen((prev) => new Set(prev).add(folder.key));
    }
    if (docId && !folder?.docs.some((d) => d.id === docId)) setDocId(null);
  }, [folder, selected, docId]);

  // A card elsewhere (Maklervereinbarung) asked to show one of its documents here.
  useEffect(() => {
    function take() {
      const focus = peekDmsFocus();
      if (!focus) return;
      const target = findFolder(view, focus.path);
      if (!target) return;
      // Cleared after this render pass, so a second effect run (StrictMode) still finds it.
      window.setTimeout(takeDmsFocus, 0);
      setSearch("");
      setTreeOpen(true);
      select(target, target.docs.some((d) => d.id === focus.docId) ? focus.docId : undefined);
    }
    take();
    window.addEventListener("dms-focus", take);
    return () => window.removeEventListener("dms-focus", take);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const lockedIds = useMemo(() => {
    const ids = new Set<string>();
    walk(view, (f) => f.lockedIds?.forEach((id) => ids.add(id)));
    return ids;
  }, [view]);
  const doc = folder?.docs.find((d) => d.id === docId) ?? null;
  const access = folder ? whoHasAccess(full, folder.path, state) : [];
  const canEditFolder = atLeast(folder?.level ?? null, "Bearbeiten");

  function select(target: FolderNode, nextDoc?: string) {
    setSelected(target.key);
    setDocId(nextDoc ?? null);
    // Opening a folder also opens the way to it.
    setOpen((prev) => {
      const next = new Set(prev);
      target.path.forEach((_, i) => next.add(target.path.slice(0, i + 1).join("/")));
      return next;
    });
  }

  const columns: DmsColumn<Dokument>[] = [
    {
      key: "name",
      label: "Name",
      width: "minmax(260px, 2fr)",
      text: (d) => (lockedIds.has(d.id) ? "Vertraulich" : d.name),
      render: (d) =>
        lockedIds.has(d.id) ? (
          <span className="dms-cell-name locked">
            <img src={a.hnLock} alt="" width={16} height={16} />
            Vertraulich
          </span>
        ) : (
          <span className="dms-cell-name">
            <DocIcon doc={d} />
            <span>{d.name}</span>
            {folder?.staleIds.includes(d.id) ? <span className="dms-stale">nicht aktuell</span> : null}
          </span>
        ),
    },
    { key: "typ", label: "Typ", width: "minmax(150px, 1fr)", text: (d) => (lockedIds.has(d.id) ? "" : typName(state, d.dokumenttyp)) },
    {
      key: "status",
      label: "Status",
      width: "minmax(130px, 0.8fr)",
      text: (d) => d.status ?? "",
      render: (d) => <StatusChip status={lockedIds.has(d.id) ? null : d.status} />,
    },
    { key: "geaendert", label: "Geändert", width: "minmax(130px, 0.8fr)", text: (d) => formatDate(lastChange(d), true) },
    { key: "kommentar", label: "Kommentar", width: "minmax(150px, 1fr)", text: (d) => (lockedIds.has(d.id) ? "" : d.kommentar ?? "") },
    {
      key: "zugriff",
      label: "Zugriff",
      width: "minmax(110px, 0.6fr)",
      text: (d) =>
        (d.vertraulich ? state.people.filter((p) => d.vertraulich!.includes(p.id)) : access.map((e) => e.person)).map((p) => p.name).join(", "),
      render: (d) => {
        const people = d.vertraulich ? state.people.filter((p) => d.vertraulich!.includes(p.id)) : access.map((e) => e.person);
        return (
          <span className="dms-avatars" title={people.map((p) => p.name).join(", ")}>
            {people.slice(0, 3).map((p) => (
              <Avatar key={p.id} person={p} size={24} />
            ))}
            {people.length > 3 ? <span className="dms-more">+{people.length - 3}</span> : null}
          </span>
        );
      },
    },
  ];

  return (
    <div className={`dms-browser${treeOpen ? "" : " tree-closed"}`}>
      {treeOpen ? (
        <section className="dms-panel dms-tree">
          <header className="dms-panel-head">
            <PersonSwitch title={title} />
          </header>
          <label className="dms-search">
            <Icon src={a.search} size={20} />
            <input placeholder="Suchen..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <ul className="dms-tree-list" role="tree">
            {view.map((f) => (
              <TreeRow
                key={f.key}
                folder={f}
                depth={0}
                ctx={{
                  selected: folder?.key ?? null,
                  docId,
                  open,
                  needle: search.trim().toLocaleLowerCase("de-AT"),
                  toggle: (key) =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    }),
                  select,
                  access: setAccessPath,
                  lockedIds,
                }}
              />
            ))}
            {view.length === 0 ? <li className="dms-muted dms-tree-empty">Keine Ordner mit Zugriff.</li> : null}
          </ul>
        </section>
      ) : null}

      {folder ? (
        <DmsDropArea
          className="dms-panel dms-list"
          context={{ source: "dms.dragdrop", entityType: null, entityId: null, slot: "", knownMetadata: {}, folderPath: folder.path }}
          folder={folder.defaults}
          disabled={!canEditFolder}
        >
          {({ button, note, over }) => (
            <>
              <header className="dms-panel-head dms-list-head">
                <button type="button" className="dms-shelve" aria-label={treeOpen ? "Ordner ausblenden" : "Ordner einblenden"} onClick={() => setTreeOpen(!treeOpen)}>
                  <ShelveToggleIcon collapsed={!treeOpen} />
                </button>
                <div className="dms-list-title">
                  <small>{folder.path.length > 1 ? formatPath(folder.path.slice(0, -1)) : ansicht}</small>
                  <strong>
                    <Icon src={a.folder} size={20} />
                    <span>{folder.name}</span>
                    <span className="dms-count">{folder.count}</span>
                  </strong>
                </div>
                <div className="dms-list-tools">
                  <LevelChip level={folder.level} />
                  {button}
                  <button type="button" className="dms-access-btn" onClick={() => setAccessPath(folder.path)}>
                    Wer hat Zugriff?
                  </button>
                </div>
              </header>
              {note}
              {over ? <div className="dms-drop-hint">Hier ablegen: {formatPath(folder.path)}</div> : null}
              <DmsTable
                rows={folder.docs}
                columns={columns}
                rowKey={(d) => d.id}
                label={`Dokumente in ${folder.name}`}
                unit="Dokumente"
                selected={docId}
                onSelect={(d) => (lockedIds.has(d.id) ? undefined : setDocId(d.id))}
                rowClass={(d) => (lockedIds.has(d.id) ? "locked" : "")}
                empty={
                  <p className="dms-empty">
                    {folder.level === null
                      ? "Nur Durchgang: Öffne einen Unterordner."
                      : folder.children.length
                        ? "Keine Dokumente direkt hier. Die Dokumente liegen in den Unterordnern."
                        : canEditFolder
                          ? "Noch leer. Dateien hierher ziehen, um sie abzulegen."
                          : "Noch leer."}
                  </p>
                }
              />
            </>
          )}
        </DmsDropArea>
      ) : (
        <section className="dms-panel dms-list empty">
          <p className="dms-empty">Keine Ordner sichtbar.</p>
        </section>
      )}

      <Preview doc={doc} folder={folder} canEdit={Boolean(doc && atLeast(documentLevel(doc, folder?.level ?? null, person), "Bearbeiten"))} />

      {accessPath ? <AccessModal view={full} path={accessPath} onClose={() => setAccessPath(null)} /> : null}
    </div>
  );
}
