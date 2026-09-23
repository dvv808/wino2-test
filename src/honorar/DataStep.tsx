import { useMemo, useState } from "react";
import { money } from "../lib/honorar/format";
import { feesOfMonth, incompleteFees, missingFields, partnerOf } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { ConfirmModal, PartnerCell, StickyBar } from "./ui";

export function DataStep() {
  const { state, importCaptureData, patchFee, patchPartner, closeDataStep } = useHonorar();
  const { finanzenMonth, openFinanzenStep } = useWorkflow();
  const fees = useMemo(() => feesOfMonth(state, finanzenMonth), [state, finanzenMonth]);
  const incomplete = incompleteFees(state, finanzenMonth);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const rows = onlyIncomplete ? incomplete : fees;

  return (
    <section className="freigaben hn-panel">
      <h1 className="freigaben-title">Honorarverrechnung</h1>
      <h2 className="hn-h2">Daten erfassen</h2>

      <div className="hn-toolbar">
        <button type="button" className="export-btn" onClick={() => importCaptureData(finanzenMonth)}>
          Daten importieren
        </button>
        {state.importedFileName ? <span className="hn-file">{state.importedFileName}</span> : null}
        {incomplete.length ? (
          <label className="hn-filter">
            <input type="checkbox" checked={onlyIncomplete} onChange={(event) => setOnlyIncomplete(event.target.checked)} />
            Nur unvollständige
          </label>
        ) : null}
      </div>

      <div className="req-table hn-table hn-capture">
        {rows.map((fee) => {
          const partner = partnerOf(state, fee.partnerId);
          const missing = missingFields(fee, partner);
          return (
            <div className={`hn-row${missing.length ? " amber" : ""}`} key={fee.id}>
              <PartnerCell
                name={partner?.name ?? fee.partnerId}
                meta={partner?.address || "Adresse fehlt"}
                photo={partner?.photo}
                company={partner?.type === "company"}
              />
              <label className={missing.includes("address") ? "hn-miss" : undefined}>
                Adresse
                <input
                  value={partner?.address ?? ""}
                  onChange={(event) => patchPartner(fee.partnerId, { address: event.target.value })}
                />
              </label>
              <label className={missing.includes("servicePeriod") ? "hn-miss" : undefined}>
                Leistungszeitraum
                <input
                  value={fee.servicePeriod}
                  onChange={(event) => patchFee(fee.id, { servicePeriod: event.target.value })}
                />
              </label>
              <label>
                Freitext
                <input value={fee.freeText ?? ""} onChange={(event) => patchFee(fee.id, { freeText: event.target.value })} />
              </label>
              <label className={missing.includes("bankAccount") ? "hn-miss" : undefined}>
                Bankverbindung
                <input
                  value={partner?.bankAccount ?? ""}
                  onChange={(event) => patchPartner(fee.partnerId, { bankAccount: event.target.value })}
                />
              </label>
              <span>{partner?.advisor}</span>
              <label className={missing.includes("amount") ? "hn-miss" : undefined}>
                Betrag
                <input
                  type="number"
                  value={fee.amount || ""}
                  onChange={(event) => patchFee(fee.id, { amount: Number(event.target.value) })}
                />
              </label>
              <span>
                {fee.tariff}
                <small>{fee.paymentMethod}</small>
              </span>
              <label>
                Thomas
                <input
                  value={fee.extraFields.Thomas ?? ""}
                  onChange={(event) => patchFee(fee.id, { extraFields: { ...fee.extraFields, Thomas: event.target.value } })}
                />
              </label>
              <label>
                Maria
                <input
                  value={fee.extraFields.Maria ?? ""}
                  onChange={(event) => patchFee(fee.id, { extraFields: { ...fee.extraFields, Maria: event.target.value } })}
                />
              </label>
              <span>{money(fee.amount)}</span>
            </div>
          );
        })}
      </div>

      <StickyBar>
        <button type="button" className="btn-primary" disabled={incomplete.length > 0} onClick={() => setConfirm(true)}>
          Daten fertig erfassen
        </button>
      </StickyBar>

      {confirm ? (
        <ConfirmModal
          title="Daten fertig erfassen?"
          text="Danach kannst du den Datenträger erstellen."
          confirmLabel="Erfassen"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            closeDataStep(finanzenMonth);
            setConfirm(false);
            openFinanzenStep("carrier");
          }}
        />
      ) : null}
    </section>
  );
}
