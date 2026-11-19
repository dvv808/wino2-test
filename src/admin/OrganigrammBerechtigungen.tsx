import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as a from "../assets/index";
import { useDms } from "../dms/store";
import { DmsTable, type DmsColumn } from "../dms/ui";
import {
  AUTO_TYPE_PERMS,
  BERECHTIGUNGEN,
  LEVEL_LABEL,
  TYPES,
  hasRole,
  org,
  permLabel,
  useDmsAccess,
  useLevelPerms,
  useOrganigramm,
  useTypePerms,
  type OrgGroup,
  type OrgLevel,
  type OrgRole,
  type PermScope,
} from "../manager/organigramm";
import type { Knoten } from "../types/dms";
import { Icon } from "../ui";

/**
 * Admin → HRM Admin → Organigramm Berechtigungen. Three places to give a Berechtigung:
 * Ebene (global, inherited by every group there), Typ (Mitarbeiter / Führung function, only in the groups where
 * someone holds it) and Gruppe (on top). A Berechtigung given both per Typ and per Ebene / Gruppe is marked "doppelt".
 * Hovering a bubble highlights the same Berechtigung everywhere. DMS Zugriff opens a folder picker (or Alle).
 */
const LEVEL_TITLE: Record<OrgLevel, string> = { 1: "Geschäftsführung", 2: "Abteilungen", 3: "Weitere" };
const LEVELS: OrgLevel[] = [1, 2, 3];

type Place = { scope: PermScope; label: string; kind: "ebene" | "typ" | "gruppe" };

function LevelCell({ level }: { level: OrgLevel }) {
  return (
    <span className="og-admin-level-cell">
      <span className="og-level-tag small">{LEVEL_LABEL[level]}</span>
      {LEVEL_TITLE[level]}
    </span>
  );
}

