import { useSyncExternalStore } from "react";
import type { PartnerId } from "./partners";
import type { StammdatenAreaId } from "./stammdaten";

/**
 * Prüfmodus (Stammdaten beim Kunden prüfen). The advisor goes through the client's Stammdaten on one page,
 * ticks off what is correct and writes down what has to change ("Änderungswünsche") – with attachments – but never
 * edits a field. "Freigabe anfordern" sends it all to the Bestandsmanager, who works the list off line by line in
 * the Stammdaten workflow (übernehmen / ablehnen) and closes the request.
 *
 * Shared between both sides through localStorage, like the Homeoffice-Anträge.
 */

export type ChangeStatus = "offen" | "uebernommen" | "abgelehnt";

export type PruefChange = {
  id: string;
  /** Stammdaten area, or "sonstiges" for a free line. */
  area: StammdatenAreaId | "sonstiges";
  /** What it is about, e.g. "Hauptwohnsitz" or "Telefon". */
  target: string;
  cardId?: string;
  /** The value in Wino today (prefilled when the line was started from a value). */
  from?: string;
  /** What it should be. */
  to: string;
  status: ChangeStatus;
  /** Bestandsmanager's answer when he rejects or asks back. */
  reply?: string;
  /** When it was übernommen / abgelehnt (for the advisor's notification). */
  decided?: string;
};

export type PruefFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Small files keep a preview (data URL); larger ones only their name. */
  url?: string;
  /** The change the attachment proves, e.g. the Meldezettel for the new address. */
  changeId?: string;
};

export type PruefStatus = "entwurf" | "offen" | "abgeschlossen";

export type Pruefung = {
  id: string;
  partnerId: PartnerId;
  partnerName: string;
  advisor: string;
  created: string;
  sent?: string;
  status: PruefStatus;
  /** Areas the advisor confirmed with the client ("passt"). */
  checked: StammdatenAreaId[];
  changes: PruefChange[];
  files: PruefFile[];
  /** General note for the Bestandsmanager. */
  note: string;
  closed?: string;
  closedBy?: string;
  /** Widget notifications the advisor has opened (ids from pruefNotices). */
  read?: string[];
};

const KEY = "wino.pruefung.v1";
const EVENT = "wino:pruefung";

function load(): Pruefung[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let all: Pruefung[] = load();
const listeners = new Set<() => void>();

function save(next: Pruefung[]) {
  all = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Too large (attachments) or blocked: keep it for this session.
  }
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent(EVENT));
}

// Another tab (e.g. the Bestandsmanager in a second window) changed the list.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    all = load();
    listeners.forEach((listener) => listener());
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const pruefungen = () => all;

export function usePruefungen() {
  return useSyncExternalStore(subscribe, () => all);
}

/** The advisor's open draft for this partner, if any. */
export function draftFor(list: Pruefung[], partnerId: PartnerId) {
  return list.find((entry) => entry.partnerId === partnerId && entry.status === "entwurf") ?? null;
}

/** A request already with the Bestandsmanager for this partner. */
export function pendingFor(list: Pruefung[], partnerId: PartnerId) {
  return list.find((entry) => entry.partnerId === partnerId && entry.status === "offen") ?? null;
}

export function startPruefung(partnerId: PartnerId, partnerName: string, advisor: string) {
  const existing = draftFor(all, partnerId);
  if (existing) return existing.id;
  const entry: Pruefung = {
    id: uid("pr"),
    partnerId,
    partnerName,
    advisor,
    created: new Date().toISOString(),
    status: "entwurf",
    checked: [],
    changes: [],
    files: [],
    note: "",
  };
  save([...all, entry]);
  return entry.id;
}

export function updatePruefung(id: string, patch: (entry: Pruefung) => Pruefung) {
  save(all.map((entry) => (entry.id === id ? patch(entry) : entry)));
}

export function addChange(id: string, change: Omit<PruefChange, "id" | "status">) {
  const changeId = uid("ch");
  updatePruefung(id, (entry) => ({ ...entry, changes: [...entry.changes, { ...change, id: changeId, status: "offen" }] }));
  return changeId;
}

export function addFiles(id: string, files: Omit<PruefFile, "id">[]) {
  updatePruefung(id, (entry) => ({ ...entry, files: [...entry.files, ...files.map((file) => ({ ...file, id: uid("f") }))] }));
}

