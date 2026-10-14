import { useMemo, useState } from "react";
import * as a from "../assets/index";
import { formatDate, formatDay, monthLabel, servicePeriod } from "../lib/honorar/format";
import { abbucherSynced, feesOfMonth, missingFields, monthOf, partnerOf, rechnungOverdue, totals } from "../lib/honorar/queries";
import type { Fee, Partner } from "../types/honorar";
import { Icon, InfoBox, Snackbar } from "../ui";
import { useWorkflow } from "../workflow";
import { ColumnFilter, filterInputProps, matchesFilter } from "./ColumnFilter";
import { useHonorar } from "./store";
import { PartnerAvatar, ProfileDueMenu, StatCards, StepEmpty, type StatFilter } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "invoice", label: "Status Rechnungsversand", filter: true },
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

/** Mail or Post, taken from the partner's delivery method. */
function channelOf(partner: Partner | undefined) {
  return partner?.deliveryMethod === "print" ? "per Post" : "per Mail";
}

export function invoiceLine(fee: Fee, partner?: Partner) {
  // Abbucher never goes through the invoice dispatch (mail/post) - the debit is settled directly in Infinity.
  if (fee.paymentMethod === "Abbucher") return "Kein Rechnungsversand";
  if (fee.invoiceStatus === "not_created") return "Rechnung von BMD noch nicht erstellt";
  if (fee.invoiceStatus === "created") return "Rechnung erstellt, wartet auf Versand";
  if (fee.invoiceStatus === "send_failed") return "Mail nicht empfangen";
  const via = partner ? ` ${channelOf(partner)}` : "";
  return fee.sentAt ? `Rechnung${via} versendet am ${formatDay(fee.sentAt)}` : `Rechnung${via} versendet`;
}

/** Reminder note shown under the invoice status of a Rechnung. */
export function reminderLine(fee: Fee, partner?: Partner) {
  const via = partner ? ` ${channelOf(partner)}` : "";
  return fee.paymentMethod === "Rechnung" && fee.reminderSentAt ? `Zahlungserinnerung${via} versendet am ${formatDay(fee.reminderSentAt)}` : "";
}

export type PaymentInfo = { main: string; notes: string[]; credit?: string; tone: "open" | "paid" | "fail" };

/** `overdue`: the fee is being handled as past its due date (step 5 / Offene Posten), so open fees read "nach Zahlungsziel". */
export function paymentInfo(fee: Fee, credit: number | undefined, overdue = false): PaymentInfo {
  const invoiceOut = fee.invoiceStatus !== "not_created" && fee.invoiceStatus !== "created";
  // A direct debit runs independently of the invoice mail, so its result from Infinity shows up right away.
  const debitKnown = fee.paymentMethod === "Abbucher" && fee.paymentStatus !== "open_before_due";
  if (!invoiceOut && !debitKnown) {
    // Once the Datenträger exists the debit is only waiting for Infinity.
    if (fee.paymentMethod === "Abbucher" && fee.invoiceStatus === "created") {
      return { main: "Abbucher ausstehend", notes: [], tone: "open" };
    }
    return { main: "Rechnung noch nicht versendet", notes: [], tone: "open" };
  }
  const notes: string[] = [];
  let main: string;
  let tone: PaymentInfo["tone"] = "open";
  if (fee.settledVia) {
    main = "Abgeschlossen";
    tone = "paid";
    notes.push(fee.settledVia === "due_date" ? "Neues Zahlungsziel vereinbart" : "Über Inkasso abgeschlossen");
  } else if (fee.paymentStatus === "paid") {
    main = "Bezahlt";
    tone = "paid";
    if (fee.paidLate === "reminder") notes.push("Bezahlt nach Zahlungserinnerung");
    if (fee.paidLate === "two_months") notes.push("Bezahlt erst nach 2 Monaten");
  } else if (fee.paymentMethod === "Abbucher") {
    // A direct debit either goes through or it does not: there is only ever one failure status, regardless
    // of a partial amount, so "Zu wenig bezahlt" never applies to Abbucher.
    if (fee.paymentStatus === "open_before_due") {
      main = "Abbucher ausstehend";
    } else {
      main = "Abbucher fehlgeschlagen";
      notes.push("Berater Nachricht schicken");
      tone = "fail";
    }
  } else {
    // Rechnung only knows: Offen vor Zahlungsziel, Offen nach Zahlungsziel, Zu wenig bezahlt (and Bezahlt).
    if (fee.paid > 0 && fee.paid < fee.amount) main = "Zu wenig bezahlt";
    else if (overdue || fee.reminderSentAt) main = "Offen nach Zahlungsziel";
    else main = "Offen vor Zahlungsziel";
  }
  const creditLine = credit === undefined ? undefined : `Gutschrift gewährt (${money(credit)} €)`;
  return { main, notes, credit: creditLine, tone };
}

export function paymentLine(fee: Fee, credit: number | undefined, overdue = false) {
  const info = paymentInfo(fee, credit, overdue);
  return [info.main, ...info.notes, info.credit ?? ""].join(" ");
}

