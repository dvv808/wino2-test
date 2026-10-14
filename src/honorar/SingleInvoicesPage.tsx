import { useEffect, useMemo, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel, servicePeriod } from "../lib/honorar/format";
import { missingFields, partnerOf } from "../lib/honorar/queries";
import type { Fee, HistoryEntry, HonorarState, Partner, SingleInvoice } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { ColumnFilter, filterInputProps, matchesFilter } from "./ColumnFilter";
import { useHonorar } from "./store";
import { clearPendingCredit, peekPendingCredit } from "./pendingCredit";
import { INVOICE_FILE, InvoiceModal } from "./InvoiceModal";
import { clearFocusFee, peekFocusFee, setFocusFee } from "./focusFee";
import { PartnerAvatar, ProfileDueMenu, StatCards, StepEmpty, type StatFilter } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "payment", label: "Status zur Zahlung", filter: true },
  { key: "reminder", label: "Zahlungserinnerung", filter: true },
  { key: "due", label: "Fälligkeit", filter: true },
  { key: "method", label: "Zahlart / Leist.-zeitraum", filter: true },
  { key: "invoice", label: "Original-Rechnung", filter: true },
  { key: "amount", label: "Zu zahlender Honorarbetrag", filter: true },
  { key: "credit", label: "Gutschrift zu Einzelfaktura", filter: true },
  { key: "balance", label: "Total Saldo Honorarbetrag", filter: true },
  { key: "captured", label: "Erfasst Begründung", filter: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

type GrantMeta = { at: string; by: string; comment: string };

function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

function capturedWhen(iso: string) {
  if (!iso) return "";
  const formatted = formatDate(iso);
  const [day, time] = formatted.split(" ");
  return time ? `${day} - ${time}` : formatted;
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

function hasCredit(invoice: SingleInvoice) {
  return (invoice.credit ?? 0) > 0;
}

type ReminderInfo = { sent: boolean; at?: string };

function reminderOf(fee: Fee | undefined, state: HonorarState): ReminderInfo {
  if (!fee) return { sent: false };
  const at = fee.reminderSentAt ?? state.openItems.find((item) => item.feeId === fee.id)?.reminderSentAt;
  if (at) return { sent: true, at };
  return { sent: fee.paidLate === "reminder" };
}

function creditGrantMeta(invoice: SingleInvoice, history: HistoryEntry[]): GrantMeta | null {
  if (invoice.credit == null && !invoice.grantedAt) return null;
  if (invoice.grantedAt && invoice.grantedBy) {
    return { at: invoice.grantedAt, by: invoice.grantedBy, comment: invoice.comment ?? "" };
  }
  const entry = [...history]
    .reverse()
    .find(
      (item) =>
        item.refType === "singleInvoice" && item.refId === invoice.id && item.action === "Gutschrift gewährt",
    );
  return {
    at: invoice.grantedAt ?? entry?.timestamp ?? "",
    by: invoice.grantedBy ?? entry?.user ?? "",
    comment: invoice.comment ?? entry?.comment ?? "",
  };
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function SingleInvoicesPage() {
  const { finanzenMonth, openFinanzen } = useWorkflow();
  const { state, grantSingleCredit } = useHonorar();
  const [invoiceFeeId, setInvoiceFeeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [creditId, setCreditId] = useState<string | null>(null);
  const [withDueDate, setWithDueDate] = useState(false);
  const [stat, setStat] = useState<StatFilter>(null);
  const [askCarrier, setAskCarrier] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(() => peekFocusFee());

  useEffect(() => {
    if (!focusId) return;
    const frame = window.requestAnimationFrame(() =>
      document.querySelector(".hn-st-row.focus")?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
    const timer = window.setTimeout(() => {
      clearFocusFee();
      setFocusId(null);
    }, 6000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [focusId]);

  // Coming from Offene Posten ("Zahlungsziel ändern"): open the credit overlay with the date field.
  useEffect(() => {
    const pending = peekPendingCredit();
    if (!pending) return;
    const invoice = state.singleInvoices.find((entry) => entry.feeId === pending.feeId);
    if (!invoice) return;
    clearPendingCredit();
    setWithDueDate(pending.withDueDate);
    setCreditId(invoice.id);
  }, [state.singleInvoices]);

  const feeOf = (invoice: SingleInvoice) => state.fees.find((entry) => entry.id === invoice.feeId);
  const closedCount = state.singleInvoices.filter((invoice) => isPaid(invoice, feeOf(invoice))).length;
  const openCount = state.singleInvoices.length - closedCount;
  const creditCount = state.singleInvoices.filter(hasCredit).length;
  const dueCount = state.singleInvoices.filter((invoice) => Boolean(invoice.dueDate)).length;
  const baseRows = useMemo(() => {
    return state.singleInvoices
      .filter((invoice) => {
        if (stat === null) return true;
        if (stat === "credit") return hasCredit(invoice);
        if (stat === "due") return Boolean(invoice.dueDate);
        return (stat === "done") === isPaid(invoice, feeOf(invoice));
      })
      .map((invoice) => {
        const fee = state.fees.find((entry) => entry.id === invoice.feeId);
        const partner = partnerOf(state, invoice.partnerId);
        const month = invoice.month ?? fee?.month ?? finanzenMonth;
        const grant = creditGrantMeta(invoice, state.history);
        const balance = invoiceBalance(invoice, fee);
        const unpaid = balance > 0;
        const reminder = reminderOf(fee, state);
        const text: Record<ColumnKey, string> = {
          partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
          due: `${monthLabel(month)} ${dueDay(month, invoice)}`,
          method: `${fee?.paymentMethod ?? ""} ${servicePeriod(month)}`,
          payment: [
            hasCredit(invoice) ? `Gutschrift gewährt (${money(invoice.credit ?? 0)} €)` : "",
            invoice.dueDate ? `Neues Zahlungsziel ${dueDay(month, invoice)}` : "",
            grant ? "" : "Einzelfaktura/Gutschrift",
            unpaid ? "Rechnung nicht bezahlt" : "Bezahlt Abgeschlossen",
          ]
            .filter(Boolean)
            .join(" "),
          reminder: reminder.sent
            ? `Zahlungserinnerung versendet ${reminder.at ? formatDate(reminder.at) : ""}`
            : "Keine Erinnerung",
          invoice: fee ? INVOICE_FILE : "",
          amount: `${money(invoice.amount)} ${fee?.tariff ?? "Single"}`,
          credit: !hasCredit(invoice) ? "" : `${money(invoice.credit ?? 0)} ${fee?.tariff ?? "Single"}`,
          balance: `${money(balance)} ${fee?.tariff ?? "Single"}`,
          captured: grant
            ? `${capturedWhen(grant.at)} ${grant.by} ${grant.comment}`
            : fee
              ? `${capturedWhen(fee.createdAt)} ${fee.createdBy}`
              : "",
        };
        return { invoice, fee, partner, grant, reminder, text };
      });
  }, [finanzenMonth, state, stat]);
  const rows = useMemo(
    () => baseRows.filter((row) => COLUMNS.every((column) => matchesFilter(filters[column.key], row.text[column.key]))),
    [baseRows, filters],
  );
  const dueSum = rows.reduce((sum, row) => sum + row.invoice.amount, 0);
  const balanceSum = rows.reduce((sum, row) => sum + invoiceBalance(row.invoice, row.fee), 0);
  const creditInvoice = state.singleInvoices.find((invoice) => invoice.id === creditId);
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
        extra={[
          { kind: "credit", label: "Gutschriften", count: creditCount, icon: a.docList },
          { kind: "due", label: "Neues Zahlungsziel", count: dueCount, icon: a.calendar },
        ]}
        value={stat}
        onChange={setStat}
      />

      <div className="hn-status-tools">
        <button type="button" className="hn-drop">
          Daten importieren
          <Icon src={a.chevronDown} size={18} />
        </button>
      </div>

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

      <div className="hn-status-table single" role="table" aria-label="Einzelfaktura">
        <div className="hn-st-head" role="row">
          {COLUMNS.map((column) => (
            <div className="hn-st-th" role="columnheader" key={column.key}>
              <span className="hn-st-label">
                {column.label}
                {column.filter ? <ColumnFilter
                    label={column.label}
                    value={filters[column.key] ?? ""}
                    samples={baseRows.map((row) => row.text[column.key])}
                    onChange={(next) => setFilters((current) => ({ ...current, [column.key]: next }))}
                  /> : null}
              </span>
              <input
                className="col-input"
                aria-label={`${column.label} filtern`}
                {...filterInputProps(filters[column.key], (next) => setFilters((current) => ({ ...current, [column.key]: next })))}
              />
            </div>
          ))}
        </div>

        {rows.length === 0 ? null : (
          <div className="hn-st-sum" role="row">
            <div className="hn-st-sum-label">Alle Honorare</div>
            <div />
            <div />
            <div />
            <div />
            <div />
            <div className="hn-st-total">
              <strong>{money(dueSum)}</strong>
              <small>Summe Total</small>
            </div>
            <div />
            <div className="hn-st-total">
              <strong>{money(balanceSum)}</strong>
              <small>Summe Total</small>
            </div>
            <div />
          </div>
        )}

        {rows.length === 0 ? (
          <StepEmpty
            icon={a.docList}
            title="Keine Einzelfaktura vorhanden"
            lead="Sobald bei Offene Posten oder einer Faktura etwas angepasst wird (Gutschrift, neues Zahlungsziel), erscheint der Eintrag hier und ist bereit, als Datenträger heruntergeladen und in BMD hochgeladen zu werden."
          />
        ) : (
          rows.map(({ invoice, fee, partner, grant, reminder }, index) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              fee={fee}
              partner={partner}
              grant={grant}
              reminder={reminder}
              lead={index === 0}
              focused={Boolean(fee && fee.id === focusId)}
              onCredit={() => setCreditId(invoice.id)}
              onReminder={() => {
                if (!fee) return;
                setFocusFee(fee.id);
                openFinanzen("month", fee.month, "reminders");
              }}
              onDocument={() => fee && setInvoiceFeeId(fee.id)}
            />
          ))
        )}
      </div>

      {invoiceFeeId
        ? (() => {
            const fee = state.fees.find((entry) => entry.id === invoiceFeeId);
            if (!fee) return null;
            return (
              <InvoiceModal
                fee={fee}
                partner={partnerOf(state, fee.partnerId)}
                today={state.today}
                onClose={() => setInvoiceFeeId(null)}
              />
            );
          })()
        : null}

      {creditInvoice ? (
        <CreditModal
          invoice={creditInvoice}
          fee={state.fees.find((entry) => entry.id === creditInvoice.feeId)}
          partner={partnerOf(state, creditInvoice.partnerId)}
          withDueDate={withDueDate}
          today={state.today}
          onCancel={() => {
            setCreditId(null);
            setWithDueDate(false);
          }}
          onConfirm={(amount, comment, dueDate) => {
            grantSingleCredit(creditInvoice.id, amount, comment, dueDate);
            setCreditId(null);
            setWithDueDate(false);
          }}
        />
      ) : null}
    </section>
  );
}

function InvoiceRow({
  invoice,
  fee,
  partner,
  grant,
  reminder,
  lead,
  focused,
  onCredit,
  onReminder,
  onDocument,
}: {
  invoice: SingleInvoice;
  fee?: Fee;
  partner?: Partner;
  grant: GrantMeta | null;
  reminder: ReminderInfo;
  lead?: boolean;
  focused?: boolean;
  onCredit: () => void;
  onReminder: () => void;
  onDocument: () => void;
}) {
  const month = invoice.month ?? fee?.month ?? "";
  const locked = fee ? missingFields(fee, partner).length > 0 : false;
  const balance = invoiceBalance(invoice, fee);
  const showUnpaid = balance > 0;
  const credited = hasCredit(invoice);
  const moneyClass =
    invoice.credit != null && balance === 0 ? "hn-st-money settled" : "hn-st-money due";

  return (
    <div className={focused ? "hn-st-row focus" : "hn-st-row"} role="row">
      <div className={lead ? "hn-st-partner hn-st-lead" : "hn-st-partner"}>
        <span className="partner-avatar">
          <PartnerAvatar company={partner?.type === "company"} />
          {partner?.type === "company" ? <img className="winter" src={a.winterMark} alt="" /> : null}
        </span>
        <span className="partner-copy">
          <strong>
            {partner?.name}
            {locked ? <img className="hn-lock" src={a.hnLock} alt="" width={16} height={16} /> : null}
          </strong>
          {partner ? <small>{partnerMeta(partner)}</small> : null}
        </span>
        <img className="hn-st-open" src={a.openTab} alt="" width={16} height={16} />
      </div>
      <div className="hn-st-note">
        {credited ? (
          <div className="hn-credit-granted">
            <span className="hn-credit-granted-label">
              Gutschrift gewährt ({money(invoice.credit ?? 0)} €)
            </span>
            <button type="button" className="hn-link" onClick={onCredit}>
              Ansehen
            </button>
          </div>
        ) : null}
        {invoice.dueDate ? (
          <div className="hn-credit-granted">
            <span className="hn-credit-granted-label">Neues Zahlungsziel: {dueDay(month, invoice)}</span>
            {invoice.dueDateOriginal ? (
              <small className="hn-st-prev">Vorher {dueDay(month, { dueDate: invoice.dueDateOriginal } as SingleInvoice)}</small>
            ) : null}
            {credited ? null : (
              <button type="button" className="hn-link" onClick={onCredit}>
                Ansehen
              </button>
            )}
          </div>
        ) : null}
        {showUnpaid ? (
          <span className="hn-st-unpaid">
            <img src={a.hnAttention} alt="" width={16.5} height={15.4688} />
            <span>Rechnung nicht bezahlt</span>
          </span>
        ) : (
          <span className="hn-st-unpaid">
            <img src={a.confirm} alt="" width={16} height={16} />
            <span>Bezahlt</span>
          </span>
        )}
        {grant ? null : (
          <button type="button" className="hn-credit-btn" onClick={onCredit}>
            <img src={a.hnCopyLight} alt="" width={14} height={14} />
            Einzelfaktura/Gutschrift
          </button>
        )}
      </div>
      <div
        className={!reminder.sent && showUnpaid && fee ? "hn-st-note rem link" : "hn-st-note rem"}
        {...(!reminder.sent && showUnpaid && fee
          ? { role: "button", tabIndex: 0, title: "Zu Zahlungserinnerungen", onClick: onReminder }
          : {})}
      >
        <Icon src={reminder.sent ? a.confirm : a.onhold} size={16} />
        <span>{reminder.sent ? "Zahlungserinnerung versendet" : "Keine Erinnerung"}</span>
        {reminder.sent && reminder.at ? <small>{formatDate(reminder.at)}</small> : null}
      </div>
      <div className="hn-st-stack">
        <span>{monthLabel(month)}</span>
        <span>{dueDay(month, invoice)}</span>
      </div>
      <div className="hn-st-stack">
        <span>{fee?.paymentMethod}</span>
        <span>{servicePeriod(month)}</span>
      </div>
      <div className="hn-st-captured">
        {fee ? (
          <button type="button" className="hn-doc-link" onClick={onDocument}>
            <img src={a.pdf} alt="" width={12} height={14} />
            <span>{INVOICE_FILE}</span>
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="hn-st-money">
        <strong>{money(invoice.amount)}</strong>
        <small>{fee?.tariff ?? "Single"}</small>
      </div>
      <div className="hn-st-money">
        {!credited ? null : (
          <>
            <strong>{money(invoice.credit ?? 0)}</strong>
            <small>{fee?.tariff ?? "Single"}</small>
          </>
        )}
      </div>
      <div className={moneyClass}>
        <strong>{money(balance)}</strong>
        <small>{fee?.tariff ?? "Single"}</small>
      </div>
      <div className="hn-st-captured">
        {grant ? (
          <button type="button" className="hn-st-grant-meta" onClick={onCredit}>
            {capturedWhen(grant.at)}
            <small>{grant.by}</small>
            {grant.comment ? <small className="hn-st-grant-comment">{grant.comment}</small> : null}
          </button>
        ) : fee ? (
          <span>
            {capturedWhen(fee.createdAt)}
            <small>{fee.createdBy}</small>
          </span>
        ) : (
          <span />
        )}
        <ProfileDueMenu />
      </div>
    </div>
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
