import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ViewerBar } from "../documents";
import * as a from "../assets/index";
import { ContextMenu, Icon, type ContextItem } from "../ui";
import { docMetaLine, type Block, type Card, type Empty, type Row, type Value } from "./stammdaten";
import { FILE_PARTNERS, type PartnerId } from "./partners";
import { useWorkflow } from "../workflow";

/**
 * Open-in-tab on a contact person (Figma 22720:174995): opens that partner's own file. Hidden when the
 * person has no file in Wino yet.
 */
function PersonOpen({ name }: { name: string }) {
  const { openPartner, extraPartners } = useWorkflow();
  const key = name.trim().toLowerCase();
  const target = [...Object.values(FILE_PARTNERS), ...extraPartners].find((entry) => entry.name.toLowerCase() === key);
  if (!target) return null;
  return (
    <button
      type="button"
      className="pp-person-open"
      aria-label={`${target.name} öffnen`}
      title={`${target.name} öffnen`}
      onClick={(event) => {
        event.stopPropagation();
        openPartner(target.id as PartnerId);
      }}
    >
      <img src={a.openTab} alt="" />
    </button>
  );
}

/** Row labels as the card shows them; the stored label stays short. */
const ROW_LABEL: Record<string, string> = { Webseite: "Website & Social Media" };

function valueKey(value: Value) {
  if (typeof value === "string") return value;
  if (value.kind === "entity") return `${value.tag}|${value.name}|${value.sub}`;
  if (value.kind === "person") return value.name;
  return value.text;
}

function chipClass(tag: string) {
  if (tag === "Kunde") return "chip kunde";
  if (tag === "Einfache Person") return "chip einfach";
  return "chip";
}

/**
 * Long values (mail addresses, links) wrap inside the card instead of running out of it: a break is offered
 * after "@" and after dots, and as a last resort anywhere (see .pp-val-text). Nothing is cut off.
 */
function breakable(text: string) {
  if (!/[@.]/.test(text) || text.length < 24 || /\s/.test(text)) return <span className="pp-val-text">{text}</span>;
  const parts = text.split(/(?<=[@.])/);
  return (
    <span className="pp-val-text">
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 ? <wbr /> : null}
        </span>
      ))}
    </span>
  );
}

type FileVal = Extract<Value, { kind: "file" }>;

