import { useState } from "react";
import * as a from "./assets/index";
import { AppsNav, FileTabs, LogoButton, ProfileMenu, WorkflowNav, MeinBereichTab } from "./chrome";
import { CommentPrompt } from "./CommentPrompt";
import { WicoDeviationBox } from "./Summary";
import { ConsentWarning } from "./ConsentWarning";
import { PdfModal } from "./documents";
import { CommsStep } from "./steps/CommsStep";
import { DocsStep } from "./steps/DocsStep";
import { HonorarStep } from "./steps/HonorarStep";
import { ScopeStep } from "./steps/ScopeStep";
import { SignStep } from "./steps/SignStep";
import { TasksStep } from "./steps/TasksStep";
import { TermsStep } from "./steps/TermsStep";
import { ManagerView } from "./manager/ManagerView";
import { HonorarProvider } from "./honorar/store";
import { HonorarView } from "./honorar/HonorarView";
import { MeinBereichView } from "./mein-bereich/MeinBereichView";
import { CompanyGroupsProvider } from "./person/companyGroups";
import { FamilyLinksProvider } from "./person/familyLinks";
import { KonzernLinksProvider } from "./person/konzernLinks";
import { KonzernHubPage } from "./person/KonzernHub";
import { PartnerCreate } from "./person/PartnerCreate";
import { PersonPage } from "./person/PersonPage";
import { StammdatenWorkflow } from "./person/StammdatenWorkflow";
import { UnsavedChanges } from "./person/UnsavedChanges";
import { VersionLayer } from "./person/VersionHistory";
import { Icon } from "./ui";
import { WidgetBar } from "./widget/WidgetBar";
import {
  STEPS,
  WorkflowProvider,
  useWorkflow,
  type ApprovalStep,
  type StepId,
} from "./workflow";

const LAYOUT: Record<StepId, string> = {
  tasks: "page single",
  comms: "page",
  fee: "page",
  terms: "page",
  scope: "page single",
  docs: "page docs",
  sign: "page docs",
};

