/** Hand-over between tables: the fee whose row the next page should highlight. */
let focused: string | null = null;

export function setFocusFee(feeId: string) {
  focused = feeId;
}

export function peekFocusFee() {
  return focused;
}

export function clearFocusFee() {
  focused = null;
}
