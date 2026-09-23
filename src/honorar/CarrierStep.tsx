import { useState } from "react";
import { checklistReady, feesOfMonth, monthOf } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";
import { ConfirmModal } from "./ui";

export function CarrierStep() {
  const { state, createCarrier, setChecklist, handToBmd } = useHonorar();
  const { finanzenMonth, openFinanzenStep } = useWorkflow();
  const month = monthOf(state, finanzenMonth);
  const count = feesOfMonth(state, finanzenMonth).length;
  const [confirm, setConfirm] = useState(false);
  const ready = checklistReady(state) && Boolean(state.carrierFileName);

  return (
    <section className="freigaben hn-panel hn-carrier">
      <h1 className="freigaben-title">Honorarverrechnung</h1>
      <h2 className="hn-h2">Datenträger erstellen</h2>

      {!state.carrierFileName ? (
        <div className="hn-empty hn-carrier-empty">
          <p>Vergewissere dich, dass Schritt 1 vollständig ist und erstelle den Datenträger.</p>
          <button type="button" className="btn-primary" onClick={() => createCarrier(finanzenMonth)}>
            Datenträger erstellen
          </button>
          <button type="button" className="btn-secondary" disabled>
            Datenträger importieren
          </button>
        </div>
      ) : (
        <div className="hn-carrier-done">
          <p className="hn-file">{state.carrierFileName}</p>
          <p>{count} Partner</p>
          <label>
            <input
              type="checkbox"
              checked={state.checklist.count}
              onChange={(event) => setChecklist("count", event.target.checked)}
            />
            Anzahl Partner stimmt
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.checklist.sum}
              onChange={(event) => setChecklist("sum", event.target.checked)}
            />
            Summe geprüft
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.checklist.banks}
              onChange={(event) => setChecklist("banks", event.target.checked)}
            />
            Bankverbindungen geprüft
          </label>
          <button type="button" className="btn-primary" disabled={!ready || month?.steps.dataCarrier} onClick={() => setConfirm(true)}>
            An BMD übergeben
          </button>
        </div>
      )}

      {confirm ? (
        <ConfirmModal
          title="An BMD übergeben?"
          text="Die Rechnungen gelten danach als erstellt."
          confirmLabel="Übergeben"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            handToBmd(finanzenMonth);
            setConfirm(false);
            openFinanzenStep("dispatch");
          }}
        />
      ) : null}
    </section>
  );
}
