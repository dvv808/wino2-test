import { useState } from "react";
import * as a from "../assets/index";
import { isOpenItemFee } from "../lib/honorar/queries";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { StatusTable } from "./StatusStep";
import { ConfirmModal, StatCards, type StatFilter } from "./ui";

/**
 * Offene Posten: the same table as Sammelfaktura (Status zu Rechnungen), filtered to the invoices that are or were
 * an Offener Posten. There are no actions in the rows: the 3-dots menu opens "Info zur Rechnung", where the
 * Kundenberater is contacted and the correction is decided.
 * `followToSingleInvoice` is accepted for Mein Bereich, which embeds this page; nothing follows from here any more.
 */
export function OpenItemsPage(_props: { followToSingleInvoice?: boolean } = {}) {
  const { finanzenMonth } = useWorkflow();
  const { state } = useHonorar();
  const [confirmClear, setConfirmClear] = useState(false);
  const [hidden, setHidden] = useState(false);
  // "Offen" is selected by default, so the table starts out showing only open items.
  const [stat, setStat] = useState<StatFilter>("open");

  const openFees = hidden ? [] : state.fees.filter((fee) => isOpenItemFee(state, fee));
  // Closed items: invoices that were paid late (after a reminder or after two months).
  const doneFees = state.fees.filter((fee) => (fee.paymentStatus === "paid" && fee.paidLate) || fee.settledVia);
  const fees = stat === "open" ? openFees : stat === "done" ? doneFees : [...openFees, ...doneFees];

  return (
    <section className="freigaben hn-panel hn-status">
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">{finanzenMonth.slice(0, 4)}</p>
      <h2 className="hn-h2 hn-status-title">Offene Posten</h2>

      <StatCards open={openFees.length} done={doneFees.length} unit="Zahlungen" value={stat} onChange={setStat} />

      <StatusTable
        fees={fees}
        label="Offene Posten"
        tools={() => (
          <div className="hn-status-tools">
            <span />
            <button type="button" className="hn-clear" onClick={() => setConfirmClear(true)}>
              <Icon src={a.trash} size={18} />
              Liste leeren
            </button>
          </div>
        )}
      />

      {confirmClear ? (
        <ConfirmModal
          title="Liste wirklich leeren?"
          text="Die offenen Posten werden aus der Liste genommen."
          confirmLabel="Liste leeren"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            setHidden(true);
            setConfirmClear(false);
          }}
        />
      ) : null}
    </section>
  );
}