/** Payment status cell shared by Status zu Rechnungen, Status zu Zahlungen (Abbucher) and Offene Posten. */
export function PaymentCell({ fee, credit, compact = false }: { fee: Fee; credit: number | undefined; compact?: boolean }) {
  // The compact variant is used in step 5 and Offene Posten, where open fees are already past their due date.
  const info = paymentInfo(fee, credit, compact);
  const [notified, setNotified] = useState(false);
  const notes = info.notes;
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
            {note === "Berater Nachricht schicken" ? (
              <button type="button" onClick={() => setNotified(true)}>
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
      {notified ? <Snackbar message="Nachricht an den Berater wurde geschickt." onClose={() => setNotified(false)} /> : null}
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
    invoice: `${invoiceLine(fee)} ${reminderLine(fee)}`,
    method: fee.paymentMethod,
    period: servicePeriod(fee.month),
    payment: paymentLine(fee, credit),
    due: `${money(fee.amount)} ${fee.tariff}`,
    paid: `${money(fee.paid)} ${fee.tariff}`,
    captured: `${capturedWhen(fee.createdAt)} ${fee.createdBy}`,
  };
}

/**
 * Status zu Rechnungen lists every fee of the month. With mode "abbucher" it is step 4: only the direct debits,
 * which show up once step 2 is done and get their result when synced with Infinity.
 */
export function StatusStep({ mode = "all" }: { mode?: "all" | "abbucher" }) {
  const { finanzenMonth, openFinanzenStep } = useWorkflow();
  const { state, importCaptureData, syncInfinity } = useHonorar();
  const abbucherMode = mode === "abbucher";
  const [toast, setToast] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [stat, setStat] = useState<StatFilter>(null);
  const [openGroups, setOpenGroups] = useState({ abbucher: true, rechnung: true });

  // A direct debit never goes through the invoice dispatch, so that column is dropped in step 4.
  const columns = abbucherMode ? COLUMNS.filter((column) => column.key !== "invoice") : COLUMNS;

  const month = monthOf(state, finanzenMonth);
  const monthFees = feesOfMonth(state, finanzenMonth);
  const fees = abbucherMode ? monthFees.filter((fee) => fee.paymentMethod === "Abbucher") : monthFees;
  // Keeps "vor"/"nach Zahlungsziel" consistent for every Rechnung fee of this month (see rechnungOverdue).
  const rechnungExpired = rechnungOverdue(monthFees);
  // The direct debits appear as soon as step 2 is finished (earlier months already carry their results).
  const debitsReady = !abbucherMode || Boolean(month?.steps.dataCarrier) || abbucherSynced(state, finanzenMonth);
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
    () => baseRows.filter((row) => columns.every((column) => matchesFilter(filters[column.key], row.text[column.key]))),
    [baseRows, filters, columns],
  );
  const sum = totals(rows.map((row) => row.fee));
  const abbucherRows = rows.filter((row) => row.fee.paymentMethod === "Abbucher");
  const rechnungRows = rows.filter((row) => row.fee.paymentMethod === "Rechnung");

  function download() {
    const header = abbucherMode
      ? ["Partner", "Status zur Zahlung", "Zahlart", "Leistungszeitraum", "Zu zahlender Honorarbetrag", "Bezahlter Honorarbetrag", "Erfasst"]
      : ["Partner", "Status Rechnungsversand", "Zahlart", "Leistungszeitraum", "Status zur Zahlung", "Zu zahlender Honorarbetrag", "Bezahlter Honorarbetrag", "Erfasst"];
    const lines = rows.map((row) =>
      (abbucherMode
        ? [row.partner?.name ?? "", row.text.payment, row.text.method, row.text.period, money(row.fee.amount), money(row.fee.paid), row.text.captured]
        : [row.partner?.name ?? "", row.text.invoice, row.text.method, row.text.period, row.text.payment, money(row.fee.amount), money(row.fee.paid), row.text.captured]
      )
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${abbucherMode ? "Abbucher" : "Honorare"}_${finanzenMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function syncWithInfinity() {
    const pending = fees.some((fee) => fee.paymentStatus === "open_before_due");
    if (!pending) {
      setToast("Die Abbucher sind bereits mit Infinity synchronisiert.");
      return;
    }
    syncInfinity(finanzenMonth);
    setToast("Abbucher mit Infinity synchronisiert.");
  }

  const heading = (
    <>
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">
        <strong>{monthLabel(finanzenMonth)}</strong> {finanzenMonth.slice(0, 4)}
      </p>
      <h2 className="hn-h2 hn-status-title">{abbucherMode ? "Status zu Zahlungen (Abbucher)" : "Status zu Rechnungen"}</h2>
    </>
  );

  return (
    <section className="freigaben hn-panel hn-status">
      {abbucherMode ? (
        <>
          <div className="hn-step-hint hn-step-hint-top">
            <InfoBox>
              Die Abbuchung muss in Infinity durchgeführt werden, damit hier der Status sichtbar wird. Die Abbucher
              sollten rund um den 10. des Monats geprüft werden – die Abbuchung in Infinity und BMD muss davor
              erledigt sein. Klicke danach auf „Synchronisiere mit Infinity“, um die Liste zu aktualisieren.
            </InfoBox>
          </div>
          <div className="hn-dispatch-bar">
            <div>{heading}</div>
            <button type="button" className="hn-send" disabled={!debitsReady || fees.length === 0} onClick={syncWithInfinity}>
              Synchronisiere mit Infinity
            </button>
          </div>
        </>
      ) : (
        heading
      )}

      {fees.length === 0 || !debitsReady ? (
        abbucherMode ? (
          <StepEmpty
            icon={a.tickList}
            title={fees.length === 0 ? "Keine Abbucher in diesem Monat" : "Noch keine Abbucher sichtbar"}
            {...(fees.length === 0
              ? {}
              : {
                  lead: "Sobald Schritt 2 abgeschlossen ist, erscheinen hier alle Abbucher des Monats. Du kannst",
                  link: "Schritt 2 jetzt öffnen",
                  onLink: () => openFinanzenStep("carrier"),
                })}
          />
        ) : (
          <StepEmpty
            icon={a.tickList}
            title="Noch keine Rechnungen vorhanden"
            lead="Du kannst"
            link="Daten hier importieren"
            onLink={() => importCaptureData(finanzenMonth)}
          />
        )
      ) : (
      <>
      <StatCards open={statOpen} done={statDone} unit="Zahlungen" value={stat} onChange={setStat} />

      <div className="hn-status-tools">
        {abbucherMode ? (
          <span />
        ) : (
          <button type="button" className="hn-drop" onClick={() => importCaptureData(finanzenMonth)}>
            Daten importieren
            <Icon src={a.chevronDown} size={18} />
          </button>
        )}
        <div className="hn-status-tools-end">
          <button type="button" className="hn-drop" onClick={download}>
            Liste herunterladen
            <Icon src={a.chevronDown} size={18} />
          </button>
        </div>
      </div>

      <div
        className={`hn-status-table${abbucherMode ? " abbucher" : ""}`}
        role="table"
        aria-label={abbucherMode ? "Status zu Zahlungen (Abbucher)" : "Status zu Rechnungen"}
      >
        <div className="hn-st-head" role="row">
          {columns.map((column) => (
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
          {abbucherMode ? null : <div />}
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

        {abbucherMode ? (
          <Group open onToggle={() => undefined} rows={rows} hideInvoice />
        ) : (
          <>
            <Group
              label="Abbucher"
              open={openGroups.abbucher}
              onToggle={() => setOpenGroups((current) => ({ ...current, abbucher: !current.abbucher }))}
              rows={abbucherRows}
            />
            <Group
              label="Rechnung"
              open={openGroups.rechnung}
              onToggle={() => setOpenGroups((current) => ({ ...current, rechnung: !current.rechnung }))}
              rows={rechnungRows}
              rechnungExpired={rechnungExpired}
            />
          </>
        )}
      </div>
      </>
      )}
      {toast ? <Snackbar message={toast} onClose={() => setToast(null)} /> : null}
    </section>
  );
}

type StatusRow = { fee: Fee; partner: Partner | undefined; credit: number | undefined; text: Record<ColumnKey, string> };

/** Groups the rows by Zahlart (Abbucher / Rechnung), the same way Postversand groups by Mail / Post. */
function Group({
  label,
  open,
  onToggle,
  rows,
  hideInvoice,
  rechnungExpired = false,
}: {
  label?: string;
  open: boolean;
  onToggle: () => void;
  rows: StatusRow[];
  hideInvoice?: boolean;
  rechnungExpired?: boolean;
}) {
  const { openFinanzenStep } = useWorkflow();
  if (rows.length === 0) return null;
  return (
    <>
      {label ? (
        <div className="hn-st-group" role="row">
          <div className="hn-st-group-bar">
            <button type="button" className={open ? undefined : "closed"} aria-expanded={open} onClick={onToggle}>
              <Icon src={a.chevronDown} size={18} />
              {label}
            </button>
          </div>
        </div>
      ) : null}
      {open
        ? rows.map(({ fee, partner, text, credit }) => {
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
                {hideInvoice ? null : fee.paymentMethod === "Abbucher" ? (
                  <div className="hn-st-note muted">
                    <span>{invoiceLine(fee)}</span>
                  </div>
                ) : (
                  // Click leads to where it happened: the reminder step once a reminder is out, else the dispatch step.
                  <div
                    className="hn-st-note link"
                    role="link"
                    tabIndex={0}
                    onClick={() => openFinanzenStep(fee.reminderSentAt ? "reminders" : "dispatch")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openFinanzenStep(fee.reminderSentAt ? "reminders" : "dispatch");
                    }}
                  >
                    <Icon src={fee.invoiceStatus === "sent" ? a.confirm : a.onhold} size={16} />
                    <span className="hn-st-fail-copy">
                      {invoiceLine(fee, partner)}
                      {reminderLine(fee, partner) ? <small>{reminderLine(fee, partner)}</small> : null}
                    </span>
                  </div>
                )}
                <PaymentCell fee={fee} credit={credit} compact={fee.paymentMethod === "Rechnung" && rechnungExpired} />
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
          })
        : null}
    </>
  );
}