function Stepper() {
  const { activeStep, done, goTo } = useWorkflow();

  return (
    <div className="stepper-wrap">
      <div className="stepper">
        {STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`step${activeStep === step.id ? " active" : ""}`}
            onClick={() => goTo(step.id)}
          >
            {step.id === "tasks" ? (
              <span className="step-tasks">
                <img src={a.stepRing} alt="" />
                <img src={a.tasksInner} alt="" />
                <img className="glyph" src={a.tasks} alt="" />
              </span>
            ) : (
              <span className={`step-num${activeStep === step.id ? " active" : ""}`}>
                <img src={activeStep === step.id ? a.stepActive : a.stepDone} alt="" />
                <span>{step.n}</span>
              </span>
            )}
            <span className="step-label">
              {step.label.split("\n").map((line) => (
                <span key={line} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </span>
            {done[step.id] ? (
              <span className="badge done">
                <Icon src={a.confirm} size={16} />
                Fertig
              </span>
            ) : (
              <span className="badge">
                <Icon src={a.onhold} size={16} />
                Offen
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  const {
    activeStep,
    goBack,
    goNext,
    docsApproval,
    signApproval,
    grantApproval,
    requestApproval,
    hasSignature,
    signMode,
    consent,
  } = useWorkflow();
  /** Requesting a Freigabe is a short flow: warn about missing consent, then take a note. */
  const [asking, setAsking] = useState<"consent" | "comment" | null>(null);

  const isApprovalStep = activeStep === "docs" || activeStep === "sign";
  const step: ApprovalStep = activeStep === "docs" ? "docs" : "sign";
  const approval = activeStep === "docs" ? docsApproval : signApproval;
  /** A rejected request can be sent again; a pending or granted one cannot. */
  const canAct =
    (approval === "idle" || approval === "rejected") &&
    !(activeStep === "sign" && !hasSignature);
  /** The consent switch only exists on the digital path, so only warn there. */
  const needsConsentWarning = activeStep === "sign" && signMode === "digital" && !consent;

  return (
    <footer className="footer">
      {activeStep === "tasks" ? <span /> : (
        <button type="button" className="btn-secondary" onClick={goBack}>
          Zurück
        </button>
      )}

      {!isApprovalStep && (
        <button type="button" className="btn-primary" onClick={goNext}>
          Weiter
        </button>
      )}

      {activeStep === "docs" && approval === "granted" && (
        <button type="button" className="btn-primary" onClick={goNext}>
          Weiter
        </button>
      )}

      {isApprovalStep && !(activeStep === "docs" && approval === "granted") && (
        <div className="footer-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={!canAct}
            onClick={() => grantApproval(step)}
          >
            Freigabe selbst erteilen
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canAct}
            onClick={() => setAsking(needsConsentWarning ? "consent" : "comment")}
          >
            Freigabe anfordern
          </button>
        </div>
      )}

      {asking === "consent" ? (
        <ConsentWarning onBack={() => setAsking(null)} onContinue={() => setAsking("comment")} />
      ) : null}

      {asking === "comment" ? (
        <CommentPrompt
          title="Freigabe anfordern"
          confirmLabel="Anfordern"
          onCancel={() => setAsking(null)}
          onConfirm={(note) => {
            setAsking(null);
            requestApproval(step, note);
          }}
        />
      ) : null}
    </footer>
  );
}

function LeavePrompt() {
  const {
    leavePrompt,
    stammdatenDirtyAreas,
    cancelLeavePrompt,
    openDirtyArea,
    saveDraftAndLeave,
    discardAndLeave,
  } = useWorkflow();
  if (!leavePrompt) return null;
  return (
    <UnsavedChanges
      areas={stammdatenDirtyAreas()}
      onCancel={cancelLeavePrompt}
      onOpenArea={openDirtyArea}
      onSaveDraft={saveDraftAndLeave}
      onLeave={discardAndLeave}
    />
  );
}

function Screen() {
  const { activeStep, view, workflowPane, setWorkflowPane, isHistorical } = useWorkflow();

  if (view === "meinBereich") {
    return (
      <>
        <MeinBereichView />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "finanzen") {
    return (
      <>
        <HonorarView />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "manager" || view === "freigabe") {
    return (
      <>
        <ManagerView />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "konzernHub") {
    return (
      <>
        <KonzernHubPage />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "person") {
    return (
      <>
        <PersonPage />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "stammdaten") {
    return (
      <>
        <StammdatenWorkflow />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }

  return (
    <>
    <div className={isHistorical ? "app historical" : "app"}>
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
            <MeinBereichTab />
          </div>
          <div className="main-nav-right">
            <button type="button" className="search-btn" aria-label="Suche">
              <Icon src={a.search} size={42} />
            </button>
            <ProfileMenu />
          </div>
        </header>

        <AppsNav />
        <WorkflowNav active={workflowPane} onSelect={setWorkflowPane} />

        <div className="content-shell">
          {workflowPane === "workflow" ? (
            <>
              <Stepper />

              <main className={LAYOUT[activeStep]}>
                <WicoDeviationBox />
                {activeStep === "tasks" && <TasksStep />}
                {activeStep === "comms" && <CommsStep />}
                {activeStep === "fee" && <HonorarStep />}
                {activeStep === "terms" && <TermsStep />}
                {activeStep === "scope" && <ScopeStep />}
                {activeStep === "docs" && <DocsStep />}
                {activeStep === "sign" && <SignStep />}
              </main>

              <Footer />
            </>
          ) : (
            <main className="page single wf-blank" />
          )}
        </div>
      </div>
      <PdfModal />
    </div>
    <VersionLayer />
    <LeavePrompt />
    </>
  );
}

export default function App() {
  return (
    <WorkflowProvider>
      <HonorarProvider>
        <FamilyLinksProvider>
          <CompanyGroupsProvider>
            <KonzernLinksProvider>
              <Screen />
              <PartnerCreate />
              <WidgetBar />
            </KonzernLinksProvider>
          </CompanyGroupsProvider>
        </FamilyLinksProvider>
      </HonorarProvider>
    </WorkflowProvider>
  );
}
