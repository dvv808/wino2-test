import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import * as a from "../assets/index";
import { ColumnFilter, FilterSummary, filterInputProps, matchesFilter, type FilterGroup } from "../honorar/ColumnFilter";
import { StickyScroll } from "../honorar/ui";
import type { DmsPerson, Dokument, Level } from "../types/dms";

/** Shared DMS bits: the standard table, status chips, avatars and formatting. */

export const PERSON_PHOTO: Record<string, string> = {
  lucy: a.empLucy,
  anna: a.reqAnna,
  thomas: a.empPeter,
  mike: a.reqMike,
  sandra: a.empChristine,
  markus: a.empAlexander,
  elif: a.empJasmin,
};

export function Avatar({ person, size = 24 }: { person: DmsPerson | undefined; size?: number }) {
  const photo = person ? PERSON_PHOTO[person.id] : undefined;
  return photo ? (
    <img className="dms-avatar" src={photo} alt={person?.name ?? ""} title={person?.name} width={size} height={size} />
  ) : (
    <span className="dms-avatar initials" style={{ width: size, height: size }} title={person?.name}>
      {(person?.name ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2)}
    </span>
  );
}

/** DD.MM.YYYY (Austrian), with time for timestamps. */
export function formatDate(value: string | undefined, withTime = false) {
  if (!value) return "–";
  const [date, time] = value.split("T");
  const [y, m, d] = date.split("-");
  return withTime && time ? `${d}.${m}.${y} - ${time.slice(0, 5)} Uhr` : `${d}.${m}.${y}`;
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/** Colour signals state: amber = action needed, grey = inactive, green = running. The label carries the meaning. */
export function statusTone(status: string | null) {
  if (status === null) return "none";
  if (["In Freigabe", "Entwurf", "Eingang"].includes(status)) return "action";
  if (["Abgelaufen", "Gekündigt"].includes(status)) return "inactive";
  if (status === "Aktiv") return "active";
  return "neutral";
}

export function StatusChip({ status }: { status: string | null }) {
  if (!status) return <span className="dms-muted">–</span>;
  return <span className={`dms-status ${statusTone(status)}`}>{status}</span>;
}

export function LevelChip({ level }: { level: Level | null | undefined }) {
  if (!level) return <span className="dms-level none">Nur Durchgang</span>;
  return <span className={`dms-level ${level.toLowerCase()}`}>{level}</span>;
}

export function DocIcon({ doc, size = 20 }: { doc: Pick<Dokument, "versions"> | null; size?: number }) {
  const mime = doc?.versions[0]?.mime ?? "application/pdf";
  return <img src={mime.includes("jpeg") || mime.includes("png") ? a.jpg : a.pdf} alt="" width={size * 0.85} height={size} />;
}

export type DmsColumn<Row> = {
  key: string;
  label: string;
  /** Figma width = minimum; the column grows with the screen. */
  width: string;
  text: (row: Row) => string;
  render?: (row: Row) => ReactNode;
  groups?: (rows: Row[]) => FilterGroup[];
  className?: string;
};

/**
 * The standard table (Status zu Rechnungen look): every column has its label, a ColumnFilter and a filter field,
 * inside StickyScroll. All DMS tables use it.
 */
export function DmsTable<Row>({
  rows,
  columns,
  rowKey,
  label,
  unit = "Einträge",
  selected,
  onSelect,
  rowClass,
  rowProps,
  actions,
  empty,
}: {
  /** Three-dot menu at the end of each row (RowMenu); adds the empty Aktionen column. */
  actions?: (row: Row) => ReactNode;
  /** Extra props per row, e.g. to make it draggable. */
  rowProps?: (row: Row) => HTMLAttributes<HTMLDivElement>;
  rows: Row[];
  columns: DmsColumn<Row>[];
  rowKey: (row: Row) => string;
  label: string;
  unit?: string;
  selected?: string | null;
  onSelect?: (row: Row) => void;
  rowClass?: (row: Row) => string;
  empty?: ReactNode;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const shown = rows.filter((row) => columns.every((c) => matchesFilter(filters[c.key], c.text(row))));
  const set = (key: string) => (next: string) => setFilters((f) => ({ ...f, [key]: next }));
  return (
    <>
      <FilterSummary filters={filters} shown={shown.length} total={rows.length} unit={unit} onReset={() => setFilters({})} />
      <StickyScroll>
        <div
          className="hn-status-table dms-table"
          role="table"
          aria-label={label}
          style={{ ["--st-cols" as string]: [...columns.map((c) => c.width), ...(actions ? ["minmax(56px, 0.25fr)"] : [])].join(" ") }}
        >
          <div className="hn-st-head" role="row">
            {columns.map((c) => (
              <div className="hn-st-th" role="columnheader" key={c.key}>
                <span className="hn-st-label">
                  {c.label}
                  <ColumnFilter label={c.label} value={filters[c.key] ?? ""} samples={rows.map(c.text)} groups={c.groups?.(rows)} onChange={set(c.key)} />
                </span>
                <input className="col-input" aria-label={`${c.label} filtern`} {...filterInputProps(filters[c.key], set(c.key))} />
              </div>
            ))}
            {actions ? <div className="hn-st-th hn-st-more-head" role="columnheader" aria-label="Aktionen" /> : null}
          </div>
          {shown.map((row) => {
            const key = rowKey(row);
            return (
              <div
                className={`hn-st-row${selected === key ? " selected" : ""}${onSelect ? " clickable" : ""} ${rowClass?.(row) ?? ""}`}
                role="row"
                key={key}
                onClick={onSelect ? () => onSelect(row) : undefined}
                {...rowProps?.(row)}
              >
                {columns.map((c) => (
                  <div key={c.key} className={c.className}>
                    {c.render ? c.render(row) : c.text(row) || "–"}
                  </div>
                ))}
                {actions ? (
                  <div className="hn-st-more" onClick={(event) => event.stopPropagation()}>
                    {actions(row)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </StickyScroll>
      {shown.length === 0 ? (empty ?? <p className="dms-empty">{rows.length ? "Keine Treffer für diese Filter." : "Noch keine Einträge."}</p>) : null}
    </>
  );
}

export type RowMenuItem = { label: string; icon: string; onSelect: () => void };

/**
 * The three-dot menu at the end of a table row (Status zu Rechnungen look). The card is fixed to the screen, so the
 * table's sideways scroll never cuts it off.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!at) return;
    const away = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setAt(null);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setAt(null);
    const close = () => setAt(null);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", close, true);
    };
  }, [at]);
  if (!items.length) return null;
  return (
    <>
      <button
        type="button"
        className="hn-st-menu"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!at}
        onMouseDown={(event) => at && event.stopPropagation()}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setAt(at ? null : { top: rect.bottom + 4, left: Math.max(8, rect.right - 224) });
        }}
      >
        <img src={a.contextMenu} alt="" width={24} height={24} />
      </button>
      {at ? (
        <div className="hn-row-menu" ref={menuRef} role="menu" style={{ top: at.top, left: at.left }}>
          {items.map((item) => (
            <button
              type="button"
              role="menuitem"
              key={item.label}
              onClick={() => {
                setAt(null);
                item.onSelect();
              }}
            >
              <span className="hn-menu-ico">
                <img src={item.icon} alt="" width={18} height={18} />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Small modal in the prompt look; copy stays short. */
export function DmsModal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="prompt-modal" role="dialog" aria-label={title}>
      <button type="button" className="prompt-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="prompt-body dms-modal">
        <header className="review-titlebar">
          <span className="review-titlebar-label">{title}</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onClose}>
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>
        <div className="prompt-main">{children}</div>
        {footer ? <footer className="prompt-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
