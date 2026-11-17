import { MitarbeiterView } from "./manager/MitarbeiterView";
import { AbteilungView } from "./manager/AbteilungView";
import { useEffect, useRef, useState } from "react";
import * as a from "./assets/index";
import { AppsNav, FileTabs, LogoButton, ProfileMenu, WorkflowNav, MeinBereichTab, useFilePerson, useParkedTabClicks } from "./chrome";
import { MINDESTBETRAG } from "./lib/maklervereinbarung/zahlweise";
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
import { DmsProvider } from "./dms/store";
import { HonorarView } from "./honorar/HonorarView";
import { RechnungWorkflowPage } from "./honorar/RechnungWorkflow";
import { MeinBereichView } from "./mein-bereich/MeinBereichView";
import { AdminView } from "./admin/AdminView";
import { HomeView } from "./home/HomeView";
import { CompanyGroupsProvider } from "./person/companyGroups";
import { FamilyLinksProvider } from "./person/familyLinks";
import { KonzernLinksProvider } from "./person/konzernLinks";
import { KonzernHubPage } from "./person/KonzernHub";
import { PartnerCreate } from "./person/PartnerCreate";
import { PersonPage } from "./person/PersonPage";
import { StammdatenWorkflow } from "./person/StammdatenWorkflow";
import { PruefModus } from "./person/PruefModus";
import { UnsavedChanges } from "./person/UnsavedChanges";
import { VersionLayer } from "./person/VersionHistory";
import { Icon } from "./ui";
import { openTasks } from "./person/stammdaten";
import { amountOf, dateOf } from "./lib/maklervereinbarung/gueltigkeit";
import { WidgetBar } from "./widget/WidgetBar";
import {
  STEPS,
  WorkflowProvider,
  useWorkflow,
  type ApprovalStep,
  type StepId,
} from "./workflow";
import { GlobalSearch } from "./search/GlobalSearch";
import { MobileApp, useIsMobile } from "./mobile/MobileApp";

const LAYOUT: Record<StepId, string> = {
  tasks: "page single",
  comms: "page",
  fee: "page",
  terms: "page",
  scope: "page single",
  docs: "page docs",
  sign: "page docs",
};

/**
 * Honorar is complete when the chosen model has what it needs:
 * Privat – a valid first billing (future 1st of a month when individual), Hauptfälligkeit, the Zahlart details
 * and the Rechnungsversand mail / address; bei anderem Partner – a linked partner with a matching tariff;
 * Individuell – the Notiz.
 */
function useHonorarComplete() {
  const { model, customNote, selectedPartner, billing, month, year, dueDay, dueMonth, payment, paymentTerm, delivery, commsChoice, businessAmount } =
    useWorkflow();
  const { isCompany } = useFilePerson();
  if (model === "custom") return Boolean(customNote.trim());
  if (model === "partner") return Boolean(selectedPartner?.ok);
  const first = billing === "custom" ? dateOf("01", month, year) : null;
  const billingOk = billing !== "custom" || Boolean(first && first > new Date());
  const dueOk = Boolean(dateOf(dueDay, dueMonth, "2000"));
  const paymentOk = payment === "debit" || !isCompany || Number(paymentTerm) > 0;
  // Unternehmen: Rechnungen go to the Versand mail; the Honorarbetrag needs at least EUR 300,00.
  const deliveryOk =
    delivery === "email" ? Boolean(isCompany ? commsChoice.versandMail : commsChoice.mail) : Boolean(commsChoice.post);
  const amountOk = !isCompany || amountOf(businessAmount) >= MINDESTBETRAG;
  return billingOk && dueOk && paymentOk && deliveryOk && amountOk;
}

