import { useMemo, useState } from "react";
import { dueMonthLabel, formatDate, money, openItemStatusLabel, paymentReasonLabel } from "../lib/honorar/format";
import { historyFor, partnerOf } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { HistoryDrawer } from "./HistoryDrawer";
import { PartnerCell } from "./ui";

export function OpenItemsPage({ advisorOnly = false }: { advisorOnly?: boolean }) {
  const { state, sendReminder, bookOpenPayment } = useHonorar();
  const { openFinanzenInkasso } = useWorkflow();
  const [due, setDue] = useState<string>("");
  const [status, setStatus] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const rows = useMemo(() => {
    return state.openItems.filter((item) => {
      const partner = partnerOf(state, item.partnerId);
      if (advisorOnly && partner?.advisor !== "Mike Bennett" && state.role === "advisor") return false;
      if (advisorOnly && state.role === "head" && partner?.department !== "Beratung & Service") return false;
      if (due && item.dueMonth !== due) return false;
      if (status && item.status !== status) return false;
      if (advisor && partner?.advisor !== advisor) return false;
      return true;
    });
  }, [state, due, status, advisor, advisorOnly]);

  const filtered = Boolean(due || status || advisor);
  const detailItem = state.openItems.find((item) => item.id === detail);

  return (
    <section className="freigaben hn-panel">
      <h1 className="freigaben-title">{advisorOnly ? "Offene Posten" : "Offene Posten"}</h1>
      <div className="hn-toolbar">
        <select value={due} onChange={(event) => setDue(event.target.value)} aria-label="Fälligkeit">
          <option value="">(Alle)</option>
          {[...new Set(state.openItems.map((item) => item.dueMonth))].map((month) => (
            <option key={month} value={month}>
              {dueMonthLabel(month)}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="">Status</option>
          <option value="no_reminder">Keine Zahlungserinnerung</option>
          <option value="reminder_sent">Zahlungserinnerung versendet</option>
          <option value="reminder_overdue">Erinnerung ohne Reaktion</option>
          <option value="agreement_in_approval">Vereinbarung in Freigabe</option>
          <option value="agreement_made">Vereinbarung getroffen</option>
          <option value="done">Erledigt</option>
        </select>
        <select value={advisor} onChange={(event) => setAdvisor(event.target.value)} aria-label="Kundenberater">
          <option value="">Kundenberater</option>
          <option value="Mike Bennett">Mike Bennett</option>
          <option value="Sandra Huber">Sandra Huber</option>
        </select>
        {filtered ? (
          <button type="button" className="hn-link" onClick={() => { setDue(""); setStatus(""); setAdvisor(""); }}>
            Filter zurücksetzen
          </button>
        ) : null}
      </div>

      <div className="req-table hn-table">
        {rows.map((item) => {
          const partner = partnerOf(state, item.partnerId);
          const amber = item.status === "no_reminder" || item.status === "reminder_overdue";
          return (
            <div className={`hn-row${amber ? " amber" : ""}`} key={item.id} onClick={() => setDetail(item.id)}>
              <PartnerCell name={partner?.name ?? item.partnerId} photo={partner?.photo} company={partner?.type === "company"} />
              <span>{dueMonthLabel(item.dueMonth)}</span>
              <span>{money(item.openAmount)}</span>
              <span>{paymentReasonLabel(item.reason)}</span>
              <span className={`status-pill ${amber ? "open" : item.status === "done" ? "fertig" : "done"}`}>
                {openItemStatusLabel(item.status, item.reminderSentAt)}
              </span>
              <span>{partner?.advisor}</span>
              <span>
                {item.status === "no_reminder" ? (
                  <button
                    type="button"
                    className="start-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreview(item.id);
                    }}
                  >
                    Zahlungserinnerung senden
                  </button>
                ) : null}
                {!advisorOnly ? (
                  <button
                    type="button"
                    className="export-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPayId(item.id);
                    }}
                  >
                    Zahlung verbuchen
                  </button>
                ) : null}
                <button
                  type="button"
                  className="export-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    openFinanzenInkasso(item.partnerId);
                  }}
                >
                  Zum Inkasso
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {preview ? (
        <div className="wmodal" role="dialog" aria-label="Zahlungserinnerung">
          <button type="button" className="wmodal-scrim" onClick={() => setPreview(null)} />
          <div className="wmodal-body">
            <h2>Zahlungserinnerung</h2>
            <p>Mock-E-Mail an den Partner mit dem offenen Betrag.</p>
            <footer className="wmodal-foot centered">
              <button type="button" className="btn-secondary" onClick={() => setPreview(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  sendReminder(preview);
                  setPreview(null);
                }}
              >
                Senden
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {payId ? (
        <div className="wmodal" role="dialog" aria-label="Zahlung verbuchen">
          <button type="button" className="wmodal-scrim" onClick={() => setPayId(null)} />
          <div className="wmodal-body">
            <h2>Zahlung verbuchen</h2>
            <input type="number" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} placeholder="Betrag" />
            <footer className="wmodal-foot centered">
              <button type="button" className="btn-secondary" onClick={() => setPayId(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!Number(payAmount)}
                onClick={() => {
                  bookOpenPayment(payId, Number(payAmount));
                  setPayId(null);
                  setPayAmount("");
                }}
              >
                Verbuchen
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {detailItem ? (
        <HistoryDrawer
          title={`${partnerOf(state, detailItem.partnerId)?.name ?? ""} · ${formatDate(detailItem.dueMonth)}`}
          entries={historyFor(state, "openItem", detailItem.id)}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </section>
  );
}
