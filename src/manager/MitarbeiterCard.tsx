import { useState } from "react";
import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { ABTEILUNGEN, WEB, member, slugOf, type TeamMember } from "./hrmTeam";

/**
 * The profile card of the Mitarbeiter tab: the partner dashboard card (Figma 20638:17154) for an employee.
 * Name, Mitarbeiter chip, photo, role and Abteilung, three tiles, then Kontaktinfos / Abteilung. The kebab flips
 * it to the Systemdaten, like on the partner dashboard.
 */
const ascii = (text: string) =>
  text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z]+/g, "");
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Firmen contact: as on makler-winter.at, else made up the same way (vorname.nachname@makler-winter.at, Durchwahl). */
export function contactOf(person: TeamMember) {
  const web = WEB[person.name];
  const mail = web?.mail || `${person.name.split(" ").map(ascii).filter(Boolean).join(".")}@makler-winter.at`;
  const phone = web?.phone || `+43 3687 23753 ${String(100 + (hash(person.name) % 400))}`;
  return { phone, mail };
}

export function MitarbeiterCard({ person, onPage }: { person: TeamMember; onPage: (page: "Profil" | "Dokumente") => void }) {
  const { openMitarbeiter } = useWorkflow();
  const [tab, setTab] = useState<"kontakt" | "abteilung">("kontakt");
  const [flipped, setFlipped] = useState(false);
  const { phone, mail } = contactOf(person);
  const dept = ABTEILUNGEN.find((d) => d.name === person.abteilung);
  const colleagues = (dept?.people ?? []).filter((name) => name !== person.name).map(member).filter((m): m is TeamMember => !!m);
  const anstellung = person.anstellung;
  // Same default as the Anstellung section in Profil, until it is edited there.
  const eintritt = anstellung?.eintrittJahr
    ? `${anstellung.eintrittTag}.${anstellung.eintrittMonat}.${anstellung.eintrittJahr}`
    : `01.${String((hash(person.name) % 12) + 1).padStart(2, "0")}.${2008 + (hash(person.name) % 18)}`;

  const system: [string, string][] = [
    ["Personalnummer", `MW-${String(1000 + (hash(person.name) % 9000))}`],
    ["Mandant", "Makler Winter"],
    ["Abteilung", person.abteilung || "–"],
    ["Position", anstellung?.position || person.role],
    ["Eintritt", eintritt],
    ["Urlaubsanspruch", `${person.urlaubAnspruch} Tage`],
  ];

  return (
    <section className={flipped ? "pd-card pd-profile ma-card flipped" : "pd-card pd-profile ma-card"}>
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
          <div className="pd-system-group">
            <small>Mitarbeiter</small>
            <dl>
              {system.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : (
        <>
          <div className="pd-identity">
            <h1 title={person.name}>{person.name}</h1>
            <span className={person.typ && person.typ !== "Mitarbeiter" ? "pd-chip type-einfach" : "pd-chip type-kunde"}>{person.typ ?? "Mitarbeiter"}</span>
            <span className="pd-avatar">
              <img src={a.avatarBg} alt="" />
              {person.photo ? <img className="ma-card-photo" src={person.photo} alt="" /> : <img className="glyph" src={a.clientBlank} alt="" />}
              {/* Online status: drawn here, not part of the photo. */}
              {!person.typ || person.typ === "Mitarbeiter" ? (
                <span className="ma-online" aria-label="Online">
                  <img src={a.statusDot} alt="" />
                </span>
              ) : null}
            </span>
            <p className="pd-meta">
              {person.role}
              {person.abteilung ? (
                <>
                  <br />
                  {person.abteilung}
                </>
              ) : null}
              <br />
              Makler Winter
            </p>
            <div className="pd-tiles">
              <button type="button" className="pd-tile">
                <Icon src={a.notes} size={22} />0 Notizen
              </button>
              <button type="button" className="pd-tile" onClick={() => onPage("Dokumente")}>
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
              <button type="button" role="tab" aria-selected={tab === "abteilung"} className={tab === "abteilung" ? "active" : ""} onClick={() => setTab("abteilung")}>
                Abteilung
              </button>
            </div>

            {tab === "kontakt" ? (
              <div className="pd-folder">
                <span className="pd-folder-tab">
                  <small>Kontaktdaten von</small>
                  {person.name}
                </span>
                <div className="pd-folder-body">
                  <div className="pd-contact-row">
                    <span className="pd-contact-icon">
                      <Icon src={a.phone} size={18} />
                    </span>
                    Telefon
                    <strong>{phone}</strong>
                    <Icon src={a.comment} size={18} />
                  </div>
                  <div className="pd-contact-row">
                    <span className="pd-contact-icon">
                      <Icon src={a.mail} size={18} />
                    </span>
                    Mail
                    <strong>{mail}</strong>
                    <Icon src={a.comment} size={18} />
                  </div>
                  {anstellung?.standort || person.abteilung ? (
                    <div className="pd-note">
                      <small>Arbeitsort</small>
                      <p>Büro {anstellung?.standort ?? "Schladming"}</p>
                    </div>
                  ) : null}
                  <button type="button" className="hn-link pd-more" onClick={() => onPage("Profil")}>
                    Weitere Daten im Profil
                  </button>
                </div>
              </div>
            ) : (
              <div className="pd-folder">
                <span className="pd-folder-tab">
                  <small>Abteilung</small>
                  {person.abteilung || "–"}
                </span>
                <div className="pd-folder-body">
                  {colleagues.length ? (
                    <ul className="pd-links">
                      {colleagues.slice(0, 4).map((m) => (
                        <li key={m.name}>
                          <span className="pd-link-avatar">
                            <img src={m.photo || a.clientBlank} alt="" width={28} height={28} className={m.photo ? "ma-card-face" : undefined} />
                          </span>
                          <span className="pd-link-copy">
                            <span>
                              <strong>{m.name}</strong> ({m.role})
                            </span>
                          </span>
                          <button type="button" className="ma-card-open" aria-label={`${m.name} öffnen`} onClick={() => openMitarbeiter(slugOf(m.name))}>
                            <img className="pd-open" src={a.openTab} alt="" width={16} height={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pd-quiet">Noch keine Kolleg:innen in dieser Abteilung.</p>
                  )}
                </div>
                {colleagues.length > 4 ? <p className="pd-more ma-card-more">+{colleagues.length - 4} weitere Kolleg:innen</p> : null}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
