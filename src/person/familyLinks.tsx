import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { familyGender, reciprocalFamilyLabel, type FamilyMemberId } from "./family";

/**
 * A relationship recorded by `ownerId`, naming `partnerId` with a free-text label (e.g. "Vater").
 * It shows in `ownerId`'s own "Aktuell in Wino" list right away. `partnerId` sees it as a
 * suggestion ("Vorschläge") until they accept it, after which it also counts as confirmed on
 * their side. The partner sees the inverse role (Vater → Tochter, Bruder → Schwester).
 *
 * One pair of people has at most one link. Adding never writes the reverse as confirmed —
 * the other file only gets a Vorschlag. The same person is never both confirmed and a
 * suggestion. If the partner auflöst the card, the owner's add stays and the partner
 * sees it as a Vorschlag again. Only the owner can actually drop the pair.
 *
 * `partnerId` is `null` while a new entry is still being filled in. `published` is false
 * until Speichern; Entwurf speichern keeps it as a dashed draft.
 */
export type FamilyLink = {
  id: string;
  ownerId: FamilyMemberId;
  partnerId: FamilyMemberId | null;
  label: string;
  accepted: boolean;
  published?: boolean;
  /** System Vorschlag: not confirmed for the owner until someone takes it onto their file. */
  suggestionOnly?: boolean;
};

const STORAGE_KEY = "wino.family.v5";
const PREVIOUS_STORAGE_KEYS = ["wino.family.v4", "wino.family.v3", "wino.family.v2"];

function pairKey(left: FamilyMemberId, right: FamilyMemberId) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function isPair(link: FamilyLink, left: FamilyMemberId, right: FamilyMemberId) {
  return Boolean(
    link.partnerId &&
      ((link.ownerId === left && link.partnerId === right) || (link.ownerId === right && link.partnerId === left)),
  );
}

/** One link per pair. A user add always beats a leftover reverse seed. */
function collapsePairLinks(links: FamilyLink[]) {
  const seedIds = new Set(SEED.map((seed) => seed.id));
  const seen = new Map<string, number>();
  const next: FamilyLink[] = [];
  for (const link of links) {
    if (!link.partnerId) {
      next.push(link);
      continue;
    }
    const key = pairKey(link.ownerId, link.partnerId);
    const index = seen.get(key);
    if (index === undefined) {
      seen.set(key, next.length);
      next.push(link);
      continue;
    }
    const prev = next[index];
    const prevSeed = seedIds.has(prev.id);
    const incomingSeed = seedIds.has(link.id);
    if (prevSeed !== incomingSeed) {
      next[index] = prevSeed ? link : prev;
      continue;
    }
    const prevNamed = Boolean(prev.label.trim());
    const incomingNamed = Boolean(link.label.trim());
    if (incomingNamed && !prevNamed) next[index] = link;
    else if (prevNamed && !incomingNamed) continue;
    else next[index] = link;
  }
  return next;
}

function readStoredLinks(): FamilyLink[] | null {
  const current = localStorage.getItem(STORAGE_KEY);
  const keys = current ? [STORAGE_KEY] : PREVIOUS_STORAGE_KEYS;
  const merged: FamilyLink[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as FamilyLink[];
      if (!Array.isArray(parsed)) continue;
      for (const link of parsed) {
        if (!link?.id || seen.has(link.id)) continue;
        seen.add(link.id);
        merged.push(link);
      }
    } catch {
      continue;
    }
  }
  return merged.length ? merged : null;
}

/**
 * Julia has father, mother and son on file. Those people only see her as a Vorschlag
 * (Tochter / Mutter) until they accept. Marcus recorded Julia as his wife, so she
 * sees him as Partner/Ehemann until she accepts.
 */
const SEED: FamilyLink[] = [
  { id: "fl-karl", ownerId: "julia", partnerId: "karl", label: "Vater", accepted: false, published: true },
  { id: "fl-johanna", ownerId: "julia", partnerId: "johanna", label: "Mutter", accepted: false, published: true },
  { id: "fl-ash", ownerId: "julia", partnerId: "ash", label: "Sohn", accepted: false, published: true },
  { id: "fl-marcus", ownerId: "marcus", partnerId: "julia", label: "Partner/Ehefrau", accepted: false, published: true },
  {
    id: "fl-ashley",
    ownerId: "ashley",
    partnerId: "julia",
    label: "Freundin",
    accepted: false,
    published: true,
    suggestionOnly: true,
  },
  {
    id: "fl-sophie",
    ownerId: "sophie",
    partnerId: "julia",
    label: "Cousine",
    accepted: false,
    published: true,
    suggestionOnly: true,
  },
];

