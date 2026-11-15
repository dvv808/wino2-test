import { createContext, useContext, useSyncExternalStore } from "react";

/**
 * What the Mitarbeiter side nav has selected (Figma 22743:399086): the employees and the Zeitpunkt. It is shared,
 * because a selection filters the tables and the dashboard next to it. Nothing selected = everybody.
 */
export type Zeitpunkt = "heute" | number;
type Auswahl = { selected: string[]; zeitpunkt: Zeitpunkt };

let state: Auswahl = { selected: [], zeitpunkt: "heute" };
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
const set = (next: Auswahl) => {
  state = next;
  listeners.forEach((fn) => fn());
};

export const setSelected = (selected: string[]) => set({ ...state, selected });
export const setZeitpunkt = (zeitpunkt: Zeitpunkt) => set({ ...state, zeitpunkt });

/**
 * A department tab narrows everything to its employees: the names of the Abteilung, or null (whole company).
 * Set by the Abteilung view around the side nav and the HRM pages.
 */
export const AbteilungScope = createContext<string[] | null>(null);

/** The side nav's own selection, as ticked (the side nav itself shows this). */
export function useAuswahlRaw() {
  return useSyncExternalStore(subscribe, () => state);
}

/**
 * The selection the HRM pages filter by. In a department tab nothing ticked means "the whole department",
 * and ticks outside it are ignored.
 */
export function useAuswahl(): Auswahl {
  const raw = useAuswahlRaw();
  const scope = useContext(AbteilungScope);
  if (!scope) return raw;
  const inside = raw.selected.filter((name) => scope.includes(name));
  return { ...raw, selected: inside.length ? inside : scope };
}

/** True when `name` is shown under the current selection. */
export const inAuswahl = (selected: string[], name: string) => !selected.length || selected.includes(name);

/** True when an ISO day falls under the Zeitpunkt: "heute" = all years up to today, otherwise that year only. */
export const inZeitpunkt = (zeitpunkt: Zeitpunkt, day: string) => zeitpunkt === "heute" || day.startsWith(`${zeitpunkt}-`);
