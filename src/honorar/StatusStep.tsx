import { useMemo, useState } from "react";
import * as a from "../assets/index";
import { formatDate, formatDay, monthLabel, servicePeriod } from "../lib/honorar/format";
import { feesOfMonth, missingFields, partnerOf, totals } from "../lib/honorar/queries";
import type { Fee, Partner } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { ColumnFilter, filterInputProps, matchesFilter } from "./ColumnFilter";
import { useHonorar } from "./store";
import { PartnerAvatar, ProfileDueMenu, StatCards, StepEmpty, type StatFilter } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "invoice", label: "Status zur Rechnung", filter: true },
  { key: "payment", label: "Status zur Zahlung", filter: true },
  { key: "method", label: "Zahlart", filter: true },
  { key: "period", label: "Leistungszeitraum", filter: true },
  { key: "due", label: "Zu zahlender Honorarbetrag", filter: true },
  { key: "paid", label: "Bezahlter Honorarbetrag", filter: true },
  { key: "captured", label: "Erfasst", filter: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

function invoiceLine(fee: Fee) {
  if (fee.invoiceStatus === "not_created") return "Rechnung von BMD noch nicht erstellt";
  if (fee.invoiceStatus === "created") return "Rechnung erstellt, wartet auf Versand";
  if (fee.invoiceStatus === "send_failed") return "Mail nicht empfangen";
  return fee.sentAt ? `Rechnung versendet am ${formatDay(fee.sentAt)}` : "Rechnung versendet";
}

export type PaymentInfo = { main: string; notes: string[]; credit?: string; tone: "open" | "paid" | "fail" };

export function paymentInfo(fee: Fee, credit: number | undefined): PaymentInfo {
  if (fee.invoiceStatus === "not_created" || fee.invoiceStatus === "created") {
    return { main: "Rechnung noch nicht versendet", notes: [], tone: "open" };
  }
  const notes: string[] = [];
  let main: string;
  let tone: PaymentInfo["tone"] = "open";
  if (fee.paymentStatus === "paid") {
    main = "Bezahlt";
    tone = "paid";
    if (fee.paidLate === "reminder") notes.push("Bezahlt nach Zahlungserinnerung");
    if (fee.paidLate === "two_months") notes.push("Bezahlt erst nach 2 Monaten");
  } else if (fee.paymentMethod === "Abbucher" && fee.paid === 0) {
    // A direct debit either goes through or it does not, so only an unpaid fee can show "Abbucher".
    if (fee.paymentStatus === "open_before_due") {
      main = "Abbucher ausstehend";
    } else {
      main = "Abbucher fehlgeschlagen";
      notes.push("Bitte Bankdaten prüfen");
      tone = "fail";
    }
  } else if (fee.paymentStatus === "open_before_due") {
    main = "Offen vor Zahlungsziel";
  } else {
    // "Offen nach Zahlungsziel" means a reminder is already out; before that the due date is just exceeded.
    if (fee.paid > 0 && fee.paid < fee.amount) main = "Zu wenig bezahlt";
    else main = fee.reminderSentAt ? "Offen nach Zahlungsziel" : "Zahlungsziel überschritten";
    notes.push("Siehe Offene Posten");
  }
  if (fee.reminderSentAt) notes.push(`Zahlungserinnerung versendet am ${formatDay(fee.reminderSentAt)}`);
  const creditLine = credit === undefined ? undefined : `Gutschrift gewährt (${money(credit)} €)`;
  return { main, notes, credit: creditLine, tone };
}

export function paymentLine(fee: Fee, credit: number | undefined) {
  const info = paymentInfo(fee, credit);
  return [info.main, ...info.notes, info.credit ?? ""].join(" ");
}

/** Payment status cell shared by Status zu Rechnungen and Offene Posten. */
export function PaymentCell({ fee, credit, compact = false }: { fee: Fee; credit: number | undefined; compact?: boolean }) {
  const info = paymentInfo(fee, credit);
  const { openPartnerBank } = useWorkflow();
  // Offene Posten has its own reminder column and is itself the "Siehe Offene Posten" target.
  const notes = compact
    ? info.notes.filter((note) => note !== "Siehe Offene Posten" && !note.startsWith("Zahlungserinnerung versendet"))
    : info.notes;
  return (
    <div className={info.tone === "fail" ? "hn-st-note fail" : "hn-st-note"}>
      {info.tone === "fail" ? (
        <img src={a.hnAttention} alt="" width={16.5} height={15.4688} />
      ) : (
        <Icon src={info.tone === "paid" ? a.confirm : a.onhold} size={16} />
      )}
      <span className="hn-st-fail-copy">
        {info.tone === "fail" ? <strong>{info.main}</strong> : info.main}
        {notes.map((note) => (
          <small key={note}>
            {note === "Bitte Bankdaten prüfen" ? (
              <button type="button" onClick={() => openPartnerBank()}>
                {note}
              </button>
            ) : (
              note
            )}
          </small>
        ))}
        {info.credit ? <small className="hn-st-credit">{info.credit}</small> : null}
      </span>
      {info.tone === "paid" && fee.paidLate ? (
        <img className="hn-st-info" src={a.infoFull} alt="" width={16} height={16} title="Bezahlt, aber nicht rechtzeitig" />
      ) : null}
    </div>
  );
}

function capturedWhen(iso: string) {
  const formatted = formatDate(iso);
  const [day, time] = formatted.split(" ");
  return time ? `${day} - ${time}` : formatted;
}

function partnerMeta(partner: Partner) {
  const bits = [partner.birthDate, partner.nickname ? `(vulgo ${partner.nickname})` : ""].filter(Boolean);
  return bits.join(" ");
}

function rowText(fee: Fee, partner: Partner | undefined, credit: number | undefined): Record<ColumnKey, string> {
  return {
    partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
    invoice: invoiceLine(fee),
    method: fee.paymentMethod,
    period: servicePeriod(fee.month),
    payment: paymentLine(fee, credit),
    due: `${money(fee.amount)} ${fee.tariff}`,
    paid: `${money(fee.paid)} ${fee.tariff}`,
    captured: `${capturedWhen(fee.createdAt)} ${fee.createdBy}`,
  };
}

export function StatusStep() {
  const { finanzenMonth } = useWorkflow();
  const { state, importCaptureData } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [stat, setStat] = useState<StatFilter>(null);

  const fees = feesOfMonth(state, finanzenMonth);
  const creditOf = (fee: Fee) => {
    if (fee.creditAmount !== undefined) return fee.creditAmount;
    const granted = state.singleInvoices.find((invoice) => invoice.feeId === fee.id && invoice.credit);
    return granted?.credit;
  };
  const statDone = fees.filter((fee) => fee.paymentStatus === "paid").length;
  const statOpen = fees.length - statDone;
  const baseRows = useMemo(() => {
    return fees
      .filter((fee) => stat === null || (stat === "done") === (fee.paymentStatus === "paid"))
      .map((fee) => {
        const partner = partnerOf(state, fee.partnerId);
        const credit = creditOf(fee);
        return { fee, partner, credit, text: rowText(fee, partner, credit) };
      });
  }, [fees, state, stat]);
  const rows = useMemo(
    () => baseRows.filter((row) => COLUMNS.every((column) => matchesFilter(filters[column.key], row.text[column.key]))),
    [baseRows, filters],
  );
  const sum = totals(rows.map((row) => row.fee));

  function download() {
    const header = ["Partner", "Status zur Rechnung", "Zahlart", "Leistungszeitraum", "Status zur Zahlung", "Zu zahlender Honorarbetrag", "Bezahlter Honorarbetrag", "Erfasst"];
    const lines = rows.map((row) =>
      [row.partner?.name ?? "", row.text.invoice, row.text.method, row.text.period, row.text.payment, money(row.fee.amount), money(row.fee.paid), row.text.captured]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Honorare_${finanzenMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="freigaben hn-panel hn-status">
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">
        <strong>{monthLabel(finanzenMonth)}</strong> {finanzenMonth.slice(0, 4)}
      </p>
      <h2 className="hn-h2 hn-status-title">Status zu Rechnungen</h2>

      {fees.length === 0 ? (
        <StepEmpty
          icon={a.tickList}
          title="Noch keine Rechnungen vorhanden"
          lead="Du kannst"
          link="Daten hier importieren"
          onLink={() => importCaptureData(finanzenMonth)}
        />
      ) : (
      <>
      <StatCards open={statOpen} done={statDone} unit="Zahlungen" value={stat} onChange={setStat} />

      <div className="hn-status-tools">
        <button type="button" className="hn-drop" onClick={() => importCaptureData(finanzenMonth)}>
          Daten importieren
          <Icon src={a.chevronDown} size={18} />
        </button>
        <div className="hn-status-tools-end">
          <button type="button" className="hn-drop" onClick={download}>
            Liste herunterladen
            <Icon src={a.chevronDown} size={18} />
          </button>
        </div>
      </div>

      <div className="hn-status-table" role="table" aria-label="Status zu Rechnungen">
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

        <div className="hn-st-sum" role="row">
          <div className="hn-st-sum-label">Alle Honorare</div>
          <div />
          <div />
          <div />
          <div />
          <div className="hn-st-total">
            <strong>{money(sum.due)}</strong>
            <small>Summe Total</small>
          </div>
          <div className="hn-st-total">
            <strong>{money(sum.paid)}</strong>
            <small>Summe Total</small>
          </div>
          <div />
        </div>

        {rows.map(({ fee, partner, text, credit }) => {
          const locked = missingFields(fee, partner).length > 0;
          return (
            <div className="hn-st-row" role="row" key={fee.id}>
              <div className="hn-st-partner">
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
                <Icon src={fee.invoiceStatus === "sent" ? a.confirm : a.onhold} size={16} />
                <span>{text.invoice}</span>
              </div>
              <PaymentCell fee={fee} credit={credit} />
              <div>{text.method}</div>
              <div className="hn-st-period">{text.period}</div>
              <div className="hn-st-money">
                <strong>{money(fee.amount)}</strong>
                <small>{fee.tariff}</small>
              </div>
              <div className="hn-st-money">
                <strong>{money(fee.paid)}</strong>
                <small>{fee.tariff}</small>
              </div>
              <div className="hn-st-captured">
                <span>
                  {capturedWhen(fee.createdAt)}
                  <small>{fee.createdBy}</small>
                </span>
                <ProfileDueMenu />
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}
    </section>
  );
}
