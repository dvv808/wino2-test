import { useEffect, useState } from "react";
import * as a from "../assets/index";
import { dispatchMismatches, partnerOf } from "../lib/honorar/queries";
import type { Fee } from "../types/honorar";
import { Icon, WarnBox } from "../ui";
import { zahlartLabel } from "./invoiceCells";
import { useHonorar } from "./store";
import { PartnerAvatar, PartnerOpenButton, StepEmpty } from "./ui";

const COLUMNS = ["Partner", "Zahlart", "Betrag Wino / BMD", "Anschrift Wino / BMD", "Leistungszeitraum", "Ergebnis"];

const GAP_LABEL = { amount: "Betrag", address: "Anschrift", email: "E-Mail", servicePeriod: "Leistungszeitraum" } as const;

function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

/**
 * Plausibilitätscheck: the data BMD sent back to Wino against the Datenträger that went out.
 * Deviations are highlighted; once everything matches, the tab can be marked Fertig.
 */
export function PlausiCheck({ monthId, fees, loaded }: { monthId: string; fees: Fee[]; loaded: boolean }) {
  const { state, loadBmd, importBmdCorrection, realignFee } = useHonorar();
  // The comparison takes a moment, like a real lookup: no instant flash of results.
  const [checking, setChecking] = useState(loaded);
  useEffect(() => {
    if (!checking) return;
    const timer = window.setTimeout(() => setChecking(false), 1000);
    return () => window.clearTimeout(timer);
  }, [checking]);

  if (!loaded) {
    return (
      <StepEmpty
        icon={a.docList}
        title="Noch keine Daten von BMD"
        lead="Sobald BMD die Rechnungen an Wino sendet (Schritt 2), werden sie hier mit dem Datenträger abgeglichen."
        link="BMD-Daten laden"
        onLink={() => {
          loadBmd(monthId, true);
          setChecking(true);
        }}
      />
    );
  }

  const rows = fees.map((fee) => {
    const partner = partnerOf(state, fee.partnerId);
    return { fee, partner, gaps: dispatchMismatches(fee, partner) };
  });
  const off = rows.filter((row) => row.gaps.length > 0);

  function importCorrection() {
    importBmdCorrection(monthId);
    off.forEach((row) => realignFee(row.fee.id));
  }

  return (
    <>
      {checking ? (
        <p className="hn-plausi-checking" role="status">
          Daten werden mit BMD abgeglichen…
        </p>
      ) : off.length > 0 ? (
        <div className="hn-step-warn">
          <WarnBox>
            {off.length} {off.length === 1 ? "Rechnung weicht" : "Rechnungen weichen"} von den Daten in Wino ab. Korrigiere sie in BMD
            und importiere die Korrektur.{" "}
            <button type="button" className="hn-link" onClick={importCorrection}>
              Korrektur aus BMD importieren
            </button>
          </WarnBox>
        </div>
      ) : (
        <div className="hn-carrier-done-group">
          <article className="hn-carrier-done" style={{ backgroundImage: `url(${a.hnCarrierDone})` }}>
            <p className="hn-carrier-done-title">
              <img src={a.confirm} alt="" width={24} height={24} />
              Alles stimmt überein.
            </p>
            <p className="hn-carrier-done-meta">
              Alle {fees.length} Rechnungen aus BMD passen zum Datenträger. Markiere den Plausibilitätscheck als Fertig.
            </p>
          </article>
        </div>
      )}

      <div className="hn-status-table plausi" role="table" aria-label="Plausibilitätscheck">
        <div className="hn-st-head" role="row">
          {COLUMNS.map((label) => (
            <div className="hn-st-th" role="columnheader" key={label}>
              <span className="hn-st-label">{label}</span>
            </div>
          ))}
        </div>
        {rows.map(({ fee, partner, gaps }) => {
          const bmd = fee.bmd;
          const amountOff = !checking && gaps.includes("amount");
          const addressOff = !checking && gaps.includes("address");
          const periodOff = !checking && gaps.includes("servicePeriod");
          return (
            <div className={!checking && gaps.length ? "hn-st-row off" : "hn-st-row"} role="row" key={fee.id}>
              <div className="hn-st-partner">
                <span className="partner-avatar">
                  <PartnerAvatar company={partner?.type === "company"} />
                  {partner?.type === "company" ? <img className="winter" src={a.winterMark} alt="" /> : null}
                </span>
                <span className="partner-copy">
                  <strong>{partner?.name}</strong>
                </span>
                <PartnerOpenButton partner={partner} />
              </div>
              <div>{zahlartLabel(fee.paymentMethod)}</div>
              <div className={amountOff ? "hn-st-stack hn-plausi-off" : "hn-st-stack"}>
                <span>{money(fee.amount)}</span>
                <span>{checking ? "…" : bmd ? money(bmd.amount) : "-"}</span>
              </div>
              <div className={addressOff ? "hn-st-stack hn-plausi-off" : "hn-st-stack"}>
                <span>{partner?.address}</span>
                <span>{checking ? "…" : bmd?.address ?? "-"}</span>
              </div>
              <div className={periodOff ? "hn-st-stack hn-plausi-off" : "hn-st-stack"}>
                <span>{fee.servicePeriod}</span>
              </div>
              <div className="hn-st-note">
                {checking ? (
                  <span>Wird geprüft…</span>
                ) : gaps.length ? (
                  <>
                    <img src={a.hnAttention} alt="" width={16.5} height={15.4688} />
                    <span>Abweichung: {gaps.map((gap) => GAP_LABEL[gap]).join(", ")}</span>
                  </>
                ) : (
                  <>
                    <Icon src={a.confirm} size={16} />
                    <span>Stimmt überein</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
