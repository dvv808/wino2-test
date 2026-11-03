import { useState } from "react";
import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "../honorar/store";
import { VerlaufCaption } from "../chrome";
import { ShelfTitle } from "./ProfileShelf";
import { useInkassoPartnerId } from "./InkassoForderungen";
import { StatusTable } from "../honorar/StatusStep";
import { StatCards, StepEmpty, type StatFilter } from "../honorar/ui";

/**
 * Inkasso in the profile: the client's own invoices in the same table as Status zu Rechnungen.
 */
export function InkassoMain() {
  const { goTo, openMakler, openVersionHistory } = useWorkflow();
  const { state } = useHonorar();
  const inkassoPartner = useInkassoPartnerId();
  // The client's own invoices, newest first: the same table as Status zu Rechnungen.
  const clientFees = state.fees
    .filter((fee) => fee.partnerId === inkassoPartner && !fee.hiddenOpen)
    .sort((x, y) => y.month.localeCompare(x.month));
  // Offen / Abgeschlossen, the same filter cards as in Status zu Rechnungen.
  const [stat, setStat] = useState<StatFilter>(null);
  const clientDone = clientFees.filter((fee) => fee.paymentStatus === "paid").length;
  const shownClientFees = clientFees.filter((fee) => stat === null || (stat === "done") === (fee.paymentStatus === "paid"));

  /** Edits happen in the Maklervereinbarung, on the Honorar step. */
  function editHonorar() {
    goTo("fee");
    openMakler();
  }

  return (
    <main className="pp-main">
      <header className="fg-head pp-main-head">
        <ShelfTitle icon={a.tickList}>Inkasso</ShelfTitle>
        <span className="fg-head-actions">
          <button type="button" className="btn-secondary fg-verlauf-btn" onClick={openVersionHistory}>
            <Icon src={a.history} size={18} />
            <VerlaufCaption />
          </button>
        </span>
      </header>

      <section className="pp-section" id="inkasso-honorar">
        <header className="pp-section-head">
          <span className="pp-section-title">
            <Icon src={a.tickList} size={32} />
            Honorar &amp; Zahlungsziel
          </span>
          <button type="button" className="btn-primary pp-edit" onClick={editHonorar}>
            Editieren
          </button>
        </header>
        <div className="ik-table">
          <StatusTable
            fees={shownClientFees}
            label="Rechnungen des Partners"
            defaultPartnerOpen
            stats={
              <StatCards
                open={clientFees.length - clientDone}
                done={clientDone}
                unit="Zahlungen"
                value={stat}
                onChange={setStat}
              />
            }
            empty={
              <StepEmpty
                icon={a.docList}
                title="Keine Rechnungen vorhanden"
                lead="Sobald das Honorar zum ersten Mal verrechnet wird, erscheint die Rechnung hier."
              />
            }
          />
        </div>
      </section>
    </main>
  );
}
