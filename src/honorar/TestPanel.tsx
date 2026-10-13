import { useState } from "react";
import { useHonorar } from "./store";
import { ConfirmModal } from "./ui";

/** Testmodus: one control that brings the prototype back to its initial dummy data. */
export function TestPanel() {
  const { state, reset } = useHonorar();
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(false);

  if (!state.testMode) return null;

  return (
    <aside className={`hn-test${open ? "" : " collapsed"}`}>
      <header>
        <strong>Testmodus</strong>
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Zuklappen" : "Aufklappen"}
        </button>
      </header>
      {open ? (
        <div className="hn-test-body">
          <button type="button" onClick={() => setAsk(true)}>
            Auf Anfangszustand zurücksetzen
          </button>
        </div>
      ) : null}

      {ask ? (
        <ConfirmModal
          title="Auf Anfangszustand zurücksetzen?"
          text="Alle Änderungen gehen verloren und die Beispieldaten sind wieder da."
          confirmLabel="Zurücksetzen"
          onCancel={() => setAsk(false)}
          onConfirm={() => {
            reset();
            setAsk(false);
          }}
        />
      ) : null}
    </aside>
  );
}