function isPublished(link: FamilyLink) {
  return link.published !== false;
}

function isEmptyDraft(link: FamilyLink) {
  return !isPublished(link) && !link.partnerId && !link.label.trim();
}

function comparable(links: FamilyLink[]) {
  return JSON.stringify(links.filter((link) => !isEmptyDraft(link)));
}

function loadLinks(): FamilyLink[] {
  try {
    const stored = readStoredLinks();
    const parsed = stored ?? structuredClone(SEED);
    const migrating = !localStorage.getItem(STORAGE_KEY) && Boolean(stored);
    const links = parsed
      .map((link) => ({ ...link, published: link.published !== false }))
      .filter((link) => !(isPublished(link) && !link.partnerId));
    for (const seed of SEED) {
      const index = links.findIndex((link) => link.id === seed.id);
      if (index >= 0) {
        if (seed.suggestionOnly && links[index].ownerId === seed.ownerId && links[index].partnerId === seed.partnerId) {
          if (links[index].accepted && seed.partnerId) {
            links[index] = {
              ...links[index],
              ownerId: seed.partnerId,
              partnerId: seed.ownerId,
              accepted: false,
              suggestionOnly: false,
            };
          } else {
            links[index] = { ...links[index], suggestionOnly: true, accepted: false };
          }
        }
        if (migrating && seed.accepted === false && links[index].ownerId === seed.ownerId) {
          links[index] = { ...links[index], accepted: false, label: seed.label };
        }
        continue;
      }
      const partnerId = seed.partnerId;
      if (partnerId && links.some((link) => isPair(link, seed.ownerId, partnerId))) continue;
      links.push({ ...seed, published: seed.published !== false });
    }
    return collapsePairLinks(links);
  } catch {
    return structuredClone(SEED);
  }
}

type FamilyLinksStore = {
  links: FamilyLink[];
  /** Any link that already touches this member, confirmed or not - used to keep search results clean. */
  relatedIds: (memberId: FamilyMemberId) => Set<FamilyMemberId>;
  /** Starts a new, partner-less entry owned by this member and returns its id. */
  startDraft: (ownerId: FamilyMemberId) => string;
  updateLabel: (id: string, label: string) => void;
  /** Points the link at a different partner, authored by `ownerId`; the new partner has to accept again. */
  updatePartner: (id: string, ownerId: FamilyMemberId, partnerId: FamilyMemberId) => void;
  acceptLink: (id: string, viewerId: FamilyMemberId) => void;
  /**
   * Owner retracts the relationship. Partner only releases their confirmation —
   * the adder's card stays, and they see it as a Vorschlag again.
   */
  unlinkLink: (id: string, viewerId?: FamilyMemberId) => { mode: "removed" | "unaccepted"; link: FamilyLink | null };
  removeLink: (id: string) => void;
  restoreLink: (link: FamilyLink) => void;
  snapshot: () => void;
  commitSnapshot: () => void;
  revert: () => void;
  publish: (ownerId: FamilyMemberId) => void;
  isDirty: () => boolean;
  hasPublishable: (ownerId: FamilyMemberId) => boolean;
};

function uniqueByOther(links: FamilyLink[], memberId: FamilyMemberId) {
  const seen = new Set<FamilyMemberId>();
  return links.filter((link) => {
    const other = otherMemberOf(link, memberId);
    if (!other || seen.has(other)) return false;
    seen.add(other);
    return true;
  });
}

/** Published family links show on both files as soon as one side saves them. */
export function confirmedLinksFor(links: FamilyLink[], memberId: FamilyMemberId) {
  return uniqueByOther(
    links.filter(
      (link) =>
        isPublished(link) &&
        !link.suggestionOnly &&
        Boolean(link.partnerId) &&
        (link.ownerId === memberId || link.partnerId === memberId),
    ),
    memberId,
  );
}

export function draftLinksFor(links: FamilyLink[], memberId: FamilyMemberId) {
  return links.filter((link) => link.ownerId === memberId && !isPublished(link));
}

/** Incoming published links this member has not accepted yet — never anyone already in Aktuell. */
export function pendingSuggestionsFor(links: FamilyLink[], memberId: FamilyMemberId) {
  const confirmed = new Set(confirmedLinksFor(links, memberId).map((link) => otherMemberOf(link, memberId)));
  return uniqueByOther(
    links.filter(
      (link) =>
        link.partnerId === memberId &&
        !link.accepted &&
        isPublished(link) &&
        !confirmed.has(link.ownerId),
    ),
    memberId,
  );
}

