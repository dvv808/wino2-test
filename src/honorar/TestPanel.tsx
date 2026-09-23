import { useState } from "react";
import type { HonorarRole } from "../types/honorar";
import { feesOfMonth, previousFees } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";

const ROLES: { id: HonorarRole; label: string }[] = [
  { id: "backoffice", label: "Backoffice" },
  { id: "advisor", label: "Kundenberater Mike Bennett" },
  { id: "head", label: "Bereichsleiter" },
  { id: "approver", label: "Freigeber" },
];

export function TestPanel() {
  const { state, setRole, reset, setToday, simulateLastWorkingDay, receivePayment, sepaChargeback, exceedDueDates, importCaptureData, fillRequiredFields, loadBmd, importBmdCorrection, bounceMail, reminderOverdue, bookOpenPayment } =
    useHonorar();
  const { finanzenMonth, finanzenPage, openFinanzen } = useWorkflow();
  const [open, setOpen] = useState(false);
  const [feeId, setFeeId] = useState("");
  const previous = previousFees(state, finanzenMonth);
  const current = feesOfMonth(state, finanzenMonth);
  const bounceOptions = current.filter((fee) => fee.invoiceStatus === "sent");

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
          <label>
            Rolle
            <select value={state.role} onChange={(event) => {
              const role = event.target.value as HonorarRole;
              setRole(role);
              if (role === "advisor" || role === "head") openFinanzen("meinBereich");
            }}>
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={reset}>
            Szenario zurücksetzen
          </button>
          <label>
            Heute
            <input type="date" value={state.today} onChange={(event) => setToday(event.target.value)} />
          </label>
          <button type="button" onClick={simulateLastWorkingDay}>
            Letzter Werktag simulieren
          </button>

          {finanzenPage === "month" ? (
            <>
              <p>Schritt 0</p>
              <select value={feeId} onChange={(event) => setFeeId(event.target.value)}>
                <option value="">Partner</option>
                {previous.map((fee) => (
                  <option key={fee.id} value={fee.id}>
                    {fee.partnerId}
                  </option>
                ))}
              </select>
              <button type="button" disabled={!feeId} onClick={() => receivePayment(feeId, 120)}>
                Zahlung (voll)
              </button>
              <button type="button" disabled={!feeId} onClick={() => receivePayment(feeId, 20)}>
                Zahlung (teil)
              </button>
              <button type="button" disabled={!feeId} onClick={() => sepaChargeback(feeId)}>
                SEPA-Rücklastschrift
              </button>
              <button type="button" onClick={exceedDueDates}>
                Zahlungsziel überschreiten
              </button>

              <p>Schritt 1</p>
              <button type="button" onClick={() => importCaptureData(finanzenMonth)}>
                XLS-Import simulieren
              </button>
              <button type="button" onClick={() => fillRequiredFields(finanzenMonth)}>
                Pflichtfelder füllen
              </button>

              <p>Schritt 3</p>
              <button type="button" onClick={() => loadBmd(finanzenMonth, false)}>
                BMD-Daten laden
              </button>
              <button type="button" onClick={() => loadBmd(finanzenMonth, true)}>
                BMD-Daten laden (2 Abweichungen)
              </button>
              <button type="button" onClick={() => importBmdCorrection(finanzenMonth)}>
                BMD-Korrektur importieren
              </button>
              <select value={feeId} onChange={(event) => setFeeId(event.target.value)}>
                <option value="">Bounce-Partner</option>
                {bounceOptions.map((fee) => (
                  <option key={fee.id} value={fee.id}>
                    {fee.partnerId}
                  </option>
                ))}
              </select>
              <button type="button" disabled={!feeId} onClick={() => bounceMail(feeId)}>
                Mail-Bounce
              </button>
            </>
          ) : null}

          {finanzenPage === "openItems" ? (
            <>
              <p>Offene Posten</p>
              <select value={feeId} onChange={(event) => setFeeId(event.target.value)}>
                <option value="">Posten</option>
                {state.openItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.partnerId} {item.status}
                  </option>
                ))}
              </select>
              <button type="button" disabled={!feeId} onClick={() => reminderOverdue(feeId)}>
                Erinnerung ohne Reaktion
              </button>
              <button type="button" disabled={!feeId} onClick={() => bookOpenPayment(feeId, 20)}>
                Zahlung simulieren
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
