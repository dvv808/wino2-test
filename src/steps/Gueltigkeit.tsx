import { InfoBox, WarnBox } from "../ui";
import { useWorkflow } from "../workflow";
import {
  amountOf,
  dateOf,
  ddmmyyyy,
  ersteVerrechnung,
  euro,
  gueltigAb,
  naechsterMonatserster,
  type Verrechnung,
} from "../lib/maklervereinbarung/gueltigkeit";

/** Gültigkeit and first billing from the two signatures and the Honorar settings (see lib/maklervereinbarung). */
export function useGueltigkeit() {
  const {
    signDay,
    signMonth,
    signYear,
    winterSignDay,
    winterSignMonth,
    winterSignYear,
    billing,
    day,
    month,
    year,
    dueDay,
    dueMonth,
    amount,
  } = useWorkflow();
  const kunde = dateOf(signDay, signMonth, signYear);
  const winter = dateOf(winterSignDay, winterSignMonth, winterSignYear);
  const gueltig = gueltigAb(kunde, winter);
  const custom = billing === "custom" ? dateOf(day, month, year) : null;
  // An individual date before the agreement is valid (or before a signature already known) cannot be billed.
  const known = [kunde, winter].filter((x): x is Date => Boolean(x));
  const earliest = gueltig ?? (known.length ? new Date(Math.max(...known.map((x) => x.getTime()))) : null);
  const tooEarly = Boolean(custom && earliest && custom < earliest);
  const ab = custom && !tooEarly ? custom : gueltig ? naechsterMonatserster(gueltig) : null;
  const v: Verrechnung | null = ab ? ersteVerrechnung(ab, amountOf(amount), Number(dueDay), Number(dueMonth)) : null;
  const last = gueltig && winter && kunde ? (winter >= kunde ? "Makler Winter" : "Kunde") : null;
  return { kunde, winter, gueltig, earliest, custom, tooEarly, verrechnung: v, last, jahresbetrag: amountOf(amount), dueDay, dueMonth };
}

/** The explanation under Hauptfälligkeit (Honorar) and under the signatures (Signaturen). */
export function GueltigkeitInfo() {
  const g = useGueltigkeit();
  const due = `${g.dueDay}.${g.dueMonth}`;
  return (
    <>
      {/* Same info box as under "Bankverbindung für Abbuchung". */}
      <InfoBox>
        {g.gueltig ? (
          <>
            Gültig ab <strong>{ddmmyyyy(g.gueltig)}</strong> – der letzten Unterschrift ({g.last}).
          </>
        ) : (
          <>
            Gültig ab der letzten Unterschrift (Kunde und Makler Winter). Kunde:{" "}
            {g.kunde ? ddmmyyyy(g.kunde) : "ausstehend"} · Makler Winter: {g.winter ? ddmmyyyy(g.winter) : "ausstehend"}.
          </>
        )}{" "}
        {g.verrechnung ? (
          g.verrechnung.rumpfjahr ? (
            <>
              Erstmalig verrechnet am <strong>{ddmmyyyy(g.verrechnung.ab)}</strong>: aliquot für das Rumpfjahr bis zur
              Hauptfälligkeit {ddmmyyyy(g.verrechnung.bis)} ({g.verrechnung.tage} Tage) <strong>{euro(g.verrechnung.betrag)}</strong>.
              Danach jährlich zur Hauptfälligkeit am {due}: {euro(g.jahresbetrag)}.
            </>
          ) : (
            <>
              Erstmalig verrechnet am <strong>{ddmmyyyy(g.verrechnung.ab)}</strong> mit dem vollen Jahresbetrag{" "}
              {euro(g.jahresbetrag)}, danach jährlich zur Hauptfälligkeit am {due}.
            </>
          )
        ) : (
          <>
            Erstmalig verrechnet wird ab dieser Unterschrift; bis zur nächsten Hauptfälligkeit ({due}) aliquot.
          </>
        )}
      </InfoBox>
      {g.tooEarly && g.custom && g.earliest ? (
        <WarnBox>
          Das individuelle Datum {ddmmyyyy(g.custom)} liegt vor der {g.gueltig ? "Gültigkeit" : "Unterschrift"} (
          {ddmmyyyy(g.earliest)}). Verrechnet wird frühestens ab {ddmmyyyy(naechsterMonatserster(g.earliest))}.
        </WarnBox>
      ) : null}
    </>
  );
}
