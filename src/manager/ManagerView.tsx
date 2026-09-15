import { useState } from "react";
import { ADVISOR } from "../approvalTabs";
import { useWorkflow, type ApprovalStep } from "../workflow";
import { BestandAreaNav, BestandMainNav, BestandModuleNav } from "./BestandChrome";
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
    decideRequest,
    freigabeId,
    openFreigabe,
    closeFreigabe,
  } = useWorkflow();
  /** Decisions on the demo rows stay local to this screen. */
  const [demoDecisions, setDemoDecisions] = useState<
    Record<string, { status: RequestStatus; decided: string; comment: string }>
  >({});

  const liveRows: RequestRow[] = (["docs", "sign"] as ApprovalStep[])
    .filter((step) => approvalOf(step) !== "idle")
    .map((step) => {
      const approval = approvalOf(step);
      const sent = requestedAt[step];
      return {
        id: `live-${step}`,
        partner: { name: docSigner, meta: "12.09.1988", kind: "person" },
        types: ["Interessent"],
        art: "Maklervereinb. Kunde",
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
        step,
      };
    });

  const rows = [
    ...liveRows,
    ...DEMO_REQUESTS.map((row) => ({ ...row, ...demoDecisions[row.id] })),
  ];

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
          <FreigabenPanel rows={rows} onStart={(row) => openFreigabe(row.id)} />
        </div>
      </div>
    </div>
  );
}
