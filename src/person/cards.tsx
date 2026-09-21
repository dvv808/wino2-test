import * as a from "../assets/index";
import { ContextMenu, Icon } from "../ui";
import type { Block, Card, Empty, Row, Value } from "./stammdaten";

function valueKey(value: Value) {
  if (typeof value === "string") return value;
  if (value.kind === "entity") return `${value.tag}|${value.name}|${value.sub}`;
  return value.text;
}

function ValueCell({ value, className }: { value: Value; className?: string }) {
  const cls = ["pp-val", className].filter(Boolean).join(" ");

  if (typeof value === "string") return <span className={cls}>{value}</span>;

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

  if (value.kind === "file") {
    const glyph = value.type === "jpg" ? a.jpg : a.pdf;
    return (
      <a className={`${cls} file`} href="#datei">
        <img src={glyph} alt="" width={17} height={20} />
        {value.text}
      </a>
    );
  }

  return (
    <span className={className ? `${className} pp-entity` : "pp-entity"}>
      <span className="pp-entity-copy">
        <span className="chip">{value.tag}</span>
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
        {row.icon ? <img src={row.icon} alt="" width={18} height={18} /> : null}
        {row.label}
      </span>
      <DiffValue now={row.value} was={was} change={change} />
      {row.action && change !== "removed" ? (
        <button type="button" className="pp-row-note" aria-label={`Notiz zu ${row.label}`}>
          <img src={a.comment} alt="" width={18} height={18} />
        </button>
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
    return (
      <div className="pp-person">
        <span className="pp-person-avatar">
          <img src={a.avatarBg} alt="" width={32} height={32} />
          <img className="glyph" src={a.personSmall} alt="" width={21} height={21} />
        </span>
        <span className="pp-person-copy">
          {block.tag ? <span className="chip">{block.tag}</span> : null}
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
        <Icon src={a.openTab} size={18} />
      </div>
    );
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
}: {
  card: Card;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAdd?: () => void;
}) {
  if (card.empty) return <EmptyCard empty={card.empty} onAdd={onAdd} />;

  const previous = card.previous;
  const titleChanged = Boolean(previous?.title && previous.title !== card.title);
  const className = [
    "pp-card",
    card.clampTo ? "clamped" : "",
    selected ? "selected" : "",
    card.draft ? "draft" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className} onClick={onSelect}>
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
        {onEdit || onDelete ? (
          <ContextMenu
            items={[
              ...(onEdit ? [{ label: "Editieren", icon: a.menuEdit, onSelect: onEdit }] : []),
              ...(onDelete
                ? [{ label: "Löschen", icon: a.trash, danger: true, onSelect: onDelete }]
                : []),
            ]}
          />
        ) : (
          <span className="pp-card-menu" aria-hidden="true">
            <img src={a.contextMenu} alt="" width={18} height={18} />
          </span>
        )}
      </header>

      <div className="pp-card-body" style={card.clampTo ? { maxHeight: card.clampTo - 90 } : undefined}>
        {(card.blocks ?? []).map((block, index) => (
          <BlockView block={block} previous={previous?.blocks?.[index]} key={index} />
        ))}
      </div>

      {card.clampTo ? (
        <footer className="pp-card-more">
          <a href="#daten">Alle Daten anzeigen</a>
        </footer>
      ) : null}
    </article>
  );
}
