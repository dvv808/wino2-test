import { useState } from "react";
import * as a from "../assets/index";
import { monthLabel } from "../lib/honorar/format";
import { monthFinished, monthOf, partnerOf, totals } from "../lib/honorar/queries";
import type { Fee } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { money } from "./invoiceCells";
import { useHonorar } from "./store";
import { HnKicker, PartnerAvatar, PartnerOpenButton } from "./ui";

type Bucket = { id: string; label: string; short: string; fees: Fee[] };

const SHORT_MONTHS = ["Jän", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** Compact euro for axis ticks: € 12k, € 1,5k, € 800. */
function compact(value: number) {
  if (value >= 1000) {
    const k = value / 1000;
    return `€ ${k.toLocaleString("de-AT", { maximumFractionDigits: k >= 10 ? 0 : 1 })}k`;
  }
  return `€ ${Math.round(value)}`;
}

/** A round axis maximum (1, 2, 2.5 or 5 × 10ⁿ) at or above the largest bar. */
function niceMax(value: number) {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= value) ?? 10;
  return step * power;
}

/**
 * Sammelfaktura dashboard: a year (or all years) at a glance - totals, a monthly chart of
 * paid vs. outstanding, the month closes, the Zahlart split and the largest open amounts.
 */
export function SammelfakturaPage() {
  const { finanzenYear } = useWorkflow();
  const { state } = useHonorar();

  const fees = state.fees.filter((fee) => !finanzenYear || fee.month.startsWith(finanzenYear));
  const sum = totals(fees);
  const paidShare = sum.due ? Math.round((sum.paid / sum.due) * 100) : 0;

  // One bucket per month of the year; across all years, one per year.
  const buckets: Bucket[] = finanzenYear
    ? SHORT_MONTHS.map((short, index) => {
        const id = `${finanzenYear}-${String(index + 1).padStart(2, "0")}`;
        return { id, label: monthLabel(id), short, fees: fees.filter((fee) => fee.month === id) };
      })
    : [...new Set(state.fees.map((fee) => fee.month.slice(0, 4)))]
        .sort()
        .map((year) => ({ id: year, label: year, short: year, fees: fees.filter((fee) => fee.month.startsWith(year)) }));

  const failed = fees.filter((fee) => fee.paymentReason || fee.invoiceStatus === "send_failed").length;
  const workflows = fees.filter((fee) => fee.correction && !["verbucht", "abgelehnt"].includes(fee.correction.status)).length;

  return (
    <section className="freigaben hn-panel hn-status hn-dash">
      <div className="hn-dash-head">
        <div>
          <HnKicker>Honorarverrechnung</HnKicker>
          <p className="hn-month">{finanzenYear || "Alle Jahre"}</p>
          <h2 className="hn-h2 hn-status-title">Sammelfaktura</h2>
        </div>
        <button
          type="button"
          className="btn-secondary fg-verlauf-btn"
          onClick={() => window.dispatchEvent(new Event("honorar-verlauf"))}
        >
          <Icon src={a.history} size={18} />
          Verlauf
        </button>
      </div>

      {fees.length === 0 ? (
        <div className="hn-dash-empty">
          <Icon src={a.calendar} size={32} />
          <strong>Für {finanzenYear || "diesen Zeitraum"} gibt es noch keine Honorare</strong>
          <span>Sobald Daten für einen Monat erfasst sind, erscheint hier die Übersicht.</span>
        </div>
      ) : (
        <>
          <div className="hn-kpis hn-dash-kpis">
            <div className="hn-kpi">
              <small>Rechnungsbetrag</small>
              <strong>€ {money(sum.due)}</strong>
              <span>
                {fees.length} {fees.length === 1 ? "Rechnung" : "Rechnungen"}
              </span>
            </div>
            <div className="hn-kpi">
              <small>Zahlungseingang</small>
              <strong>€ {money(sum.paid)}</strong>
              <span>{paidShare} % bezahlt</span>
            </div>
            <div className={sum.open > 0 ? "hn-kpi due" : "hn-kpi"}>
              <small>Ausstehend</small>
              <strong>€ {money(sum.open)}</strong>
              <span>noch offen</span>
            </div>
            <div className="hn-kpi">
              <small>Klärungsfälle</small>
              <strong>{String(failed).padStart(2, "0")}</strong>
              <span>
                Zahlung / Versand fehlgeschlagen · {workflows} {workflows === 1 ? "Workflow" : "Workflows"} offen
              </span>
            </div>
          </div>

          <MonthChart buckets={buckets} byYear={!finanzenYear} />

          <div className="hn-dash-grid">
            {finanzenYear ? <MonthCloses buckets={buckets} /> : null}
            <MethodSplit fees={fees} />
            <LargestOpen fees={fees} />
          </div>
        </>
      )}
    </section>
  );
}

