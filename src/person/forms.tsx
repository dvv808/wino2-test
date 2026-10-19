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
import {
  COMPANY_PERSONS,
  EMPTY_COMPANY_GEWERBE,
  EMPTY_CONTROL,
  EMPTY_HOLDING,
  EMPTY_LEGAL_REP,
  EMPTY_OWNER,
  wicoDateHint,
  wicoHint,
  wicoStaffHint,
  type CompanyFirmenbuchForm,
  type CompanyGisaForm,
  type CompanyGewerbeEntry,
  type CompanyOrganeForm,
  type StaffYear,
} from "./companyWirtschaft";
import { isMarriageCertificate, namesDiffer } from "./versions";

function WicoNote({ value }: { value?: string }) {
  if (!value) return null;
  return <span className="sw-wico-note">Achtung! Eigener Eintrag - WICO Daten: {value}</span>;
}

export function Field({
  label,
  children,
  wico,
}: {
  label: string;
  children: ReactNode;
  wico?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      <WicoNote value={wico} />
    </label>
  );
}

export function Text({
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
export function PartnerSearch({
  value,
  onChange,
  options = CONTACT_PARTNERS,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Names to pick from; defaults to all system partners. */
  options?: string[];
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const names = useMemo(() => {
    const all = [...options, ...created, value].filter(Boolean);
    return all.filter((name, index) => all.indexOf(name) === index);
  }, [options, created, value]);
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
  wico,
}: {
  form: WirtschaftForm;
  onChange: (form: WirtschaftForm) => void;
  wico?: WirtschaftForm;
}) {
  const set = <K extends keyof WirtschaftForm>(key: K, value: WirtschaftForm[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <>
      <p className="sw-lead">Partner ist Eigentümer bei...</p>
      <Field label="Unternehmen" wico={wicoHint(form.eigentuemerUnternehmen, wico?.eigentuemerUnternehmen)}>
        <Text value={form.eigentuemerUnternehmen} onChange={(value) => set("eigentuemerUnternehmen", value)} />
      </Field>
      <Field label="Eigentümerart" wico={wicoHint(form.eigentuemerArt, wico?.eigentuemerArt)}>
        <Select
          value={form.eigentuemerArt}
          onChange={(value) => set("eigentuemerArt", value)}
          options={["Gesellschafter", "Aktionär", "Kommanditist"]}
        />
      </Field>
      <Field label="Anteile" wico={wicoHint(form.anteile, wico?.anteile)}>
        <Text value={form.anteile} onChange={(value) => set("anteile", value)} />
      </Field>
      <Field
        label="Eingetragen am"
        wico={wicoDateHint(
          form.eingetragenTag,
          form.eingetragenMonat,
          form.eingetragenJahr,
          wico
            ? { tag: wico.eingetragenTag, monat: wico.eingetragenMonat, jahr: wico.eingetragenJahr }
            : undefined,
        )}
      >
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
      <Field label="Unternehmen" wico={wicoHint(form.vertreterUnternehmen, wico?.vertreterUnternehmen)}>
        <Text value={form.vertreterUnternehmen} onChange={(value) => set("vertreterUnternehmen", value)} />
      </Field>
      <Field label="Funktion" wico={wicoHint(form.funktion, wico?.funktion)}>
        <Select
          value={form.funktion}
          onChange={(value) => set("funktion", value)}
          options={["Geschäftsführer", "Vorstand", "Prokurist"]}
        />
      </Field>
      <Field label="Funktionsbeschreibung" wico={wicoHint(form.funktionsbeschreibung, wico?.funktionsbeschreibung)}>
        <Area value={form.funktionsbeschreibung} onChange={(value) => set("funktionsbeschreibung", value)} />
      </Field>
      <Field label="Art der Vertretungsbefugnis" wico={wicoHint(form.vertretungsArt, wico?.vertretungsArt)}>
        <Select
          value={form.vertretungsArt}
          onChange={(value) => set("vertretungsArt", value)}
          options={["gemeinsam", "einzeln", "gesamt"]}
        />
      </Field>
      <Field label="Vertretungsbefugnis" wico={wicoHint(form.vertretungsbefugnis, wico?.vertretungsbefugnis)}>
        <Area value={form.vertretungsbefugnis} onChange={(value) => set("vertretungsbefugnis", value)} />
      </Field>
    </>
  );
}

export function GewerbeFields({
  entries,
  onChange,
  onRemoved,
  wico,
}: {
  entries: GewerbeEntry[];
  onChange: (entries: GewerbeEntry[]) => void;
  onRemoved?: (message: string, undo: () => void) => void;
  wico?: GewerbeEntry[];
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
          <Field label="Unternehmen" wico={wicoHint(entry.unternehmen, wico?.[index]?.unternehmen)}>
            <SearchPick value={entry.unternehmen} onChange={(unternehmen) => patch(index, { ...entry, unternehmen })} />
          </Field>
          <Field label="Funktion" wico={wicoHint(entry.funktion, wico?.[index]?.funktion)}>
            <Select
              value={entry.funktion}
              onChange={(funktion) => patch(index, { ...entry, funktion })}
              options={["Gewerberechtlicher Geschäftsführer", "Gewerbeinhaber", "Filialgeschäftsführer"]}
            />
          </Field>
          <Field label="Strasse" wico={wicoHint(entry.strasse, wico?.[index]?.strasse)}>
            <Text value={entry.strasse} onChange={(strasse) => patch(index, { ...entry, strasse })} />
          </Field>
          <Field label="Nummer" wico={wicoHint(entry.nummer, wico?.[index]?.nummer)}>
            <Text value={entry.nummer} onChange={(nummer) => patch(index, { ...entry, nummer })} />
          </Field>
          <Field label="Adresszusatz" wico={wicoHint(entry.zusatz, wico?.[index]?.zusatz)}>
            <Text value={entry.zusatz} onChange={(zusatz) => patch(index, { ...entry, zusatz })} />
          </Field>
          <Field label="PLZ" wico={wicoHint(entry.plz, wico?.[index]?.plz)}>
            <Text value={entry.plz} onChange={(plz) => patch(index, { ...entry, plz })} />
          </Field>
          <Field label="Ort" wico={wicoHint(entry.ort, wico?.[index]?.ort)}>
            <Text value={entry.ort} onChange={(ort) => patch(index, { ...entry, ort })} />
          </Field>
          <Field label="Land" wico={wicoHint(entry.land, wico?.[index]?.land)}>
            <LandSelect value={entry.land} onChange={(land) => patch(index, { ...entry, land })} />
          </Field>
          <Field label="Berechtigungswortlaut" wico={wicoHint(entry.wortlaut, wico?.[index]?.wortlaut)}>
            <Area value={entry.wortlaut} onChange={(wortlaut) => patch(index, { ...entry, wortlaut })} />
          </Field>
          <Field label="GISA-Zahl" wico={wicoHint(entry.gisa, wico?.[index]?.gisa)}>
            <Text value={entry.gisa} onChange={(gisa) => patch(index, { ...entry, gisa })} />
          </Field>
          <Field
            label="Eingetragen am"
            wico={wicoDateHint(
              entry.tag,
              entry.monat,
              entry.jahr,
              wico?.[index]
                ? { tag: wico[index].tag, monat: wico[index].monat, jahr: wico[index].jahr }
                : undefined,
            )}
          >
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
  wico,
}: {
  entries: VereinEntry[];
  onChange: (entries: VereinEntry[]) => void;
  onRemoved?: (message: string, undo: () => void) => void;
  wico?: VereinEntry[];
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
          <Field label="Verein" wico={wicoHint(entry.verein, wico?.[index]?.verein)}>
            <SearchPick value={entry.verein} onChange={(verein) => patch(index, { ...entry, verein })} />
          </Field>
          <Field label="Funktion" wico={wicoHint(entry.funktion, wico?.[index]?.funktion)}>
            <Text value={entry.funktion} onChange={(funktion) => patch(index, { ...entry, funktion })} />
          </Field>
          <Field
            label="Eingetragen am"
            wico={wicoDateHint(
              entry.tag,
              entry.monat,
              entry.jahr,
              wico?.[index]
                ? { tag: wico[index].tag, monat: wico[index].monat, jahr: wico[index].jahr }
                : undefined,
            )}
          >
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

function Switch({
  label,
  on,
  onChange,
  wico,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  wico?: string;
}) {
  return (
    <div className="block">
      <div className="sw-switch-row">
        <span>{label}</span>
        <button
          type="button"
          className={on ? "sw-switch on" : "sw-switch"}
          aria-pressed={on}
          aria-label={label}
          onClick={() => onChange(!on)}
        >
          <span className="sw-switch-knob" />
        </button>
      </div>
      <WicoNote value={wico} />
    </div>
  );
}

function StaffPair({
  entry,
  onChange,
}: {
  entry: StaffYear;
  onChange: (entry: StaffYear) => void;
}) {
  return (
    <div className="sw-pair">
      <span className="sw-pair-label">Jahr</span>
      <input
        className="text-field sw-pair-field"
        value={entry.jahr}
        onChange={(event) => onChange({ ...entry, jahr: event.target.value })}
      />
      <span className="sw-pair-label">Anzahl</span>
      <input
        className="text-field sw-pair-field"
        value={entry.anzahl}
        onChange={(event) => onChange({ ...entry, anzahl: event.target.value })}
      />
    </div>
  );
}

export function WicoDatenFields({
  value,
  syncing,
  onChange,
  onSync,
}: {
  value: string;
  syncing: boolean;
  onChange: (value: string) => void;
  onSync: () => void;
}) {
  return (
    <>
      <h1>WICO Daten</h1>
      <Field label="WICO ID">
        <input
          className="text-field"
          value={value}
          disabled={syncing}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onSync}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSync();
            }
          }}
        />
      </Field>
      <p className="sw-hint">{syncing ? "Wird mit WICO synchronisiert…" : "Daten werden mit WICO abgeglichen."}</p>
    </>
  );
}

export function CompanyFirmenbuchFields({
  form,
  onChange,
  wico,
}: {
  form: CompanyFirmenbuchForm;
  onChange: (form: CompanyFirmenbuchForm) => void;
  wico?: CompanyFirmenbuchForm;
}) {
  const set = <K extends keyof CompanyFirmenbuchForm>(key: K, value: CompanyFirmenbuchForm[K]) =>
    onChange({ ...form, [key]: value });
  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <>
      <p className="sw-hint">Alle Daten stammen vom WICO</p>
      <Field label="Firmenwortlaut" wico={wicoHint(form.firmenwortlaut, wico?.firmenwortlaut)}>
        <Text value={form.firmenwortlaut} onChange={(value) => set("firmenwortlaut", value)} />
      </Field>
      <Field label="Strasse" wico={wicoHint(form.strasse, wico?.strasse)}>
        <Text value={form.strasse} onChange={(value) => set("strasse", value)} />
      </Field>
      <Field label="Nummer" wico={wicoHint(form.nummer, wico?.nummer)}>
        <Text value={form.nummer} onChange={(value) => set("nummer", value)} />
      </Field>
      <Field label="Adresszusatz" wico={wicoHint(form.zusatz, wico?.zusatz)}>
        <Text value={form.zusatz} onChange={(value) => set("zusatz", value)} />
      </Field>
      <Field label="PLZ" wico={wicoHint(form.plz, wico?.plz)}>
        <Text value={form.plz} onChange={(value) => set("plz", value)} />
      </Field>
      <Field label="Ort" wico={wicoHint(form.ort, wico?.ort)}>
        <Text value={form.ort} onChange={(value) => set("ort", value)} />
      </Field>
      <Field label="Land" wico={wicoHint(form.land, wico?.land)}>
        <LandSelect value={form.land} onChange={(value) => set("land", value)} />
      </Field>
      <Field label="Rechtsform" wico={wicoHint(form.rechtsform, wico?.rechtsform)}>
        <Select
          value={form.rechtsform}
          onChange={(value) => set("rechtsform", value)}
          options={["Aktiengesellschaft", "GmbH", "OG", "KG", "SE"]}
        />
      </Field>
      <Field label="Sitz in" wico={wicoHint(form.sitzIn, wico?.sitzIn)}>
        <Text value={form.sitzIn} onChange={(value) => set("sitzIn", value)} />
      </Field>
      <Field label="Gericht" wico={wicoHint(form.gericht, wico?.gericht)}>
        <Text value={form.gericht} onChange={(value) => set("gericht", value)} />
      </Field>
      <Field label="Firmenbuchnummer" wico={wicoHint(form.firmenbuchnummer, wico?.firmenbuchnummer)}>
        <Text value={form.firmenbuchnummer} onChange={(value) => set("firmenbuchnummer", value)} />
      </Field>
      <Field label="EUID" wico={wicoHint(form.euid, wico?.euid)}>
        <Text value={form.euid} onChange={(value) => set("euid", value)} />
      </Field>
      <Field label="UID" wico={wicoHint(form.uid, wico?.uid)}>
        <Text value={form.uid} onChange={(value) => set("uid", value)} />
      </Field>
      <Field
        label="Bilanzstichtag"
        wico={wicoDateHint(
          form.bilanzTag,
          form.bilanzMonat,
          "",
          wico ? { tag: wico.bilanzTag, monat: wico.bilanzMonat, jahr: "" } : undefined,
        )}
      >
        <DateField
          prefix="Am"
          day={form.bilanzTag}
          month={form.bilanzMonat}
          year=""
          hideYear
          onDay={(value) => set("bilanzTag", value)}
          onMonth={(value) => set("bilanzMonat", value)}
          onYear={() => undefined}
        />
      </Field>
      <div className="block">
        <span className="field-label">Mitarbeiter</span>
        <StaffPair entry={form.mitarbeiter} onChange={(mitarbeiter) => set("mitarbeiter", mitarbeiter)} />
        <WicoNote value={wicoStaffHint(form.mitarbeiter, wico?.mitarbeiter)} />
      </div>
      <div className="sw-history">
        <button
          type="button"
          className="sw-history-toggle"
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen((open) => !open)}
        >
          Mitarbeiter: Vorherige Jahre
          <Icon src={a.selectCaret} size={16} />
        </button>
        {historyOpen
          ? form.mitarbeiterHistory.map((entry, index) => (
              <div key={`staff-${index}`} className="block">
                <StaffPair
                  entry={entry}
                  onChange={(next) =>
                    set(
                      "mitarbeiterHistory",
                      form.mitarbeiterHistory.map((item, at) => (at === index ? next : item)),
                    )
                  }
                />
                <WicoNote value={wicoStaffHint(entry, wico?.mitarbeiterHistory[index])} />
              </div>
            ))
          : null}
      </div>
      <Field
        label="Ersteintragung"
        wico={wicoDateHint(
          form.erstTag,
          form.erstMonat,
          form.erstJahr,
          wico ? { tag: wico.erstTag, monat: wico.erstMonat, jahr: wico.erstJahr } : undefined,
        )}
      >
        <DateField
          prefix="Am"
          day={form.erstTag}
          month={form.erstMonat}
          year={form.erstJahr}
          onDay={(value) => set("erstTag", value)}
          onMonth={(value) => set("erstMonat", value)}
          onYear={(value) => set("erstJahr", value)}
        />
      </Field>
    </>
  );
}

