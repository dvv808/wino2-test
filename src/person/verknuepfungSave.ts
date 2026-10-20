/** Lets the Stammdaten workflow see Verknüpfung dirty/publish state without importing the stores. */
export type VerknuepfungSaveApi = {
  snapshot: () => void;
  commit: () => void;
  revert: () => void;
  publish: () => void;
  dirty: () => boolean;
  publishable: () => boolean;
};

const empty: VerknuepfungSaveApi = {
  snapshot() {},
  commit() {},
  revert() {},
  publish() {},
  dirty: () => false,
  publishable: () => false,
};

let bound = empty;

export function bindVerknuepfungSave(api: VerknuepfungSaveApi) {
  bound = api;
  return () => {
    if (bound === api) bound = empty;
  };
}

export function verknuepfungSave() {
  return bound;
}
