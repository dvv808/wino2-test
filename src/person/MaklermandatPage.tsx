import { useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { Icon, IdCardIcon } from "../ui";
import { FileIdentity, VerlaufCaption } from "../chrome";
import { useWorkflow } from "../workflow";
import { FILE_PARTNERS } from "./partners";

const MANDATE_SECTIONS = [
  {
    id: "gueltig",
    icon: a.confirmOutline,
    title: "Gültige Vereinbarungen (0)",
    empty: "Gültige Vereinbarungen erscheinen hier",
    create: true,
  },
  {
    id: "entwuerfe",
    icon: a.notes,
    title: "Entwürfe",
    empty: "Entwürfe erscheinen hier",
  },
  {
    id: "abgelaufen",
    icon: a.docList,
    title: "Abgelaufen (0)",
    empty: "Keine abgelaufenen Vereinbarungen",
  },
  {
    id: "kurzfristig",
    icon: a.history,
    title: "Kurzfristige Vereinbarungen (0)",
    empty: "Keine kurzfristigen Vereinbarungen",
  },
] as const;

const SIDE_SUBS = [
  { id: "gueltig", icon: a.confirmOutline, label: "Gültig (0)" },
  { id: "entwuerfe", icon: a.notes, label: "Entwürfe (0)" },
  { id: "abgelaufen", icon: a.docList, label: "Abgelaufen" },
  { id: "kurzfristig", icon: a.history, label: "Kurzfristige Vereinb." },
] as const;

const FEATURES = ["Risikomanagement", "Maklervereinbarungen", "Vollmachten", "Angebote", "und mehr"];

const OVERVIEW = [
  {
    icon: a.privat,
    label: "Interessentenvereinbarung",
    state: "Offen",
    child: { icon: a.docList, label: "AV Vollmacht", state: "Offen" },
  },
  {
    icon: a.calendar,
    label: "Kurzfristige Vereinbarungen",
    state: "Optional",
    child: { icon: a.docList, label: "Schadenvollmacht", state: "Optional" },
  },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Halo({ size = 130, icon = 54 }: { size?: number; icon?: number }) {
  return (
    <span className="mm-halo" style={{ width: size, height: size }}>
      <Icon src={a.transform} size={icon} />
    </span>
  );
}

function ConvertCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="mm-convert">
      <header>
        <Icon src={a.docList} size={22} />
        Maklermandat Übersicht
      </header>
      <Halo />
      <strong>
        Zu Interessenten
        <br />
        umwandeln
      </strong>
      <p>Als Interessent stehen weitere Funktionen und Möglichkeiten zur Verfügung.</p>
      <button type="button" className="btn-secondary mm-start" onClick={onStart}>
        Umwandlung starten
      </button>
    </div>
  );
}

