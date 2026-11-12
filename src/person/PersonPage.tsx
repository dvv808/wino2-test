import { ProfileShelfProvider, ShelfBody, ShelfTitle } from "./ProfileShelf";
import { useState } from "react";
import * as a from "../assets/index";
import { ContextMenu, Icon } from "../ui";
import { WicoDeviationBox } from "../Summary";
import { useWorkflow } from "../workflow";
import { LogoButton, FileIdentity, FileTabs, ProfileMenu, VerlaufCaption, WorkflowDock, MeinBereichTab } from "../chrome";
import { ManagementAreaIcon } from "../manager/BestandChrome";
import { DataCard } from "./cards";
import { areaChangesIn, areaStand, type PersonVersion } from "./versions";
import { draftFor, pendingFor, usePruefungen } from "./pruefung";
import type { StammdatenAreaId } from "./stammdaten";
import { DeleteCard } from "./DeleteCard";
import { InkassoMain } from "./InkassoMain";
import { MaklermandatPage } from "./MaklermandatPage";
import { PartnerDashboard } from "./PartnerDashboard";
import { WorkflowsPage } from "./WorkflowsPage";
import { getPartner } from "./partners";
import { familyKindLabel, familyMember, type FamilyMemberId } from "./family";
import { confirmedLinksFor, familyRoleFor, otherMemberOf, useFamilyLinks, type FamilyLink } from "./familyLinks";
import {
  honorarWarningFor,
  overviewKonzernLinks,
  partyChip,
  partyHonorarLine,
  partyMeta,
  partyName,
  useKonzernLinks,
  type KonzernGroup,
  type KonzernLink,
  type PartyKind,
} from "./konzernLinks";
import {
  ASHLEY_PLAUSI,
  NAV_GROUPS,
  PLAUSI,
  areaForSection,
  countedTitle,
  navLabel,
  type Card,
} from "./stammdaten";
import { GlobalSearch } from "../search/GlobalSearch";

function emptyVerknuepfungCard(id: string, title: string): Card {
  return {
    id,
    empty: {
      icon: a.verknuepfung,
      title,
      link: "neue Verknüpfungen hier anlegen",
    },
  };
}

function familyOverviewCards(memberId: FamilyMemberId, links: FamilyLink[]): Card[] {
  return confirmedLinksFor(links, memberId).map((link) => {
    const other = familyMember(otherMemberOf(link, memberId));
    return {
      id: link.id,
      title: familyRoleFor(link, memberId) || "Nicht definiert",
      blocks: [
        {
          kind: "person",
          tag: familyKindLabel(other.kind),
          name: other.name,
          sub: [other.born, other.address].filter(Boolean).join(" · ") || "-",
        },
      ],
    };
  });
}

function konzernOverviewCards(partyId: string, kind: PartyKind, groups: KonzernGroup[], links: KonzernLink[]): Card[] {
  const holdingName = groups.find((group) =>
    links.some((link) => link.groupId === group.id && (link.ownerId === partyId || link.targetId === partyId)),
  )?.konzernId;
  const honorarOf = holdingName ? partyName(holdingName) : "";
  return overviewKonzernLinks(groups, links, partyId, kind).flatMap((link) => {
    const id = link.targetId;
    if (!id) return [];
    const featured = link.id.startsWith("hub-");
    const honorar = honorarOf ? partyHonorarLine(id, honorarOf) : "";
    return [
      {
        id: link.id,
        icon: featured ? a.ksGroupCompanies : undefined,
        title: featured ? `Konzern: ${partyName(id)}` : partyName(id),
        blocks: [
          {
            kind: "person" as const,
            party: link.targetKind === "company" ? ("company" as const) : ("person" as const),
            tag: partyChip(id),
            name: partyName(id),
            sub: [partyMeta(id) || "-", honorar].filter(Boolean).join(" · "),
          },
        ],
      },
    ];
  });
}

/** Same apps as the workflow bar. Only Person is open in the prototype. */
const AREAS = ["Person", "Verträge", "Schäden", "Angebote"];

/** The module row under it. Dashboard, Profil and Workflows & To-Dos are wired. */
const MODULES = [
  { label: "Dashboard", icon: a.dashboard, module: "dashboard" as const },
  { label: "Profil", icon: a.moduleProfile, module: "profil" as const },
  { label: "Kommunikation", icon: a.moduleCommunication },
  { label: "Workflows & To-Dos", icon: a.moduleWorkflow, module: "workflows" as const },
  { label: "Dateien", icon: a.moduleFile },
  { label: "Controlling", icon: a.moduleControlling },
];

