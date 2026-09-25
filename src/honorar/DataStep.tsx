import { useMemo, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel, servicePeriod } from "../lib/honorar/format";
import { feesOfMonth, missingFields, partnerOf, previousFees, statusKpis, totals } from "../lib/honorar/queries";
import type { Fee, Partner } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { ConfirmModal, PartnerAvatar, StepEmpty } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "address", label: "Anschrift", filter: true },
  { key: "method", label: "Zahlart", filter: true },
  { key: "period", label: "Leistungszeitraum", filter: true },
  { key: "bank", label: "Bankverbindung", filter: true },
  { key: "due", label: "Zu zahlender Honorarbetrag", filter: true },
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

function addressLines(address: string) {
  const [street, ...rest] = address.split(",");
  return { street: street.trim(), city: rest.join(",").trim() };
}

function bankText(partner: Partner | undefined) {
  if (!partner) return "";
  return [partner.name, partner.bankAccount].filter(Boolean).join(" ");
}

function rowText(fee: Fee, partner: Partner | undefined): Record<ColumnKey, string> {
  return {
    partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
    address: partner?.address ?? "",
    method: fee.paymentMethod,
    period: servicePeriod(fee.month),
    bank: bankText(partner),
    due: `${money(fee.amount)} ${fee.tariff}`,
    captured: `${capturedWhen(fee.createdAt)} ${fee.createdBy}`,
  };
}

export function DataStep() {
  const { finanzenMonth } = useWorkflow();
  const { state, importCaptureData, clearMonthFees } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [confirmClear, setConfirmClear] = useState(false);

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
    const header = ["Partner", "Anschrift", "Zahlart", "Leistungszeitraum", "Bankverbindung", "Zu zahlender Honorarbetrag", "Erfasst"];
    const lines = rows.map((row) =>
      [row.partner?.name ?? "", row.text.address, row.text.method, row.text.period, row.text.bank, money(row.fee.amount), row.text.captured]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Daten_${finanzenMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="freigaben hn-panel hn-status">
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">
        <strong>{monthLabel(finanzenMonth)}</strong> {finanzenMonth.slice(0, 4)}
      </p>
      <h2 className="hn-h2 hn-status-title">Daten erfassen</h2>

      {fees.length === 0 ? (
        <StepEmpty
          icon={a.hnCopy}
          title="Noch keine Daten erfasst"
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
          <button type="button" className="hn-clear" onClick={() => setConfirmClear(true)}>
            <Icon src={a.trash} size={18} />
            Liste leeren
          </button>
          <button type="button" className="hn-drop" onClick={download}>
            Liste herunterladen
            <Icon src={a.chevronDown} size={18} />
          </button>
        </div>
      </div>

      <div className="hn-status-table data" role="table" aria-label="Daten erfassen">
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
          <div />
        </div>

        {rows.map(({ fee, partner, text }) => {
          const locked = missingFields(fee, partner).length > 0;
          const address = addressLines(partner?.address ?? "");
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
              <div className="hn-st-stack">
                <span>{address.street}</span>
                {address.city ? <span>{address.city}</span> : null}
              </div>
              <div>{text.method}</div>
              <div className="hn-st-period">{text.period}</div>
              <div className="hn-st-stack">
                <span>{partner?.name}</span>
                {partner?.bankAccount ? <span>{partner.bankAccount}</span> : null}
              </div>
              <div className="hn-st-money">
                <strong>{money(fee.amount)}</strong>
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
      {confirmClear ? (
        <ConfirmModal
          title="Liste wirklich leeren?"
          text="Alle Honorare dieses Monats werden gelöscht."
          confirmLabel="Liste leeren"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clearMonthFees(finanzenMonth);
            setConfirmClear(false);
          }}
        />
      ) : null}
      </>
      )}
    </section>
  );
}
