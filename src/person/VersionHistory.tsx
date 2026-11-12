import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import * as a from "../assets/index";
import { PersonAvatar, codeFor } from "../approvalTabs";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { latestEntry, personNameFromVersion, standDate, type HistoryKind, type PersonVersion } from "./versions";
import { areaTitle } from "./stammdaten";

const KIND: Record<HistoryKind, { label: string; icon: string }> = {
  added: { label: "Hinzugefügt", icon: a.badgeAdd },
  changed: { label: "Geändert", icon: a.badgeEdit },
  removed: { label: "Gelöscht", icon: a.badgeClose },
};

const KIND_FILTERS: { value: "" | HistoryKind; label: string }[] = [
  { value: "", label: "Alle" },
  { value: "added", label: "Hinzugefügt" },
  { value: "changed", label: "Geändert" },
  { value: "removed", label: "Gelöscht" },
];

type ColKey = "date" | "kind" | "area" | "field" | "person";
type SourceKey = "" | "stammdaten" | "makler" | "person";

type Filters = {
  source: SourceKey;
  /** A Stammdaten area within the source (Kontakte, Adressen …); "" = all. */
  area: string;
  date: string;
  kind: "" | HistoryKind;
  field: string;
  person: string;
  /** Free text: Inhalt, alter/neuer Wert, Ort, Person, Datum. */
  query: string;
  /** Zeitraum (yyyy-mm-dd from the date inputs); either end may be open. */
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = { source: "", area: "", date: "", kind: "", field: "", person: "", query: "", from: "", to: "" };

const isoKey = (iso: string) => Number(iso.replace(/-/g, ""));
/** yyyy-mm-dd → dd.mm.yyyy */
const isoToDmy = (iso: string) => iso.split("-").reverse().join(".");

const SOURCE_LABEL: Record<Exclude<SourceKey, "">, string> = {
  stammdaten: "Stammdaten",
  makler: "Maklervereinbarung",
  person: "Person",
};

function sourceOf(version: PersonVersion): Exclude<SourceKey, ""> {
  return version.place.app;
}

function sourceRest(version: PersonVersion) {
  const parts = version.placeLabel.split(" · ");
  return parts.length > 1 ? parts.slice(1).join(" · ") : version.placeLabel;
}

function defaultSource(view: string): SourceKey {
  if (view === "stammdaten") return "stammdaten";
  if (view === "workflow") return "makler";
  return "";
}

/** Year groups, newest first; inside a year the newest change first. */
function groupedByYear(versions: PersonVersion[]) {
  const sorted = versions.slice().sort((left, right) => dateSortKey(right.date) - dateSortKey(left.date));
  const years = [...new Set(sorted.map((version) => version.date.slice(-4)))];
  return years.map((year) => ({ year, items: sorted.filter((version) => version.date.endsWith(year)) }));
}

function dateSortKey(date: string) {
  const [day, month, year] = date.split(".");
  return Number(`${year}${month}${day}`);
}

function uniqueSorted(values: string[], compare: (left: string, right: string) => number) {
  return [...new Set(values)].sort(compare);
}

function matchesFilters(version: PersonVersion, filters: Filters) {
  if (filters.source && sourceOf(version) !== filters.source) return false;
  if (filters.area && !(version.place.app === "stammdaten" && version.place.area === filters.area)) return false;
  const needle = filters.query.trim().toLowerCase();
  if (
    needle &&
    ![version.field, version.from, version.to, version.placeLabel, version.editor.name, version.date, version.attachment?.name]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(needle))
  ) {
    return false;
  }
  if (filters.date && version.date !== filters.date) return false;
  if (filters.from && dateSortKey(version.date) < isoKey(filters.from)) return false;
  if (filters.to && dateSortKey(version.date) > isoKey(filters.to)) return false;
  if (filters.kind && version.kind !== filters.kind) return false;
  if (filters.field && version.field !== filters.field) return false;
  if (filters.person && version.editor.name !== filters.person) return false;
  return true;
}

