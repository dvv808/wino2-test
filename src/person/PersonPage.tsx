import { useState } from "react";
import * as a from "../assets/index";
import { Icon, IdCardIcon } from "../ui";
import { useWorkflow } from "../workflow";
import { LogoButton, VerlaufCaption, WorkflowDock } from "../chrome";
import { DataCard } from "./cards";
import { DeleteCard } from "./DeleteCard";
import { MaklermandatPage } from "./MaklermandatPage";
import { WorkflowsPage } from "./WorkflowsPage";
import {
  NAV_GROUPS,
  PLAUSI,
  areaForSection,
  countedTitle,
  navLabel,
  type Card,
} from "./stammdaten";

/** Same apps as the workflow bar. Only Person is open in the prototype. */
const AREAS = ["Person", "Risk Management", "Verträge", "Schäden", "Angebote"];

/** The module row under it. Profil and Workflows & To-Dos are wired. */
const MODULES = [
  { label: "Dashboard", icon: a.category },
  { label: "Profil", icon: a.idCard, module: "profil" as const },
  { label: "Kommunikation", icon: a.comment },
  { label: "Workflows & To-Dos", icon: a.workflow, module: "workflows" as const },
  { label: "Dateien", icon: a.folder },
  { label: "Controlling", icon: a.colFilter },
];

function PersonAreaNav() {
  return (
    <nav className="area-nav person">
      {AREAS.map((area) => {
        const active = area === "Person";
        return (
          <span className={active ? "area-tab active" : "area-tab"} key={area}>
            {active ? (
              <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} />
            ) : null}
            <button type="button" className="area-tab-body">
              {area}
            </button>
            {active ? (
              <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} />
            ) : null}
          </span>
        );
      })}
      <WorkflowDock />
    </nav>
  );
}

function PersonModuleNav() {
  const { personModule, openPersonModule } = useWorkflow();
  const active = personModule === "workflows" ? "workflows" : "profil";

  return (
    <div className="module-nav">
      {MODULES.map((module) => (
        <button
          type="button"
          className={module.module === active ? "module-pill active" : "module-pill"}
          key={module.label}
          onClick={module.module ? () => openPersonModule(module.module) : undefined}
        >
          <Icon src={module.icon} size={24} />
          {module.label}
        </button>
      ))}
    </div>
  );
}

