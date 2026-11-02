import { useState } from "react";
import * as a from "../assets/index";
import { InvoiceInfoModal } from "../honorar/InvoiceInfoModal";
import { rechnungenCells, statusPillOf } from "../honorar/invoiceCells";
import { useHonorar } from "../honorar/store";
import { formatDay, money } from "../lib/honorar/format";
import { isOpenItemFee } from "../lib/honorar/queries";
import type { Fee, SingleInvoice } from "../types/honorar";
import { ContextMenu, Icon } from "../ui";
import { useWorkflow } from "../workflow";

function isSettled(fee: Fee, invoice?: SingleInvoice) {
  if (fee.settledVia || fee.paymentStatus === "paid") return true;
  if (invoice?.credit && fee.amount - fee.paid - invoice.credit <= 0) return true;
  return false;
}

function paymentLabel(fee: Fee, invoice?: SingleInvoice) {
  return isSettled(fee, invoice) ? "Bezahlt" : "Offen";
}

function yearOf(fee: Fee) {
  return fee.month.slice(0, 4);
}

/** Honorar is billed once a year: 01.01. through 31.12. of that year. */
function yearPeriod(year: string) {
  return `01.01.${year} – 31.12.${year}`;
}

/** One Forderung per calendar year (the honorar is yearly, not monthly). */
function yearlyFees(fees: Fee[], invoiceOf: (feeId: string) => SingleInvoice | undefined) {
  const byYear = new Map<string, Fee[]>();
  for (const fee of fees) {
    const year = yearOf(fee);
    const list = byYear.get(year) ?? [];
    list.push(fee);
    byYear.set(year, list);
  }
  return [...byYear.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, list]) => {
      return (
        list.find((fee) => isSettled(fee, invoiceOf(fee.id)) || invoiceOf(fee.id)) ??
        list[0]
      );
    });
}

/**
 * Inkasso Forderungen: one yearly invoice per row. Its menu opens "Info zur Rechnung" for this partner's invoice,
 * the same overlay as in the Honorarverrechnung; Gutschrift, Zahlungsziel and Berater are decided there.
 */
export function InkassoForderungenCard() {
  const { inkassoPartnerId, personName, finanzenProfileOpen } = useWorkflow();
  const { state } = useHonorar();
  const [infoFeeId, setInfoFeeId] = useState<string | null>(null);

  const relevant = state.fees.filter((fee) => {
    if (fee.hiddenOpen) return false;
    return (
      isOpenItemFee(state, fee) ||
      Boolean(fee.settledVia) ||
      state.singleInvoices.some((invoice) => invoice.feeId === fee.id)
    );
  });
  // The Forderungen of the partner whose file is open: the one passed in from the Honorarverrechnung, else the
  // Honorar partner with this file's name. Opened from Finanzen without a partner, the first open Forderung stands in.
  const ownPartnerId = state.partners.find((partner) => partner.name === personName)?.id;
  const partnerId =
    inkassoPartnerId ||
    ownPartnerId ||
    (finanzenProfileOpen ? relevant[0]?.partnerId || state.fees.find((fee) => isOpenItemFee(state, fee))?.partnerId : "") ||
    "";
  const invoiceOf = (feeId: string) => state.singleInvoices.find((invoice) => invoice.feeId === feeId);
  const fees = yearlyFees(
    relevant.filter((fee) => fee.partnerId === partnerId),
    invoiceOf,
  );

  return (
    <article className="pp-card" id="inkasso-forderungen">
      <header className="pp-card-head">
        <span className="pp-card-title">
          <Icon src={a.docList} size={22} />
          Inkasso Forderungen
        </span>
      </header>
      <div className="pp-card-body">
        {fees.length === 0 ? <span className="pp-caption">Keine Forderungen vorhanden.</span> : null}
        {fees.map((fee) => {
          const invoice = invoiceOf(fee.id);
          const year = yearOf(fee);
          const originalDue = invoice?.dueDateOriginal ?? fee.dueDate;
          const newDue = invoice?.dueDate && invoice.dueDate !== originalDue ? invoice.dueDate : undefined;
          const cells = rechnungenCells(state, fee);
          const pill = statusPillOf(cells, fee);
          const correction = cells.correction.lines[0] === "-" ? "" : cells.correction.lines.join(" ");
          return (
            <div className="pp-group" key={year}>
              <span className="ik-fee-head">
                <span className="pp-caption">Jahr {year}</span>
                <ContextMenu
                  label="Forderung"
                  items={[{ label: "Info zur Rechnung", icon: a.info, onSelect: () => setInfoFeeId(fee.id) }]}
                />
              </span>
              {/* Same status as in the Honorarverrechnung (Offene Posten / Einzelfaktura): what went wrong, and where the correction stands. */}
              {pill.tone === "fail" || pill.tone === "warn" ? (
                <span className={`hn-inv-pill hn-st-tone-${pill.tone} ik-status`}>{pill.text}</span>
              ) : null}
              {correction ? <p className="ik-step">{correction}</p> : null}
              <div className="pp-group-body">
                <div className="pp-row">
                  <span className="pp-label">Honorarmodell</span>
                  <span className="pp-val">{fee.tariff}</span>
                </div>
                <div className="pp-row">
                  <span className="pp-label">Betrag</span>
                  <span className="pp-val">{money(fee.amount)} €</span>
                </div>
                <div className="pp-row">
                  <span className="pp-label">Zahlung</span>
                  <span className="pp-val">{paymentLabel(fee, invoice)}</span>
                </div>
                <div className="pp-row">
                  <span className="pp-label">Zahlungsziel</span>
                  <span className="pp-val">{formatDay(originalDue)}</span>
                </div>
                <div className="pp-row">
                  <span className="pp-label">Leistungszeitraum</span>
                  <span className="pp-val">{yearPeriod(year)}</span>
                </div>
                {invoice?.credit ? (
                  <div className="pp-row ik-new">
                    <span className="pp-label">Gutschrift</span>
                    <span className="pp-val">{money(invoice.credit)} €</span>
                  </div>
                ) : null}
                {newDue ? (
                  <div className="pp-row ik-new">
                    <span className="pp-label">Neues Zahlungsziel</span>
                    <span className="pp-val">{formatDay(newDue)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {infoFeeId ? <InvoiceInfoModal feeId={infoFeeId} onClose={() => setInfoFeeId(null)} /> : null}
    </article>
  );
}
