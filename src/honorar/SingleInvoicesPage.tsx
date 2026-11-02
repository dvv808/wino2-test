import { useEffect, useState } from "react";
import * as a from "../assets/index";
import { monthLabel, servicePeriod } from "../lib/honorar/format";
import { partnerOf } from "../lib/honorar/queries";
import type { Fee, Partner, SingleInvoice } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { StatusTable } from "./StatusStep";
import { PartnerAvatar, StatCards, StepEmpty, type StatFilter } from "./ui";

function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function partnerMeta(partner: Partner) {
  return [partner.birthDate, partner.nickname ? `(vulgo ${partner.nickname})` : ""].filter(Boolean).join(" ");
}

function dueDay(monthId: string, invoice?: SingleInvoice) {
  if (invoice?.dueDate) {
    const [year, month, day] = invoice.dueDate.split("-");
    return `${day}.${month}.${year}`;
  }
  const month = monthId.split("-")[1] ?? "";
  return `01.${month}.`;
}

function openAmount(invoice: SingleInvoice, fee?: Fee) {
  return Math.max(0, (fee?.amount ?? invoice.amount) - (fee?.paid ?? 0));
}

function invoiceBalance(invoice: SingleInvoice, fee?: Fee) {
  return Math.max(0, openAmount(invoice, fee) - (invoice.credit ?? 0));
}

/** Paid means closed: nothing is left after payments and credit. */
function isPaid(invoice: SingleInvoice, fee?: Fee) {
  return invoiceBalance(invoice, fee) === 0;
}

/**
 * Einzelfaktura: the same table as Sammelfaktura (Status zu Rechnungen), filtered to the invoices that have an
 * Einzelfaktura. Credits and new Zahlungsziele are decided in "Info zur Rechnung" (3-dots menu of the row).
 */
