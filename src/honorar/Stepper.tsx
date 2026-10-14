import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import type { HonorarStepKey } from "../types/honorar";
import { abbucherSynced, feesOfMonth, monthOf, reminderCandidates } from "../lib/honorar/queries";
import { useHonorar } from "./store";

const STEPS: {
  id: HonorarStepKey;
  label: string;
  n?: string;
  doneKey: "status" | "data" | "dataCarrier" | "abbucher" | "dispatch" | "reminders";
}[] = [
  { id: "status", label: "Status zu Rechnungen", doneKey: "status" },
  { id: "data", label: "Daten erfassen", n: "1", doneKey: "data" },
  { id: "carrier", label: "Datenträger erstellen", n: "2", doneKey: "dataCarrier" },
  { id: "dispatch", label: "Rechnungsversand (Rechnungen)", n: "3", doneKey: "dispatch" },
  { id: "abbucher", label: "Status zu Zahlungen (Abbucher)", n: "4", doneKey: "abbucher" },
  { id: "reminders", label: "Zahlungserinnerungen (Rechnungen)", n: "5", doneKey: "reminders" },
];

export function HonorarStepper() {
  const { state } = useHonorar();
  const { finanzenMonth, finanzenStep, openFinanzenStep } = useWorkflow();
  const month = monthOf(state, finanzenMonth);

  if (!month) return null;
  const overdue = reminderCandidates(state, finanzenMonth);
  // Abbucher never goes through the invoice dispatch (mail/post) - the debit is settled directly in Infinity.
  const dispatchFees = feesOfMonth(state, finanzenMonth).filter((fee) => fee.paymentMethod !== "Abbucher");
  const done = {
    ...month.steps,
    // Step 4 is finished as soon as the direct debits have their result from Infinity.
    abbucher: abbucherSynced(state, finanzenMonth),
    // Step 3 is finished as soon as every invoice of the month has been sent.
    dispatch: month.steps.dispatch || (dispatchFees.length > 0 && dispatchFees.every((fee) => fee.invoiceStatus === "sent")),
    reminders: overdue.length > 0 && overdue.every((fee) => fee.reminderSentAt),
  };

  return (
    <div className="stepper-wrap">
      <div className="stepper">
        {STEPS.map((step) => {
          const complete = done[step.doneKey];
          const current = finanzenStep === step.id;
          return (
            <button
              type="button"
              key={step.id}
              className={current ? "step active" : "step"}
              onClick={() => openFinanzenStep(step.id)}
            >
              {step.n ? (
                <span className={`step-num${current ? " active" : ""}`}>
                  <img src={current ? a.stepActive : a.stepDone} alt="" />
                  <span>{step.n}</span>
                </span>
              ) : (
                <span className="step-tasks">
                  <img src={a.stepRing} alt="" />
                  <img src={a.tasksInner} alt="" />
                  <img className="glyph" src={a.tasks} alt="" />
                </span>
              )}
              <span className="step-label">{step.label}</span>
              {step.id === "status" ? null : complete ? (
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
