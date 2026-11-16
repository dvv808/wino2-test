import * as a from "../assets/index";
import { FileTabs, LogoButton, MeinBereichTab, ProfileMenu } from "../chrome";
import { GlobalSearch } from "../search/GlobalSearch";
import { useWorkflow } from "../workflow";
import { memberBySlug } from "./hrmTeam";

/**
 * The employee tab, opened with the open icon in the Mitarbeiter side nav. For now it shows the avatar and the
 * name; the page design follows.
 */
export function MitarbeiterView() {
  const { mitarbeiterId } = useWorkflow();
  const person = mitarbeiterId ? memberBySlug(mitarbeiterId) : undefined;

  return (
    <div className="app">
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

        <div className="content-shell ma-body">
          {person ? (
            <>
            <section className="ma-head" aria-label={person.name}>
              <span className={person.photo ? "ma-avatar" : "ma-avatar blank"}>
                <img src={person.photo || a.clientBlank} alt="" />
                {person.typ && person.typ !== "Mitarbeiter" ? null : <img className="ma-dot" src={a.statusDot} alt="" />}
              </span>
              <div>
                {person.typ ? <span className={person.typ === "Mitarbeiter" ? "chip" : "chip einfach"}>{person.typ}</span> : null}
                <h1>{person.name}</h1>
                <p>{[person.role, person.abteilung].filter(Boolean).join(" · ")}</p>
              </div>
            </section>
            {/* Created with "Mitarbeiter anlegen": what was entered (the full page design follows). */}
            {person.angelegt ? (
              <section className="ma-data">
                <h2>Erfasste Daten</h2>
                <dl>
                  {Object.entries(person.angelegt).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            </>
          ) : (
            <p className="atab-empty center">Mitarbeiter nicht gefunden.</p>
          )}
        </div>
      </div>
    </div>
  );
}