/** A document on a card: clicking it opens the document preview (never a route or another file). */
function FileValue({ value, className }: { value: FileVal; className: string }) {
  const [open, setOpen] = useState(false);
  const glyph = value.type === "jpg" ? a.jpg : a.pdf;
  const meta = docMetaLine(value);
  return (
    <>
      <button
        type="button"
        className={`${className} file`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <img src={glyph} alt="" width={17} height={20} />
        {meta ? (
          <span className="pp-file-copy">
            {value.text}
            <small>{meta}</small>
          </span>
        ) : (
          value.text
        )}
      </button>
      {open ? <FilePreview value={value} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Document preview modal: title bar, viewer bar with zoom, Typ / Gültigkeit / Aussteller, the pages. */
export function FilePreview({ value, onClose, placeholder }: { value: FileVal; onClose: () => void; placeholder?: boolean }) {
  const [zoom, setZoom] = useState(100);
  const meta = docMetaLine(value);
  const pages = value.type === "jpg" ? [a.docPage1] : [a.docPage1, a.docPage2];
  return createPortal(
    <div className="umw-modal file-preview" role="dialog" aria-label={value.text}>
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="umw-body file-preview-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">{value.docTyp || "Dokument"}</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onClose}>
            <Icon src={a.iconCloseDark} size={12} />
          </button>
        </header>
        <div className="file-preview-content">
          {value.docTyp || meta ? (
            <p className="file-preview-meta">
              {value.docTyp ? <span className="chip">{value.docTyp}</span> : null}
              {meta}
            </p>
          ) : null}
          {placeholder ? (
            // Placeholder only: a file icon and a note that the file's preview would show here.
            <div className="file-preview-placeholder">
              <img src={value.type === "jpg" ? a.jpg : a.pdf} alt="" width={56} height={66} />
              <strong>{value.text}</strong>
              <span>Hier wird die Vorschau der Datei angezeigt.</span>
            </div>
          ) : (
          <div className="pdf-frame">
            <ViewerBar fileName={value.text} zoom={zoom} onZoom={setZoom} />
            <div className="pdf-pages file-preview-pages">
              {pages.map((page, index) => (
                <div className="pdf-page" key={index} style={{ width: `${zoom}%` }}>
                  <img src={page} alt={`Seite ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ValueCell({ value, className }: { value: Value; className?: string }) {
  const cls = ["pp-val", className].filter(Boolean).join(" ");

  if (typeof value === "string") return <span className={cls}>{breakable(value)}</span>;

  if (value.kind === "link") {
    return (
      <a className={`${cls} link`} href="#daten">
        {value.icon ? <img src={value.icon} alt="" width={18} height={18} /> : null}
        <span>{value.text}</span>
      </a>
    );
  }

  if (value.kind === "flag") {
    return (
      <span className={cls}>
        <span className="pp-flag at" aria-hidden="true" />
        {value.text}
      </span>
    );
  }

  if (value.kind === "person") {
    // The small team avatar of the lists (Kundenberater, Mitarbeiter): photo, else the partner glyph.
    return (
      <span className={`${cls} pp-person-val`}>
        <span className="emp-avatar">
          <img src={value.photo || a.clientBlank} alt="" />
        </span>
        {value.name}
      </span>
    );
  }

  if (value.kind === "file") return <FileValue value={value} className={cls} />;

  return (
    <span className={className ? `${className} pp-entity` : "pp-entity"}>
      <span className="pp-entity-copy">
        {value.tag ? <span className={chipClass(value.tag)}>{value.tag}</span> : null}
        <strong>{value.name}</strong>
        <small>{value.sub}</small>
      </span>
      <Icon src={a.openTab} size={18} />
    </span>
  );
}

function DiffValue({
  now,
  was,
  change,
}: {
  now?: Value;
  was?: Value;
  change?: "added" | "changed" | "removed";
}) {
  if (change === "removed" && was !== undefined) return <ValueCell value={was} className="was" />;
  if (!change || change === "added" || was === undefined) {
    return now !== undefined ? <ValueCell value={now} className={change === "added" ? "now" : undefined} /> : null;
  }

  return (
    <span className="pp-val-diff">
      <ValueCell value={was} className="was" />
      <Icon src={a.arrowRight} size={14} />
      {now !== undefined ? <ValueCell value={now} className="now" /> : null}
    </span>
  );
}

/** Copies a phone number, mail address etc. to the clipboard; shows a tick for a moment. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      className={copied ? "pp-row-note pp-row-copy copied" : "pp-row-note pp-row-copy"}
      aria-label={`${label} kopieren`}
      title={copied ? "Kopiert" : "Kopieren"}
      onClick={(event) => {
        event.stopPropagation();
        void navigator.clipboard?.writeText(value).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      <img src={copied ? a.tick : a.hnCopy} alt="" width={copied ? 12 : 18} height={copied ? 12 : 18} />
    </button>
  );
}

function RowLine({
  row,
  was,
  change,
}: {
  row: Row;
  was?: Value;
  change?: "added" | "changed" | "removed";
}) {
  return (
    <div className={`pp-row${change ? ` ${change}` : ""}`}>
      <span className="pp-label">
        {/* Intrinsic size, centred in the 18px Figma box – the SVGs are not square. */}
        {row.icon ? (
          <span className="pp-row-icon">
            <img src={row.icon} alt="" />
          </span>
        ) : null}
        {ROW_LABEL[row.label] ?? row.label}
      </span>
      <DiffValue now={row.value} was={was} change={change} />
      {row.action && change !== "removed" ? (
        <>
          <CopyButton value={typeof row.value === "string" ? row.value : "text" in row.value ? row.value.text : ""} label={row.label} />
          <button type="button" className="pp-row-note" aria-label={`Notiz zu ${row.label}`}>
            <img src={a.comment} alt="" width={18} height={18} />
          </button>
        </>
      ) : null}
    </div>
  );
}

function diffRows(current: Row[], previous?: Row[]) {
  if (!previous) return current.map((row) => ({ row }));

  const used = new Set<number>();
  const next: { row: Row; was?: Value; change?: "added" | "changed" | "removed" }[] = current.map((row) => {
    const index = previous.findIndex((entry, i) => !used.has(i) && entry.label === row.label);
    if (index === -1) return { row, change: "added" as const };
    used.add(index);
    const was = previous[index].value;
    if (valueKey(was) === valueKey(row.value)) return { row };
    return { row, was, change: "changed" as const };
  });

  previous.forEach((entry, index) => {
    if (!used.has(index)) next.push({ row: entry, was: entry.value, change: "removed" });
  });

  return next;
}

function RowBlock({
  rows,
  previous,
  caption,
  className,
}: {
  rows: Row[];
  previous?: Row[];
  caption?: string;
  className: string;
}) {
  return (
    <div className={className}>
      {caption ? <span className="pp-caption">{caption}</span> : null}
      {diffRows(rows, previous).map((entry, index) => (
        <RowLine {...entry} key={`${entry.row.label}-${index}`} />
      ))}
    </div>
  );
}

function BlockView({ block, previous }: { block: Block; previous?: Block }) {
  if (block.kind === "rows") {
    return (
      <RowBlock
        className="pp-rows"
        caption={block.caption}
        rows={block.rows}
        previous={previous?.kind === "rows" ? previous.rows : undefined}
      />
    );
  }

  if (block.kind === "person") {
    const was = previous?.kind === "person" ? previous : undefined;
    const changed = Boolean(was && (was.name !== block.name || was.sub !== block.sub || was.tag !== block.tag));
    const body = (
      <div className="pp-person">
        <span className="pp-person-avatar">
          <img src={a.avatarBg} alt="" width={32} height={32} />
          <img className="glyph" src={block.party === "company" ? a.companyBlank : a.personSmall} alt="" />
        </span>
        <span className="pp-person-copy">
          {block.tag ? <span className={chipClass(block.tag)}>{block.tag}</span> : null}
          {changed && was ? (
            <span className="pp-val-diff stacked">
              <strong className="pp-val was">{was.name}</strong>
              <Icon src={a.arrowRight} size={14} />
              <strong className="pp-val now">{block.name}</strong>
            </span>
          ) : (
            <strong>{block.name}</strong>
          )}
          <small>{block.sub}</small>
        </span>
        <PersonOpen name={block.name} />
      </div>
    );
    if (block.caption) {
      return (
        <div className="pp-badge-wrap">
          <span className="pp-caption">{block.caption}</span>
          {body}
        </div>
      );
    }
    return body;
  }

  if (block.kind === "badge") {
    const pill = (
      <div className="pp-badge">
        <span className="pp-badge-icon">
          <Icon src={block.icon} size={18} />
        </span>
        <span className="pp-badge-copy">
          {block.caption && !block.above ? <small>{block.caption}</small> : null}
          {block.text}
        </span>
        {block.open ? <Icon src={a.openTab} size={18} /> : null}
      </div>
    );
    if (block.above && block.caption) {
      return (
        <div className="pp-badge-wrap">
          <span className="pp-caption">{block.caption}</span>
          {pill}
        </div>
      );
    }
    return pill;
  }

  if (block.kind === "usage") {
    return (
      <div className="pp-usage">
        <header>
          <span className="pp-badge-icon">
            <Icon src={block.icon} size={18} />
          </span>
          <span className="pp-badge-copy">
            <small>{block.caption}</small>
            {block.text}
          </span>
          <Icon src={a.info} size={18} />
        </header>
        <RowBlock
          className="pp-rows"
          rows={block.rows}
          previous={previous?.kind === "usage" ? previous.rows : undefined}
        />
      </div>
    );
  }

  if (block.kind === "group") {
    return (
      <div className="pp-group">
        {block.caption ? <span className="pp-caption">{block.caption}</span> : null}
        <div className="pp-group-body">
          {diffRows(block.rows, previous?.kind === "group" ? previous.rows : undefined).map((entry, index) => (
            <RowLine {...entry} key={`${entry.row.label}-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  if (block.kind === "note") {
    const was = previous?.kind === "note" ? previous.text : undefined;
    const changed = was !== undefined && was !== block.text;
    return (
      <div className="pp-note">
        <small>{block.caption}</small>
        {changed ? (
          <p className="pp-val-diff stacked">
            <span className="pp-val was">{was}</span>
            <Icon src={a.arrowRight} size={14} />
            <span className="pp-val now">{block.text}</span>
          </p>
        ) : (
          <p>{block.text}</p>
        )}
      </div>
    );
  }

  return (
    <div className="pp-files">
      <span className="pp-caption">{block.caption}</span>
      <RowBlock
        className="pp-rows"
        rows={block.rows}
        previous={previous?.kind === "files" ? previous.rows : undefined}
      />
    </div>
  );
}

/**
 * Empty-state pattern (Figma 21755:28744): in a Stammdaten workflow the form is already open on the left, so the
 * empty Wino panel's link and "+" pill only lead into it.
 */
export function focusForm() {
  const field = document.querySelector<HTMLElement>(".sw-form input:not([readonly]):not([type=file]), .sw-form select, .sw-form textarea");
  field?.scrollIntoView({ block: "center", behavior: "smooth" });
  field?.focus({ preventScroll: true });
}

function EmptyCard({ empty, onAdd }: { empty: Empty; onAdd?: () => void }) {
  return (
    <article className="pp-card empty">
      <div className="pp-empty-art">
        <span className="plate p3" />
        <span className="plate p2" />
        <span className="plate p1" />
        <span className="orb">
          <Icon src={empty.icon} size={40} />
        </span>
      </div>
      <strong>{empty.title}</strong>
      <p>
        {empty.lead ? `${empty.lead} ` : null}
        {onAdd ? (
          <button type="button" className="pp-empty-link" onClick={onAdd}>
            {empty.link}
          </button>
        ) : (
          <a href="#anlegen">{empty.link}</a>
        )}
        {empty.lead ? "." : null}
      </p>
    </article>
  );
}

export function DataCard({
  card,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
  full,
  headerExtra,
  menuItems = [],
  deleteLabel = "Löschen",
  deleteIcon = a.trash,
}: {
  card: Card;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAdd?: () => void;
  full?: boolean;
  headerExtra?: ReactNode;
  /** Extra actions for the ⋮ menu (e.g. status changes), listed before Editieren / Löschen. */
  menuItems?: ContextItem[];
  deleteLabel?: string;
  deleteIcon?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (card.empty) return <EmptyCard empty={card.empty} onAdd={onAdd} />;

  const previous = card.previous;
  const titleChanged = Boolean(previous?.title && previous.title !== card.title);
  const clamp = Boolean(card.clampTo) && !full && !expanded;
  const className = [
    "pp-card",
    clamp ? "clamped" : "",
    selected ? "selected" : "",
    card.draft ? "draft" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className} onClick={onSelect}>
      {/* Figma 21745:244614: the card shape (notch top right, #E2E7EC outline, light-blue top tint) drawn behind. */}
      <span className="pp-card-shape" aria-hidden="true" />
      <header className="pp-card-head">
        <span className="pp-card-title">
          {card.icon ? <Icon src={card.icon} size={22} /> : null}
          {titleChanged ? (
            <span className="pp-val-diff">
              <span className="pp-val was">{previous?.title}</span>
              <Icon src={a.arrowRight} size={14} />
              <span className="pp-val now">{card.title}</span>
            </span>
          ) : (
            card.title
          )}
          {card.draft ? <span className="chip draft">Entwurf</span> : null}
        </span>
        <span className="pp-card-actions">
          {headerExtra}
          {onEdit || onDelete || menuItems.length > 0 ? (
            <ContextMenu
              items={[
                ...menuItems,
                ...(onEdit ? [{ label: "Editieren", icon: a.menuEdit, onSelect: onEdit }] : []),
                ...(onDelete
                  ? [{ label: deleteLabel, icon: deleteIcon, danger: true, onSelect: onDelete }]
                  : []),
              ]}
            />
          ) : (
            <span className="pp-card-menu" aria-hidden="true">
              <img src={a.contextMenu} alt="" width={18} height={18} />
            </span>
          )}
        </span>
      </header>

      {/* Clamped: the card keeps its height, the body stops above the "Alle Daten anzeigen" footer. */}
      <div className="pp-card-body" style={clamp && card.clampTo ? { maxHeight: card.clampTo - 150 } : undefined}>
        {(card.blocks ?? []).map((block, index) => (
          <BlockView block={block} previous={previous?.blocks?.[index]} key={index} />
        ))}
      </div>

      {card.clampTo && !full ? (
        <footer className={clamp ? "pp-card-more" : "pp-card-more open"}>
          {/* Opens the whole card in place (it does not start the card's workflow). */}
          <a
            href="#daten"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            {clamp ? "Alle Daten anzeigen" : "Weniger anzeigen"}
          </a>
        </footer>
      ) : null}
    </article>
  );
}
