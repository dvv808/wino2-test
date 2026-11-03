import { useHonorar } from "../honorar/store";
import { isOpenItemFee } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";

/**
 * The Honorar partner whose Forderungen belong to the open file: the one passed in from the Honorarverrechnung,
 * else the Honorar partner with this file's name. Opened from Finanzen without a partner, the first open Forderung stands in.
 */
export function useInkassoPartnerId() {
  const { inkassoPartnerId, personName, finanzenProfileOpen } = useWorkflow();
  const { state } = useHonorar();
  const relevant = state.fees.filter(
    (fee) =>
      !fee.hiddenOpen &&
      (isOpenItemFee(state, fee) || Boolean(fee.settledVia) || state.singleInvoices.some((invoice) => invoice.feeId === fee.id)),
  );
  const ownPartnerId = state.partners.find((partner) => partner.name === personName)?.id;
  return (
    inkassoPartnerId ||
    ownPartnerId ||
    (finanzenProfileOpen ? relevant[0]?.partnerId || state.fees.find((fee) => isOpenItemFee(state, fee))?.partnerId : "") ||
    ""
  );
}
