import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel } from "../lib/honorar/format";
import { dispatchMismatches, feesOfMonth, missingFields, monthOf, partnerOf } from "../lib/honorar/queries";
import type { DispatchTab, Fee, Partner } from "../types/honorar";
import { Icon, Snackbar, WarnBox } from "../ui";
import { useWorkflow } from "../workflow";
import { ColumnFilter, filterInputProps, matchesFilter } from "./ColumnFilter";
import { useHonorar } from "./store";
import { INVOICE_FILE, InvoiceModal } from "./InvoiceModal";
import { MailAddressModal } from "./MailAddressModal";
import { PlausiCheck } from "./PlausiCheck";
import { PartnerAvatar, PartnerOpenButton, StatCards, StepEmpty, type StatFilter, HnKicker, StatsRow } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "status", label: "Status", filter: true },
  { key: "address", label: "Anschrift", filter: true },
  { key: "channel", label: "Versandart", filter: true },
  { key: "bmd", label: "Rechnung erstellt von/am (BMD)", filter: true },
  { key: "sent", label: "Versendet von/am", filter: true },
  { key: "document", label: "Rechnungsdokument", filter: true },
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

function statusLine(fee: Fee, bmdCreated: boolean) {
  if (fee.invoiceStatus === "sent") return "Versendet";
  if (fee.invoiceStatus === "send_failed") return "Mail nicht empfangen";
  if (!bmdCreated || fee.invoiceStatus === "not_created") return "Rechnung von BMD noch nicht erstellt";
  return "Rechnung erstellt, wartet auf Versand";
}

function createdLine(iso: string, user: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return `Erstellt von ${user}`;
  const clock = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `Erstellt am ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}, ${clock} Uhr von ${user}`;
}

function mailAddress(fee: Fee, partner: Partner | undefined) {
  return fee.mailTo ?? partner?.email ?? "";
}

function channelText(fee: Fee, partner: Partner | undefined) {
  if (!partner || partner.deliveryMethod === "print") return "Post";
  return `Mail ${mailAddress(fee, partner)}`;
}

function rowText(fee: Fee, partner: Partner | undefined, bmdCreated: boolean): Record<ColumnKey, string> {
  return {
    partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
    address: partner?.address ?? "",
    channel: channelText(fee, partner),
    status: statusLine(fee, bmdCreated),
    bmd: bmdCreated ? `${capturedWhen(fee.createdAt)} ${fee.createdBy}` : "",
    sent: fee.sentAt ? capturedWhen(fee.sentAt) : "",
    document: bmdCreated ? INVOICE_FILE : "",
  };
}

const TABS: { id: DispatchTab; label: string; icon: string }[] = [
  { id: "check", label: "Plausibilitätscheck", icon: a.plausiCheck },
  { id: "mail", label: "Mail-Versand", icon: a.navMail },
  { id: "post", label: "Post-Versand", icon: a.house },
];

