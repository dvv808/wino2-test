import { useMemo, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel } from "../lib/honorar/format";
import { feesOfMonth, missingFields, monthOf, partnerOf, previousFees, statusKpis } from "../lib/honorar/queries";
import type { Fee, Partner } from "../types/honorar";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { ConfirmModal, PartnerAvatar, StepEmpty } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "address", label: "Anschrift", filter: true },
  { key: "channel", label: "Versandart", filter: true },
  { key: "status", label: "Status", filter: true },
  { key: "bmd", label: "Rechnung erstellt von/am (BMD)", filter: true },
  { key: "sent", label: "Versendet von/am", filter: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function capturedWhen(iso: string) {
  const formatted = formatDate(iso);
  const [day, time] = formatted.split(" ");
  return time ? `${day} - ${time}` : formatted;
}

function addressLines(address: string) {
  const [street, ...rest] = address.split(",");
  return { street: street.trim(), city: rest.join(",").trim() };
}

function partnerMeta(partner: Partner) {
  const bits = [partner.birthDate, partner.nickname ? `(vulgo ${partner.nickname})` : ""].filter(Boolean);
  return bits.join(" ");
}

function statusLine(fee: Fee) {
  if (fee.invoiceStatus === "sent") return "Rechnung versendet";
  if (fee.invoiceStatus === "send_failed") return "Versand fehlgeschlagen";
  if (fee.invoiceStatus === "not_created") return "Rechnung von BMD noch nicht erstellt";
  return "Rechnung erstellt, wartet auf Versand";
}

function createdLine(iso: string, user: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return `Erstellt von ${user}`;
  const clock = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `Erstellt am ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}, ${clock} Uhr von ${user}`;
}

function channelText(partner: Partner | undefined) {
  if (!partner || partner.deliveryMethod === "print") return "Post";
  return `Mail ${partner.email}`;
}

function rowText(fee: Fee, partner: Partner | undefined): Record<ColumnKey, string> {
  return {
    partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
    address: partner?.address ?? "",
    channel: channelText(partner),
    status: statusLine(fee),
    bmd: `${capturedWhen(fee.createdAt)} ${fee.createdBy}`,
    sent: fee.sentAt ? capturedWhen(fee.sentAt) : "",
  };
}

export function DispatchStep() {
  const { finanzenMonth } = useWorkflow();
  const { state, importCaptureData, clearMonthFees, sendInvoices } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [askSend, setAskSend] = useState(false);
  const [openGroups, setOpenGroups] = useState({ post: true, mail: true });

  const fees = feesOfMonth(state, finanzenMonth);
  const month = monthOf(state, finanzenMonth);
  const carrierReady =
    Boolean(month?.closed) ||
    Boolean(month?.steps.dataCarrier) ||
    state.history.some(
      (entry) => entry.refType === "month" && entry.refId === finanzenMonth && entry.action === "Datenträger erstellt",
    );
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

  const post = rows.filter((row) => row.partner?.deliveryMethod === "print");
  const mail = rows.filter((row) => row.partner?.deliveryMethod !== "print");
  const sent = [...state.history]
    .reverse()
    .find((entry) => entry.refType === "month" && entry.refId === finanzenMonth && entry.action === "Rechnungen versendet");

  function download() {
    const header = ["Partner", "Anschrift", "Versandart", "Status", "Rechnung erstellt von/am (BMD)", "Versendet von/am"];
    const lines = rows.map((row) =>
      [row.partner?.name ?? "", row.text.address, row.text.channel, row.text.status, row.text.bmd, row.text.sent]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Versand_${finanzenMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadCarrier() {
    const name = `Honorar_${finanzenMonth}.xml`;
    const body = fees
      .map((fee) => {
        const partner = state.partners.find((entry) => entry.id === fee.partnerId);
        return `  <Honorar partner="${partner?.name ?? fee.partnerId}" betrag="${fee.amount.toFixed(2)}"/>`;
      })
      .join("\n");
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n<Datentraeger monat="${finanzenMonth}">\n${body}\n</Datentraeger>\n`], {
      type: "application/xml",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggle(group: "post" | "mail") {
    setOpenGroups((current) => ({ ...current, [group]: !current[group] }));
  }

  return (
    <section className="freigaben hn-panel hn-status">
      <div className="hn-dispatch-bar">
        <div>
          <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
          <p className="hn-month">
            <strong>{monthLabel(finanzenMonth)}</strong> {finanzenMonth.slice(0, 4)}
          </p>
          <h2 className="hn-h2 hn-status-title">Empfangene Daten verarbeiten</h2>
        </div>
        {carrierReady && fees.length > 0 && !sent ? (
          <button type="button" className="hn-send" onClick={() => setAskSend(true)}>
            <img src={a.hnMailSent} alt="" width={16.941} height={18} />
            Rechnungen jetzt verschicken
          </button>
        ) : null}
      </div>
      {sent ? (
        <article className="hn-carrier-done" style={{ backgroundImage: `url(${a.hnCarrierDone})` }}>
          <p className="hn-carrier-done-title">
            <img src={a.hnCarrierCheck} alt="" width={24} height={24} />
            Rechnungen versendet.
          </p>
          <p className="hn-carrier-done-meta">{createdLine(sent.timestamp, sent.user)}</p>
          <p className="hn-carrier-done-link">
            <img src={a.comment} alt="" width={12.5358} height={13.5} />
            1 Kommentar
          </p>
          <button type="button" className="hn-carrier-done-link" onClick={downloadCarrier}>
            <img src={a.download} alt="" width={14.5} height={13.6583} />
            Datenträger herunterladen
          </button>
        </article>
      ) : null}

      {!carrierReady ? (
        <StepEmpty
          icon={a.navMail}
          title="Noch keine Daten empfangen"
          lead="Datenträger und BMD-Aufgaben müssen zuerst erledigt werden"
        />
      ) : fees.length === 0 ? (
        <StepEmpty
          icon={a.navMail}
          title="Noch keine Daten empfangen"
          lead="Der Datenträger wird zuerst erstellt und in BMD verarbeitet"
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

          <div className="hn-status-table dispatch" role="table" aria-label="Empfangene Daten verarbeiten">
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
              <div />
            </div>

            <Group label="Postversand" open={openGroups.post} onToggle={() => toggle("post")} rows={post} />
            <Group label="Mailversand" open={openGroups.mail} onToggle={() => toggle("mail")} rows={mail} />
          </div>

          {askSend ? (
            <div className="wmodal" role="dialog" aria-label="Rechnungen verschicken.">
              <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={() => setAskSend(false)} />
              <div className="wmodal-body send-ask">
                <button type="button" className="wmodal-close" aria-label="Schließen" onClick={() => setAskSend(false)}>
                  <img src={a.iconCloseDark} alt="" width={16} height={16} />
                </button>
                <h2>Rechnungen verschicken.</h2>
                <p>
                  Achtung, alle Partner in Schritt 3, Empfangene Daten werden entweder via Mail oder per Post eine Rechnung
                  erhalten.
                </p>
                <footer className="wmodal-foot send-ask">
                  <button type="button" className="btn-secondary" onClick={() => setAskSend(false)}>
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      sendInvoices(finanzenMonth);
                      setAskSend(false);
                    }}
                  >
                    Erstellen
                  </button>
                </footer>
              </div>
            </div>
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

function Group({
  label,
  open,
  onToggle,
  rows,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  rows: { fee: Fee; partner: Partner | undefined; text: Record<ColumnKey, string> }[];
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <div className="hn-st-group" role="row">
        <button type="button" className={open ? undefined : "closed"} aria-expanded={open} onClick={onToggle}>
          <Icon src={a.chevronDown} size={18} />
          {label}
        </button>
      </div>
      {open
        ? rows.map(({ fee, partner, text }) => {
            const locked = missingFields(fee, partner).length > 0;
            const address = addressLines(partner?.address ?? "");
            const waiting = fee.invoiceStatus === "created" || fee.invoiceStatus === "not_created";
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
                <div className="hn-st-stack">
                  <span>{partner?.deliveryMethod === "print" ? "Post" : "Mail"}</span>
                  {partner && partner.deliveryMethod !== "print" ? <span>{partner.email}</span> : null}
                </div>
                <div className="hn-st-note">
                  <Icon src={waiting || fee.invoiceStatus === "send_failed" ? a.onhold : a.confirm} size={16} />
                  <span>{text.status}</span>
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
                <div className="hn-st-captured">
                  {fee.sentAt ? (
                    <span>
                      {capturedWhen(fee.sentAt)}
                      <small>{fee.sentTo}</small>
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
          })
        : null}
    </>
  );
}
