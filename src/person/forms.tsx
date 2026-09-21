import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { DateField, EntityIcon, Icon, InfoBox, Notice } from "../ui";
import type {
  AddressForm,
  BankForm,
  ContactChannel,
  ContactForm,
  FileEntry,
  GewerbeEntry,
  PartnerForm,
  VereinEntry,
  WirtschaftForm,
} from "./stammdaten";
import { CONTACT_PARTNERS, EMPTY_GEWERBE, EMPTY_VEREIN } from "./stammdaten";
import { isMarriageCertificate, namesDiffer } from "./versions";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Text({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="text-field"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder = "Auswählen",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <span className="sw-select">
      <select className="text-field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Icon src={a.selectCaret} size={16} />
    </span>
  );
}

function LandSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className="sw-select sw-land">
      {value === "Österreich" ? <span className="pp-flag at" aria-hidden="true" /> : null}
      <select className="text-field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="Österreich">Österreich</option>
        <option value="Deutschland">Deutschland</option>
        <option value="Schweiz">Schweiz</option>
      </select>
      <Icon src={a.selectCaret} size={16} />
    </span>
  );
}

function SearchPick({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className="sw-search">
      <EntityIcon src={a.companyBlank} />
      <input className="text-field" value={value} onChange={(event) => onChange(event.target.value)} />
      <Icon src={a.searchDark} size={24} />
    </span>
  );
}

