import { useSyncExternalStore } from "react";

/**
 * Verknüpfung: Sonstiges (Figma 22715:142102). Any partner – Privatperson or Unternehmen – can be linked to a
 * company (only companies can be picked), with a mandatory Notiz. Links are bidirectional: one link shows on both
 * files (Julia → Lunixo AG also shows under Lunixo AG's Sonstiges).
 *
 * Like Familie and Konzern, changes are a draft until Speichern in the Stammdaten workflow (publish); Abbrechen
 * reverts to the last saved state (snapshot).
 */
export type SonstigeLink = {
  id: string;
  /** Who created it. */
  ownerId: string;
  /** The linked company; null while the draft has no partner yet. */
  partnerId: string | null;
  note: string;
  /** Saved with Speichern; until then the card is an Entwurf. */
  published?: boolean;
};

const SEED: SonstigeLink[] = [
  // Figma: Lunixo AG – Sonstiges (1): O&O Haus-Services, "Hausverwaltung der Liegenschaft".
  { id: "so-lunixo-oo", ownerId: "lunixo", partnerId: "oo-haus-services", note: "Hausverwaltung der Liegenschaft", published: true },
];
/** Saved (published) links survive a reload, like Familie and Konzern; drafts do not. */
const STORAGE_KEY = "wino.verknuepfung.sonstiges.v1";

function load(): SonstigeLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : structuredClone(SEED);
  } catch {
    return structuredClone(SEED);
  }
}

function persist(list: SonstigeLink[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((link) => link.published)));
  } catch {
    // Not saved: holds until reload.
  }
}

let links: SonstigeLink[] = load();
let saved: SonstigeLink[] = structuredClone(links);
let counter = 0;
const listeners = new Set<() => void>();

function emit(next: SonstigeLink[]) {
  links = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The other side of a link, seen from `viewerId`. */
export const otherSide = (link: SonstigeLink, viewerId: string) => (link.ownerId === viewerId ? link.partnerId : link.ownerId);

/** Complete: a company is picked and the Notiz is filled in. */
export const isComplete = (link: SonstigeLink) => Boolean(link.partnerId && link.note.trim());

/** Every link that involves `viewerId`, from either side. */
export const linksFor = (all: SonstigeLink[], viewerId: string) =>
  all.filter((link) => link.ownerId === viewerId || link.partnerId === viewerId);

/** An untouched empty draft (opened by the tab itself) is not a change. */
const comparable = (list: SonstigeLink[]) =>
  JSON.stringify(list.filter((link) => link.partnerId || link.note.trim()));

/** Save hooks for the Stammdaten workflow's Speichern / Abbrechen (see verknuepfungSave). */
export const sonstigeSave = {
  snapshot() {
    saved = structuredClone(links);
  },
  revert() {
    emit(structuredClone(saved));
  },
  /** Speichern: every complete link involving this file becomes saved; empty drafts are dropped. */
  publish(viewerId: string) {
    emit(
      links
        .filter((link) => link.partnerId || link.note.trim())
        .map((link) =>
          (link.ownerId === viewerId || link.partnerId === viewerId) && isComplete(link) ? { ...link, published: true } : link,
        ),
    );
    saved = structuredClone(links);
    persist(saved);
  },
  dirty: () => comparable(links) !== comparable(saved),
  /** A started link of this file without company or without Notiz: Speichern waits (Notiz is Pflicht). */
  incomplete: (viewerId: string) =>
    linksFor(links, viewerId).some((link) => (link.partnerId || link.note.trim()) && !isComplete(link)),
  /** Something Speichern can save: a complete link of this file that is new or changed. */
  publishable: (viewerId: string) =>
    linksFor(links, viewerId).some((link) => {
      if (!isComplete(link)) return false;
      const before = saved.find((entry) => entry.id === link.id);
      return !link.published || !before || JSON.stringify(before) !== JSON.stringify(link);
    }),
};

export function useSonstigeLinks() {
  const all = useSyncExternalStore(subscribe, () => links);
  return {
    links: all,
    startDraft(ownerId: string) {
      const open = links.find((link) => link.ownerId === ownerId && !link.partnerId);
      if (open) return open.id;
      counter += 1;
      const id = `so-${ownerId}-${Date.now()}-${counter}`;
      emit([...links, { id, ownerId, partnerId: null, note: "" }]);
      return id;
    },
    setPartner(id: string, partnerId: string) {
      emit(links.map((link) => (link.id === id ? { ...link, partnerId } : link)));
    },
    setNote(id: string, note: string) {
      emit(links.map((link) => (link.id === id ? { ...link, note } : link)));
    },
    /** Auflösen is immediate (with undo), like Familie and Konzern. */
    remove(id: string) {
      const removed = links.find((link) => link.id === id) ?? null;
      emit(links.filter((link) => link.id !== id));
      saved = saved.filter((link) => link.id !== id);
      persist(saved);
      return removed;
    },
    restore(link: SonstigeLink) {
      emit([...links.filter((entry) => entry.id !== link.id), link]);
      if (link.published) {
        saved = [...saved.filter((entry) => entry.id !== link.id), structuredClone(link)];
        persist(saved);
      }
    },
  };
}