export function OrganigrammBerechtigungen() {
  const groups = useOrganigramm();
  const levels = useLevelPerms();
  const types = useTypePerms();
  const [hover, setHover] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ scope: PermScope; title: string } | null>(null);

  /* Every place each Berechtigung is given, to mark doubles (Typ and Ebene / Gruppe). */
  const places = new Map<string, Place[]>();
  const put = (perm: string, place: Place) => places.set(perm, [...(places.get(perm) ?? []), place]);
  LEVELS.forEach((l) => levels[l].forEach((p) => put(p, { scope: `level:${l}`, label: `Ebene ${LEVEL_LABEL[l]}`, kind: "ebene" })));
  TYPES.forEach((t) => [...(AUTO_TYPE_PERMS[t.role] ?? []), ...types[t.role]].forEach((p) => put(p, { scope: `type:${t.role}`, label: `Typ ${t.label}`, kind: "typ" })));
  groups.forEach((g) => g.extras.forEach((p) => put(p, { scope: `group:${g.id}`, label: `Gruppe ${g.name}`, kind: "gruppe" })));
  const doubleOf = (perm: string, scope: PermScope): string[] | null => {
    const all = places.get(perm) ?? [];
    const typ = all.some((p) => p.kind === "typ");
    const other = all.some((p) => p.kind !== "typ");
    if (!typ || !other) return null;
    return all.filter((p) => p.scope !== scope).map((p) => p.label);
  };

  const common = { hover, onHover: setHover, doubleOf, onDms: (scope: PermScope, title: string) => setPicker({ scope, title }) };
  const countRole = (role: OrgRole) => new Set(groups.filter((g) => g.level !== 3 || role === "mitglied").flatMap((g) => g.people.filter((p) => hasRole(p, role)).map((p) => p.name))).size;

  const levelColumns: DmsColumn<OrgLevel>[] = [
    { key: "ebene", label: "Ebene", width: "minmax(200px, 200fr)", text: (l) => `${LEVEL_LABEL[l]} ${LEVEL_TITLE[l]}`, render: (l) => <LevelCell level={l} /> },
    { key: "gruppen", label: "Gruppen", width: "minmax(110px, 110fr)", text: (l) => String(groups.filter((g) => g.level === l).length) },
    {
      key: "rechte",
      label: "Berechtigungen (für alle Gruppen der Ebene)",
      width: "minmax(640px, 640fr)",
      text: (l) => levels[l].map(permLabel).join(", "),
      render: (l) => (
        <PermBubbles
          scope={`level:${l}`}
          title={`Ebene ${LEVEL_LABEL[l]}`}
          own={levels[l]}
          onAdd={(perm) => org.addLevelPerm(l, perm)}
          onRemove={(perm) => org.removeLevelPerm(l, perm)}
          emptyText="Keine Berechtigungen"
          {...common}
        />
      ),
    },
  ];

  const typeColumns: DmsColumn<(typeof TYPES)[number]>[] = [
    {
      key: "typ",
      label: "Typ",
      width: "minmax(200px, 200fr)",
      text: (t) => `${t.group} ${t.label}`,
      render: (t) => (
        <span className="og-type-cell">
          <span className={t.group === "Führung" ? "og-type-tag lead" : "og-type-tag"}>{t.group}</span>
          {t.group === "Führung" ? t.label : null}
        </span>
      ),
    },
    { key: "personen", label: "Personen", width: "minmax(110px, 110fr)", text: (t) => String(countRole(t.role)) },
    {
      key: "gilt",
      label: "Gilt für",
      width: "minmax(260px, 260fr)",
      text: (t) => (t.role === "mitglied" ? "die eigenen Gruppen" : `nur die Gruppen, in denen jemand ${t.label} ist`),
      render: (t) => <span className="og-scope-text">{t.role === "mitglied" ? "Die Gruppen, in denen jemand Mitglied ist" : `Nur die Gruppen, in denen jemand ${t.label} ist`}</span>,
    },
    {
      key: "rechte",
      label: "Berechtigungen",
      width: "minmax(640px, 640fr)",
      text: (t) => [...(AUTO_TYPE_PERMS[t.role] ?? []), ...types[t.role]].map(permLabel).join(", "),
      render: (t) => (
        <PermBubbles
          scope={`type:${t.role}`}
          title={`Typ ${t.label}`}
          auto={AUTO_TYPE_PERMS[t.role]}
          own={types[t.role]}
          onAdd={(perm) => org.addTypePerm(t.role, perm)}
          onRemove={(perm) => org.removeTypePerm(t.role, perm)}
          emptyText="Keine Berechtigungen"
          {...common}
        />
      ),
    },
  ];

  const groupColumns: DmsColumn<OrgGroup>[] = [
    { key: "ebene", label: "Ebene", width: "minmax(200px, 200fr)", text: (g) => `${LEVEL_LABEL[g.level]} ${LEVEL_TITLE[g.level]}`, render: (g) => <LevelCell level={g.level} /> },
    { key: "gruppe", label: "Gruppe", width: "minmax(260px, 260fr)", text: (g) => g.name, render: (g) => <strong>{g.name}</strong> },
    { key: "personen", label: "Personen", width: "minmax(110px, 110fr)", text: (g) => String(g.people.length) },
    {
      key: "rechte",
      label: "Berechtigungen",
      width: "minmax(640px, 640fr)",
      text: (g) => [...levels[g.level], ...g.extras].map(permLabel).join(", "),
      render: (g) => (
        <PermBubbles
          scope={`group:${g.id}`}
          title={g.name}
          inherited={levels[g.level]}
          inheritedScope={`level:${g.level}`}
          inheritedFrom={LEVEL_LABEL[g.level]}
          own={g.extras}
          onAdd={(perm) => org.addGroupPerm(g.id, perm)}
          onRemove={(perm) => org.removeGroupPerm(g.id, perm)}
          {...common}
        />
      ),
    },
  ];

  return (
    <section className="dms-panel dms-admin-full og-admin">
      <header className="og-admin-head">
        <h2>Organigramm Berechtigungen</h2>
        <p className="dms-muted">Jede Gruppe und jede Funktion aus HRM → Settings → Organigramm erscheint hier automatisch.</p>
      </header>

      <div className="og-rule">
        <span className="og-rule-step">
          <b>1</b>
          <span>
            <strong>Ebene</strong>: gilt für alle Gruppen darin.
          </span>
        </span>
        <span className="og-rule-step">
          <b>2</b>
          <span>
            <strong>Typ</strong>: gilt nur in den Gruppen, in denen jemand diese Funktion hat.
          </span>
        </span>
        <span className="og-rule-step">
          <b>3</b>
          <span>
            <strong>Gruppe</strong>: zusätzlich nur für diese Gruppe.
          </span>
        </span>
        <span className="og-rule-legend">
          <span className="og-perm-bubble locked">
            <Icon src={a.hnLock} size={14} />
            vererbt
          </span>
          <span className="og-perm-bubble">
            vergeben
            <Icon src={a.iconCloseDark} size={14} />
          </span>
          <span className="og-perm-bubble double">doppelt</span>
        </span>
      </div>

      <div className="og-admin-block">
        <h3>Ebenen (global)</h3>
        <DmsTable rows={LEVELS} columns={levelColumns} rowKey={(l) => String(l)} label="Ebenen" unit="Ebenen" />
      </div>

      <div className="og-admin-block">
        <h3>Typ (global)</h3>
        <p className="og-admin-sub">
          Funktionen aus dem Organigramm. Wer Leiter Stv. einer Gruppe ist, bearbeitet automatisch die Urlaube dieser Gruppe – nicht die anderer Gruppen. Dafür muss man nicht Mitglied der Gruppe sein.
        </p>
        <DmsTable rows={TYPES} columns={typeColumns} rowKey={(t) => t.role} label="Typ" unit="Typen" />
      </div>

      <div className="og-admin-block">
        <h3>Gruppen</h3>
        <DmsTable rows={groups} columns={groupColumns} rowKey={(g) => g.id} label="Organigramm Gruppen" unit="Gruppen" />
      </div>

      <aside className="og-note">
        <strong>Logik (Entwurf, folgt später)</strong>
        <ul>
          <li>Eine Person bekommt: Berechtigungen ihrer Ebene + ihrer Gruppe + ihres Typs (je Gruppe, in der sie die Funktion hat).</li>
          <li>Typ-Berechtigungen gelten nur für die Gruppe, in der jemand die Funktion hat (z. B. Urlaub genehmigen als Leiter der KFZ-Versicherungen → nur KFZ).</li>
          <li>Leiter Stv.: bearbeitet immer die Urlaube seiner Gruppe (fix), auch ohne Mitglied dieser Gruppe zu sein.</li>
          <li>„Doppelt“: dieselbe Berechtigung per Typ und per Ebene / Gruppe vergeben – meist reicht eine der beiden.</li>
          <li>Offen: Personen in mehreren Gruppen, Vertretung bei Abwesenheit, Rechte von H3 auf H2-Daten.</li>
        </ul>
      </aside>

      {picker ? <DmsPicker scope={picker.scope} title={picker.title} onClose={() => setPicker(null)} /> : null}
    </section>
  );
}

