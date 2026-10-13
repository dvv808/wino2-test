import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";

/**
 * Column filters of the Honorar tables.
 *
 * A filter is stored as one string per column:
 *  - plain text            -> "contains" match (typed into the input under the column title)
 *  - "\u0001L" + JSON      -> list of exact values picked in the popover
 *  - "\u0001D" + "from|to" -> date range (ISO dates)
 *  - "\u0001N" + "min|max" -> number range
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
      return (JSON.parse(payload) as string[]).includes(text);
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

export function ColumnFilter({
  label,
  value,
  samples,
  onChange,
}: {
  label: string;
  value: string;
  samples: string[];
  onChange: (next: string) => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
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
          setPos((current) => (current ? null : { top: rect.bottom + 4, left: Math.max(8, Math.min(rect.right - 260, window.innerWidth - 276)) }));
        }}
      >
        <img src={a.colFilter} alt="" width={34} height={34} />
      </button>
      {pos ? (
        <div className="hn-filter-pop" ref={ref} role="dialog" aria-label={`${label} filtern`} style={{ top: pos.top, left: pos.left }}>
          <strong className="hn-filter-title">{label}</strong>
          {kind === "date" ? (
            <div className="hn-filter-range">
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
          {kind === "number" ? (
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
          {kind === "list" ? (
            <div className="hn-filter-list">
              {options.length === 0 ? <p className="hn-filter-empty">Keine Werte</p> : null}
              {options.map((option) => (
                <label key={option} className="hn-filter-option">
                  <input type="checkbox" checked={picked.includes(option)} onChange={() => toggle(option)} />
                  <span className="hn-tickbox-box" aria-hidden>
                    {picked.includes(option) ? <img src={a.hnCheckTick} alt="" width={16} height={16} /> : null}
                  </span>
                  <span className="hn-filter-text">{option}</span>
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
