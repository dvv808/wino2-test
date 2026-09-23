import { useWorkflow } from "../workflow";
import type { HonorarStepKey } from "../types/honorar";
import { monthOf } from "../lib/honorar/queries";
import { useHonorar } from "./store";
import { StatusBadge } from "./ui";

const STEPS: { id: HonorarStepKey; label: string; doneKey: "status" | "data" | "dataCarrier" | "dispatch" }[] = [
  { id: "status", label: "Status zu Rechnungen", doneKey: "status" },
  { id: "data", label: "1 Daten erfassen", doneKey: "data" },
  { id: "carrier", label: "2 Datenträger erstellen", doneKey: "dataCarrier" },
  { id: "dispatch", label: "3 Rechnungsversand", doneKey: "dispatch" },
];

function lockedReason(done: { status: boolean; data: boolean; dataCarrier: boolean }, id: HonorarStepKey) {
  if (id === "data" && !done.status) return "Erst Status zu Rechnungen abschliessen";
  if (id === "carrier" && !done.data) return "Erst Daten erfassen abschliessen";
  if (id === "dispatch" && !done.dataCarrier) return "Erst Datenträger erstellen abschliessen";
  return "";
}

export function HonorarStepper() {
  const { state } = useHonorar();
  const { finanzenMonth, finanzenStep, openFinanzenStep } = useWorkflow();
  const month = monthOf(state, finanzenMonth);
  if (!month) return null;
  const done = month.steps;

  return (
    <div className="hn-stepper">
      {STEPS.map((step) => {
        const locked = Boolean(lockedReason(done, step.id));
        const complete = done[step.doneKey];
        const current = finanzenStep === step.id;
        return (
          <button
            type="button"
            key={step.id}
            className={`hn-step${current ? " active" : ""}${locked ? " locked" : ""}`}
            disabled={locked}
            title={locked ? lockedReason(done, step.id) : undefined}
            onClick={() => openFinanzenStep(step.id)}
          >
            <span>{step.label}</span>
            {complete ? <StatusBadge kind="fertig" /> : current ? <StatusBadge kind="offen" /> : null}
          </button>
        );
      })}
    </div>
  );
}