/** The areas of the file. Stammdaten is open; the other two are placeholders. */
function Sidebar() {
  const { sections, personName } = useWorkflow();
  return (
    <aside className="pp-side">
      <header className="pp-side-head">
        <span className="pp-side-glyph">
          <IdCardIcon />
        </span>
        <span className="pp-side-title">
          <strong>Profil</strong>
          <small>{personName}</small>
        </span>
      </header>

      <div className="pp-side-search">
        <Icon src={a.searchDark} size={18} />
        Suchen...
      </div>

      <button type="button" className="pp-area open">
        <span className="pp-area-label">
          <Icon src={a.stammdaten} size={18} />
          Stammdaten
        </span>
        <Icon src={a.chevronDown} size={18} />
      </button>

      <div className="pp-tree">
        {NAV_GROUPS.map((group) => (
          <div className="pp-tree-group" key={group.label}>
            <span className="pp-tree-label">{group.label}</span>
            {group.items.map((item) =>
              "target" in item && item.target ? (
                <button
                  type="button"
                  className="pp-tree-item"
                  key={item.label}
                  onClick={() =>
                    document.getElementById(item.target)?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  <span className="pp-tree-name">
                    <Icon src={item.icon} size={18} />
                    {navLabel(item, sections)}
                  </span>
                  <Icon src={a.chevron} size={18} className="pp-tree-caret" />
                </button>
              ) : (
                <span className="pp-tree-item" key={item.label}>
                  <span className="pp-tree-name">
                    <Icon src={item.icon} size={18} />
                    {navLabel(item, sections)}
                  </span>
                  <Icon src={a.chevron} size={18} className="pp-tree-caret" />
                </span>
              ),
            )}
          </div>
        ))}
      </div>

      <button type="button" className="pp-area">
        <span className="pp-area-label">
          <Icon src={a.riskTarget} size={18} />
          Riskmanagement
        </span>
        <Icon src={a.chevron} size={18} />
      </button>
      <button type="button" className="pp-area">
        <span className="pp-area-label">
          <Icon src={a.docList} size={18} />
          Maklermandat
        </span>
        <Icon src={a.chevron} size={18} />
      </button>
    </aside>
  );
}

/** The partner at a glance, next to the note and the Plausibilitäts-Check. */
function IdentityStrip() {
  const { personName } = useWorkflow();
  return (
    <div className="pp-strip">
      <div className="pp-strip-main">
        <div className="pp-id">
          <span className="pp-id-avatar">
            <img src={a.avatar} alt="" />
          </span>
          <div className="pp-id-copy">
            <span className="chip">Interessent</span>
            <strong>{personName}</strong>
            <span className="pp-id-born">12.09.1988</span>
            <span className="pp-id-address">
              Mondseestrasse 32
              <br />
              A-5310 Mondsee
            </span>
          </div>
          <span className="pp-id-nr">ID: 2813</span>
        </div>

        <div className="pp-info">
          <small>Info</small>
          <p>Julia ist auch noch Geschäftsführerin der Lunixo AG.</p>
        </div>
      </div>

      <div className="pp-plausi">
        <header>
          <Icon src={a.plausiCheck} size={22} />
          Plausibilitäts Check
        </header>
        <ul>
          {PLAUSI.map((entry) => (
            <li key={entry.label}>
              <span className="pp-plausi-icon">
                <Icon src={entry.icon} size={18} />
              </span>
              <span className="pp-plausi-copy">
                <strong>{entry.label}</strong>
                <small>{entry.state}</small>
              </span>
              <Icon src={entry.done ? a.checkGreen : a.onhold} size={18} />
            </li>
          ))}
        </ul>
        <a href="#plausi">+2 weitere</a>
      </div>
    </div>
  );
}

export function PersonPage() {
  const {
    leaveManager,
    displaySections,
    openStammdaten,
    deleteStammdatenCard,
    personName,
    isHistorical,
    openVersionHistory,
    personModule,
    filePartnerId,
  } = useWorkflow();
  const [pendingDelete, setPendingDelete] = useState<{ area: ReturnType<typeof areaForSection>; card: Card } | null>(
    null,
  );

  const appClass = [
    "app",
    "person",
    isHistorical ? "historical" : "",
    personModule === "workflows" ? "workflows" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClass}>
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <div className="person-tab">
              <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
              <span className="person-tab-body">
                <Icon src={a.person} size={24} />
                {personName}
                <button
                  type="button"
                  className="close-icon"
                  aria-label={`${personName} schließen`}
                  onClick={() => leaveManager()}
                >
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
            <div className="avatar-wrap">
              <img className="photo" src={a.avatar} alt="Profil" />
              <img className="ring" src={a.avatarRing} alt="" />
              <img className="dot" src={a.statusDot} alt="" />
            </div>
          </div>
        </header>

        <PersonAreaNav />
        <PersonModuleNav />

        {personModule === "workflows" ? (
          <WorkflowsPage />
        ) : filePartnerId === "ashley" ? (
          <MaklermandatPage />
        ) : (
        <div className="pp-body">
          <Sidebar />

          <main className="pp-main">
            <header className="fg-head pp-main-head">
              <span className="pp-main-title">
                <Icon src={a.stammdaten} size={24} />
                Stammdaten
              </span>
              <span className="fg-head-actions">
                <button type="button" className="btn-secondary fg-verlauf-btn" onClick={openVersionHistory}>
                  <Icon src={a.history} size={18} />
                  <VerlaufCaption />
                </button>
                <button type="button" className="fg-head-search" aria-label="Suche">
                  <Icon src={a.searchDark} size={18} />
                </button>
              </span>
            </header>

            <IdentityStrip />

            {displaySections.map((section) => {
              const area = areaForSection(section.id);
              const empty = !section.cards.length || Boolean(section.cards[0]?.empty);
              return (
                <section className="pp-section" id={section.id} key={section.id}>
                  <header className="pp-section-head">
                    <span className="pp-section-title">
                      <Icon src={section.icon} size={32} />
                      {countedTitle(section)}
                    </span>
                    <button
                      type="button"
                      className="btn-primary pp-edit"
                      onClick={() => openStammdaten(area)}
                    >
                      Editieren
                    </button>
                  </header>
                  <div className={empty ? "pp-cards center" : "pp-cards"}>
                    {section.cards.map((card) => (
                      <DataCard
                        card={card}
                        key={card.id}
                        onEdit={() => openStammdaten(area, card.id)}
                        onDelete={() => setPendingDelete({ area, card })}
                        onAdd={() => openStammdaten(area)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </main>
        </div>
        )}
      </div>

      {pendingDelete ? (
        <DeleteCard
          title={pendingDelete.card.title || "Eintrag"}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteStammdatenCard(pendingDelete.area, pendingDelete.card.id);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
