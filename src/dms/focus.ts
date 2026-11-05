/** Hand-over to the DMS browser: another module (e.g. a Maklervereinbarung card) opens a document in the DMS. */
type Focus = { path: string[]; docId: string };

let pending: Focus | null = null;

export function setDmsFocus(focus: Focus) {
  pending = focus;
  window.dispatchEvent(new Event("dms-focus"));
}

export function takeDmsFocus(): Focus | null {
  const focus = pending;
  pending = null;
  return focus;
}

export function peekDmsFocus() {
  return pending;
}