const SIDE_AREAS = [
  { label: "Riskmanagement", icon: a.riskTarget },
  { label: "Maklermandat", icon: a.iconBrokerContract },
  { label: "Inkasso", icon: a.tickList },
  { label: "Wino", icon: a.logoMark, mark: true },
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
  const { personModule, openPersonModule, openVersionHistory } = useWorkflow();
  const active = personModule === "workflows" || personModule === "dashboard" ? personModule : "profil";

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
      {/* Verlauf always sits at the very right of this nav, on every person page. */}
      <button type="button" className="btn-secondary fg-verlauf-btn module-verlauf" onClick={openVersionHistory}>
        <Icon src={a.history} size={18} />
        <VerlaufCaption />
      </button>
    </div>
  );
}

function TreeNavItem({
  label,
  icon,
  target,
}: {
  label: string;
  icon: string;
  target?: string;
}) {
  const { openStammdaten } = useWorkflow();
  const area = target ? areaForSection(target) : null;

  return (
    <div className="pp-tree-item">
      {target ? (
        <button
          type="button"
          className="pp-tree-main"
          onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <span className="pp-tree-name">
            <Icon src={icon} size={18} />
            {label}
          </span>
        </button>
      ) : (
        <span className="pp-tree-main">
          <span className="pp-tree-name">
            <Icon src={icon} size={18} />
            {label}
          </span>
        </span>
      )}
      {/* Second level: no arrow; the ⋮ Editieren menu shows on hover. */}
      <span className="pp-tree-trail">
        {area ? (
          <span className="pp-tree-menu">
            <ContextMenu
              items={[
                {
                  label: "Editieren",
                  icon: a.menuEdit,
                  onSelect: () => openStammdaten(area),
                },
              ]}
              label={`${label} bearbeiten`}
            />
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** The areas of the file. Stammdaten expands; the rest are placeholders. */
function Sidebar() {
  // Counts follow the Stand on screen (an older Stand can have fewer cards).
  const { displaySections: sections, personName, personArea, openPersonArea } = useWorkflow();
  const [stammdatenOpen, setStammdatenOpen] = useState(true);
  return (
    <aside className="pp-side">
      <header className="pp-side-head">
        <span className="pp-side-glyph">
          <Icon src={a.moduleProfile} size={24} />
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

      <button
        type="button"
        className="pp-area open"
        aria-expanded={stammdatenOpen}
        onClick={() => {
          setStammdatenOpen((open) => !open);
          if (personArea !== "stammdaten") openPersonArea("stammdaten");
        }}
      >
        <span className="pp-area-label">
          <Icon src={a.stammdaten} size={18} />
          Stammdaten
        </span>
        <Icon
          src={stammdatenOpen ? a.chevronDown : a.chevronDark}
          size={18}
          className={stammdatenOpen ? undefined : "caret-side"}
        />
      </button>

      {stammdatenOpen ? (
        <div className="pp-tree">
          {NAV_GROUPS.map((group) => (
            <div className="pp-tree-group" key={group.label}>
              <span className="pp-tree-label">{group.label}</span>
              {group.items.map((item) => (
                <TreeNavItem
                  key={item.label}
                  label={navLabel(item, sections)}
                  icon={item.icon}
                  target={"target" in item ? item.target : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {SIDE_AREAS.map((area) => (
        <button
          type="button"
          className={
            (area.label === "Inkasso" && personArea === "inkasso") ||
            (area.label === "Maklermandat" && personArea === "maklermandat")
              ? "pp-area open"
              : "pp-area"
          }
          key={area.label}
          onClick={
            area.label === "Inkasso"
              ? () => openPersonArea("inkasso")
              : area.label === "Maklermandat"
                ? () => openPersonArea("maklermandat")
                : undefined
          }
        >
          <span className="pp-area-label">
            <Icon src={area.icon} size={18} className={area.mark ? "mm-wino" : undefined} />
            {area.label}
          </span>
          <Icon src={a.chevronDark} size={18} className="caret-side" />
        </button>
      ))}
    </aside>
  );
}

/** The partner at a glance, next to the note and the Plausibilitäts-Check. */
function IdentityStrip() {
  const { filePartnerId } = useWorkflow();
  const file = getPartner(filePartnerId);
  const plausi = filePartnerId === "ashley" ? ASHLEY_PLAUSI : PLAUSI;

  return (
    <div className="pp-strip">
      <div className="pp-strip-main">
        <FileIdentity />

        {file.info ? (
          <div className="pp-info">
            <small>Info</small>
            <p>{file.info}</p>
          </div>
        ) : null}
      </div>

      <div className="pp-plausi">
        <header>
          <Icon src={a.plausiCheck} size={22} />
          Plausibilitäts Check
        </header>
        <ul>
          {plausi.map((entry) => (
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

/** Per area on an older Stand: "geändert am" (highlighted) or "unverändert seit" (grey). */
function AreaStandLine({ area, date, versions }: { area: StammdatenAreaId; date: string; versions: PersonVersion[] }) {
  const stand = areaStand(versions, area, date);
  if (stand.state === "changed") return <span className="pp-stand changed">geändert am {stand.date}</span>;
  if (stand.state === "unchanged") return <span className="pp-stand">unverändert seit {stand.date}</span>;
  // No change recorded for this area at all: its data is not tracked in the Verlauf yet.
  return <span className="pp-stand">keine Änderungen erfasst</span>;
}

/** Zeitraum view: how many changes this area got within the range. */
function AreaRangeLine({ area, range, versions }: { area: StammdatenAreaId; range: { from: string; to: string }; versions: PersonVersion[] }) {
  const count = areaChangesIn(versions, area, range.from, range.to);
  if (count) return <span className="pp-stand changed">{count} {count === 1 ? "Änderung" : "Änderungen"} im Zeitraum</span>;
  return <span className="pp-stand">unverändert im Zeitraum</span>;
}

export function PersonPage() {
  const {
    leaveManager,
    displaySections,
    openStammdaten,
    deleteStammdatenCard,
    isHistorical,
    versions,
    viewingVersion,
    standRange,
    personModule,
    filePartnerId,
    personArea,
    openPruefung,
    finanzenProfileOpen,
    backToFinanzen,
  } = useWorkflow();
  const { links, unlinkLink } = useFamilyLinks();
  const pruefList = usePruefungen();
  const pruefStatus = (pendingFor(pruefList, filePartnerId) ?? draftFor(pruefList, filePartnerId))?.status;
  const konzern = useKonzernLinks();
  const isCompanyFile = getPartner(filePartnerId).fileKind === "company";
  const partyKind: PartyKind = isCompanyFile ? "company" : "person";
  const familyCards = isCompanyFile ? [] : familyOverviewCards(filePartnerId, links);
  const konzernCards = konzernOverviewCards(filePartnerId, partyKind, konzern.groups, konzern.links);
  const holdingName = (() => {
    const group = konzern.groupOf(filePartnerId, partyKind);
    return group?.konzernId ? partyName(group.konzernId) : "";
  })();
  const familyShown = familyCards.length ? familyCards : [emptyVerknuepfungCard("verknuepfung-familie-empty", "Noch keine Familienverknüpfung angelegt")];
  const konzernShown = konzernCards.length ? konzernCards : [emptyVerknuepfungCard("verknuepfung-konzern-empty", "Noch keine Konzernverknüpfung angelegt")];
  const vkCount = familyCards.length + konzernCards.length;
  const sectionsShown = displaySections.map((section) =>
    section.id === "verknuepfung"
      ? { ...section, title: vkCount ? `Verknüpfungen (${vkCount})` : "Verknüpfungen" }
      : section,
  );
  const [pendingDelete, setPendingDelete] = useState<{
    area: ReturnType<typeof areaForSection>;
    card: Card;
    unlink?: "family" | "konzern";
  } | null>(null);

  const appClass = [
    "app",
    "person",
    isHistorical ? "historical" : "",
    personModule === "workflows" ? "workflows" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ProfileShelfProvider>
    <div className={appClass}>
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            {finanzenProfileOpen ? (
              <div className="person-tab inactive">
                <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
                <span className="person-tab-body mgmt-tab">
                  <ManagementAreaIcon />
                  <button type="button" className="mgmt-tab-copy person-tab-open" onClick={backToFinanzen}>
                    Management
                    <br />
                    Winter Vers.
                  </button>
                  <button
                    type="button"
                    className="close-icon"
                    aria-label="Bestandsmanagement schließen"
                    onClick={() => leaveManager()}
                  >
                    <img src={a.iconClose} alt="" width={18} height={18} />
                  </button>
                </span>
                <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
              </div>
            ) : null}
            <FileTabs />
            <MeinBereichTab />
          </div>
          <div className="main-nav-right">
            <GlobalSearch />
            <ProfileMenu />
          </div>
        </header>

        <PersonAreaNav />
        <PersonModuleNav />

        {personModule === "dashboard" ? (
          <PartnerDashboard key={filePartnerId} familyCards={familyCards} holdingName={holdingName} />
        ) : personModule === "workflows" ? (
          <WorkflowsPage />
        ) : personArea === "inkasso" ? (
          <ShelfBody>
            <Sidebar />
            <InkassoMain />
          </ShelfBody>
        ) : personArea === "maklermandat" ? (
          <MaklermandatPage />
        ) : (
        <ShelfBody>
          <Sidebar />

          <main className="pp-main">
            <header className="fg-head pp-main-head">
              <ShelfTitle icon={a.stammdaten}>Stammdaten</ShelfTitle>
              <span className="fg-head-actions">
                {/* Prüfmodus: go through the Stammdaten with the client, collect Änderungswünsche, send for Freigabe.
                    For now only on Thomas Debrezina (the demo Kunde). */}
                {filePartnerId === "thomas" ? (
                  <button type="button" className="btn-primary pm-start" onClick={() => openPruefung()}>
                    <Icon src={a.tickList} size={16} />
                    {pruefStatus === "offen" ? "Prüfung bei Bestandsmanager" : pruefStatus === "entwurf" ? "Prüfung fortsetzen" : "Beim Kunden prüfen"}
                  </button>
                ) : null}
                <button type="button" className="fg-head-search" aria-label="Suche">
                  <Icon src={a.searchDark} size={18} />
                </button>
              </span>
            </header>

            <IdentityStrip />

            {sectionsShown.map((section) => {
              const area = areaForSection(section.id);
              const empty = !section.cards.length || Boolean(section.cards[0]?.empty);
              const vkGroups = isCompanyFile
                ? [{ id: "konzern" as const, title: `Konzern (${konzernCards.length})`, cards: konzernShown }]
                : [
                    { id: "familie" as const, title: `Familie (${familyCards.length})`, cards: familyShown },
                    { id: "konzern" as const, title: `Konzern (${konzernCards.length})`, cards: konzernShown },
                  ];
              return (
                <section className="pp-section" id={section.id} key={section.id}>
                  <header className="pp-section-head">
                    <span className="pp-section-title">
                      <Icon src={section.icon} size={32} />
                      {countedTitle(section)}
                      {/* Older Stand open: did this area change on that date, or since when is it unchanged? */}
                      {standRange ? (
                        <AreaRangeLine area={area} range={standRange} versions={versions} />
                      ) : isHistorical && viewingVersion ? (
                        <AreaStandLine area={area} date={viewingVersion.date} versions={versions} />
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="btn-primary pp-edit"
                      onClick={() => openStammdaten(area)}
                    >
                      Editieren
                    </button>
                  </header>
                  {section.id === "verknuepfung" ? (
                    vkGroups.map((group) => {
                      const groupEmpty = Boolean(group.cards[0]?.empty);
                      return (
                        <div className="pp-vk-sub" key={group.id}>
                          <h3 className="pp-vk-subtitle">{group.title}</h3>
                          <div className={groupEmpty ? "pp-cards center" : "pp-cards"}>
                            {group.cards.map((card) => (
                              <DataCard
                                card={card}
                                key={card.id}
                                onEdit={() => openStammdaten(area, card.id)}
                                onDelete={() =>
                                  setPendingDelete({
                                    area,
                                    card,
                                    unlink: group.id === "konzern" ? "konzern" : "family",
                                  })
                                }
                                onAdd={() => openStammdaten(area)}
                                deleteLabel="Verknüpfung auflösen"
                                deleteIcon={a.menuUnlink}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <>
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
                      {section.id === "wirtschaftsdaten" ? <WicoDeviationBox /> : null}
                    </>
                  )}
                </section>
              );
            })}
          </main>
        </ShelfBody>
        )}
      </div>

      {pendingDelete ? (
        <DeleteCard
          title={pendingDelete.area === "verknuepfung" ? "Verknüpfung" : pendingDelete.card.title || "Eintrag"}
          action={pendingDelete.area === "verknuepfung" ? "auflösen" : "löschen"}
          name={
            pendingDelete.area === "verknuepfung"
              ? pendingDelete.card.blocks?.find((block) => block.kind === "person")?.name
              : undefined
          }
          warning={
            pendingDelete.unlink === "konzern"
              ? honorarWarningFor(
                  [
                    pendingDelete.card.id.startsWith("hub-") && partyKind === "person"
                      ? filePartnerId
                      : overviewKonzernLinks(konzern.groups, konzern.links, filePartnerId, partyKind).find(
                          (link) => link.id === pendingDelete.card.id,
                        )?.targetId ?? "",
                  ].filter(Boolean),
                  holdingName,
                )
              : undefined
          }
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            if (pendingDelete.unlink === "konzern") konzern.unlink(pendingDelete.card.id, filePartnerId, partyKind);
            else if (pendingDelete.unlink === "family" || pendingDelete.area === "verknuepfung") {
              unlinkLink(pendingDelete.card.id, filePartnerId);
            } else deleteStammdatenCard(pendingDelete.area, pendingDelete.card.id);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
    </ProfileShelfProvider>
  );
}
