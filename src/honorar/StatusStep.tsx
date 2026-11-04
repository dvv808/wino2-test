import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { formatDay, monthLabel } from "../lib/honorar/format";
import { feesOfMonth, missingFields, monthOf, partnerOf } from "../lib/honorar/queries";
import type { Fee, HonorarState, Partner } from "../types/honorar";
import { money, rechnungenCells, workflowStepText, zahlartLabel, type Cell } from "./invoiceCells";
import { InvoiceInfoModal } from "./InvoiceInfoModal";
import { Icon, Snackbar } from "../ui";
import { useWorkflow } from "../workflow";
import { ColumnFilter, FilterSummary, filterInputProps, matchesFilter, type FilterGroup } from "./ColumnFilter";
import { useHonorar } from "./store";
import { workflowOwner } from "./ownership";
import { ADVISORS, PEOPLE } from "../mocks/honorar/seed";
import { PartnerAvatar, PartnerOpenButton, StatCards, StepEmpty, type StatFilter, HnKicker, StatsRow, StickyScroll } from "./ui";

/** Status zu Rechnungen columns. `groupEnd` columns are collapsible: they carry the ">" tab and a dark divider follows them (Figma). */
const COLUMNS = [
  { key: "partner", label: "Partner", filter: false, groupEnd: true },
  { key: "agreement", label: "Vereinbarung", filter: true, groupEnd: true },
  { key: "invoiceNumber", label: "Re-Nr & Re-Datum", filter: true },
  { key: "method", label: "Zahlart", filter: true },
  { key: "due", label: "Rechnungsbetrag", filter: true },
  { key: "paid", label: "Zahlungseingang", filter: true },
  { key: "status", label: "Status Zahlung korrekt", filter: true, groupEnd: true },
  { key: "dueDate", label: "Fälligkeitsdatum der Rechnung (Zahlungsziel)", filter: true, groupEnd: true },
  { key: "openItem", label: "Status \"Offene Posten\"", filter: true, groupEnd: true },
  { key: "correction", label: "Status Rechnungskorrektur & Einzelfaktura", filter: true, groupEnd: true },
] as const;

/** Folded out by the Partner ">" tab: shown right after Partner. */
const PARTNER_COLUMNS = [
  { key: "delivery", label: "Versandart", filter: true },
  { key: "advisor", label: "Kundenberater", filter: true },
  { key: "tariff", label: "Honorarmodell", filter: true },
  { key: "bank", label: "Bankverbindung", filter: true },
  { key: "lorem", label: "Dolor sit amet", filter: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"] | (typeof PARTNER_COLUMNS)[number]["key"];

const PHOTOS: Record<string, string> = { [PEOPLE.mike]: a.reqMike, [PEOPLE.lucy]: a.empLucy };

/** Small avatar + name: photo where one exists, initials otherwise. */
function PersonChip({ name }: { name: string }) {
  const photo = PHOTOS[name];
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <span className="hn-person-chip">
      {photo ? (
        <img className="hn-st-advisor-photo" src={photo} alt="" width={20} height={20} />
      ) : (
        <span className="hn-st-advisor-photo initials">{initials}</span>
      )}
      {name}
    </span>
  );
}

/** Kundenberater photo by name; colleagues without one show initials. */
function advisorOf(name: string) {
  const known = Object.values(ADVISORS).find((advisor) => advisor.name === name);
  // Only Mike has a real photo; Sandra's seed photo is Anna's, so she shows initials.
  return { name, department: known?.department ?? "Kundenberatung", photo: name === PEOPLE.mike ? a.reqMike : undefined };
}

function deliveryOf(partner: Partner | undefined) {
  if (!partner) return { label: "-", lines: [] as string[] };
  return partner.deliveryMethod === "print"
    ? { label: "Post", lines: partner.address.split(", ") }
    : { label: "Mail", lines: [partner.email] };
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

function EventLine({
  kind,
  icon,
  text,
  clickable,
  onClick,
}: {
  kind: "invoice" | "reminder";
  icon: string;
  text: string;
  clickable?: boolean;
  onClick?: () => void;
}) {
  const className = `hn-st-event ${kind}${clickable ? " link" : ""}`;
  if (clickable && onClick) {
    return (
      <div
        className={className}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter") onClick();
        }}
      >
        <Icon src={icon} size={16} />
        <span>{text}</span>
      </div>
    );
  }
  return (
    <div className={className}>
      <Icon src={icon} size={16} />
      <span>{text}</span>
    </div>
  );
}

