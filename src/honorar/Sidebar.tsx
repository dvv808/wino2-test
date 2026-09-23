import * as a from "../assets/index";
import { Icon } from "../ui";
import { monthLabel } from "../lib/honorar/format";
import { activeMonth, openItemsNeedingAction, openSingleInvoices } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { CountBadge, StatusBadge } from "./ui";

export function HonorarSidebar() {
  const { state } = useHonorar();
  const { finanzenPage, finanzenMonth, openFinanzen, setFinanzenMonth, openFinanzenStep } = useWorkflow();
  const active = activeMonth(state);
  const singleCount = openSingleInvoices(state).length;
  const openCount = openItemsNeedingAction(state.openItems).length;

  return (
    <aside className="mitarbeiter hn-side">
      <div className="mitarbeiter-head">
        <div className="mitarbeiter-title">
          <h2>Honorarverrechnung Finanzen</h2>
        </div>
        <label className="mitarbeiter-search">
          <Icon src={a.searchDark} size={16} />
          <input type="search" placeholder="Suchen..." />
        </label>
        <button type="button" className="mitarbeiter-select">
          Jahr: 2027
          <Icon src={a.chevronDown} size={16} />
        </button>
      </div>

      <div className="mitarbeiter-body">
        <div className="dept-head">
          <span className="dept-name">Fakturierung</span>
          <Icon src={a.chevronDown} size={16} />
        </div>

        <button
          type="button"
          className={`hn-nav${finanzenPage === "singleInvoices" ? " active" : ""}`}
          onClick={() => openFinanzen("singleInvoices")}
        >
          <span>Einzelfaktura / Gutschriften</span>
          {singleCount ? <span className="status-pill open hn-mini">{singleCount} Offen</span> : null}
        </button>

        {state.months.map((month) => {
          const future = month.id > active.id && !month.closed && !month.steps.status;
          const current = finanzenPage === "month" && finanzenMonth === month.id;
          return (
            <button
              type="button"
              key={month.id}
              className={`hn-nav${current ? " active" : ""}${future ? " muted" : ""}`}
              disabled={future}
              title={future ? "Noch nicht begonnen" : undefined}
              onClick={() => {
                setFinanzenMonth(month.id);
                openFinanzen("month", month.id, month.steps.status ? "data" : "status");
                if (month.steps.status && !month.steps.data) openFinanzenStep("data");
              }}
            >
              <span>{monthLabel(month.id)}</span>
              {month.closed ? <StatusBadge kind="fertig" /> : month.id === active.id ? <StatusBadge kind="offen" /> : null}
            </button>
          );
        })}

        <div className="dept-head divided">
          <button type="button" className={`hn-nav-plain${finanzenPage === "openItems" ? " active" : ""}`} onClick={() => openFinanzen("openItems")}>
            Offene Posten
          </button>
          <CountBadge value={openCount} />
        </div>

        {state.role === "advisor" || state.role === "head" ? (
          <button
            type="button"
            className={`hn-nav${finanzenPage === "meinBereich" ? " active" : ""}`}
            onClick={() => openFinanzen("meinBereich")}
          >
            Mein Bereich
          </button>
        ) : null}
      </div>
    </aside>
  );
}
