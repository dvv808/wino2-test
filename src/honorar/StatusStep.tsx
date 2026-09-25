import { useMemo, useState } from "react";
import * as a from "../assets/index";
import { formatDate, formatDay, monthLabel, servicePeriod } from "../lib/honorar/format";
import { feesOfMonth, missingFields, partnerOf, previousFees, statusKpis, totals } from "../lib/honorar/queries";
import type { Fee, Partner } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { PartnerAvatar, StepEmpty } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "invoice", label: "Status zur Rechnung", filter: true },
  { key: "method", label: "Zahlart", filter: true },
  { key: "period", label: "Leistungszeitraum", filter: true },
  { key: "payment", label: "Status zur Zahlung", filter: true },
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
  if (fee.invoiceStatus === "send_failed") return "Versand fehlgeschlagen";
  return fee.sentAt ? `Rechnung versendet am ${formatDay(fee.sentAt)}` : "Rechnung versendet";
}

function paymentLine(fee: Fee) {
  if (fee.invoiceStatus === "not_created" || fee.invoiceStatus === "created") return "Rechnung noch nicht versendet";
  if (fee.paymentStatus === "paid") return "Bezahlt";
  if (fee.paymentStatus === "unpaid") return "Nicht bezahlt nach Zahlungsziel";
  if (fee.paymentStatus === "handed_to_op") return "An Offene Posten übergeben";
  return "Offen vor Zahlungsziel, warte auf Zahlung.";
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

function rowText(fee: Fee, partner: Partner | undefined): Record<ColumnKey, string> {
  return {
    partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
    invoice: invoiceLine(fee),
    method: fee.paymentMethod,
    period: servicePeriod(fee.month),
    payment: paymentLine(fee),
    due: `${money(fee.amount)} ${fee.tariff}`,
    paid: `${money(fee.paid)} ${fee.tariff}`,
    captured: `${capturedWhen(fee.createdAt)} ${fee.createdBy}`,
  };
}

export function StatusStep() {
  const { finanzenMonth } = useWorkflow();
  const { state, importCaptureData } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});

  const fees = feesOfMonth(state, finanzenMonth);
  const kpis = statusKpis(previousFees(state, finanzenMonth));
  const rows = useMemo(() => {
    return fees
      .map((fee) => {
        const partner = partnerOf(state, fee.partnerId);
        return { fee, partner, text: rowText(fee, partner) };
      })
      .filter((row) =>
        COLUMNS.every((column) => {
          const query = filters[column.key]?.trim().toLowerCase();
          return !query || row.text[column.key].toLowerCase().includes(query);
        }),
      );
  }, [fees, filters, state]);
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
      <div className="hn-stats">
        <article className="stat-card dark">
          <div className="stat-copy">
            <small>Offen</small>
            <strong>{String(kpis.needed).padStart(2, "0")}</strong>
            <span>Zahlungen</span>
          </div>
          <span className="stat-icon">
            <Icon src={a.onhold} size={16} />
          </span>
        </article>
        <article className="stat-card">
          <div className="stat-copy">
            <small>Abgeschl.</small>
            <strong>{String(kpis.done).padStart(2, "0")}</strong>
            <span>Zahlungen</span>
          </div>
          <span className="stat-icon">
            <Icon src={a.confirm} size={16} />
          </span>
        </article>
      </div>

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
              <div className="hn-st-note">
                <Icon src={fee.invoiceStatus === "sent" ? a.confirm : a.onhold} size={16} />
                <span>{text.invoice}</span>
              </div>
              <div>{text.method}</div>
              <div className="hn-st-period">{text.period}</div>
              <div className="hn-st-note">
                <Icon src={a.onhold} size={16} />
                <span>{text.payment}</span>
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
                <button type="button" className="hn-st-menu" aria-label="Aktionen">
                  <Icon src={a.contextMenu} size={24} />
                </button>
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