/** Invoice dispatch and reminder as two separate lines, so they do not read as the same event. */
export function DispatchStatus({
  fee,
  partner,
  clickable = false,
  onInvoice,
  onReminder,
}: {
  fee: Fee;
  partner?: Partner;
  clickable?: boolean;
  onInvoice?: () => void;
  onReminder?: () => void;
}) {
  if (fee.paymentMethod === "Abbucher") {
    return (
      <div className="hn-st-note muted">
        <span>Kein Rechnungsversand</span>
      </div>
    );
  }
  const reminder = reminderLine(fee, partner);
  return (
    <div className="hn-st-events">
      <EventLine
        kind="invoice"
        icon={fee.invoiceStatus === "sent" ? a.confirm : a.onhold}
        text={invoiceLine(fee, partner)}
        clickable={clickable && Boolean(onInvoice)}
        onClick={onInvoice}
      />
      {reminder ? (
        <EventLine
          kind="reminder"
          icon={a.requestSmall}
          text={reminder}
          clickable={clickable && Boolean(onReminder)}
          onClick={onReminder}
        />
      ) : null}
    </div>
  );
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
      return { main: "SEPA-Lastschrift ausstehend", notes: [], tone: "open" };
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
      main = "SEPA-Lastschrift ausstehend";
    } else {
      main = "SEPA-Lastschrift fehlgeschlagen";
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
  const { notifyAdvisor } = useHonorar();
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
              <button
                type="button"
                onClick={() => {
                  notifyAdvisor(fee.id, info.main);
                  setNotified(true);
                }}
              >
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

function rechnungenRowText(state: HonorarState, fee: Fee, partner: Partner | undefined): Record<string, string> {
  const cells = rechnungenCells(state, fee);
  return {
    partner: `${partner?.name ?? ""} ${partner?.address ?? ""}`,
    delivery: [deliveryOf(partner).label, ...deliveryOf(partner).lines].join(" "),
    advisor: partner?.advisor ?? "",
    tariff: `${fee.tariff} ${money(fee.amount)} ${formatDay(fee.createdAt)}`,
    bank: partner?.bankAccount ?? "",
    lorem: "",
    agreement: cells.agreement.join(" "),
    invoiceNumber: cells.invoice.join(" "),
    method: zahlartLabel(fee.paymentMethod),
    due: `€ ${money(fee.amount)}`,
    paid: `€ ${money(fee.paid)}`,
    status: cells.status.lines.join(" "),
    dueDate: cells.dates.lines.join(" "),
    openItem: cells.openItem.lines.join(" "),
    // The person working on the workflow is searchable too.
    correction: [
      ...cells.correction.lines,
      ...(fee.correction ? [fee.correction.workflow, workflowStepText(fee.correction), workflowOwner(fee.correction, partner)] : []),
    ].join(" "),
  };
}

/** "01.04.2027, 13:33": the demo date with the real time of day, ticking every minute. */
function useNow(today: string) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const time = `${String(clock.getHours()).padStart(2, "0")}:${String(clock.getMinutes()).padStart(2, "0")}`;
  return { iso: `${today}T${time}`, label: `${formatDay(today)}, ${time}` };
}

