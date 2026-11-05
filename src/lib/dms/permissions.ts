import type { Berechtigung, DmsPerson, DmsState, Dokument, Gruppe, Level, Principal } from "../../types/dms";
import { formatPath } from "./placeholders";
import type { FolderNode } from "./views";

/**
 * Permissions are allow-only and inherited downward: the effective level on a folder is the highest level any
 * matching rule grants on that folder or above. There are no deny rules, so access can always be explained.
 */

export const LEVELS: Level[] = ["Sehen", "Bearbeiten", "Verwalten"];
const rank = (level: Level | null) => (level === null ? -1 : LEVELS.indexOf(level));
export const maxLevel = (a: Level | null, b: Level | null) => (rank(a) >= rank(b) ? a : b);
export const atLeast = (level: Level | null, needed: Level) => rank(level) >= rank(needed);

type Directory = { people: DmsPerson[]; groups: Gruppe[] };

export function principalMatches(principal: Principal, person: DmsPerson, groups: Gruppe[]) {
  switch (principal.kind) {
    case "Alle":
      return true;
    case "Person":
      return principal.id === person.id;
    case "Rolle":
      return person.rollen.includes(principal.id);
    case "Gruppe":
      return groups.some((g) => g.id === principal.id && g.members.includes(person.id));
  }
}

export function principalLabel(principal: Principal, dir: Directory) {
  switch (principal.kind) {
    case "Alle":
      return "Alle";
    case "Person":
      return dir.people.find((p) => p.id === principal.id)?.name ?? principal.id;
    case "Rolle":
      return `Rolle ${principal.id}`;
    case "Gruppe":
      return dir.groups.find((g) => g.id === principal.id)?.name ?? principal.id;
  }
}

/** A permission together with the folder it is set on. */
export type InheritedPermission = Berechtigung & { from: string[] };

/** The folders from the top of the view down to `path`; null when the path does not exist. */
export function folderChain(view: FolderNode[], path: string[]): FolderNode[] | null {
  const chain: FolderNode[] = [];
  let list = view;
  for (let i = 0; i < path.length; i += 1) {
    const key = path.slice(0, i + 1).join("/");
    const next = list.find((f) => f.key === key);
    if (!next) return null;
    chain.push(next);
    list = next.children;
  }
  return chain;
}

export function inheritedPermissions(chain: FolderNode[]): InheritedPermission[] {
  return chain.flatMap((folder) => folder.permissions.map((p) => ({ ...p, from: folder.path })));
}

export function levelFrom(perms: InheritedPermission[], person: DmsPerson, groups: Gruppe[]): Level | null {
  return perms.reduce<Level | null>((best, p) => (principalMatches(p.principal, person, groups) ? maxLevel(best, p.level) : best), null);
}

export function effectiveLevel(view: FolderNode[], path: string[], person: DmsPerson, groups: Gruppe[]) {
  const chain = folderChain(view, path);
  return chain ? levelFrom(inheritedPermissions(chain), person, groups) : null;
}

/**
 * Vertraulich overrides the folder: only the named persons see the document (at least Sehen, more if the
 * folder grants it). Everyone else, admins included, does not.
 */
export function documentLevel(doc: Dokument, folderLevel: Level | null, person: DmsPerson): Level | null {
  if (doc.vertraulich) return doc.vertraulich.includes(person.id) ? maxLevel(folderLevel, "Sehen") : null;
  return folderLevel;
}

/**
 * The view as one person sees it. Folders without access are removed unless something below is visible; such
 * folders stay as a way through (level null) and show no documents. With `lockConfidential` (Verwaltung) a
 * vertraulich document the person may not open stays listed as locked, so nothing silently disappears.
 */
export function filterView(
  view: FolderNode[],
  person: DmsPerson,
  groups: Gruppe[],
  options: { lockConfidential?: boolean } = {},
): FolderNode[] {
  function visit(list: FolderNode[], inherited: InheritedPermission[]): FolderNode[] {
    const out: FolderNode[] = [];
    for (const folder of list) {
      const perms = [...inherited, ...folder.permissions.map((p) => ({ ...p, from: folder.path }))];
      const level = levelFrom(perms, person, groups);
      const children = visit(folder.children, perms);
      const docs = level === null ? [] : folder.docs.filter((doc) => documentLevel(doc, level, person) !== null);
      const locked =
        level !== null && options.lockConfidential
          ? folder.docs.filter((doc) => doc.vertraulich && documentLevel(doc, level, person) === null)
          : [];
      if (level === null && children.length === 0) continue;
      const shown = [...docs, ...locked];
      const ids = new Set(shown.map((d) => d.id));
      const countBelow = (nodes: FolderNode[]) => nodes.forEach((c) => (c.docs.forEach((d) => ids.add(d.id)), countBelow(c.children)));
      countBelow(children);
      out.push({
        ...folder,
        level,
        docs: shown,
        lockedIds: locked.map((d) => d.id),
        staleIds: folder.staleIds.filter((id) => ids.has(id)),
        children,
        count: ids.size,
      });
    }
    return out;
  }
  return visit(view, []);
}

export type AccessEntry = {
  person: DmsPerson;
  level: Level;
  /** Readable reason, e.g. "Backoffice · geerbt von Kunden / Dr. Maria Gruber". */
  via: string;
  inherited: boolean;
};

/**
 * "Wer hat Zugriff?" for a folder: every person with their effective level and where it comes from, with
 * inheritance resolved. The strongest rule is named; ties prefer a rule set on the folder itself.
 */
export function whoHasAccess(view: FolderNode[], path: string[], dir: Directory): AccessEntry[] {
  const chain = folderChain(view, path);
  if (!chain) return [];
  const perms = inheritedPermissions(chain);
  const here = path.join("/");
  const entries: AccessEntry[] = [];
  for (const person of dir.people) {
    let best: InheritedPermission | null = null;
    for (const p of perms) {
      if (!principalMatches(p.principal, person, dir.groups)) continue;
      const better = !best || rank(p.level) > rank(best.level) || (p.level === best.level && p.from.length > best.from.length);
      if (better) best = p;
    }
    if (!best) continue;
    const inherited = best.from.join("/") !== here;
    entries.push({
      person,
      level: best.level,
      inherited,
      via: `${principalLabel(best.principal, dir)}${inherited ? ` · geerbt von ${formatPath(best.from)}` : ""}`,
    });
  }
  return entries.sort((a, b) => rank(b.level) - rank(a.level) || a.person.name.localeCompare(b.person.name, "de"));
}

/** Everyone who can see one document in a folder (vertraulich applied). */
export function canSeeDocument(view: FolderNode[], path: string[], doc: Dokument, person: DmsPerson, groups: Gruppe[]) {
  return documentLevel(doc, effectiveLevel(view, path, person, groups), person) !== null;
}

export const personOf = (state: Pick<DmsState, "people">, id: string) => state.people.find((p) => p.id === id);
