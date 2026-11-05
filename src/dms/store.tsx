import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createDmsSeed } from "../mocks/dms/seed";
import type { DmsState, PersonId } from "../types/dms";
import { applyAllAutoTransitions } from "../lib/dms/workflow";

export const DMS_STORAGE_KEY = "wino.dms.v1";

/** Saved state survives a reload; a missing or outdated save starts from the seed. */
export function loadDmsState(storage: Pick<Storage, "getItem"> | null = safeStorage()): DmsState {
  const seed = applyAllAutoTransitions(createDmsSeed());
  try {
    const raw = storage?.getItem(DMS_STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<DmsState>;
    if (parsed.version !== seed.version || !Array.isArray(parsed.documents)) return seed;
    return applyAllAutoTransitions({ ...seed, ...parsed } as DmsState);
  } catch {
    return seed;
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function useDmsState() {
  const [state, setState] = useState<DmsState>(() => loadDmsState());

  useEffect(() => {
    try {
      safeStorage()?.setItem(DMS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the prototype keeps working in memory.
    }
  }, [state]);

  return useMemo(
    () => ({
      state,
      /** Every change goes through here, so later phases can add history or automatic transitions in one place. */
      apply: (fn: (prev: DmsState) => DmsState) => setState((prev) => applyAllAutoTransitions(fn(prev))),
      setActivePerson: (id: PersonId) => setState((prev) => ({ ...prev, activePerson: id })),
      reset: () => setState(applyAllAutoTransitions(createDmsSeed())),
    }),
    [state],
  );
}

type DmsApi = ReturnType<typeof useDmsState>;

const DmsContext = createContext<DmsApi | null>(null);

export function DmsProvider({ children }: { children: ReactNode }) {
  const api = useDmsState();
  return <DmsContext.Provider value={api}>{children}</DmsContext.Provider>;
}

export function useDms() {
  const api = useContext(DmsContext);
  if (!api) throw new Error("useDms must be used inside DmsProvider");
  return api;
}
