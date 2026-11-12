/**
 * Maklervereinbarung Unternehmen: Zahlweise (Figma 21232:21124).
 *
 * - Jährlich / Halbjährlich / Vierteljährlich, the Hauptfälligkeit month is the first due date of the cycle
 *   (Hauptfälligkeit 01.01. + vierteljährlich → 01.01., 01.04., 01.07., 01.10.).
 * - From the first billing to the next due date of the cycle the Honorar is billed aliquot, per month:
 *   ab 01.08., vierteljährlich, EUR 1.200,00 → 01.08. bis 30.09. = 2 Monate = EUR 200,00;
 *   halbjährlich (01.01., 01.07.) → 01.08. bis 31.12. = 5 Monate = EUR 500,00.
 */
import type { Frequency } from "../../workflow";
import { dateOf, naechsterMonatserster } from "./gueltigkeit";

/**
 * First billing for Unternehmen (Figma 21165:30293): the Individuelles Datum (1st of a future month), or the
 * next 1st after Abschluss der Vereinbarung – the last signature when known, else the next 1st from today.
 */
export function companyErsteVerrechnung(billing: "next" | "custom", month: string, year: string, gueltig: Date | null): Date | null {
  if (billing === "custom") {
    const d = dateOf("01", month, year);
    return d && d > new Date() ? d : null;
  }
  if (gueltig) return naechsterMonatserster(gueltig);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  yearly: "Jährlich",
  half: "Halbjährlich",
  quarter: "Vierteljährlich",
};

/** Adjective for the instalment sentence: "Das vierteljährliche Honorar beträgt …". */
export const FREQUENCY_ADJ: Record<Frequency, string> = {
  yearly: "jährliche",
  half: "halbjährliche",
  quarter: "vierteljährliche",
};

const PER_YEAR: Record<Frequency, number> = { yearly: 1, half: 2, quarter: 4 };

/** The Zahlweise block only appears from this yearly amount on; below it the Honorar is billed yearly. */
export const ZAHLWEISE_AB = 1000;
export const MINDESTBETRAG = 300;

export type Zahlweise = {
  /** Due months of the cycle as "01.01.", "01.04.", … sorted through the year. */
  termine: string[];
  /** One instalment (Jahresbetrag / periods). */
  rate: number;
  /** First billing date. */
  ab: Date;
  /** Last day billed aliquot (day before the next due date); equals ab - 1 when not aliquot. */
  bis: Date;
  /** Months billed aliquot; 0 when the first billing falls on a due date. */
  monate: number;
  /** Amount billed at `ab`: aliquot share, or one full instalment. */
  betrag: number;
};

export function zahlweise(ab: Date, jahresbetrag: number, dueMonth: number, frequency: Frequency): Zahlweise {
  const n = PER_YEAR[frequency];
  const step = 12 / n;
  const months = Array.from({ length: n }, (_, k) => (dueMonth - 1 + k * step) % 12).sort((x, y) => x - y);
  const termine = months.map((m) => `01.${String(m + 1).padStart(2, "0")}.`);
  const rate = Math.round((jahresbetrag * 100) / n) / 100;
  // The next due date of the cycle on or after ab (a due date is always the 1st of a month).
  const onFirst = ab.getDate() === 1;
  let monate = onFirst ? 0 : 1;
  while (!months.includes(new Date(ab.getFullYear(), ab.getMonth() + monate, 1).getMonth())) monate += 1;
  const next = new Date(ab.getFullYear(), ab.getMonth() + monate, 1);
  const bis = new Date(next.getFullYear(), next.getMonth(), 0);
  // From a 1st: per month (01.08. → 30.09. = 2/12). From another day: per day over the year.
  const yearDays = Math.round((new Date(next.getFullYear() + 1, next.getMonth(), 1).getTime() - next.getTime()) / 86400000);
  const tage = Math.round((next.getTime() - ab.getTime()) / 86400000);
  const betrag =
    onFirst && monate === 0
      ? rate
      : onFirst
        ? Math.round((jahresbetrag * monate * 100) / 12) / 100
        : Math.round((jahresbetrag * tage * 100) / yearDays) / 100;
  return { termine, rate, ab, bis, monate: onFirst ? monate : tage > 0 ? monate : 0, betrag };
}
