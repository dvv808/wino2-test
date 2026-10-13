import { useState } from "react";
import * as a from "../assets/index";
import { monthLabel } from "../lib/honorar/format";
import { isOpenItemFee, monthOf } from "../lib/honorar/queries";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { StatusBadge } from "./ui";

const EXTRA_YEARS = [2026, 2027, 2028];

function yearOf(id: string) {
  return Number(id.slice(0, 4));
}

function monthIdsForYear(year: number) {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
}

function matches(query: string, ...labels: string[]) {
  const needle = query.trim().toLocaleLowerCase("de-AT");
  if (!needle) return true;
  return labels.some((label) => label.toLocaleLowerCase("de-AT").includes(needle));
}

export function HonorarSidebar() {
  const { state } = useHonorar();
  const { finanzenPage, finanzenMonth, openFinanzen } = useWorkflow();
  const advisor = state.role === "advisor" || state.role === "head";

  const [query, setQuery] = useState("");
  const [year, setYear] = useState(() => yearOf(finanzenMonth) || 2027);

  const years = Array.from(new Set([...EXTRA_YEARS, ...state.months.map((month) => yearOf(month.id))])).sort();
  const yearHasMonths = state.months.some((month) => yearOf(month.id) === year);
  const showSingle = matches(query, "Sammelfaktura");
  const hasOpenSingle = state.singleInvoices.some((invoice) => invoice.status === "open");
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
        <input type="search" placeholder="Suchen..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <hr className="hn-side-rule" />

      <div className="hn-year">
        <span className="hn-year-btn" aria-hidden>
          Jahr: {year}
          <Icon src={a.chevronDown} size={18} />
        </span>
        <select
          className="hn-year-select"
          aria-label="Jahr"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        >
          {years.map((option) => (
            <option key={option} value={option}>
              Jahr: {option}
            </option>
          ))}
        </select>
      </div>

      <div className="hn-side-body">
        {showOpenItems || showSingle || showMeinBereich ? (
          <details className="hn-folder" open>
            <summary className="pp-area">
              <span className="pp-area-label">
                <Icon src={a.bank} size={18} />
                Forderungen
              </span>
              <Icon src={a.chevronDown} size={18} className="hn-folder-caret" />
            </summary>

            <div className="pp-tree hn-tree">
              {showOpenItems ? (
                <button
                  type="button"
                  className={`hn-tree-item${finanzenPage === "openItems" ? " active" : ""}`}
                  onClick={() => openFinanzen("openItems")}
                >
                  <span className="hn-tree-name">
                    <Icon src={a.hnRefresh} size={18} />
                    Offene Posten
                  </span>
                  {hasOpenItems ? <Icon src={a.onhold} size={16} /> : null}
                </button>
              ) : null}
              {showSingle ? (
                <button
                  type="button"
                  className={`hn-tree-item${finanzenPage === "singleInvoices" ? " active" : ""}`}
                  onClick={() => openFinanzen("singleInvoices")}
                >
                  <span className="hn-tree-name">
                    <Icon src={a.docList} size={18} />
                    Sammelfaktura
                  </span>
                  {hasOpenSingle ? <Icon src={a.onhold} size={16} /> : null}
                </button>
              ) : null}
              {showMeinBereich ? (
                <button
                  type="button"
                  className={`hn-tree-item${finanzenPage === "meinBereich" ? " active" : ""}`}
                  onClick={() => openFinanzen("meinBereich")}
                >
                  <span className="hn-tree-name">
                    <Icon src={a.person} size={18} />
                    Mein Bereich
                  </span>
                </button>
              ) : null}
            </div>
          </details>
        ) : null}

        <details className="hn-folder" open>
          <summary className="pp-area">
            <span className="pp-area-label">
              <Icon src={a.hnCopy} size={18} />
              Fakturierung
            </span>
            <Icon src={a.chevronDown} size={18} className="hn-folder-caret" />
          </summary>

          <div className="pp-tree hn-tree">
            {monthIdsForYear(year).map((id) => {
              if (!matches(query, monthLabel(id))) return null;
              const month = monthOf(state, id);
              const exists = Boolean(month);
              const current = finanzenPage === "month" && finanzenMonth === id;
              return (
                <button
                  type="button"
                  key={id}
                  className={`hn-tree-item${current ? " active" : ""}${exists ? "" : " muted"}`}
                  disabled={!exists}
                  title={exists ? undefined : "Dieses Jahr ist noch nicht angelegt"}
                  onClick={() => {
                    if (!month) return;
                    openFinanzen("month", id, month.steps.status ? "data" : "status");
                  }}
                >
                  <span className="hn-tree-name">
                    <Icon src={a.calendar} size={18} />
                    {monthLabel(id)}
                  </span>
                  <StatusBadge kind={month?.closed ? "fertig" : "offen"} />
                </button>
              );
            })}
          </div>
        </details>

        {!yearHasMonths && !query ? <p className="hn-side-empty">Für {year} gibt es noch keine Fakturierung.</p> : null}
      </div>
    </aside>
  );
}
