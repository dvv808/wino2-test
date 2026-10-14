import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel, servicePeriod } from "../lib/honorar/format";
import { isOpenItemFee, missingFields, partnerOf, totals } from "../lib/honorar/queries";
import type { Fee, Partner } from "../types/honorar";
import { Icon, Snackbar } from "../ui";
import { useWorkflow } from "../workflow";
import { ColumnFilter, filterInputProps, matchesFilter } from "./ColumnFilter";
import { useHonorar } from "./store";
import { setFocusFee } from "./focusFee";
import { setPendingCredit } from "./pendingCredit";
import { invoiceLine, PaymentCell, paymentLine, reminderLine } from "./StatusStep";
import { ConfirmModal, PartnerAvatar, StatCards, type StatFilter } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "payment", label: "Status zur Zahlung", filter: true },
  { key: "reminder", label: "Status Rechnungsversand", filter: true },
  { key: "due", label: "Fälligkeit", filter: true },
  { key: "method", label: "Zahlart / Leist.-zeitraum", filter: true },
  { key: "amount", label: "Zu zahlender Honorarbetrag", filter: true },
  { key: "paid", label: "Bezahlter Honorarbetrag", filter: true },
  { key: "captured", label: "Erfasst", filter: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

function capturedWhen(iso: string) {
  const formatted = formatDate(iso);
  const [day, time] = formatted.split(" ");
  return time ? `${day} - ${time}` : formatted;
}

function partnerMeta(partner: Partner) {
  return [partner.birthDate, partner.nickname ? `(vulgo ${partner.nickname})` : ""].filter(Boolean).join(" ");
}

/** `followToSingleInvoice`: after a Gutschrift the user lands in Einzelfaktura, like after "Zahlungsziel ändern". */
export function OpenItemsPage({ followToSingleInvoice = false }: { followToSingleInvoice?: boolean } = {}) {
  const { finanzenMonth, openFinanzen, openPartnerInkasso } = useWorkflow();
  const { state, moveFeeToSingleInvoice, hideOpenFee } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // "Offen" is selected by default, so the table starts out showing only open items.
  const [stat, setStat] = useState<StatFilter>("open");
  const [menu, setMenu] = useState<{ feeId: string | null; top: number; left: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Rows are grouped by Zahlart (Abbucher / Rechnung), the same way Status zu Rechnungen groups them.
  const [openGroups, setOpenGroups] = useState({ abbucher: true, rechnung: true });
  const menuRef = useRef<HTMLDivElement>(null);

  const creditOf = (fee: Fee) => {
    if (fee.creditAmount !== undefined) return fee.creditAmount;
    return state.singleInvoices.find((invoice) => invoice.feeId === fee.id && invoice.credit)?.credit;
  };
  const openFees = hidden ? [] : state.fees.filter((fee) => isOpenItemFee(state, fee));
  // Closed items: invoices that were paid late (after a reminder or after two months).
  const doneFees = state.fees.filter((fee) => (fee.paymentStatus === "paid" && fee.paidLate) || fee.settledVia);
  const fees = stat === "open" ? openFees : stat === "done" ? doneFees : [...openFees, ...doneFees];
  const openCount = openFees.length;
  const closedCount = doneFees.length;

  useEffect(() => {
    if (!menu) return;
    function close(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);
  const baseRows = useMemo(() => {
    return fees
      .map((fee) => {
        const partner = partnerOf(state, fee.partnerId);
        const text: Record<ColumnKey, string> = {
          partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
          due: monthLabel(fee.month),
          method: `${fee.paymentMethod} ${servicePeriod(fee.month)}`,
          payment: paymentLine(fee, creditOf(fee), true),
          // Abbucher never has an invoice dispatch; a Rechnung in Offene Posten has always been reminded by now.
          reminder:
            fee.paymentMethod === "Abbucher"
              ? "Kein Rechnungsversand"
              : `${invoiceLine(fee, partner)} ${reminderLine(fee, partner) || "Zahlungserinnerung versendet"}`.trim(),
          amount: `${money(fee.amount)} ${fee.tariff}`,
          paid: `${money(fee.paid)} ${fee.tariff}`,
          captured: `${capturedWhen(fee.createdAt)} ${fee.createdBy}`,
        };
        return { fee, partner, text };
      });
  }, [fees, state]);
  const rows = useMemo(
    () => baseRows.filter((row) => COLUMNS.every((column) => matchesFilter(filters[column.key], row.text[column.key]))),
    [baseRows, filters],
  );
  const sum = totals(rows.map((row) => row.fee));
  const abbucherRows = rows.filter((row) => row.fee.paymentMethod === "Abbucher");
  const rechnungRows = rows.filter((row) => row.fee.paymentMethod === "Rechnung");
  const selectedOpenIds = openFees.filter((fee) => selected.has(fee.id)).map((fee) => fee.id);
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.fee.id));

  function toggleOne(feeId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(feeId)) next.delete(feeId);
      else next.add(feeId);
      return next;
    });
  }

  function toggleMany(list: typeof rows) {
    setSelected((current) => {
      const next = new Set(current);
      const everything = list.every((row) => next.has(row.fee.id));
      list.forEach((row) => (everything ? next.delete(row.fee.id) : next.add(row.fee.id)));
      return next;
    });
  }

  const renderRow = ({ fee, partner, text }: (typeof rows)[number]) => {
          const locked = missingFields(fee, partner).length > 0;
          return (
            <div className={selected.has(fee.id) ? "hn-st-row selected" : "hn-st-row"} role="row" key={fee.id}>
              <div className="hn-st-select">
                <label className="hn-tickbox bare">
                  <input
                    type="checkbox"
                    aria-label={`${partner?.name ?? "Zeile"} auswählen`}
                    checked={selected.has(fee.id)}
                    onChange={() => toggleOne(fee.id)}
                  />
                  <span className="hn-tickbox-box" aria-hidden>
                    {selected.has(fee.id) ? <img src={a.hnCheckTick} alt="" width={16} height={16} /> : null}
                  </span>
                </label>
              </div>
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
              <PaymentCell fee={fee} credit={creditOf(fee)} compact />
              {fee.paymentMethod === "Abbucher" ? (
                // A direct debit never goes through the invoice dispatch, so this is neither clickable nor an icon status.
                <div className="hn-st-note muted">
                  <span>{text.reminder}</span>
                </div>
              ) : (
                <div
                  className={fee.paymentStatus === "paid" || fee.paymentStatus === "open_before_due" ? "hn-st-note" : "hn-st-note link"}
                  {...(fee.paymentStatus === "paid" || fee.paymentStatus === "open_before_due"
                    ? {}
                    : {
                        role: "button",
                        tabIndex: 0,
                        title: "Zu Zahlungserinnerungen",
                        onClick: () => {
                          setFocusFee(fee.id);
                          openFinanzen("month", fee.month, "reminders");
                        },
                        onKeyDown: (event: React.KeyboardEvent) => {
                          if (event.key !== "Enter") return;
                          setFocusFee(fee.id);
                          openFinanzen("month", fee.month, "reminders");
                        },
                      })}
                >
                  <Icon src={fee.reminderSentAt || fee.paymentStatus === "paid" ? a.confirm : a.onhold} size={16} />
                  <span>{text.reminder}</span>
                  {fee.paymentStatus === "paid" ? (
                    <img className="hn-st-info" src={a.infoFull} alt="" width={16} height={16} title="Bezahlt, aber nicht rechtzeitig" />
                  ) : null}
                </div>
              )}
              <div>{text.due}</div>
              <div className="hn-st-stack">
                <span>{fee.paymentMethod}</span>
                <span>{servicePeriod(fee.month)}</span>
              </div>
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
                <button
                  type="button"
                  className="hn-st-menu"
                  aria-label="Aktionen"
                  aria-expanded={menu?.feeId === fee.id}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setMenu({ feeId: fee.id, top: rect.bottom + 4, left: Math.max(8, rect.right - 224) });
                  }}
                >
                  <Icon src={a.contextMenu} size={24} />
                </button>
              </div>
            </div>
          );
        };

  const renderGroup = (key: "abbucher" | "rechnung", label: string, list: typeof rows) => {
    if (list.length === 0) return null;
    const open = openGroups[key];
    const everything = list.every((row) => selected.has(row.fee.id));
    return (
      <>
        <div className="hn-st-group" role="row">
          <div className="hn-st-group-bar">
            <button
              type="button"
              className={open ? undefined : "closed"}
              aria-expanded={open}
              onClick={() => setOpenGroups((current) => ({ ...current, [key]: !current[key] }))}
            >
              <Icon src={a.chevronDown} size={18} />
              {label}
            </button>
            <button type="button" className="hn-st-mark-all" onClick={() => toggleMany(list)}>
              {everything ? "Auswahl aufheben" : "Alle auswählen"}
            </button>
          </div>
        </div>
        {open ? list.map(renderRow) : null}
      </>
    );
  };

  return (
    <section className="freigaben hn-panel hn-status">
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">{finanzenMonth.slice(0, 4)}</p>
      <h2 className="hn-h2 hn-status-title">Offene Posten</h2>

<StatCards open={openCount} done={closedCount} unit="Zahlungen" value={stat} onChange={setStat} />

      <div className="hn-status-tools">
        {selected.size > 0 ? (
          <button
            type="button"
            className="hn-drop"
            aria-expanded={menu?.feeId === null}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setMenu({ feeId: null, top: rect.bottom + 4, left: rect.left });
            }}
          >
            {selected.size} ausgewählt · Aktionen
            <Icon src={a.chevronDown} size={18} />
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="hn-clear" onClick={() => setConfirmClear(true)}>
          <Icon src={a.trash} size={18} />
          Liste leeren
        </button>
      </div>

      <div className="hn-status-table open" role="table" aria-label="Offene Posten">
        <div className="hn-st-head" role="row">
          <div className="hn-st-th hn-st-select" role="columnheader">
            <label className="hn-tickbox bare" title="Alle auswählen">
              <input type="checkbox" aria-label="Alle auswählen" checked={allSelected} onChange={() => toggleMany(rows)} />
              <span className="hn-tickbox-box" aria-hidden>
                {allSelected ? <img src={a.hnCheckTick} alt="" width={16} height={16} /> : null}
              </span>
            </label>
          </div>
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
          <div />
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

        {renderGroup("abbucher", "Abbucher", abbucherRows)}
        {renderGroup("rechnung", "Rechnung", rechnungRows)}
      </div>

      {menu ? (
        <div className="hn-row-menu" ref={menuRef} role="menu" style={{ top: menu.top, left: menu.left }}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (menu.feeId) moveFeeToSingleInvoice(menu.feeId);
              else selectedOpenIds.forEach((id) => moveFeeToSingleInvoice(id));
              if (followToSingleInvoice) {
                if (menu.feeId) setPendingCredit({ feeId: menu.feeId, withDueDate: false });
                openFinanzen("singleInvoices");
              }
              setSelected(new Set());
              setMenu(null);
            }}
          >
            <span className="hn-menu-ico">
              <img className="doc" src={a.hnMenuDoc} alt="" width={15.6639} height={19.5} />
              <img className="user" src={a.hnMenuUser} alt="" width={8.85974} height={9.09676} />
            </span>
            Gutschrift zu<br />
            Einzelfaktura erstellen
          </button>
          {menu.feeId ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const feeId = menu.feeId as string;
                moveFeeToSingleInvoice(feeId);
                setPendingCredit({ feeId, withDueDate: true });
                setMenu(null);
                openFinanzen("singleInvoices");
              }}
            >
              <span className="hn-menu-ico">
                <Icon src={a.calendar} size={18} />
              </span>
              Zahlungsziel ändern
            </button>
          ) : null}
          {menu.feeId ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const partnerId = state.fees.find((entry) => entry.id === menu.feeId)?.partnerId;
                setMenu(null);
                openPartnerInkasso("julia", partnerId);
              }}
            >
              <span className="hn-menu-ico">
                <Icon src={a.calendar} size={18} />
              </span>
              Zahlungsziel im Profil anpassen
            </button>
          ) : null}
          {menu.feeId ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const fee = state.fees.find((entry) => entry.id === menu.feeId);
                const advisor = fee ? partnerOf(state, fee.partnerId)?.advisor : undefined;
                setToast(`${advisor ?? "Der Berater"} wurde kontaktiert.`);
                setMenu(null);
              }}
            >
              <span className="hn-menu-ico">
                <Icon src={a.person} size={18} />
              </span>
              Berater kontaktieren
            </button>
          ) : null}
          <hr />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (menu.feeId) hideOpenFee(menu.feeId);
              else selectedOpenIds.forEach((id) => hideOpenFee(id));
              setSelected(new Set());
              setMenu(null);
            }}
          >
            <span className="hn-menu-ico">
              <img className="trash" src={a.hnMenuDelete} alt="" width={16.25} height={20.5} />
            </span>
            Löschen
          </button>
          {menu.feeId === null ? (
            <>
              <hr />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSelected(new Set());
                  setMenu(null);
                }}
              >
                Auswahl aufheben
              </button>
            </>
          ) : null}
        </div>
      ) : null}

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
      {toast ? <Snackbar message={toast} onClose={() => setToast(null)} /> : null}
    </section>
  );
}
