import { useMemo, useState } from "react";
import * as a from "../assets/index";
import { TEAM, isEmployee } from "../manager/hrmTeam";
import { FILE_PARTNERS, partnerKindText } from "../person/partners";

/** Mobile Kontaktliste (Figma 19075:490158): partners and employees, A to Z, with search and quick filters. */
type Kontakt = {
  id: string;
  /** Sort name: "Nachname Vorname" for people, the company name otherwise. */
  name: string;
  line: string;
  kind: "company" | "person" | "mitarbeiter";
  tag?: string;
  status?: string;
  photo?: string;
};

const lastFirst = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts.slice(1).join(" ")} ${parts[0]}` : name;
};

const KONTAKTE: Kontakt[] = [
  ...Object.values(FILE_PARTNERS).map((p): Kontakt => {
    const company = p.fileKind === "company";
    return {
      id: `p-${p.id}`,
      name: company ? p.name : lastFirst(p.name),
      line: company ? (p.fn ? `FN ${p.fn}` : p.address?.[1] ?? "") : p.born ?? "",
      kind: company ? "company" : "person",
      tag: partnerKindText(p.id === "julia" ? "interessent" : p.kind ?? "einfach"),
    };
  }),
  ...TEAM.filter(isEmployee).map(
    (m): Kontakt => ({
      id: `m-${m.name}`,
      name: m.name,
      line: `Mitarbeiter ${m.abteilung}`,
      kind: "mitarbeiter",
      status: "Verfügbar",
      photo: m.photo,
    }),
  ),
].sort((x, y) => x.name.localeCompare(y.name, "de"));

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
type Filter = "Alle" | "Mitarbeiter" | "Favoriten";

export function MobileKontakte() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Alle");
  const [favorites, setFavorites] = useState<string[]>([]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = KONTAKTE.filter(
      (k) =>
        (filter === "Alle" || (filter === "Mitarbeiter" ? k.kind === "mitarbeiter" : favorites.includes(k.id))) &&
        (!q || `${k.name} ${k.line} ${k.tag ?? ""}`.toLowerCase().includes(q)),
    );
    const map = new Map<string, Kontakt[]>();
    for (const k of list) {
      const letter = k.name[0].toUpperCase();
      map.set(letter, [...(map.get(letter) ?? []), k]);
    }
    return [...map.entries()];
  }, [query, filter, favorites]);
  const letters = new Set(groups.map(([letter]) => letter));

  return (
    <div className="m-kon">
      <h1>Kontaktliste</h1>
      <label className="m-kon-search">
        <img src={a.searchDark} alt="" width={20} height={20} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Kontakte suchen" />
        <img src={a.filterLines} alt="" width={20} height={20} />
      </label>
      <div className="m-kon-chips" role="tablist" aria-label="Filter">
        {(["Alle", "Mitarbeiter", "Favoriten"] as Filter[]).map((name) => (
          <button type="button" role="tab" key={name} aria-selected={filter === name} className={filter === name ? "on" : ""} onClick={() => setFilter(name)}>
            {name}
          </button>
        ))}
      </div>

      <div className="m-kon-list">
        {groups.length === 0 ? <p className="m-kon-empty">{filter === "Favoriten" && !query ? "Noch keine Favoriten. Mit dem Plus fügst du einen Kontakt hinzu." : "Keine Kontakte gefunden."}</p> : null}
        {groups.map(([letter, list]) => (
          <section key={letter} id={`m-kon-${letter}`}>
            <h2>{letter}</h2>
            {list.map((k) => {
              const fav = favorites.includes(k.id);
              return (
                <article className="m-kon-card" key={k.id}>
                  {k.photo ? (
                    <span className="m-kon-avatar photo">
                      <img src={k.photo} alt="" />
                      <i />
                    </span>
                  ) : (
                    <span className={k.tag === "Kunde" ? "m-kon-avatar dark" : "m-kon-avatar"}>
                      <img src={k.kind === "company" ? a.companyBlank : a.clientBlank} alt="" width={26} height={26} />
                      {k.kind === "company" || k.tag === "Kunde" ? <img className="w" src={a.searchWinterBadge} alt="" width={16} height={16} /> : null}
                    </span>
                  )}
                  <span className="m-kon-copy">
                    <strong>{k.name}</strong>
                    <small>{k.line}</small>
                    {k.tag ? <span className={`chip ${k.tag === "Kunde" ? "kunde" : k.tag === "Einfache Person" ? "einfach" : ""}`}>{k.tag}</span> : null}
                    {k.status ? <em>{k.status}</em> : null}
                  </span>
                  <button
                    type="button"
                    className={fav ? "m-kon-plus on" : "m-kon-plus"}
                    aria-pressed={fav}
                    aria-label={fav ? `${k.name} aus den Favoriten entfernen` : `${k.name} zu den Favoriten hinzufügen`}
                    onClick={() => setFavorites((ids) => (fav ? ids.filter((id) => id !== k.id) : [...ids, k.id]))}
                  >
                    <img src={fav ? a.checkGreen : a.plusCircle} alt="" width={20} height={20} />
                  </button>
                </article>
              );
            })}
          </section>
        ))}
      </div>

      <nav className="m-kon-az" aria-label="Alphabet">
        {ALPHABET.map((letter) => (
          <button type="button" key={letter} disabled={!letters.has(letter)} onClick={() => document.getElementById(`m-kon-${letter}`)?.scrollIntoView({ block: "start", behavior: "smooth" })}>
            {letter}
          </button>
        ))}
      </nav>
    </div>
  );
}
