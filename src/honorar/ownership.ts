import { money } from "../lib/honorar/format";
import { partnerOf } from "../lib/honorar/queries";
import { ROLE_USER } from "../mocks/honorar/seed";
import type { Fee, HonorarNotice, HonorarState, Partner } from "../types/honorar";
import { workflowStepIndex } from "./invoiceCells";

/** Who works on the workflow's current step: Kundenberater (Antrag), Bestandsmanager (Freigabe), Honorarverwalter (Verbuchung). */
export function workflowOwner(correction: NonNullable<Fee["correction"]>, partner: Partner | undefined) {
  const step = workflowStepIndex(correction);
  if (step === 3) return correction.bookedBy ?? ROLE_USER.backoffice;
  if (step === 2) return ROLE_USER.backoffice;
  if (step === 1) return ROLE_USER.head;
  return correction.requestedBy ?? partner?.advisor ?? ROLE_USER.advisor;
}

/** The logged-in person (Lucy Dallon by default). */
export function currentUser(state: HonorarState) {
  return ROLE_USER[state.role];
}

/**
 * An invoice the logged-in person is responsible for: their own partner as Kundenberater (a Bereichsleiter sees the
 * department), or a running workflow whose current step is theirs. Mein Bereich and the widget both use this.
 */
export function isOwnFee(state: HonorarState, fee: Fee) {
  if (fee.hiddenOpen) return false;
  const partner = partnerOf(state, fee.partnerId);
  if (!partner) return false;
  const me = currentUser(state);
  if (state.role === "head" ? partner.department === "Beratung & Service" : partner.advisor === me) return true;
  return Boolean(fee.correction && fee.correction.status !== "verbucht" && workflowOwner(fee.correction, partner) === me);
}

function noticeFees(state: HonorarState, notice: HonorarNotice) {
  const ids = notice.feeIds ?? (notice.feeId ? [notice.feeId] : []);
  return ids.map((id) => state.fees.find((fee) => fee.id === id)).filter((fee): fee is Fee => Boolean(fee));
}

/** Who a notice is for: set on new notices; older ones are read from their kind and invoice. */
function recipientOf(state: HonorarState, notice: HonorarNotice) {
  if (notice.to) return notice.to;
  if (notice.kind === "workflow") return notice.title?.split(" · an ")[1];
  if (notice.kind === "advisor") {
    const fee = noticeFees(state, notice)[0];
    return fee ? partnerOf(state, fee.partnerId)?.advisor : undefined;
  }
  return undefined;
}

/**
 * The notice as the logged-in person sees it, or null when it is not theirs. A "Neue Offene Posten" notice only
 * counts their own invoices, so it matches the rows of their Honorare/Forderungen table.
 */
export function noticeForMe(state: HonorarState, notice: HonorarNotice): (HonorarNotice & { feeIds: string[] }) | null {
  const me = currentUser(state);
  const fees = noticeFees(state, notice);
  const recipient = recipientOf(state, notice);
  if (recipient) return recipient === me ? { ...notice, feeIds: fees.map((fee) => fee.id) } : null;
  const own = fees.filter((fee) => isOwnFee(state, fee));
  if (own.length === 0) return null;
  if (own.length === fees.length) return { ...notice, feeIds: own.map((fee) => fee.id) };
  // Only some of the new Offene Posten are theirs: the notice is told again for just those.
  const names = own.map((fee) => partnerOf(state, fee.partnerId)?.name ?? "Unbekannt");
  const total = own.reduce((sum, fee) => sum + Math.max(0, fee.amount - fee.paid), 0);
  return {
    ...notice,
    title: own.length === 1 ? "Neuer Offener Posten" : "Neue Offene Posten",
    subject: own.length === 1 ? names[0] : `${names[0]} +${own.length - 1} weitere`,
    text: `${own.length === 1 ? "Ein Posten ist" : `${own.length} Posten sind`} neu in Offene Posten, offen: ${money(total)} €.`,
    feeIds: own.map((fee) => fee.id),
  };
}
