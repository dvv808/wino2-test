import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { COMPANY_DIRECTORY, type CompanyRecord, type CompanyRole } from "./company";

/**
 * A Konzernstruktur group: exactly one Konzern (parent) and 0-n Gesellschaften
 * (subsidiaries) - two levels, no deeper nesting. A company belongs to at most one group;
 * a company that isn't a Konzern or a subsidiary of any group is standalone.
 */
export type CompanyGroup = {
  id: string;
  konzernId: string | null;
  memberIds: string[];
};

/** Person + Rolle + Gesellschaft - never a direct person-to-company link. */
export type CompanyRoleLink = {
  id: string;
  companyId: string;
  person: string;
  role: CompanyRole;
};

type State = {
  groups: CompanyGroup[];
  roleLinks: CompanyRoleLink[];
  companies: CompanyRecord[];
};

const STORAGE_KEY = "wino.companyGroups.v1";

/**
 * Lunixo Holding is the Konzern, Lunixo AG and Lunixo Immobilien GmbH are its
 * Gesellschaften. Julia Atkinson's roles match what's already on file in her
 * Wirtschaftsdaten (Geschäftsführerin at both Lunixo AG and Lunixo Holding), so she shows
 * the "Auch bei" cross-reference out of the box.
 */
const SEED: State = {
  groups: [{ id: "grp-lunixo", konzernId: "lunixo-holding", memberIds: ["lunixo", "lunixo-immobilien"] }],
  roleLinks: [
    { id: "rl-1", companyId: "lunixo", person: "Julia Atkinson", role: "Geschäftsführung" },
    { id: "rl-2", companyId: "lunixo-holding", person: "Julia Atkinson", role: "Geschäftsführung" },
    { id: "rl-3", companyId: "lunixo", person: "Thomas Atkinson", role: "Prokura" },
    { id: "rl-4", companyId: "lunixo-holding", person: "Maria Gruber", role: "CFO" },
    { id: "rl-5", companyId: "lunixo-holding", person: "Lukas Hofer", role: "Aufsichtsrat" },
    { id: "rl-6", companyId: "lunixo-immobilien", person: "Anna Berger", role: "Ansprechperson" },
  ],
  companies: COMPANY_DIRECTORY,
};

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as State) : SEED;
  } catch {
    return SEED;
  }
}

type CompanyGroupsStore = {
  groups: CompanyGroup[];
  roleLinks: CompanyRoleLink[];
  companies: CompanyRecord[];
  companyName: (id: string) => string;
  groupOf: (companyId: string) => CompanyGroup | undefined;
  rolesOf: (companyId: string) => CompanyRoleLink[];
  /** Other companies in the same group where this person also has a role (for the "Auch bei" line). */
  otherCompaniesOf: (person: string, group: CompanyGroup, excludeCompanyId: string) => string[];
  /** The chosen subsidiary becomes Konzern; the old Konzern joins the subsidiaries in its place. */
  setKonzern: (companyId: string) => void;
  /** The company leaves the group and becomes standalone; its people links are untouched. */
  removeSubsidiary: (companyId: string) => void;
  /** Adds (or moves) a company into the group as a subsidiary. */
  linkCompanyToGroup: (companyId: string, groupId: string) => void;
  /** Creates a brand-new CRM company record and links it into the group as a subsidiary. */
  createAndLinkCompany: (name: string, groupId: string) => void;
  /** Starts a brand-new group with this company (existing or newly created) as Konzern. */
  startGroupWithKonzern: (companyId: string, alsoAddCompanyId?: string) => string;
  createAndStartGroup: (name: string, alsoAddCompanyId?: string) => void;
  /** Removes the Konzern: a chosen subsidiary succeeds it, or the group dissolves entirely. */
  removeKonzern: (groupId: string, successorId: string | "dissolve") => void;
  addPerson: (companyId: string, person: string, role: CompanyRole) => void;
  removePerson: (linkId: string) => void;
  undo: () => void;
};

const CompanyGroupsContext = createContext<CompanyGroupsStore | null>(null);

