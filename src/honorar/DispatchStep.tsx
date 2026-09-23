import { useEffect, useMemo, useState } from "react";
import { money, monthLabel, nextMonth } from "../lib/honorar/format";
import { dispatchMismatches, feesOfMonth, monthCloseBlocked, monthOf, partnerOf } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { ConfirmModal, EmptyState, PartnerCell, StickyBar } from "./ui";

export function DispatchStep() {
  const { state, sendInvoices, resendInvoice, patchPartner, closeMonth } = useHonorar();
  const { finanzenMonth, openFinanzen } = useWorkflow();
  const month = monthOf(state, finanzenMonth);
  const fees = useMemo(() => feesOfMonth(state, finanzenMonth), [state, finanzenMonth]);
  const mismatches = fees.filter((fee) => dispatchMismatches(fee, partnerOf(state, fee.partnerId)).length > 0);
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [send, setSend] = useState(false);
  const [close, setClose] = useState(false);
  const { realignFee } = useHonorar();

  useEffect(() => {
    if (mismatches.length > 0) setOnlyGaps(true);
  }, [mismatches.length]);

  if (!month?.bmdDataLoaded) {
    return (
      <section className="freigaben hn-panel">
        <EmptyState title="Noch keine BMD-Daten" text="Sobald die Daten aus BMD geladen sind, erscheinen sie hier." />
      </section>
    );
  }

  const rows = onlyGaps ? mismatches : fees;
  const digital = fees.filter((fee) => partnerOf(state, fee.partnerId)?.deliveryMethod === "digital").length;
  const print = fees.length - digital;
  const blocked = monthCloseBlocked(state, finanzenMonth);

  return (
    <section className="freigaben hn-panel">
      <h1 className="freigaben-title">Honorarverrechnung</h1>
      <h2 className="hn-h2">Rechnungsversand</h2>

      {mismatches.length ? (
        <label className="hn-filter">
          <input type="checkbox" checked={onlyGaps} onChange={(event) => setOnlyGaps(event.target.checked)} />
          Nur Abweichungen
        </label>
      ) : null}

      <div className="req-table hn-table">
        {rows.map((fee) => {
          const partner = partnerOf(state, fee.partnerId);
          const gaps = dispatchMismatches(fee, partner);
          return (
            <div className={`hn-row${gaps.length ? " amber" : ""}`} key={fee.id}>
              <PartnerCell name={partner?.name ?? fee.partnerId} photo={partner?.photo} company={partner?.type === "company"} />
              <Compare label="Betrag" local={money(fee.amount)} remote={fee.bmd ? money(fee.bmd.amount) : ""} gap={gaps.includes("amount")} />
              <Compare label="Adresse" local={partner?.address ?? ""} remote={fee.bmd?.address ?? ""} gap={gaps.includes("address")} />
              <Compare label="E-Mail" local={partner?.email ?? ""} remote={fee.bmd?.email ?? ""} gap={gaps.includes("email")} />
              <Compare
                label="Leistungszeitraum"
                local={fee.servicePeriod}
                remote={fee.bmd?.servicePeriod ?? ""}
                gap={gaps.includes("servicePeriod")}
              />
              <div>
                {fee.invoiceStatus === "send_failed" ? (
                  <>
                    <strong>Versand fehlgeschlagen</strong>
                    <label>
                      E-Mail korrigieren
                      <input
                        value={partner?.email ?? ""}
                        onChange={(event) => patchPartner(fee.partnerId, { email: event.target.value })}
                      />
                    </label>
                    <button type="button" className="start-btn" onClick={() => resendInvoice(fee.id, false)}>
                      Erneut senden
                    </button>
                    <button type="button" className="export-btn" onClick={() => resendInvoice(fee.id, true)}>
                      Per Post senden
                    </button>
                  </>
                ) : (
                  <span>{fee.invoiceStatus === "sent" ? "Versendet" : "Erstellt"}</span>
                )}
              </div>
              {gaps.length ? (
                <button type="button" className="start-btn" onClick={() => realignFee(fee.id)}>
                  Neu abgleichen
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <StickyBar>
        <button type="button" className="btn-secondary" onClick={() => setSend(true)}>
          Rechnungen versenden
        </button>
        {blocked.length ? (
          <ul className="hn-blockers">
            {blocked.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <button type="button" className="btn-primary" disabled={blocked.length > 0} onClick={() => setClose(true)}>
          Monat abschliessen
        </button>
      </StickyBar>

      {send ? (
        <ConfirmModal
          title="Rechnungen versenden?"
          text={`${digital} digital, ${print} per Post.`}
          confirmLabel="Versenden"
          onCancel={() => setSend(false)}
          onConfirm={() => {
            sendInvoices(finanzenMonth);
            setSend(false);
          }}
        />
      ) : null}

      {close ? (
        <ConfirmModal
          title={`${monthLabel(finanzenMonth)} abschliessen?`}
          text="Danach sind keine Änderungen mehr möglich."
          confirmLabel="Abschliessen"
          onCancel={() => setClose(false)}
          onConfirm={() => {
            closeMonth(finanzenMonth);
            setClose(false);
            openFinanzen("month", nextMonth(finanzenMonth), "status");
          }}
        />
      ) : null}
    </section>
  );
}

function Compare({ label, local, remote, gap }: { label: string; local: string; remote: string; gap: boolean }) {
  return (
    <div className={gap ? "hn-miss" : undefined}>
      <small>{label}</small>
      <span>Erfasst: {local}</span>
      <span>BMD: {remote}</span>
    </div>
  );
}
