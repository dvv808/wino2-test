import { createContext, useContext, useMemo, useState, type DragEvent } from "react";
import * as a from "../../assets/index";
import { addChildNode, findNode, moveNode, newId, removeNode, updateNode } from "../../lib/dms/admin";
import {
  addTopFolder,
  connectionPreview,
  linkPlaces,
  linkSource,
  linkTargets,
  placesOf,
  removeTopFolder,
  removeVerbindung,
  setLinkTyp,
  setVerbindung,
  unlinkSource,
} from "../../lib/dms/links";
import { formatPath } from "../../lib/dms/placeholders";
import { SOURCE_ITEMS, sourceKey, sourceLabel, type SourceItem } from "../../lib/dms/sources";
import { childrenOf, nodeIndex, type MergedFolder } from "../../lib/dms/views";
import type { DmsState, EntityType, GroupBy, Knoten, MetaField, Ordnervorlage, QuellenLink } from "../../types/dms";
import { ConfirmModal } from "../../honorar/ui";
import { Icon } from "../../ui";
import { useDms } from "../store";
import { DmsModal } from "../ui";
import { ConditionRow, PermissionsEditor } from "./folderFields";

/**
 * Ordner Zuordnung: build the folders, link WINO's upload points to them (Quellen) and let folders show the
 * files of other folders (Ordner verbinden). Spaces (next pill) shows the outcome with the files.
 */

const DRAG_TYPE = "application/x-wino-source";

type Ask = { title: string; text: string; confirmLabel: string; run: () => void };
/** Adding or removing a link always asks first. */
const ConfirmContext = createContext<(ask: Ask) => void>(() => undefined);

/** "Partner / {Partner.Name} / Anhänge" for a template node. */
function nodePath(state: Pick<DmsState, "vorlagen">, nodeId: string) {
  return formatPath(linkTargets(state).find((t) => t.id === nodeId)?.path ?? []);
}

/** Asks before removing a link from one folder; says when the files then land in Eingang. */
function useConfirmUnlink() {
  const ask = useContext(ConfirmContext);
  const { state, apply } = useDms();
  return (link: Pick<QuellenLink, "source" | "slot">, nodeId: string) => {
    const last = placesOf(state, link).length <= 1;
    ask({
      title: "Verknüpfung lösen?",
      text: `„${sourceLabel(link.source, link.slot)}“ von „${nodePath(state, nodeId)}“ lösen?${
        last ? " Neue Dateien von dort landen danach im Eingang." : ""
      }`,
      confirmLabel: "Lösen",
      run: () => apply((s) => unlinkSource(s, link, nodeId)),
    });
  };
}

const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Fester Ordner" },
  { value: "link:Partner", label: "Ein Ordner je Partner" },
  { value: "link:Versicherer", label: "Ein Ordner je Versicherer" },
  { value: "link:Schaden", label: "Ein Ordner je Schaden" },
  { value: "meta:sparte", label: "Ein Ordner je Sparte" },
  { value: "meta:jahr", label: "Ein Ordner je Jahr" },
];

const PLACEHOLDER_CHIPS = ["{Partner.Name}", "{Versicherer}", "{Schaden.Nummer}", "{Sparte}", "{Jahr}"];

function levelValue(node: Knoten) {
  if (node.nameMatches) return `name:${node.nameMatches}`;
  if (!node.groupBy) return "";
  return node.groupBy.kind === "meta" ? `meta:${node.groupBy.field}` : `link:${node.groupBy.entityType}`;
}

function levelTag(node: Knoten) {
  if (node.groupBy?.kind === "link") return `je ${node.groupBy.entityType}`;
  if (node.groupBy?.kind === "meta") return node.groupBy.field === "jahr" ? "je Jahr" : "je Sparte";
  if (node.nameMatches) return "= Sparte";
  return null;
}

type Selection = { vorlageId: string; nodeId: string };

function readDrag(event: DragEvent): SourceItem | null {
  try {
    const raw = event.dataTransfer.getData(DRAG_TYPE);
    return raw ? (JSON.parse(raw) as SourceItem) : null;
  } catch {
    return null;
  }
}

