import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FamilyMemberId } from "./family";

/**
 * A relationship recorded by `ownerId`, naming `partnerId` with a free-text label (e.g. "Vater").
 * It shows in `ownerId`'s own "Aktuell in Wino" list right away. `partnerId` sees it as a
 * suggestion ("Vorschläge") until they accept it, after which it also counts as confirmed on
 * their side - the same label is shown on both files, since the text is written by the owner.
 *
 * `partnerId` is `null` while a new entry is still being filled in (no separate save step,
 * same as the other Stammdaten sections - typing patches the record live).
 */
export type FamilyLink = {
  id: string;
  ownerId: FamilyMemberId;
  partnerId: FamilyMemberId | null;
  label: string;
  accepted: boolean;
};

const STORAGE_KEY = "wino.family.v2";

/**
 * Julia already has her father, mother and son on file. Marcus has recorded Julia as his
 * wife, so he shows up in her "Vorschläge" until she accepts.
 */
const SEED: FamilyLink[] = [
  { id: "fl-karl", ownerId: "julia", partnerId: "karl", label: "Vater", accepted: true },
  { id: "fl-johanna", ownerId: "julia", partnerId: "johanna", label: "Mutter", accepted: true },
  { id: "fl-ash", ownerId: "julia", partnerId: "ash", label: "Sohn", accepted: true },
  { id: "fl-marcus", ownerId: "marcus", partnerId: "julia", label: "Partner/Ehemann", accepted: false },
];

function loadLinks(): FamilyLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FamilyLink[]) : SEED;
  } catch {
    return SEED;
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
  acceptLink: (id: string) => void;
  removeLink: (id: string) => void;
};

/** Relationships that count for this member: their own, plus ones they accepted. */
export function confirmedLinksFor(links: FamilyLink[], memberId: FamilyMemberId) {
  return links.filter(
    (link) => (link.ownerId === memberId && link.partnerId !== null) || (link.partnerId === memberId && link.accepted),
  );
}

export function otherMemberOf(link: FamilyLink, memberId: FamilyMemberId) {
  return (link.ownerId === memberId ? link.partnerId : link.ownerId) as FamilyMemberId;
}

const FamilyLinksContext = createContext<FamilyLinksStore | null>(null);

export function FamilyLinksProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<FamilyLink[]>(loadLinks);

  useEffect(() => {
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
        // Only one unfinished draft per member at a time - drop any abandoned one first.
        setLinks((prev) => [
          ...prev.filter((link) => !(link.ownerId === ownerId && link.partnerId === null)),
          { id, ownerId, partnerId: null, label: "", accepted: true },
        ]);
        return id;
      },
      updateLabel: (id, label) => setLinks((prev) => prev.map((link) => (link.id === id ? { ...link, label } : link))),
      updatePartner: (id, ownerId, partnerId) =>
        setLinks((prev) =>
          prev.map((link) => (link.id === id ? { ...link, ownerId, partnerId, accepted: false } : link)),
        ),
      acceptLink: (id) =>
        setLinks((prev) => prev.map((link) => (link.id === id ? { ...link, accepted: true } : link))),
      removeLink: (id) => setLinks((prev) => prev.filter((link) => link.id !== id)),
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
