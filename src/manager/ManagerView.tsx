import { useEffect, useState } from "react";
import { decide as decideHomeoffice, loadAntraege, onAntraegeChange, saveAntraege } from "../home/calendar/homeoffice";
import { useHonorar } from "../honorar/store";
import { ROLE_USER } from "../mocks/honorar/seed";
import { useWorkflow } from "../workflow";
import { BestandAreaNav, BestandMainNav, BestandModuleNav } from "./BestandChrome";
import { DeleteWarning } from "./DeleteWarning";
import { FreigabenPanel, type BestandListenTab } from "./FreigabenPanel";
import { FreigabePage } from "./FreigabePage";
import { HrmListen } from "./HrmListen";
import { MitarbeiterSidebar } from "./MitarbeiterSidebar";
import {
  ADVISOR_REQUESTS,
  DEMO_REQUESTS,
  STAMMDATEN_REQUESTS,
  liveHomeofficeRows,
  liveMaklerRows,
  liveRechnungRows,
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
    parkFreigabe,
    closeFreigabe,
    view,
  } = useWorkflow();
  /** Decisions on the demo rows stay local to this screen. */
  const [demoDecisions, setDemoDecisions] = useState<
    Record<string, { status: RequestStatus; decided: string; comment: string }>
  >({});
  /** Workflows deleted from the list, and the one waiting on the warning prompt. */
  const [deleted, setDeleted] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<RequestRow | null>(null);
  const { state: honorar, decideInvoiceCorrection } = useHonorar();
  const [listenTab, setListenTab] = useState<BestandListenTab>("freigaben");
  /** Management area: Bestand (Freigaben) or HRM (Anträge of the employees). */
  const [area, setArea] = useState<"Bestand" | "HRM">("Bestand");
  /** Homeoffice-Anträge from the Kalender, shared through the same store. */
  const [homeoffice, setHomeoffice] = useState(loadAntraege);
  useEffect(() => onAntraegeChange(setHomeoffice), []);

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
    ...liveRechnungRows(honorar),
    ...liveHomeofficeRows(homeoffice),
    ...DEMO_REQUESTS.map((row) => ({ ...row, ...demoDecisions[row.id] })),
    ...ADVISOR_REQUESTS.map((row) => ({ ...row, ...demoDecisions[row.id] })),
    ...STAMMDATEN_REQUESTS.map((row) => ({ ...row, ...demoDecisions[row.id] })),
  ].filter((row) => !deleted.includes(row.group));

  /** A shared link can name a request that this session never created. */
  const reviewing = rows.find((row) => row.id === freigabeId) ?? null;

  function decide(decision: "granted" | "rejected", note: string) {
    if (!reviewing) return;
    if (reviewing.feeId) {
      /* An invoice Antrag goes back to the invoice workflow, where the Honorarverwalter books it. */
      decideInvoiceCorrection(reviewing.feeId, decision === "granted", note || FALLBACK_NOTE[decision], ROLE_USER.head);
      return;
    }
    if (reviewing.homeofficeId) {
      /* Homeoffice: the decision goes straight back to the employee's calendar. */
      saveAntraege(
        decideHomeoffice(
          loadAntraege(),
          reviewing.homeofficeId,
          decision === "granted" ? "genehmigt" : "zurueckgesetzt",
          new Date().toISOString(),
          ROLE_USER.head,
          note,
        ),
      );
      closeFreigabe();
      return;
    }
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

  if (reviewing && view === "freigabe") {
    return <FreigabePage row={reviewing} onClose={closeFreigabe} onPark={parkFreigabe} onDecide={decide} />;
  }

  return (
    <div className="app">
      <div className="shell">
        <BestandMainNav />
        <BestandAreaNav active={area} onArea={(next) => setArea(next as "Bestand" | "HRM")} />
        <BestandModuleNav />

        <div className="content-shell bestand-body">
          <MitarbeiterSidebar />
          {area === "HRM" ? (
            <HrmListen />
          ) : (
          <FreigabenPanel
            rows={rows}
            tab={listenTab}
            onTab={setListenTab}
            onStart={(row) => openFreigabe(row.id, row.partner.name)}
            onView={(row) => openFreigabe(row.id, row.partner.name)}
            onDelete={setDeleting}
          />
          )}
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
