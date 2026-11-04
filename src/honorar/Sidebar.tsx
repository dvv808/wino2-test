import { Fragment, useState, type MouseEvent } from "react";
import * as a from "../assets/index";
import { monthLabel } from "../lib/honorar/format";
import {
  RECHNUNGSVERSAND_STEPS,
  isOpenItemFee,
  monthFinished,
  monthOf,
  rechnungsversandDone,
} from "../lib/honorar/queries";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { StatusBadge } from "./ui";

const EXTRA_YEARS = [2026, 2027, 2028];
const EARLIEST_YEAR = 2021;

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
    finanzenStep,
    finanzenYear,
    openFinanzen,
    openSammelfaktura,
  } = useWorkflow();
  const advisor = state.role === "advisor" || state.role === "head";

  const [query, setQuery] = useState("");
  const currentYear = yearOf(finanzenMonth) || 2027;
  const [sammelOpen, setSammelOpen] = useState(true);
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
          <Icon src={a.honorar} size={22} />
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

        <hr className="hn-side-rule hn-group-rule" />

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

          <div className="pp-tree hn-year-groups">
            {years.map((yearOption) => {
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
                      const done = rechnungsversandDone(state, id);
                      const nextStep = RECHNUNGSVERSAND_STEPS.find((step) => !done[step]) ?? "data";
                      const inVersand = current && finanzenStep !== "status";
                      return (
                        <Fragment key={id}>
                        <button
                          type="button"
                          className={`hn-tree-item${current && !inVersand ? " active" : ""}${exists ? "" : " muted"}`}
                          aria-current={current && !inVersand ? "page" : undefined}
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
                            kind={exists && monthFinished(state, id) ? "fertig" : "offen"}
                          />
                        </button>
                        {current ? (
                          <div className="pp-tree hn-tree hn-month-pages">
                            <button
                              type="button"
                              className={`hn-tree-item hn-month-page${inVersand ? " active" : ""}`}
                              aria-current={inVersand ? "page" : undefined}
                              onClick={() => openFinanzen("month", id, inVersand ? finanzenStep : nextStep)}
                            >
                              <span className="hn-tree-name">
                                <Icon src={a.moduleWorkflow} size={18} />
                                Rechnungsversand
                              </span>
                              {RECHNUNGSVERSAND_STEPS.every((step) => done[step]) ? (
                                <Icon src={a.confirm} size={16} alt="Fertig" />
                              ) : (
                                <Icon src={a.onhold} size={16} alt="Offen" />
                              )}
                            </button>
                          </div>
                        ) : null}
                        </Fragment>
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
