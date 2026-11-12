import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { familyGender } from "../person/family";
import { FILE_PARTNERS, type FilePartner, type PartnerId } from "../person/partners";
import { Icon, useClickOutside } from "../ui";
import { useWorkflow } from "../workflow";

/**
 * Header Schnellsuche (Figma 22715:174993, empty state 22715:174994): finds every partner file in Wino by name,
 * phone, address or interne ID. Schaden, Polizze and Kennzeichen have no data yet, so they find nothing.
 */
type Filter = "Alle" | "Name" | "Telefon" | "Adresse" | "Schaden" | "Polizze" | "Interne ID" | "Kennzeichen";
const FILTER_ROWS: Filter[][] = [
  ["Alle", "Name", "Telefon", "Adresse", "Schaden"],
  ["Polizze", "Interne ID", "Kennzeichen"],
];

type Tag = { label: string; tone: "interessent" | "kunde" | "einfach"; star?: boolean };

type Entry = {
  id: PartnerId;
  name: string;
  company: boolean;
  tag: Tag;
  /** Geburtsdatum for people, Firmenbuchnummer for companies. */
  sub?: string;
  address?: [string, string];
  relation?: { label: string; value: string };
  /** People linked to a company (e.g. Geschäftsführung); shown when the search hits them. */
  people: string[];
  contacts: FilePartner["contacts"];
  fileId: string;
};

/** Verknüpfungen shown next to the address, like "Konzern / Lunixo AG" in Figma. */
const RELATIONS: Partial<Record<PartnerId, { label: string; value: string }>> = {
  julia: { label: "Konzern", value: "Lunixo AG" },
  karl: { label: "Familie", value: "Julia Atkinson" },
  johanna: { label: "Familie", value: "Julia Atkinson" },
  ash: { label: "Familie", value: "Julia Atkinson" },
  marcus: { label: "Familie", value: "Julia Atkinson" },
  lunixo: { label: "Konzern", value: "Lunixo Holding" },
  "lunixo-holding": { label: "Konzern", value: "Lunixo AG" },
  "lunixo-immobilien": { label: "Konzern", value: "Lunixo Holding" },
};

const PEOPLE: Partial<Record<PartnerId, string[]>> = {
  lunixo: ["Julia Atkinson"],
};

function tagOf(partner: FilePartner, ashleyConverted: boolean): Tag {
  const company = partner.fileKind === "company";
  const kind =
    partner.id === "julia" || (partner.id === "ashley" && ashleyConverted)
      ? "interessent"
      : partner.kind ?? "einfach";
  if (kind === "interessent") return { label: "Interessent", tone: "interessent" };
  if (kind === "kunde") {
    if (company) return { label: "Kunde", tone: "kunde" };
    const female = familyGender(partner.id) === "f";
    return { label: female ? "Kundin" : "Kunde", tone: "kunde", star: true };
  }
  return { label: "Einfache Person", tone: "einfach" };
}

function toEntry(partner: FilePartner, ashleyConverted: boolean): Entry {
  const company = partner.fileKind === "company";
  return {
    id: partner.id,
    name: partner.name,
    company,
    tag: tagOf(partner, ashleyConverted),
    sub: company ? (partner.fn ? `FN ${partner.fn}` : undefined) : partner.born,
    address: partner.address,
    relation: RELATIONS[partner.id],
    people: PEOPLE[partner.id] ?? [],
    contacts: partner.contacts,
    fileId: partner.fileId,
  };
}

/** Zuletzt geöffnet: partner files opened, newest first, at most 5. Kept per browser. */
const RECENT_KEY = "wino.search.recent.v1";
const RECENT_SEED: string[] = ["julia", "lunixo"];
const RECENT_MAX = 5;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw === null) return RECENT_SEED;
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((item) => typeof item === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return RECENT_SEED;
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("wino:search-recent"));
  } catch {
    /* storage blocked: the list just stays for this session */
  }
}

/** Views that show a partner file: being there counts as having opened it. */
const FILE_VIEWS = new Set(["person", "stammdaten", "workflow", "konzernHub"]);

const norm = (text: string) => text.toLowerCase();
const digits = (text: string) => text.replace(/\D/g, "");

