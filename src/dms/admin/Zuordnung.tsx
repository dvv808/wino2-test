import { useMemo, useState, type DragEvent } from "react";
import * as a from "../../assets/index";
import { addChildNode, findNode, moveNode, newId, removeNode, updateNode } from "../../lib/dms/admin";
import { addTopFolder, linkPlaces, linkSource, linkTargets, removeTopFolder, setFolderLink, setLinkTyp, unlinkSource } from "../../lib/dms/links";
import { formatPath } from "../../lib/dms/placeholders";
import { SOURCE_ITEMS, sourceKey, sourceLabel, type SourceItem } from "../../lib/dms/sources";
import { childrenOf, nodeIndex } from "../../lib/dms/views";
import type { Ansicht, EntityType, GroupBy, Knoten, MetaField, Ordnervorlage } from "../../types/dms";
import { Icon } from "../../ui";
import { useDms } from "../store";
import { ConditionRow, PermissionsEditor } from "./folderFields";

/**
 * Ordner Zuordnung: build the folders of an Ansicht and link WINO's upload points to them by drag & drop.
 * Spaces (next pill) shows the outcome with the files.
 */

const DRAG_TYPE = "application/x-wino-source";

const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Fester Ordner" },
  { value: "link:Partner", label: "Ein Ordner je Partner" },
  { value: "link:Kunde", label: "Ein Ordner je Kunde" },
  { value: "link:Versicherer", label: "Ein Ordner je Versicherer" },
  { value: "link:Schaden", label: "Ein Ordner je Schaden" },
  { value: "meta:sparte", label: "Ein Ordner je Sparte" },
  { value: "meta:jahr", label: "Ein Ordner je Jahr" },
  { value: "name:sparte", label: "Name = Sparte (z. B. „Feuerversicherung“)" },
];

const PLACEHOLDER_CHIPS = ["{Partner.Name}", "{Kunde.Name}", "{Versicherer}", "{Schaden.Nummer}", "{Sparte}", "{Jahr}"];

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