export function CompanyOrganeFields({
  form,
  onChange,
  onRemoved,
  wico,
}: {
  form: CompanyOrganeForm;
  onChange: (form: CompanyOrganeForm) => void;
  onRemoved?: (message: string, undo: () => void) => void;
  wico?: CompanyOrganeForm;
}) {
  const set = <K extends keyof CompanyOrganeForm>(key: K, value: CompanyOrganeForm[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <>
      <AddRow label="Eigentümer des Partners" onAdd={() => set("owners", [...form.owners, { ...EMPTY_OWNER }])} />
      {form.owners.map((entry, index) => (
        <EntryPanel
          key={`owner-${index}`}
          onRemove={() => takeOut(form.owners, index, (owners) => set("owners", owners), "Eintrag wurde entfernt.", onRemoved)}
        >
          <Field label="Eigentümer" wico={wicoHint(entry.name, wico?.owners[index]?.name)}>
            <SearchPick value={entry.name} onChange={(name) => set("owners", form.owners.map((item, at) => (at === index ? { ...item, name } : item)))} />
          </Field>
          <Field label="Bezeichnung" wico={wicoHint(entry.bezeichnung, wico?.owners[index]?.bezeichnung)}>
            <Select
              value={entry.bezeichnung}
              onChange={(bezeichnung) =>
                set(
                  "owners",
                  form.owners.map((item, at) => (at === index ? { ...item, bezeichnung } : item)),
                )
              }
              options={["Gesellschafter", "Aktionär", "Kommanditist"]}
            />
          </Field>
          <Field label="Anteile" wico={wicoHint(entry.anteile, wico?.owners[index]?.anteile)}>
            <Text
              value={entry.anteile}
              onChange={(anteile) =>
                set(
                  "owners",
                  form.owners.map((item, at) => (at === index ? { ...item, anteile } : item)),
                )
              }
            />
          </Field>
        </EntryPanel>
      ))}

      <AddRow
        label="Kontrollorgane des Partners"
        onAdd={() => set("controlOrgans", [...form.controlOrgans, { ...EMPTY_CONTROL }])}
      />
      {form.controlOrgans.map((entry, index) => (
        <EntryPanel
          key={`control-${index}`}
          onRemove={() =>
            takeOut(form.controlOrgans, index, (controlOrgans) => set("controlOrgans", controlOrgans), "Eintrag wurde entfernt.", onRemoved)
          }
        >
          <Field label="Kontrollorgan" wico={wicoHint(entry.person, wico?.controlOrgans[index]?.person)}>
            <PartnerSearch
              value={entry.person}
              onChange={(person) =>
                set(
                  "controlOrgans",
                  form.controlOrgans.map((item, at) => (at === index ? { ...item, person } : item)),
                )
              }
              options={COMPANY_PERSONS}
            />
          </Field>
          <Field label="Funktion" wico={wicoHint(entry.funktion, wico?.controlOrgans[index]?.funktion)}>
            <Text
              value={entry.funktion}
              onChange={(funktion) =>
                set(
                  "controlOrgans",
                  form.controlOrgans.map((item, at) => (at === index ? { ...item, funktion } : item)),
                )
              }
            />
          </Field>
          <Field label="Funktionsbeschreibung" wico={wicoHint(entry.beschreibung, wico?.controlOrgans[index]?.beschreibung)}>
            <Area
              value={entry.beschreibung}
              onChange={(beschreibung) =>
                set(
                  "controlOrgans",
                  form.controlOrgans.map((item, at) => (at === index ? { ...item, beschreibung } : item)),
                )
              }
            />
          </Field>
          <Field label="Notiz zum Kontrollorgan" wico={wicoHint(entry.notiz, wico?.controlOrgans[index]?.notiz)}>
            <Area
              value={entry.notiz}
              onChange={(notiz) =>
                set(
                  "controlOrgans",
                  form.controlOrgans.map((item, at) => (at === index ? { ...item, notiz } : item)),
                )
              }
            />
          </Field>
          <Field
            label="Eingetragen am"
            wico={wicoDateHint(
              entry.tag,
              entry.monat,
              entry.jahr,
              wico?.controlOrgans[index]
                ? {
                    tag: wico.controlOrgans[index].tag,
                    monat: wico.controlOrgans[index].monat,
                    jahr: wico.controlOrgans[index].jahr,
                  }
                : undefined,
            )}
          >
            <DateField
              prefix="Am"
              day={entry.tag}
              month={entry.monat}
              year={entry.jahr}
              onDay={(tag) =>
                set(
                  "controlOrgans",
                  form.controlOrgans.map((item, at) => (at === index ? { ...item, tag } : item)),
                )
              }
              onMonth={(monat) =>
                set(
                  "controlOrgans",
                  form.controlOrgans.map((item, at) => (at === index ? { ...item, monat } : item)),
                )
              }
              onYear={(jahr) =>
                set(
                  "controlOrgans",
                  form.controlOrgans.map((item, at) => (at === index ? { ...item, jahr } : item)),
                )
              }
            />
          </Field>
        </EntryPanel>
      ))}

      <AddRow
        label="Gesetzlicher Vertreter des Partners"
        onAdd={() => set("legalReps", [...form.legalReps, { ...EMPTY_LEGAL_REP }])}
      />
      {form.legalReps.map((entry, index) => (
        <EntryPanel
          key={`legal-${index}`}
          onRemove={() =>
            takeOut(form.legalReps, index, (legalReps) => set("legalReps", legalReps), "Eintrag wurde entfernt.", onRemoved)
          }
        >
          <Field label="Gesetzlicher Vertreter" wico={wicoHint(entry.person, wico?.legalReps[index]?.person)}>
            <PartnerSearch
              value={entry.person}
              onChange={(person) =>
                set(
                  "legalReps",
                  form.legalReps.map((item, at) => (at === index ? { ...item, person } : item)),
                )
              }
              options={COMPANY_PERSONS}
            />
          </Field>
          <Field label="Funktion" wico={wicoHint(entry.funktion, wico?.legalReps[index]?.funktion)}>
            <Text
              value={entry.funktion}
              onChange={(funktion) =>
                set(
                  "legalReps",
                  form.legalReps.map((item, at) => (at === index ? { ...item, funktion } : item)),
                )
              }
            />
          </Field>
          <Field label="Funktionsbeschreibung" wico={wicoHint(entry.beschreibung, wico?.legalReps[index]?.beschreibung)}>
            <Area
              value={entry.beschreibung}
              onChange={(beschreibung) =>
                set(
                  "legalReps",
                  form.legalReps.map((item, at) => (at === index ? { ...item, beschreibung } : item)),
                )
              }
            />
          </Field>
          <Field label="Art der Vertretungsbefugnis" wico={wicoHint(entry.vertretungsArt, wico?.legalReps[index]?.vertretungsArt)}>
            <Select
              value={entry.vertretungsArt}
              onChange={(vertretungsArt) =>
                set(
                  "legalReps",
                  form.legalReps.map((item, at) => (at === index ? { ...item, vertretungsArt } : item)),
                )
              }
              options={["gemeinsam", "einzeln", "gesamt"]}
            />
          </Field>
          <Field label="Vertretungsbefugnis" wico={wicoHint(entry.vertretungsbefugnis, wico?.legalReps[index]?.vertretungsbefugnis)}>
            <Area
              value={entry.vertretungsbefugnis}
              onChange={(vertretungsbefugnis) =>
                set(
                  "legalReps",
                  form.legalReps.map((item, at) => (at === index ? { ...item, vertretungsbefugnis } : item)),
                )
              }
            />
          </Field>
          <Field
            label="Eingetragen am"
            wico={wicoDateHint(
              entry.tag,
              entry.monat,
              entry.jahr,
              wico?.legalReps[index]
                ? {
                    tag: wico.legalReps[index].tag,
                    monat: wico.legalReps[index].monat,
                    jahr: wico.legalReps[index].jahr,
                  }
                : undefined,
            )}
          >
            <DateField
              prefix="Am"
              day={entry.tag}
              month={entry.monat}
              year={entry.jahr}
              onDay={(tag) =>
                set(
                  "legalReps",
                  form.legalReps.map((item, at) => (at === index ? { ...item, tag } : item)),
                )
              }
              onMonth={(monat) =>
                set(
                  "legalReps",
                  form.legalReps.map((item, at) => (at === index ? { ...item, monat } : item)),
                )
              }
              onYear={(jahr) =>
                set(
                  "legalReps",
                  form.legalReps.map((item, at) => (at === index ? { ...item, jahr } : item)),
                )
              }
            />
          </Field>
        </EntryPanel>
      ))}

      <AddRow
        label="Partner ist beteiligt an..."
        onAdd={() => set("holdings", [...form.holdings, { ...EMPTY_HOLDING }])}
      />
      {form.holdings.map((entry, index) => (
        <EntryPanel
          key={`holding-${index}`}
          onRemove={() =>
            takeOut(form.holdings, index, (holdings) => set("holdings", holdings), "Eintrag wurde entfernt.", onRemoved)
          }
        >
          <Field label="Gesellschafter" wico={wicoHint(entry.name, wico?.holdings[index]?.name)}>
            <SearchPick
              value={entry.name}
              onChange={(name) =>
                set(
                  "holdings",
                  form.holdings.map((item, at) => (at === index ? { ...item, name } : item)),
                )
              }
            />
          </Field>
          <Field label="Beteiligungsart" wico={wicoHint(entry.art, wico?.holdings[index]?.art)}>
            <Select
              value={entry.art}
              onChange={(art) =>
                set(
                  "holdings",
                  form.holdings.map((item, at) => (at === index ? { ...item, art } : item)),
                )
              }
              options={["Als Gesellschafter", "Als Aktionär", "Als Kommanditist"]}
            />
          </Field>
          <Field label="Anteile" wico={wicoHint(entry.anteile, wico?.holdings[index]?.anteile)}>
            <Text
              value={entry.anteile}
              onChange={(anteile) =>
                set(
                  "holdings",
                  form.holdings.map((item, at) => (at === index ? { ...item, anteile } : item)),
                )
              }
            />
          </Field>
        </EntryPanel>
      ))}

      <AddRow
        label="Wirtschaftlicher Eigentümer"
        onAdd={() => set("beneficialOwners", [...form.beneficialOwners, ""])}
      />
      {form.beneficialOwners.map((name, index) => (
        <EntryPanel
          key={`beneficial-${index}`}
          onRemove={() =>
            takeOut(
              form.beneficialOwners,
              index,
              (beneficialOwners) => set("beneficialOwners", beneficialOwners),
              "Eintrag wurde entfernt.",
              onRemoved,
            )
          }
        >
          <Field label="Wirtschaftlicher Eigentümer" wico={wicoHint(name, wico?.beneficialOwners[index])}>
            <PartnerSearch
              value={name}
              onChange={(person) =>
                set(
                  "beneficialOwners",
                  form.beneficialOwners.map((item, at) => (at === index ? person : item)),
                )
              }
              options={COMPANY_PERSONS}
            />
          </Field>
        </EntryPanel>
      ))}
      <InfoBox>
        Gemäß WiEReG § 2 Abs. 1b) Sublit. cc) gelten bei eigentümerlosen Gesellschaften die natürlichen Personen, die
        der obersten Führungsebene angehören als wirtschaftliche Eigentümer, sofern keine weiteren Anhaltspunkte
        vorliegen, dass die Gesellschaft direkt oder indirekt unter der Kontrolle einer oder mehrerer anderer
        natürlichen Personen steht.
      </InfoBox>
    </>
  );
}

