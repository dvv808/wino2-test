import { useState } from "react";
import * as a from "../assets/index";
import { ConstructionArt } from "../mein-bereich/MeinBereichView";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { partyChip, partyName, useKonzernLinks, type PartyKind } from "./konzernLinks";
import { getPartner } from "./partners";
import { liveDashboardData, liveFileIdentity, type Card } from "./stammdaten";

/** Team Winter: the people at Makler Winter who look after this partner. */
const TEAM = [
  { name: "Sophie Bennett", role: "Kundenberatung", photo: a.empJasmin },
  { name: "Ella Thompson", role: "KFZ Versicherungen", photo: a.partnerBella },
  { name: "Jonathan Johnson", role: "Sachversicherungen", photo: a.empAlexander },
  { name: "Chloe Anderson", role: "Haftpflicht", photo: a.empChristine },
  { name: "James Sullington", role: "Schaden", photo: a.reqMike },
];

/** Systemdaten on the back of the profile card (Figma annotation). */
function systemRows(company: boolean, partnerType: string, advisor: string) {
  return [
    {
      title: "Allgemein",
      rows: [
        ["Personentyp", company ? "Unternehmen" : "Privatperson"],
        ["Partnertyp", partnerType],
      ],
    },
    {
      title: "Interne Zuordnung",
      rows: [
        ["Mandat", "Makler Winter"],
        ["Vermittler", "Winter"],
        ["Kundenberater", advisor],
        ["Fachabteilung KFZ", "kfz@makler-winter.at"],
        ["Fachabteilung SACH", "Herbert Miller"],
        ["Fachabteilung HAFT", "Marianne Mittag"],
        ["Fachabteilung PERS", "person@makler-winter.at"],
        ["Fachabteilung Schaden", "schaden@makler-winter.at"],
      ],
    },
    {
      title: "Vertraulichkeit",
      rows: [
        ["Rollen die Zugriff haben", "Alle"],
        ["Personen die Zugriff haben", "Michael Sunderland, Omar Suttner, Lucy Dallon, Caroline Jackson"],
      ],
    },
  ];
}

type LinkRow = { id: string; tag?: string; name: string; relation?: string; company: boolean };

function linkRows(cards: Card[], withRelation: boolean): LinkRow[] {
  return cards.flatMap((card) => {
    const block = card.blocks?.find((entry) => entry.kind === "person");
    if (!block || block.kind !== "person") return [];
    return [
      {
        id: card.id,
        tag: block.tag,
        name: block.name,
        relation: withRelation && card.title && card.title !== "Nicht definiert" ? card.title : undefined,
        company: "party" in block && block.party === "company",
      },
    ];
  });
}

function EmptyBox({ title, lead, link, onLink }: { title: string; lead: string; link: string; onLink: () => void }) {
  return (
    <div className="pd-empty">
      <span className="pd-empty-art" aria-hidden>
        <Icon src={a.verknuepfung} size={40} />
      </span>
      <strong>{title}</strong>
      <p>
        {lead}{" "}
        <button type="button" className="hn-link" onClick={onLink}>
          {link}
        </button>{" "}
        werden.
      </p>
    </div>
  );
}