/** Stacked bars per month: Zahlungseingang (blue) + Ausstehend (amber) = Rechnungsbetrag. */
function MonthChart({ buckets, byYear }: { buckets: Bucket[]; byYear: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = niceMax(Math.max(...buckets.map((bucket) => totals(bucket.fees).due)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) => share * max);
  const active = buckets.find((bucket) => bucket.id === hover);
  const activeSum = active ? totals(active.fees) : null;

  return (
    <article className="hn-dash-card hn-chart-card">
      <header className="hn-dash-card-head">
        <span>
          <strong>Rechnungsbetrag {byYear ? "pro Jahr" : "pro Monat"}</strong>
          <small>Bezahlt und noch ausstehend</small>
        </span>
        <span className="hn-chart-legend">
          <span>
            <i className="paid" /> Zahlungseingang
          </span>
          <span>
            <i className="open" /> Ausstehend
          </span>
        </span>
      </header>

      <div className="hn-chart" role="img" aria-label={`Rechnungsbetrag ${byYear ? "pro Jahr" : "pro Monat"}`}>
        <div className="hn-chart-axis" aria-hidden>
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{compact(tick)}</span>
          ))}
        </div>
        <div className="hn-chart-plot" style={{ gridTemplateColumns: `repeat(${buckets.length}, 1fr)` }}>
          {ticks.map((tick) => (
            <span className="hn-chart-grid" key={tick} style={{ bottom: `${(tick / max) * 100}%` }} />
          ))}
          {buckets.map((bucket) => {
            const sum = totals(bucket.fees);
            return (
              <button
                type="button"
                className={hover === bucket.id ? "hn-chart-col hover" : "hn-chart-col"}
                key={bucket.id}
                onMouseEnter={() => setHover(bucket.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(bucket.id)}
                onBlur={() => setHover(null)}
                aria-label={`${bucket.label}: Rechnungsbetrag € ${money(sum.due)}, bezahlt € ${money(sum.paid)}, ausstehend € ${money(sum.open)}`}
              >
                <span className="hn-chart-bar" style={{ height: `${(sum.due / max) * 100}%` }}>
                  {sum.open > 0 ? <span className="open" style={{ flexGrow: sum.open }} /> : null}
                  {sum.paid > 0 ? <span className="paid" style={{ flexGrow: sum.paid }} /> : null}
                </span>
                <span className="hn-chart-label">{bucket.short}</span>
              </button>
            );
          })}
          {active && activeSum ? (
            <div
              className="hn-chart-tip"
              style={{ left: `${((buckets.indexOf(active) + 0.5) / buckets.length) * 100}%` }}
              role="status"
            >
              <strong>{active.label}</strong>
              {active.fees.length ? (
                <>
                  <span>
                    <i className="paid" /> Zahlungseingang <b>€ {money(activeSum.paid)}</b>
                  </span>
                  <span>
                    <i className="open" /> Ausstehend <b>€ {money(activeSum.open)}</b>
                  </span>
                  <span className="sum">
                    Rechnungsbetrag <b>€ {money(activeSum.due)}</b>
                  </span>
                </>
              ) : (
                <span>Noch keine Honorare</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Which months are closed (Status + Rechnungsversand fertig); a click opens the month. */
function MonthCloses({ buckets }: { buckets: Bucket[] }) {
  const { state } = useHonorar();
  const { openFinanzen } = useWorkflow();
  const finished = buckets.filter((bucket) => monthOf(state, bucket.id) && monthFinished(state, bucket.id)).length;
  return (
    <article className="hn-dash-card">
      <header className="hn-dash-card-head">
        <span>
          <strong>Monatsabschlüsse</strong>
          <small>
            {finished} von {buckets.length} Monaten fertig
          </small>
        </span>
      </header>
      <div className="hn-close-grid">
        {buckets.map((bucket) => {
          const exists = Boolean(monthOf(state, bucket.id));
          const done = exists && monthFinished(state, bucket.id);
          return (
            <button
              type="button"
              key={bucket.id}
              className={done ? "hn-close done" : exists ? "hn-close open" : "hn-close muted"}
              disabled={!exists}
              title={exists ? `${bucket.label} öffnen` : "Noch nicht angelegt"}
              onClick={() => openFinanzen("month", bucket.id, "status")}
            >
              <span>{bucket.short}</span>
              <Icon src={done ? a.confirm : a.onhold} size={14} alt={done ? "Fertig" : "Offen"} />
            </button>
          );
        })}
      </div>
    </article>
  );
}

/** SEPA-Lastschrift vs. Rechnung, by amount, with what is still open in each. */
function MethodSplit({ fees }: { fees: Fee[] }) {
  const all = totals(fees);
  const rows = [
    { label: "SEPA-Lastschrift", fees: fees.filter((fee) => fee.paymentMethod === "Abbucher") },
    { label: "Überweisung", fees: fees.filter((fee) => fee.paymentMethod === "Rechnung") },
  ];
  return (
    <article className="hn-dash-card">
      <header className="hn-dash-card-head">
        <span>
          <strong>Nach Zahlart</strong>
          <small>Anteil am Rechnungsbetrag</small>
        </span>
      </header>
      <div className="hn-split">
        {rows.map((row) => {
          const sum = totals(row.fees);
          const share = all.due ? Math.round((sum.due / all.due) * 100) : 0;
          return (
            <div className="hn-split-row" key={row.label}>
              <span className="hn-split-top">
                <strong>{row.label}</strong>
                <span>
                  € {money(sum.due)} · {share} %
                </span>
              </span>
              <span className="hn-split-track" title={`Bezahlt € ${money(sum.paid)}, ausstehend € ${money(sum.open)}`}>
                <span className="paid" style={{ width: `${all.due ? (sum.paid / all.due) * 100 : 0}%` }} />
                <span className="open" style={{ width: `${all.due ? (sum.open / all.due) * 100 : 0}%` }} />
              </span>
              <small>
                {row.fees.length} Rechnungen · € {money(sum.open)} ausstehend
              </small>
            </div>
          );
        })}
      </div>
    </article>
  );
}

/** The partners with the largest outstanding amounts; the icon opens their file. */
function LargestOpen({ fees }: { fees: Fee[] }) {
  const { state } = useHonorar();
  const byPartner = new Map<string, number>();
  for (const fee of fees) {
    const open = fee.amount - fee.paid;
    if (open > 0) byPartner.set(fee.partnerId, (byPartner.get(fee.partnerId) ?? 0) + open);
  }
  const top = [...byPartner.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
  return (
    <article className="hn-dash-card">
      <header className="hn-dash-card-head">
        <span>
          <strong>Größte offene Beträge</strong>
          <small>Top {top.length} Partner</small>
        </span>
      </header>
      {top.length === 0 ? (
        <p className="hn-dash-none">Alles bezahlt.</p>
      ) : (
        <ol className="hn-top-open">
          {top.map(([partnerId, open]) => {
            const partner = partnerOf(state, partnerId);
            return (
              <li key={partnerId}>
                <span className="partner-avatar">
                  <PartnerAvatar company={partner?.type === "company"} />
                </span>
                <span className="hn-top-name">
                  <strong>{partner?.name ?? "-"}</strong>
                  <small>{partner?.address.split(", ")[1] ?? ""}</small>
                </span>
                <b>€ {money(open)}</b>
                <PartnerOpenButton partner={partner} />
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