function OverviewCard() {
  return (
    <div className="mm-overview">
      <header>
        <Icon src={a.docList} size={22} />
        Maklermandat Übersicht
      </header>
      {OVERVIEW.map((entry) => (
        <div className="mm-ov-group" key={entry.label}>
          <div className="mm-ov-row">
            <span className="mm-contact-icon">
              <Icon src={entry.icon} size={18} />
            </span>
            <span className="mm-ov-copy">
              <strong>{entry.label}</strong>
              <small>{entry.state}</small>
            </span>
            <Icon src={a.onhold} size={20} />
          </div>
          <div className="mm-ov-row nested">
            <span className="mm-contact-icon">
              <Icon src={entry.child.icon} size={18} />
            </span>
            <span className="mm-ov-copy">
              <strong>{entry.child.label}</strong>
              <small>{entry.child.state}</small>
            </span>
            <Icon src={a.onhold} size={20} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyArt({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <article className="pp-card empty">
      <div className="pp-empty-art">
        <span className="plate p3" />
        <span className="plate p2" />
        <span className="plate p1" />
        <span className="orb">
          <Icon src={icon} size={40} />
        </span>
      </div>
      <strong>{title}</strong>
      {children}
    </article>
  );
}

function Sidebar({ converted }: { converted: boolean }) {
  const { personName, openPersonArea } = useWorkflow();
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

      <button type="button" className="pp-area" onClick={() => openPersonArea("stammdaten")}>
        <span className="pp-area-label">
          <Icon src={a.stammdaten} size={18} />
          Stammdaten
        </span>
        <Icon src={a.chevronDark} size={18} className="caret-side" />
      </button>
      <button type="button" className="pp-area">
        <span className="pp-area-label">
          <Icon src={a.riskTarget} size={18} />
          Riskmanagement
        </span>
        <Icon src={a.chevronDark} size={18} className="caret-side" />
      </button>
      <button type="button" className="pp-area open">
        <span className="pp-area-label">
          <Icon src={a.docList} size={18} />
          Maklermandat
        </span>
        <Icon src={converted ? a.chevronDown : a.chevronDark} size={18} className={converted ? undefined : "caret-side"} />
      </button>

      {converted ? (
        <div className="pp-tree mm-tree">
          {SIDE_SUBS.map((item) => (
            <button type="button" className="pp-tree-item" key={item.id} onClick={() => scrollTo(item.id)}>
              <span className="pp-tree-name">
                <Icon src={item.icon} size={18} />
                {item.label}
              </span>
              <Icon src={a.chevronDark} size={18} className="pp-tree-caret caret-side" />
            </button>
          ))}
        </div>
      ) : null}

      <button type="button" className="pp-area">
        <span className="pp-area-label">
          <Icon src={a.tickList} size={18} />
          Inkasso
        </span>
        <Icon src={a.chevronDark} size={18} className="caret-side" />
      </button>
      <button type="button" className="pp-area">
        <span className="pp-area-label">
          <Icon src={a.logoMark} size={18} className="mm-wino" />
          Wino
        </span>
        <Icon src={a.chevronDark} size={18} className="caret-side" />
      </button>
    </aside>
  );
}

function Overlay({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="umw-modal" role="dialog" aria-label="Umwandlung zu Interessenten">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="umw-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">Umwandlung zu Interessenten</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onCancel}>
            <Icon src={a.iconCloseDark} size={12} />
          </button>
        </header>

        <div className="umw-content">
          <Halo size={96} icon={40} />
          <h2>
            Umwandlung
            <br />
            zu Interessenten
          </h2>

          <div className="umw-panel">
            <FileIdentity className="pp-id mm-id compact umw-id" forceInteressent />

            <p>Als Interessent bekommt diese Person Zugang zu weiteren Funktionen:</p>
            <ul className="umw-features">
              {FEATURES.map((feature) => (
                <li key={feature}>
                  <Icon src={a.tick} size={14} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="umw-foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Umwandlung bestätigen
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Ashley Johnson's file until conversion, then Interessent. */
export function MaklermandatPage() {
  const { ashleyConverted, convertAshley, openVersionHistory } = useWorkflow();
  const [overlay, setOverlay] = useState(false);
  const info = FILE_PARTNERS.ashley.info;

  return (
    <>
      <div className="pp-body">
        <Sidebar converted={ashleyConverted} />
        <main className="pp-main">
          <header className="fg-head pp-main-head">
            <span className="pp-main-title">
              <Icon src={a.docList} size={24} />
              Maklermandat
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

          <div className="pp-strip">
            <div className="pp-strip-main">
              <FileIdentity className="pp-id mm-id" />
              {info ? (
                <div className="pp-info">
                  <small>Info</small>
                  <p>{info}</p>
                </div>
              ) : null}
            </div>
            {ashleyConverted ? <OverviewCard /> : <ConvertCard onStart={() => setOverlay(true)} />}
          </div>

          {ashleyConverted ? (
            MANDATE_SECTIONS.map((section) => (
              <section className="pp-section" id={section.id} key={section.id}>
                <header className="pp-section-head">
                  <span className="pp-section-title">
                    <Icon src={section.icon} size={32} />
                    {section.title}
                  </span>
                  {"create" in section && section.create ? (
                    <button type="button" className="btn-primary pp-edit">
                      Erstellen
                    </button>
                  ) : null}
                </header>
                <div className="pp-cards center mm-empty">
                  <EmptyArt icon={section.icon} title={section.empty} />
                </div>
              </section>
            ))
          ) : (
            <section className="pp-section mm-empty">
              <div className="pp-cards center">
                <EmptyArt icon={a.docList} title="Maklermandat nicht verfügbar">
                  <p>
                    Ein Maklermandat kann nur für Interessenten &amp; Kunden erstellt werden.
                    <br />
                    <button type="button" className="pp-empty-link" onClick={() => setOverlay(true)}>
                      Wandle diese Person zuerst in einen Interessenten um.
                    </button>
                  </p>
                </EmptyArt>
              </div>
            </section>
          )}
        </main>
      </div>

      {overlay ? (
        <Overlay
          onCancel={() => setOverlay(false)}
          onConfirm={() => {
            convertAshley();
            setOverlay(false);
          }}
        />
      ) : null}
    </>
  );
}