function hits(entry: Entry, query: string, filter: Filter) {
  const q = norm(query.trim());
  const qDigits = digits(query);
  const has = (text?: string) => Boolean(text && norm(text).includes(q));
  const phoneHit = () =>
    qDigits.length >= 2 &&
    entry.contacts.some((contact) => contact.kind === "phone" && digits(contact.value).includes(qDigits));
  const name = () => has(entry.name) || entry.people.some(has);
  const address = () => Boolean(entry.address?.some(has));
  const id = () => has(entry.fileId);
  switch (filter) {
    case "Name":
      return name();
    case "Telefon":
      return phoneHit();
    case "Adresse":
      return address();
    case "Interne ID":
      return id();
    case "Schaden":
    case "Polizze":
    case "Kennzeichen":
      return false;
    default:
      return (
        name() ||
        address() ||
        id() ||
        phoneHit() ||
        has(entry.sub) ||
        entry.contacts.some((contact) => has(contact.value)) ||
        has(entry.relation?.value)
      );
  }
}

/** Wraps every occurrence of the query in a purple highlight. */
function Hit({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (q.length < 2) return <>{text}</>;
  const lower = norm(text);
  const needle = norm(q);
  const parts: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(needle);
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark className="gs-hit" key={at}>
        {text.slice(at, at + q.length)}
      </mark>,
    );
    from = at + q.length;
    at = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}