/** Only the year of the current Stand starts open. */
function defaultCollapsed(versions: PersonVersion[]) {
  const current = standDate(versions).slice(-4);
  return new Set([...new Set(versions.map((version) => version.date.slice(-4)))].filter((year) => year !== current));
}

/** Yellow bar across the whole product while an older published stand is open. */
export function HistoricalBanner() {
  const { isHistorical, viewingVersion, versions, viewCurrentVersion, standRange } = useWorkflow();
  if (standRange && viewingVersion) {
    return createPortal(
      <div className="hist-banner range" role="status">
        <Icon src={a.history} size={22} />
        <p>
          <strong>
            Zeitraum {standRange.from} – {standRange.to}
          </strong>
          <span>
            Stand am Ende des Zeitraums ({viewingVersion.date}); bei jedem Bereich steht, wie oft er im Zeitraum geändert
            wurde.
          </span>
        </p>
        <button type="button" className="hist-banner-back" onClick={viewCurrentVersion}>
          Zum aktuellen Stand ({standDate(versions)})
        </button>
      </div>,
      document.body,
    );
  }
  if (!isHistorical || !viewingVersion) return null;
  const currentDate = standDate(versions);

  return createPortal(
    <div className="hist-banner" role="status">
      <Icon src={a.attention} size={22} />
      <p>
        <strong>Stand {viewingVersion.date} · veraltet</strong>
        <span>
          {personNameFromVersion(viewingVersion)}. Du siehst einen früheren Stand. Aktuell ist der Stand vom{" "}
          {currentDate}.
        </span>
      </p>
      <button type="button" className="hist-banner-back" onClick={viewCurrentVersion}>
        Zum aktuellen Stand ({currentDate})
      </button>
    </div>,
    document.body,
  );
}

function HistoryValue({ version }: { version: PersonVersion }) {
  if (version.from) {
    return (
      <p className="vl-value diff open">
        <span>{version.from}</span>
        <Icon src={a.arrowRight} size={14} />
        <span>{version.to}</span>
      </p>
    );
  }
  if (!version.to) return null;
  return (
    <p className="vl-value open">
      {version.kind === "removed" ? <s>{version.to}</s> : version.to}
    </p>
  );
}

