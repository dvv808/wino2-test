import { useState } from "react";
import * as a from "../assets/index";
import { CreditModal } from "../honorar/SingleInvoicesPage";
import { useHonorar } from "../honorar/store";
import { setFocusFee } from "../honorar/focusFee";
import { formatDay, money } from "../lib/honorar/format";
import { isOpenItemFee, partnerOf } from "../lib/honorar/queries";
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

function draftInvoice(fee: Fee): SingleInvoice {
  return {
    id: "draft",
    correctionId: "",
    feeId: fee.id,
    partnerId: fee.partnerId,
    amount: fee.amount,
    kind: "Einzelfaktura/Gutschrift",
    status: "open",
    month: fee.month,
  };
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

/** Inkasso Forderungen: one yearly invoice, with Gutschrift / Zahlungsziel in the profile. */
export function InkassoForderungenCard() {
  const { inkassoPartnerId, openFinanzen } = useWorkflow();
  const { state, settleFeeViaInkasso, moveFeeToSingleInvoice } = useHonorar();
  const [adjust, setAdjust] = useState<{ feeId: string; withDueDate: boolean } | null>(null);

  const relevant = state.fees.filter((fee) => {
    if (fee.hiddenOpen) return false;
    return (
      isOpenItemFee(state, fee) ||
      Boolean(fee.settledVia) ||
      state.singleInvoices.some((invoice) => invoice.feeId === fee.id)
    );
  });
  const partnerId =
    inkassoPartnerId || relevant[0]?.partnerId || state.fees.find((fee) => isOpenItemFee(state, fee))?.partnerId || "";
  const invoiceOf = (feeId: string) => state.singleInvoices.find((invoice) => invoice.feeId === feeId);
  const fees = yearlyFees(
    relevant.filter((fee) => fee.partnerId === partnerId),
    invoiceOf,
  );
  const adjustingFee = adjust ? state.fees.find((fee) => fee.id === adjust.feeId) : undefined;
  const adjustingInvoice = adjustingFee ? invoiceOf(adjustingFee.id) ?? draftInvoice(adjustingFee) : undefined;
  const adjustingPartner = adjustingFee ? partnerOf(state, adjustingFee.partnerId) : undefined;

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
          return (
            <div className="pp-group" key={year}>
              <span className="ik-fee-head">
                <span className="pp-caption">Jahr {year}</span>
                <ContextMenu
                  label="Forderung bearbeiten"
                  items={[
                    { label: "Gutschrift erstellen", icon: a.docList, onSelect: () => setAdjust({ feeId: fee.id, withDueDate: false }) },
                    { label: "Zahlungsziel anpassen", icon: a.calendar, onSelect: () => setAdjust({ feeId: fee.id, withDueDate: true }) },
                    {
                      label: "In Inkasso Forderungen ansehen",
                      icon: a.openTab,
                      onSelect: () => {
                        moveFeeToSingleInvoice(fee.id);
                        setFocusFee(fee.id);
                        openFinanzen("singleInvoices");
                      },
                    },
                  ]}
                />
              </span>
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

      {adjust && adjustingInvoice ? (
        <CreditModal
          invoice={adjustingInvoice}
          fee={adjustingFee}
          partner={adjustingPartner}
          withDueDate={adjust.withDueDate}
          today={state.today}
          onCancel={() => setAdjust(null)}
          onConfirm={(amount, comment, dueDate) => {
            settleFeeViaInkasso(adjust.feeId, amount, comment, dueDate);
            setAdjust(null);
          }}
        />
      ) : null}
    </article>
  );
}