export function SingleInvoicesPage() {
  const { finanzenMonth } = useWorkflow();
  const { state } = useHonorar();
  const [stat, setStat] = useState<StatFilter>(null);
  const [askCarrier, setAskCarrier] = useState(false);

  const invoiceOf = (fee: Fee) => state.singleInvoices.find((invoice) => invoice.feeId === fee.id);
  // Einzelfaktura lists every invoice that has a running or booked workflow, or an Einzelfaktura of its own.
  // A workflow is done once the Honorarverwalter booked it; without a workflow, an invoice is done when nothing is left to pay.
  const isDone = (fee: Fee) => {
    if (fee.correction) return fee.correction.status === "verbucht";
    const invoice = invoiceOf(fee);
    return invoice ? isPaid(invoice, fee) : false;
  };
  const entries = state.fees.filter((fee) => fee.correction || invoiceOf(fee));
  const closedCount = entries.filter(isDone).length;
  const openCount = entries.length - closedCount;
  const fees = entries.filter((fee) => stat === null || (stat === "done") === isDone(fee));
  const carrierCount = state.singleInvoices.length;

  /** Creates both files BMD needs: the customer data and the booking record of the Einzelfaktura. */
  function createCarriers() {
    const stamp = new Date().toISOString().slice(0, 10);
    const lines = state.singleInvoices.map((invoice) => {
      const fee = state.fees.find((entry) => entry.id === invoice.feeId);
      const partner = fee ? partnerOf(state, fee.partnerId) : undefined;
      const credit = invoice.credit !== undefined ? ` gutschrift="${invoice.credit.toFixed(2)}"` : "";
      return `  <Einzelfaktura partner="${partner?.name ?? invoice.feeId}" betrag="${invoice.amount.toFixed(2)}"${credit}/>`;
    });
    [
      { file: `Kundendatentraeger_Einzelfaktura_${stamp}.xml`, tag: "Kundendatentraeger" },
      { file: `Buchungsdatensatz_Einzelfaktura_${stamp}.xml`, tag: "Buchungsdatensatz" },
    ].forEach(({ file, tag }) => {
      const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n<${tag}>\n${lines.join("\n")}\n</${tag}>\n`], {
        type: "application/xml",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file;
      link.click();
      URL.revokeObjectURL(url);
    });
    setAskCarrier(false);
  }

  return (
    <section className="freigaben hn-panel hn-status">
      <button
        type="button"
        className="btn-primary hn-single-carrier"
        disabled={carrierCount === 0}
        onClick={() => setAskCarrier(true)}
      >
        Datenträger erzeugen
      </button>
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">{finanzenMonth.slice(0, 4)}</p>
      <h2 className="hn-h2 hn-status-title">Einzelfaktura</h2>

      <StatCards
        open={openCount}
        done={closedCount}
        unit="Zahlungen"
        value={stat}
        onChange={setStat}
      />

      {askCarrier ? (
        <div className="wmodal" role="dialog" aria-label="Datenträger erzeugen?">
          <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={() => setAskCarrier(false)} />
          <div className="wmodal-body carrier-ask">
            <button type="button" className="wmodal-close" aria-label="Schließen" onClick={() => setAskCarrier(false)}>
              <img src={a.iconCloseDark} alt="" width={16} height={16} />
            </button>
            <h2>Datenträger erzeugen?</h2>
            <p>
              Es {carrierCount === 1 ? "wird 1 Einzelfaktura" : `werden ${carrierCount} Einzelfakturen`} verarbeitet.
              Du erhältst zwei Dateien: den Kundendatenträger (Kundendaten) und den Buchungsdatensatz.
            </p>
            <footer className="wmodal-foot carrier-ask">
              <button type="button" className="btn-secondary" onClick={() => setAskCarrier(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn-primary" onClick={createCarriers}>
                Erzeugen
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      <StatusTable
        fees={fees}
        label="Einzelfaktura"
        tools={() => (
          <div className="hn-status-tools">
            <button type="button" className="hn-drop">
              Daten importieren
              <Icon src={a.chevronDown} size={18} />
            </button>
          </div>
        )}
        empty={
          <StepEmpty
            icon={a.docList}
            title="Keine Einzelfaktura vorhanden"
            lead="Sobald bei Offene Posten oder einer Faktura etwas angepasst wird (Gutschrift, neues Zahlungsziel), erscheint der Eintrag hier und ist bereit, als Datenträger heruntergeladen und in BMD hochgeladen zu werden."
          />
        }
      />
    </section>
  );
}

export function CreditModal({
  invoice,
  fee,
  partner,
  withDueDate,
  today,
  onCancel,
  onConfirm,
}: {
  today: string;
  invoice: SingleInvoice;
  fee?: Fee;
  partner?: Partner;
  withDueDate?: boolean;
  onCancel: () => void;
  onConfirm: (amount: number, comment: string, dueDate?: string) => void;
}) {
  const month = invoice.month ?? fee?.month ?? "";
  const open = openAmount(invoice, fee);
  const [amount, setAmount] = useState(money(invoice.credit ?? (withDueDate ? 0 : open)));
  const originalDue = invoice.dueDateOriginal ?? fee?.dueDate ?? "";
  const [dueDate, setDueDate] = useState(invoice.dueDate ?? fee?.dueDate ?? "");
  const [comment, setComment] = useState(invoice.comment ?? "");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function finish() {
    const parsed = parseMoney(amount);
    if (parsed == null) return;
    const changed = dueDate && dueDate !== (invoice.dueDate ?? fee?.dueDate);
    if (!(parsed > 0) && !changed) return;
    onConfirm(Math.min(parsed, open), comment.trim(), changed ? dueDate : undefined);
  }

  return (
    <div className="wmodal" role="dialog" aria-labelledby="hn-credit-title">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="hn-credit-modal">
        <header className="review-titlebar">
          <span className="review-titlebar-label">
            <Icon src={a.hnRefresh} size={16} />
            Einzelfaktura / Gutschrift erstellen
          </span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onCancel}>
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>
        <div className="hn-credit-scroll">
          <div className="hn-credit-heading">
            <span className="hn-credit-tile">
              <img src={a.hnRefresh} alt="" width={24} height={24} />
            </span>
            <h2 id="hn-credit-title">Einzelfaktura / Gutschrift erstellen</h2>
          </div>
          <article className="hn-credit-card">
            <div className="hn-credit-who">
              <span className="partner-avatar">
                <PartnerAvatar company={partner?.type === "company"} />
                {partner?.type === "company" ? <img className="winter" src={a.winterMark} alt="" /> : null}
              </span>
              <span className="partner-copy">
                <strong>{partner?.name}</strong>
                {partner ? <small>{partnerMeta(partner)}</small> : null}
              </span>
              <img src={a.openTab} alt="" width={16} height={16} />
            </div>
            <div className="hn-credit-meta">
              <span>
                <small>Fälligkeit</small>
                <em>{monthLabel(month)}</em>
                <em>{dueDay(month, invoice)}</em>
              </span>
              <span>
                <small>Zahlart / Leist.-zeitraum</small>
                <em>{fee?.paymentMethod}</em>
                <em>{servicePeriod(month)}</em>
              </span>
              <span>
                <small>Honorarmodell</small>
                <em>{fee?.tariff ?? "Single"}</em>
              </span>
            </div>
            <div className="hn-credit-rule" />
            <div className="hn-credit-sums">
              <span>
                <small>Zu zahlendes Honorar</small>
                <em>{money(invoice.amount)}</em>
              </span>
              <span className="paid">
                <small>Bezahlt</small>
                <em>{money(fee?.paid ?? 0)}</em>
              </span>
              <span className="open">
                <small>Offener Betrag</small>
                <em>{money(open)}</em>
              </span>
            </div>
          </article>
          <h3>Gutschrift gewähren</h3>
          <div className="hn-credit-amount">
            <input
              aria-label="Gutschrift"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <strong>Gutschrift</strong>
            <small>Betrag in €</small>
          </div>
          <label className="hn-credit-due">
            Zahlungsziel
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            {originalDue ? (
              <small className="hn-credit-due-info">
                {originalDue < today ? "War fällig am " : "Ist fällig am "}
                <strong>{dueDay(month, { dueDate: originalDue } as SingleInvoice)}</strong>
                {originalDue < today ? " (überfällig)" : ""}
              </small>
            ) : null}
          </label>
          <label className="hn-credit-comment">
            Kommentar
            <textarea
              placeholder="Begründung oder Hinweis hinzufügen..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
        </div>
        <footer className="hn-credit-foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={finish}
            disabled={
              !((parseMoney(amount) ?? 0) > 0) && !(dueDate && dueDate !== (invoice.dueDate ?? fee?.dueDate))
            }
          >
            Abschließen
          </button>
        </footer>
      </div>
    </div>
  );
}
