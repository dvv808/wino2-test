import * as a from "../assets/index";
import { FileTabs, LogoButton, MeinBereichTab, ProfileMenu } from "../chrome";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useState } from "react";
import { UploadSources } from "../dms/UploadSources";
import { DmsBrowser, PersonSwitch } from "../dms/DmsBrowser";
import { Ablageregeln } from "../dms/admin/Ablageregeln";
import { Berechtigungen } from "../dms/admin/Berechtigungen";
import { Dokumenttypen } from "../dms/admin/Dokumenttypen";
import { Eingang } from "../dms/admin/Eingang";
import { Ordnervorlagen } from "../dms/admin/Ordnervorlagen";
import { useDms } from "../dms/store";
import { eingang } from "../lib/dms/views";

const PAGES = [
  { id: "verwaltung", label: "Verwaltung", icon: a.folder },
  { id: "vorlagen", label: "Ordnervorlagen", icon: a.category },
  { id: "typen", label: "Dokumenttypen", icon: a.docList },
  { id: "regeln", label: "Ablageregeln", icon: a.tickList },
  { id: "rechte", label: "Gruppen & Berechtigungen", icon: a.contacts },
  { id: "eingang", label: "Eingang", icon: a.navFolder },
  { id: "quellen", label: "Upload-Quellen (Demo)", icon: a.upload },
] as const;
type Page = (typeof PAGES)[number]["id"];

/** Configuration screens are for DMS-Admins; others see who they are browsing as and can switch. */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { state } = useDms();
  const person = state.people.find((p) => p.id === state.activePerson);
  if (person?.rollen.includes("DMS-Admin")) return <>{children}</>;
  return (
    <section className="dms-panel dms-admin-full dms-admin-locked">
      <img src={a.hnLock} alt="" width={28} height={28} />
      <h3>Nur für DMS-Admins</h3>
      <p className="dms-muted">Du siehst Wino gerade als {person?.name}. Wechsle die Person, um die Verwaltung zu bearbeiten.</p>
      <PersonSwitch title="Ansehen als" />
    </section>
  );
}

/**
 * Admin, opened from the profile menu as its own tab. Its only area is "Spaces": the DMS where the main folders
 * for the rest of Wino are defined: the Verwaltung view of the DMS and its configuration screens.
 */
export function AdminView() {
  const { closeAdmin } = useWorkflow();
  const { state } = useDms();
  const [page, setPage] = useState<Page>("verwaltung");
  const waiting = eingang(state).length;

  return (
    <div className="app">
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
            <MeinBereichTab />
            <div className="person-tab">
              <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
              <span className="person-tab-body">
                <Icon src={a.profileAdmin} size={24} />
                Admin
                <button type="button" className="close-icon" aria-label="Admin schließen" onClick={closeAdmin}>
                  <img src={a.iconClose} alt="" width={18} height={18} />
                </button>
              </span>
              <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
            </div>
          </div>
          <div className="main-nav-right">
            <button type="button" className="search-btn" aria-label="Suche">
              <Icon src={a.search} size={42} />
            </button>
            <ProfileMenu />
          </div>
        </header>

        <nav className="area-nav mb-area-nav">
          <span className="area-tab active">
            <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} />
            <button type="button" className="area-tab-body">
              Spaces
            </button>
            <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} />
          </span>
        </nav>

        <div className="module-nav">
          {PAGES.map((item) => (
            <button
              type="button"
              className={item.id === page ? "module-pill active" : "module-pill"}
              key={item.id}
              onClick={() => setPage(item.id)}
            >
              <Icon src={item.icon} size={24} />
              {item.label}
              {item.id === "eingang" && waiting > 0 ? (
                <span className="mb-action-count dms-eingang-count" aria-label={`${waiting} nicht zugeordnet`}>
                  {waiting}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="content-shell admin-body">
          {page === "verwaltung" ? <DmsBrowser ansicht="Verwaltung" title="Verwaltung" lockConfidential /> : null}
          {page === "vorlagen" ? (
            <AdminOnly>
              <Ordnervorlagen />
            </AdminOnly>
          ) : null}
          {page === "typen" ? (
            <AdminOnly>
              <Dokumenttypen />
            </AdminOnly>
          ) : null}
          {page === "regeln" ? (
            <AdminOnly>
              <Ablageregeln />
            </AdminOnly>
          ) : null}
          {page === "rechte" ? (
            <AdminOnly>
              <Berechtigungen />
            </AdminOnly>
          ) : null}
          {page === "eingang" ? (
            <AdminOnly>
              <Eingang />
            </AdminOnly>
          ) : null}
          {page === "quellen" ? <UploadSources /> : null}
        </div>
      </div>
    </div>
  );
}
