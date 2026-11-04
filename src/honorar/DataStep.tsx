import { zahlartLabel } from "./invoiceCells";
import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel, servicePeriod } from "../lib/honorar/format";
import { feesOfMonth, missingFields, monthOf, partnerOf } from "../lib/honorar/queries";
import type { Fee, Partner, PaymentMethod } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { ColumnFilter, FilterSummary, filterInputProps, matchesFilter, type FilterGroup } from "./ColumnFilter";
import { useHonorar } from "./store";
import { ConfirmModal, PartnerAvatar, PartnerOpenButton, ProfileDueMenu, RequiredCommentModal, StepEmpty, HnKicker, StickyScroll } from "./ui";

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
    method: [zahlartLabel(fee.paymentMethod), fee.paymentMethodChange ? `Zahlart geändert ${fee.paymentMethodChange.comment}` : ""].join(" "),
    period: servicePeriod(fee.month),
    bank: bankText(partner),
    due: `${money(fee.amount)} ${fee.tariff}`,
    captured: `${capturedWhen(fee.createdAt)} ${fee.createdBy}`,
  };
}

type DataRow = { fee: Fee; partner: Partner | undefined; text: Record<ColumnKey, string> };

function otherMethod(method: PaymentMethod): PaymentMethod {
  return method === "Abbucher" ? "Rechnung" : "Abbucher";
}

const METHODS: PaymentMethod[] = ["Abbucher", "Rechnung"];

/** Zahlart dropdown in the row. Picking the other Zahlart asks for a comment before it changes. */
function MethodSelect({ fee, onSwitch }: { fee: Fee; onSwitch: (fee: Fee) => void }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pos) return;
    const away = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setPos(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPos(null);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [pos]);

  return (
    <>
      <button
        type="button"
        className={pos ? "hn-st-method open" : "hn-st-method"}
        aria-haspopup="listbox"
        aria-expanded={Boolean(pos)}
        onClick={(event) => {
          if (pos) return setPos(null);
          const rect = event.currentTarget.getBoundingClientRect();
          setPos({ top: rect.bottom + 4, left: rect.left });
        }}
      >
        {zahlartLabel(fee.paymentMethod)}
        <Icon src={a.chevronDown} size={14} />
      </button>
      {pos ? (
        <div className="hn-row-menu hn-method-menu" ref={ref} role="listbox" aria-label="Zahlart" style={{ top: pos.top, left: pos.left }}>
          {METHODS.map((method) => (
            <button
              type="button"
              role="option"
              aria-selected={method === fee.paymentMethod}
              key={method}
              onClick={() => {
                setPos(null);
                if (method !== fee.paymentMethod) onSwitch(fee);
              }}
            >
              {zahlartLabel(method)}
              {method === fee.paymentMethod ? <Icon src={a.hnCheckTick} size={16} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Flat list of the captured rows - no Zahlart group headers. */
function DataRows({ rows, onSwitchMethod }: { rows: DataRow[]; onSwitchMethod: (fee: Fee) => void }) {
  return (
    <>
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
                  <PartnerOpenButton partner={partner} />
                </div>
                <div className="hn-st-stack">
                  <span>{address.street}</span>
                  {address.city ? <span>{address.city}</span> : null}
                </div>
                <div className="hn-st-stack">
                  <MethodSelect fee={fee} onSwitch={onSwitchMethod} />
                  {fee.paymentMethodChange ? (
                    <small className="hn-st-edited">
                      Geändert, vorher {zahlartLabel(fee.paymentMethodChange.from)}
                      <br />
                      „{fee.paymentMethodChange.comment}“
                    </small>
                  ) : null}
                </div>
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
                  <ProfileDueMenu />
                </div>
              </div>
            );
          })}
    </>
  );
}

export function DataStep() {
  const { finanzenMonth } = useWorkflow();
  const { state, importCaptureData, clearMonthFees, setStepDone, patchFee } = useHonorar();
  const dataDone = Boolean(monthOf(state, finanzenMonth)?.steps.data);
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  // Zahlart switch waiting for its confirmation comment.
  const [switchFee, setSwitchFee] = useState<Fee | null>(null);

  const fees = feesOfMonth(state, finanzenMonth);
  const baseRows = useMemo(() => {
    return fees
      .map((fee) => {
        const partner = partnerOf(state, fee.partnerId);
        return { fee, partner, text: rowText(fee, partner) };
      });
  }, [fees, state]);
  // Zahlart: the two methods, and whether it was switched here (the comment stays searchable in the field).
  const groups: Partial<Record<ColumnKey, FilterGroup[]>> = {
    method: [
      { label: "Zahlart", options: ["SEPA-Lastschrift", "Überweisung"] },
      { label: "Änderung", options: ["Zahlart geändert"] },
    ],
  };
  const rows = useMemo(
    () => baseRows.filter((row) => COLUMNS.every((column) => matchesFilter(filters[column.key], row.text[column.key]))),
    [baseRows, filters],
  );

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
      <HnKicker>Rechnungsversand</HnKicker>
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
          <button
            type="button"
            className="hn-done-toggle"
            role="switch"
            aria-checked={dataDone}
            onClick={() => setStepDone(finanzenMonth, "data", !dataDone)}
          >
            Als Fertig markieren
            <span className={dataDone ? "switch on" : "switch"} />
          </button>
        </div>
      </div>

      <FilterSummary filters={filters} shown={rows.length} total={baseRows.length} onReset={() => setFilters({})} />
      <StickyScroll>
      <div className="hn-status-table data" role="table" aria-label="Daten erfassen">
        <div className="hn-st-bands" role="row" aria-hidden>
          <div className="hn-st-band" style={{ gridColumn: "1 / 3" }}>
            Daten für Datenträger PERSON
          </div>
          <div className="hn-st-band" style={{ gridColumn: "3 / 8" }}>
            Daten für Datenträger RECHNUNG
          </div>
        </div>
        <div className="hn-st-head" role="row">
          {COLUMNS.map((column) => (
            <div className="hn-st-th" role="columnheader" key={column.key}>
              <span className="hn-st-label">
                {column.label}
                {column.filter ? <ColumnFilter
                    label={column.label}
                    value={filters[column.key] ?? ""}
                    samples={baseRows.map((row) => row.text[column.key])}
                    groups={groups[column.key]}
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

        <DataRows rows={rows} onSwitchMethod={setSwitchFee} />
      </div>
      </StickyScroll>
      {switchFee ? (
        <RequiredCommentModal
          title={`Zahlart auf ${zahlartLabel(otherMethod(switchFee.paymentMethod))} ändern`}
          text={`${partnerOf(state, switchFee.partnerId)?.name ?? "Der Partner"} zahlt dann per ${zahlartLabel(otherMethod(switchFee.paymentMethod))} statt per ${zahlartLabel(switchFee.paymentMethod)}. Bitte begründe die Änderung.`}
          confirmLabel="Änderung bestätigen"
          onCancel={() => setSwitchFee(null)}
          onConfirm={(comment) => {
            patchFee(switchFee.id, {
              paymentMethod: otherMethod(switchFee.paymentMethod),
              paymentMethodChange: { from: switchFee.paymentMethod, comment },
            });
            setSwitchFee(null);
          }}
        />
      ) : null}
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
