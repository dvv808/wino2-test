import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as a from "../assets/index";

/**
 * Column filters of the Honorar tables.
 *
 * A filter is stored as one string per column:
 *  - plain text            -> "contains" match (typed into the input under the column title)
 *  - "\u0001L" + JSON      -> list of exact values picked in the popover
 *  - "\u0001D" + "from|to" -> date range (ISO dates)
 *  - "\u0001N" + "min|max" -> number range
 *  - "\u0001G" + JSON      -> picked values per group (e.g. Workflow, Personen): any within a group, every group must match
 * The popover offers the filter that fits the content of the column.
 */
const MARK = "\u0001";
const DATE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
const NUMBER = /^-?\d{1,3}(?:\.\d{3})*,\d{2}\b/;

type Kind = "date" | "number" | "list";

function toIso(text: string): string | null {
  const hit = DATE.exec(text);
  if (!hit) return null;
  return `${hit[3]}-${hit[2].padStart(2, "0")}-${hit[1].padStart(2, "0")}`;
}

function toNumber(text: string): number | null {
  const hit = NUMBER.exec(text.trim());
  if (!hit) return null;
  return Number(hit[0].replace(/\./g, "").replace(",", "."));
}

function kindOf(samples: string[]): Kind {
  const filled = samples.filter((sample) => sample.trim() !== "");
  if (filled.length === 0) return "list";
  const share = (test: (text: string) => boolean) => filled.filter(test).length / filled.length;
  if (share((text) => toIso(text) !== null) >= 0.6) return "date";
  if (share((text) => toNumber(text) !== null) >= 0.6) return "number";
  return "list";
}

function formatIso(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function matchesFilter(value: string | undefined, text: string) {
  if (!value) return true;
  if (value[0] !== MARK) {
    const query = value.trim().toLowerCase();
    return !query || text.toLowerCase().includes(query);
  }
  const kind = value[1];
  const payload = value.slice(2);
  if (kind === "L") {
    try {
      // Options are listed trimmed, so the cell text is compared trimmed too.
      return (JSON.parse(payload) as string[]).includes(text.trim());
    } catch {
      return true;
    }
  }
  if (kind === "G") {
    try {
      const groups = JSON.parse(payload) as Record<string, string[]>;
      return Object.values(groups).every((picked) => picked.length === 0 || picked.some((token) => text.includes(token)));
    } catch {
      return true;
    }
  }
  const [from = "", to = ""] = payload.split("|");
  if (kind === "D") {
    const iso = toIso(text);
    if (!iso) return false;
    return (!from || iso >= from) && (!to || iso <= to);
  }
  const num = toNumber(text);
  if (num === null) return false;
  return (from === "" || num >= Number(from)) && (to === "" || num <= Number(to));
}

export function isEncodedFilter(value: string | undefined) {
  return Boolean(value && value[0] === MARK);
}

export function filterDisplay(value: string | undefined) {
  if (!value) return "";
  if (value[0] !== MARK) return value;
  const kind = value[1];
  const payload = value.slice(2);
  if (kind === "L") {
    try {
      const count = (JSON.parse(payload) as string[]).length;
      return `${count} ausgewählt`;
    } catch {
      return "";
    }
  }
  if (kind === "G") {
    try {
      const count = Object.values(JSON.parse(payload) as Record<string, string[]>).flat().length;
      return `${count} ausgewählt`;
    } catch {
      return "";
    }
  }
  const [from = "", to = ""] = payload.split("|");
  const show = (part: string) => (kind === "D" ? formatIso(part) : part.replace(".", ","));
  if (from && to) return `${show(from)} – ${show(to)}`;
  if (from) return `ab ${show(from)}`;
  if (to) return `bis ${show(to)}`;
  return "";
}

/** Props for the small text input under a column title: encoded filters are shown read-only and cleared with Backspace. */
export function filterInputProps(value: string | undefined, onChange: (next: string) => void) {
  const encoded = isEncodedFilter(value);
  return {
    value: filterDisplay(value),
    readOnly: encoded,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!encoded) onChange(event.target.value);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (encoded && (event.key === "Backspace" || event.key === "Delete")) onChange("");
    },
  };
}

export type FilterGroup = { label: string; options: string[]; render?: (option: string) => ReactNode };

/** Above a table while any column filter is set: how many rows are left, and one click to clear every filter. */
export function FilterSummary({
  filters,
  shown,
  total,
  unit = "Rechnungen",
  onReset,
}: {
  filters: Record<string, string | undefined>;
  shown: number;
  total: number;
  unit?: string;
  onReset: () => void;
}) {
  const active = Object.values(filters).filter(Boolean).length;
  if (!active) return null;
  return (
    <div className="hn-filter-summary" role="status">
      <Icon16 />
      <span>
        <strong>
          {shown} von {total}
        </strong>{" "}
        {unit} · {active} Filter aktiv
      </span>
      <button type="button" className="hn-link" onClick={onReset}>
        Alle Filter zurücksetzen
      </button>
    </div>
  );
}

function Icon16() {
  return <img src={a.filterLines} alt="" width={16} height={16} />;
}

/** Long pick lists get a search field. */
const SEARCH_FROM = 8;