export function CompanyGroupsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(loadState);
  // A ref (not state) so it's always synchronously current - callers that read it right
  // after a mutation (e.g. a toast's undo handler created in the same render as the
  // mutation that triggered it) must never see a stale, one-action-behind value.
  const undoSnapshot = useRef<State | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function mutate(updater: (prev: State) => State) {
    undoSnapshot.current = state;
    setState(updater);
  }

  function newGroupId() {
    return `grp-${Date.now()}`;
  }
  function newCompanyId(name: string) {
    return `co-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  }

  const value: CompanyGroupsStore = {
    groups: state.groups,
    roleLinks: state.roleLinks,
    companies: state.companies,
    companyName: (id) => state.companies.find((company) => company.id === id)?.name ?? id,
    groupOf: (companyId) =>
      state.groups.find((group) => group.konzernId === companyId || group.memberIds.includes(companyId)),
    rolesOf: (companyId) => state.roleLinks.filter((link) => link.companyId === companyId),
    otherCompaniesOf: (person, group, excludeCompanyId) => {
      const memberIds = [group.konzernId, ...group.memberIds].filter(Boolean) as string[];
      return memberIds
        .filter((id) => id !== excludeCompanyId)
        .filter((id) => state.roleLinks.some((link) => link.companyId === id && link.person === person))
        .map((id) => state.companies.find((company) => company.id === id)?.name ?? id);
    },

    setKonzern: (companyId) =>
      mutate((prev) => ({
        ...prev,
        groups: prev.groups.map((group) => {
          if (!group.memberIds.includes(companyId)) return group;
          const oldKonzern = group.konzernId;
          return {
            ...group,
            konzernId: companyId,
            memberIds: group.memberIds.map((id) => (id === companyId ? (oldKonzern ?? id) : id)),
          };
        }),
      })),

    removeSubsidiary: (companyId) =>
      mutate((prev) => ({
        ...prev,
        groups: prev.groups.map((group) =>
          group.memberIds.includes(companyId)
            ? { ...group, memberIds: group.memberIds.filter((id) => id !== companyId) }
            : group,
        ),
      })),

    linkCompanyToGroup: (companyId, groupId) =>
      mutate((prev) => ({
        ...prev,
        groups: prev.groups.map((group) => {
          const members = group.memberIds.filter((id) => id !== companyId);
          return { ...group, memberIds: group.id === groupId ? [...members, companyId] : members };
        }),
      })),

    createAndLinkCompany: (name, groupId) =>
      mutate((prev) => {
        const id = newCompanyId(name);
        return {
          ...prev,
          companies: [...prev.companies, { id, name, city: "" }],
          groups: prev.groups.map((group) =>
            group.id === groupId ? { ...group, memberIds: [...group.memberIds, id] } : group,
          ),
        };
      }),

    startGroupWithKonzern: (companyId, alsoAddCompanyId) => {
      const id = newGroupId();
      mutate((prev) => ({
        ...prev,
        groups: [
          ...prev.groups,
          {
            id,
            konzernId: companyId,
            memberIds: alsoAddCompanyId && alsoAddCompanyId !== companyId ? [alsoAddCompanyId] : [],
          },
        ],
      }));
      return id;
    },

    createAndStartGroup: (name, alsoAddCompanyId) =>
      mutate((prev) => {
        const id = newCompanyId(name);
        const groupId = newGroupId();
        return {
          ...prev,
          companies: [...prev.companies, { id, name, city: "" }],
          groups: [
            ...prev.groups,
            {
              id: groupId,
              konzernId: id,
              memberIds: alsoAddCompanyId ? [alsoAddCompanyId] : [],
            },
          ],
        };
      }),

    removeKonzern: (groupId, successorId) =>
      mutate((prev) => ({
        ...prev,
        groups: prev.groups.map((group) => {
          if (group.id !== groupId) return group;
          if (successorId === "dissolve") return { ...group, konzernId: null, memberIds: [] };
          const oldKonzern = group.konzernId;
          return {
            ...group,
            konzernId: successorId,
            memberIds: [...group.memberIds.filter((id) => id !== successorId), ...(oldKonzern ? [oldKonzern] : [])],
          };
        }),
      })),

    addPerson: (companyId, person, role) =>
      mutate((prev) => ({
        ...prev,
        roleLinks: [...prev.roleLinks, { id: `rl-${Date.now()}`, companyId, person, role }],
      })),

    removePerson: (linkId) =>
      mutate((prev) => ({ ...prev, roleLinks: prev.roleLinks.filter((link) => link.id !== linkId) })),

    undo: () => {
      if (!undoSnapshot.current) return;
      setState(undoSnapshot.current);
      undoSnapshot.current = null;
    },
  };

  return <CompanyGroupsContext.Provider value={value}>{children}</CompanyGroupsContext.Provider>;
}

export function useCompanyGroups() {
  const value = useContext(CompanyGroupsContext);
  if (!value) throw new Error("useCompanyGroups must be used inside CompanyGroupsProvider");
  return value;
}
