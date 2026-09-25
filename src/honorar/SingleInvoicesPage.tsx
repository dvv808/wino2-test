import { useEffect, useMemo, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel, servicePeriod } from "../lib/honorar/format";
import { missingFields, partnerOf } from "../lib/honorar/queries";
import type { Fee, HistoryEntry, Partner, SingleInvoice } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { PartnerAvatar } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "due", label: "Fälligkeit", filter: true },
  { key: "method", label: "Zahlart / Leist.-zeitraum", filter: true },
  { key: "payment", label: "Status zur Zahlung", filter: true },
  { key: "amount", label: "Zu zahlender Honorarbetrag", filter: true },
  { key: "credit", label: "Gutschrift Einzelfaktura", filter: true },
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

function dueDay(monthId: string) {
  const month = monthId.split("-")[1] ?? "";
  return `01.${month}.`;
}

function openAmount(invoice: SingleInvoice, fee?: Fee) {
  return Math.max(0, (fee?.amount ?? invoice.amount) - (fee?.paid ?? 0));
}

function invoiceBalance(invoice: SingleInvoice, fee?: Fee) {
  if (invoice.credit == null) return 0;
  return Math.max(0, openAmount(invoice, fee) - invoice.credit);
}

function creditGrantMeta(invoice: SingleInvoice, history: HistoryEntry[]): GrantMeta | null {
  if (invoice.credit == null) return null;
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
  const { finanzenMonth } = useWorkflow();
  const { state, grantSingleCredit } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [creditId, setCreditId] = useState<string | null>(null);

  const openCount = state.singleInvoices.filter((invoice) => invoice.status === "open").length;
  const closedCount = state.singleInvoices.filter((invoice) => invoice.status === "sent_to_bmd").length;
  const rows = useMemo(() => {
    return state.singleInvoices
      .map((invoice) => {
        const fee = state.fees.find((entry) => entry.id === invoice.feeId);
        const partner = partnerOf(state, invoice.partnerId);
        const month = invoice.month ?? fee?.month ?? finanzenMonth;
        const grant = creditGrantMeta(invoice, state.history);
        const balance = invoiceBalance(invoice, fee);
        const unpaid = invoice.credit == null || balance > 0;
        const text: Record<ColumnKey, string> = {
          partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
          due: `${monthLabel(month)} ${dueDay(month)}`,
          method: `${fee?.paymentMethod ?? ""} ${servicePeriod(month)}`,
          payment: [
            unpaid ? "Rechnung nicht bezahlt" : "",
            grant ? "Gutschrift wurde gewährt" : "Einzelfaktura/Gutschrift",
          ]
            .filter(Boolean)
            .join(" "),
          amount: `${money(invoice.amount)} ${fee?.tariff ?? "Single"}`,
          credit: invoice.credit == null ? "" : `${money(invoice.credit)} ${fee?.tariff ?? "Single"}`,
          balance: `${money(balance)} ${fee?.tariff ?? "Single"}`,
          captured: grant
            ? `${capturedWhen(grant.at)} ${grant.by} ${grant.comment}`
            : fee
              ? `${capturedWhen(fee.createdAt)} ${fee.createdBy}`
              : "",
        };
        return { invoice, fee, partner, grant, text };
      })
      .filter((row) =>
        COLUMNS.every((column) => {
          const query = filters[column.key]?.trim().toLowerCase();
          return !query || row.text[column.key].toLowerCase().includes(query);
        }),
      );
  }, [filters, finanzenMonth, state]);
  const dueSum = rows.reduce((sum, row) => sum + row.invoice.amount, 0);
  const balanceSum = rows.reduce((sum, row) => sum + invoiceBalance(row.invoice, row.fee), 0);
  const creditInvoice = state.singleInvoices.find((invoice) => invoice.id === creditId);

  return (
    <section className="freigaben hn-panel hn-status">
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">{finanzenMonth.slice(0, 4)}</p>
      <h2 className="hn-h2 hn-status-title">Einzelfaktura / Gutschriften</h2>

      <div className="hn-stats">
        <article className="stat-card dark">
          <div className="stat-copy">
            <small>Offen</small>
            <strong>{String(openCount).padStart(2, "0")}</strong>
            <span>Zahlungen</span>
          </div>
          <span className="stat-icon">
            <Icon src={a.onhold} size={16} />
          </span>
        </article>
        <article className="stat-card">
          <div className="stat-copy">
            <small>Abgeschl.</small>
            <strong>{String(closedCount).padStart(2, "0")}</strong>
            <span>Zahlungen</span>
          </div>
          <span className="stat-icon">
            <Icon src={a.confirm} size={16} />
          </span>
        </article>
      </div>

      <div className="hn-status-tools">
        <button type="button" className="hn-drop">
          Daten importieren
          <Icon src={a.chevronDown} size={18} />
        </button>
      </div>

      <div className="hn-status-table single" role="table" aria-label="Einzelfaktura / Gutschriften">
        <div className="hn-st-head" role="row">
          {COLUMNS.map((column) => (
            <div className="hn-st-th" role="columnheader" key={column.key}>
              <span className="hn-st-label">
                {column.label}
                {column.filter ? <img src={a.colFilter} alt="" width={34} height={34} /> : null}
              </span>
              <input
                className="col-input"
                aria-label={`${column.label} filtern`}
                value={filters[column.key] ?? ""}
                onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="hn-st-sum" role="row">
          <div className="hn-st-sum-label">Alle Honorare</div>
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

        {rows.map(({ invoice, fee, partner, grant }, index) => (
          <InvoiceRow
            key={invoice.id}
            invoice={invoice}
            fee={fee}
            partner={partner}
            grant={grant}
            lead={index === 0}
            onCredit={() => setCreditId(invoice.id)}
          />
        ))}
      </div>

      {creditInvoice ? (
        <CreditModal
          invoice={creditInvoice}
          fee={state.fees.find((entry) => entry.id === creditInvoice.feeId)}
          partner={partnerOf(state, creditInvoice.partnerId)}
          onCancel={() => setCreditId(null)}
          onConfirm={(amount, comment) => {
            grantSingleCredit(creditInvoice.id, amount, comment);
            setCreditId(null);
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
  lead,
  onCredit,
}: {
  invoice: SingleInvoice;
  fee?: Fee;
  partner?: Partner;
  grant: GrantMeta | null;
  lead?: boolean;
  onCredit: () => void;
}) {
  const month = invoice.month ?? fee?.month ?? "";
  const locked = fee ? missingFields(fee, partner).length > 0 : false;
  const balance = invoiceBalance(invoice, fee);
  const showUnpaid = invoice.credit == null || balance > 0;
  const moneyClass =
    invoice.credit != null && balance === 0 ? "hn-st-money settled" : "hn-st-money due";

  return (
    <div className="hn-st-row" role="row">
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
      <div className="hn-st-stack">
        <span>{monthLabel(month)}</span>
        <span>{dueDay(month)}</span>
      </div>
      <div className="hn-st-stack">
        <span>{fee?.paymentMethod}</span>
        <span>{servicePeriod(month)}</span>
      </div>
      <div className="hn-st-note">
        {showUnpaid ? (
          <span className="hn-st-unpaid">
            <img src={a.hnAttention} alt="" width={16.5} height={15.4688} />
            <span>Rechnung nicht bezahlt</span>
          </span>
        ) : null}
        {grant ? (
          <div className="hn-credit-granted">
            <span className="hn-credit-granted-label">
              <img src={a.hnCarrierCheck} alt="" width={16} height={16} />
              Gutschrift wurde gewährt
            </span>
            <button type="button" className="hn-link" onClick={onCredit}>
              Ansehen
            </button>
          </div>
        ) : (
          <button type="button" className="hn-credit-btn" onClick={onCredit}>
            <img src={a.hnCopyLight} alt="" width={14} height={14} />
            Einzelfaktura/Gutschrift
          </button>
        )}
      </div>
      <div className="hn-st-money">
        <strong>{money(invoice.amount)}</strong>
        <small>{fee?.tariff ?? "Single"}</small>
      </div>
      <div className="hn-st-money">
        {invoice.credit == null ? null : (
          <>
            <strong>{money(invoice.credit)}</strong>
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
        <button type="button" className="hn-st-menu" aria-label="Aktionen">
          <Icon src={a.contextMenu} size={24} />
        </button>
      </div>
    </div>
  );
}

function CreditModal({
  invoice,
  fee,
  partner,
  onCancel,
  onConfirm,
}: {
  invoice: SingleInvoice;
  fee?: Fee;
  partner?: Partner;
  onCancel: () => void;
  onConfirm: (amount: number, comment: string) => void;
}) {
  const month = invoice.month ?? fee?.month ?? "";
  const open = openAmount(invoice, fee);
  const [amount, setAmount] = useState(money(invoice.credit ?? open));
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
    onConfirm(Math.min(parsed, open), comment.trim());
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
                <em>{dueDay(month)}</em>
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
          <button type="button" className="btn-primary" onClick={finish}>
            Abschließen
          </button>
        </footer>
      </div>
    </div>
  );
}
