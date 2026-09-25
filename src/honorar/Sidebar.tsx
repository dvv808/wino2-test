import { useState } from "react";
import * as a from "../assets/index";
import { monthLabel } from "../lib/honorar/format";
import { activeMonth, monthOf } from "../lib/honorar/queries";
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
  const active = activeMonth(state);
  const advisor = state.role === "advisor" || state.role === "head";

  const [query, setQuery] = useState("");
  const [year, setYear] = useState(() => yearOf(finanzenMonth) || 2027);

  const years = Array.from(new Set([...EXTRA_YEARS, ...state.months.map((month) => yearOf(month.id))])).sort();
  const yearHasMonths = state.months.some((month) => yearOf(month.id) === year);
  const showSingle = matches(query, "Einzelfaktura", "Gutschriften");
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
          <small>Finanzen</small>
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
        <details className="hn-folder" open>
          <summary className="pp-area">
            <span className="pp-area-label">
              <Icon src={a.hnCopy} size={18} />
              Fakturierung
            </span>
            <Icon src={a.chevronDown} size={18} className="hn-folder-caret" />
          </summary>

          <div className="pp-tree hn-tree">
            {showSingle ? (
              <button
                type="button"
                className={`hn-tree-item stack${finanzenPage === "singleInvoices" ? " active" : ""}`}
                onClick={() => openFinanzen("singleInvoices")}
              >
                <span className="hn-tree-name">
                  <Icon src={a.docList} size={18} />
                  <span>
                    Einzelfaktura
                    <br />
                    Gutschriften
                  </span>
                </span>
                <StatusBadge kind="offen" />
              </button>
            ) : null}

            {monthIdsForYear(year).map((id) => {
              if (!matches(query, monthLabel(id))) return null;
              const month = monthOf(state, id);
              const exists = Boolean(month);
              const future = Boolean(month && id > active.id && !month.closed && !month.steps.status);
              const current = finanzenPage === "month" && finanzenMonth === id;
              const muted = !exists || future;
              return (
                <button
                  type="button"
                  key={id}
                  className={`hn-tree-item${current ? " active" : ""}${muted ? " muted" : ""}`}
                  disabled={muted}
                  title={!exists ? "Dieses Jahr ist noch nicht angelegt" : future ? "Noch nicht begonnen" : undefined}
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

        {showOpenItems || showMeinBereich ? (
          <details
            className="hn-folder"
            onToggle={(event) => {
              if (event.currentTarget.open) openFinanzen("openItems");
            }}
          >
            {showOpenItems ? (
              <summary className={`pp-area${finanzenPage === "openItems" ? " current" : ""}`}>
                <span className="pp-area-label">
                  <Icon src={a.hnRefresh} size={18} />
                  Offene Posten
                </span>
                <Icon src={a.chevronDown} size={18} className="hn-folder-caret" />
              </summary>
            ) : null}

            {showMeinBereich ? (
              <div className="pp-tree hn-tree">
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
              </div>
            ) : null}
          </details>
        ) : null}

        {!yearHasMonths && !query ? <p className="hn-side-empty">Für {year} gibt es noch keine Fakturierung.</p> : null}
      </div>
    </aside>
  );
}
