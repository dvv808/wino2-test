import { useState, type MouseEvent } from "react";
import * as a from "../assets/index";
import { monthLabel } from "../lib/honorar/format";
import { isOpenItemFee, monthOf } from "../lib/honorar/queries";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { StatusBadge } from "./ui";

const EXTRA_YEARS = [2026, 2027, 2028];
const EARLIEST_YEAR = 2021;
const ALL_YEARS_VALUE = "alle";

function yearOf(id: string) {
  return Number(id.slice(0, 4));
}

function monthIdsForYear(year: number) {
  return Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`,
  );
}

function matches(query: string, ...labels: string[]) {
  const needle = query.trim().toLocaleLowerCase("de-AT");
  if (!needle) return true;
  return labels.some((label) =>
    label.toLocaleLowerCase("de-AT").includes(needle),
  );
}

/** The caret folds a folder; the rest of its header opens the folder's dashboard. */
function folderClick(
  event: MouseEvent<HTMLElement>,
  toggle: () => void,
  navigate: () => void,
) {
  event.preventDefault();
  if ((event.target as HTMLElement).closest(".hn-folder-caret")) toggle();
  else navigate();
}

export function HonorarSidebar() {
  const { state } = useHonorar();
  const {
    finanzenPage,
    finanzenMonth,
    finanzenYear,
    openFinanzen,
    openSammelfaktura,
  } = useWorkflow();
  const advisor = state.role === "advisor" || state.role === "head";

  const [query, setQuery] = useState("");
  const currentYear = yearOf(finanzenMonth) || 2027;
  const [sammelOpen, setSammelOpen] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS_VALUE);
  const [openYears, setOpenYears] = useState<Set<number>>(
    () => new Set([currentYear]),
  );

  const maxYear = Math.max(
    ...EXTRA_YEARS,
    ...state.months.map((month) => yearOf(month.id)),
  );
  const years = Array.from(
    { length: maxYear - EARLIEST_YEAR + 1 },
    (_, index) => maxYear - index,
  );
  const visibleYears =
    yearFilter === ALL_YEARS_VALUE
      ? years
      : years.filter((option) => option === Number(yearFilter));
  const showSingle = matches(query, "Einzelfaktura");
  const hasOpenSingle = state.singleInvoices.some(
    (invoice) => invoice.status === "open",
  );
  const hasOpenItems = state.fees.some((fee) => isOpenItemFee(state, fee));
  const showOpenItems = matches(query, "Offene Posten");
  const showMeinBereich = advisor && matches(query, "Mein Bereich");

  return (
    <aside className="pp-side hn-side">
      <header className="pp-side-head">
        <span className="hn-side-avatar">
          <img src={a.avatarBg} alt="" />
          <Icon src={a.requestSmall} size={22} />
        </span>
        <span className="pp-side-title">
          <strong>Honorarverrechnung</strong>
          <small>Forderungen</small>
        </span>
      </header>

      <label className="pp-side-search">
        <Icon src={a.searchDark} size={18} />
        <input
          type="search"
          placeholder="Suchen..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <hr className="hn-side-rule" />

      <div className="hn-side-body">
        {showOpenItems ? (
          <button
            type="button"
            className={`pp-area hn-top-item${finanzenPage === "openItems" ? " current" : ""}`}
            onClick={() => openFinanzen("openItems")}
          >
            <span className="pp-area-label">
              <Icon src={a.hnRefresh} size={18} />
              Offene Posten
            </span>
            {hasOpenItems ? <Icon src={a.onhold} size={16} /> : null}
          </button>
        ) : null}

        {showSingle ? (
          <button
            type="button"
            className={`pp-area hn-top-item${finanzenPage === "singleInvoices" ? " current" : ""}`}
            onClick={() => openFinanzen("singleInvoices")}
          >
            <span className="pp-area-label">
              <Icon src={a.docList} size={18} />
              Einzelfaktura
            </span>
            {hasOpenSingle ? <Icon src={a.onhold} size={16} /> : null}
          </button>
        ) : null}

        {showMeinBereich ? (
          <button
            type="button"
            className={`pp-area hn-top-item${finanzenPage === "meinBereich" ? " current" : ""}`}
            onClick={() => openFinanzen("meinBereich")}
          >
            <span className="pp-area-label">
              <Icon src={a.person} size={18} />
              Mein Bereich
            </span>
          </button>
        ) : null}

        <details className="hn-folder" open={sammelOpen}>
          <summary
            className={`pp-area${finanzenPage === "sammelfaktura" && !finanzenYear ? " current" : ""}`}
            onClick={(event) =>
              folderClick(
                event,
                () => setSammelOpen((value) => !value),
                () => {
                  setSammelOpen(true);
                  openSammelfaktura();
                },
              )
            }
          >
            <span className="pp-area-label">
              <Icon src={a.hnCopy} size={18} />
              Sammelfaktura
            </span>
            <Icon src={a.chevronDown} size={18} className="hn-folder-caret" />
          </summary>

          <div className="hn-year hn-year-compact">
            <span className="hn-year-btn" aria-hidden>
              Jahr: {yearFilter === ALL_YEARS_VALUE ? "Alle" : yearFilter}
              <Icon src={a.chevronDown} size={18} />
            </span>
            <select
              className="hn-year-select"
              aria-label="Jahr"
              value={yearFilter}
              onChange={(event) => {
                const value = event.target.value;
                setYearFilter(value);
                if (value !== ALL_YEARS_VALUE) {
                  setOpenYears(new Set([Number(value)]));
                }
              }}
            >
              <option value={ALL_YEARS_VALUE}>Jahr: Alle</option>
              {years.map((option) => (
                <option key={option} value={option}>
                  Jahr: {option}
                </option>
              ))}
            </select>
          </div>

          <div className="pp-tree hn-year-groups">
            {visibleYears.map((yearOption) => {
              const monthIds = monthIdsForYear(yearOption).filter((id) =>
                matches(query, monthLabel(id)),
              );
              if (!monthIds.length) return null;
              const open = openYears.has(yearOption);
              return (
                <details
                  key={yearOption}
                  className="hn-folder hn-year-group"
                  open={open}
                >
                  <summary
                    className={`pp-area hn-year-group-head${finanzenPage === "sammelfaktura" && finanzenYear === String(yearOption) ? " current" : ""}`}
                    onClick={(event) =>
                      folderClick(
                        event,
                        () =>
                          setOpenYears((prev) => {
                            const next = new Set(prev);
                            if (next.has(yearOption)) next.delete(yearOption);
                            else next.add(yearOption);
                            return next;
                          }),
                        () => {
                          setOpenYears((prev) => new Set(prev).add(yearOption));
                          openSammelfaktura(String(yearOption));
                        },
                      )
                    }
                  >
                    <span className="pp-area-label">{yearOption}</span>
                    <Icon
                      src={a.chevronDown}
                      size={16}
                      className="hn-folder-caret"
                    />
                  </summary>

                  <div className="pp-tree hn-tree">
                    {monthIds.map((id) => {
                      const month = monthOf(state, id);
                      const exists = Boolean(month);
                      const current =
                        finanzenPage === "month" && finanzenMonth === id;
                      return (
                        <button
                          type="button"
                          key={id}
                          className={`hn-tree-item${current ? " active" : ""}${exists ? "" : " muted"}`}
                          disabled={!exists}
                          title={
                            exists
                              ? undefined
                              : "Dieses Jahr ist noch nicht angelegt"
                          }
                          onClick={() => {
                            if (!month) return;
                            openFinanzen("month", id, "status");
                          }}
                        >
                          <span className="hn-tree-name">
                            <Icon src={a.calendar} size={18} />
                            {monthLabel(id)}
                          </span>
                          <StatusBadge
                            kind={month?.closed ? "fertig" : "offen"}
                          />
                        </button>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </details>
      </div>
    </aside>
  );
}
