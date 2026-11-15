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
            <section className="ma-head" aria-label={person.name}>
              <span className="ma-avatar">
                <img src={person.photo} alt="" />
                <img className="ma-dot" src={a.statusDot} alt="" />
              </span>
              <div>
                <h1>{person.name}</h1>
                <p>
                  {person.role} · {person.abteilung}
                </p>
              </div>
            </section>
          ) : (
            <p className="atab-empty center">Mitarbeiter nicht gefunden.</p>
          )}
        </div>
      </div>
    </div>
  );
}