export function discardPruefung(id: string) {
  save(all.filter((entry) => entry.id !== id));
}

export function sendPruefung(id: string) {
  updatePruefung(id, (entry) => ({ ...entry, status: "offen", sent: new Date().toISOString() }));
}

export function setChangeStatus(id: string, changeId: string, status: ChangeStatus, reply?: string) {
  updatePruefung(id, (entry) => ({
    ...entry,
    changes: entry.changes.map((change) =>
      change.id === changeId
        ? {
            ...change,
            status,
            reply: status === "offen" ? undefined : reply ?? change.reply,
            decided: status === "offen" ? undefined : new Date().toISOString(),
          }
        : change,
    ),
  }));
}

export function closePruefung(id: string, by: string) {
  updatePruefung(id, (entry) => ({ ...entry, status: "abgeschlossen", closed: new Date().toISOString(), closedBy: by }));
}

/** Reads a picked file; images and PDFs under ~600 KB keep a preview. */
export function readFile(file: File): Promise<Omit<PruefFile, "id">> {
  return new Promise((resolve) => {
    const meta = { name: file.name, size: file.size, type: file.type };
    if (file.size > 600_000) {
      resolve(meta);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ ...meta, url: String(reader.result) });
    reader.onerror = () => resolve(meta);
    reader.readAsDataURL(file);
  });
}

export const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const stampOf = (iso?: string) => {
  if (!iso) return { date: "–", time: "–" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

/**
 * What the advisor hears back in the widget: every rejected Änderungswunsch (with the reason) and the closed
 * Prüfung with its outcome.
 */
export type PruefNotice = {
  id: string;
  pruefungId: string;
  partnerId: PartnerId;
  title: string;
  subject: string;
  text: string;
  at: string;
  read: boolean;
};

export function pruefNotices(list: Pruefung[]): PruefNotice[] {
  const notices: PruefNotice[] = [];
  for (const entry of list) {
    const read = new Set(entry.read ?? []);
    for (const change of entry.changes) {
      if (change.status !== "abgelehnt" || !change.decided) continue;
      const id = `pn-${entry.id}-${change.id}`;
      notices.push({
        id,
        pruefungId: entry.id,
        partnerId: entry.partnerId,
        title: "Änderung abgelehnt",
        subject: entry.partnerName,
        text: `„${change.target}: ${change.to}“ wurde nicht übernommen.${change.reply ? ` Begründung: ${change.reply}` : ""}`,
        at: change.decided,
        read: read.has(id),
      });
    }
    if (entry.status === "abgeschlossen" && entry.closed) {
      const taken = entry.changes.filter((change) => change.status === "uebernommen").length;
      const rejected = entry.changes.filter((change) => change.status === "abgelehnt").length;
      const id = `pn-${entry.id}-closed`;
      notices.push({
        id,
        pruefungId: entry.id,
        partnerId: entry.partnerId,
        title: "Stammdaten-Prüfung abgeschlossen",
        subject: entry.partnerName,
        text: entry.changes.length
          ? `${taken} von ${entry.changes.length} ${entry.changes.length === 1 ? "Änderung" : "Änderungen"} übernommen${rejected ? `, ${rejected} abgelehnt` : ""}. Abgeschlossen von ${entry.closedBy ?? "Bestandsmanager"}.`
          : `Alle Stammdaten bestätigt – als geprüft vermerkt von ${entry.closedBy ?? "Bestandsmanager"}.`,
        at: entry.closed,
        read: read.has(id),
      });
    }
  }
  return notices;
}

export function markNoticeRead(pruefungId: string, noticeId: string) {
  updatePruefung(pruefungId, (entry) => ({ ...entry, read: [...new Set([...(entry.read ?? []), noticeId])] }));
}

/** Which Prüfung the Prüfmodus should show (from a notification); read once. */
const SHOW_KEY = "wino.pruefung.show";
export function showPruefungNext(id: string) {
  try {
    sessionStorage.setItem(SHOW_KEY, id);
  } catch {
    // Falls back to the open draft / request.
  }
}
export function takeShownPruefung() {
  try {
    const id = sessionStorage.getItem(SHOW_KEY);
    sessionStorage.removeItem(SHOW_KEY);
    return id;
  } catch {
    return null;
  }
}