export function ColumnFilter({
  label,
  value,
  samples,
  onChange,
  groups,
}: {
  label: string;
  value: string;
  samples: string[];
  onChange: (next: string) => void;
  /**
   * Sorted pick lists instead of every distinct cell text, e.g. Workflow types and the people working on them.
   * `render` draws an option (e.g. with the person's avatar); options match when the cell text contains them.
   */
  groups?: FilterGroup[];
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  // How many rows each option would keep: exact cell text for lists, "contains" for groups.
  const countOf = (option: string, contains: boolean) =>
    samples.filter((sample) => (contains ? sample.includes(option) : sample.trim() === option)).length;
  const optionCount = groups ? groups.reduce((sum, group) => sum + group.options.length, 0) : 0;
  const needle = search.trim().toLocaleLowerCase("de-AT");
  const visible = (option: string) => !needle || option.toLocaleLowerCase("de-AT").includes(needle);
  const kind = useMemo(() => kindOf(samples), [samples]);
  const active = isEncodedFilter(value);

  useEffect(() => {
    if (!pos) return;
    const away = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setPos(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPos(null);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [pos]);

  const options = useMemo(
    () => Array.from(new Set(samples.map((sample) => sample.trim()).filter(Boolean))).sort((x, y) => x.localeCompare(y, "de")),
    [samples],
  );
  let picked: string[] = [];
  if (value[0] === MARK && value[1] === "L") {
    try {
      picked = JSON.parse(value.slice(2)) as string[];
    } catch {
      picked = [];
    }
  }
  const [from = "", to = ""] = value[0] === MARK && value[1] !== "L" ? value.slice(2).split("|") : [];

  function setRange(code: "D" | "N", nextFrom: string, nextTo: string) {
    onChange(nextFrom || nextTo ? `${MARK}${code}${nextFrom}|${nextTo}` : "");
  }

  let pickedGroups: Record<string, string[]> = {};
  if (value[0] === MARK && value[1] === "G") {
    try {
      pickedGroups = JSON.parse(value.slice(2)) as Record<string, string[]>;
    } catch {
      pickedGroups = {};
    }
  }

  function toggleInGroup(group: string, option: string) {
    const current = pickedGroups[group] ?? [];
    const next = { ...pickedGroups, [group]: current.includes(option) ? current.filter((entry) => entry !== option) : [...current, option] };
    const any = Object.values(next).some((list) => list.length > 0);
    onChange(any ? `${MARK}G${JSON.stringify(next)}` : "");
  }

  function toggle(option: string) {
    const next = picked.includes(option) ? picked.filter((entry) => entry !== option) : [...picked, option];
    onChange(next.length ? `${MARK}L${JSON.stringify(next)}` : "");
  }

  return (
    <>
      <button
        type="button"
        className={active ? "hn-st-filter active" : "hn-st-filter"}
        aria-label={`${label} filtern`}
        aria-expanded={Boolean(pos)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setSearch("");
          setPos((current) => (current ? null : { top: rect.bottom + 4, left: Math.max(8, Math.min(rect.right - 260, window.innerWidth - 276)) }));
        }}
      >
        <img src={a.colFilter} alt="" width={34} height={34} />
      </button>
      {pos ? (
        <div className="hn-filter-pop" ref={ref} role="dialog" aria-label={`${label} filtern`} style={{ top: pos.top, left: pos.left }}>
          <strong className="hn-filter-title">{label}</strong>
          {(groups ? optionCount : kind === "list" ? options.length : 0) >= SEARCH_FROM ? (
            <input
              className="hn-filter-search"
              type="search"
              placeholder="Suchen…"
              aria-label={`${label} durchsuchen`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          ) : null}
          {kind === "date" && !groups ? (
            <div className="hn-filter-range dates">
              <label>
                Von
                <input type="date" value={from} max={to || undefined} onChange={(event) => setRange("D", event.target.value, to)} />
              </label>
              <label>
                Bis
                <input type="date" value={to} min={from || undefined} onChange={(event) => setRange("D", from, event.target.value)} />
              </label>
            </div>
          ) : null}
          {kind === "number" && !groups ? (
            <div className="hn-filter-range">
              <label>
                Von
                <input type="number" step="0.01" value={from} onChange={(event) => setRange("N", event.target.value, to)} />
              </label>
              <label>
                Bis
                <input type="number" step="0.01" value={to} onChange={(event) => setRange("N", from, event.target.value)} />
              </label>
            </div>
          ) : null}
          {groups ? (
            <div className="hn-filter-list">
              {groups.filter((group) => group.options.length > 0).map((group) => (
                <div className="hn-filter-group" key={group.label}>
                  <span className="hn-filter-group-title">{group.label}</span>
                  {group.options.filter(visible).map((option) => {
                    const on = (pickedGroups[group.label] ?? []).includes(option);
                    return (
                      <label key={option} className="hn-filter-option">
                        <input type="checkbox" checked={on} onChange={() => toggleInGroup(group.label, option)} />
                        <span className="hn-tickbox-box" aria-hidden>
                          {on ? <img src={a.hnCheckTick} alt="" width={16} height={16} /> : null}
                        </span>
                        <span className="hn-filter-text">{group.render ? group.render(option) : option}</span>
                        <span className="hn-filter-count">{countOf(option, true)}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : kind === "list" ? (
            <div className="hn-filter-list">
              {options.length === 0 ? <p className="hn-filter-empty">Keine Werte</p> : null}
              {options.filter(visible).map((option) => (
                <label key={option} className="hn-filter-option">
                  <input type="checkbox" checked={picked.includes(option)} onChange={() => toggle(option)} />
                  <span className="hn-tickbox-box" aria-hidden>
                    {picked.includes(option) ? <img src={a.hnCheckTick} alt="" width={16} height={16} /> : null}
                  </span>
                  <span className="hn-filter-text">{option}</span>
                  <span className="hn-filter-count">{countOf(option, false)}</span>
                </label>
              ))}
            </div>
          ) : null}
          <footer className="hn-filter-foot">
            <button type="button" className="hn-link" disabled={!active} onClick={() => onChange("")}>
              Zurücksetzen
            </button>
            <button type="button" className="hn-filter-done" onClick={() => setPos(null)}>
              Fertig
            </button>
          </footer>
        </div>
      ) : null}
    </>
  );
}