function CompanyGewerbePanel({
  entry,
  onChange,
  onRemove,
  wico,
}: {
  entry: CompanyGewerbeEntry;
  onChange: (entry: CompanyGewerbeEntry) => void;
  onRemove: () => void;
  wico?: CompanyGewerbeEntry;
}) {
  const set = <K extends keyof CompanyGewerbeEntry>(key: K, value: CompanyGewerbeEntry[K]) =>
    onChange({ ...entry, [key]: value });

  return (
    <EntryPanel onRemove={onRemove}>
      <Field label="Gewerberechtlicher Geschäftsführer" wico={wicoHint(entry.geschaeftsfuehrer, wico?.geschaeftsfuehrer)}>
        <PartnerSearch
          value={entry.geschaeftsfuehrer}
          onChange={(geschaeftsfuehrer) => set("geschaeftsfuehrer", geschaeftsfuehrer)}
          options={COMPANY_PERSONS}
        />
      </Field>
      <Field label="Strasse" wico={wicoHint(entry.strasse, wico?.strasse)}>
        <Text value={entry.strasse} onChange={(strasse) => set("strasse", strasse)} />
      </Field>
      <Field label="Nummer" wico={wicoHint(entry.nummer, wico?.nummer)}>
        <Text value={entry.nummer} onChange={(nummer) => set("nummer", nummer)} />
      </Field>
      <Field label="Adresszusatz" wico={wicoHint(entry.zusatz, wico?.zusatz)}>
        <Text value={entry.zusatz} onChange={(zusatz) => set("zusatz", zusatz)} />
      </Field>
      <Field label="PLZ" wico={wicoHint(entry.plz, wico?.plz)}>
        <Text value={entry.plz} onChange={(plz) => set("plz", plz)} />
      </Field>
      <Field label="Ort" wico={wicoHint(entry.ort, wico?.ort)}>
        <Text value={entry.ort} onChange={(ort) => set("ort", ort)} />
      </Field>
      <Field label="Land" wico={wicoHint(entry.land, wico?.land)}>
        <LandSelect value={entry.land} onChange={(land) => set("land", land)} />
      </Field>
      <Field label="Berechtigungswortlaut" wico={wicoHint(entry.wortlaut, wico?.wortlaut)}>
        <Area value={entry.wortlaut} onChange={(wortlaut) => set("wortlaut", wortlaut)} />
      </Field>
      <Field label="GISA-Zahl" wico={wicoHint(entry.gisa, wico?.gisa)}>
        <Text value={entry.gisa} onChange={(gisa) => set("gisa", gisa)} />
      </Field>
      <Field
        label="Eingetragen am"
        wico={wicoDateHint(
          entry.tag,
          entry.monat,
          entry.jahr,
          wico ? { tag: wico.tag, monat: wico.monat, jahr: wico.jahr } : undefined,
        )}
      >
        <DateField
          prefix="Am"
          day={entry.tag}
          month={entry.monat}
          year={entry.jahr}
          onDay={(tag) => set("tag", tag)}
          onMonth={(monat) => set("monat", monat)}
          onYear={(jahr) => set("jahr", jahr)}
        />
      </Field>
      <Switch
        label={entry.aktiv ? "Gewerbe Aktiv" : "Gewerbe ruhend"}
        on={entry.aktiv}
        onChange={(aktiv) => set("aktiv", aktiv)}
        wico={
          wico && entry.aktiv !== wico.aktiv ? (wico.aktiv ? "Aktiv" : "Ruhend") : undefined
        }
      />
      {entry.aktiv ? null : (
        <Field
          label="Ruhend ab"
          wico={wicoDateHint(
            entry.ruhendTag,
            entry.ruhendMonat,
            entry.ruhendJahr,
            wico ? { tag: wico.ruhendTag, monat: wico.ruhendMonat, jahr: wico.ruhendJahr } : undefined,
          )}
        >
          <DateField
            prefix="Am"
            day={entry.ruhendTag}
            month={entry.ruhendMonat}
            year={entry.ruhendJahr}
            onDay={(ruhendTag) => set("ruhendTag", ruhendTag)}
            onMonth={(ruhendMonat) => set("ruhendMonat", ruhendMonat)}
            onYear={(ruhendJahr) => set("ruhendJahr", ruhendJahr)}
          />
        </Field>
      )}
    </EntryPanel>
  );
}

