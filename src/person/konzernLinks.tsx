import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { COMPANY_DIRECTORY } from "./company";
import { FILE_PARTNERS, type PartnerId } from "./partners";

export type PartyKind = "person" | "company";

export type KonzernLink = {
  id: string;
  groupId: string;
  ownerId: string;
  ownerKind: PartyKind;
  targetId: string | null;
  targetKind: PartyKind | null;
  label: string;
  accepted: boolean;
  published?: boolean;
  /** Person-side Ablehnen hides the Vorschlag without dropping the company membership. */
  declined?: boolean;
};

export type KonzernGroup = {
  id: string;
  konzernId: string | null;
};

type State = {
  groups: KonzernGroup[];
  links: KonzernLink[];
};

const STORAGE_KEY = "wino.konzernLinks.v1";

/**
 * Lunixo Holding is already Konzern for Lunixo AG. Julia was added from the company
 * side, so her Konzern tab only sees a Vorschlag until she accepts.
 */
function suggestionLink(
  id: string,
  groupId: string,
  ownerId: string,
  ownerKind: PartyKind,
  targetId: string,
  targetKind: PartyKind,
  label: string,
): KonzernLink {
  return {
    id,
    groupId,
    ownerId,
    ownerKind,
    targetId,
    targetKind,
    label,
    accepted: false,
    published: true,
  };
}

const SEED: State = {
  groups: [
    { id: "grp-lunixo", konzernId: "lunixo-holding" },
    { id: "grp-sug-alpine", konzernId: "alpine-cover" },
    { id: "grp-sug-sommer", konzernId: "sommer" },
    { id: "grp-sug-winter", konzernId: "winter-holding" },
    { id: "grp-sug-marcus", konzernId: null },
    { id: "grp-sug-karl", konzernId: null },
    { id: "grp-sug-julia-alpine", konzernId: "alpine-cover" },
    { id: "grp-sug-julia-sommer", konzernId: "sommer" },
    { id: "grp-sug-julia-winter", konzernId: "winter-holding" },
  ],
  links: [
    {
      id: "kl-holding",
      groupId: "grp-lunixo",
      ownerId: "lunixo",
      ownerKind: "company",
      targetId: "lunixo-holding",
      targetKind: "company",
      label: "Konzern: Lunixo Holding",
      accepted: true,
      published: true,
    },
    {
      id: "kl-ag",
      groupId: "grp-lunixo",
      ownerId: "lunixo",
      ownerKind: "company",
      targetId: "lunixo",
      targetKind: "company",
      label: "Lunixo AG",
      accepted: true,
      published: true,
    },
    {
      id: "kl-immo",
      groupId: "grp-lunixo",
      ownerId: "lunixo",
      ownerKind: "company",
      targetId: "lunixo-immobilien",
      targetKind: "company",
      label: "Lunixo Immobilien GmbH",
      accepted: true,
      published: true,
    },
    {
      id: "kl-julia",
      groupId: "grp-lunixo",
      ownerId: "lunixo",
      ownerKind: "company",
      targetId: "julia",
      targetKind: "person",
      label: "Julia Atkinson",
      accepted: false,
      published: true,
    },
    suggestionLink("kl-sug-alpine", "grp-sug-alpine", "alpine-cover", "company", "lunixo", "company", "Beteiligung"),
    suggestionLink("kl-sug-sommer", "grp-sug-sommer", "sommer", "company", "lunixo", "company", "Kooperation"),
    suggestionLink("kl-sug-winter", "grp-sug-winter", "winter-holding", "company", "lunixo", "company", "Gesellschafter"),
    suggestionLink("kl-sug-marcus", "grp-sug-marcus", "marcus", "person", "lunixo", "company", "Geschäftsführung"),
    suggestionLink("kl-sug-karl", "grp-sug-karl", "karl", "person", "lunixo", "company", "Aufsichtsrat"),
    suggestionLink("kl-sug-julia-alpine", "grp-sug-julia-alpine", "alpine-cover", "company", "julia", "person", "Beteiligung"),
    suggestionLink("kl-sug-julia-sommer", "grp-sug-julia-sommer", "sommer", "company", "julia", "person", "Kooperation"),
    suggestionLink("kl-sug-julia-winter", "grp-sug-julia-winter", "winter-holding", "company", "julia", "person", "Gesellschafter"),
  ],
};

