import { useState } from "react";
import { money } from "../lib/honorar/format";
import { partnerOf } from "../lib/honorar/queries";
import { useHonorar } from "./store";
import { ConfirmModal, PartnerCell } from "./ui";

export function SingleInvoicesPage() {
  const { state, sendSingleInvoice } = useHonorar();
  const [openId, setOpenId] = useState<string | null>(null);
  const [sendId, setSendId] = useState<string | null>(null);
  const current = state.singleInvoices.find((invoice) => invoice.id === openId);

  return (
    <section className="freigaben hn-panel">
      <h1 className="freigaben-title">Einzelfaktura / Gutschriften</h1>
      <div className="req-table hn-table">
        {state.singleInvoices.map((invoice) => {
          const partner = partnerOf(state, invoice.partnerId);
          return (
            <button type="button" className="hn-row" key={invoice.id} onClick={() => setOpenId(invoice.id)}>
              <PartnerCell name={partner?.name ?? invoice.partnerId} photo={partner?.photo} company={partner?.type === "company"} />
              <span>{invoice.kind}</span>
              <span>{money(invoice.amount)}</span>
              <span className={`status-pill ${invoice.status === "open" ? "open" : "fertig"}`}>
                {invoice.status === "open" ? "Offen" : "An BMD gesendet"}
              </span>
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="wmodal" role="dialog" aria-label="Einzelfaktura">
          <button type="button" className="wmodal-scrim" onClick={() => setOpenId(null)} />
          <div className="wmodal-body">
            <h2>Einzelfaktura</h2>
            <p>
              {partnerOf(state, current.partnerId)?.name} · {current.kind} · {money(current.amount)}
            </p>
            <footer className="wmodal-foot centered">
              <button type="button" className="btn-secondary" onClick={() => setOpenId(null)}>
                Schließen
              </button>
              {current.status === "open" ? (
                <button type="button" className="btn-primary" onClick={() => setSendId(current.id)}>
                  An BMD senden
                </button>
              ) : null}
            </footer>
          </div>
        </div>
      ) : null}

      {sendId ? (
        <ConfirmModal
          title="An BMD senden?"
          text="Die Einzelfaktura gilt danach als übergeben."
          confirmLabel="Senden"
          onCancel={() => setSendId(null)}
          onConfirm={() => {
            sendSingleInvoice(sendId);
            setSendId(null);
            setOpenId(null);
          }}
        />
      ) : null}
    </section>
  );
}
