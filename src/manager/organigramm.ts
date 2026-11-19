import { useEffect, useState } from "react";
import { ABTEILUNGEN, member } from "./hrmTeam";

/**
 * HRM → Settings → Organigramm. Its main job: who may grant holidays (Urlaub genehmigen).
 * H1 = Geschäftsführung (one group). H2 = the Abteilungen, all on the same level under H1.
 * H3 = "Weitere": people who work for the company but are not part of it. Five base groups always exist (Externe,
 * Ehemalige Mitarbeiter, Ehemalige externe Kooperationspartner, Bewerber aktiv / ehemalig); H3 people are Mitglied only.
 * People of a group are Mitglied; some hold Führung functions (Vorgesetzter, Leiter, Leiter Stv.), one person can hold
 * several (Philip Winter: Leiter and Vorgesetzter). Every H1 / H2 group always has a Vorgesetzter and a Leiter slot.
 * Admin → HRM Admin → Organigramm Berechtigungen reads the same groups (base Berechtigung per level + extras).
 */

export type OrgLevel = 1 | 2 | 3;
export type OrgRole = "mitglied" | "vorgesetzter" | "leiter" | "leiterStv";
/** A Führung function; a person without one is plain Mitglied. */
export type OrgFn = Exclude<OrgRole, "mitglied">;
export type OrgPerson = { name: string; fns: OrgFn[]; /** Not on the payroll: only in H3 groups. */ extern?: boolean; info?: string };
export type OrgGroup = { id: string; level: OrgLevel; /** H3 base groups: always there, not deletable. */ fixed?: boolean; name: string; people: OrgPerson[]; /** Admin: Berechtigungen of this group only, on top of its Ebene. */ extras: string[] };

export const ROLE_LABEL: Record<OrgRole, string> = { mitglied: "Mitglied", vorgesetzter: "Vorgesetzter", leiter: "Leiter", leiterStv: "Leiter Stv." };
export const ROLES: OrgRole[] = ["mitglied", "vorgesetzter", "leiter", "leiterStv"];
export const FNS: OrgFn[] = ["vorgesetzter", "leiter", "leiterStv"];
/** Every H1 / H2 group always has these functions. */
export const REQUIRED_FNS: OrgFn[] = ["vorgesetzter", "leiter"];
export const isLead = (person: OrgPerson) => person.fns.length > 0;
export const hasRole = (person: OrgPerson, role: OrgRole) => (role === "mitglied" ? !isLead(person) : person.fns.includes(role));

export const LEVEL_LABEL: Record<OrgLevel, string> = { 1: "H1", 2: "H2", 3: "H3" };

/**
 * Admin: one catalogue of Berechtigungen, given in three places:
 * Ebene (global, inherited by every group there), Gruppe (on top), Typ (Mitarbeiter or a Führung function).
 * A Typ Berechtigung is scoped: it applies only to the groups where the person holds that function, not to every
 * group – and you need not be Mitglied of the group. Leiter Stv. always handle the Urlaub of their group.
 */
export const BERECHTIGUNGEN: { id: string; label: string; hint: string }[] = [
  { id: "vollzugriff", label: "Vollzugriff HRM", hint: "Alle HRM-Bereiche sehen und bearbeiten" },
  { id: "urlaub", label: "Urlaub genehmigen", hint: "Urlaubsanträge bearbeiten" },
  { id: "dms", label: "DMS Zugriff", hint: "Ordner im DMS auswählen oder Alle" },
  { id: "antraege", label: "Anträge der Gruppe sehen", hint: "Urlaub, Homeoffice, Krankenstand der Gruppe" },
  { id: "kalender", label: "Kalender der Gruppe sehen", hint: "Termine und Abwesenheiten der Gruppe" },
  { id: "dokumente", label: "Dokumente der Gruppe sehen", hint: "HR-Dokumente der Gruppenmitglieder" },
  { id: "listen", label: "HRM Listen sehen", hint: "Dashboard & Listen im HRM" },
  { id: "anlegen", label: "Mitarbeiter anlegen", hint: "Neue Mitarbeiter und Bewerber anlegen" },
  { id: "personal", label: "Personalverrechnung", hint: "Gehälter und Abrechnungen" },
];
export const permLabel = (id: string) => BERECHTIGUNGEN.find((b) => b.id === id)?.label ?? id;

/** Typ layer: Mitarbeiter (every Mitglied) and the Führung functions of the Organigramm dropdown. */
export const TYPES: { role: OrgRole; label: string; group: "Mitarbeiter" | "Führung" }[] = [
  { role: "mitglied", label: "Mitarbeiter", group: "Mitarbeiter" },
  { role: "vorgesetzter", label: "Vorgesetzter", group: "Führung" },
  { role: "leiter", label: "Leiter", group: "Führung" },
  { role: "leiterStv", label: "Leiter Stv.", group: "Führung" },
];
/** Fixed rule: a Leiter Stv. may always handle the Urlaub of the group they stand in for (only that group). */
export const AUTO_TYPE_PERMS: Partial<Record<OrgRole, string[]>> = { leiterStv: ["urlaub"] };