/** Status zu Rechnungen: every fee of the month with its invoice and payment state (Status page of the month). */
export function StatusStep() {
  const { finanzenMonth } = useWorkflow();
  const { state, importCaptureData, syncInfinity } = useHonorar();
  const [toast, setToast] = useState<string | null>(null);
  const [stat, setStat] = useState<StatFilter>(null);

  const now = useNow(state.today);
  const month = monthOf(state, finanzenMonth);
  const fees = feesOfMonth(state, finanzenMonth);
  const statDone = fees.filter((fee) => fee.paymentStatus === "paid").length;
  const statOpen = fees.length - statDone;
  // SEPA-Lastschriften get their result from Infinity once their Datenträger exists (step 2 of Rechnungsversand).
  const sepaPending = fees.some((fee) => fee.paymentMethod === "Abbucher" && fee.paymentStatus === "open_before_due");
  const canSync = Boolean(month?.steps.dataCarrier) && sepaPending;
  const shownFees = fees.filter((fee) => stat === null || (stat === "done") === (fee.paymentStatus === "paid"));

  function download(rows: StatusRow[]) {
    const header = [
      "Partner",
      "Vereinbarung",
      "Rechnungsnummer & Rechnungsdatum",
      "Zahlart",
      "Rechnungsbetrag",
      "Zahlungseingang",
      "Status Zahlung korrekt",
      "Fälligkeitsdatum der Rechnung (Zahlungsziel)",
      "Status Offene Posten",
      "Status Rechnungskorrektur & Einzelfaktura",
    ];
    const lines = rows.map((row) =>
      [
        row.partner?.name ?? "",
        row.text.agreement,
        row.text.invoiceNumber,
        row.text.method,
        money(row.fee.amount),
        money(row.fee.paid),
        row.text.status,
        row.text.dueDate,
        row.text.openItem,
        row.text.correction,
      ]
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

  function syncWithInfinity() {
    syncInfinity(finanzenMonth);
    setToast("SEPA-Lastschriften mit Infinity synchronisiert.");
  }

  return (
    <section className="freigaben hn-panel hn-status">
      <div className="hn-status-head">
        <div>
          <HnKicker>Status zu Rechnungen</HnKicker>
          <p className="hn-month">
            <strong>{monthLabel(finanzenMonth)}</strong> {finanzenMonth.slice(0, 4)}
          </p>
        </div>
        <time className="hn-status-stamp" dateTime={now.iso}>
          {now.label}
        </time>
      </div>

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
      <StatusTable fees={shownFees} label="Status zu Rechnungen" stats={<StatCards open={statOpen} done={statDone} unit="Zahlungen" value={stat} onChange={setStat} />} tools={(rows) => (
      <div className="hn-status-tools">
        <div className="hn-status-tools-end">
          {canSync ? (
            <button type="button" className="hn-drop" onClick={syncWithInfinity}>
              Synchronisiere mit Infinity
            </button>
          ) : null}
          <button type="button" className="hn-drop" onClick={() => download(rows)}>
            Liste herunterladen
            <Icon src={a.chevronDown} size={18} />
          </button>
        </div>
      </div>
      )} />
      </>
      )}
      {toast ? <Snackbar message={toast} onClose={() => setToast(null)} /> : null}
    </section>
  );
}

export type StatusRow = { fee: Fee; partner: Partner | undefined; text: Record<string, string> };