function ResultCard({ entry, query, onOpen }: { entry: Entry; query: string; onOpen: () => void }) {
  const people = entry.people.filter((person) => query.trim().length >= 2 && norm(person).includes(norm(query.trim())));
  return (
    <button type="button" className="gs-card" onClick={onOpen}>
      <span className="gs-card-deco" aria-hidden>
        <img src={a.idDeco} alt="" />
      </span>
      <span className="gs-avatar">
        <img src={a.avatarBg} alt="" />
        <img className="glyph" src={entry.company ? a.companyBlank : a.clientBlank} alt="" />
        <img className="gs-winter" src={a.searchWinterBadge} alt="" width={20} height={20} />
      </span>
      <span className="gs-copy">
        <span className={`chip gs-tag ${entry.tag.tone === "interessent" ? "" : entry.tag.tone}`}>
          {entry.tag.star ? <img src={a.searchStar} alt="" width={11} height={11} /> : null}
          {entry.tag.label}
        </span>
        <strong className="gs-name">
          <Hit text={entry.name} query={query} />
        </strong>
        {entry.sub ? (
          <span className="gs-line">
            <Hit text={entry.sub} query={query} />
          </span>
        ) : null}
        {entry.address || entry.relation ? (
          <span className="gs-cols">
            <span className="gs-line">
              {entry.address ? (
                <>
                  <Hit text={entry.address[0]} query={query} />
                  <br />
                  <Hit text={entry.address[1]} query={query} />
                </>
              ) : null}
            </span>
            {entry.relation ? (
              <span className="gs-relation">
                <small>{entry.relation.label}</small>
                <span>
                  <Hit text={entry.relation.value} query={query} />
                </span>
              </span>
            ) : null}
          </span>
        ) : null}
        {people.length ? (
          <span className="gs-people">
            {people.map((person) => (
              <strong key={person}>
                <Hit text={person} query={query} />
              </strong>
            ))}
          </span>
        ) : null}
        {entry.contacts.length ? (
          <span className="gs-contacts">
            {entry.contacts.map((contact) => (
              <span className="mm-contact" key={`${contact.kind}-${contact.value}`}>
                <span className="mm-contact-icon">
                  <Icon src={contact.kind === "mail" ? a.mail : a.phone} size={18} />
                </span>
                <span>
                  <small>{contact.caption}</small>
                  <strong>
                    <Hit text={contact.value} query={query} />
                  </strong>
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="gs-id">
        ID: <Hit text={entry.fileId} query={query} />
        <img src={a.openTab} alt="" width={16} height={16} />
      </span>
    </button>
  );
}

/** The header search button plus its Schnellsuche panel. Used in every header. */
export function GlobalSearch() {
  const { openPartner, extraPartners, ashleyConverted, view, filePartnerId } = useWorkflow();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Alle");
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const updateRecent = (list: string[]) => {
    setRecent(list);
    writeRecent(list);
  };

  // Every header has its own search; they share the list through storage and this event.
  useEffect(() => {
    const sync = () => setRecent(readRecent());
    window.addEventListener("wino:search-recent", sync);
    return () => window.removeEventListener("wino:search-recent", sync);
  }, []);

  // Opening a partner file (from anywhere) puts it on top of Zuletzt geöffnet.
  useEffect(() => {
    if (!FILE_VIEWS.has(view)) return;
    const list = readRecent();
    if (list[0] === filePartnerId) return;
    writeRecent([filePartnerId, ...list.filter((id) => id !== filePartnerId)].slice(0, RECENT_MAX));
  }, [view, filePartnerId]);

  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const rect = button.current!.getBoundingClientRect();
      setPos({ top: rect.bottom + 7, right: window.innerWidth - rect.right });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const entries = useMemo(() => {
    const all = [...Object.values(FILE_PARTNERS), ...extraPartners.filter((partner) => !(partner.id in FILE_PARTNERS))];
    return all.map((partner) => toEntry(partner, ashleyConverted));
  }, [extraPartners, ashleyConverted]);

  const searching = query.trim().length >= 2;
  const recentEntries = recent
    .map((id) => entries.find((entry) => entry.id === id))
    .filter((entry): entry is Entry => Boolean(entry));
  const results = searching ? entries.filter((entry) => hits(entry, query, filter)) : [];

  const openEntry = (id: PartnerId) => {
    setOpen(false);
    openPartner(id);
  };

  return (
    <div className="gs" ref={ref}>
      <button
        ref={button}
        type="button"
        className={open ? "search-btn gs-btn open" : "search-btn gs-btn"}
        aria-label="Suche"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {/* Hover shows the light (active) button; open keeps it. */}
        <span className="gs-btn-idle">
          <Icon src={a.search} size={42} />
        </span>
        <span className="gs-btn-active">
          <Icon src={a.searchActive} size={42} />
        </span>
      </button>
      {open ? (
        <div className="gs-panel" role="dialog" aria-label="Schnellsuche" style={{ top: pos.top, right: pos.right }}>
          <div className="gs-head">
            <img src={a.searchGlass} alt="" width={24} height={25} />
            <input
              ref={input}
              value={query}
              placeholder="Suchen"
              aria-label="Suchbegriff"
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              className="gs-close"
              aria-label="Suche schließen"
              onClick={() => (query ? setQuery("") : setOpen(false))}
            >
              <img src={a.searchClose} alt="" width={24} height={24} />
            </button>
          </div>
          <div className="gs-filters">
            {FILTER_ROWS.map((row, index) => (
              <div className="gs-filter-row" key={index}>
                {row.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={filter === name ? "gs-chip on" : "gs-chip"}
                    aria-pressed={filter === name}
                    onClick={() => setFilter(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ))}
          </div>
          {!searching && recentEntries.length ? (
            <div className="gs-history">
              <div className="gs-history-head">
                <p className="gs-count">Zuletzt geöffnet</p>
                <button type="button" className="gs-link" onClick={() => updateRecent([])}>
                  Verlauf löschen
                </button>
              </div>
              <ul>
                {recentEntries.map((entry) => (
                  <li key={entry.id}>
                    <button type="button" className="gs-history-item" onClick={() => openEntry(entry.id)}>
                      <span className="gs-recent-avatar">
                        <img src={a.avatarBg} alt="" />
                        <img className="glyph" src={entry.company ? a.companyBlank : a.clientBlank} alt="" />
                      </span>
                      <span className="gs-recent-copy">
                        <strong>{entry.name}</strong>
                        <small>
                          {entry.tag.label} · ID {entry.fileId}
                        </small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="gs-history-remove"
                      aria-label={`${entry.name} aus dem Verlauf entfernen`}
                      onClick={() => updateRecent(recent.filter((id) => id !== entry.id))}
                    >
                      <img src={a.searchClose} alt="" width={12} height={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {searching && results.length ? (
            <div className="gs-results">
              <p className="gs-count">
                {results.length} {results.length === 1 ? "Ergebnis" : "Ergebnisse"}
              </p>
              <div className="gs-list">
                {results.map((entry) => (
                  <ResultCard key={entry.id} entry={entry} query={query} onOpen={() => openEntry(entry.id)} />
                ))}
              </div>
            </div>
          ) : null}
          {searching && !results.length ? (
            <div className="gs-empty">
              <img className="gs-empty-deco" src={a.searchEmptyDeco} alt="" />
              <img className="gs-empty-icons" src={a.searchEmptyIcons} alt="" width={126} height={45} />
              <strong>Keine Resultate</strong>
              <p>Es konnten keine Ergebnisse gefunden werden. Versuche deine Suche zu verfeinern.</p>
            </div>
          ) : null}
          <div className="gs-foot">
            <button type="button" className="gs-link">
              {searching && results.length
                ? `Alle ${results.length} ${results.length === 1 ? "Ergebnis" : "Ergebnisse"} anzeigen`
                : "Schnellsuche öffnen"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
