import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { RECHNUNGSVERSAND_STEPS, monthOf, rechnungsversandDone, type RechnungsversandStep } from "../lib/honorar/queries";
import { useHonorar } from "./store";

const LABELS: Record<RechnungsversandStep, string> = {
  data: "Daten erfassen",
  carrier: "Datenträger erstellen",
  dispatch: "Rechnungsversand (Rechnungen)",
  reminders: "Zahlungserinnerungen (Rechnungen)",
};

/** The Rechnungsversand workflow of a month: four steps that act on all invoices at once. */
export function HonorarStepper() {
  const { state } = useHonorar();
  const { finanzenMonth, finanzenStep, openFinanzenStep } = useWorkflow();
  if (!monthOf(state, finanzenMonth)) return null;
  const done = rechnungsversandDone(state, finanzenMonth);

  return (
    <div className="stepper-wrap">
      <div className="stepper">
        {RECHNUNGSVERSAND_STEPS.map((step, index) => {
          const current = finanzenStep === step;
          return (
            <button
              type="button"
              key={step}
              className={current ? "step active" : "step"}
              onClick={() => openFinanzenStep(step)}
            >
              <span className={`step-num${current ? " active" : ""}`}>
                <img src={current ? a.stepActive : a.stepDone} alt="" />
                <span>{index + 1}</span>
              </span>
              <span className="step-label">{LABELS[step]}</span>
              {done[step] ? (
                <span className="badge done">
                  <Icon src={a.confirm} size={16} />
                  Fertig
                </span>
              ) : (
                <span className="badge">
                  <Icon src={a.onhold} size={16} />
                  Offen
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