function SourcesPanel({ ansicht, selection, onLink }: { ansicht: Ansicht; selection: Selection | null; onLink: (item: SourceItem) => void }) {
  const { state } = useDms();
  const places = linkPlaces(state, ansicht);
  const modules = [...new Set(SOURCE_ITEMS.map((s) => s.module))];
  return (
    <section className="dms-panel dms-zu-sources">
      <header className="dms-panel-head">
        <div className="dms-list-title">
          <small>Hier wird in WINO hochgeladen</small>
          <strong>Quellen</strong>
        </div>
      </header>
      <p className="dms-muted dms-zu-hint">Auf einen Ordner links ziehen, um die Quelle zu verknüpfen.</p>
      <div className="dms-zu-source-list">
        {modules.map((module) => (
          <div key={module} className="dms-zu-module">
            <h4>{module}</h4>
            {SOURCE_ITEMS.filter((s) => s.module === module).map((item) => {
              const place = places.find((p) => p.link.source === item.source && p.link.slot === item.slot);
              return (
                <div
                  key={sourceKey(item.source, item.slot)}
                  className={`dms-zu-source${place ? "" : " unlinked"}`}
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
                    <small>{place ? formatPath(place.path) : "Nicht verknüpft – landet im Eingang"}</small>
                  </span>
                  <button
                    type="button"
                    className="dms-icon-btn"
                    disabled={!selection}
                    title={selection ? "Mit dem ausgewählten Ordner verknüpfen" : "Erst links einen Ordner wählen"}
                    onClick={() => onLink(item)}
                  >
                    <Icon src={a.verknuepfung} size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function NodeDetails({ ansicht, selection, onSelect }: { ansicht: Ansicht; selection: Selection; onSelect: (s: Selection | null) => void }) {
  const { state, apply } = useDms();
  const [advanced, setAdvanced] = useState(false);
  const vorlage = state.vorlagen.find((v) => v.id === selection.vorlageId);
  const node = vorlage ? findNode(vorlage.root, selection.nodeId) : null;
  if (!vorlage || !node) return null;
  const isRoot = vorlage.root.id === node.id;
  const patch = (p: Partial<Omit<Knoten, "id" | "children">>) => apply((s) => updateNode(s, vorlage.id, node.id, p));
  const targets = linkTargets(state, ansicht).filter((t) => t.id !== node.id);
  const shared = vorlage.ansichten.length > 1;

  return (
    <section className="dms-panel dms-zu-details">
      <header className="dms-panel-head">
        <div className="dms-list-title">
          <small>{shared ? "Ordner · gilt in Verwaltung und Standard" : `Ordner · ${vorlage.ansichten[0]}`}</small>
          <strong>
            <Icon src={a.folder} size={20} />
            <span>{node.name}</span>
          </strong>
        </div>
      </header>
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
                "link:Kunde": "{Kunde.Name}",
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

        <label className="dms-missing-field">
          <span className="field-label">Verknüpfter Ordner</span>
          <select className="dms-input" value={node.linkTo ?? ""} onChange={(event) => apply((s) => setFolderLink(s, vorlage.id, node.id, event.target.value || null))}>
            <option value="">– keiner –</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {formatPath(t.path)}
              </option>
            ))}
          </select>
        </label>
        {node.linkTo ? (
          <p className="dms-muted">Übernimmt die Unterordner des verknüpften Ordners (gleiche Namen) und füllt sie mit den eigenen Dokumenten.</p>
        ) : null}

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
            <button type="button" className="dms-icon-btn" aria-label="Verknüpfung lösen" onClick={() => apply((s) => unlinkSource(s, q))}>
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
    </section>
  );
}

export function Zuordnung({ ansicht, onAnsicht }: { ansicht: Ansicht; onAnsicht: (a: Ansicht) => void }) {
  const { state, apply } = useDms();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const nodes = useMemo(() => nodeIndex(state.vorlagen), [state.vorlagen]);
  const tops = state.vorlagen.filter((v) => v.ansichten.includes(ansicht));
  const current = selection && tops.some((v) => v.id === selection.vorlageId) ? selection : null;

  function link(target: Selection, item: SourceItem) {
    // Same pure step for the message and the store, with the new level's id made up front.
    const levelId = newId("n");
    const link = { source: item.source, slot: item.slot, dokumenttyp: item.dokumenttyp };
    const landed = linkSource(state, target.vorlageId, target.nodeId, link, levelId).nodeId;
    apply((s) => linkSource(s, target.vorlageId, target.nodeId, link, levelId).state);
    setSelection({ vorlageId: target.vorlageId, nodeId: landed });
    setFlash(landed === levelId ? `„${item.label}“ verknüpft. Ebene je ${item.entityType} wurde angelegt.` : `„${item.label}“ verknüpft.`);
  }

  return (
    <div className="dms-zu">
      <section className="dms-panel dms-zu-tree">
        <header className="dms-panel-head">
          <div className="dms-list-title">
            <small>Ordnerstruktur</small>
            <strong>{ansicht}</strong>
          </div>
          <div className="dms-segment" role="tablist">
            {(["Verwaltung", "Standard"] as Ansicht[]).map((x) => (
              <button type="button" key={x} className={ansicht === x ? "active" : ""} onClick={() => onAnsicht(x)}>
                {x}
              </button>
            ))}
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
              apply((s) => addTopFolder(s, ansicht, "Neuer Ordner", ids).state);
              setSelection({ vorlageId: ids.vorlage, nodeId: ids.node });
            }}
          >
            + Ordner
          </button>
        </div>
      </section>
      <SourcesPanel ansicht={ansicht} selection={current} onLink={(item) => current && link(current, item)} />
      {current ? (
        <NodeDetails ansicht={ansicht} selection={current} onSelect={setSelection} />
      ) : (
        <section className="dms-panel dms-zu-details empty">
          <img src={a.folder} alt="" width={36} height={36} />
          <p>Ordner links wählen oder anlegen. Quellen aus der Mitte auf einen Ordner ziehen.</p>
        </section>
      )}
    </div>
  );
}
