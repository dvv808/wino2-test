import * as a from "../assets/index";
import { BestandMainNav } from "../manager/BestandChrome";
import { Icon } from "../ui";
import { monthYearLabel } from "../lib/honorar/format";
import { useWorkflow } from "../workflow";
import { CarrierStep } from "./CarrierStep";
import { DataStep } from "./DataStep";
import { DispatchStep } from "./DispatchStep";
import { HistoryDrawer } from "./HistoryDrawer";
import { InkassoPage } from "./InkassoPage";
import { OpenItemsPage } from "./OpenItemsPage";
import { SammelfakturaPage } from "./SammelfakturaPage";
import { HonorarSidebar } from "./Sidebar";
import { SingleInvoicesPage } from "./SingleInvoicesPage";
import { ReminderStep } from "./ReminderStep";
import { StatusStep } from "./StatusStep";
import { HonorarStepper } from "./Stepper";
import { TestPanel } from "./TestPanel";
import { useHonorar } from "./store";
import { HonorarSideContext } from "./ui";
import { useEffect, useState } from "react";

export function FinanzenModuleNav() {
  const { openManager } = useWorkflow();
  const { state, setTestMode, markNoticesRead } = useHonorar();
  const [notices, setNotices] = useState(false);
  const unread = state.notices.filter((notice) => !notice.read).length;

  return (
    <div className="module-nav">
      <button
        type="button"
        className="module-pill"
        onClick={() => openManager()}
      >
        <Icon src={a.tickList} size={24} />
        Dashboard &amp; Listen
      </button>
      <button type="button" className="module-pill active">
        <Icon src={a.honorar} size={24} />
        Forderungen
      </button>
      <button type="button" className="module-pill">
        <Icon src={a.navBank} size={24} />
        Verbindlichkeiten
      </button>
      <div className="module-group">
        <button type="button" className="module-pill ghost">
          <Icon src={a.navFolder} size={24} />
          Dokumente
        </button>
        <button type="button" className="module-pill ghost">
          <Icon src={a.navNotes} size={24} />
          Notizen
        </button>
        <button type="button" className="module-pill ghost">
          <Icon src={a.navMail} size={24} />
          Mail
        </button>
        <button type="button" className="module-pill ghost">
          <Icon src={a.navTodo} size={24} />
          Aufgaben
        </button>
      </div>
      <button
        type="button"
        className="module-pill"
        onClick={() => setTestMode(!state.testMode)}
      >
        <Icon src={a.settings} size={24} />
        Settings
      </button>
      <button
        type="button"
        className="module-pill"
        onClick={() => window.dispatchEvent(new Event("honorar-verlauf"))}
      >
        <Icon src={a.navHistory} size={24} />
        Verlauf
      </button>
      <button
        type="button"
        className="module-pill"
        aria-label="Nachrichten"
        onClick={() => {
          setNotices((value) => !value);
          markNoticesRead();
        }}
      >
        <Icon src={a.requestSmall} size={24} />
        {unread ? <span className="hn-count">{unread}</span> : null}
      </button>
      {notices ? (
        <div className="hn-notices">
          {state.notices.length === 0 ? <p>Keine Nachrichten.</p> : null}
          {state.notices.map((notice) => (
            <p key={notice.id}>{notice.text}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HonorarView() {
  const { state } = useHonorar();
  const {
    finanzenPage,
    finanzenMonth,
    finanzenStep,
    finanzenYear,
    finanzenProfileOpen,
    personName,
    openPerson,
    closeFinanzenProfile,
    rechnungFeeId,
    openRechnungWorkflow,
    closeRechnungWorkflow,
  } = useWorkflow();
  const [history, setHistory] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const workflowFee = rechnungFeeId ? state.fees.find((fee) => fee.id === rechnungFeeId) : undefined;
  const workflowPartner = workflowFee ? state.partners.find((partner) => partner.id === workflowFee.partnerId)?.name : undefined;
  const dashboard = finanzenPage === "sammelfaktura";
  const monthEntries = state.history.filter(
    (entry) =>
      entry.refType === "month" &&
      (dashboard
        ? entry.refId.startsWith(finanzenYear)
        : entry.refId === finanzenMonth),
  );

  useEffect(() => {
    function open() {
      setHistory(true);
    }
    window.addEventListener("honorar-verlauf", open);
    return () => window.removeEventListener("honorar-verlauf", open);
  }, []);

  return (
    <div className="app">
      <div className="shell">
        <BestandMainNav
          {...(workflowPartner && rechnungFeeId
            ? {
                // An open invoice workflow parks its partner tab here; clicking it goes back to the workflow.
                partner: workflowPartner,
                onOpenPartner: () => openRechnungWorkflow(rechnungFeeId),
                onClosePartner: closeRechnungWorkflow,
              }
            : finanzenProfileOpen
              ? {
                  partner: personName,
                  onOpenPartner: openPerson,
                  onClosePartner: closeFinanzenProfile,
                }
              : {})}
        />
        <FinanzenAreaNav />
        <FinanzenModuleNav />
        <HonorarSideContext.Provider
          value={{ collapsed: sideCollapsed, toggle: () => setSideCollapsed((value) => !value), sidebar: <HonorarSidebar /> }}
        >
        <div className="content-shell bestand-body">
          {sideCollapsed ? null : <HonorarSidebar />}
          <div className="hn-main">
            {finanzenPage === "month" && finanzenStep !== "status" ? <HonorarStepper /> : null}
            {finanzenPage === "month" && finanzenStep === "status" ? (
              <StatusStep />
            ) : null}
            {finanzenPage === "month" && finanzenStep === "data" ? (
              <DataStep />
            ) : null}
            {finanzenPage === "month" && finanzenStep === "carrier" ? (
              <CarrierStep />
            ) : null}
            {finanzenPage === "month" && finanzenStep === "dispatch" ? (
              <DispatchStep />
            ) : null}
            {finanzenPage === "month" && finanzenStep === "reminders" ? (
              <ReminderStep />
            ) : null}
            {finanzenPage === "sammelfaktura" ? <SammelfakturaPage /> : null}
            {finanzenPage === "openItems" ? <OpenItemsPage /> : null}
            {finanzenPage === "singleInvoices" ? <SingleInvoicesPage /> : null}
            {finanzenPage === "inkasso" ? <InkassoPage /> : null}
            {finanzenPage === "meinBereich" ? <OpenItemsPage /> : null}
          </div>
        </div>
        </HonorarSideContext.Provider>
      </div>
      <TestPanel />
      {history ? (
        <HistoryDrawer
          title={
            dashboard
              ? `Sammelfaktura ${finanzenYear}`.trim()
              : monthYearLabel(finanzenMonth)
          }
          entries={monthEntries}
          onClose={() => setHistory(false)}
        />
      ) : null}
    </div>
  );
}

function FinanzenAreaNav() {
  const { openManager, openFinanzen } = useWorkflow();
  const areas = [
    "Dashboard",
    "HRM",
    "Bestand",
    "Finanzen",
    "Berichte",
    "Marketing",
    "Honorare",
  ];
  return (
    <nav className="area-nav">
      {areas.map((area) => {
        const active = area === "Finanzen";
        return (
          <span className={active ? "area-tab active" : "area-tab"} key={area}>
            {active ? (
              <img
                className="tab-ear left"
                src={a.appTabLeft}
                alt=""
                width={10}
                height={10}
              />
            ) : null}
            <button
              type="button"
              className="area-tab-body"
              onClick={() => {
                if (area === "Bestand") openManager();
                if (area === "Finanzen") openFinanzen();
              }}
            >
              {area}
            </button>
            {active ? (
              <img
                className="tab-ear flip"
                src={a.appTabRight}
                alt=""
                width={10}
                height={10}
              />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