/** The Sammelfaktura table: one row per invoice with its payment, Offene-Posten and correction status. Shared by Status zu Rechnungen, Offene Posten and Einzelfaktura. */
export function StatusTable({
  fees,
  label,
  tools,
  empty,
  stats,
  defaultPartnerOpen = false,
  highlight,
}: {
  /** Rows to mark (yellow), e.g. the invoices of a widget notice. */
  highlight?: string[];
  fees: Fee[];
  label: string;
  /** Opens the Partner fold-out (Versandart, Kundenberater, Honorarmodell, Bankverbindung) from the start. */
  defaultPartnerOpen?: boolean;
  /** Offen / Abgeschlossen cards; the totals of the shown rows sit at the right end of the same row. */
  stats?: React.ReactNode;
  tools?: (rows: StatusRow[]) => React.ReactNode;
  empty?: React.ReactNode;
}) {
  const { state } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [partnerOpen, setPartnerOpen] = useState(defaultPartnerOpen);
  const [onlyDue, setOnlyDue] = useState(false);
  const columns = partnerOpen ? [COLUMNS[0], ...PARTNER_COLUMNS, ...COLUMNS.slice(1)] : [...COLUMNS];
  const baseRows = useMemo(
    () =>
      fees.map((fee) => {
        const partner = partnerOf(state, fee.partnerId);
        return { fee, partner, text: rechnungenRowText(state, fee, partner) };
      }),
    [fees, state],
  );
  // Columns whose cells mix several things get sorted pick lists instead of every distinct cell text.
  const columnGroups = useMemo((): Partial<Record<ColumnKey, FilterGroup[]>> => {
    const sorted = (values: string[]) => [...new Set(values.filter(Boolean))].sort((x, y) => x.localeCompare(y, "de"));
    const chip = (name: string) => <PersonChip name={name} />;
    const running = baseRows.flatMap((row) => (row.fee.correction ? [row] : []));
    const steps = ["Antrag offen", "Freigabe offen", "Verbuchung offen", "Verbucht", "Antrag abgelehnt"];
    return {
      correction: [
        { label: "Workflow", options: sorted(running.map((row) => row.fee.correction!.workflow)) },
        { label: "Schritt", options: steps.filter((step) => running.some((row) => workflowStepText(row.fee.correction!).endsWith(step))) },
        { label: "Personen", options: sorted(running.map((row) => workflowOwner(row.fee.correction!, row.partner))), render: chip },
      ],
      advisor: [{ label: "Kundenberater", options: sorted(baseRows.map((row) => row.partner?.advisor ?? "")), render: chip }],
      delivery: [{ label: "Versandart", options: sorted(baseRows.map((row) => deliveryOf(row.partner).label)) }],
    };
  }, [baseRows]);
  const filteredRows = useMemo(
    () => baseRows.filter((row) => [...COLUMNS, ...PARTNER_COLUMNS].every((column) => matchesFilter(filters[column.key], row.text[column.key]))),
    [baseRows, filters],
  );  // Ausstehend tile: only invoices with something still to pay.
  const rows = onlyDue ? filteredRows.filter((row) => row.fee.amount - row.fee.paid > 0) : filteredRows;


  return (
    <>
      <StatsRow
        stats={stats}
        fees={filteredRows.map((row) => row.fee)}
        onlyDue={onlyDue}
        onToggleDue={() => setOnlyDue((value) => !value)}
      />
      {tools?.(rows)}
      <FilterSummary filters={filters} shown={rows.length} total={baseRows.length} onReset={() => setFilters({})} />
      <StickyScroll>
      <div className={partnerOpen ? "hn-status-table rechnungen partner-open" : "hn-status-table rechnungen"} role="table" aria-label={label}>
        <div className="hn-st-head" role="row">
          {columns.map((column) => (
            <div className={"groupEnd" in column ? "hn-st-th has-tab" : "hn-st-th"} role="columnheader" key={column.key}>
              {column.key === "partner" ? (
                <button
                  type="button"
                  className={partnerOpen ? "hn-st-tab open" : "hn-st-tab"}
                  aria-expanded={partnerOpen}
                  title={partnerOpen ? "Spalten einklappen" : "Versandart, Kundenberater, Honorarmodell und mehr anzeigen"}
                  onClick={() => setPartnerOpen((value) => !value)}
                >
                  <Icon src={a.chevronDark} size={12} className="caret-side" />
                </button>
              ) : "groupEnd" in column ? (
                <span className="hn-st-tab" aria-hidden title="Weitere Spalten folgen">
                  <Icon src={a.chevronDark} size={12} className="caret-side" />
                </span>
              ) : null}
              <span className="hn-st-label">
                {column.label}
                {column.filter ? (
                  <span className="hn-st-ctrls">
                    <ColumnFilter
                      label={column.label}
                      value={filters[column.key] ?? ""}
                      samples={baseRows.map((row) => row.text[column.key] ?? "")}
                      onChange={(next) => setFilters((current) => ({ ...current, [column.key]: next }))}
                      groups={columnGroups[column.key]}
                    />
                  </span>
                ) : null}
              </span>
              <input
                className="col-input"
                aria-label={`${column.label} filtern`}
                {...filterInputProps(filters[column.key], (next) => setFilters((current) => ({ ...current, [column.key]: next })))}
              />
            </div>
          ))}
          <div className="hn-st-th hn-st-more-head" role="columnheader" aria-label="Aktionen" />
        </div>

        {rows.length === 0 && empty ? null : <RechnungenRows rows={rows} partnerOpen={partnerOpen} highlight={highlight} />}
      </div>
      </StickyScroll>
      {/* Outside the sideways scroll, so it centres in the panel and not in the wide grid. */}
      {rows.length === 0 && empty ? empty : null}
    </>
  );
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, index) => (
        <span key={index}>{line}</span>
      ))}
    </>
  );
}