/** Where a Berechtigung is given: "level:2", "group:<id>", "type:leiter". */
export type PermScope = string;
/** DMS Zugriff per scope: every folder, or the chosen folder ids. */
export type DmsAccess = "all" | string[];

let counter = 0;
const newId = () => `org-${Date.now().toString(36)}-${counter++}`;

function seed(): OrgGroup[] {
  const groups: OrgGroup[] = [];
  const top = ABTEILUNGEN.find((dept) => dept.name === "Unternehmensführung");
  const BOSS = "Philip Winter";
  groups.push({
    id: "h1",
    level: 1,
    name: "Geschäftsführung",
    // Geschäftsführung = Unternehmensführung plus Silvia Fischbacher (also Leiterin Schaden & Leistung).
    people: [...(top?.people ?? []), "Silvia Fischbacher"].map((name) => ({
      name,
      fns: name === BOSS ? ["vorgesetzter", "leiter"] : name === "Wolfgang Stadlhofer" ? ["leiterStv"] : [],
    })),
    extras: [],
  });
  for (const dept of ABTEILUNGEN) {
    if (dept.bewerber || dept === top) continue;
    const people: OrgPerson[] = dept.people.map((name) => ({ name, fns: [] }));
    const give = (name: string, fn: OrgFn) => {
      const inGroup = people.find((p) => p.name === name);
      if (inGroup) inGroup.fns = [...new Set([...inGroup.fns, fn])];
      else people.unshift({ name, fns: [fn] });
    };
    for (const line of dept.lead) {
      const [kind, who] = line.split(":").map((part) => part.trim());
      if (!who || !member(who)) continue;
      give(who, /vorgesetzt/i.test(kind) ? "vorgesetzter" : "leiter");
    }
    // KFZ: Silvia Fischbacher (Leiterin Schaden & Leistung) is Vorgesetzte, Reinhard Fritz Leiter Stv.
    if (dept.name === "Fachabteilung KFZ-Versicherungen") {
      give("Silvia Fischbacher", "vorgesetzter");
      give("Reinhard Fritz", "leiterStv");
    }
    // Every Abteilung has a Leiter and a Vorgesetzter: without a named Leiter the first Mitglied leads,
    // without a Vorgesetzter it is the Geschäftsführer (who need not be Mitglied).
    if (!people.some((p) => p.fns.includes("leiter"))) {
      const first = people.find((p) => !p.fns.length);
      if (first) first.fns = ["leiter"];
    }
    if (!people.some((p) => p.fns.includes("vorgesetzter"))) give(BOSS, "vorgesetzter");
    // Bigger teams have a Stellvertretung: the first plain Mitglied.
    if (people.length >= 6 && dept.name !== "Fachabteilung KFZ-Versicherungen") {
      const stv = people.find((p) => !p.fns.length);
      if (stv) stv.fns = ["leiterStv"];
    }
    groups.push({ id: `h2-${groups.length}`, level: 2, name: dept.name, people, extras: [] });
  }
  // H3 "Weitere": these five always exist (cannot be deleted); everyone in them is Mitglied only.
  const ext = (name: string, info: string): OrgPerson => ({ name, fns: [], extern: true, info });
  groups.push(
    { id: "h3-extern", level: 3, fixed: true, name: "Externe \"Mitarbeiter\" / Kooperationspartner", people: [ext("Richard Zechmann", "Kooperationspartner"), ext("Thomas Reingruber", "Kooperationspartner")], extras: [] },
    { id: "h3-ehemalig", level: 3, fixed: true, name: "Ehemalige Mitarbeiter (Abteilung)", people: [ext("Lindner Paul", "Ehemals Kundenberater"), ext("Hofmann Eva", "Ehemals Office-Management")], extras: [] },
    { id: "h3-ehemalig-extern", level: 3, fixed: true, name: "Ehemalige externe Kooperationspartner (Abteilung)", people: [ext("Wieser Thomas", "Ehemals freier Vermittler")], extras: [] },
    { id: "h3-bewerber", level: 3, fixed: true, name: "Bewerber (aktiv)", people: [ext("Benjamin Atkinson", "Bewerber"), ext("Lena Hofbauer", "Bewerber"), ext("Maximilian Steiner", "Bewerber Potential")], extras: [] },
    { id: "h3-bewerber-ehemalig", level: 3, fixed: true, name: "Bewerber (ehemalig)", people: [ext("Pichler Sandra", "Bewerbung 2025")], extras: [] },
  );
  return groups;
}

type OrgStore = {
  groups: OrgGroup[];
  /** Global Berechtigungen per Ebene, inherited by every group of that Ebene. */
  levels: Record<OrgLevel, string[]>;
  types: Record<OrgRole, string[]>;
  dms: Record<PermScope, DmsAccess>;
  listeners: Set<() => void>;
};
/** One store per page, kept on globalThis so a hot reload of this module never splits it (buttons and lists stay in sync). */
const S: OrgStore = ((globalThis as { __winoOrganigramm?: OrgStore }).__winoOrganigramm ??= {
  groups: seed(),
  levels: { 1: ["vollzugriff", "dms"], 2: ["antraege", "kalender", "listen"], 3: [] },
  types: { mitglied: [], vorgesetzter: ["urlaub"], leiter: ["urlaub"], leiterStv: [] },
  dms: { "level:1": "all" },
  listeners: new Set(),
});
const notify = () => S.listeners.forEach((listener) => listener());