type BubbleProps = {
  scope: PermScope;
  title: string;
  inherited?: string[];
  inheritedScope?: PermScope;
  inheritedFrom?: string;
  /** Fixed by a rule (Leiter Stv. → Urlaub genehmigen). */
  auto?: string[];
  own: string[];
  onAdd: (perm: string) => void;
  onRemove: (perm: string) => void;
  emptyText?: string;
  hover: string | null;
  onHover: (perm: string | null) => void;
  doubleOf: (perm: string, scope: PermScope) => string[] | null;
  onDms: (scope: PermScope, title: string) => void;
};

/** "+ Berechtigung hinzufügen" first, then inherited / automatic (locked) and own bubbles (×). */
function PermBubbles({ scope, title, inherited = [], inheritedScope, inheritedFrom, auto = [], own, onAdd, onRemove, emptyText, hover, onHover, doubleOf, onDms }: BubbleProps) {
  const dmsAccess = useDmsAccess();
  const taken = [...inherited, ...auto, ...own];
  const available = BERECHTIGUNGEN.filter((b) => !taken.includes(b.id));
  const label = (perm: string, at: PermScope) => {
    if (perm !== "dms") return permLabel(perm);
    const access = dmsAccess[at];
    return `DMS Zugriff · ${access === "all" ? "Alle Ordner" : access?.length ? `${access.length} ${access.length === 1 ? "Ordner" : "Ordner"}` : "keine Ordner"}`;
  };
  const cls = (perm: string, base: string, at: PermScope) => {
    const double = doubleOf(perm, at);
    return `${base}${double ? " double" : ""}${hover === perm ? " hl" : ""}`;
  };
  const tip = (perm: string, at: PermScope, lead: string) => {
    const double = doubleOf(perm, at);
    return double ? `${lead}\nDoppelt – auch vergeben bei: ${double.join(", ")}` : lead;
  };
  const hoverProps = (perm: string) => ({ onMouseEnter: () => onHover(perm), onMouseLeave: () => onHover(null) });

  return (
    <span className="og-perms" onClick={(event) => event.stopPropagation()}>
      <AddPerm
        options={available}
        onAdd={(perm) => {
          onAdd(perm);
          if (perm === "dms") onDms(scope, title);
        }}
      />
      {inherited.map((perm) => (
        <span key={perm} className={cls(perm, "og-perm-bubble locked", inheritedScope ?? scope)} title={tip(perm, inheritedScope ?? scope, `Von Ebene ${inheritedFrom} – nur bei der Ebene änderbar`)} {...hoverProps(perm)}>
          <Icon src={a.hnLock} size={14} />
          {label(perm, inheritedScope ?? scope)}
        </span>
      ))}
      {auto.map((perm) => (
        <span key={perm} className={cls(perm, "og-perm-bubble locked auto", scope)} title={tip(perm, scope, "Automatisch: gilt immer, nur für die eigene Gruppe")} {...hoverProps(perm)}>
          <Icon src={a.hnLock} size={14} />
          {label(perm, scope)} · automatisch
        </span>
      ))}
      {own.map((perm) => (
        <span key={perm} className={cls(perm, "og-perm-bubble", scope)} title={tip(perm, scope, permLabel(perm))} {...hoverProps(perm)}>
          {perm === "dms" ? (
            <button type="button" className="og-perm-edit" onClick={() => onDms(scope, title)}>
              {label(perm, scope)}
            </button>
          ) : (
            label(perm, scope)
          )}
          <button type="button" aria-label={`${permLabel(perm)} entfernen`} onClick={() => onRemove(perm)}>
            <Icon src={a.iconCloseDark} size={14} />
          </button>
        </span>
      ))}
      {!taken.length && emptyText ? <span className="og-perms-empty">{emptyText}</span> : null}
    </span>
  );
}

