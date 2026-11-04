import { useEffect, useState } from "react";
import * as a from "../assets/index";
import { monthLabel } from "../lib/honorar/format";
import { feeSettled, isOpenItemFee } from "../lib/honorar/queries";
import { clearFocusFee, peekFocusFees } from "../honorar/focusFee";
import { isOwnFee } from "../honorar/ownership";
import type { Fee, HonorarState } from "../types/honorar";
import { StatusTable } from "../honorar/StatusStep";
import { useHonorar } from "../honorar/store";
import { HnKicker, StatCards, StatusBadge, StepEmpty, type StatFilter } from "../honorar/ui";
import { Icon } from "../ui";

/** The logged-in person's invoices: own partners, and workflows whose current step is theirs (see `isOwnFee`). */
export function ownFees(state: HonorarState): Fee[] {
  return state.fees.filter((fee) => isOwnFee(state, fee));
}

/** Own invoices that are open and need action: past their Zahlungsziel or waiting in Offene Posten. */
export function ownActionCount(state: HonorarState) {
  return ownFees(state).filter((fee) => fee.paymentStatus === "unpaid" || isOpenItemFee(state, fee)).length;
}

/**
 * Mein Bereich → Bestand → Honorare/Forderungen: the Sammelfaktura of the Forderungen, month by month,
 * with only the partners the logged-in person is responsible for. No Offene Posten, no Einzelfaktura.
 */
export function MyForderungen() {
  const { state } = useHonorar();
  const fees = ownFees(state);
  const today = state.today.slice(0, 7);
  const months = [...new Set(fees.map((fee) => fee.month))].sort().reverse();
  const years = [...new Set(months.map((id) => id.slice(0, 4)))];
  // Start on the latest month that has already begun.
  const [monthId, setMonthId] = useState(() => months.find((id) => id <= today) ?? months[0] ?? today);
  const [openYears, setOpenYears] = useState<Set<string>>(() => new Set([monthId.slice(0, 4)]));
  const [stat, setStat] = useState<StatFilter>(null);
  // Rows handed over by a widget notice ("Ansehen"): their month opens and they stay marked for a few seconds.
  const [highlight, setHighlight] = useState<string[]>([]);

  useEffect(() => {
    function take() {
      const ids = peekFocusFees().filter((id) => fees.some((fee) => fee.id === id));
      if (!ids.length) return;
      clearFocusFee();
      const first = fees.find((fee) => fee.id === ids[0])!;
      setMonthId(first.month);
      setOpenYears((prev) => new Set(prev).add(first.month.slice(0, 4)));
      setStat(null);
      setHighlight(ids);
    }
    take();
    window.addEventListener("honorar-focus", take);
    return () => window.removeEventListener("honorar-focus", take);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fees]);

  useEffect(() => {
    if (!highlight.length) return;
    const frame = window.requestAnimationFrame(() =>
      document.querySelector(".hn-st-row.focus")?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
    const timer = window.setTimeout(() => setHighlight([]), 6000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [highlight]);

  const monthFees = fees.filter((fee) => fee.month === monthId);
  const done = monthFees.filter((fee) => fee.paymentStatus === "paid").length;
  const shown = monthFees.filter((fee) => stat === null || (stat === "done") === (fee.paymentStatus === "paid"));

  function toggleYear(year: string) {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return (
    <div className="content-shell bestand-body">
      <aside className="pp-side hn-side">
        <header className="pp-side-head">
          <span className="hn-side-avatar">
            <img src={a.avatarBg} alt="" />
            <Icon src={a.honorar} size={22} />
          </span>
          <span className="pp-side-title">
            <strong>Honorare</strong>
            <small>Forderungen</small>
          </span>
        </header>
        <hr className="hn-side-rule" />
        <div className="hn-side-body">
          <details className="hn-folder" open>
            <summary className="pp-area" onClick={(event) => event.preventDefault()}>
              <span className="pp-area-label">
                <Icon src={a.hnCopy} size={18} />
                Sammelfaktura
              </span>
            </summary>
            <div className="pp-tree hn-year-groups">
              {years.map((year) => (
                <details key={year} className="hn-folder hn-year-group" open={openYears.has(year)}>
                  <summary
                    className="pp-area hn-year-group-head"
                    onClick={(event) => {
                      event.preventDefault();
                      toggleYear(year);
                    }}
                  >
                    <span className="pp-area-label">{year}</span>
                    <Icon src={a.chevronDown} size={16} className="hn-folder-caret" />
                  </summary>
                  <div className="pp-tree hn-tree">
                    {months
                      .filter((id) => id.startsWith(year))
                      .sort()
                      .map((id) => {
                        const list = fees.filter((fee) => fee.month === id);
                        const settled = list.length > 0 && list.every(feeSettled);
                        return (
                          <button
                            type="button"
                            key={id}
                            className={`hn-tree-item${id === monthId ? " active" : ""}`}
                            aria-current={id === monthId ? "page" : undefined}
                            onClick={() => {
                              setMonthId(id);
                              setStat(null);
                            }}
                          >
                            <span className="hn-tree-name">
                              <Icon src={a.calendar} size={18} />
                              {monthLabel(id)}
                            </span>
                            <StatusBadge kind={settled ? "fertig" : "offen"} />
                          </button>
                        );
                      })}
                  </div>
                </details>
              ))}
            </div>
          </details>
        </div>
      </aside>

      <div className="hn-main">
        <section className="freigaben hn-panel hn-status">
          <div className="hn-status-head">
            <div>
              <HnKicker>Status zu Rechnungen</HnKicker>
              <p className="hn-month">
                <strong>{monthLabel(monthId)}</strong> {monthId.slice(0, 4)}
              </p>
              <p className="hn-my-scope">Nur deine Partner als Kundenberater:in und Workflows, bei denen du gerade dran bist.</p>
            </div>
          </div>
          {fees.length === 0 ? (
            <StepEmpty
              icon={a.tickList}
              title="Dir sind keine Partner zugeordnet"
              lead="Sobald du Kundenberater:in eines Partners mit Honorar bist, erscheinen seine Rechnungen hier."
            />
          ) : (
            <StatusTable
              fees={shown}
              label="Meine Rechnungen"
              highlight={highlight}
              stats={<StatCards open={monthFees.length - done} done={done} unit="Zahlungen" value={stat} onChange={setStat} />}
              empty={
                <StepEmpty
                  icon={a.tickList}
                  title="Keine Rechnungen in diesem Monat"
                  lead="In diesem Monat gibt es keine Honorare deiner Partner."
                />
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
