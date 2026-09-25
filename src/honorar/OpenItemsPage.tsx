import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel, servicePeriod } from "../lib/honorar/format";
import { missingFields, partnerOf, totals } from "../lib/honorar/queries";
import type { Fee, Partner } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { ConfirmModal, PartnerAvatar } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "due", label: "Fälligkeit", filter: true },
  { key: "method", label: "Zahlart / Leist.-zeitraum", filter: true },
  { key: "payment", label: "Status zur Zahlung", filter: true },
  { key: "reminder", label: "Zahlungserinnerung", filter: true },
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

function paymentLabel(fee: Fee) {
  if (fee.paid > 0 && fee.paid < fee.amount) return "Zu wenig bezahlt";
  return "Nicht bezahlt nach Zahlungsziel";
}

export function OpenItemsPage() {
  const { finanzenMonth } = useWorkflow();
  const { state, moveFeeToSingleInvoice, hideOpenFee } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState<{ feeId: string; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const moved = new Set(state.singleInvoices.map((invoice) => invoice.feeId).filter(Boolean));
  const fees = hidden
    ? []
    : state.fees.filter((fee) => fee.paymentStatus === "unpaid" && !fee.hiddenOpen && !moved.has(fee.id));

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
  const openCount = fees.length;
  const closedCount = state.openItems.filter((item) => item.status === "done").length;
  const rows = useMemo(() => {
    return fees
      .map((fee) => {
        const partner = partnerOf(state, fee.partnerId);
        const item = state.openItems.find((entry) => entry.feeId === fee.id);
        const text: Record<ColumnKey, string> = {
          partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
          due: monthLabel(fee.month),
          method: `${fee.paymentMethod} ${servicePeriod(fee.month)}`,
          payment: paymentLabel(fee),
          reminder: item?.status === "reminder_sent" ? "Zahlungserinnerung versendet" : "Keine Erinnerung",
          amount: `${money(fee.amount)} ${fee.tariff}`,
          paid: `${money(fee.paid)} ${fee.tariff}`,
          captured: `${capturedWhen(fee.createdAt)} ${fee.createdBy}`,
        };
        return { fee, partner, text };
      })
      .filter((row) =>
        COLUMNS.every((column) => {
          const query = filters[column.key]?.trim().toLowerCase();
          return !query || row.text[column.key].toLowerCase().includes(query);
        }),
      );
  }, [fees, filters, state]);
  const sum = totals(rows.map((row) => row.fee));

  return (
    <section className="freigaben hn-panel hn-status">
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">{finanzenMonth.slice(0, 4)}</p>
      <h2 className="hn-h2 hn-status-title">Offene Posten</h2>

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
        <span />
        <button type="button" className="hn-clear" onClick={() => setConfirmClear(true)}>
          <Icon src={a.trash} size={18} />
          Liste leeren
        </button>
      </div>

      <div className="hn-status-table open" role="table" aria-label="Offene Posten">
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

        {rows.map(({ fee, partner, text }) => {
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
              <div>{text.due}</div>
              <div className="hn-st-stack">
                <span>{fee.paymentMethod}</span>
                <span>{servicePeriod(fee.month)}</span>
              </div>
              <div className="hn-st-note">
                <Icon src={a.onhold} size={16} />
                <span>{text.payment}</span>
              </div>
              <div className="hn-st-note">
                <Icon src={a.onhold} size={16} />
                <span>{text.reminder}</span>
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
        })}
      </div>

      {menu ? (
        <div className="hn-row-menu" ref={menuRef} role="menu" style={{ top: menu.top, left: menu.left }}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              moveFeeToSingleInvoice(menu.feeId);
              setMenu(null);
            }}
          >
            <span className="hn-menu-ico">
              <img className="doc" src={a.hnMenuDoc} alt="" width={15.6639} height={19.5} />
              <img className="user" src={a.hnMenuUser} alt="" width={8.85974} height={9.09676} />
            </span>
            Einzelfaktura /<br />
            Gutschrift erstellen
          </button>
          <hr />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              hideOpenFee(menu.feeId);
              setMenu(null);
            }}
          >
            <span className="hn-menu-ico">
              <img className="trash" src={a.hnMenuDelete} alt="" width={16.25} height={20.5} />
            </span>
            Löschen
          </button>
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
    </section>
  );
}