export function DispatchStep() {
  const { finanzenMonth, openPartnerInkasso, openFinanzenStep } = useWorkflow();
  const { state, importCaptureData, sendInvoices, sendFeeMail, setPostSent, printPostInvoices, notifyAdvisor, setDispatchTabDone } =
    useHonorar();
  const month = monthOf(state, finanzenMonth);
  const tabDone = month?.dispatchDone ?? {};
  const closedMonth = Boolean(month?.closed || month?.steps.dispatch);
  const isTabDone = (tab: DispatchTab) => closedMonth || Boolean(tabDone[tab]);
  const [tab, setTab] = useState<DispatchTab>(() => TABS.find((entry) => !isTabDone(entry.id))?.id ?? "check");
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [askSend, setAskSend] = useState(false);
  const [askPost, setAskPost] = useState(false);
  const [stat, setStat] = useState<StatFilter>(null);
  const [openGroups, setOpenGroups] = useState({ failed: true, post: true, mail: true });
  const [invoiceFeeId, setInvoiceFeeId] = useState<string | null>(null);
  const [addressFeeId, setAddressFeeId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ feeId: string; top: number; left: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const monthFees = feesOfMonth(state, finanzenMonth);
  // Abbucher never goes through the invoice dispatch (mail/post) - the debit is settled directly in Infinity.
  const fees = monthFees.filter((fee) => fee.paymentMethod !== "Abbucher");
  const carrierReady =
    Boolean(month?.closed) ||
    Boolean(month?.steps.dataCarrier) ||
    state.history.some(
      (entry) => entry.refType === "month" && entry.refId === finanzenMonth && entry.action === "Datenträger erstellt",
    );
  // The invoice exists in BMD once step 2 is finished (all next steps ticked) or the invoice was already sent.
  const bmdCreated = Boolean(month?.closed) || Boolean(month?.steps.dataCarrier);
  const isBmdCreated = (fee: Fee) => bmdCreated || fee.invoiceStatus === "sent" || fee.invoiceStatus === "send_failed";
  const isPostFee = (fee: Fee) => partnerOf(state, fee.partnerId)?.deliveryMethod === "print";
  const mailFees = fees.filter((fee) => !isPostFee(fee));
  const postFees = fees.filter(isPostFee);
  const tabFees = tab === "post" ? postFees : mailFees;
  const statDone = tabFees.filter((fee) => fee.invoiceStatus === "sent").length;
  const statOpen = tabFees.length - statDone;
  const baseRows = useMemo(() => {
    return tabFees
      .filter((fee) => stat === null || (stat === "done") === (fee.invoiceStatus === "sent"))
      .map((fee) => {
        const partner = partnerOf(state, fee.partnerId);
        return { fee, partner, text: rowText(fee, partner, isBmdCreated(fee)) };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFees, state, stat]);
  const rows = useMemo(
    () => baseRows.filter((row) => COLUMNS.every((column) => matchesFilter(filters[column.key], row.text[column.key]))),
    [baseRows, filters],
  );

  const failed = rows.filter((row) => row.fee.invoiceStatus === "send_failed");
  const mail = rows.filter((row) => row.fee.invoiceStatus !== "send_failed");
  const mailSent = mailFees.length > 0 && mailFees.every((fee) => fee.invoiceStatus === "sent");
  const mailFailed = mailFees.filter((fee) => fee.invoiceStatus === "send_failed").length;
  const mailOk = mailFees.filter((fee) => fee.invoiceStatus === "sent").length;
  const postAllSent = postFees.length > 0 && postFees.every((fee) => fee.invoiceStatus === "sent");
  const checkClean =
    Boolean(month?.bmdDataLoaded) && monthFees.every((fee) => dispatchMismatches(fee, partnerOf(state, fee.partnerId)).length === 0);
  // Each tab can be marked Fertig only once its work is through.
  const canFinish: Record<DispatchTab, boolean> = {
    check: closedMonth || checkClean,
    mail: closedMonth || mailFees.length === 0 || mailSent,
    post: closedMonth || postFees.length === 0 || postAllSent,
  };
  const finishHint: Record<DispatchTab, string> = {
    check: "Erst möglich, wenn alle Daten aus BMD übereinstimmen.",
    mail: "Erst möglich, wenn alle E-Mail Rechnungen angekommen sind.",
    post: "Erst möglich, wenn alle Post-Rechnungen als versendet markiert sind.",
  };

  const menuFee = menu ? fees.find((entry) => entry.id === menu.feeId) : undefined;
  const menuPartner = menuFee ? partnerOf(state, menuFee.partnerId) : undefined;
  const menuIsMail = menuPartner ? menuPartner.deliveryMethod !== "print" : false;
  const sent = [...state.history]
    .reverse()
    .find((entry) => entry.refType === "month" && entry.refId === finanzenMonth && entry.action.startsWith("Rechnungen") && entry.action.endsWith("versendet"));
  // Seeded months never logged the send: the latest send date of their mails stands in.
  const lastMailSent = mailFees.map((fee) => fee.sentAt ?? "").sort().pop();
  const mailSentMeta = sent
    ? createdLine(sent.timestamp, sent.user)
    : lastMailSent
      ? `Versendet am ${formatDate(lastMailSent)}`
      : null;

  const postEntry = [...state.history]
    .reverse()
    .find((entry) => entry.refType === "month" && entry.refId === finanzenMonth && entry.action === "Post-Rechnungen gedruckt");
  const lastPostSent = postFees.map((fee) => fee.sentAt ?? "").sort().pop();
  const postDone = postEntry
    ? {
        title: postAllSent ? "Post-Rechnungen gedruckt und versendet." : "Post-Rechnungen gedruckt.",
        meta: createdLine(postEntry.timestamp, postEntry.user),
      }
    : postAllSent
      ? { title: "Post-Rechnungen versendet.", meta: lastPostSent ? `Versendet am ${formatDate(lastPostSent)}` : "" }
      : null;

  function download() {
    const header = [
      "Partner",
      "Anschrift",
      "Versandart",
      "Status",
      "Rechnung erstellt von/am (BMD)",
      "Versendet von/am",
      "Rechnungsdokument",
    ];
    const lines = rows.map((row) =>
      [
        row.partner?.name ?? "",
        row.text.address,
        row.text.channel,
        row.text.status,
        row.text.bmd,
        row.text.sent,
        row.text.document,
      ]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Versand_${tab === "post" ? "Post" : "Mail"}_${finanzenMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggle(group: "failed" | "post" | "mail") {
    setOpenGroups((current) => ({ ...current, [group]: !current[group] }));
  }

  function switchTab(next: DispatchTab) {
    setTab(next);
    setStat(null);
    setFilters({});
  }

  const handlers: RowHandlers = {
    isBmdCreated,
    onInvoice: setInvoiceFeeId,
    onMenu: (feeId, rect) => setMenu({ feeId, top: rect.bottom + 4, left: Math.max(8, rect.right - 260) }),
    onChangeAddress: setAddressFeeId,
    onResend: (feeId) => sendFeeMail(feeId),
    onPostSent: setPostSent,
    menuFeeId: menu?.feeId,
  };

  const doneToggle = (
    <button
      type="button"
      className="hn-done-toggle"
      role="switch"
      aria-checked={isTabDone(tab)}
      disabled={!isTabDone(tab) && !canFinish[tab]}
      title={!isTabDone(tab) && !canFinish[tab] ? finishHint[tab] : undefined}
      onClick={() => setDispatchTabDone(finanzenMonth, tab, !isTabDone(tab))}
    >
      Als Fertig markieren
      <span className={isTabDone(tab) ? "switch on" : "switch"} />
    </button>
  );

  return (
    <section className="freigaben hn-panel hn-status">
      {month && !month.steps.dataCarrier && !month.closed ? (
        <div className="hn-step-warn">
          <WarnBox>
            Bitte stelle sicher, dass du alle nötigen Schritte in{" "}
            <button type="button" className="hn-link" onClick={() => openFinanzenStep("carrier")}>
              Schritt 2
            </button>{" "}
            erledigt und abgehakt hast.
          </WarnBox>
        </div>
      ) : null}
      <div className="hn-dispatch-bar">
        <div>
          <HnKicker>Rechnungsversand</HnKicker>
          <p className="hn-month">
            <strong>{monthLabel(finanzenMonth)}</strong> {finanzenMonth.slice(0, 4)}
          </p>
          <h2 className="hn-h2 hn-status-title">Rechnungsversand</h2>
        </div>
        {carrierReady && tab === "mail" && mailFees.length > 0 ? (
          <div className="hn-send-actions">
            <button type="button" className="hn-send" disabled={!bmdCreated} onClick={() => setAskSend(true)}>
              Alle E-Mail Rechnungen verschicken
            </button>
          </div>
        ) : null}
        {carrierReady && tab === "post" && postFees.length > 0 ? (
          <div className="hn-send-actions">
            <button type="button" className="hn-send" disabled={!bmdCreated} onClick={() => setAskPost(true)}>
              Post-Rechnungen drucken
            </button>
          </div>
        ) : null}
      </div>

      <div className="hn-dispatch-tabs">
        <div className="freigaben-tabs" role="tablist" aria-label="Rechnungsversand">
          {TABS.map((entry) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              className={tab === entry.id ? "fg-tab active" : "fg-tab"}
              key={entry.id}
              onClick={() => switchTab(entry.id)}
            >
              <Icon src={entry.icon} size={20} />
              {entry.label}
              {isTabDone(entry.id) ? (
                <span className="badge done">
                  <Icon src={a.confirm} size={14} />
                  Fertig
                </span>
              ) : (
                <span className="badge">
                  <Icon src={a.onhold} size={14} />
                  Offen
                </span>
              )}
            </button>
          ))}
        </div>
        {carrierReady ? doneToggle : null}
      </div>

      {!carrierReady ? (
        <StepEmpty
          icon={a.navMail}
          title="Noch keine Daten empfangen"
          lead="Datenträger und BMD-Aufgaben müssen zuerst erledigt werden"
        />
      ) : tab === "check" ? (
        <PlausiCheck key={finanzenMonth} monthId={finanzenMonth} fees={monthFees} loaded={Boolean(month?.bmdDataLoaded)} />
      ) : tabFees.length === 0 ? (
        <StepEmpty
          icon={tab === "post" ? a.house : a.navMail}
          title={tab === "post" ? "Keine Post-Rechnungen" : "Keine E-Mail Rechnungen"}
          lead={`Diesen Monat geht keine Rechnung per ${tab === "post" ? "Post" : "Mail"} hinaus. Du kannst den Tab als Fertig markieren.`}
        />
      ) : (
        <>
          {tab === "mail" && mailSentMeta ? (
            <div className="hn-carrier-done-group">
              <article className="hn-carrier-done" style={{ backgroundImage: `url(${a.hnCarrierDone})` }}>
                <p className="hn-carrier-done-title">
                  <img src={a.confirm} alt="" width={24} height={24} />
                  E-Mail Rechnungen versendet.
                </p>
                <p className="hn-carrier-done-meta">{mailSentMeta}</p>
                <p className="hn-carrier-done-meta">
                  {mailOk} von {mailFees.length} angekommen
                  {mailFailed ? ` · ${mailFailed} nicht empfangen, bitte Adresse ändern oder erneut senden` : ""}
                </p>
              </article>
            </div>
          ) : null}
          {tab === "post" && postDone ? (
            <div className="hn-carrier-done-group">
              <article className="hn-carrier-done" style={{ backgroundImage: `url(${a.hnCarrierDone})` }}>
                <p className="hn-carrier-done-title">
                  <img src={a.confirm} alt="" width={24} height={24} />
                  {postDone.title}
                </p>
                <p className="hn-carrier-done-meta">{postDone.meta}</p>
              </article>
            </div>
          ) : null}

          <StatsRow fees={rows.map((row) => row.fee)} stats={<StatCards open={statOpen} done={statDone} unit="Rechnungen" value={stat} onChange={setStat} />} />

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

          <div className="hn-status-table dispatch" role="table" aria-label={tab === "post" ? "Post-Versand" : "Mail-Versand"}>
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

            {tab === "mail" ? (
              <>
                <Group
                  label="Mail nicht empfangen"
                  open={openGroups.failed}
                  onToggle={() => toggle("failed")}
                  rows={failed}
                  handlers={handlers}
                />
                <Group
                  label="Mailversand"
                  open={openGroups.mail}
                  onToggle={() => toggle("mail")}
                  rows={mail}
                  handlers={handlers}
                />
              </>
            ) : (
              <Group
                label="Postversand"
                open={openGroups.post}
                onToggle={() => toggle("post")}
                rows={rows}
                handlers={handlers}
                allMarked={rows.every(({ fee }) => fee.invoiceStatus === "sent")}
                onMarkAll={() =>
                  rows.every(({ fee }) => fee.invoiceStatus === "sent")
                    ? rows.forEach(({ fee }) => setPostSent(fee.id, false))
                    : rows.forEach(({ fee }) => fee.invoiceStatus !== "sent" && setPostSent(fee.id, true))
                }
              />
            )}
          </div>
        </>
      )}

      {menu && menuFee ? (
        <div
          className="hn-row-menu wide"
          ref={menuRef}
          role="menu"
          style={{ top: menu.top, left: menu.left }}
        >
          {menuIsMail ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  sendFeeMail(menuFee.id);
                  setMenu(null);
                }}
              >
                E-Mail versenden
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAddressFeeId(menuFee.id);
                  setMenu(null);
                }}
              >
                E-Mail Adresse ändern (Einmalig)
              </button>
              <hr />
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              openPartnerInkasso();
              setMenu(null);
            }}
          >
            Zahlungsziel im Profil anpassen
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              notifyAdvisor(menuFee.id, "Rückfrage zum Rechnungsversand");
              setToast(`${menuPartner?.advisor ?? "Der Berater"} wurde kontaktiert.`);
              setMenu(null);
            }}
          >
            Berater kontaktieren
          </button>
        </div>
      ) : null}

      {addressFeeId
        ? (() => {
            const fee = fees.find((entry) => entry.id === addressFeeId);
            if (!fee) return null;
            const partner = partnerOf(state, fee.partnerId);
            return (
              <MailAddressModal
                partnerName={partner?.name ?? ""}
                current={mailAddress(fee, partner)}
                onCancel={() => setAddressFeeId(null)}
                onSend={(email) => {
                  sendFeeMail(fee.id, email);
                  setAddressFeeId(null);
                }}
              />
            );
          })()
        : null}

      {toast ? <Snackbar message={toast} onClose={() => setToast(null)} /> : null}

      {invoiceFeeId ? (
        (() => {
          const fee = fees.find((entry) => entry.id === invoiceFeeId);
          if (!fee) return null;
          return (
            <InvoiceModal
              fee={fee}
              partner={partnerOf(state, fee.partnerId)}
              today={state.today}
              onClose={() => setInvoiceFeeId(null)}
            />
          );
        })()
      ) : null}

      {askSend ? (
        <div className="wmodal" role="dialog" aria-label="E-Mail Rechnungen verschicken">
          <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={() => setAskSend(false)} />
          <div className="wmodal-body send-ask">
            <button type="button" className="wmodal-close" aria-label="Schließen" onClick={() => setAskSend(false)}>
              <img src={a.iconCloseDark} alt="" width={16} height={16} />
            </button>
            <h2>{mailSent ? "E-Mail Rechnungen erneut verschicken?" : "E-Mail Rechnungen verschicken?"}</h2>
            <p>
              {mailSent
                ? "Die E-Mail Rechnungen wurden bereits versendet. Möchtest du sie wirklich noch einmal an die Partner verschicken?"
                : `${mailFees.length} ${mailFees.length === 1 ? "Rechnung wird" : "Rechnungen werden"} per Mail an die Partner verschickt.`}
            </p>
            <footer className="wmodal-foot send-ask">
              <button type="button" className="btn-secondary" onClick={() => setAskSend(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  sendInvoices(finanzenMonth, mailSent);
                  setAskSend(false);
                  setToast("E-Mail Rechnungen verschickt. Prüfe unten, welche nicht angekommen sind.");
                }}
              >
                {mailSent ? "Erneut senden" : "Verschicken"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
      {askPost ? (
        <div className="wmodal" role="dialog" aria-label="Post-Rechnungen drucken">
          <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={() => setAskPost(false)} />
          <div className="wmodal-body send-ask">
            <button type="button" className="wmodal-close" aria-label="Schließen" onClick={() => setAskPost(false)}>
              <img src={a.iconCloseDark} alt="" width={16} height={16} />
            </button>
            <h2>Post-Rechnungen drucken?</h2>
            <p>
              {postFees.length} Post-Rechnungen werden an den Drucker gesendet und gedruckt. Vergewissere dich,
              dass du alle Postversand Rechnungen in der Tabelle als versendet markierst.
            </p>
            <footer className="wmodal-foot send-ask">
              <button type="button" className="btn-secondary" onClick={() => setAskPost(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  printPostInvoices(finanzenMonth);
                  setAskPost(false);
                  setToast("Post-Rechnungen erfolgreich an den Drucker gesendet.");
                }}
              >
                Drucken
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type RowHandlers = {
  isBmdCreated: (fee: Fee) => boolean;
  onInvoice: (feeId: string) => void;
  onMenu: (feeId: string, rect: DOMRect) => void;
  onChangeAddress: (feeId: string) => void;
  onResend: (feeId: string) => void;
  onPostSent: (feeId: string, sent: boolean) => void;
  menuFeeId?: string;
};

function Group({
  label,
  open,
  onToggle,
  rows,
  handlers,
  onMarkAll,
  allMarked,
}: {
  onMarkAll?: () => void;
  allMarked?: boolean;
  label: string;
  open: boolean;
  onToggle: () => void;
  rows: { fee: Fee; partner: Partner | undefined; text: Record<ColumnKey, string> }[];
  handlers: RowHandlers;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <div className="hn-st-group" role="row">
        <div className="hn-st-group-bar">
          <button type="button" className={open ? undefined : "closed"} aria-expanded={open} onClick={onToggle}>
            <Icon src={a.chevronDown} size={18} />
            {label}
          </button>
          {onMarkAll && rows.length > 0 ? (
            <button type="button" className="hn-st-mark-all" onClick={onMarkAll}>
              {allMarked ? "Alle als nicht versendet markieren" : "Alle als versendet markieren"}
            </button>
          ) : null}
        </div>
      </div>
      {open
        ? rows.map(({ fee, partner, text }) => {
            const locked = missingFields(fee, partner).length > 0;
            const address = addressLines(partner?.address ?? "");
            const byPost = partner?.deliveryMethod === "print";
            const failed = fee.invoiceStatus === "send_failed";
            const created = handlers.isBmdCreated(fee);
            const waiting = !created || fee.invoiceStatus === "created" || fee.invoiceStatus === "not_created";
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
                {failed ? (
                  <div className="hn-st-note fail">
                    <img src={a.hnAttention} alt="" width={16.5} height={15.4688} />
                    <span className="hn-st-fail-copy">
                      <strong>{text.status}</strong>
                      <small>
                        <button type="button" onClick={() => handlers.onChangeAddress(fee.id)}>
                          Adresse ändern
                        </button>{" "}
                        oder{" "}
                        <button type="button" onClick={() => handlers.onResend(fee.id)}>
                          erneut senden
                        </button>
                      </small>
                    </span>
                  </div>
                ) : (
                  <div className="hn-st-note">
                    <Icon src={waiting ? a.onhold : a.confirm} size={16} />
                    <span>{text.status}</span>
                  </div>
                )}
                <div className="hn-st-stack">
                  <span>{address.street}</span>
                  {address.city ? <span>{address.city}</span> : null}
                </div>
                <div className="hn-st-stack">
                  <span>{byPost ? "Post" : "Mail"}</span>
                  {partner && !byPost ? <span>{mailAddress(fee, partner)}</span> : null}
                  {partner && !byPost && fee.mailTo && fee.mailTo !== partner.email ? (
                    <small className="hn-st-edited">
                      Geänderte Adresse
                      <br />
                      Standard: {partner.email}
                    </small>
                  ) : null}
                </div>
                <div className="hn-st-captured">
                  {created ? (
                    <span>
                      {capturedWhen(fee.createdAt)}
                      <small>{fee.createdBy}</small>
                    </span>
                  ) : null}
                </div>
                <div className="hn-st-captured">
                  {byPost ? (
                    <span className="hn-post-sent">
                      <label className="hn-tickbox bare">
                        <input
                          type="checkbox"
                          checked={fee.invoiceStatus === "sent"}
                          onChange={(event) => handlers.onPostSent(fee.id, event.target.checked)}
                        />
                        <span className="hn-tickbox-box" aria-hidden>
                          {fee.invoiceStatus === "sent" ? <img src={a.hnCheckTick} alt="" width={16} height={16} /> : null}
                        </span>
                        <span className="hn-tickbox-label">Per Post versendet</span>
                      </label>
                      {fee.sentAt ? <small>{capturedWhen(fee.sentAt)}</small> : null}
                    </span>
                  ) : fee.sentAt ? (
                    <span>
                      {capturedWhen(fee.sentAt)}
                      <small>{fee.sentTo}</small>
                    </span>
                  ) : (
                    <span />
                  )}
                </div>
                <div className="hn-st-captured">
                  {created ? (
                    <button type="button" className="hn-doc-link" onClick={() => handlers.onInvoice(fee.id)}>
                      <img src={a.pdf} alt="" width={12} height={14} />
                      <span>{INVOICE_FILE}</span>
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    className="hn-st-menu"
                    aria-label="Aktionen"
                    aria-expanded={handlers.menuFeeId === fee.id}
                    onClick={(event) => handlers.onMenu(fee.id, event.currentTarget.getBoundingClientRect())}
                  >
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