/** The add pill; its menu is portalled so the table's scroll box never clips it. */
function AddPerm({ options, onAdd }: { options: { id: string; label: string; hint: string }[]; onAdd: (perm: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const rect = btn.current.getBoundingClientRect();
    const height = menu.current?.offsetHeight ?? 0;
    const below = rect.bottom + 6 + height < window.innerHeight;
    setPos({ top: below ? rect.bottom + 6 : rect.top - 6 - height, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event.type === "mousedown" && (menu.current?.contains(event.target as Node) || btn.current?.contains(event.target as Node))) return;
      setOpen(false);
    };
    const key = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <>
      <button ref={btn} type="button" className="og-perm-add" disabled={!options.length} title={options.length ? undefined : "Alle Berechtigungen vergeben"} onClick={() => setOpen(!open)}>
        <Icon src={a.plusCircle} size={16} />
        Berechtigung hinzufügen
      </button>
      {open
        ? createPortal(
            <div ref={menu} className="og-perm-menu" style={{ top: pos.top, left: pos.left }} role="menu">
              {options.map((option) => (
                <button
                  type="button"
                  role="menuitem"
                  key={option.id}
                  onClick={() => {
                    onAdd(option.id);
                    setOpen(false);
                  }}
                >
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

const folderName = (name: string) => name.replace(/\{[^.}]*\.?([^}]*)\}/g, (_, field) => `‹${field || "Name"}›`);

/** DMS Zugriff: the DMS folder tree (Verwaltung view) with a checkbox per folder, or "Alle Ordner". */
function DmsPicker({ scope, title, onClose }: { scope: PermScope; title: string; onClose: () => void }) {
  const { state } = useDms();
  const current = useDmsAccess()[scope];
  const [all, setAll] = useState(current === "all");
  const [picked, setPicked] = useState<string[]>(Array.isArray(current) ? current : []);
  const vorlagen = state.vorlagen.filter((v) => v.ansichten.includes("Verwaltung"));
  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  useEffect(() => {
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const tree = (nodes: Knoten[], depth: number): React.ReactNode =>
    nodes.length ? (
      <ul className="og-dms-tree">
        {nodes.map((node) => (
          <li key={node.id}>
            <label className={all ? "og-dms-row disabled" : "og-dms-row"}>
              <input type="checkbox" disabled={all} checked={all || picked.includes(node.id)} onChange={() => toggle(node.id)} />
              <Icon src={a.folder} size={18} />
              {folderName(node.name)}
            </label>
            {depth < 2 ? tree(node.children, depth + 1) : null}
          </li>
        ))}
      </ul>
    ) : null;

  return createPortal(
    <div className="og-dms-backdrop" onMouseDown={onClose}>
      <div className="og-dms-modal" role="dialog" aria-label="DMS Zugriff" onMouseDown={(event) => event.stopPropagation()}>
        <header className="og-dms-head">
          <span>
            <strong>DMS Zugriff</strong>
            <small>{title}</small>
          </span>
          <button type="button" className="og-icon-btn" aria-label="Schließen" onClick={onClose}>
            <Icon src={a.iconCloseDark} size={18} />
          </button>
        </header>
        <label className={all ? "og-dms-all on" : "og-dms-all"}>
          <input type="checkbox" checked={all} onChange={() => setAll(!all)} />
          <span>
            <strong>Alle Ordner</strong>
            <small>Zugriff auf das ganze DMS, auch auf neue Ordner</small>
          </span>
        </label>
        <div className="og-dms-body">
          {vorlagen.map((vorlage) => (
            <section key={vorlage.id} className="og-dms-vorlage">
              <label className={all ? "og-dms-row root disabled" : "og-dms-row root"}>
                <input type="checkbox" disabled={all} checked={all || picked.includes(vorlage.root.id)} onChange={() => toggle(vorlage.root.id)} />
                <Icon src={a.folder} size={18} />
                {[...vorlage.mount, folderName(vorlage.root.name)].join(" / ")}
              </label>
              {tree(vorlage.root.children, 1)}
            </section>
          ))}
        </div>
        <footer className="og-dms-foot">
          <span className="dms-muted">{all ? "Alle Ordner" : `${picked.length} Ordner ausgewählt`}</span>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              org.setDms(scope, all ? "all" : picked);
              onClose();
            }}
          >
            Übernehmen
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