export function otherMemberOf(link: FamilyLink, memberId: FamilyMemberId) {
  return (link.ownerId === memberId ? link.partnerId : link.ownerId) as FamilyMemberId;
}

/** Owner keeps the written label; the other side sees the inverse kinship (Mutter → Tochter). */
export function familyRoleFor(link: FamilyLink, viewerId: FamilyMemberId) {
  if (!link.label.trim()) return "";
  if (link.ownerId === viewerId) return link.label;
  return reciprocalFamilyLabel(link.label, familyGender(link.ownerId));
}

const FamilyLinksContext = createContext<FamilyLinksStore | null>(null);

export function FamilyLinksProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<FamilyLink[]>(loadLinks);
  const snapshotRef = useRef<FamilyLink[]>(links);

  useEffect(() => {
    if (!links.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }, [links]);

  const value = useMemo<FamilyLinksStore>(
    () => ({
      links,
      relatedIds: (memberId) => {
        const ids = new Set<FamilyMemberId>();
        for (const link of links) {
          if (link.ownerId === memberId && link.partnerId) ids.add(link.partnerId);
          if (link.partnerId === memberId) ids.add(link.ownerId);
        }
        return ids;
      },
      startDraft: (ownerId) => {
        const id = `fl-${Date.now()}`;
        setLinks((prev) => [
          ...prev.filter((link) => !(link.ownerId === ownerId && !isPublished(link) && !link.partnerId)),
          { id, ownerId, partnerId: null, label: "", accepted: false, published: false },
        ]);
        return id;
      },
      updateLabel: (id, label) => setLinks((prev) => prev.map((link) => (link.id === id ? { ...link, label } : link))),
      updatePartner: (id, ownerId, partnerId) =>
        setLinks((prev) => {
          const current = prev.find((link) => link.id === id);
          return collapsePairLinks([
            ...prev.filter((link) => link.id !== id && !isPair(link, ownerId, partnerId)),
            {
              id,
              ownerId,
              partnerId,
              label: current?.label ?? "",
              accepted: false,
              published: current?.published,
              suggestionOnly: false,
            },
          ]);
        }),
      acceptLink: (id, viewerId) =>
        setLinks((prev) =>
          prev.map((link) => {
            if (link.id !== id) return link;
            if (link.suggestionOnly && link.partnerId === viewerId) {
              return {
                ...link,
                ownerId: viewerId,
                partnerId: link.ownerId,
                accepted: true,
                published: true,
                suggestionOnly: false,
              };
            }
            return { ...link, accepted: true, published: true, suggestionOnly: false };
          }),
        ),
      unlinkLink: (id) => {
        let result: { mode: "removed" | "unaccepted"; link: FamilyLink | null } = { mode: "removed", link: null };
        setLinks((prev) => {
          const doomed = prev.find((link) => link.id === id);
          if (!doomed) return prev;
          result = { mode: "removed", link: doomed };
          const next = prev.filter((link) => link.id !== id);
          snapshotRef.current = structuredClone(next);
          return next;
        });
        return result;
      },
      removeLink: (id) =>
        setLinks((prev) => {
          const next = prev.filter((link) => link.id !== id);
          snapshotRef.current = structuredClone(next);
          return next;
        }),
      restoreLink: (link) =>
        setLinks((prev) => {
          if (prev.some((entry) => entry.id === link.id)) return prev;
          const next = [...prev, link];
          snapshotRef.current = structuredClone(next);
          return next;
        }),
      snapshot: () => {
        snapshotRef.current = structuredClone(links);
      },
      commitSnapshot: () => {
        snapshotRef.current = structuredClone(links);
      },
      revert: () => setLinks(structuredClone(snapshotRef.current)),
      publish: (ownerId) =>
        setLinks((prev) => {
          const next = collapsePairLinks(
            prev.map((link) =>
              link.ownerId === ownerId && !isPublished(link) && link.partnerId && link.label.trim()
                ? { ...link, published: true, accepted: true, suggestionOnly: false }
                : link,
            ),
          );
          snapshotRef.current = structuredClone(next);
          return next;
        }),
      isDirty: () => comparable(links) !== comparable(snapshotRef.current),
      hasPublishable: (ownerId) =>
        links.some(
          (link) =>
            link.ownerId === ownerId && !isPublished(link) && Boolean(link.partnerId) && Boolean(link.label.trim()),
        ),
    }),
    [links],
  );

  return <FamilyLinksContext.Provider value={value}>{children}</FamilyLinksContext.Provider>;
}

export function useFamilyLinks() {
  const value = useContext(FamilyLinksContext);
  if (!value) throw new Error("useFamilyLinks must be used inside FamilyLinksProvider");
  return value;
}