function set(next: OrgGroup[]) {
  S.groups = next;
  notify();
}

function useStore<T>(read: () => T): T {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    S.listeners.add(listener);
    return () => {
      S.listeners.delete(listener);
    };
  }, []);
  return read();
}

export const useOrganigramm = () => useStore(() => S.groups);
export const useLevelPerms = () => useStore(() => S.levels);
export const useTypePerms = () => useStore(() => S.types);
export const useDmsAccess = () => useStore(() => S.dms);

const patch = (id: string, change: (group: OrgGroup) => OrgGroup) => set(S.groups.map((group) => (group.id === id ? change(group) : group)));

export const org = {
  rename: (id: string, name: string) => patch(id, (g) => ({ ...g, name })),
  addGroup: (level: 2 | 3) => {
    const group: OrgGroup = { id: newId(), level, name: level === 2 ? "Neue Abteilung" : "Neue Gruppe", people: [], extras: [] };
    set([...S.groups, group]);
    return group.id;
  },
  removeGroup: (id: string) => set(S.groups.filter((g) => g.id !== id || g.fixed)),
  addPerson: (id: string, person: OrgPerson) =>
    patch(id, (g) => (g.people.some((p) => p.name === person.name) ? g : { ...g, people: [...g.people, person] })),
  /** Swap a person in place (keeps the functions). */
  replacePerson: (id: string, name: string, next: OrgPerson) =>
    patch(id, (g) => (g.people.some((p) => p.name === next.name) ? g : { ...g, people: g.people.map((p) => (p.name === name ? { ...next, fns: p.fns } : p)) })),
  removePerson: (id: string, name: string) => patch(id, (g) => ({ ...g, people: g.people.filter((p) => p.name !== name) })),
  setFns: (id: string, name: string, fns: OrgFn[]) =>
    patch(id, (g) => ({ ...g, people: g.people.map((p) => (p.name === name ? { ...p, fns: FNS.filter((fn) => fns.includes(fn)) } : p)) })),
  /** Fill a function slot: the person gets it (added to the group if not in it yet). */
  assign: (id: string, person: OrgPerson, fn: OrgFn) =>
    patch(id, (g) =>
      g.people.some((p) => p.name === person.name)
        ? { ...g, people: g.people.map((p) => (p.name === person.name ? { ...p, fns: FNS.filter((f) => f === fn || p.fns.includes(f)) } : p)) }
        : { ...g, people: [{ ...person, fns: [fn] }, ...g.people] },
    ),
  addGroupPerm: (id: string, perm: string) => patch(id, (g) => (g.extras.includes(perm) ? g : { ...g, extras: [...g.extras, perm] })),
  removeGroupPerm: (id: string, perm: string) => patch(id, (g) => ({ ...g, extras: g.extras.filter((e) => e !== perm) })),
  /** Added to the Ebene: every group there inherits it, so it leaves the groups' own list. */
  addLevelPerm: (level: OrgLevel, perm: string) => {
    if (S.levels[level].includes(perm)) return;
    S.levels = { ...S.levels, [level]: [...S.levels[level], perm] };
    set(S.groups.map((g) => (g.level === level ? { ...g, extras: g.extras.filter((e) => e !== perm) } : g)));
  },
  removeLevelPerm: (level: OrgLevel, perm: string) => {
    S.levels = { ...S.levels, [level]: S.levels[level].filter((p) => p !== perm) };
    notify();
  },
  addTypePerm: (role: OrgRole, perm: string) => {
    if (S.types[role].includes(perm)) return;
    S.types = { ...S.types, [role]: [...S.types[role], perm] };
    notify();
  },
  removeTypePerm: (role: OrgRole, perm: string) => {
    S.types = { ...S.types, [role]: S.types[role].filter((p) => p !== perm) };
    notify();
  },
  setDms: (scope: PermScope, access: DmsAccess) => {
    S.dms = { ...S.dms, [scope]: access };
    notify();
  },
};

/**
 * Who may handle the Urlaub of a group: people with a Führung function in that group whose Typ has
 * "Urlaub genehmigen" (Leiter Stv. always). Ebene / Gruppe Berechtigungen do not grant it for other groups.
 */
export function urlaubApprovers(group: OrgGroup) {
  return group.people.filter((p) => p.fns.some((fn) => S.types[fn].includes("urlaub") || AUTO_TYPE_PERMS[fn]?.includes("urlaub")));
}

/** The Führung of a group (Vorgesetzter, Leiter, Leiter Stv.). */
export const leadsOf = (group: OrgGroup) => group.people.filter(isLead);
/** Function slots of an H1 / H2 group nobody holds yet. */
export const missingFns = (group: OrgGroup) => (group.level === 3 ? [] : REQUIRED_FNS.filter((fn) => !group.people.some((p) => p.fns.includes(fn))));
