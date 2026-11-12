import * as a from "../assets/index";
import { FileTabs, LogoButton, MeinBereichTab, ProfileMenu } from "../chrome";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { partyMeta, partyName } from "./konzernLinks";
import { GlobalSearch } from "../search/GlobalSearch";

/** Placeholder page for the special Konzern tab. Content will follow. */
export function KonzernHubPage() {
  const { konzernHubId } = useWorkflow();
  const name = konzernHubId ? partyName(konzernHubId) : "Konzern";
  const meta = konzernHubId ? partyMeta(konzernHubId) : "";

  return (
    <div className="app person">
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

        <main className="kh-page">
          <header className="kh-head">
            <Icon src={a.ksGroupCompanies} size={32} />
            <div>
              <p className="kh-kicker">Konzern</p>
              <h1>{name}</h1>
              {meta ? <p className="kh-meta">{meta}</p> : null}
            </div>
          </header>
          <section className="kh-placeholder">
            <p>Inhalt folgt.</p>
          </section>
        </main>
      </div>
    </div>
  );
}