function LinkList({ rows, limit = 4 }: { rows: LinkRow[]; limit?: number }) {
  return (
    <ul className="pd-links">
      {rows.slice(0, limit).map((row) => (
        <li key={row.id}>
          <span className={row.company ? "pd-link-avatar company" : "pd-link-avatar"}>
            <img src={row.company ? a.companyBlank : a.clientBlank} alt="" width={28} height={28} />
          </span>
          <span className="pd-link-copy">
            {row.tag ? <span className="pd-chip">{row.tag}</span> : null}
            <span>
              <strong>{row.name}</strong>
              {row.relation ? ` (${row.relation})` : ""}
            </span>
          </span>
          <img className="pd-open" src={a.openTab} alt="" width={16} height={16} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Partner Dashboard (Figma Dashboard Privatperson / Unternehmen): profile card with Kontaktinfos and Verknüpfungen
 * (Konzern for companies), Überblick, Team Winter and two areas still in Bearbeitung.
 */
export function PartnerDashboard({
  familyCards,
  holdingName,
}: {
  familyCards: Card[];
  holdingName: string;
}) {
  const { filePartnerId, personName, displaySections, ashleyConverted, openStammdaten, openPersonModule } = useWorkflow();
  const file = getPartner(filePartnerId);
  const company = file.fileKind === "company";
  const identity = liveFileIdentity(displaySections);
  const data = liveDashboardData(displaySections);
  const [tab, setTab] = useState<"kontakt" | "links">("kontakt");
  const [linkTab, setLinkTab] = useState<"familie" | "konzern">(company ? "konzern" : "familie");
  const [flipped, setFlipped] = useState(false);

  const interessent = filePartnerId === "julia" || (filePartnerId === "ashley" && ashleyConverted) || file.kind === "interessent";
  const partnerType = interessent ? "Interessent" : file.kind === "kunde" ? "Kunde" : "Einfache Person";
  const fullName = company ? personName : [data.titelVor, personName, data.titelNach].filter(Boolean).join(" ");
  const born = identity.born ?? file.born;
  const [street, city] = identity.address ?? file.address ?? ["", ""];

  const contact = data.contact;
  const phones = contact?.phones.length ? contact.phones : identity.contacts.filter((c) => c.kind === "phone").map((c) => c.value);
  const mails = contact?.mails.length ? contact.mails : identity.contacts.filter((c) => c.kind === "mail").map((c) => c.value);
  const hasContact = phones.length > 0 || mails.length > 0;
  const contactLabel = company ? "Zentraler Kontakt" : "Kontaktdaten von";
  const contactName = company
    ? [contact?.name || personName, contact?.role ? `(${contact.role})` : ""].filter(Boolean).join(" ")
    : personName;

  const familyRows = linkRows(familyCards, true);
  // Konzern: the holding this partner belongs to, and the other members of that Konzern (each once).
  const konzern = useKonzernLinks();
  const kind: PartyKind = company ? "company" : "person";
  const group = konzern.groupOf(filePartnerId, kind);
  const holdingId = group?.konzernId ?? null;
  const memberKinds = new Map<string, PartyKind>();
  if (group) {
    for (const link of konzern.links) {
      if (link.groupId !== group.id || !link.accepted) continue;
      memberKinds.set(link.ownerId, link.ownerKind);
      if (link.targetId && link.targetKind) memberKinds.set(link.targetId, link.targetKind);
    }
  }
  const isHolding = holdingId === filePartnerId;
  const holdingRow: LinkRow | undefined = holdingId && !isHolding
    ? { id: `holding-${holdingId}`, name: partyName(holdingId), company: true }
    : undefined;
  const memberRows: LinkRow[] = [...memberKinds.entries()]
    .filter(([id]) => id !== holdingId && id !== filePartnerId)
    .map(([id, partyKind]) => ({ id, tag: partyChip(id), name: partyName(id), company: partyKind === "company" }));
  const konzernCount = (holdingRow ? 1 : 0) + memberRows.length;
  const memberLimit = holdingRow ? 2 : 4;
  const linkTotal = (company ? 0 : familyRows.length) + konzernCount;
  // "+N weitere" counts what the open tab cuts off.
  const hiddenLinks =
    !company && linkTab === "familie" ? familyRows.length - 4 : memberRows.length - memberLimit;

  return (
    <div className="pd-page">
      <section className={flipped ? "pd-card pd-profile flipped" : "pd-card pd-profile"}>
        <button
          type="button"
          className="pd-kebab"
          aria-label={flipped ? "Zurück zum Profil" : "Systemdaten anzeigen"}
          aria-pressed={flipped}
          onClick={() => setFlipped((current) => !current)}
        >
          <Icon src={a.contextMenu} size={20} />
        </button>

        {flipped ? (
          <div className="pd-system">
            <h2>Systemdaten</h2>
            {systemRows(company, partnerType, "Lucy Dallon").map((group) => (
              <div className="pd-system-group" key={group.title}>
                <small>{group.title}</small>
                <dl>
                  {group.rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="pd-identity">
              <h1 title={fullName}>{fullName}</h1>
              {!company && data.rufname ? <p className="pd-vulgo">Vulgo: {data.rufname}</p> : null}
              <span className={`pd-chip type-${partnerType === "Kunde" ? "kunde" : partnerType === "Interessent" ? "interessent" : "einfach"}`}>
                {partnerType}
              </span>
              <span className="pd-avatar">
                <img src={a.avatarBg} alt="" />
                <img className="glyph" src={company ? a.companyBlank : a.clientBlank} alt="" />
              </span>
              <p className="pd-meta">
                {company ? (file.fn ? `FN ${file.fn}` : null) : born}
                {(company ? file.fn : born) ? <br /> : null}
                {street}
                {street && city ? <br /> : null}
                {city}
              </p>
              <div className="pd-tiles">
                <button type="button" className="pd-tile">
                  <Icon src={a.globe} size={22} />0 Portal
                </button>
                <button type="button" className="pd-tile">
                  <Icon src={a.notes} size={22} />0 Notizen
                </button>
                <button type="button" className="pd-tile">
                  <Icon src={a.folder} size={22} />
                  Dokumente
                </button>
              </div>
            </div>

            <div className="pd-switch-wrap">
              <div className="pd-switch" role="tablist">
                <button type="button" role="tab" aria-selected={tab === "kontakt"} className={tab === "kontakt" ? "active" : ""} onClick={() => setTab("kontakt")}>
                  Kontaktinfos
                </button>
                <button type="button" role="tab" aria-selected={tab === "links"} className={tab === "links" ? "active" : ""} onClick={() => setTab("links")}>
                  {company ? "Konzern" : "Verknüpfungen"}
                </button>
              </div>

              {tab === "kontakt" ? (
                hasContact ? (
                  <>
                    <div className="pd-folder">
                      <span className="pd-folder-tab">
                        <small>{contactLabel}</small>
                        {contactName}
                      </span>
                      <div className="pd-folder-body">
                        {phones.slice(0, 1).map((value) => (
                          <div className="pd-contact-row" key={`p-${value}`}>
                            <span className="pd-contact-icon">
                              <Icon src={a.phone} size={18} />
                            </span>
                            Telefon
                            <strong>{value}</strong>
                            <Icon src={a.comment} size={18} />
                          </div>
                        ))}
                        {mails.slice(0, 1).map((value) => (
                          <div className="pd-contact-row" key={`m-${value}`}>
                            <span className="pd-contact-icon">
                              <Icon src={a.mail} size={18} />
                            </span>
                            Mail
                            <strong>{value}</strong>
                            <Icon src={a.comment} size={18} />
                          </div>
                        ))}
                        {contact?.note ? (
                          <div className="pd-note">
                            <small>Allgemeine Notiz zur Kontaktperson</small>
                            <p>{contact.note}</p>
                          </div>
                        ) : null}
                        <button type="button" className="hn-link pd-more" onClick={() => openPersonModule("profil")}>
                          Weitere Kontakte im Profil
                        </button>
                      </div>
                    </div>
                    {data.moreContacts ? (
                      <button type="button" className="hn-link pd-more" onClick={() => openStammdaten("kontakte")}>
                        +{data.moreContacts} weitere Kontaktpersonen
                      </button>
                    ) : null}
                  </>
                ) : (
                  <EmptyBox
                    title="Kontaktinfos erscheinen hier"
                    lead="Kontaktinfos können über den"
                    link="Stammdaten hinzugefügt"
                    onLink={() => openStammdaten("kontakte")}
                  />
                )
              ) : linkTotal === 0 ? (
                <EmptyBox
                  title={company ? "Konzern erscheint hier" : "Verknüpfungen erscheinen hier"}
                  lead={company ? "Ein Konzern kann über die" : "Verknüpfungen können über die"}
                  link="Stammdaten angelegt"
                  onLink={() => openStammdaten("verknuepfung")}
                />
              ) : (
                <div className="pd-folder">
                  {company ? null : (
                    <div className="pd-subtabs" role="tablist">
                      <button type="button" role="tab" aria-selected={linkTab === "familie"} className={linkTab === "familie" ? "active" : ""} onClick={() => setLinkTab("familie")}>
                        Familie <span className="pd-count">{familyRows.length}</span>
                      </button>
                      <button type="button" role="tab" aria-selected={linkTab === "konzern"} className={linkTab === "konzern" ? "active" : ""} onClick={() => setLinkTab("konzern")}>
                        Konzern <span className="pd-count">{konzernCount}</span>
                      </button>
                    </div>
                  )}
                  <div className="pd-folder-body">
                    {!company && linkTab === "familie" ? (
                      familyRows.length ? (
                        <LinkList rows={familyRows} />
                      ) : (
                        <p className="pd-quiet">Noch keine Familienverknüpfung angelegt.</p>
                      )
                    ) : konzernCount ? (
                      <>
                        {holdingRow ? (
                          <>
                            <small className="pd-group-label">{personName} gehört zu Konzern:</small>
                            <LinkList rows={[holdingRow]} limit={1} />
                          </>
                        ) : null}
                        {memberRows.length ? (
                          <>
                            <small className="pd-group-label">
                              Mitglieder von Konzern {holdingId ? partyName(holdingId) : holdingName}
                            </small>
                            <LinkList rows={memberRows} limit={memberLimit} />
                          </>
                        ) : null}
                      </>
                    ) : (
                      <p className="pd-quiet">Noch keine Konzernverknüpfung angelegt.</p>
                    )}
                  </div>
                </div>
              )}
              {tab === "links" && hiddenLinks > 0 ? (
                <button type="button" className="hn-link pd-more" onClick={() => openStammdaten("verknuepfung")}>
                  +{hiddenLinks} weitere Verknüpfungen
                </button>
              ) : null}
            </div>
          </>
        )}
      </section>

      <div className="pd-column">
        <section className="pd-card">
          <h2>Überblick</h2>
          <div className="pd-overview">
            <div className="pd-stat">
              <Icon src={a.docList} size={26} />
              <strong>0</strong>
              <span>Verträge</span>
              <small>seit 01.01.2026</small>
            </div>
            <div className="pd-stat">
              <Icon src={a.iconBrokerContract} size={26} />
              <strong>0</strong>
              <span>Prämie</span>
              <small>seit 01.01.2026</small>
            </div>
          </div>
          <div className="pd-abo">
            <span className="pd-contact-icon">
              <Icon src={a.notes} size={20} />
            </span>
            <span>
              <strong>Kein Abonnement vorhanden</strong>
              <button type="button" className="hn-link">
                hinzufügen
              </button>
            </span>
          </div>
        </section>

        <section className="pd-card">
          <header className="pd-card-head">
            <h2>Team Winter</h2>
            <Icon src={a.contextMenu} size={20} />
          </header>
          <ul className="pd-team">
            {(company ? TEAM.slice(0, 1) : TEAM).map((member) => (
              <li key={member.name}>
                <span className="pd-team-photo">
                  <img src={member.photo} alt="" width={40} height={40} />
                </span>
                <span className="pd-team-copy">
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </span>
                <span className="pd-team-actions">
                  <button type="button" aria-label={`Mail an ${member.name}`}>
                    <Icon src={a.mail} size={18} />
                  </button>
                  <button type="button" aria-label={`Chat mit ${member.name}`}>
                    <Icon src={a.comment} size={18} />
                  </button>
                  <button type="button" aria-label={`${member.name} anrufen`}>
                    <Icon src={a.phone} size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="pd-column">
        <section className="pd-card pd-wip dark">
          <ConstructionArt />
          <span>Bereich in Bearbeitung</span>
        </section>
        <section className="pd-card pd-wip">
          <ConstructionArt />
          <span>Bereich in Bearbeitung</span>
        </section>
      </div>
    </div>
  );
}
