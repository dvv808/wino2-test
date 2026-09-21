import { useState } from "react";
import { useWorkflow } from "../workflow";
import { BestandAreaNav, BestandMainNav, BestandModuleNav } from "./BestandChrome";
import { DeleteWarning } from "./DeleteWarning";
import { FreigabenPanel } from "./FreigabenPanel";
import { FreigabePage } from "./FreigabePage";
import { MitarbeiterSidebar } from "./MitarbeiterSidebar";
import {
  ADVISOR_REQUESTS,
  DEMO_REQUESTS,
  liveMaklerRows,
  type RequestRow,
  type RequestStatus,
} from "./requests";

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

  const liveRows = liveMaklerRows({
    approvalOf,
    docSigner,
    requestedAt,
    requestNote,
    decisionNote,
    comments,
  });

  const rows = [
    /* The workflow only reaches this list once the advisor has asked for something. */
    ...(liveRows.every((row) => row.pending) ? [] : liveRows),
    ...DEMO_REQUESTS.map((row) => ({ ...row, ...demoDecisions[row.id] })),
    ...ADVISOR_REQUESTS.map((row) => ({ ...row, ...demoDecisions[row.id] })),
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