function ToneCell({ cell }: { cell: Cell }) {
  return (
    <div className={`hn-st-stack hn-st-tone-${cell.tone}`}>
      <Lines lines={cell.lines} />
    </div>
  );
}

/** Status zu Rechnungen rows: one flat list - the Zahlart is a column, no longer a group. */
function RechnungenRows({ rows, partnerOpen, highlight }: { rows: StatusRow[]; partnerOpen: boolean; highlight?: string[] }) {
  const { state } = useHonorar();
  const { openFinanzen, openRechnungWorkflow } = useWorkflow();
  const [menu, setMenu] = useState<{ feeId: string; top: number; left: number; anchor: HTMLElement } | null>(null);
  const [infoFeeId, setInfoFeeId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeInfo = useCallback(() => setInfoFeeId(null), []);

  useEffect(() => {
    if (!menu) return;
    function away(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest(".hn-st-menu")) return;
      setMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    // The menu is fixed to the screen, so it closes once its dots button has scrolled away from under it.
    function onScroll() {
      if (!menu) return;
      const rect = menu.anchor.getBoundingClientRect();
      if (Math.abs(rect.bottom + 4 - menu.top) > 2 || Math.abs(Math.max(8, rect.right - 224) - menu.left) > 2) setMenu(null);
    }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menu]);
  return (
    <>
      {rows.map(({ fee, partner, text }) => {
        const locked = missingFields(fee, partner).length > 0;
        const cells = rechnungenCells(state, fee);
        return (
          <div className={highlight?.includes(fee.id) ? "hn-st-row focus" : "hn-st-row"} role="row" key={fee.id}>
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
                {partner?.address
                  ? partner.address.split(", ").map((line) => <small key={line}>{line}</small>)
                  : null}
              </span>
              <PartnerOpenButton partner={partner} />
            </div>
            {partnerOpen ? <PartnerExtraCells partner={partner} fee={fee} /> : null}
            <div className="hn-st-stack">
              <Lines lines={cells.agreement} />
            </div>
            <div className="hn-st-stack">
              <Lines lines={cells.invoice} />
            </div>
            <div>{text.method}</div>
            <div className="hn-st-amount">€ {money(fee.amount)}</div>
            <div className="hn-st-amount">€ {money(fee.paid)}</div>
            <ToneCell cell={cells.status} />
            <div>
              {cells.dates.lines.length > 1 ? (
                <span className={`hn-st-dates hn-st-tone-${cells.dates.tone}`}>
                  <Lines lines={cells.dates.lines} />
                </span>
              ) : (
                cells.dates.lines[0]
              )}
            </div>
            <ToneCell cell={cells.openItem} />
            {fee.correction ? (
              /* A started or booked workflow opens its workflow page, beside the partner tab. */
              <div className={`hn-st-stack hn-st-tone-${cells.correction.tone}`}>
                <button
                  type="button"
                  className="hn-st-wf-link"
                  title="Workflow öffnen"
                  onClick={() => openRechnungWorkflow(fee.id)}
                >
                  <span className="hn-st-wf-title">
                    <Icon src={a.moduleWorkflow} size={16} />
                    {fee.correction.workflow}
                  </span>
                  <span className="hn-st-wf-step">{workflowStepText(fee.correction)}</span>
                  <PersonChip name={workflowOwner(fee.correction, partner)} />
                </button>
              </div>
            ) : cells.correction.link ? (
              <div className="hn-st-stack">
                <button type="button" className="hn-link" onClick={() => openFinanzen("openItems")}>
                  {cells.correction.lines[0]}
                </button>
              </div>
            ) : (
              <ToneCell cell={cells.correction} />
            )}
            <div className="hn-st-more">
              <button
                type="button"
                className="hn-st-menu"
                aria-label={`Aktionen für ${partner?.name ?? "Rechnung"}`}
                aria-haspopup="menu"
                aria-expanded={menu?.feeId === fee.id}
                onClick={(event) => {
                  const anchor = event.currentTarget;
                  const rect = anchor.getBoundingClientRect();
                  setMenu(menu?.feeId === fee.id ? null : { feeId: fee.id, top: rect.bottom + 4, left: Math.max(8, rect.right - 224), anchor });
                }}
              >
                <Icon src={a.contextMenu} size={24} />
              </button>
            </div>
          </div>
        );
      })}
      {menu ? (
        <div className="hn-row-menu" ref={menuRef} role="menu" style={{ top: menu.top, left: menu.left }}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setInfoFeeId(menu.feeId);
              setMenu(null);
            }}
          >
            <span className="hn-menu-ico">
              <Icon src={a.info} size={18} />
            </span>
            Info zur Rechnung
          </button>
          {(() => {
            // A running workflow (not booked yet) of this invoice opens from the menu as well.
            const running = state.fees.find((entry) => entry.id === menu.feeId)?.correction;
            if (!running || running.status === "verbucht") return null;
            return (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  openRechnungWorkflow(menu.feeId);
                  setMenu(null);
                }}
              >
                <span className="hn-menu-ico">
                  <Icon src={a.moduleWorkflow} size={18} />
                </span>
                Workflow {running.workflow}
              </button>
            );
          })()}
        </div>
      ) : null}
      {infoFeeId ? <InvoiceInfoModal feeId={infoFeeId} onClose={closeInfo} /> : null}
    </>
  );
}

