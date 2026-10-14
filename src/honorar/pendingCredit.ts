/** Hand-over from Offene Posten to Einzelfaktura: which invoice should open its credit overlay. */
export type PendingCredit = { feeId: string; withDueDate: boolean };

let pending: PendingCredit | null = null;

export function setPendingCredit(value: PendingCredit) {
  pending = value;
}

export function peekPendingCredit() {
  return pending;
}

export function clearPendingCredit() {
  pending = null;
}