function Stepper() {
  const { activeStep, done, goTo, sections } = useWorkflow();
  // Offene Aufgaben is done as soon as the Stammdaten hold everything it asks for.
  const honorar = useHonorarComplete();
  const { commsChoice, termsOn, termsText } = useWorkflow();
  const { isCompany } = useFilePerson();
  const isDone = (id: StepId) =>
    // Kommunikationsdaten: Fertig only while Telefon, Mail and Postadresse are all picked.
    id === "comms"
      ? Boolean(
          commsChoice.phone &&
            commsChoice.mail &&
            commsChoice.post &&
            // Unternehmen also need the Vertretungsbefugte Person and the Versand mail.
            (!isCompany || (commsChoice.rep && commsChoice.versandMail)),
        )
      : // Honorar: Fertig as soon as everything the chosen model needs is filled in.
        id === "fee"
        ? honorar
        : // Individuelle Vereinbarung: off → Fertig; on → Fertig once text is there and "Weiter" was clicked.
          id === "terms"
          ? !termsOn || Boolean(termsText.trim() && done.terms)
          : done[id] || (id === "tasks" && openTasks(sections).length === 0);

  /* Figma 22742:231226: when the bar is too narrow, the last step stays pinned at the right edge and the others
     slide underneath it; ‹ › scroll the bar. */
  const barRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const check = () => setOverflow(bar.scrollWidth > bar.clientWidth + 2);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);
  // The active step scrolls into view, clear of the pinned last step (unless it is the pinned one).
  useEffect(() => {
    const bar = barRef.current;
    const step = bar?.querySelector<HTMLElement>(".step.active");
    const last = bar?.lastElementChild as HTMLElement | null;
    if (!bar || !step || !last || step === last) return;
    const box = bar.getBoundingClientRect();
    const own = step.getBoundingClientRect();
    const pinned = last.getBoundingClientRect();
    const tooFarRight = own.right - (pinned.left - 40);
    const tooFarLeft = own.left - (box.left + 24);
    if (tooFarRight > 0) bar.scrollBy({ left: tooFarRight, behavior: "smooth" });
    else if (tooFarLeft < 0) bar.scrollBy({ left: tooFarLeft, behavior: "smooth" });
  }, [activeStep, overflow]);
  // ‹ ›: one step's width at a time, to an exact target (clamped), so repeated clicks never get lost mid-animation.
  const [edge, setEdge] = useState({ start: true, end: false });
  const target = useRef<number | null>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () => {
      const max = bar.scrollWidth - bar.clientWidth;
      setEdge({ start: bar.scrollLeft <= 1, end: bar.scrollLeft >= max - 1 });
      if (target.current !== null && Math.abs(bar.scrollLeft - target.current) < 2) target.current = null;
    };
    update();
    bar.addEventListener("scroll", update, { passive: true });
    return () => bar.removeEventListener("scroll", update);
  }, [overflow]);
  const scrollBy = (dir: 1 | -1) => {
    const bar = barRef.current;
    if (!bar) return;
    const max = bar.scrollWidth - bar.clientWidth;
    const from = target.current ?? bar.scrollLeft;
    const next = Math.max(0, Math.min(max, from + dir * 260));
    target.current = next;
    bar.scrollTo({ left: next, behavior: "smooth" });
  };

  return (
    <div className={overflow ? "stepper-wrap overflowing" : "stepper-wrap"}>
      <div className="stepper" ref={barRef}>
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
            {/* The pinned last step: a white fade on its left, so the steps sliding underneath read as behind it. */}
            {overflow && step.id === STEPS[STEPS.length - 1].id ? <img className="step-fade" src={a.stepperEndFade} alt="" /> : null}
            <span className="step-label">
              {step.label.split("\n").map((line) => (
                <span key={line} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </span>
            {isDone(step.id) ? (
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
      {overflow ? (
        // Figma 22742:231226: a pocket in the page colour cuts into the bar's end and holds ‹ ›.
        <span className="stepper-pocket">
          <img className="stepper-pocket-bg" src={a.stepperEndPocket} alt="" />
          <button type="button" aria-label="Schritte nach links" disabled={edge.start} onClick={() => scrollBy(-1)}>
            <img src={a.stepperArrowLeft} alt="" />
          </button>
          <button type="button" aria-label="Schritte nach rechts" disabled={edge.end} onClick={() => scrollBy(1)}>
            <img src={a.stepperArrowRight} alt="" />
          </button>
        </span>
      ) : null}
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
  /* At phone width every URL lands in the mobile version (Kalender + Kontakte); the desktop app is not shown. */
  const mobile = useIsMobile();
  if (mobile) return <MobileApp />;

  if (view === "home") {
    return (
      <>
        <HomeView />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "abteilung") {
    return (
      <>
        <AbteilungView />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "mitarbeiter") {
    return (
      <>
        <MitarbeiterView />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "admin") {
    return (
      <>
        <AdminView />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "meinBereich") {
    return (
      <>
        <MeinBereichView />
        <VersionLayer />
        <LeavePrompt />
      </>
    );
  }
  if (view === "rechnung") {
    return (
      <>
        <RechnungWorkflowPage />
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
  if (view === "pruefung") {
    return (
      <>
        <PruefModus />
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
            <GlobalSearch />
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
  useParkedTabClicks();
  return (
    <WorkflowProvider>
      <HonorarProvider>
        <DmsProvider>
        <FamilyLinksProvider>
          <CompanyGroupsProvider>
            <KonzernLinksProvider>
              <Screen />
              <PartnerCreate />
              <WidgetBar />
            </KonzernLinksProvider>
          </CompanyGroupsProvider>
        </FamilyLinksProvider>
        </DmsProvider>
      </HonorarProvider>
    </WorkflowProvider>
  );
}