/** Versandart, Kundenberater and a placeholder column, folded out from Partner. */
function PartnerExtraCells({ partner, fee }: { partner: Partner | undefined; fee: Fee }) {
  const delivery = deliveryOf(partner);
  const advisor = advisorOf(partner?.advisor ?? "");
  const initials = advisor.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <>
      <div className="hn-st-stack hn-st-delivery">
        <strong>{delivery.label}</strong>
        <Lines lines={delivery.lines} />
      </div>
      <div className="hn-st-advisor">
        {advisor.photo ? (
          <img className="hn-st-advisor-photo" src={advisor.photo} alt="" width={28} height={28} />
        ) : (
          <span className="hn-st-advisor-photo initials">{initials}</span>
        )}
        <span className="hn-st-stack">
          <strong>{advisor.name || "-"}</strong>
          <small>{advisor.department}</small>
        </span>
      </div>
      <div className="hn-st-stack">
        <strong className="hn-st-strong">
          {fee.tariff} · € {money(fee.amount)} /Jahr
        </strong>
        <span className="hn-st-sub">Erstm. Verrechnung {formatDay(fee.createdAt)}</span>
      </div>
      <div className="hn-st-stack">
        {partner?.bankAccount ? (
          <>
            <strong className="hn-st-strong">{partner.name}</strong>
            <span className="hn-st-sub">{partner.bankAccount}</span>
          </>
        ) : (
          "-"
        )}
      </div>
      <div className="hn-st-muted">Lorem ipsum</div>
    </>
  );
}