export function CompanyGisaFields({
  form,
  onChange,
  onRemoved,
  wico,
}: {
  form: CompanyGisaForm;
  onChange: (form: CompanyGisaForm) => void;
  onRemoved?: (message: string, undo: () => void) => void;
  wico?: CompanyGisaForm;
}) {
  const set = <K extends keyof CompanyGisaForm>(key: K, value: CompanyGisaForm[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <>
      <Field label="Global Location Number (GLN)" wico={wicoHint(form.gln, wico?.gln)}>
        <Text value={form.gln} onChange={(value) => set("gln", value)} />
      </Field>
      <Field label="Aktive Gewerbeberechtigungen" wico={wicoHint(form.aktiveAnzahl, wico?.aktiveAnzahl)}>
        <Text value={form.aktiveAnzahl} onChange={(value) => set("aktiveAnzahl", value)} />
      </Field>
      <Field label="Branche (Firmenbuch)" wico={wicoHint(form.branche, wico?.branche)}>
        <Area value={form.branche} onChange={(value) => set("branche", value)} />
      </Field>
      <Field label="Produkte (Firmenbuch)" wico={wicoHint(form.produkte, wico?.produkte)}>
        <Area value={form.produkte} onChange={(value) => set("produkte", value)} />
      </Field>
      <Field label="Tätigkeit (Firmenbuch)" wico={wicoHint(form.taetigkeit, wico?.taetigkeit)}>
        <Text value={form.taetigkeit} onChange={(value) => set("taetigkeit", value)} />
      </Field>
      <AddRow
        label="Gewerbe"
        onAdd={() => set("gewerbe", [...form.gewerbe, { ...EMPTY_COMPANY_GEWERBE }])}
      />
      {form.gewerbe.map((entry, index) => (
        <CompanyGewerbePanel
          key={`gisa-gewerbe-${index}`}
          entry={entry}
          wico={wico?.gewerbe[index]}
          onChange={(next) => set("gewerbe", form.gewerbe.map((item, at) => (at === index ? next : item)))}
          onRemove={() =>
            takeOut(form.gewerbe, index, (gewerbe) => set("gewerbe", gewerbe), "Eintrag wurde entfernt.", onRemoved)
          }
        />
      ))}
    </>
  );
}