export function isPublished(link: KonzernLink) {
  return link.published !== false;
}

function isEmptyDraft(link: KonzernLink) {
  return !isPublished(link) && !link.targetId && !link.label.trim();
}

function comparable(state: State) {
  return JSON.stringify({
    groups: state.groups,
    links: state.links.filter((link) => !isEmptyDraft(link)),
  });
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as State) : SEED;
    const links = parsed.links.map((link) => ({ ...link, published: link.published !== false }));
    for (const seed of SEED.links) {
      const exists = links.some(
        (link) =>
          link.id === seed.id ||
          (link.ownerId === seed.ownerId &&
            link.ownerKind === seed.ownerKind &&
            link.targetId === seed.targetId &&
            link.targetKind === seed.targetKind),
      );
      if (!exists) links.push({ ...seed });
    }
    const groups = parsed.groups.length ? parsed.groups : structuredClone(SEED.groups);
    for (const seed of SEED.groups) {
      if (!groups.some((group) => group.id === seed.id)) groups.push({ ...seed });
    }
    return { groups, links };
  } catch {
    return SEED;
  }
}

export function isFilePartner(id: string): id is PartnerId {
  return id in FILE_PARTNERS;
}

const EXTRA_PARTIES = new Map<string, { name: string; kind: PartyKind }>();

export function partyKindOf(id: string): PartyKind {
  if (isFilePartner(id) && FILE_PARTNERS[id].fileKind === "company") return "company";
  if (COMPANY_DIRECTORY.some((company) => company.id === id)) return "company";
  return EXTRA_PARTIES.get(id)?.kind ?? "person";
}

