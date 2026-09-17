import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { NAV_GROUPS, PLAUSI, SECTIONS, type Block, type Card, type Row, type Value } from "./stammdaten";

/** The four person areas across the dark bar. Only Person is open in the prototype. */
const AREAS = ["Person", "Verträge", "Schäden", "Angebote"];

/** The module row under it. Profil is the page we are on; the rest come later. */
const MODULES = [
  { label: "Dashboard", icon: a.category },
  { label: "Profil", icon: a.idCard, active: true },
  { label: "Kommunikation", icon: a.comment },
  { label: "Workflows & To-Dos", icon: a.workflow },
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
    </nav>
  );
}

function PersonModuleNav() {
  return (
    <div className="module-nav">
      {MODULES.map((module) => (
        <button
          type="button"
          className={module.active ? "module-pill active" : "module-pill"}
          key={module.label}
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
  return (
    <aside className="pp-side">
      <header className="pp-side-head">
        <span className="pp-side-avatar">
          <img src={a.avatar} alt="" />
        </span>
        <span className="pp-side-title">
          <strong>Profil</strong>
          <small>Julia Atkinson</small>
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
            {group.items.map((item) => (
              <a
                className="pp-tree-item"
                href={"target" in item && item.target ? `#${item.target}` : undefined}
                key={item.label}
              >
                <span className="pp-tree-name">
                  <Icon src={item.icon} size={18} />
                  {item.label}
                </span>
                <Icon src={a.chevron} size={18} className="pp-tree-caret" />
              </a>
            ))}
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
  return (
    <div className="pp-strip">
      <div className="pp-id">
        <span className="pp-id-avatar">
          <img src={a.avatar} alt="" />
        </span>
        <div className="pp-id-copy">
          <span className="chip">Interessent</span>
          <strong>Julia Atkinson</strong>
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

function ValueCell({ value }: { value: Value }) {
  if (typeof value === "string") return <span className="pp-val">{value}</span>;

  if (value.kind === "link") return <a className="pp-val link" href="#daten">{value.text}</a>;

  if (value.kind === "flag") {
    return (
      <span className="pp-val">
        <span className="pp-flag at" aria-hidden="true" />
        {value.text}
      </span>
    );
  }

  if (value.kind === "file") {
    return (
      <a className="pp-val file" href="#datei">
        <img src={a.pdf} alt="" width={17} height={20} />
        {value.text}
      </a>
    );
  }

  return (
    <span className="pp-entity">
      <span className="pp-entity-copy">
        <span className="chip">{value.tag}</span>
        <strong>{value.name}</strong>
        <small>{value.sub}</small>
      </span>
      <Icon src={a.openTab} size={18} />
    </span>
  );
}

function RowLine({ row }: { row: Row }) {
  return (
    <div className="pp-row">
      <span className="pp-label">{row.label}</span>
      <ValueCell value={row.value} />
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.kind === "rows") {
    return (
      <div className="pp-rows">
        {block.rows.map((row) => (
          <RowLine row={row} key={row.label} />
        ))}
      </div>
    );
  }

  if (block.kind === "group") {
    return (
      <div className="pp-group">
        {block.caption ? <span className="pp-caption">{block.caption}</span> : null}
        <div className="pp-group-body">
          {block.rows.map((row) => (
            <RowLine row={row} key={row.label} />
          ))}
        </div>
      </div>
    );
  }

  if (block.kind === "note") {
    return (
      <div className="pp-note">
        <small>{block.caption}</small>
        <p>{block.text}</p>
      </div>
    );
  }

  return (
    <div className="pp-files">
      <span className="pp-caption">{block.caption}</span>
      <div className="pp-rows">
        {block.rows.map((row) => (
          <RowLine row={row} key={row.label} />
        ))}
      </div>
    </div>
  );
}

function DataCard({ card }: { card: Card }) {
  return (
    <article className={card.clampTo ? "pp-card clamped" : "pp-card"}>
      <header className="pp-card-head">
        <span className="pp-card-title">
          <Icon src={card.icon} size={22} />
          {card.title}
        </span>
        <button type="button" className="pp-card-menu" aria-label="Weitere Aktionen">
          <img src={a.contextMenu} alt="" width={18} height={18} />
        </button>
      </header>

      <div className="pp-card-body" style={card.clampTo ? { maxHeight: card.clampTo - 90 } : undefined}>
        {card.blocks.map((block, index) => (
          <BlockView block={block} key={index} />
        ))}
      </div>

      {card.clampTo ? (
        <footer className="pp-card-more">
          <a href="#daten">Alle Daten anzeigen</a>
        </footer>
      ) : null}
    </article>
  );
}

export function PersonPage() {
  const { leaveManager } = useWorkflow();

  return (
    <div className="app">
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <button type="button" className="logo-btn" aria-label="Wino">
              <Icon src={a.logoGlow} size={52} className="glow" />
              <Icon src={a.logoMark} size={34} className="mark" />
            </button>
            <div className="person-tab">
              <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
              <span className="person-tab-body">
                <Icon src={a.person} size={24} />
                Julia Atkinson
                <button
                  type="button"
                  className="close-icon"
                  aria-label="Julia Atkinson schließen"
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

        <div className="pp-body">
          <Sidebar />

          <main className="pp-main">
            <header className="fg-head pp-main-head">
              <span className="pp-main-title">
                <Icon src={a.stammdaten} size={24} />
                Stammdaten
              </span>
              <span className="fg-head-actions">
                <button type="button" className="btn-secondary fg-verlauf-btn">
                  <Icon src={a.history} size={18} />
                  Verlauf
                </button>
                <button type="button" className="fg-head-search" aria-label="Suche">
                  <Icon src={a.searchDark} size={18} />
                </button>
              </span>
            </header>

            <IdentityStrip />

            {SECTIONS.map((section) => (
              <section className="pp-section" id={section.id} key={section.id}>
                <header className="pp-section-head">
                  <Icon src={section.icon} size={32} />
                  {section.title}
                </header>
                <div className="pp-cards">
                  {section.cards.map((card) => (
                    <DataCard card={card} key={card.title} />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
