/** Hand-over between pages: the fees whose rows the next page should highlight. */
let focused: string[] = [];

export function setFocusFee(feeId: string) {
  focused = [feeId];
}

/** Several rows at once, e.g. every invoice of a widget notice. Pages already open hear about it right away. */
export function setFocusFees(feeIds: string[]) {
  focused = [...feeIds];
  window.dispatchEvent(new Event("honorar-focus"));
}

export function peekFocusFee() {
  return focused[0] ?? null;
}

export function peekFocusFees() {
  return focused;
}

export function clearFocusFee() {
  focused = [];
}