function HistoryRow({
  version,
  current,
  active,
  onOpen,
}: {
  version: PersonVersion;
  current: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  const { label, icon } = KIND[version.kind];

  return (
    <li>
      <button
        type="button"
        className={`ver-win-item${active ? " active" : ""}${version.legal ? " legal" : ""}`}
        onClick={onOpen}
      >
        <span className="ver-win-when" title="Stand von diesem Datum öffnen">
          {version.date}
          <br />
          {version.time}
          {current ? <em className="ver-win-now">aktuell</em> : null}
        </span>
        <span className="ver-win-typ">
          <span className={`vl-badge ${version.kind}`}>
            <Icon src={icon} size={10} />
            {label}
          </span>
        </span>
        <span className="ver-win-area">
          <span className={`ver-win-app ${sourceOf(version)}`}>{SOURCE_LABEL[sourceOf(version)]}</span>
        </span>
        <span className="ver-win-what">
          <strong className="vl-field">{version.field}</strong>
          <HistoryValue version={version} />
          <span className="ver-win-place">{sourceRest(version)}</span>
          {version.attachment ? (
            <span className="ver-win-file">
              <img src={a.pdf} alt="" width={12} height={14} />
              {version.attachment.name}
            </span>
          ) : null}
        </span>
        <span className="ver-win-who" title={version.editor.name}>
          <PersonAvatar person={version.editor} size={32} />
          <small>{codeFor(version.editor.name)}</small>
        </span>
      </button>
    </li>
  );
}

function ColumnFilter({
  col,
  label,
  align = "start",
  open,
  filtered,
  options,
  value,
  onToggle,
  onPick,
}: {
  col: ColKey;
  label: string;
  align?: "start" | "end";
  open: boolean;
  filtered: boolean;
  options: { value: string; label: string }[];
  value: string;
  onToggle: (col: ColKey) => void;
  onPick: (value: string) => void;
}) {
  return (
    <div className={`ver-win-col${align === "end" ? " end" : ""}${filtered ? " filtered" : ""}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} filtern`}
        onClick={() => onToggle(col)}
      >
        {label}
        <Icon src={a.colFilter} size={12} />
      </button>
      {open ? (
        <ul className="ver-win-pop" role="listbox" aria-label={label}>
          {options.map((option) => (
            <li key={option.value || "all"}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? "on" : undefined}
                onClick={() => onPick(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Floating versions list. Not a modal: the person file stays usable behind it. */
export function VersionWindow() {
  const { view, versions, viewingVersionId, versionHistoryOpen, closeVersionHistory, openHistoryChange, openStandRange } =
    useWorkflow();
  const [pos, setPos] = useState(() => ({
    x: typeof window === "undefined" ? 24 : Math.max(24, window.innerWidth - 620),
    y: 96,
  }));
  const [filters, setFilters] = useState<Filters>(() => ({ ...EMPTY_FILTERS, source: defaultSource(view) }));
  const [openCol, setOpenCol] = useState<ColKey | null>(null);
  const [collapsed, setCollapsed] = useState(() => defaultCollapsed(versions));
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!versionHistoryOpen) return;
    setPos((current) =>
      current.x > 0 ? current : { x: Math.max(24, window.innerWidth - 620), y: 96 },
    );
    setFilters({ ...EMPTY_FILTERS, source: defaultSource(view) });
    setOpenCol(null);
    setCollapsed(defaultCollapsed(versions));
  }, [versionHistoryOpen, view]);

  useEffect(() => {
    if (!openCol) return;

    function away(event: MouseEvent) {
      if (!listRef.current?.querySelector(".ver-win-cols")?.contains(event.target as Node)) {
        setOpenCol(null);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenCol(null);
    }

    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [openCol]);

  // Area filter: the app, and within Stammdaten each area that has changes (value "stammdaten:<area>").
  const areaOptions = useMemo(() => {
    const options = [
      { value: "", label: "Alle" },
      { value: "stammdaten", label: "Stammdaten" },
    ];
    const areas = [
      ...new Set(
        versions.flatMap((version) => (version.place.app === "stammdaten" ? [version.place.area] : [])),
      ),
    ];
    for (const area of areas) options.push({ value: `stammdaten:${area}`, label: `Stammdaten · ${areaTitle(area)}` });
    options.push({ value: "makler", label: "Maklervereinbarung" });
    if (versions.some((version) => sourceOf(version) === "person")) {
      options.push({ value: "person", label: "Person" });
    }
    return options;
  }, [versions]);

  const scoped = useMemo(
    () => versions.filter((version) => !filters.source || sourceOf(version) === filters.source),
    [versions, filters.source],
  );

  const dateOptions = useMemo(
    () => [
      { value: "", label: "Alle" },
      ...uniqueSorted(
        scoped.map((version) => version.date),
        (left, right) => dateSortKey(right) - dateSortKey(left),
      ).map((date) => ({ value: date, label: date })),
    ],
    [scoped],
  );

  const fieldOptions = useMemo(
    () => [
      { value: "", label: "Alle" },
      ...uniqueSorted(
        scoped.map((version) => version.field),
        (left, right) => left.localeCompare(right, "de"),
      ).map((field) => ({ value: field, label: field })),
    ],
    [scoped],
  );

  const personOptions = useMemo(() => {
    const seen = new Set<string>();
    const people: { value: string; label: string }[] = [];
    for (const version of scoped) {
      if (seen.has(version.editor.name)) continue;
      seen.add(version.editor.name);
      people.push({ value: version.editor.name, label: codeFor(version.editor.name) });
    }
    people.sort((left, right) => left.label.localeCompare(right.label, "de"));
    return [{ value: "", label: "Alle" }, ...people];
  }, [scoped]);

  const groups = useMemo(
    () => groupedByYear(versions.filter((version) => matchesFilters(version, filters))),
    [versions, filters],
  );
  const filtering = Object.values(filters).some(Boolean);

  if (!versionHistoryOpen) return null;

  const latestId = latestEntry(versions)?.id;
  const areaValue = filters.area ? `stammdaten:${filters.area}` : filters.source;
  const chips = [
    filters.query.trim() ? { key: "query", label: `„${filters.query.trim()}“` } : null,
    areaValue ? { key: "area", label: areaOptions.find((option) => option.value === areaValue)?.label ?? areaValue } : null,
    filters.date ? { key: "date", label: filters.date } : null,
    filters.from || filters.to
      ? { key: "range", label: `${filters.from ? isoToDmy(filters.from) : "Anfang"} – ${filters.to ? isoToDmy(filters.to) : "heute"}` }
      : null,
    filters.kind ? { key: "kind", label: KIND[filters.kind].label } : null,
    filters.field ? { key: "field", label: filters.field } : null,
    filters.person ? { key: "person", label: codeFor(filters.person) } : null,
  ].filter((chip): chip is { key: string; label: string } => Boolean(chip));

  function clearFilter(key: string) {
    setFilters((current) =>
      key === "area"
        ? { ...current, source: "", area: "" }
        : key === "range"
          ? { ...current, from: "", to: "" }
          : { ...current, [key]: "" },
    );
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    drag.current = { dx: event.clientX - pos.x, dy: event.clientY - pos.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    setPos({
      x: Math.max(12, Math.min(window.innerWidth - 80, event.clientX - drag.current.dx)),
      y: Math.max(12, Math.min(window.innerHeight - 80, event.clientY - drag.current.dy)),
    });
  }

  function onPointerUp() {
    drag.current = null;
  }

  function toggleCol(col: ColKey) {
    setOpenCol((current) => (current === col ? null : col));
  }

  function toggleGroup(year: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return createPortal(
    <aside className="ver-win" style={{ left: pos.x, top: pos.y }} role="dialog" aria-label="Versionsverlauf">
      <header
        className="ver-win-head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span>
          <Icon src={a.history} size={18} />
          Versionsverlauf
        </span>
        <button type="button" className="ver-win-close" aria-label="Schließen" onClick={closeVersionHistory}>
          <img src={a.iconCloseDark} alt="" width={12} height={12} />
        </button>
      </header>
      <div className="ver-win-list" ref={listRef}>
        <div className="ver-win-tools">
          <label className="ver-win-search">
            <Icon src={a.searchDark} size={16} />
            <input
              type="search"
              placeholder="Im Verlauf suchen (Inhalt, Wert, Person, Datum)"
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            />
          </label>
          {/* Zeitraum: filters the list; "Als Ansicht öffnen" shows the file as of its end, areas marked by
              how many changes fell inside it. */}
          <div className="ver-win-range">
            <span>Zeitraum</span>
            <input
              type="date"
              aria-label="Von"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            />
            <span>–</span>
            <input
              type="date"
              aria-label="Bis"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            />
            <button
              type="button"
              className="ver-win-range-open"
              disabled={!filters.from && !filters.to}
              onClick={() => {
                const dates = versions.map((version) => version.date).sort((x, y) => dateSortKey(x) - dateSortKey(y));
                openStandRange(
                  filters.from ? isoToDmy(filters.from) : dates[0] ?? "",
                  filters.to ? isoToDmy(filters.to) : standDate(versions),
                );
              }}
            >
              Als Ansicht öffnen
            </button>
          </div>
          {chips.length ? (
            <div className="ver-win-chips">
              {chips.map((chip) => (
                <button key={chip.key} type="button" className="ver-win-chip" onClick={() => clearFilter(chip.key)}>
                  {chip.label}
                  <img src={a.iconCloseDark} alt="Filter entfernen" width={8} height={8} />
                </button>
              ))}
              <button type="button" className="ver-win-reset" onClick={() => setFilters(EMPTY_FILTERS)}>
                Alle zurücksetzen
              </button>
            </div>
          ) : null}
        </div>
        <div className="ver-win-cols">
          <ColumnFilter
            col="date"
            label="Datum"
            open={openCol === "date"}
            filtered={Boolean(filters.date)}
            options={dateOptions}
            value={filters.date}
            onToggle={toggleCol}
            onPick={(date) => {
              setFilters((current) => ({ ...current, date }));
              setOpenCol(null);
            }}
          />
          <ColumnFilter
            col="kind"
            label="Typ"
            open={openCol === "kind"}
            filtered={Boolean(filters.kind)}
            options={KIND_FILTERS}
            value={filters.kind}
            onToggle={toggleCol}
            onPick={(kind) => {
              setFilters((current) => ({ ...current, kind: kind as Filters["kind"] }));
              setOpenCol(null);
            }}
          />
          <ColumnFilter
            col="area"
            label="Area"
            open={openCol === "area"}
            filtered={Boolean(filters.source)}
            options={areaOptions}
            value={areaValue}
            onToggle={toggleCol}
            onPick={(value) => {
              const [source, area = ""] = value.split(":");
              setFilters((current) => ({ ...current, source: source as SourceKey, area }));
              setOpenCol(null);
            }}
          />
          <ColumnFilter
            col="field"
            label="Inhalt"
            open={openCol === "field"}
            filtered={Boolean(filters.field)}
            options={fieldOptions}
            value={filters.field}
            onToggle={toggleCol}
            onPick={(field) => {
              setFilters((current) => ({ ...current, field }));
              setOpenCol(null);
            }}
          />
          <ColumnFilter
            col="person"
            label="Person"
            align="end"
            open={openCol === "person"}
            filtered={Boolean(filters.person)}
            options={personOptions}
            value={filters.person}
            onToggle={toggleCol}
            onPick={(person) => {
              setFilters((current) => ({ ...current, person }));
              setOpenCol(null);
            }}
          />
        </div>
        <div className="ver-win-groups">
          {groups.length === 0 ? (
            <p className="ver-win-empty">Keine Einträge</p>
          ) : (
            groups.map((group) => {
              const current = group.items.some((version) => version.id === latestId);
              // Searching or filtering shows every hit; otherwise only the current year starts open.
              const open = filtering || !collapsed.has(group.year);
              return (
                <section
                  key={group.year}
                  className={`ver-win-group${current ? " current" : " outdated"}${open ? " open" : ""}`}
                >
                  <header className="ver-win-group-head">
                    <button
                      type="button"
                      className="ver-win-group-toggle"
                      aria-expanded={open}
                      onClick={() => toggleGroup(group.year)}
                    >
                      <span className="ver-win-group-title">
                        <Icon src={a.chevronDown} size={14} className="ver-win-group-caret" />
                        <strong>{group.year}</strong>
                        <small>
                          {group.items.length} {group.items.length === 1 ? "Änderung" : "Änderungen"}
                        </small>
                      </span>
                      {current ? <span className="ver-state current">aktueller Stand</span> : null}
                    </button>
                  </header>
                  <ul hidden={!open}>
                    {group.items.map((version) => (
                      <HistoryRow
                        key={version.id}
                        version={version}
                        current={version.id === latestId}
                        active={version.id === viewingVersionId}
                        onOpen={() => openHistoryChange(version.id)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </aside>,
    document.body,
  );
}

export function VersionLayer() {
  const { isHistorical } = useWorkflow();

  useEffect(() => {
    document.body.classList.toggle("historical-version", isHistorical);
    return () => document.body.classList.remove("historical-version");
  }, [isHistorical]);

  return (
    <>
      <HistoricalBanner />
      <VersionWindow />
    </>
  );
}
