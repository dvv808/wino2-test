import { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { Summary } from "../Summary";
import { commsOptions, type CommsGroup, type CommsType } from "../person/stammdaten";
import { EditLink, EntityIcon, Icon } from "../ui";
import { useWorkflow, type CommsPick } from "../workflow";

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
        <div className="comms-menu" role="listbox" aria-label={field.label}>
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

export function CommsStep() {
  const { sections, commsChoice, setCommsChoice, openStammdaten } = useWorkflow();
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
