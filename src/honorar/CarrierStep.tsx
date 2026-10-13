import { useState } from "react";
import * as a from "../assets/index";
import { monthLabel } from "../lib/honorar/format";
import { feesOfMonth, monthOf, totals } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { useHonorar } from "./store";

function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

const NEXT_STEPS = [
  "Datenträger herunterladen und",
  "in BMD importieren.",
  "Rechnungen in BMD erfassen.",
  "An Wino senden und mit Schritt 3. Rechnungsversand weitermachen.",
];

function createdLine(iso: string, user: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return `Erstellt von ${user}`;
  const clock = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `Erstellt am ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}, ${clock} Uhr von ${user}`;
}

export function CarrierStep() {
  const { finanzenMonth, openFinanzenStep } = useWorkflow();
  const { state, createCarrier, handToBmd, setStepDone, setCarrierTick } = useHonorar();
  const [ask, setAsk] = useState(false);
  const ticks = NEXT_STEPS.map((_, i) => state.carrierTicks[finanzenMonth]?.[i] ?? false);

  function toggleStep(index: number) {
    setCarrierTick(finanzenMonth, index, !ticks[index], NEXT_STEPS.length);
  }

  const fees = feesOfMonth(state, finanzenMonth);
  const sum = totals(fees);
  const month = monthOf(state, finanzenMonth);
  const created = [...state.history]
    .reverse()
    .find((entry) => entry.refType === "month" && entry.refId === finanzenMonth && entry.action === "Datenträger erstellt");
  const handed = state.history.some(
    (entry) => entry.refType === "month" && entry.refId === finanzenMonth && entry.action === "Datenträger übermittelt",
  );
  const dataDone = Boolean(month?.steps.data);
  const partnerWord = fees.length === 1 ? "Partner" : "Partnern";

  function confirm() {
    createCarrier(finanzenMonth);
    setAsk(false);
  }

  function submitCarrier() {
    if (!handed && !month?.closed) {
      handToBmd(finanzenMonth);
      // Handing over does not tick off the checklist: step 2 stays open until every box is ticked.
      if (!ticks.every(Boolean)) setStepDone(finanzenMonth, "dataCarrier", false);
    }
    openFinanzenStep("dispatch");
  }

  function downloadCarrier() {
    const name = `Honorar_${finanzenMonth}.xml`;
    const rows = fees
      .map((fee) => {
        const partner = state.partners.find((entry) => entry.id === fee.partnerId);
        return `  <Honorar partner="${partner?.name ?? fee.partnerId}" betrag="${fee.amount.toFixed(2)}"/>`;
      })
      .join("\n");
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n<Datentraeger monat="${finanzenMonth}">\n${rows}\n</Datentraeger>\n`], {
      type: "application/xml",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="freigaben hn-panel">
      <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
      <p className="hn-month">
        <strong>{monthLabel(finanzenMonth)}</strong> {finanzenMonth.slice(0, 4)}
      </p>
      <h2 className="hn-h2 hn-status-title">Datenträger erstellen</h2>

      {created ? (
        <>
        <article className="hn-carrier-done" style={{ backgroundImage: `url(${a.hnCarrierDone})` }}>
          <p className="hn-carrier-done-title">
            <img src={a.confirm} alt="" width={24} height={24} />
            Datenträger erstellt. Jetzt in BMD weiter verarbeiten.
          </p>
          <p className="hn-carrier-done-meta">{createdLine(created.timestamp, created.user)}</p>
          <p className="hn-carrier-done-link">
            <img src={a.comment} alt="" width={12.5358} height={13.5} />
            1 Kommentar
          </p>
          <button type="button" className="hn-carrier-done-link" onClick={downloadCarrier}>
            <img src={a.download} alt="" width={14.5} height={13.6583} />
            Datenträger herunterladen
          </button>
        </article>
        <section className="hn-next-steps" aria-label="Nächste Schritte">
          <h3>Nächste Schritte.</h3>
          <ol>
            {NEXT_STEPS.map((label, index) => (
              <li key={label}>
                <label className="hn-tickbox">
                  <input type="checkbox" checked={ticks[index]} onChange={() => toggleStep(index)} />
                  <span className="hn-tickbox-box" aria-hidden>
                    {ticks[index] ? <img src={a.hnCheckTick} alt="" width={16} height={16} /> : null}
                  </span>
                  <span className="hn-tickbox-label">
                    {index + 1}. {label}
                  </span>
                </label>
              </li>
            ))}
          </ol>
          <button type="button" className="hn-carrier-submit" disabled={!ticks.every(Boolean)} onClick={submitCarrier}>
            Weiter zu Schritt 3
          </button>
        </section>
        </>
      ) : (
        <div className="hn-carrier-stage">
          <img className="hn-carrier-ring" src={a.hnCarrierRing} alt="" width={437} height={437} />
          <img className="hn-carrier-ring inner" src={a.hnCarrierRingInner} alt="" width={299} height={299} />
          <span className="hn-carrier-side left">
            <img src={a.hnCarrierRect} alt="" width={277} height={142.408} />
            <img src={a.hnCarrierCardLeft} alt="" width={277} height={142.408} />
          </span>
          <img className="hn-carrier-card" src={a.hnCarrierCard} alt="" width={319} height={164} />
          <span className="hn-carrier-side right">
            <img src={a.hnCarrierRect} alt="" width={277} height={142.408} />
            <img src={a.hnCarrierCardRight} alt="" width={277} height={142.408} />
          </span>
          <p className="hn-carrier-copy">
            Vergewissere dich das in Schritt 1 alles Vollständig ist und erstelle dann den Datenträger.
          </p>
          {dataDone ? null : (
            <p className="hn-carrier-hint">
              <img src={a.onhold} alt="" width={16} height={16} />
              Markiere zuerst in Schritt 1 „Daten erfassen“ als Fertig.
            </p>
          )}
          <button type="button" className="hn-carrier-primary" disabled={!dataDone} onClick={() => setAsk(true)}>
            <img src={a.hnCarrierFiles} alt="" width={11.6918} height={14} />
            Datenträger erstellen
          </button>
          <button type="button" className="hn-carrier-secondary" disabled={!dataDone}>
            <img src={a.download} alt="" width={14.5} height={13.6583} />
            Datenträger importieren
          </button>
        </div>
      )}

      {ask ? (
        <div className="wmodal" role="dialog" aria-label="Datenträger erstellen?">
          <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={() => setAsk(false)} />
          <div className="wmodal-body carrier-ask">
            <button type="button" className="wmodal-close" aria-label="Schließen" onClick={() => setAsk(false)}>
              <img src={a.iconCloseDark} alt="" width={16} height={16} />
            </button>
            <h2>Datenträger erstellen?</h2>
            <p>
              Datenträger mit {fees.length} {partnerWord} über {money(sum.due)} wird an BMD übergeben. Dort werden die
              Rechnungen erstellt.
            </p>
            <footer className="wmodal-foot carrier-ask">
              <button type="button" className="btn-secondary" onClick={() => setAsk(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn-primary" onClick={confirm}>
                Erstellen
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
