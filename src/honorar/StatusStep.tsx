import { useEffect, useMemo, useState } from "react";
import * as a from "../assets/index";
import { ContextMenu, Icon } from "../ui";
import { StatCard } from "../manager/FreigabenPanel";
import { formatDate, money, monthYearLabel, paymentStatusLabel } from "../lib/honorar/format";
import { actionNeeded, monthOf, partnerOf, previousFees, statusKpis, totals } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { ConfirmModal, EmptyState, PartnerCell, RequiredCommentModal, StickyBar } from "./ui";

export function StatusStep() {
  const { state, handToOpenItems, markPaid, closeStatusStep } = useHonorar();
  const { finanzenMonth, openFinanzen, openFinanzenStep } = useWorkflow();
  const fees = useMemo(() => previousFees(state, finanzenMonth), [state, finanzenMonth]);
  const kpis = statusKpis(fees);
  const sums = totals(fees);
  const [confirmClose, setConfirmClose] = useState(false);
  const [handId, setHandId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const month = monthOf(state, finanzenMonth);

  useEffect(() => {
    if (fees.length === 0 && month && !month.steps.status) closeStatusStep(finanzenMonth);
  }, [fees.length, month, finanzenMonth, closeStatusStep]);

  if (fees.length === 0) {
    return <EmptyState title="Keine Rechnungen aus dem Vormonat" text="Dieser Schritt gilt als erledigt." />;
  }

  return (
    <section className="freigaben hn-panel">
      <h1 className="freigaben-title">Honorarverrechnung</h1>
      <p className="hn-month">{monthYearLabel(finanzenMonth)}</p>
      <h2 className="hn-h2">Status zu Rechnungen</h2>

      <div className="freigaben-stats">
        <StatCard label="Handlungsbedarf" value={kpis.needed} icon={a.onhold} />
        <StatCard label="Erledigt" value={kpis.done} icon={a.confirm} />
      </div>

      <div className="req-table hn-table">
        <div className="req-head hn-head" role="row">
          {["Partner", "Status zur Rechnung", "Zahlart", "Status zur Zahlung", "Zu zahlender Honorarbetrag", "Bezahlter Honorarbetrag", "Erfasst"].map(
            (label) => (
              <div className="req-th" key={label}>
                <span className="req-th-top">
                  {label}
                  <Icon src={a.colFilter} size={14} />
                </span>
                <input className="col-input" aria-label={label} />
              </div>
            ),
          )}
        </div>

        <div className="hn-total" role="row">
          <span>Alle Honorare</span>
          <span />
          <span />
          <span />
          <span>
            {money(sums.due)}
            <small>Summe total</small>
          </span>
          <span>
            {money(sums.paid)}
            <small>Summe total</small>
          </span>
          <span>
            Offen: {money(sums.open)}
          </span>
        </div>

        {fees.map((fee) => {
          const partner = partnerOf(state, fee.partnerId);
          const payment = paymentStatusLabel(fee.paymentStatus, fee.dueDate, fee.paymentReason);
          const unpaid = actionNeeded(fee);
          return (
            <div className={`hn-row${unpaid ? " amber" : ""}`} role="row" key={fee.id}>
              <PartnerCell
                name={partner?.name ?? fee.partnerId}
                meta={[partner?.birthDate, partner?.nickname ? `(vulgo ${partner.nickname})` : ""].filter(Boolean).join(" ")}
                photo={partner?.photo}
                company={partner?.type === "company"}
              />
              <div>
                <span className="status-pill done">
                  <Icon src={a.onhold} size={16} />
                  Versendet am {fee.sentAt ? formatDate(fee.sentAt) : "–"}
                </span>
                {fee.sentTo ? <small>an {fee.sentTo}</small> : null}
              </div>
              <div>{fee.paymentMethod}</div>
              <div>
                <span className={`status-pill ${unpaid ? "open" : "fertig"}`}>
                  <Icon src={fee.paymentStatus === "paid" ? a.confirm : a.onhold} size={16} />
                  {fee.watched ? "wird beobachtet" : payment.title}
                </span>
                {fee.paymentStatus === "handed_to_op" ? (
                  <button type="button" className="hn-link" onClick={() => openFinanzen("openItems")}>
                    Offener Posten
                  </button>
                ) : payment.detail ? (
                  <small>{payment.detail}</small>
                ) : null}
              </div>
              <div>
                {money(fee.amount)}
                <small>{fee.tariff}</small>
              </div>
              <div>
                {money(fee.paid)}
                <small>{fee.tariff}</small>
              </div>
              <div className="hn-row-end">
                <span>
                  {formatDate(fee.createdAt)}
                  <small>{fee.createdBy}</small>
                </span>
                {unpaid ? (
                  <button type="button" className="start-btn" onClick={() => setHandId(fee.id)}>
                    An Offene Posten übergeben
                  </button>
                ) : null}
                <ContextMenu
                  items={[
                    ...(fee.paymentMethod === "Abbucher" && fee.paymentReason === "direct_debit_failed"
                      ? [{ label: "Doch bezahlt markieren", icon: a.confirm, onSelect: () => setPayId(fee.id) }]
                      : []),
                    { label: "Verlauf", icon: a.history, onSelect: () => undefined },
                  ]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {month?.steps.status ? null : (
      <StickyBar>
        <button
          type="button"
          className="btn-primary"
          disabled={kpis.needed > 0}
          title={kpis.needed > 0 ? `Noch ${kpis.needed} Zeilen offen` : undefined}
          onClick={() => setConfirmClose(true)}
        >
          Status abschliessen
        </button>
        {kpis.needed > 0 ? <small>Noch {kpis.needed} Zeilen offen</small> : null}
      </StickyBar>
      )}

      {handId ? (
        <ConfirmModal
          title="An Offene Posten übergeben?"
          text="Der Betrag erscheint danach in Offene Posten."
          confirmLabel="Übergeben"
          onCancel={() => setHandId(null)}
          onConfirm={() => {
            handToOpenItems(handId);
            setHandId(null);
          }}
        />
      ) : null}

      {payId ? (
        <RequiredCommentModal
          title="Doch bezahlt markieren?"
          confirmLabel="Markieren"
          onCancel={() => setPayId(null)}
          onConfirm={(comment) => {
            markPaid(payId, comment);
            setPayId(null);
          }}
        />
      ) : null}

      {confirmClose ? (
        <ConfirmModal
          title="Status abschliessen?"
          text="Offene Beträge vor Zahlungsziel werden beobachtet."
          confirmLabel="Abschliessen"
          onCancel={() => setConfirmClose(false)}
          onConfirm={() => {
            closeStatusStep(finanzenMonth);
            setConfirmClose(false);
            openFinanzenStep("data");
          }}
        />
      ) : null}
    </section>
  );
}
