/**
 * Maklervereinbarung: Gültigkeit & Erstmalige Verrechnung.
 *
 * - Gültig ab der letzten Unterschrift: Kunde unterschreibt am 01.08., Makler Winter am 20.08. → gültig ab 20.08.
 * - Erstmalig verrechnet wird ab dieser Unterschrift: am nächsten Monatsersten (oder am individuellen Datum).
 * - Rumpfjahr: bis zur nächsten Hauptfälligkeit wird aliquot verrechnet, und zwar zum Zeitpunkt der erstmaligen
 *   Verrechnung. Danach jährlich zur Hauptfälligkeit.
 */

const DAY = 24 * 3600 * 1000;

/** "24", "11", "2027" → date, or null while a part is missing or invalid. */
export function dateOf(day: string, month: string, year: string): Date | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !/^\d{4}$/.test(year)) return null;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/** The later of both signatures; null while one of them is still missing. */
export function gueltigAb(kunde: Date | null, winter: Date | null): Date | null {
  if (!kunde || !winter) return null;
  return kunde > winter ? kunde : winter;
}

/** "Nächste Monatserste nach Abschluss": the 1st on or after the day the agreement is valid. */
export function naechsterMonatserster(from: Date): Date {
  return from.getDate() === 1 ? new Date(from) : new Date(from.getFullYear(), from.getMonth() + 1, 1);
}

/** First Hauptfälligkeit (day / month) after the given day. */
export function naechsteHauptfaelligkeit(from: Date, dueDay: number, dueMonth: number): Date {
  const thisYear = new Date(from.getFullYear(), dueMonth - 1, dueDay);
  return thisYear > from ? thisYear : new Date(from.getFullYear() + 1, dueMonth - 1, dueDay);
}

const days = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY);

export type Verrechnung = {
  /** First billing date. */
  ab: Date;
  /** Next Hauptfälligkeit; from there on the full yearly amount. */
  bis: Date;
  /** Days billed pro rata (0 when the first billing is on the Hauptfälligkeit itself). */
  tage: number;
  /** Pro-rata amount for the Rumpfjahr, rounded to cents. */
  betrag: number;
  rumpfjahr: boolean;
};

/**
 * The first billing and its pro-rata amount. `ab` is the first billing date (next Monatserster or the individual
 * date); the Rumpfjahr runs from there to the day before the next Hauptfälligkeit, billed at `ab`.
 */
export function ersteVerrechnung(ab: Date, jahresbetrag: number, dueDay: number, dueMonth: number): Verrechnung {
  const sameDay = ab.getDate() === dueDay && ab.getMonth() === dueMonth - 1;
  if (sameDay) return { ab, bis: ab, tage: 0, betrag: jahresbetrag, rumpfjahr: false };
  const bis = naechsteHauptfaelligkeit(ab, dueDay, dueMonth);
  const year = days(new Date(bis.getFullYear() - 1, bis.getMonth(), bis.getDate()), bis);
  const tage = days(ab, bis);
  return { ab, bis, tage, betrag: Math.round((jahresbetrag * tage * 100) / year) / 100, rumpfjahr: true };
}

const pad = (n: number) => String(n).padStart(2, "0");
export const ddmmyyyy = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
// de-DE: thousands with "." (EUR 1.200,00) as in Figma; de-AT would print a narrow space.
export const euro = (n: number) => `€ ${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "EUR 120,00" → 120 */
export function amountOf(text: string) {
  const n = Number(text.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
