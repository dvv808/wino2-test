import { useState } from "react";
import { ADVISOR } from "../approvalTabs";
import { useWorkflow, type ApprovalStep } from "../workflow";
import { BestandAreaNav, BestandMainNav, BestandModuleNav } from "./BestandChrome";
import { DeleteWarning } from "./DeleteWarning";
import { FreigabenPanel } from "./FreigabenPanel";
import { FreigabePage } from "./FreigabePage";
import { MitarbeiterSidebar } from "./MitarbeiterSidebar";
import { DEMO_REQUESTS, SCHRITT, type RequestRow, type RequestStatus } from "./requests";

const LIVE_REQUESTER = ADVISOR;

/** Shown when a decision was made without typing anything into the prompt. */
const FALLBACK_NOTE = {
  granted: "Freigegeben – keine Anmerkungen.",
  rejected: "Abgelehnt – keine Begründung angegeben.",
};

export function ManagerView() {
  const {
    approvalOf,
    docSigner,
    requestedAt,
    requestNote,
    decisionNote,
    comments,
    decideRequest,
    freigabeId,
    openFreigabe,
    closeFreigabe,
  } = useWorkflow();
  /** Decisions on the demo rows stay local to this screen. */
  const [demoDecisions, setDemoDecisions] = useState<
    Record<string, { status: RequestStatus; decided: string; comment: string }>
  >({});
  /** Workflows deleted from the list, and the one waiting on the warning prompt. */
  const [deleted, setDeleted] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<RequestRow | null>(null);

  /**
   * Both steps of the live Maklervereinbarung are listed from the start. The one
   * the advisor has not asked for yet shows as still outstanding.
   */
  const liveRows: RequestRow[] = (["docs", "sign"] as ApprovalStep[]).map((step) => {
    const approval = approvalOf(step);
    const sent = requestedAt[step];
    return {
      id: `live-${step}`,
      /* Both steps belong to the one Maklervereinbarung the advisor is filling in. */
      group: "live",
      partner: { name: docSigner, meta: "12.09.1988", kind: "person" },
      types: ["Interessent"],
      art: "Maklervereinbarung",
      schritt: SCHRITT[step],
      requester: LIVE_REQUESTER,
      date: sent ? sent.date : "–",
      time: sent ? sent.time : "–",
      status:
        approval === "granted"
          ? "abgeschlossen"
          : approval === "rejected"
            ? "abgelehnt"
            : "offen",
      decided: approval === "idle" ? undefined : sent && `${sent.date}, CHAN`,
      comment: decisionNote[step] || undefined,
      note: requestNote[step] || undefined,
      /* The same thread the Freigabe page shows: both notes plus anything typed since. */
      commentCount:
        (requestNote[step] ? 1 : 0) +
        (decisionNote[step] ? 1 : 0) +
        (comments[step]?.length ?? 0),
      pending: approval === "idle",
      step,
    };
  });

  const rows = [
    /* The workflow only reaches this list once the advisor has asked for something. */
    ...(liveRows.every((row) => row.pending) ? [] : liveRows),
    ...DEMO_REQUESTS.map((row) => ({ ...row, ...demoDecisions[row.id] })),
  ].filter((row) => !deleted.includes(row.group));

  /** A shared link can name a request that this session never created. */
  const reviewing = rows.find((row) => row.id === freigabeId) ?? null;

  function decide(decision: "granted" | "rejected", note: string) {
    if (!reviewing) return;
    if (reviewing.step) {
      /* A live request hands the workflow back to the advisor. */
      decideRequest(reviewing.step, decision, note || FALLBACK_NOTE[decision]);
      return;
    }
    setDemoDecisions((current) => ({
      ...current,
      [reviewing.id]: {
        status: decision === "granted" ? "abgeschlossen" : "abgelehnt",
        decided: `${reviewing.date}, CHAN`,
        comment: note || FALLBACK_NOTE[decision],
      },
    }));
    closeFreigabe();
  }

  if (reviewing) {
    return <FreigabePage row={reviewing} onClose={closeFreigabe} onDecide={decide} />;
  }

  return (
    <div className="app">
      <div className="shell">
        <BestandMainNav />
        <BestandAreaNav />
        <BestandModuleNav />

        <div className="content-shell bestand-body">
          <MitarbeiterSidebar />
          <FreigabenPanel
            rows={rows}
            onStart={(row) => openFreigabe(row.id)}
            onView={(row) => openFreigabe(row.id)}
            onDelete={setDeleting}
          />
        </div>
      </div>

      {deleting ? (
        <DeleteWarning
          row={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            setDeleted((current) => [...current, deleting.group]);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}
