import { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { Summary } from "../Summary";
import { commsOptions, type CommsGroup, type CommsType } from "../person/stammdaten";
import { EditLink, EntityIcon, Icon } from "../ui";
import { useWorkflow, type CommsPick } from "../workflow";
import { useFilePerson } from "../chrome";

export const FIELDS: { id: CommsType; label: string; icon: string; empty: string; area: "kontakte" | "adressen" }[] = [
  { id: "phone", label: "Telefonnummer Mobil", icon: a.commsPhone, empty: "Keine Telefonnummer in den Stammdaten.", area: "kontakte" },
  { id: "mail", label: "E-Mail Adresse", icon: a.commsMail, empty: "Keine E-Mail Adresse in den Stammdaten.", area: "kontakte" },
  { id: "post", label: "Postadresse", icon: a.commsHouse, empty: "Keine Adresse in den Stammdaten.", area: "adressen" },
];

/**
 * One field: starts on "Auswahl"; the list shows everything of this type in the Stammdaten, grouped by the
 * contact (or address) it belongs to – Julia's own Kontaktdaten, her husband, … – each with all its numbers / mails.
 */
export function CommsSelect({
  field,
  groups,
  value,
  onPick,
  onEdit,
  help,
}: {
  field: (typeof FIELDS)[number];
  /** Short line under the label (Rechnungsversand: where the value comes from). */
  help?: string;
  groups: CommsGroup[];
  value?: CommsPick;
  onPick: (pick: CommsPick | undefined) => void;
  onEdit: () => void;
}) {
  const [open, setOpenState] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  /** Where the list fits: below the field, or above it when the panel ends too close (with its max height). */
  const [place, setPlace] = useState<{ up: boolean; max: number; offset: number }>({ up: false, max: 380, offset: 0 });
  const setOpen = (next: boolean) => {
    if (next && ref.current) {
      const block = ref.current.getBoundingClientRect();
      const field = (ref.current.querySelector(".comms-select") as HTMLElement | null)?.getBoundingClientRect() ?? block;
      // The nearest scrolling/clipping container decides the room, else the window.
      let clip: HTMLElement | null = ref.current.parentElement;
      while (clip && !/(auto|scroll|hidden)/.test(getComputedStyle(clip).overflowY)) clip = clip.parentElement;
      const box = clip ? clip.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const top = Math.max(box.top, 0);
      const bottom = Math.min(box.bottom, window.innerHeight);
      const below = bottom - field.bottom - 12;
      const above = field.top - top - 12;
      const up = below < 260 && above > below;
      // Opening up: the list's bottom sits 4px above the field (measured from the block's bottom edge).
      setPlace({ up, max: Math.max(160, Math.min(380, up ? above : below)), offset: block.bottom - field.top + 4 });
    }
    setOpenState(next);
  };
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => ref.current && !ref.current.contains(event.target as Node) && setOpen(false);
    const key = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const count = groups.reduce((sum, group) => sum + group.options.length, 0);

  return (
    <div className="block comms-field" ref={ref}>
      <div className="label-row">
        <span className="field-label">{field.label}</span>
        <EditLink onClick={onEdit} />
      </div>
      {help ? <p className="field-help">{help}</p> : null}
      <button
        type="button"
        className={`entity-card comms-select${open ? " open" : ""}${value ? "" : " empty"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <EntityIcon src={field.icon} />
        <span className="copy">
          {value ? (
            <>
              <span>{value.value}</span>
              {value.second ? <span>{value.second}</span> : null}
              {/* Figma: whose contact it is, small under the value. */}
              {value.owner ? <small className="comms-owner">{value.owner}</small> : null}
            </>
          ) : (
            "Auswahl"
          )}
        </span>
        <Icon src={a.selectCaret} size={16} className={open ? "kal-open" : undefined} />
      </button>

      {open ? (
        <div className={place.up ? "comms-menu up" : "comms-menu"} role="listbox" aria-label={field.label} style={place.up ? { maxHeight: place.max, bottom: place.offset } : { maxHeight: place.max }}>
          <p className="comms-menu-head">
            {count} {count === 1 ? "Eintrag" : "Einträge"} aus den Stammdaten
          </p>
          {/* "Auswahl" clears the pick again (the step is then open). */}
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={value ? "comms-option comms-none" : "comms-option comms-none selected"}
            onClick={() => {
              onPick(undefined);
              setOpen(false);
            }}
          >
            <span className="comms-option-copy">Auswahl</span>
            {!value ? <Icon src={a.tick} size={12} className="comms-tick" /> : null}
          </button>
          {groups.length === 0 ? <p className="comms-menu-empty">{field.empty}</p> : null}
          {groups.map((group) => (
            <section key={group.id} className="comms-group">
              <header className="comms-group-head">
                <span className="stack-icon" style={{ width: 28, height: 28 }}>
                  <img src={a.avatarBg} alt="" width={28} height={28} />
                  <img src={field.id === "post" ? a.house : a.personSmall} alt="" width={16} height={16} style={{ inset: 6 }} />
                </span>
                <span>
                  <strong>{group.person?.name ?? group.title}</strong>
                  <small>
                    {group.person ? group.title : null}
                    {group.person?.tag ? ` · ${group.person.tag}` : ""}
                  </small>
                </span>
              </header>
              {group.note ? <p className="comms-group-note">{group.note}</p> : null}
              <ul>
                {group.options.map((option) => {
                  const selected = value?.value === option.value && value.cardId === group.id;
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={selected ? "comms-option selected" : "comms-option"}
                        onClick={() => {
                          onPick({
                            value: option.value,
                            second: option.second,
                            cardId: group.id,
                            cardTitle: group.title,
                            tags: option.tags,
                            owner: group.person?.name,
                          });
                          setOpen(false);
                        }}
                      >
                        <Icon src={field.icon} size={16} />
                        <span className="comms-option-copy">
                          {option.value}
                          {option.second ? <small>{option.second}</small> : null}
                        </span>
                        {option.tags.map((tag) => (
                          <em key={tag} className="comms-tag">
                            {tag}
                          </em>
                        ))}
                        {selected ? <Icon src={a.tick} size={12} className="comms-tick" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <button type="button" className="comms-menu-foot" onClick={onEdit}>
            <Icon src={a.plusCircle} size={16} />
            In den Stammdaten ergänzen
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Vertretungsbefugte Person: one of the company's person contacts (Figma 21095:72728). */
function RepSelect({
  groups,
  value,
  onPick,
}: {
  groups: CommsGroup[];
  value?: CommsPick;
  onPick: (pick: CommsPick | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => ref.current && !ref.current.contains(event.target as Node) && setOpen(false);
    const key = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="block comms-field" ref={ref}>
      <span className="field-label">Vertretungsbefugte Person</span>
      <button
        type="button"
        className={`entity-card comms-select${open ? " open" : ""}${value ? "" : " empty"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <EntityIcon src={a.personSmall} />
        <span className="copy">{value ? <span>{value.value}</span> : "Auswahl"}</span>
        <Icon src={a.selectCaret} size={16} className={open ? "kal-open" : undefined} />
      </button>
      {open ? (
        <div className="comms-menu" role="listbox" aria-label="Vertretungsbefugte Person">
          <p className="comms-menu-head">
            {groups.length} {groups.length === 1 ? "Person" : "Personen"} aus den Stammdaten
          </p>
          {groups.length === 0 ? <p className="comms-menu-empty">Keine Kontaktperson in den Stammdaten.</p> : null}
          <ul>
            {groups.map((group) => {
              const name = group.person?.name ?? group.title;
              const selected = value?.value === name;
              return (
                <li key={group.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={selected ? "comms-option selected" : "comms-option"}
                    onClick={() => {
                      onPick({
                        value: name,
                        second: group.person?.sub,
                        cardId: group.id,
                        cardTitle: group.title,
                        tags: group.person?.tag ? [group.person.tag] : [],
                      });
                      setOpen(false);
                    }}
                  >
                    <Icon src={a.personSmall} size={16} />
                    <span className="comms-option-copy">
                      {name}
                      <small>{group.title}</small>
                    </span>
                    {selected ? <Icon src={a.tick} size={12} className="comms-tick" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const isChannel = (group: CommsGroup) => !group.person || group.person.tag === "Kanal";

/**
 * Unternehmen (Figma 20978:54563): Zentraler Kontakt der Firma = a Vertretungsbefugte Person with her phone and
 * mail; Versand von Nachrichten, Dokumente und Erklärungen = the Postadresse (Firmensitz) and an Office mail.
 */
function CompanyComms() {
  const { sections, commsChoice, setCommsChoice, openStammdaten } = useWorkflow();
  const rep = commsChoice.rep;
  const phones = commsOptions(sections, "phone");
  const mails = commsOptions(sections, "mail");
  const people = [...phones, ...mails]
    .filter((group) => !isChannel(group))
    .filter((group, index, all) => all.findIndex((other) => other.person?.name === group.person?.name) === index);
  const ofRep = (groups: CommsGroup[]) => groups.filter((group) => !isChannel(group) && (!rep || group.person?.name === rep.value));
  const channels = mails.filter(isChannel);
  const [phoneField, mailField, postField] = FIELDS;
  return (
    <>
      <div className="panel-card">
        <h2>Zentraler Kontakt der Firma</h2>
        <div className="form-col plain">
          <RepSelect
            groups={people}
            value={rep}
            onPick={(pick) => {
              // Another person: her own phone and mail, the previous picks no longer fit.
              const keep = (choice?: CommsPick) => (choice && pick && choice.owner === pick.value ? choice : undefined);
              setCommsChoice({ rep: pick, phone: keep(commsChoice.phone), mail: keep(commsChoice.mail) });
            }}
          />
          <CommsSelect
            field={phoneField}
            groups={ofRep(phones)}
            value={commsChoice.phone}
            onPick={(pick) => setCommsChoice({ phone: pick })}
            onEdit={() => openStammdaten("kontakte", commsChoice.phone?.cardId ?? rep?.cardId)}
          />
          <CommsSelect
            field={mailField}
            groups={ofRep(mails)}
            value={commsChoice.mail}
            onPick={(pick) => setCommsChoice({ mail: pick })}
            onEdit={() => openStammdaten("kontakte", commsChoice.mail?.cardId ?? rep?.cardId)}
          />
        </div>
      </div>
      <div className="panel-card">
        <h2>Versand von Nachrichten, Dokumente und Erklärungen</h2>
        <div className="form-col plain">
          <CommsSelect
            field={postField}
            groups={commsOptions(sections, "post")}
            value={commsChoice.post}
            // Under the address: the address card (e.g. Firmensitz), not a person.
            onPick={(pick) => setCommsChoice({ post: pick && { ...pick, owner: pick.cardTitle } })}
            onEdit={() => openStammdaten("adressen", commsChoice.post?.cardId)}
          />
          <CommsSelect
            field={mailField}
            groups={channels.length ? channels : mails}
            value={commsChoice.versandMail}
            // Under the mail: the channel it belongs to (e.g. Office Lunixo AG).
            onPick={(pick) => setCommsChoice({ versandMail: pick && { ...pick, owner: pick.owner ?? pick.cardTitle } })}
            onEdit={() => openStammdaten("kontakte", commsChoice.versandMail?.cardId)}
          />
        </div>
      </div>
    </>
  );
}

export function CommsStep() {
  const { sections, commsChoice, setCommsChoice, openStammdaten } = useWorkflow();
  const { isCompany } = useFilePerson();
  if (isCompany) {
    return (
      <>
        <section>
          <div className="page-title">
            <h1>Kommunikationsdaten Kunde</h1>
            <p>Bitte wähle die Kontaktdaten aus die der Kunde für die Maklervereinbarung wünscht.</p>
          </div>
          <CompanyComms />
        </section>
        <Summary cards={["contact", "versand"]} />
      </>
    );
  }
  return (
    <>
      <section>
        <div className="page-title">
          <h1>Kommunikationsdaten Kunde</h1>
          <p>Bitte wähle die Kontaktdaten aus die der Kunde für die Maklervereinbarung wünscht.</p>
        </div>

        <div className="panel-card">
          <h2>Zentrale Kontaktdaten</h2>
          <div className="form-col plain">
            {FIELDS.map((field) => (
              <CommsSelect
                key={field.id}
                field={field}
                groups={commsOptions(sections, field.id)}
                value={commsChoice[field.id]}
                onPick={(pick) => setCommsChoice({ [field.id]: pick })}
                // Stammdaten workflow on Kontakte / Adressen, on the card of the picked value when there is one.
                onEdit={() => openStammdaten(field.area, commsChoice[field.id]?.cardId)}
              />
            ))}
          </div>
        </div>
      </section>

      <Summary cards={["contact"]} />
    </>
  );
}
