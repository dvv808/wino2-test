import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../assets/index";
import { formatDate, monthLabel } from "../lib/honorar/format";
import { feesOfMonth, partnerOf, reminderCandidates } from "../lib/honorar/queries";
import type { Fee, Partner } from "../types/honorar";
import { Icon, Snackbar } from "../ui";
import { useWorkflow } from "../workflow";
import { ColumnFilter, filterInputProps, matchesFilter } from "./ColumnFilter";
import { useHonorar } from "./store";
import { MailAddressModal } from "./MailAddressModal";
import { clearFocusFee, peekFocusFee } from "./focusFee";
import { invoiceLine, paymentInfo, paymentLine, PaymentCell } from "./StatusStep";
import { PartnerAvatar, StatCards, StepEmpty, type StatFilter } from "./ui";

const COLUMNS = [
  { key: "partner", label: "Partner", filter: false },
  { key: "payment", label: "Status zur Zahlung", filter: true },
  { key: "reminder", label: "Status Rechnungsversand", filter: true },
  { key: "address", label: "Anschrift", filter: true },
  { key: "channel", label: "Versandart", filter: true },
  { key: "amount", label: "Zu zahlender Honorarbetrag", filter: true },
  { key: "paid", label: "Bezahlter Honorarbetrag", filter: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

function when(iso: string) {
  const [day, time] = formatDate(iso).split(" ");
  return time ? `${day} - ${time}` : day;
}

function partnerMeta(partner: Partner) {
  return [partner.birthDate, partner.nickname ? `(vulgo ${partner.nickname})` : ""].filter(Boolean).join(" ");
}

function addressLines(address: string) {
  const [street, ...rest] = address.split(",");
  return { street: street.trim(), city: rest.join(",").trim() };
}

function mailAddress(fee: Fee, partner: Partner | undefined) {
  return fee.mailTo ?? partner?.email ?? "";
}

type Row = { fee: Fee; partner: Partner | undefined; text: Record<ColumnKey, string> };

export function ReminderStep() {
  const { finanzenMonth, openPartnerInkasso } = useWorkflow();
  const { state, sendPaymentReminders, clearPaymentReminder, expireDueDates, printPostReminders, notifyAdvisor } = useHonorar();
  const [filters, setFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [askSend, setAskSend] = useState(false);
  const [askPostPrint, setAskPostPrint] = useState(false);
  const [stat, setStat] = useState<StatFilter>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [addressFeeId, setAddressFeeId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState({ post: true, mail: true });
  const [menu, setMenu] = useState<{ feeId: string; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Arriving from Offene Posten: that row is marked so you can see where you landed. */
  const [focusId, setFocusId] = useState<string | null>(() => peekFocusFee());

  useEffect(() => {
    if (!focusId) return;
    const frame = window.requestAnimationFrame(() =>
      document.querySelector(".hn-st-row.focus")?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
    const timer = window.setTimeout(() => {
      clearFocusFee();
      setFocusId(null);
    }, 6000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [focusId]);

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

  const candidates = reminderCandidates(state, finanzenMonth);
  // Invoices that were reminded and then paid stay in the list as "Bezahlt".
  const paidFees = feesOfMonth(state, finanzenMonth).filter(
    (fee) => fee.paymentMethod === "Rechnung" && fee.paymentStatus === "paid" && Boolean(fee.reminderSentAt),
  );
  const fees = [...candidates, ...paidFees];
  const isPost = (partner: Partner | undefined) => !partner || partner.deliveryMethod === "print";
  const pendingMail = candidates.filter((fee) => !fee.reminderSentAt && !isPost(partnerOf(state, fee.partnerId)));
  const pendingPost = candidates.filter((fee) => !fee.reminderSentAt && isPost(partnerOf(state, fee.partnerId)));
  // Reminders are only allowed once the due date has passed for every open invoice.
  // A month shares one Zahlungsziel: one overdue Rechnung fee means the whole month is "nach Zahlungsziel".
  const expired = candidates.some((fee) => fee.paymentStatus !== "open_before_due");
  const pending = candidates.filter((fee) => !fee.reminderSentAt);
  const reminded = candidates.length - pending.length;

  const baseRows: Row[] = useMemo(() => {
    return fees
      .filter((fee) => {
        if (stat === null) return true;
        if (stat === "paid") return fee.paymentStatus === "paid";
        if (fee.paymentStatus === "paid") return false;
        return (stat === "done") === Boolean(fee.reminderSentAt);
      })
      .map((fee) => {
        const partner = partnerOf(state, fee.partnerId);
        const text: Record<ColumnKey, string> = {
          partner: `${partner?.name ?? ""} ${partner ? partnerMeta(partner) : ""}`,
          address: partner?.address ?? "",
          channel: isPost(partner) ? "Post" : `Mail ${mailAddress(fee, partner)}`,
          payment: paymentLine(fee, undefined, expired),
          reminder: invoiceLine(fee),
          amount: `${money(fee.amount)} ${fee.tariff}`,
          paid: `${money(fee.paid)} ${fee.tariff}`,
        };
        return { fee, partner, text };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, finanzenMonth, stat]);
  const rows = useMemo(
    () => baseRows.filter((row) => COLUMNS.every((column) => matchesFilter(filters[column.key], row.text[column.key]))),
    [baseRows, filters],
  );

  const post = rows.filter((row) => isPost(row.partner));
  const mail = rows.filter((row) => !isPost(row.partner));
  const menuFee = menu ? fees.find((entry) => entry.id === menu.feeId) : undefined;
  const menuPartner = menuFee ? partnerOf(state, menuFee.partnerId) : undefined;
  const menuIsMail = menuPartner ? !isPost(menuPartner) && menuFee?.paymentStatus !== "paid" : false;

  function sendAll() {
    sendPaymentReminders(
      finanzenMonth,
      pendingMail.map((fee) => fee.id),
    );
    setAskSend(false);
    setToast(`${pendingMail.length} Zahlungserinnerung${pendingMail.length === 1 ? "" : "en"} versendet.`);
  }

  function renderGroup(key: "post" | "mail", label: string, list: Row[]) {
    if (list.length === 0) return null;
    const open = openGroups[key];
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
            {key === "post" && list.length > 0 ? (
              <button
                type="button"
                className="hn-st-mark-all"
                onClick={() =>
                  list.every(({ fee }) => fee.reminderSentAt)
                    ? list.forEach(({ fee }) => clearPaymentReminder(fee.id))
                    : sendPaymentReminders(
                        finanzenMonth,
                        list.filter(({ fee }) => !fee.reminderSentAt).map(({ fee }) => fee.id),
                      )
                }
              >
                {list.every(({ fee }) => fee.reminderSentAt)
                  ? "Alle als nicht versendet markieren"
                  : "Alle als versendet markieren"}
              </button>
            ) : null}
          </div>
        </div>
        {open
          ? list.map(({ fee, partner }) => {
              const address = addressLines(partner?.address ?? "");
              const byPost = isPost(partner);
              return (
                <div className={fee.id === focusId ? "hn-st-row focus" : "hn-st-row"} role="row" key={fee.id}>
                  <div className="hn-st-partner">
                    <span className="partner-avatar">
                      <PartnerAvatar company={partner?.type === "company"} />
                      {partner?.type === "company" ? <img className="winter" src={a.winterMark} alt="" /> : null}
                    </span>
                    <span className="partner-copy">
                      <strong>{partner?.name}</strong>
                      {partner ? <small>{partnerMeta(partner)}</small> : null}
                    </span>
                    <img className="hn-st-open" src={a.openTab} alt="" width={16} height={16} />
                  </div>
                  <PaymentCell fee={fee} credit={undefined} compact={expired} />
                  {byPost ? (
                    <div className="hn-st-captured">
                      <span className="hn-post-sent">
                        <small className="hn-st-invoice-line">{invoiceLine(fee)}</small>
                        <label className="hn-tickbox bare">
                          <input
                            type="checkbox"
                            disabled={!expired && !fee.reminderSentAt}
                            checked={Boolean(fee.reminderSentAt)}
                            onChange={(event) =>
                              event.target.checked
                                ? sendPaymentReminders(finanzenMonth, [fee.id])
                                : clearPaymentReminder(fee.id)
                            }
                          />
                          <span className="hn-tickbox-box" aria-hidden>
                            {fee.reminderSentAt ? <img src={a.hnCheckTick} alt="" width={16} height={16} /> : null}
                          </span>
                          <span className="hn-tickbox-label">Per Post versendet</span>
                        </label>
                        {fee.reminderSentAt ? <small>{when(fee.reminderSentAt)}</small> : null}
                      </span>
                    </div>
                  ) : (
                    <div className="hn-st-note">
                      <Icon src={fee.reminderSentAt ? a.confirm : a.onhold} size={16} />
                      <span className="hn-st-fail-copy">
                        {invoiceLine(fee)}
                        <small>
                          {fee.reminderSentAt ? (
                            `Zahlungserinnerung versendet ${when(fee.reminderSentAt)}`
                          ) : (
                            <button
                              disabled={!expired}
                              type="button"
                              onClick={() => {
                                sendPaymentReminders(finanzenMonth, [fee.id]);
                                setToast("Zahlungserinnerung versendet.");
                              }}
                            >
                              Erinnerung senden
                            </button>
                          )}
                        </small>
                        {fee.reminderSentAt ? null : (
                          <small>
                            <button type="button" onClick={() => setAddressFeeId(fee.id)}>
                              Erinnerung an andere E-Mail-Adresse senden
                            </button>
                          </small>
                        )}
                      </span>
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
                  <div className="hn-st-money">
                    <strong>{money(fee.amount)}</strong>
                    <small>{fee.tariff}</small>
                  </div>
                  <div className="hn-st-captured">
                    <span>
                      {money(fee.paid)}
                      <small>{fee.tariff}</small>
                    </span>
                    <button
                      type="button"
                      className="hn-st-menu"
                      aria-label="Aktionen"
                      aria-expanded={menu?.feeId === fee.id}
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setMenu({ feeId: fee.id, top: rect.bottom + 4, left: Math.max(8, rect.right - 260) });
                      }}
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

  return (
    <section className="freigaben hn-panel hn-status">
      {pending.length > 0 ? (
        <div className="hn-step-warn">
          <div className={expired ? "info-box success" : "info-box"}>
            <Icon src={a.infoFull} size={24} />
            <p>
              {expired
                ? "Zahlungserinnerungen können jetzt ausgesendet werden, da die Frist überschritten ist (Offen nach Zahlungsziel)."
                : "Zahlungserinnerungen sind nach Ablauf der Frist möglich auszusenden (Offen vor Zahlungsziel)."}
              {expired ? null : (
                <>
                  {" "}
                  <button type="button" className="hn-link" onClick={() => expireDueDates(finanzenMonth)}>
                    Simuliere Zahlungsfrist abgelaufen
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="hn-dispatch-bar">
        <div>
          <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
          <p className="hn-month">
            <strong>{monthLabel(finanzenMonth)}</strong> {finanzenMonth.slice(0, 4)}
          </p>
          <h2 className="hn-h2 hn-status-title">Zahlungserinnerungen</h2>
        </div>
        {fees.length > 0 ? (
          <div className="hn-send-actions">
            <button type="button" className="hn-send" disabled={!expired && pendingMail.length > 0} onClick={() => setAskSend(true)}>
              Alle Zahlungserinnerungen per Mail schicken
            </button>
            <button
              type="button"
              className="hn-send"
              disabled={(!expired && pendingPost.length > 0) || pendingPost.length === 0}
              onClick={() => setAskPostPrint(true)}
            >
              Post-Erinnerungen drucken
            </button>
          </div>
        ) : null}
      </div>

      {fees.length === 0 ? (
        <StepEmpty
          icon={a.navMail}
          title="Keine überfälligen Rechnungen"
          lead="Hier erscheinen alle Rechnungen, die nicht rechtzeitig bezahlt wurden"
        />
      ) : (
        <>
          <StatCards
            open={pending.length}
            done={reminded}
            unit="Erinnerungen"
            doneLabel="Versendet"
            trailing={[{ kind: "paid", label: "Bezahlt", count: paidFees.length, icon: a.confirm }]}
            value={stat}
            onChange={setStat}
          />

          <div className="hn-status-table dispatch reminders" role="table" aria-label="Zahlungserinnerungen">
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
              <div />
              <div />
            </div>

            {renderGroup("post", "Postversand", post)}
            {renderGroup("mail", "Mailversand", mail)}
          </div>

          {menu && menuFee ? (
            <div className="hn-row-menu wide" ref={menuRef} role="menu" style={{ top: menu.top, left: menu.left }}>
              {menuIsMail ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!expired}
                    onClick={() => {
                      sendPaymentReminders(finanzenMonth, [menuFee.id]);
                      setToast("Zahlungserinnerung versendet.");
                      setMenu(null);
                    }}
                  >
                    {menuFee.reminderSentAt ? "Erinnerung erneut senden" : "Erinnerung senden"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAddressFeeId(menuFee.id);
                      setMenu(null);
                    }}
                  >
                    Erinnerung an andere E-Mail-Adresse senden
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
                  notifyAdvisor(menuFee.id, paymentInfo(menuFee, undefined, true).main);
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
                      sendPaymentReminders(finanzenMonth, [fee.id], email);
                      setAddressFeeId(null);
                      setToast("Zahlungserinnerung an die neue Adresse versendet.");
                    }}
                  />
                );
              })()
            : null}
        </>
      )}

      {askPostPrint ? (
        <div className="wmodal" role="dialog" aria-label="Post-Erinnerungen drucken">
          <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={() => setAskPostPrint(false)} />
          <div className="wmodal-body send-ask">
            <button type="button" className="wmodal-close" aria-label="Schließen" onClick={() => setAskPostPrint(false)}>
              <img src={a.iconCloseDark} alt="" width={16} height={16} />
            </button>
            <h2>Post-Erinnerungen drucken?</h2>
            <p>
              {pendingPost.length} Zahlungserinnerungen per Post werden an den Drucker gesendet und gedruckt.
              Vergewissere dich, dass du alle Postversand Erinnerungen in der Tabelle als versendet markierst.
            </p>
            <footer className="wmodal-foot send-ask">
              <button type="button" className="btn-secondary" onClick={() => setAskPostPrint(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  sendPaymentReminders(finanzenMonth, pendingPost.map((fee) => fee.id));
                  printPostReminders(finanzenMonth);
                  setAskPostPrint(false);
                  setToast("Post-Erinnerungen erfolgreich an den Drucker gesendet.");
                }}
              >
                Drucken
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {askSend ? (
        <div className="wmodal" role="dialog" aria-label="Zahlungserinnerungen verschicken.">
          <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={() => setAskSend(false)} />
          <div className="wmodal-body send-ask">
            <button type="button" className="wmodal-close" aria-label="Schließen" onClick={() => setAskSend(false)}>
              <img src={a.iconCloseDark} alt="" width={16} height={16} />
            </button>
            <h2>Zahlungserinnerungen verschicken.</h2>
            {pendingMail.length === 0 ? (
              <>
                <p>Alle Zahlungserinnerungen per Mail wurden bereits verschickt. Postversand hakst du selbst ab.</p>
                <footer className="wmodal-foot send-ask">
                  <button type="button" className="btn-primary" onClick={() => setAskSend(false)}>
                    Verstanden
                  </button>
                </footer>
              </>
            ) : (
              <>
                <p>
                  Achtung, alle Partner mit einer nicht rechtzeitig bezahlten Rechnung und Mailversand ({pendingMail.length})
                  erhalten eine Zahlungserinnerung. Postversand hakst du selbst ab.
                </p>
                <footer className="wmodal-foot send-ask">
                  <button type="button" className="btn-secondary" onClick={() => setAskSend(false)}>
                    Abbrechen
                  </button>
                  <button type="button" className="btn-primary" onClick={sendAll}>
                    Senden
                  </button>
                </footer>
              </>
            )}
          </div>
        </div>
      ) : null}

      {toast ? <Snackbar message={toast} onClose={() => setToast(null)} /> : null}
    </section>
  );
}