export function rememberParty(name: string, kind: PartyKind) {
  const id = `${kind === "company" ? "co" : "pe"}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  EXTRA_PARTIES.set(id, { name, kind });
  return id;
}

export function partyName(id: string) {
  if (isFilePartner(id)) return FILE_PARTNERS[id].name;
  const extra = EXTRA_PARTIES.get(id);
  if (extra) return extra.name;
  return COMPANY_DIRECTORY.find((company) => company.id === id)?.name ?? id;
}

export function partyMeta(id: string) {
  if (isFilePartner(id)) {
    const partner = FILE_PARTNERS[id];
    return partner.fileKind === "company" ? (partner.fn ? `FN ${partner.fn}` : "") : (partner.born ?? "");
  }
  const company = COMPANY_DIRECTORY.find((entry) => entry.id === id);
  return company?.fn ? `FN ${company.fn}` : company?.city ?? "";
}

/** Company partners actually on the list — never empty drafts, Vorschläge, or person-only membership. */
export function konzernTabCount(
  links: KonzernLink[],
  partyId: string,
  kind: PartyKind,
  groups: KonzernGroup[] = [],
) {
  if (kind === "company") {
    const ids = new Set<string>();
    for (const link of links) {
      if (!isPublished(link) || !link.targetId || link.declined) continue;
      if (link.ownerId === partyId && link.ownerKind === "company" && link.targetKind === "company") {
        ids.add(link.targetId);
      }
      if (
        link.targetId === partyId &&
        link.targetKind === "company" &&
        link.accepted &&
        link.ownerId !== partyId &&
        link.ownerKind === "company"
      ) {
        ids.add(link.ownerId);
      }
    }
    return ids.size;
  }
  return personKonzernCards(groups, links, partyId).length;
}

export function partyChip(id: string) {
  if (isFilePartner(id)) {
    const kind = FILE_PARTNERS[id].kind ?? "interessent";
    if (kind === "interessent") return "Interessent";
    if (kind === "kunde") return "Kunde";
    return FILE_PARTNERS[id].fileKind === "company" ? "Interessent" : "Einfache Person";
  }
  return "Interessent";
}

type Store = {
  groups: KonzernGroup[];
  links: KonzernLink[];
  groupOf: (partyId: string, kind: PartyKind) => KonzernGroup | undefined;
  confirmedFor: (partyId: string, kind: PartyKind) => KonzernLink[];
  suggestionsFor: (partyId: string, kind: PartyKind) => KonzernLink[];
  startDraft: (ownerId: string, ownerKind: PartyKind) => string;
  updateLabel: (id: string, label: string) => void;
  setTarget: (id: string, targetId: string, targetKind: PartyKind, asKonzern?: boolean) => void;
  accept: (id: string) => void;
  decline: (id: string) => void;
  unaccept: (id: string) => void;
  remove: (id: string) => void;
  /** Person-side Auflösen: drop confirmed Konzern without deleting the company-side membership. */
  unlink: (id: string, viewerId: string, viewerKind: PartyKind) => { unaccepted: string[]; removed: KonzernLink[] };
  restore: (link: KonzernLink) => void;
  setKonzern: (companyId: string) => boolean;
  snapshot: () => void;
  commitSnapshot: () => void;
  revert: () => void;
  publish: (ownerId: string, ownerKind: PartyKind) => void;
  isDirty: () => boolean;
  hasPublishable: (ownerId: string, ownerKind: PartyKind) => boolean;
};

function touches(link: KonzernLink, partyId: string, kind: PartyKind) {
  return (
    (link.ownerId === partyId && link.ownerKind === kind) ||
    (link.targetId === partyId && link.targetKind === kind)
  );
}

/** Companies this person added or accepted — never siblings from someone else's Konzern. */
export function personKonzernCards(groups: KonzernGroup[], links: KonzernLink[], personId: string): KonzernLink[] {
  const cards: KonzernLink[] = [];
  const seen = new Set<string>();
  const add = (companyId: string | null | undefined, link: KonzernLink) => {
    if (!companyId || seen.has(companyId)) return;
    seen.add(companyId);
    cards.push({ ...link, targetId: companyId, targetKind: "company" });
  };
  for (const link of links) {
    if (!isPublished(link) || link.declined || !link.targetId) continue;
    if (link.ownerId === personId && link.ownerKind === "person" && link.targetKind === "company") {
      add(link.targetId, link);
    }
    if (link.targetId === personId && link.targetKind === "person" && link.accepted && link.ownerId !== personId) {
      add(counterpartId(link, personId, groups, links), link);
    }
  }
  return cards;
}

/** Confirmed Konzern partners shown on the person/company overview cards. */
export function overviewKonzernLinks(
  groups: KonzernGroup[],
  links: KonzernLink[],
  partyId: string,
  kind: PartyKind,
) {
  const group = establishedGroupOf({ groups, links }, partyId, kind);
  if (kind === "person") {
    return personKonzernCards(groups, links, partyId).sort((left, right) => {
      const leftKonzern = left.targetId === group?.konzernId ? 0 : 1;
      const rightKonzern = right.targetId === group?.konzernId ? 0 : 1;
      if (leftKonzern !== rightKonzern) return leftKonzern - rightKonzern;
      return partyName(left.targetId ?? "").localeCompare(partyName(right.targetId ?? ""));
    });
  }
  const incoming = links
    .filter(
      (link) =>
        link.targetId === partyId &&
        link.targetKind === kind &&
        link.accepted &&
        isPublished(link) &&
        link.ownerId !== partyId,
    )
    .flatMap((link) => {
      const sourceId = counterpartId(link, partyId, groups, links);
      if (!sourceId || sourceId === partyId) return [];
      return [{ ...link, targetId: sourceId, targetKind: partyKindOf(sourceId) }];
    });
  const groupLinks = links.filter((link) => group && link.groupId === group.id && link.targetId && isPublished(link));
  return [...groupLinks, ...incoming]
    .filter((link, index, all) => Boolean(link.targetId) && all.findIndex((entry) => entry.targetId === link.targetId) === index)
    .sort((left, right) => {
      const leftKonzern = left.targetId === group?.konzernId ? 0 : 1;
      const rightKonzern = right.targetId === group?.konzernId ? 0 : 1;
      if (leftKonzern !== rightKonzern) return leftKonzern - rightKonzern;
      if (left.targetKind !== right.targetKind) return left.targetKind === "company" ? -1 : 1;
      return partyName(left.targetId ?? "").localeCompare(partyName(right.targetId ?? ""));
    });
}

/** The other party on this link, from the viewer's side (incoming Vorschläge use the owner / their Konzern). */
export function counterpartId(
  link: KonzernLink,
  viewerId: string,
  groups: KonzernGroup[],
  links: KonzernLink[] = [],
) {
  if (link.ownerId === viewerId) return link.targetId;
  if (link.ownerKind !== "company") return link.ownerId;
  if (groups.some((group) => group.konzernId === link.ownerId)) return link.ownerId;
  const home = groups.find(
    (group) =>
      group.konzernId &&
      group.konzernId !== viewerId &&
      links.some(
        (entry) =>
          entry.groupId === group.id &&
          isPublished(entry) &&
          entry.targetId === link.ownerId &&
          entry.targetKind === "company",
      ),
  );
  if (home?.konzernId) return home.konzernId;
  const linkGroup = groups.find((group) => group.id === link.groupId);
  if (linkGroup?.konzernId && linkGroup.konzernId !== viewerId) return linkGroup.konzernId;
  return link.ownerId;
}

function establishedGroupOf(state: State, partyId: string, kind: PartyKind) {
  return (
    state.groups.find((group) => kind === "company" && group.konzernId === partyId) ??
    state.groups.find((group) =>
      state.links.some(
        (link) =>
          link.groupId === group.id &&
          isPublished(link) &&
          ((link.ownerId === partyId && link.ownerKind === kind && Boolean(link.targetId)) ||
            (link.targetId === partyId && link.targetKind === kind && link.accepted)),
      ),
    )
  );
}

function hasMembership(links: KonzernLink[], groupId: string, sourceId: string, sourceKind: PartyKind) {
  return links.some(
    (link) =>
      link.groupId === groupId && isPublished(link) && link.targetId === sourceId && link.targetKind === sourceKind,
  );
}

function detachPersonFromGroup(state: State, personId: string, groupId: string): { next: State; unaccepted: string[]; removed: KonzernLink[] } {
  const unaccepted: string[] = [];
  const removed: KonzernLink[] = [];
  const links = state.links.flatMap((link) => {
    if (
      link.groupId === groupId &&
      link.targetId === personId &&
      link.targetKind === "person" &&
      isPublished(link)
    ) {
      unaccepted.push(link.id);
      return [{ ...link, accepted: false, declined: false }];
    }
    if (
      link.groupId === groupId &&
      link.ownerId === personId &&
      link.ownerKind === "person" &&
      isPublished(link)
    ) {
      removed.push(link);
      return [];
    }
    return [link];
  });
  return { next: { ...state, links }, unaccepted, removed };
}

/** After Übernehmen, the accepted party becomes a real member of the viewer's Konzern. */
function takeInMembership(state: State, incoming: KonzernLink): State {
  if (!incoming.targetId || !incoming.targetKind) return state;
  const sourceId = counterpartId(incoming, incoming.targetId, state.groups, state.links);
  if (!sourceId || sourceId === incoming.targetId) {
    return {
      ...state,
      links: state.links.map((link) =>
        link.id === incoming.id ? { ...link, accepted: true, declined: false } : link,
      ),
    };
  }
  const sourceKind = partyKindOf(sourceId);
  const acceptIncoming = (groupId: string) =>
    state.links.map((link) =>
      link.id === incoming.id ? { ...link, groupId, accepted: true, declined: false } : link,
    );

  if (incoming.targetKind === "person") {
    const groupId = incoming.groupId;
    const links = acceptIncoming(groupId);
    const already = links.some(
      (link) =>
        isPublished(link) &&
        link.ownerId === incoming.targetId &&
        link.ownerKind === "person" &&
        link.targetId === sourceId,
    );
    if (!already) {
      links.push({
        id: `kl-acc-${incoming.id}`,
        groupId,
        ownerId: incoming.targetId,
        ownerKind: "person",
        targetId: sourceId,
        targetKind: sourceKind,
        label: incoming.label || partyName(sourceId),
        accepted: true,
        published: true,
      });
    }
    return { ...state, links };
  }

  const viewerGroup = establishedGroupOf(state, incoming.targetId, incoming.targetKind);
  const groupId = viewerGroup?.id ?? incoming.groupId;
  const links = acceptIncoming(groupId);
  if (!hasMembership(links, groupId, sourceId, sourceKind)) {
    links.push({
      id: `kl-acc-${incoming.id}`,
      groupId,
      ownerId: incoming.targetId,
      ownerKind: incoming.targetKind,
      targetId: sourceId,
      targetKind: sourceKind,
      label: incoming.label || partyName(sourceId),
      accepted: true,
      published: true,
    });
  }
  return { ...state, links };
}

const KonzernLinksContext = createContext<Store | null>(null);

export function KonzernLinksProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(loadState);
  const snapshotRef = useRef<State>(state);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<Store>(
    () => ({
      groups: state.groups,
      links: state.links,
      groupOf: (partyId, kind) => establishedGroupOf(state, partyId, kind),
      confirmedFor: (partyId, kind) =>
        state.links.filter((link) => {
          if (link.targetId === null) return false;
          if (link.ownerId === partyId && link.ownerKind === kind) return isPublished(link);
          return link.targetId === partyId && link.targetKind === kind && link.accepted && isPublished(link);
        }),
      suggestionsFor: (partyId, kind) => {
        const ownGroup = establishedGroupOf(state, partyId, kind);
        const acceptedHere = state.links.some(
          (link) =>
            isPublished(link) &&
            link.accepted &&
            ((link.targetId === partyId && link.targetKind === kind) ||
              (link.ownerId === partyId && link.ownerKind === kind && Boolean(link.targetId))),
        );
        const already = new Set<string>();
        if (kind === "person") {
          for (const card of personKonzernCards(state.groups, state.links, partyId)) {
            if (card.targetId) already.add(card.targetId);
          }
        } else {
          if (acceptedHere && ownGroup?.konzernId) already.add(ownGroup.konzernId);
          for (const link of state.links) {
            if (link.ownerId === partyId && link.ownerKind === kind && isPublished(link) && link.targetId) {
              already.add(link.targetId);
            }
          }
        }
        const seen = new Set<string>();
        return state.links.filter((link) => {
          if (link.targetId !== partyId || link.targetKind !== kind) return false;
          if (link.accepted || link.declined || !isPublished(link)) return false;
          if (link.ownerId === partyId) return false;
          const incomingGroup = state.groups.find((group) => group.id === link.groupId);
          if (ownGroup && incomingGroup?.konzernId === partyId) return false;
          // On a company file, hide parties already in this Konzern. On a person
          // file those siblings are not on her list — only her confirmed Konzern is.
          if (
            kind === "company" &&
            ownGroup &&
            acceptedHere &&
            state.links.some(
              (entry) =>
                entry.groupId === ownGroup.id &&
                isPublished(entry) &&
                touches(entry, link.ownerId, link.ownerKind),
            )
          ) {
            return false;
          }
          const sourceId = counterpartId(link, partyId, state.groups, state.links);
          if (!sourceId || sourceId === partyId || already.has(sourceId)) return false;
          if (seen.has(sourceId)) return false;
          seen.add(sourceId);
          return true;
        });
      },
      startDraft: (ownerId, ownerKind) => {
        const id = `kl-${Date.now()}`;
        const groupId = `grp-${Date.now()}`;
        setState((prev) => {
          const existing = prev.groups.find(
            (group) =>
              (ownerKind === "company" && group.konzernId === ownerId) ||
              prev.links.some(
                (link) =>
                  link.groupId === group.id &&
                  isPublished(link) &&
                  ((link.ownerId === ownerId && link.ownerKind === ownerKind && Boolean(link.targetId)) ||
                    (link.targetId === ownerId && link.targetKind === ownerKind && link.accepted)),
              ),
          );
          const nextGroupId = existing?.id ?? groupId;
          return {
            groups: existing ? prev.groups : [...prev.groups, { id: nextGroupId, konzernId: null }],
            links: [
              ...prev.links.filter(
                (link) => !(link.ownerId === ownerId && link.ownerKind === ownerKind && !isPublished(link) && !link.targetId),
              ),
              {
                id,
                groupId: nextGroupId,
                ownerId,
                ownerKind,
                targetId: null,
                targetKind: null,
                label: "",
                accepted: true,
                published: false,
              },
            ],
          };
        });
        return id;
      },
      updateLabel: (id, label) =>
        setState((prev) => ({
          ...prev,
          links: prev.links.map((link) => (link.id === id ? { ...link, label } : link)),
        })),
      setTarget: (id, targetId, targetKind, asKonzern) =>
        setState((prev) => {
          const current = prev.links.find((link) => link.id === id);
          if (!current) return prev;
          const targetGroup =
            targetKind === "company"
              ? prev.groups.find(
                  (group) =>
                    group.konzernId === targetId ||
                    prev.links.some((link) => link.groupId === group.id && touches(link, targetId, "company")),
                )
              : undefined;
          const groupId = targetGroup?.id ?? current.groupId;
          const firstCompany = !prev.groups.find((group) => group.id === groupId)?.konzernId && targetKind === "company";
          const makeKonzern = Boolean(asKonzern || firstCompany);
          return {
            groups: prev.groups.map((group) => {
              if (group.id !== current.groupId && group.id !== groupId) return group;
              if (group.id === current.groupId && targetGroup && targetGroup.id !== current.groupId) {
                return group;
              }
              return {
                ...group,
                id: groupId,
                konzernId: makeKonzern ? targetId : group.konzernId,
              };
            }).filter((group, index, all) => all.findIndex((entry) => entry.id === group.id) === index),
            links: prev.links.map((link) => {
              if (link.id === id) {
                return {
                  ...link,
                  groupId,
                  targetId,
                  targetKind,
                  label: link.label || partyName(targetId),
                  accepted: false,
                };
              }
              if (current.ownerKind === "person") return link;
              return link.groupId === current.groupId ? { ...link, groupId } : link;
            }),
          };
        }),
      accept: (id) =>
        setState((prev) => {
          const incoming = prev.links.find((link) => link.id === id);
          if (!incoming) return prev;
          return takeInMembership(prev, { ...incoming, accepted: true, declined: false });
        }),
      decline: (id) =>
        setState((prev) => ({
          ...prev,
          links: prev.links.map((link) => (link.id === id ? { ...link, accepted: false, declined: true } : link)),
        })),
      unaccept: (id) =>
        setState((prev) => {
          const next = {
            ...prev,
            links: prev.links.map((link) =>
              link.id === id ? { ...link, accepted: false, declined: false } : link,
            ),
          };
          snapshotRef.current = structuredClone(next);
          return next;
        }),
      unlink: (id, viewerId, viewerKind) => {
        let result = { unaccepted: [] as string[], removed: [] as KonzernLink[] };
        setState((prev) => {
          const doomed = prev.links.find((link) => link.id === id);
          if (!doomed) return prev;
          if (viewerKind === "person") {
            const detached = detachPersonFromGroup(prev, viewerId, doomed.groupId);
            result = { unaccepted: detached.unaccepted, removed: detached.removed };
            snapshotRef.current = structuredClone(detached.next);
            return detached.next;
          }
          const links = prev.links.filter((link) => link.id !== id);
          result = { unaccepted: [], removed: doomed ? [doomed] : [] };
          const groups = prev.groups
            .map((group) => {
              if (!doomed || group.konzernId !== doomed.targetId || doomed.targetKind !== "company") return group;
              const nextCompany = links
                .filter(
                  (link) =>
                    link.groupId === group.id &&
                    link.targetKind === "company" &&
                    link.targetId &&
                    isPublished(link),
                )
                .sort((left, right) => partyName(left.targetId ?? "").localeCompare(partyName(right.targetId ?? "")))[0];
              return { ...group, konzernId: nextCompany?.targetId ?? null };
            })
            .filter((group) => links.some((link) => link.groupId === group.id) || group.konzernId);
          const next = { groups, links };
          snapshotRef.current = structuredClone(next);
          return next;
        });
        return result;
      },
      remove: (id) =>
        setState((prev) => {
          const doomed = prev.links.find((link) => link.id === id);
          const links = prev.links.filter((link) => link.id !== id);
          const groups = prev.groups
            .map((group) => {
              if (!doomed || group.konzernId !== doomed.targetId || doomed.targetKind !== "company") return group;
              const nextCompany = links
                .filter(
                  (link) =>
                    link.groupId === group.id &&
                    link.targetKind === "company" &&
                    link.targetId &&
                    isPublished(link),
                )
                .sort((left, right) => partyName(left.targetId ?? "").localeCompare(partyName(right.targetId ?? "")))[0];
              return { ...group, konzernId: nextCompany?.targetId ?? null };
            })
            .filter((group) => links.some((link) => link.groupId === group.id) || group.konzernId);
          const next = { groups, links };
          snapshotRef.current = structuredClone(next);
          return next;
        }),
      restore: (link) =>
        setState((prev) => {
          if (prev.links.some((entry) => entry.id === link.id)) return prev;
          const next = { ...prev, links: [...prev.links, link] };
          snapshotRef.current = structuredClone(next);
          return next;
        }),
      snapshot: () => {
        snapshotRef.current = structuredClone(state);
      },
      commitSnapshot: () => {
        snapshotRef.current = structuredClone(state);
      },
      revert: () => setState(structuredClone(snapshotRef.current)),
      publish: (ownerId, ownerKind) =>
        setState((prev) => {
          const next = {
            ...prev,
            links: prev.links.map((link) =>
              link.ownerId === ownerId &&
              link.ownerKind === ownerKind &&
              !isPublished(link) &&
              link.targetId &&
              link.label.trim()
                ? { ...link, published: true, accepted: false }
                : link,
            ),
          };
          snapshotRef.current = structuredClone(next);
          return next;
        }),
      isDirty: () => comparable(state) !== comparable(snapshotRef.current),
      hasPublishable: (ownerId, ownerKind) =>
        state.links.some(
          (link) =>
            link.ownerId === ownerId &&
            link.ownerKind === ownerKind &&
            !isPublished(link) &&
            Boolean(link.targetId) &&
            Boolean(link.label.trim()),
        ),
      setKonzern: (companyId) => {
        let changed = false;
        setState((prev) => {
          const group = prev.groups.find(
            (entry) =>
              entry.konzernId === companyId ||
              prev.links.some((link) => link.groupId === entry.id && touches(link, companyId, "company")),
          );
          if (!group || group.konzernId === companyId) return prev;
          changed = true;
          return {
            ...prev,
            groups: prev.groups.map((entry) => (entry.id === group.id ? { ...entry, konzernId: companyId } : entry)),
          };
        });
        return changed;
      },
    }),
    [state],
  );

  return <KonzernLinksContext.Provider value={value}>{children}</KonzernLinksContext.Provider>;
}

export function useKonzernLinks() {
  const value = useContext(KonzernLinksContext);
  if (!value) throw new Error("useKonzernLinks must be used inside KonzernLinksProvider");
  return value;
}
