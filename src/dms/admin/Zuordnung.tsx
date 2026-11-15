import { useKeptState } from "../../lib/keptState";
import { HotFilters } from "../../HotFilters";
import { UploadSources } from "../UploadSources";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
import { SOURCE_ITEMS, sourceItem, sourceKey, sourceLabel, type SourceItem } from "../../lib/dms/sources";
import { childrenOf, nodeIndex, type MergedFolder } from "../../lib/dms/views";
import type { DmsState, EntityType, GroupBy, Knoten, MetaField, Ordnervorlage, QuellenLink } from "../../types/dms";
import { ConfirmModal } from "../../honorar/ui";
import { Icon, Snackbar } from "../../ui";
import { useDms } from "../store";
import { DmsModal, DmsTable, RowMenu } from "../ui";
import { ConditionRow, PermissionsEditor } from "./folderFields";

/**
 * Ordner Zuordnung: build the folders, link WINO's upload points to them (Quellen) and let folders show the
 * files of other folders (Ordner verbinden). Spaces (next pill) shows the outcome with the files.
 */

const DRAG_TYPE = "application/x-wino-source";

type Ask = {
  title: string;
  text: string;
  confirmLabel: string;
  run: () => void;
  /** Linking an upload to a folder: shown in the Verknüpfung overlay look instead of the plain question. */
  link?: { item: SourceItem; where: string; level?: string };
  /** Removing one link from a folder (Einstellungen): same overlay look. */
  unlink?: { item: SourceItem; where: string; last: boolean };
};
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
    const item = sourceItem(link.source, link.slot);
    ask({
      unlink: item ? { item, where: nodePath(state, nodeId), last } : undefined,
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

/** Folders of the upload clicked in Wino Datei Uploads: marked green in the Ordnerstruktur (blue = selected folder). */
const UploadMarkContext = createContext<Set<string>>(new Set());

function holdsMark(node: Knoten, marks: Set<string>): boolean {
  return node.children.some((child) => marks.has(child.id) || holdsMark(child, marks));
}

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
  const [kept, setOpen] = useKeptState(`admin.zu.open.${node.id}`, depth < 2);
  const [over, setOver] = useState(false);
  const marks = useContext(UploadMarkContext);
  const marked = marks.has(node.id) && !viaLink;
  // A marked folder deeper down opens its parents, so it is visible.
  const open = kept || (!viaLink && marks.size > 0 && holdsMark(node, marks));
  const kids = node.linkTo ? childrenOf(node, nodes) : node.children;
  const selected = selection?.nodeId === node.id && !viaLink;
  const tag = levelTag(node);
  const linkCount = node.quellen?.length ?? 0;
  const target = node.linkTo ? nodes.get(node.linkTo) : null;
  return (
    <li>
      <div
        className={`dms-tree-row dms-zu-row${selected ? " selected" : ""}${marked ? " upload-mark" : ""}${over ? " drop-over" : ""}${viaLink ? " via-link" : ""}`}
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

/** "Verknüpfen?" for an upload dropped on a folder, in the same look as the Verknüpfung(en) overlay. */
function LinkAskModal({
  item,
  where,
  level,
  removing = false,
  last = false,
  onCancel,
  onConfirm,
}: {
  /** Asks to remove the link to `where` instead of adding it. */
  removing?: boolean;
  /** Removing the upload's only link: its files land in the Eingang afterwards. */
  last?: boolean;
  item: SourceItem;
  where: string;
  /** Entity type of the level that gets created (e.g. Partner), if any. */
  level?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { state } = useDms();
  const existing = placesOf(state, item).filter((p) => !removing || formatPath(p.path) !== where);
  const place = winoPlace(item);
  return (
    <DmsModal
      title={removing ? "Verknüpfung auflösen" : "Verknüpfen"}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            {removing ? "Verknüpfung auflösen" : "Verknüpfen"}
          </button>
        </>
      }
    >
      <div className="dms-links-source">
        <strong>{item.label}</strong>
        <span>
          {place.crumbs.map((crumb, i) => (
            <span key={crumb}>
              {i ? <span className="sep">›</span> : null}
              {crumb}
            </span>
          ))}
        </span>
      </div>
      <p className="dms-links-label">{removing ? "Auflösen mit" : "Neu verknüpfen mit"}</p>
      <ul className="dms-links-list">
        <li className="picked">
          <span className="dms-links-row">
            <Icon src={a.folder} size={18} />
            <span>{where}</span>
          </span>
        </li>
      </ul>
      {existing.length ? (
        <>
          <p className="dms-links-label">{removing ? "Bleibt verknüpft mit" : "Bereits verknüpft mit"}</p>
          <ul className="dms-links-list">
            {existing.map((p) => (
              <li key={p.node.id}>
                <span className="dms-links-row">
                  <Icon src={a.folder} size={18} />
                  <span>{formatPath(p.path)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {removing ? (
        last ? (
          <p className="dms-links-note">
            <Icon src={a.onhold} size={16} />
            Danach nicht verknüpft: neue Dateien von hier landen im Eingang.
          </p>
        ) : null
      ) : (
        <p className="dms-links-note">
          <Icon src={a.paperclip} size={16} />
          {level ? `Dafür wird die Ebene je ${level} angelegt. ` : ""}Dateien von dort erscheinen dann in diesem Ordner.
        </p>
      )}
    </DmsModal>
  );
}

/**
 * The folders one upload is linked to. Tick the ones to remove and "Auflösen" (opened from the row menu, all are
 * ticked); the folder button jumps to that folder in the Ordnerstruktur.
 */
function LinksModal({
  item,
  removing,
  onClose,
  onOpen,
}: {
  item: SourceItem;
  /** Opened from "Verknüpfung(en) auflösen": everything ticked. */
  removing: boolean;
  onClose: () => void;
  onOpen: (s: Selection) => void;
}) {
  const { state, apply } = useDms();
  const places = placesOf(state, item);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(removing ? places.map((p) => p.node.id) : []));
  const all = places.length > 0 && places.every((p) => picked.has(p.node.id));
  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const place = winoPlace(item);
  return (
    <DmsModal
      title={places.length > 1 ? "Verknüpfungen" : "Verknüpfung"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={picked.size === 0}
            onClick={() => {
              apply((current) => [...picked].reduce((next, nodeId) => unlinkSource(next, item, nodeId), current));
              onClose();
            }}
          >
            {picked.size > 1 ? `${picked.size} Verknüpfungen auflösen` : "Verknüpfung auflösen"}
          </button>
        </>
      }
    >
      <div className="dms-links-source">
        <strong>{item.label}</strong>
        <span>
          {place.crumbs.map((crumb, i) => (
            <span key={crumb}>
              {i ? <span className="sep">›</span> : null}
              {crumb}
            </span>
          ))}
        </span>
      </div>
      <p className="dms-links-label">Verknüpft mit {places.length === 1 ? "diesem Ordner" : `${places.length} Ordnern`}</p>
      <ul className="dms-links-list">
        {places.map((p) => (
          <li key={p.node.id} className={picked.has(p.node.id) ? "picked" : undefined}>
            <label>
              <input type="checkbox" checked={picked.has(p.node.id)} onChange={() => toggle(p.node.id)} />
              <Icon src={a.folder} size={18} />
              <span>{formatPath(p.path)}</span>
            </label>
            <button
              type="button"
              className="hn-st-open"
              title="Ordner in der Ordnerstruktur zeigen"
              aria-label={`${formatPath(p.path)} zeigen`}
              onClick={() => {
                onOpen({ vorlageId: p.vorlage.id, nodeId: p.node.id });
                onClose();
              }}
            >
              <Icon src={a.openTab} size={16} />
            </button>
          </li>
        ))}
      </ul>
      {places.length === 0 ? <p className="dms-muted">Nicht verknüpft.</p> : null}
      {all ? (
        <p className="dms-links-note">
          <Icon src={a.onhold} size={16} />
          Danach nicht verknüpft: neue Dateien von hier landen im Eingang.
        </p>
      ) : null}
    </DmsModal>
  );
}


/**
 * Where each upload point lives in Wino, as a breadcrumb that opens that page. Modules the prototype does not have
 * yet open their stand-in in Upload-Quellen (Demo).
 */
const WINO_PLACES: Record<string, { crumbs: string[]; hash?: string }> = {
  [sourceKey("partner.stammdaten.anhang", "anhang")]: {
    crumbs: ["Partner", "Stammdaten", "Allgemeine Partnerdaten"],
    hash: "#/person/julia-atkinson/stammdaten-workflow/allgemeine-partnerdaten",
  },
  [sourceKey("partner.stammdaten.anhang", "pruefung")]: {
    crumbs: ["Partner", "Stammdaten prüfen"],
    hash: "#/person/thomas-debrezina/stammdaten-pruefen",
  },
  [sourceKey("partner.stammdaten.anhang", "wirtschaft")]: {
    crumbs: ["Partner", "Stammdaten", "Wirtschaftsdaten"],
    hash: "#/person/julia-atkinson/stammdaten-workflow/wirtschaftsdaten",
  },
  [sourceKey("partner.bank", "bank")]: {
    crumbs: ["Partner", "Stammdaten", "Bankverbindung"],
    hash: "#/person/julia-atkinson/stammdaten-workflow/bankverbindung",
  },
  [sourceKey("maklervereinbarung.vertrag", "vertrag")]: {
    crumbs: ["Partner", "Maklervereinbarung", "Signaturen"],
    hash: "#/person/julia-atkinson/maklervereinbarung/signaturen",
  },
  [sourceKey("partner.aktivitaet.anhang", null)]: { crumbs: ["Partner", "Aktivität"] },
  [sourceKey("kunde.polizze", null)]: { crumbs: ["Polizzen", "Polizze anlegen"] },
  [sourceKey("schaden.dokumente", null)]: { crumbs: ["Schaden", "Dokumente"] },
  [sourceKey("kommunikation.email", null)]: { crumbs: ["Kommunikation", "E-Mail"] },
  [sourceKey("versicherer.bedingungen", null)]: { crumbs: ["Versicherer", "Bedingungen"] },
};

const winoPlace = (item: SourceItem) => WINO_PLACES[sourceKey(item.source, item.slot)] ?? { crumbs: [item.module] };

type UploadFilter = "linked" | "open";

function SourcesPanel({
  selection,
  onOpen,
  onDemo,
  pickedUpload,
  onPick,
}: {
  /** The upload clicked in the table (its folders are marked in the Ordnerstruktur). */
  pickedUpload: string | null;
  onPick: (key: string | null) => void;
  selection: Selection | null;
  onOpen: (s: Selection) => void;
  /** Opens Upload-Quellen (Demo) for modules the prototype does not have yet. */
  onDemo: () => void;
}) {
  const { state } = useDms();
  const [filter, setFilter] = useKeptState<UploadFilter | null>("admin.zu.uploads.v2", null);
  const [linksFor, setLinksFor] = useState<{ item: SourceItem; removing: boolean } | null>(null);
  const places = linkPlaces(state);
  const countOf = (item: SourceItem) => places.filter((p) => p.link.source === item.source && p.link.slot === item.slot).length;
  // With a folder selected the hot filters are about that folder: linked to it, or not (yet).
  const vorlage = selection ? state.vorlagen.find((v) => v.id === selection.vorlageId) : undefined;
  const folder = vorlage && selection ? findNode(vorlage.root, selection.nodeId) : null;
  const onFolder = (item: SourceItem) => Boolean(folder?.quellen?.some((q) => q.source === item.source && q.slot === item.slot));
  const isLinked = (item: SourceItem) => (folder ? onFolder(item) : countOf(item) > 0);
  const linked = SOURCE_ITEMS.filter(isLinked);
  const open = SOURCE_ITEMS.filter((item) => !isLinked(item));
  const picked = filter === "linked" ? linked : filter === "open" ? open : SOURCE_ITEMS;
  // A selected folder's own uploads come first and are highlighted.
  const rows = folder ? [...picked].sort((x, y) => Number(onFolder(y)) - Number(onFolder(x))) : picked;
  const hint = folder
    ? `Auf einen Ordner links ziehen, um zu verknüpfen. Verknüpft = mit „${folder.name}“.`
    : "Auf einen Ordner links ziehen, um zu verknüpfen. Nicht verknüpfte Uploads landen im Eingang.";
  return (
    <div className="dms-zu-pane">
      <p className="dms-zu-intro">
        <strong>Wino Datei Uploads</strong> · Jeder Ort in Wino mit Dateiupload erscheint hier automatisch.
      </p>
      <HotFilters
        active={filter}
        onChange={setFilter}
        items={[
          { id: "linked", label: "Verknüpft", value: linked.length, icon: a.paperclip, unit: "Uploads" },
          { id: "open", label: "Nicht verknüpft", value: open.length, icon: a.onhold, unit: "→ Eingang" },
        ]}
      />
      <p className="dms-muted dms-zu-hint">{hint}</p>
      <div className="dms-zu-upload-table">
        <DmsTable
          rows={rows}
          rowKey={(item) => sourceKey(item.source, item.slot)}
          label="Wino Datei Uploads"
          unit="Uploads"
          rowClass={(item) =>
            `dms-zu-upload-row${countOf(item) ? "" : " unlinked"}${folder && onFolder(item) ? " on-folder" : ""}${pickedUpload === sourceKey(item.source, item.slot) ? " upload-mark" : ""}`
          }
          onSelect={(item) => {
            const key = sourceKey(item.source, item.slot);
            onPick(pickedUpload === key ? null : key);
          }}
          rowProps={(item) => ({
            draggable: true,
            title: "Auf einen Ordner ziehen, um zu verknüpfen",
            onDragStart: (event) => {
              event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(item));
              event.dataTransfer.effectAllowed = "link";
            },
          })}
          actions={(item) => {
            const count = countOf(item);
            return (
              <RowMenu
                label={`Aktionen für ${item.label}`}
                items={
                  count
                    ? [{ label: count > 1 ? "Verknüpfungen auflösen" : "Verknüpfung auflösen", icon: a.menuUnlink, onSelect: () => setLinksFor({ item, removing: true }) }]
                    : []
                }
              />
            );
          }}
          columns={[
            {
              key: "upload",
              label: "Upload",
              width: "minmax(240px, 1.3fr)",
              text: (item) => item.label,
              render: (item) => (
                <span className="dms-zu-upload-name">
                  <span className="dms-zu-grip" aria-hidden>
                    ⋮⋮
                  </span>
                  {item.label}
                </span>
              ),
            },
            { key: "bereich", label: "Bereich", width: "minmax(130px, 0.7fr)", text: (item) => item.module },
            {
              key: "ort",
              label: "Ort in Wino",
              width: "minmax(240px, 1.4fr)",
              text: (item) => winoPlace(item).crumbs.join(" › "),
              render: (item) => {
                const place = winoPlace(item);
                const title = place.hash ? "In Wino öffnen" : "Gibt es im Prototyp noch nicht – in Upload-Quellen (Demo) öffnen";
                const go = () => (place.hash ? (window.location.hash = place.hash) : onDemo());
                return (
                  <>
                    <button type="button" className="dms-zu-crumbs" title={title} onClick={go}>
                      {place.crumbs.map((crumb, i) => (
                        <span key={crumb}>
                          {i ? <span className="sep">›</span> : null}
                          {crumb}
                        </span>
                      ))}
                    </button>
                    <button type="button" className="hn-st-open" aria-label={`${place.crumbs.join(" › ")} öffnen`} title={title} onClick={go}>
                      <Icon src={a.openTab} size={16} />
                    </button>
                  </>
                );
              },
            },
            {
              key: "verknuepft",
              label: "Verknüpft",
              width: "minmax(170px, 0.6fr)",
              text: (item) => (countOf(item) ? `${countOf(item)}` : "Nicht verknüpft"),
              render: (item) => {
                const count = countOf(item);
                return count ? (
                  <button
                    type="button"
                    className="dms-link-count dms-zu-count-btn"
                    aria-label={`${count} Verknüpfung${count === 1 ? "" : "en"} anzeigen`}
                    onClick={() => setLinksFor({ item, removing: false })}
                  >
                    <Icon src={a.paperclip} size={14} />
                    {count}
                  </button>
                ) : (
                  <span className="dms-zu-inbox">
                    <Icon src={a.onhold} size={16} />
                    Nicht verknüpft
                  </span>
                );
              },
            },
          ]}
          empty={
            <p className="dms-empty">
              {filter === "linked"
                ? folder
                  ? "Mit diesem Ordner ist noch kein Upload verknüpft."
                  : "Noch kein Upload verknüpft."
                : filter === "open"
                  ? folder
                    ? "Alle Uploads sind mit diesem Ordner verknüpft."
                    : "Alle Uploads sind verknüpft."
                  : "Keine Uploads."}
            </p>
          }
        />
      </div>
      {linksFor ? <LinksModal key={sourceKey(linksFor.item.source, linksFor.item.slot)} item={linksFor.item} removing={linksFor.removing} onClose={() => setLinksFor(null)} onOpen={onOpen} /> : null}
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

type Port = { x: number; y: number };
type Line = { from: string; to: string };
type DragLine = { from: string; x: number; y: number; over: string | null };

/** Every folder of one root template, in tree order, with its depth (linked sub-folders are not repeated). */
function flatFolders(root: Knoten, depth = 0): { node: Knoten; depth: number }[] {
  return [{ node: root, depth }, ...root.children.flatMap((child) => flatFolders(child, depth + 1))];
}

/**
 * Ordner verbinden as a board: one column per root folder, every folder a node. Drag from a folder's dot onto another
 * folder: that folder then also shows the files of the first one (from every place it appears; same-named sub-folders
 * merged). Click a line to choose its sub-folders or to separate it. Folders are only added in the Ordnerstruktur.
 */
function ConnectPane({ selection, onSelect, onEdit }: { selection: Selection | null; onSelect: (s: Selection) => void; onEdit: () => void }) {
  const { state, apply } = useDms();
  const ask = useContext(ConfirmContext);
  const boardRef = useRef<HTMLDivElement>(null);
  const [ports, setPorts] = useState<Record<string, { in: Port; out: Port }>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<DragLine | null>(null);
  /** The line being edited or the one just drawn (not saved yet). */
  const [active, setActive] = useState<(Line & { pending: boolean }) | null>(null);
  const [include, setInclude] = useState<Set<string> | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const targets = useMemo(() => linkTargets(state), [state]);
  const pathOf = (id: string) => targets.find((t) => t.id === id)?.path ?? [];
  const vorlageOf = (id: string) => state.vorlagen.find((v) => findNode(v.root, id));
  const lines: Line[] = state.vorlagen.flatMap((v) =>
    flatFolders(v.root).flatMap(({ node }) => (node.verbindungen ?? []).map((x) => ({ from: x.nodeId, to: node.id }))),
  );
  const lineKey = (l: Line) => `${l.from}>${l.to}`;
  const canConnect = (from: string, to: string) =>
    from !== to && !related(pathOf(from), pathOf(to)) && !lines.some((l) => l.from === from && l.to === to);

  // Measure every folder's dots, relative to the board (it scrolls; the lines scroll with it).
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const box = board.getBoundingClientRect();
      const next: Record<string, { in: Port; out: Port }> = {};
      board.querySelectorAll<HTMLElement>("[data-cc-node]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const y = r.top - box.top + board.scrollTop + r.height / 2;
        next[el.dataset.ccNode!] = {
          in: { x: r.left - box.left + board.scrollLeft, y },
          out: { x: r.right - box.left + board.scrollLeft, y },
        };
      });
      setPorts(next);
      setSize({ w: board.scrollWidth, h: board.scrollHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    board.querySelectorAll(".cc-col").forEach((col) => observer.observe(col));
    return () => observer.disconnect();
  }, [state.vorlagen]);

  // With the panel open the board is narrower: keep both ends of the line in view.
  useEffect(() => {
    if (!active) return;
    const board = boardRef.current;
    const el = board?.querySelector<HTMLElement>(`[data-cc-node="${active.to}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);

  function pointAt(event: { clientX: number; clientY: number }) {
    const board = boardRef.current!;
    const box = board.getBoundingClientRect();
    return { x: event.clientX - box.left + board.scrollLeft, y: event.clientY - box.top + board.scrollTop };
  }

  function nodeUnder(event: { clientX: number; clientY: number }) {
    const el = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-cc-node]");
    return el?.dataset.ccNode ?? null;
  }

  function startDrag(event: React.PointerEvent, from: string) {
    event.preventDefault();
    event.stopPropagation();
    const at = pointAt(event);
    setActive(null);
    setDrag({ from, ...at, over: null });
    const move = (e: PointerEvent) => {
      const over = nodeUnder(e);
      setDrag((d) => (d ? { ...d, ...pointAt(e), over: over && canConnect(from, over) ? over : null } : d));
    };
    const up = (e: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const to = nodeUnder(e);
      setDrag(null);
      if (to && canConnect(from, to)) {
        setActive({ from, to, pending: true });
        setInclude(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function curve(a: Port, b: Port) {
    // Out of the right side, into the left side; a backwards line swings out wide.
    const dx = Math.max(60, Math.abs(b.x - a.x) / 2);
    return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
  }

  const preview = active ? connectionPreview(state, active.from) : null;
  const rels = preview ? allRels(preview.tree) : [];
  const saved = active && !active.pending ? vorlageOf(active.to)?.root && findNode(vorlageOf(active.to)!.root, active.to)?.verbindungen?.find((x) => x.nodeId === active.from) : null;

  function openLine(l: Line) {
    const to = vorlageOf(l.to);
    const existing = to ? findNode(to.root, l.to)?.verbindungen?.find((x) => x.nodeId === l.from) : undefined;
    setActive({ ...l, pending: false });
    setInclude(existing?.include ? new Set(existing.include) : null);
  }

  function toggle(m: MergedFolder) {
    setInclude((prev) => {
      const next = new Set(prev ?? rels);
      if (next.has(m.rel)) {
        for (const r of [...next]) if (r === m.rel || r.startsWith(`${m.rel}/`)) next.delete(r);
      } else {
        const parts = m.rel.split("/");
        parts.forEach((_, i) => next.add(parts.slice(0, i + 1).join("/")));
      }
      return next;
    });
  }

  function save() {
    if (!active) return;
    const to = vorlageOf(active.to);
    if (!to) return;
    const chosen = include === null ? null : [...include];
    apply((s) => setVerbindung(s, to.id, active.to, { nodeId: active.from, include: chosen }));
    setActive({ ...active, pending: false });
  }

  function separate() {
    if (!active) return;
    const to = vorlageOf(active.to);
    if (!to) return;
    const line = active;
    ask({
      title: "Verbindung trennen?",
      text: `„${nodePath(state, line.from)}“ von „${nodePath(state, line.to)}“ trennen? Die Dateien bleiben an ihrem Ort.`,
      confirmLabel: "Trennen",
      run: () => {
        apply((s) => removeVerbindung(s, to.id, line.to, line.from));
        setActive(null);
      },
    });
  }

  const marked = new Set(active ? [active.from, active.to] : hover ? hover.split(">") : []);

  return (
    <div className="dms-zu-pane cc">
      <div className="cc-head">
        <p className="dms-zu-intro">
          <strong>Ordner verbinden</strong> · Vom Punkt eines Ordners eine Linie auf einen anderen ziehen: der zeigt dann zusätzlich dessen Dateien,
          von jeder Stelle. Linie anklicken zum Bearbeiten oder Trennen.
        </p>
      </div>
      <div className="cc-wrap">
        <div className={drag ? "cc-board dragging" : "cc-board"} ref={boardRef}>
          <svg className="cc-lines" width={size.w} height={size.h} aria-hidden={false}>
            <defs>
              <marker id="cc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {lines.map((l) => {
              const a = ports[l.from]?.out;
              const b = ports[l.to]?.in;
              if (!a || !b) return null;
              const key = lineKey(l);
              const on = active && !active.pending && lineKey(active) === key;
              const d = curve(a, b);
              return (
                <g key={key} className={`cc-line${on ? " active" : ""}${hover === key ? " hover" : ""}`}>
                  <path d={d} className="cc-line-path" markerEnd="url(#cc-arrow)" />
                  <path
                    d={d}
                    className="cc-line-hit"
                    role="button"
                    aria-label={`Verbindung ${nodePath(state, l.from)} zu ${nodePath(state, l.to)}`}
                    onMouseEnter={() => setHover(key)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => openLine(l)}
                  />
                </g>
              );
            })}
            {active?.pending && ports[active.from] && ports[active.to] ? (
              <g className="cc-line pending">
                <path d={curve(ports[active.from].out, ports[active.to].in)} className="cc-line-path" markerEnd="url(#cc-arrow)" />
              </g>
            ) : null}
            {drag && ports[drag.from] ? (
              <g className={drag.over ? "cc-line drawing ok" : "cc-line drawing"}>
                <path
                  d={curve(ports[drag.from].out, drag.over && ports[drag.over] ? ports[drag.over].in : { x: drag.x, y: drag.y })}
                  className="cc-line-path"
                  markerEnd="url(#cc-arrow)"
                />
              </g>
            ) : null}
          </svg>
          <div className="cc-cols">
            {state.vorlagen.map((v) => (
              <section key={v.id} className="cc-col">
                <header className="cc-col-head">
                  <strong>{v.name}</strong>
                  <span className="dms-tag">{v.ansichten.length > 1 ? "Verwaltung & Standard" : `nur ${v.ansichten[0]}`}</span>
                </header>
                <ul>
                  {flatFolders(v.root).map(({ node, depth }) => {
                    const selected = selection?.nodeId === node.id;
                    const blocked = drag && drag.from !== node.id && !canConnect(drag.from, node.id);
                    return (
                      <li key={node.id}>
                        <div
                          data-cc-node={node.id}
                          className={`cc-node${depth === 0 ? " root" : ""}${selected ? " selected" : ""}${marked.has(node.id) ? " marked" : ""}${
                            drag?.over === node.id ? " drop" : ""
                          }${blocked ? " blocked" : ""}${drag?.from === node.id ? " from" : ""}`}
                          style={{ marginLeft: depth * 14 }}
                          onClick={() => onSelect({ vorlageId: v.id, nodeId: node.id })}
                          onDoubleClick={onEdit}
                          title="Klicken: wählen · Doppelklick: Einstellungen"
                        >
                          <span className="cc-port in" aria-hidden />
                          <Icon src={a.folder} size={16} />
                          <span className="cc-name">{node.name}</span>
                          {node.verbindungen?.length ? <span className="cc-badge">{node.verbindungen.length}</span> : null}
                          <span
                            className="cc-port out"
                            role="button"
                            aria-label={`Linie von ${node.name} ziehen`}
                            title="Ziehen, um zu verbinden"
                            onPointerDown={(event) => startDrag(event, node.id)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {active && preview ? (
          <aside className="cc-panel" aria-label="Verbindung">
            <header>
              <small>{active.pending ? "Neue Verbindung" : "Verbindung"}</small>
              <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={() => setActive(null)}>
                <img src={a.iconCloseDark} alt="" width={12} height={12} />
              </button>
            </header>
            <div className="cc-pair">
              <span>
                <small>Dateien aus</small>
                <strong>{nodePath(state, active.from)}</strong>
              </span>
              <span>
                <small>erscheinen zusätzlich in</small>
                <strong>{nodePath(state, active.to)}</strong>
              </span>
            </div>
            <p className="dms-muted">
              Kommt an {preview.instances.length} {preview.instances.length === 1 ? "Stelle" : "Stellen"} vor · {preview.docs} Dateien
            </p>
            {preview.tree.length ? (
              <div className="cc-subs">
                <label className="dms-check">
                  <input type="checkbox" checked={include === null} onChange={(event) => setInclude(event.target.checked ? null : new Set(rels))} />
                  Alle Unterordner übernehmen
                </label>
                <SubfolderChecks list={preview.tree} total={preview.instances.length} include={include} onToggle={toggle} />
              </div>
            ) : (
              <p className="dms-muted">Keine Unterordner – nur die Dateien direkt darin.</p>
            )}
            <footer>
              {active.pending ? (
                <button type="button" className="btn-secondary" onClick={() => setActive(null)}>
                  Abbrechen
                </button>
              ) : (
                <button type="button" className="btn-secondary" onClick={separate}>
                  Trennen
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={(include !== null && include.size === 0 && preview.tree.length > 0) || (!active.pending && sameInclude(saved?.include ?? null, include))}
                onClick={save}
              >
                {active.pending ? "Verbinden" : "Speichern"}
              </button>
            </footer>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function sameInclude(saved: string[] | null, current: Set<string> | null) {
  if (saved === null || current === null) return saved === null && current === null;
  return saved.length === current.size && saved.every((r) => current.has(r));
}

type MainTab = "quellen" | "verbinden" | "einstellungen" | "demo";

const MAIN_TABS: [MainTab, string][] = [
  ["quellen", "Wino Datei Uploads"],
  ["verbinden", "Ordner verbinden"],
  ["einstellungen", "Einstellungen"],
  ["demo", "Upload-Quellen (Demo)"],
];

export function Zuordnung() {
  const { state, apply } = useDms();
  const [selection, setSelection] = useKeptState<Selection | null>("admin.zu.selection", null);
  const [flash, setFlash] = useState<{ message: string; tone?: "ok" | "warn"; undo?: () => void } | null>(null);
  const nodes = useMemo(() => nodeIndex(state.vorlagen), [state.vorlagen]);
  // Every folder in one structure; Spaces shows what Verwaltung and Standard each make of it.
  const tops = state.vorlagen;
  const current = selection && tops.some((v) => v.id === selection.vorlageId) ? selection : null;

  const [ask, setAsk] = useState<Ask | null>(null);
  const [picked, setPicked] = useKeptState<string | null>("admin.zu.picked", null);
  const [kept, setTab] = useKeptState<MainTab>("admin.zu.tab", "quellen");
  const tab = MAIN_TABS.some(([id]) => id === kept) ? kept : "quellen";
  const pickedItem = tab === "quellen" && picked ? SOURCE_ITEMS.find((item) => sourceKey(item.source, item.slot) === picked) : undefined;
  const marks = useMemo(() => new Set(pickedItem ? placesOf(state, pickedItem).map((p) => p.node.id) : []), [state, pickedItem]);

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
      setFlash({ message: `„${item.label}“ ist mit diesem Ordner schon verknüpft.`, tone: "warn" });
      return;
    }
    const where = createsLevel ? `${nodePath(state, target.nodeId)} / {${item.entityType}…}` : nodePath(state, landed);
    setAsk({
      title: "Quelle verknüpfen?",
      text: `„${item.module} → ${item.label}“ mit „${where}“ verknüpfen?${
        createsLevel ? ` Dafür wird die Ebene je ${item.entityType} angelegt.` : ""
      } Dateien von dort erscheinen dann in diesem Ordner.`,
      confirmLabel: "Verknüpfen",
      link: { item, where, level: createsLevel ? item.entityType ?? undefined : undefined },
      run: () => {
        let before: DmsState | null = null;
        apply((s) => {
          before = s;
          return linkSource(s, target.vorlageId, target.nodeId, link, levelId).state;
        });
        setSelection({ vorlageId: target.vorlageId, nodeId: landed });
        setFlash({
          message: createsLevel ? `„${item.label}“ verknüpft. Ebene je ${item.entityType} wurde angelegt.` : `„${item.label}“ verknüpft.`,
          undo: () => {
            if (before) apply(() => before!);
            setFlash(null);
          },
        });
      },
    });
  }

  return (
    <ConfirmContext.Provider value={setAsk}>
    <UploadMarkContext.Provider value={marks}>
    <div className="dms-zu">
      <section className="dms-panel dms-zu-tree">
        <header className="dms-panel-head">
          <div className="dms-list-title">
            <small>Ordner anlegen und verknüpfen</small>
            <strong>Ordnerstruktur</strong>
          </div>
        </header>
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
            <small>Ordner Zuordnung</small>
            <strong>
              <span>{MAIN_TABS.find(([id]) => id === tab)?.[1]}</span>
            </strong>
          </div>
          <div className="dms-segment" role="tablist">
            {MAIN_TABS.map(([id, label]) => (
              <button type="button" role="tab" key={id} aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
        </header>
        {tab === "quellen" ? <SourcesPanel selection={current} onOpen={setSelection} onDemo={() => setTab("demo")} pickedUpload={picked} onPick={setPicked} /> : null}
        {tab === "verbinden" ? <ConnectPane selection={current} onSelect={setSelection} onEdit={() => setTab("einstellungen")} /> : null}
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
        {tab === "demo" ? (
          <div className="dms-zu-pane dms-zu-embed">
            <UploadSources />
          </div>
        ) : null}
      </section>
    </div>
    {flash ? <Snackbar key={flash.message} message={flash.message} tone={flash.tone} onUndo={flash.undo} onClose={() => setFlash(null)} /> : null}
    {ask?.link || ask?.unlink ? (
      <LinkAskModal
        item={(ask.link ?? ask.unlink)!.item}
        where={(ask.link ?? ask.unlink)!.where}
        level={ask.link?.level}
        removing={!!ask.unlink}
        last={ask.unlink?.last}
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          ask.run();
          setAsk(null);
        }}
      />
    ) : ask ? (
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
    </UploadMarkContext.Provider>
    </ConfirmContext.Provider>
  );
}