/** Person-contacts must resolve to a system partner; missing names can be added from the empty list. */
function PartnerSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const names = useMemo(() => {
    const all = [...CONTACT_PARTNERS, ...created, value].filter(Boolean);
    return all.filter((name, index) => all.indexOf(name) === index);
  }, [created, value]);
  const needle = query.trim().toLowerCase();
  const matches = needle ? names.filter((name) => name.toLowerCase().includes(needle)) : names;

  useEffect(() => {
    if (!open) return;
    function away(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function pick(name: string) {
    onChange(name);
    setQuery("");
    setOpen(false);
  }

  function createPartner() {
    const name = query.trim();
    if (!name) return;
    const existing = names.find((entry) => entry.toLowerCase() === name.toLowerCase());
    if (existing) {
      pick(existing);
      return;
    }
    setCreated((current) => [...current, name]);
    pick(name);
  }

  function commitTyped() {
    const name = query.trim();
    if (!name) return;
    const exact = names.find((entry) => entry.toLowerCase() === name.toLowerCase());
    if (exact) {
      pick(exact);
      return;
    }
    if (matches.length === 1) pick(matches[0]);
  }

  return (
    <div className="dropdown sw-partner" ref={wrapRef}>
      <span className="sw-search">
        <EntityIcon src={a.personSmall} />
        <input
          className="text-field"
          value={open ? query : value}
          placeholder="Partner suchen"
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitTyped();
            }
          }}
        />
        <Icon src={a.searchDark} size={24} />
      </span>
      {open ? (
        matches.length ? (
          <div className="dropdown-menu sw-partner-menu">
            {matches.map((name) => (
              <button
                type="button"
                className={`menu-item${name === value ? " selected" : ""}`}
                key={name}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(name);
                }}
              >
                <span className="menu-item-main">
                  <EntityIcon src={a.personSmall} />
                  <strong>{name}</strong>
                </span>
                <Icon src={name === value ? a.confirmOn : a.confirmOff} size={18} />
              </button>
            ))}
          </div>
        ) : (
          <div className="dropdown-menu empty">
            <div className="empty-menu">
              <Icon src={a.noResults} size={32} />
              <p>
                <strong>Keine Treffer gefunden!</strong>
                Jeder Kontakt muss auch als Partner existieren um ihn als Kontakt hinzuzufügen
              </p>
              <button
                type="button"
                className="empty-link"
                onMouseDown={(event) => {
                  event.preventDefault();
                  createPartner();
                }}
              >
                + Partner anlegen
              </button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

function AddRow({
  label,
  onAdd,
}: {
  label: string;
  onAdd: () => void;
}) {
  return (
    <div className="sw-toolbar">
      <p className="sw-lead">{label}</p>
      <button type="button" className="btn-secondary sw-add" onClick={onAdd}>
        <Icon src={a.plusCircle} size={18} />
        Hinzufügen
      </button>
    </div>
  );
}

function takeOut<T>(
  items: T[],
  index: number,
  onChange: (items: T[]) => void,
  message: string,
  onRemoved?: (message: string, undo: () => void) => void,
) {
  onChange(items.filter((_, at) => at !== index));
  onRemoved?.(message, () => onChange(items));
}

function EntryPanel({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="sw-entry">
      <button type="button" className="sw-entry-close" aria-label="Eintrag entfernen" onClick={onRemove}>
        <img src={a.iconCloseDark} alt="" width={18} height={18} />
      </button>
      {children}
    </div>
  );
}

function filesFromList(list: FileList | null): FileEntry[] {
  return Array.from(list ?? []).map((file) => ({
    label: file.name.replace(/\.[^.]+$/, ""),
    name: file.name,
    type:
      file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg")
        ? ("jpg" as const)
        : ("pdf" as const),
  }));
}

function Area({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea className="textarea" value={value} onChange={(event) => onChange(event.target.value)} />
  );
}

function Drop({ files, onFiles }: { files: FileEntry[]; onFiles: (files: FileEntry[]) => void }) {
  return (
    <div className="sw-files">
      <label className="dropzone">
        <input
          type="file"
          multiple
          onChange={(event) => {
            const next = filesFromList(event.target.files);
            if (next.length) onFiles([...files, ...next]);
            event.target.value = "";
          }}
        />
        <span>Dateien hier hinziehen</span>
        <span>oder</span>
        <span className="dropzone-btn">Datei auswählen</span>
      </label>
      {files.map((file, index) => (
        <div className="file-chip" key={`${file.name}-${index}`}>
          <img src={file.type === "jpg" ? a.jpg : a.pdf} alt="" width={17} height={20} />
          <span className="file-copy">
            <strong>{file.label}</strong>
            <small>{file.type === "jpg" ? "JPG" : "PDF"}</small>
          </span>
          <input
            className="text-field"
            value={file.label}
            aria-label="Bezeichnung"
            onChange={(event) =>
              onFiles(files.map((entry, at) => (at === index ? { ...entry, label: event.target.value } : entry)))
            }
          />
          <button
            type="button"
            className="file-remove"
            aria-label="Datei entfernen"
            onClick={() => onFiles(files.filter((_, at) => at !== index))}
          >
            <Icon src={a.trash} size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function PartnerFields({
  form,
  onChange,
  publishedNachname,
}: {
  form: PartnerForm;
  onChange: (form: PartnerForm) => void;
  publishedNachname?: string;
}) {
  const set = <K extends keyof PartnerForm>(key: K, value: PartnerForm[K]) =>
    onChange({ ...form, [key]: value });
  const surnameChanged = Boolean(publishedNachname && namesDiffer(form.nachname, publishedNachname));
  const hasProof = form.files.some(isMarriageCertificate);

  return (
    <>
      {surnameChanged ? (
        <Notice tone="error" title="Namensänderung legt eine neue Version an">
          Eine Korrektur der Schreibweise im Vornamen bleibt in der aktuellen Version. Ein neuer Nachname
          braucht eine Heiratsurkunde als Anhang.
          {hasProof ? " Heiratsurkunde ist vorhanden." : " Noch keine Heiratsurkunde angehängt."}
        </Notice>
      ) : null}
      <Field label="Titel vor">
        <Select value={form.titelVor} onChange={(value) => set("titelVor", value)} options={["Mag.", "Dr.", "Ing."]} />
      </Field>
      <Field label="Vorname">
        <Text value={form.vorname} onChange={(value) => set("vorname", value)} />
      </Field>
      <Field label="Nachname">
        <Text value={form.nachname} onChange={(value) => set("nachname", value)} />
      </Field>
      <Field label="Titel nach">
        <Select value={form.titelNach} onChange={(value) => set("titelNach", value)} options={["BA", "MA", "MSc"]} />
      </Field>
      <Field label="Rufname">
        <Text value={form.rufname} onChange={(value) => set("rufname", value)} />
      </Field>
      <Field label="Geschlecht">
        <Select
          value={form.geschlecht}
          onChange={(value) => set("geschlecht", value)}
          options={["Weiblich", "Männlich", "Divers"]}
        />
      </Field>
      <Field label="Geburtsdatum">
        <DateField
          prefix="Am"
          day={form.geburtTag}
          month={form.geburtMonat}
          year={form.geburtJahr}
          onDay={(value) => set("geburtTag", value)}
          onMonth={(value) => set("geburtMonat", value)}
          onYear={(value) => set("geburtJahr", value)}
        />
      </Field>
      <Field label="Nationalität">
        <Select
          value={form.nationalitaet}
          onChange={(value) => set("nationalitaet", value)}
          options={["Österreich", "Deutschland", "Schweiz"]}
        />
      </Field>
      <Field label="Allgemeine Notiz zum Partner">
        <Area value={form.notiz} onChange={(value) => set("notiz", value)} />
      </Field>
      <InfoBox>
        Vertretung erstellen Wird die Person vertreten? Erstelle Bevollmächtigte Person oder
        Erwachsenenvertreter mit eigenen Kontaktdaten.
      </InfoBox>
      <div className="sw-group">
        <h3>Anhänge</h3>
        <Drop files={form.files} onFiles={(files) => set("files", files)} />
      </div>
    </>
  );
}

export function WirtschaftFields({
  form,
  onChange,
}: {
  form: WirtschaftForm;
  onChange: (form: WirtschaftForm) => void;
}) {
  const set = <K extends keyof WirtschaftForm>(key: K, value: WirtschaftForm[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <>
      <p className="sw-lead">Partner ist Eigentümer bei...</p>
      <Field label="Unternehmen">
        <Text value={form.eigentuemerUnternehmen} onChange={(value) => set("eigentuemerUnternehmen", value)} />
      </Field>
      <Field label="Eigentümerart">
        <Select
          value={form.eigentuemerArt}
          onChange={(value) => set("eigentuemerArt", value)}
          options={["Gesellschafter", "Aktionär", "Kommanditist"]}
        />
      </Field>
      <Field label="Anteile">
        <Text value={form.anteile} onChange={(value) => set("anteile", value)} />
      </Field>
      <Field label="Eingetragen am">
        <DateField
          prefix="Am"
          day={form.eingetragenTag}
          month={form.eingetragenMonat}
          year={form.eingetragenJahr}
          onDay={(value) => set("eingetragenTag", value)}
          onMonth={(value) => set("eingetragenMonat", value)}
          onYear={(value) => set("eingetragenJahr", value)}
        />
      </Field>

      <p className="sw-lead">Partner ist gesetzlicher Vertreter bei...</p>
      <Field label="Unternehmen">
        <Text value={form.vertreterUnternehmen} onChange={(value) => set("vertreterUnternehmen", value)} />
      </Field>
      <Field label="Funktion">
        <Select
          value={form.funktion}
          onChange={(value) => set("funktion", value)}
          options={["Geschäftsführer", "Vorstand", "Prokurist"]}
        />
      </Field>
      <Field label="Funktionsbeschreibung">
        <Area value={form.funktionsbeschreibung} onChange={(value) => set("funktionsbeschreibung", value)} />
      </Field>
      <Field label="Art der Vertretungsbefugnis">
        <Select
          value={form.vertretungsArt}
          onChange={(value) => set("vertretungsArt", value)}
          options={["gemeinsam", "einzeln", "gesamt"]}
        />
      </Field>
      <Field label="Vertretungsbefugnis">
        <Area value={form.vertretungsbefugnis} onChange={(value) => set("vertretungsbefugnis", value)} />
      </Field>
    </>
  );
}

export function GewerbeFields({
  entries,
  onChange,
  onRemoved,
}: {
  entries: GewerbeEntry[];
  onChange: (entries: GewerbeEntry[]) => void;
  onRemoved?: (message: string, undo: () => void) => void;
}) {
  const patch = (index: number, next: GewerbeEntry) =>
    onChange(entries.map((entry, at) => (at === index ? next : entry)));

  return (
    <>
      <p className="sw-hint">Alle Daten stammen vom WICO</p>
      <AddRow
        label="Partner ist Gewerbeinhaber..."
        onAdd={() => onChange([...entries, { ...EMPTY_GEWERBE }])}
      />
      {entries.map((entry, index) => (
        <EntryPanel
          key={`gewerbe-${index}`}
          onRemove={() => takeOut(entries, index, onChange, "Eintrag wurde entfernt.", onRemoved)}
        >
          <Field label="Unternehmen">
            <SearchPick value={entry.unternehmen} onChange={(unternehmen) => patch(index, { ...entry, unternehmen })} />
          </Field>
          <Field label="Funktion">
            <Select
              value={entry.funktion}
              onChange={(funktion) => patch(index, { ...entry, funktion })}
              options={["Gewerberechtlicher Geschäftsführer", "Gewerbeinhaber", "Filialgeschäftsführer"]}
            />
          </Field>
          <Field label="Strasse">
            <Text value={entry.strasse} onChange={(strasse) => patch(index, { ...entry, strasse })} />
          </Field>
          <Field label="Nummer">
            <Text value={entry.nummer} onChange={(nummer) => patch(index, { ...entry, nummer })} />
          </Field>
          <Field label="Adresszusatz">
            <Text value={entry.zusatz} onChange={(zusatz) => patch(index, { ...entry, zusatz })} />
          </Field>
          <Field label="PLZ">
            <Text value={entry.plz} onChange={(plz) => patch(index, { ...entry, plz })} />
          </Field>
          <Field label="Ort">
            <Text value={entry.ort} onChange={(ort) => patch(index, { ...entry, ort })} />
          </Field>
          <Field label="Land">
            <LandSelect value={entry.land} onChange={(land) => patch(index, { ...entry, land })} />
          </Field>
          <Field label="Berechtigungswortlaut">
            <Area value={entry.wortlaut} onChange={(wortlaut) => patch(index, { ...entry, wortlaut })} />
          </Field>
          <Field label="GISA-Zahl">
            <Text value={entry.gisa} onChange={(gisa) => patch(index, { ...entry, gisa })} />
          </Field>
          <Field label="Eingetragen am">
            <DateField
              prefix="Am"
              day={entry.tag}
              month={entry.monat}
              year={entry.jahr}
              onDay={(tag) => patch(index, { ...entry, tag })}
              onMonth={(monat) => patch(index, { ...entry, monat })}
              onYear={(jahr) => patch(index, { ...entry, jahr })}
            />
          </Field>
        </EntryPanel>
      ))}
    </>
  );
}

export function VereinFields({
  entries,
  onChange,
  onRemoved,
}: {
  entries: VereinEntry[];
  onChange: (entries: VereinEntry[]) => void;
  onRemoved?: (message: string, undo: () => void) => void;
}) {
  const patch = (index: number, next: VereinEntry) =>
    onChange(entries.map((entry, at) => (at === index ? next : entry)));

  return (
    <>
      <AddRow
        label="Partner hat Vereinsfunktion bei..."
        onAdd={() => onChange([...entries, { ...EMPTY_VEREIN }])}
      />
      {entries.map((entry, index) => (
        <EntryPanel
          key={`verein-${index}`}
          onRemove={() => takeOut(entries, index, onChange, "Eintrag wurde entfernt.", onRemoved)}
        >
          <Field label="Verein">
            <SearchPick value={entry.verein} onChange={(verein) => patch(index, { ...entry, verein })} />
          </Field>
          <Field label="Funktion">
            <Text value={entry.funktion} onChange={(funktion) => patch(index, { ...entry, funktion })} />
          </Field>
          <Field label="Eingetragen am">
            <DateField
              prefix="Am"
              day={entry.tag}
              month={entry.monat}
              year={entry.jahr}
              onDay={(tag) => patch(index, { ...entry, tag })}
              onMonth={(monat) => patch(index, { ...entry, monat })}
              onYear={(jahr) => patch(index, { ...entry, jahr })}
            />
          </Field>
        </EntryPanel>
      ))}
    </>
  );
}

export function AnhaengeFields({
  files,
  onChange,
  onRemoved,
}: {
  files: FileEntry[];
  onChange: (files: FileEntry[]) => void;
  onRemoved?: (message: string, undo: () => void) => void;
}) {
  return (
    <>
      <Field label="Dokumente">
        <label className="dropzone sw-drop">
          <input
            type="file"
            multiple
            onChange={(event) => {
              const next = filesFromList(event.target.files);
              if (next.length) onChange([...files, ...next]);
              event.target.value = "";
            }}
          />
          <img src={a.upload} alt="" width={36} height={34} />
          <span>Dateien hier hinziehen</span>
          <span>oder</span>
          <span className="dropzone-btn">Datei auswählen</span>
        </label>
      </Field>
      {files.map((file, index) => (
        <EntryPanel
          key={`${file.name}-${index}`}
          onRemove={() => takeOut(files, index, onChange, "Datei wurde entfernt.", onRemoved)}
        >
          <Field label="Bezeichnung">
            <Text
              value={file.label}
              onChange={(label) =>
                onChange(files.map((entry, at) => (at === index ? { ...entry, label } : entry)))
              }
            />
          </Field>
          <div className="file-chip sw-file">
            <span className="sw-file-icon">
              <img src={file.type === "jpg" ? a.jpg : a.pdf} alt="" width={17} height={20} />
            </span>
            <span className="file-copy">
              <strong>{file.name.replace(/\.[^.]+$/, "")}</strong>
              <small>{file.type === "jpg" ? "JPG" : "PDF"}</small>
            </span>
            <button type="button" className="file-remove" aria-label="Datei bearbeiten">
              <Icon src={a.menuEdit} size={18} />
            </button>
            <button
              type="button"
              className="file-remove"
              aria-label="Datei entfernen"
              onClick={() => takeOut(files, index, onChange, "Datei wurde entfernt.", onRemoved)}
            >
              <Icon src={a.trash} size={18} />
            </button>
          </div>
        </EntryPanel>
      ))}
    </>
  );
}

function ChannelSection({
  label,
  removedLabel,
  items,
  onChange,
  onRemoved,
  blank,
  children,
}: {
  label: string;
  removedLabel: string;
  items: ContactChannel[];
  onChange: (items: ContactChannel[]) => void;
  onRemoved?: (message: string, undo: () => void) => void;
  blank: ContactChannel;
  children: (item: ContactChannel, patch: (next: ContactChannel) => void) => ReactNode;
}) {
  return (
    <>
      <AddRow label={label} onAdd={() => onChange([...items, { ...blank }])} />
      {items.map((item, index) => (
        <EntryPanel
          key={`${label}-${index}`}
          onRemove={() => takeOut(items, index, onChange, `${removedLabel} wurde entfernt.`, onRemoved)}
        >
          {children(item, (next) => onChange(items.map((entry, at) => (at === index ? next : entry))))}
        </EntryPanel>
      ))}
    </>
  );
}

export function ContactFields({
  form,
  onChange,
  onRemoved,
}: {
  form: ContactForm;
  onChange: (form: ContactForm) => void;
  onRemoved?: (message: string, undo: () => void) => void;
}) {
  const set = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <>
      <Field label="Kanal oder Person">
        <Select
          value={form.kind === "kanal" ? "Kanal" : "Person"}
          onChange={(value) =>
            onChange({
              ...form,
              kind: value === "Kanal" ? "kanal" : "person",
              partner: value === "Kanal" ? "" : form.partner,
            })
          }
          options={["Person", "Kanal"]}
        />
      </Field>
      {form.kind === "kanal" ? (
        <Field label="Kanalbezeichnung">
          <Text value={form.bezeichnung} onChange={(value) => set("bezeichnung", value)} />
        </Field>
      ) : (
        <>
          <div className="block">
            <span className="field-label">Partner</span>
            <PartnerSearch value={form.partner} onChange={(partner) => set("partner", partner)} />
          </div>
          <Field label="Kontaktbezeichnung oder Funktion">
            <Text value={form.bezeichnung} onChange={(value) => set("bezeichnung", value)} />
          </Field>
        </>
      )}
      <Field label="Allgemeine Notiz zur Kontaktperson">
        <Area value={form.notiz} onChange={(value) => set("notiz", value)} />
      </Field>

      <ChannelSection
        label="Telefonnummer"
        removedLabel="Telefonnummer"
        items={form.phones}
        onChange={(phones) => set("phones", phones)}
        onRemoved={onRemoved}
        blank={{ value: "", note: "", extra: "Mobil" }}
      >
        {(phone, patch) => (
          <>
            <Field label="Telefonnummer">
              <Text value={phone.value} onChange={(value) => patch({ ...phone, value })} />
            </Field>
            <Field label="Mobil oder Festnetz">
              <Select
                value={phone.extra ?? "Mobil"}
                onChange={(extra) => patch({ ...phone, extra })}
                options={["Mobil", "Festnetz"]}
              />
            </Field>
            <Field label="Notiz zur Telefonnummer">
              <Area value={phone.note} onChange={(note) => patch({ ...phone, note })} />
            </Field>
          </>
        )}
      </ChannelSection>

      <ChannelSection
        label="E-Mail"
        removedLabel="E-Mail"
        items={form.mails}
        onChange={(mails) => set("mails", mails)}
        onRemoved={onRemoved}
        blank={{ value: "", note: "" }}
      >
        {(mail, patch) => (
          <>
            <Field label="Mail Adresse">
              <Text value={mail.value} onChange={(value) => patch({ ...mail, value })} />
            </Field>
            <Field label="Notiz zur Mail Adresse">
              <Area value={mail.note} onChange={(note) => patch({ ...mail, note })} />
            </Field>
          </>
        )}
      </ChannelSection>

      <ChannelSection
        label="Website & Social Media"
        removedLabel="Website"
        items={form.websites}
        onChange={(websites) => set("websites", websites)}
        onRemoved={onRemoved}
        blank={{ value: "", extra: "Webseite", note: "" }}
      >
        {(site, patch) => (
          <>
            <Field label="Bezeichnung">
              <Select
                value={site.extra ?? "Webseite"}
                onChange={(extra) => patch({ ...site, extra })}
                options={["Webseite", "LinkedIn", "Instagram"]}
              />
            </Field>
            <Field label="Website oder Social Media link">
              <Text value={site.value} onChange={(value) => patch({ ...site, value })} />
            </Field>
          </>
        )}
      </ChannelSection>
    </>
  );
}

export function AddressFields({
  form,
  onChange,
}: {
  form: AddressForm;
  onChange: (form: AddressForm) => void;
}) {
  const set = <K extends keyof AddressForm>(key: K, value: AddressForm[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <>
      <Field label="Adressart">
        <Select
          value={form.typ}
          onChange={(value) => set("typ", value)}
          options={["Hauptwohnsitz", "Nebenwohnsitz", "Firmenadresse", "Postadresse"]}
        />
      </Field>
      <Field label="Strasse">
        <Text value={form.strasse} onChange={(value) => set("strasse", value)} />
      </Field>
      <Field label="Nummer">
        <Text value={form.nummer} onChange={(value) => set("nummer", value)} />
      </Field>
      <Field label="Adresszusatz">
        <Text value={form.zusatz} onChange={(value) => set("zusatz", value)} />
      </Field>
      <Field label="PLZ">
        <Text value={form.plz} onChange={(value) => set("plz", value)} />
      </Field>
      <Field label="Ort">
        <Text value={form.ort} onChange={(value) => set("ort", value)} />
      </Field>
      <Field label="Land">
        <Select
          value={form.land}
          onChange={(value) => set("land", value)}
          options={["Österreich", "Deutschland", "Schweiz"]}
        />
      </Field>
      <Field label="Notiz zur Adresse">
        <Area value={form.notiz} onChange={(value) => set("notiz", value)} />
      </Field>
    </>
  );
}

export function BankFields({
  form,
  onChange,
}: {
  form: BankForm;
  onChange: (form: BankForm) => void;
}) {
  const set = <K extends keyof BankForm>(key: K, value: BankForm[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <>
      <h3>Konto Details</h3>
      <Field label="Person auswählen">
        <Select
          value={form.person}
          onChange={(value) => set("person", value)}
          options={[form.person, "Julia Atkinson", "Thomas Atkinson"].filter(
            (name, index, all) => name && all.indexOf(name) === index,
          )}
          placeholder="Person auswählen"
        />
      </Field>
      <Field label="IBAN">
        <Text value={form.iban} onChange={(value) => set("iban", value)} />
      </Field>
      <Field label="BIC">
        <Text value={form.bic} onChange={(value) => set("bic", value)} />
      </Field>
      <Field label="Kreditinstitut">
        <Text value={form.institut} onChange={(value) => set("institut", value)} />
      </Field>
      <Field label="Notiz zur Bankverbindung">
        <Area value={form.notiz} onChange={(value) => set("notiz", value)} />
      </Field>
      <div className="sw-group">
        <h3>Dokumente hochladen</h3>
        <Drop files={form.files} onFiles={(files) => set("files", files)} />
      </div>
    </>
  );
}