function TreeNode({
  vorlage,
  node,
  depth,
  selection,
  onSelect,
  onDropSource,
  nodes,
  viaLink = false,
}: {
  vorlage: Ordnervorlage;
  node: Knoten;
  depth: number;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  onDropSource: (s: Selection, item: SourceItem) => void;
  nodes: Map<string, Knoten>;
  viaLink?: boolean;
}) {
  const [open, setOpen] = useState(depth < 2);
  const [over, setOver] = useState(false);
  const kids = node.linkTo ? childrenOf(node, nodes) : node.children;
  const selected = selection?.nodeId === node.id && !viaLink;
  const tag = levelTag(node);
  const linkCount = node.quellen?.length ?? 0;
  const target = node.linkTo ? nodes.get(node.linkTo) : null;
  return (
    <li>
      <div
        className={`dms-tree-row dms-zu-row${selected ? " selected" : ""}${over ? " drop-over" : ""}${viaLink ? " via-link" : ""}`}
        style={{ paddingLeft: 8 + depth * 18 }}
        onDragOver={(event) => {
          if (viaLink) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const item = readDrag(event);
          if (item && !viaLink) onDropSource({ vorlageId: vorlage.id, nodeId: node.id }, item);
        }}
      >
        <button type="button" className={`dms-caret${open ? " open" : ""}`} disabled={!kids.length} onClick={() => setOpen(!open)}>
          {kids.length ? <Icon src={a.chevronDown} size={14} /> : null}
        </button>
        <button
          type="button"
          className="dms-tree-name"
          disabled={viaLink}
          title={viaLink ? "Kommt aus dem verknüpften Ordner" : undefined}
          onClick={() => onSelect({ vorlageId: vorlage.id, nodeId: node.id })}
        >
          <span className="dms-folder-icon">
            <Icon src={a.folder} size={20} />
            {node.permissions.length ? <img className="dms-folder-lock" src={a.hnLock} alt="" width={10} height={10} /> : null}
          </span>
          <span className="dms-tree-label">{node.name}</span>
          {tag ? <span className="dms-tag">{tag}</span> : null}
          {depth === 0 && vorlage.ansichten.length === 1 ? <span className="dms-tag">nur {vorlage.ansichten[0]}</span> : null}
          {node.verbindungen?.length ? (
            <span className="dms-tag link" title="Zeigt zusätzlich die Dateien verbundener Ordner">
              <Icon src={a.verknuepfung} size={12} /> verbunden
            </span>
          ) : null}
          {target ? (
            <span className="dms-tag link" title={`Übernimmt die Unterordner von ${target.name}`}>
              <Icon src={a.verknuepfung} size={12} /> {target.name}
            </span>
          ) : null}
        </button>
        {linkCount ? (
          <span className="dms-link-count" title={`${linkCount} verknüpfte Quelle(n)`}>
            <Icon src={a.paperclip} size={14} />
            {linkCount}
          </span>
        ) : null}
      </div>
      {open && kids.length ? (
        <ul>
          {kids.map((child) => (
            <TreeNode
              key={child.id}
              vorlage={vorlage}
              node={child}
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
              onDropSource={onDropSource}
              nodes={nodes}
              viaLink={viaLink || Boolean(node.linkTo)}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Where one upload point is linked, with a way to open or unlink each place. */
function PlacesModal({ item, onClose, onOpen }: { item: SourceItem; onClose: () => void; onOpen: (s: Selection) => void }) {
  const { state } = useDms();
  const confirmUnlink = useConfirmUnlink();
  const places = placesOf(state, item);
  return (
    <DmsModal title="Verknüpft mit" onClose={onClose}>
      <p className="prompt-text">
        {item.module} → {item.label}
      </p>
      <ul className="dms-places-list">
        {places.map((p) => (
          <li key={p.node.id}>
            <Icon src={a.folder} size={18} />
            <button
              type="button"
              className="dms-places-path"
              onClick={() => {
                onOpen({ vorlageId: p.vorlage.id, nodeId: p.node.id });
                onClose();
              }}
            >
              {formatPath(p.path)}
            </button>
            <button type="button" className="btn-secondary dms-row-btn" onClick={() => confirmUnlink(item, p.node.id)}>
              Lösen
            </button>
          </li>
        ))}
        {places.length === 0 ? <li className="dms-muted">Nicht mehr verknüpft – Dateien landen im Eingang.</li> : null}
      </ul>
    </DmsModal>
  );
}

function SourcesPanel({
  selection,
  onLink,
  onOpen,
}: {
  selection: Selection | null;
  onLink: (item: SourceItem) => void;
  onOpen: (s: Selection) => void;
}) {
  const { state } = useDms();
  const confirmUnlink = useConfirmUnlink();
  const [tab, setTab] = useState<"linked" | "open">("linked");
  const [placesFor, setPlacesFor] = useState<SourceItem | null>(null);
  const places = linkPlaces(state);
  const countOf = (item: SourceItem) => places.filter((p) => p.link.source === item.source && p.link.slot === item.slot).length;
  // With a folder selected the tabs are about that folder: what is linked to it, and what can still be linked.
  const vorlage = selection ? state.vorlagen.find((v) => v.id === selection.vorlageId) : undefined;
  const folder = vorlage && selection ? findNode(vorlage.root, selection.nodeId) : null;
  const onFolder = (item: SourceItem) => Boolean(folder?.quellen?.some((q) => q.source === item.source && q.slot === item.slot));
  const linked = SOURCE_ITEMS.filter((item) => (folder ? onFolder(item) : countOf(item) > 0));
  const open = SOURCE_ITEMS.filter((item) => (folder ? !onFolder(item) : countOf(item) === 0));
  const list = tab === "linked" ? linked : open;
  const modules = [...new Set(list.map((s) => s.module))];
  const hint = folder
    ? tab === "linked"
      ? `Mit „${folder.name}“ verknüpft.`
      : `Kann mit „${folder.name}“ verknüpft werden: hierher ziehen oder auf den Knopf klicken.`
    : tab === "linked"
      ? "Ordner links wählen, um seine Quellen zu sehen. Auf einen Ordner ziehen, um zu verknüpfen."
      : "Noch nirgends verknüpft: Dateien von hier landen im Eingang.";
  return (
    <div className="dms-zu-pane">
      <p className="dms-zu-intro">
        <strong>Quellen (Orte mit Dateiupload)</strong> · Jeder Upload in WINO erscheint hier automatisch.
      </p>
      <div className="dms-segment dms-zu-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "linked"} className={tab === "linked" ? "active" : ""} onClick={() => setTab("linked")}>
          Verknüpft ({linked.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "open"} className={tab === "open" ? "active" : ""} onClick={() => setTab("open")}>
          Verfügbar ({open.length})
        </button>
      </div>
      <p className="dms-muted dms-zu-hint">{hint}</p>
      <div className="dms-zu-source-list">
        {list.length === 0 ? (
          <p className="dms-empty">
            {tab === "linked"
              ? folder
                ? "Mit diesem Ordner ist noch keine Quelle verknüpft."
                : "Noch keine Quelle verknüpft."
              : folder
                ? "Alle Quellen sind mit diesem Ordner verknüpft."
                : "Alle Quellen sind verknüpft."}
          </p>
        ) : null}
        {modules.map((module) => (
          <div key={module} className="dms-zu-module">
            <h4>{module}</h4>
            {list
              .filter((s) => s.module === module)
              .map((item) => {
                const count = countOf(item);
                const first = places.find((p) => p.link.source === item.source && p.link.slot === item.slot);
                return (
                  <div
                    key={sourceKey(item.source, item.slot)}
                    className={`dms-zu-source${count ? "" : " unlinked"}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(item));
                      event.dataTransfer.effectAllowed = "link";
                    }}
                  >
                    <span className="dms-zu-grip" aria-hidden>
                      ⋮⋮
                    </span>
                    <span className="dms-zu-source-copy">
                      <strong>{item.label}</strong>
                      <small>{first ? formatPath(first.path) + (count > 1 ? ` + ${count - 1} weitere` : "") : "Landet im Eingang"}</small>
                    </span>
                    {count ? (
                      <button
                        type="button"
                        className="dms-zu-count"
                        aria-label={`${count} Verknüpfung${count === 1 ? "" : "en"} anzeigen`}
                        onClick={() => setPlacesFor(item)}
                      >
                        {count}
                      </button>
                    ) : null}
                    {folder && onFolder(item) ? (
                      <button
                        type="button"
                        className="dms-icon-btn"
                        title={`Verknüpfung mit „${folder.name}“ lösen`}
                        onClick={() => confirmUnlink(item, folder.id)}
                      >
                        <Icon src={a.trash} size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="dms-icon-btn"
                        disabled={!selection}
                        title={selection ? "Mit dem ausgewählten Ordner verknüpfen" : "Erst links einen Ordner wählen"}
                        onClick={() => onLink(item)}
                      >
                        <Icon src={a.verknuepfung} size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
      {placesFor ? <PlacesModal item={placesFor} onClose={() => setPlacesFor(null)} onOpen={onOpen} /> : null}
    </div>
  );
}

function NodeDetails({ selection, onSelect }: { selection: Selection; onSelect: (s: Selection | null) => void }) {
  const { state, apply } = useDms();
  const confirmUnlink = useConfirmUnlink();
  const [advanced, setAdvanced] = useState(false);
  const vorlage = state.vorlagen.find((v) => v.id === selection.vorlageId);
  const node = vorlage ? findNode(vorlage.root, selection.nodeId) : null;
  if (!vorlage || !node) return null;
  const isRoot = vorlage.root.id === node.id;
  const patch = (p: Partial<Omit<Knoten, "id" | "children">>) => apply((s) => updateNode(s, vorlage.id, node.id, p));

  return (
    <div className="dms-zu-pane">
      <div className="dms-zu-body">
        <div className="dms-editor-tools">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const id = newId("n");
              apply((s) => addChildNode(s, vorlage.id, node.id, "Neuer Ordner", id).state);
              onSelect({ vorlageId: vorlage.id, nodeId: id });
            }}
          >
            + Unterordner
          </button>
          {!isRoot ? (
            <>
              <button type="button" className="dms-icon-btn" title="Nach oben" onClick={() => apply((s) => moveNode(s, vorlage.id, node.id, "up"))}>
                ↑
              </button>
              <button type="button" className="dms-icon-btn" title="Nach unten" onClick={() => apply((s) => moveNode(s, vorlage.id, node.id, "down"))}>
                ↓
              </button>
              <button type="button" className="dms-icon-btn" title="Einrücken" onClick={() => apply((s) => moveNode(s, vorlage.id, node.id, "in"))}>
                →
              </button>
              <button type="button" className="dms-icon-btn" title="Ausrücken" onClick={() => apply((s) => moveNode(s, vorlage.id, node.id, "out"))}>
                ←
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="dms-icon-btn danger"
            title="Ordner löschen"
            onClick={() => {
              apply((s) => (isRoot ? removeTopFolder(s, vorlage.id) : removeNode(s, vorlage.id, node.id)));
              onSelect(isRoot ? null : { vorlageId: vorlage.id, nodeId: vorlage.root.id });
            }}
          >
            <Icon src={a.trash} size={16} />
          </button>
        </div>

        <label className="dms-missing-field">
          <span className="field-label">Name</span>
          <input className="dms-input" value={node.name} onChange={(event) => patch({ name: event.target.value })} />
        </label>
        <div className="dms-chips">
          {PLACEHOLDER_CHIPS.map((ph) => (
            <button type="button" key={ph} className="dms-chip" onClick={() => patch({ name: ph })}>
              {ph}
            </button>
          ))}
        </div>

        <label className="dms-missing-field">
          <span className="field-label">Ebene</span>
          <select
            className="dms-input"
            value={levelValue(node)}
            onChange={(event) => {
              const [kind, value] = event.target.value.split(":");
              const groupBy: GroupBy | undefined =
                kind === "link"
                  ? { kind: "link", entityType: value as EntityType, allEntities: true }
                  : kind === "meta"
                    ? { kind: "meta", field: value as MetaField }
                    : undefined;
              const placeholder: Record<string, string> = {
                "link:Partner": "{Partner.Name}",
                "link:Versicherer": "{Versicherer}",
                "link:Schaden": "{Schaden.Nummer}",
                "meta:sparte": "{Sparte}",
                "meta:jahr": "{Jahr}",
              };
              patch({
                groupBy,
                nameMatches: kind === "name" ? (value as MetaField) : undefined,
                ...(placeholder[event.target.value] ? { name: placeholder[event.target.value] } : {}),
              });
            }}
          >
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {node.groupBy?.kind === "link" ? <p className="dms-muted">Wird für jede:n {node.groupBy.entityType} aus den Stammdaten automatisch angelegt.</p> : null}

        <h4>Verknüpfte Quellen</h4>
        {(node.quellen ?? []).length === 0 ? <p className="dms-muted">Noch keine. Eine Quelle aus der Mitte hierher ziehen.</p> : null}
        {(node.quellen ?? []).map((q) => (
          <div className="dms-zu-link" key={sourceKey(q.source, q.slot)}>
            <Icon src={a.paperclip} size={16} />
            <span className="dms-zu-link-name">{sourceLabel(q.source, q.slot)}</span>
            <select
              className="dms-input"
              aria-label="Dokumenttyp"
              value={q.dokumenttyp}
              onChange={(event) => apply((s) => setLinkTyp(s, vorlage.id, node.id, q, event.target.value))}
            >
              {state.dokumenttypen.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button type="button" className="dms-icon-btn" aria-label="Verknüpfung lösen" onClick={() => confirmUnlink(q, node.id)}>
              <Icon src={a.trash} size={16} />
            </button>
          </div>
        ))}

        <h4>Berechtigungen</h4>
        <p className="dms-muted">Gelten für diesen Ordner und alles darunter. Nur Erlaubnisse.</p>
        <PermissionsEditor permissions={node.permissions} onChange={(permissions) => patch({ permissions })} />

        <button type="button" className="hn-link dms-zu-advanced" onClick={() => setAdvanced(!advanced)}>
          {advanced ? "Filter ausblenden" : "Erweitert: Filter nach Dokumenttyp / Metadaten"}
        </button>
        {advanced ? (
          <>
            {node.filter.map((cond, index) => (
              <ConditionRow
                key={index}
                cond={cond}
                onChange={(c) => patch({ filter: node.filter.map((x, i) => (i === index ? c : x)) })}
                onRemove={() => patch({ filter: node.filter.filter((_, i) => i !== index) })}
              />
            ))}
            <button type="button" className="hn-link" onClick={() => patch({ filter: [...node.filter, { kind: "typ", in: [] }] })}>
              + Bedingung
            </button>
            <label className="dms-check">
              <input type="checkbox" checked={Boolean(node.latestOnly)} onChange={(event) => patch({ latestOnly: event.target.checked || undefined })} />
              Nur neuestes Jahr je Versicherer zeigen
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Whether one template path lies inside the other (a folder cannot be connected to itself, above or below). */
function related(a: string[], b: string[]) {
  const n = Math.min(a.length, b.length);
  return a.slice(0, n).join("/") === b.slice(0, n).join("/");
}

function mergedCount(m: MergedFolder): number {
  const ids = new Set<string>();
  const go = (x: MergedFolder) => (x.docs.forEach((d) => ids.add(d.id)), x.children.forEach(go));
  go(m);
  return ids.size;
}

/** Files a connection actually brings along with the chosen sub-folders. */
function chosenCount(list: MergedFolder[], include: string[] | null, own: number) {
  if (include === null) return null;
  const ids = new Set<string>();
  const go = (items: MergedFolder[]) =>
    items.forEach((m) => {
      if (!include.includes(m.rel)) return;
      m.docs.forEach((d) => ids.add(d.id));
      go(m.children);
    });
  go(list);
  return ids.size + own;
}

function allRels(list: MergedFolder[]): string[] {
  return list.flatMap((m) => [m.rel, ...allRels(m.children)]);
}

function SubfolderChecks({
  list,
  total,
  include,
  onToggle,
  depth = 0,
}: {
  list: MergedFolder[];
  total: number;
  include: Set<string> | null;
  onToggle: (m: MergedFolder) => void;
  depth?: number;
}) {
  return (
    <ul className="dms-connect-tree">
      {list.map((m) => {
        const on = include === null || include.has(m.rel);
        return (
          <li key={m.rel}>
            <label className="dms-connect-row" style={{ paddingLeft: depth * 20 }}>
              <input type="checkbox" checked={on} disabled={include === null} onChange={() => onToggle(m)} />
              <Icon src={a.folder} size={18} />
              <span className="dms-tree-label">{m.name}</span>
              <span className="dms-tag" title="In wie vielen der verbundenen Ordner es diesen Unterordner gibt">
                in {m.occurrences} von {total}
              </span>
              <span className="dms-count">{mergedCount(m)}</span>
            </label>
            {m.children.length ? <SubfolderChecks list={m.children} total={total} include={include} onToggle={onToggle} depth={depth + 1} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Ordner verbinden: the selected folder also shows the files of another folder, from every place that folder
 * appears (e.g. the Fachbereiche of every Versicherer). Recurring sub-folders are merged by name; pick which.
 */
function ConnectPane({ selection }: { selection: Selection | null }) {
  const { state, apply } = useDms();
  const ask = useContext(ConfirmContext);
  const [pick, setPick] = useState<string | null>(null);
  const [include, setInclude] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState("");
  const vorlage = selection ? state.vorlagen.find((v) => v.id === selection.vorlageId) : undefined;
  const folder = vorlage && selection ? findNode(vorlage.root, selection.nodeId) : null;
  if (!vorlage || !folder) {
    return (
      <div className="dms-zu-pane dms-zu-empty">
        <img src={a.folder} alt="" width={36} height={36} />
        <p>Links den Ordner wählen, der zusätzlich die Dateien anderer Ordner zeigen soll.</p>
      </div>
    );
  }
  const targets = linkTargets(state);
  const ownPath = targets.find((t) => t.id === folder.id)?.path ?? [];
  const existing = folder.verbindungen ?? [];
  const needle = search.trim().toLocaleLowerCase("de-AT");
  const candidates = targets.filter(
    (t) =>
      !related(t.path, ownPath) &&
      !existing.some((e) => e.nodeId === t.id) &&
      (!needle || formatPath(t.path).toLocaleLowerCase("de-AT").includes(needle)),
  );
  const preview = pick ? connectionPreview(state, pick) : null;
  const rels = preview ? allRels(preview.tree) : [];

  function toggle(m: MergedFolder) {
    setInclude((prev) => {
      const next = new Set(prev ?? rels);
      if (next.has(m.rel)) {
        // Off with everything below it.
        for (const r of [...next]) if (r === m.rel || r.startsWith(`${m.rel}/`)) next.delete(r);
      } else {
        // On with the way to it.
        const parts = m.rel.split("/");
        parts.forEach((_, i) => next.add(parts.slice(0, i + 1).join("/")));
      }
      return next;
    });
  }

  function save() {
    if (!pick || !preview || !vorlage || !folder) return;
    const chosen = include === null ? null : [...include];
    const where = nodePath(state, pick);
    ask({
      title: "Ordner verbinden?",
      text: `„${where}“ (an ${preview.instances.length} Stellen) mit „${formatPath(ownPath)}“ verbinden? Die Dateien erscheinen dann zusätzlich hier, es wird nichts kopiert.`,
      confirmLabel: "Verbinden",
      run: () => {
        apply((s) => setVerbindung(s, vorlage.id, folder.id, { nodeId: pick, include: chosen }));
        setPick(null);
        setInclude(null);
      },
    });
  }

  return (
    <div className="dms-zu-pane dms-connect">
      <p className="dms-zu-intro">
        <strong>Ordner verbinden</strong> · „{folder.name}“ zeigt zusätzlich alle Dateien eines anderen Ordners, von jeder Stelle, an der es ihn
        gibt. Gleichnamige Unterordner werden zusammengeführt.
      </p>

      {existing.length ? (
        <>
          <h4>Verbunden</h4>
          <ul className="dms-places-list">
            {existing.map((e) => {
              const p = connectionPreview(state, e.nodeId);
              return (
                <li key={e.nodeId}>
                  <Icon src={a.verknuepfung} size={18} />
                  <span className="dms-zu-link-name">
                    <strong>{nodePath(state, e.nodeId)}</strong>
                    <small className="dms-muted">
                      {" "}
                      · an {p.instances.length} Stellen · {e.include === null ? "alle Unterordner" : `${e.include.length} Unterordner gewählt`} ·{" "}
                      {chosenCount(p.tree, e.include, p.instances.reduce((n, f) => n + f.docs.length, 0)) ?? p.docs} Dateien
                    </small>
                  </span>
                  <button
                    type="button"
                    className="btn-secondary dms-row-btn"
                    onClick={() => {
                      setPick(e.nodeId);
                      setInclude(e.include === null ? null : new Set(e.include));
                    }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="btn-secondary dms-row-btn"
                    onClick={() =>
                      ask({
                        title: "Verbindung trennen?",
                        text: `„${nodePath(state, e.nodeId)}“ von „${formatPath(ownPath)}“ trennen? Die Dateien bleiben an ihrem Ort.`,
                        confirmLabel: "Trennen",
                        run: () => apply((s) => removeVerbindung(s, vorlage.id, folder.id, e.nodeId)),
                      })
                    }
                  >
                    Trennen
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <div className="dms-connect-split">
        <div className="dms-connect-pick">
          <h4>Ordner wählen</h4>
          <label className="dms-search">
            <Icon src={a.search} size={20} />
            <input placeholder="Ordner suchen..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <ul className="dms-pick-list">
            {candidates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={pick === t.id ? "active" : ""}
                  onClick={() => {
                    setPick(t.id);
                    setInclude(null);
                  }}
                >
                  <strong>{t.path.at(-1)}</strong>
                  <small>{formatPath(t.path)}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="dms-connect-preview">
          {preview && pick ? (
            <>
              <h4>{nodePath(state, pick)}</h4>
              <p className="dms-muted">
                Kommt an {preview.instances.length} Stellen vor: {preview.instances.slice(0, 3).map((f) => formatPath(f.path)).join(" · ")}
                {preview.instances.length > 3 ? ` · +${preview.instances.length - 3} weitere` : ""}
              </p>
              {preview.tree.length ? (
                <>
                  <label className="dms-check">
                    <input type="checkbox" checked={include === null} onChange={(event) => setInclude(event.target.checked ? null : new Set(rels))} />
                    Alle Unterordner übernehmen
                  </label>
                  <p className="dms-muted">Wiederkehrende Unterordner, nach Namen zusammengeführt:</p>
                  <SubfolderChecks list={preview.tree} total={preview.instances.length} include={include} onToggle={toggle} />
                </>
              ) : (
                <p className="dms-muted">Keine Unterordner – nur die Dateien direkt darin werden übernommen.</p>
              )}
              <div className="dms-connect-actions">
                <span className="dms-muted">{preview.docs} Dateien</span>
                <button type="button" className="btn-secondary" onClick={() => setPick(null)}>
                  Abbrechen
                </button>
                <button type="button" className="btn-primary" disabled={include !== null && include.size === 0 && preview.tree.length > 0} onClick={save}>
                  {existing.some((e) => e.nodeId === pick) ? "Speichern" : "Verbinden"}
                </button>
              </div>
            </>
          ) : (
            <p className="dms-muted dms-connect-hint">Links einen Ordner wählen, um zu sehen, was er mitbringt.</p>
          )}
        </div>
      </div>
    </div>
  );
}

type MainTab = "quellen" | "verbinden" | "einstellungen";

export function Zuordnung() {
  const { state, apply } = useDms();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const nodes = useMemo(() => nodeIndex(state.vorlagen), [state.vorlagen]);
  // Every folder in one structure; Spaces shows what Verwaltung and Standard each make of it.
  const tops = state.vorlagen;
  const current = selection && tops.some((v) => v.id === selection.vorlageId) ? selection : null;

  const [ask, setAsk] = useState<Ask | null>(null);
  const [tab, setTab] = useState<MainTab>("quellen");
  const selVorlage = current ? state.vorlagen.find((v) => v.id === current.vorlageId) : undefined;
  const selNode = selVorlage && current ? findNode(selVorlage.root, current.nodeId) : null;

  function link(target: Selection, item: SourceItem) {
    // Same pure step for the question, the message and the store, with the new level's id made up front.
    const levelId = newId("n");
    const link = { source: item.source, slot: item.slot, dokumenttyp: item.dokumenttyp };
    const preview = linkSource(state, target.vorlageId, target.nodeId, link, levelId);
    const landed = preview.nodeId;
    const createsLevel = landed === levelId;
    const already = placesOf(state, item).some((p) => p.node.id === landed);
    if (already) {
      setSelection({ vorlageId: target.vorlageId, nodeId: landed });
      setFlash(`„${item.label}“ ist mit diesem Ordner schon verknüpft.`);
      return;
    }
    const where = createsLevel ? `${nodePath(state, target.nodeId)} / {${item.entityType}…}` : nodePath(state, landed);
    setAsk({
      title: "Quelle verknüpfen?",
      text: `„${item.module} → ${item.label}“ mit „${where}“ verknüpfen?${
        createsLevel ? ` Dafür wird die Ebene je ${item.entityType} angelegt.` : ""
      } Dateien von dort erscheinen dann in diesem Ordner.`,
      confirmLabel: "Verknüpfen",
      run: () => {
        apply((s) => linkSource(s, target.vorlageId, target.nodeId, link, levelId).state);
        setSelection({ vorlageId: target.vorlageId, nodeId: landed });
        setFlash(createsLevel ? `„${item.label}“ verknüpft. Ebene je ${item.entityType} wurde angelegt.` : `„${item.label}“ verknüpft.`);
      },
    });
  }

  return (
    <ConfirmContext.Provider value={setAsk}>
    <div className="dms-zu">
      <section className="dms-panel dms-zu-tree">
        <header className="dms-panel-head">
          <div className="dms-list-title">
            <small>Ordner anlegen und verknüpfen</small>
            <strong>Ordnerstruktur</strong>
          </div>
        </header>
        {flash ? (
          <p className="dms-upload-note" role="status">
            <Icon src={a.confirm} size={16} />
            <span>{flash}</span>
          </p>
        ) : null}
        <ul className="dms-tree-list">
          {tops.map((v) => (
            <TreeNode key={v.id} vorlage={v} node={v.root} depth={0} selection={current} onSelect={setSelection} onDropSource={link} nodes={nodes} />
          ))}
        </ul>
        <div className="dms-zu-add">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const ids = { vorlage: newId("tpl"), node: newId("n") };
              apply((s) => addTopFolder(s, ["Verwaltung", "Standard"], "Neuer Ordner", ids).state);
              setSelection({ vorlageId: ids.vorlage, nodeId: ids.node });
            }}
          >
            + Ordner
          </button>
        </div>
      </section>
      <section className="dms-panel dms-zu-main">
        <header className="dms-panel-head dms-zu-main-head">
          <div className="dms-list-title">
            <small>{selNode && selVorlage ? (selVorlage.ansichten.length > 1 ? "Ordner · in Verwaltung und Standard" : `Ordner · nur ${selVorlage.ansichten[0]}`) : "Kein Ordner gewählt"}</small>
            <strong>
              <Icon src={a.folder} size={20} />
              <span>{selNode ? nodePath(state, selNode.id) : "Ordner links wählen"}</span>
            </strong>
          </div>
          <div className="dms-segment" role="tablist">
            {(
              [
                ["quellen", "Quellen"],
                ["verbinden", "Ordner verbinden"],
                ["einstellungen", "Einstellungen"],
              ] as [MainTab, string][]
            ).map(([id, label]) => (
              <button type="button" role="tab" key={id} aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
        </header>
        {tab === "quellen" ? <SourcesPanel selection={current} onLink={(item) => current && link(current, item)} onOpen={setSelection} /> : null}
        {tab === "verbinden" ? <ConnectPane key={current?.nodeId ?? "none"} selection={current} /> : null}
        {tab === "einstellungen" ? (
          current ? (
            <NodeDetails selection={current} onSelect={setSelection} />
          ) : (
            <div className="dms-zu-pane dms-zu-empty">
              <img src={a.folder} alt="" width={36} height={36} />
              <p>Ordner links wählen oder anlegen.</p>
            </div>
          )
        ) : null}
      </section>
    </div>
    {ask ? (
      <ConfirmModal
        title={ask.title}
        text={ask.text}
        confirmLabel={ask.confirmLabel}
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          ask.run();
          setAsk(null);
        }}
      />
    ) : null}
    </ConfirmContext.Provider>
  );
}
