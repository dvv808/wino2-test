import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import type { HonorarStepKey } from "../types/honorar";
import { monthOf } from "../lib/honorar/queries";
import { useHonorar } from "./store";

const STEPS: {
  id: HonorarStepKey;
  label: string;
  n?: string;
  doneKey: "status" | "data" | "dataCarrier" | "dispatch";
}[] = [
  { id: "status", label: "Status zu Rechnungen", doneKey: "status" },
  { id: "data", label: "Daten erfassen", n: "1", doneKey: "data" },
  { id: "carrier", label: "Datenträger erstellen", n: "2", doneKey: "dataCarrier" },
  { id: "dispatch", label: "Empfangene Daten verarbeiten", n: "3", doneKey: "dispatch" },
];

export function HonorarStepper() {
  const { state } = useHonorar();
  const { finanzenMonth, finanzenStep, openFinanzenStep } = useWorkflow();
  const month = monthOf(state, finanzenMonth);

  if (!month) return null;
  const done = month.steps;

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
