import { useEffect, useMemo, useState } from "react";
import * as a from "../assets/index";
import { ContextMenu, Icon, Snackbar, type ContextItem } from "../ui";
import { useWorkflow } from "../workflow";
import { COMPANY_DIRECTORY, companyMetaLine } from "./company";
import { DeleteCard } from "./DeleteCard";
import { FAMILY_CANDIDATES, familyKindLabel, familyMember, type FamilyKind, type FamilyMemberId } from "./family";
import { confirmedLinksFor, draftLinksFor, familyRoleFor, otherMemberOf, pendingSuggestionsFor, useFamilyLinks } from "./familyLinks";
import { Field, PartnerSearch, Text } from "./forms";
import {
  counterpartId,
  isFilePartner,
  isPublished,
  konzernTabCount,
  overviewKonzernLinks,
  partyChip,
  partyKindOf,
  partyMeta,
  partyName,
  rememberParty,
  useKonzernLinks,
  type KonzernLink,
  type PartyKind,
} from "./konzernLinks";
import { FILE_PARTNERS } from "./partners";
import { useCompanyGroups } from "./companyGroups";

type Tab = "familie" | "konzern";
type Toast = { message: string; tone?: "ok" | "warn"; undo?: () => void };

function Avatar({ glyph }: { glyph: string }) {
  return (
    <span className="vk-avatar">
      <img src={a.avatarBg} alt="" />
      <img className="glyph" src={glyph} alt="" />
    </span>
  );
}

function kindChipClass(kind: FamilyKind) {
  return `chip ${kind}`;
}

function MemberCard({
  caption,
  captionIcon,
  chip,
  chipClass,
  name,
  meta,
  glyph,
  selected,
  draft,
  empty,
  menuItems,
  onSelect,
  onOpen,
}: {
  caption: string;
  captionIcon?: string;
  chip?: string;
  chipClass?: string;
  name: string;
  meta?: string;
  glyph: string;
  selected?: boolean;
  draft?: boolean;
  empty?: boolean;
  menuItems?: ContextItem[];
  onSelect?: () => void;
  onOpen?: () => void;
}) {
  return (
    <article
      className={`vk-card${selected ? " selected" : ""}${draft || empty ? " draft" : ""}`}
      onClick={onSelect}
    >
      <header className="vk-card-head">
        <span className="vk-card-caption">
          {captionIcon ? <Icon src={captionIcon} size={18} /> : null}
          {caption}
        </span>
        {menuItems?.length ? (
          <span onClick={(event) => event.stopPropagation()}>
            <ContextMenu items={menuItems} label={`${name} Aktionen`} />
          </span>
        ) : (
          <Icon src={a.contextMenu} size={18} />
        )}
      </header>
      <div className="vk-card-body">
        <Avatar glyph={glyph} />
        <div className="vk-card-copy">
          {chip ? <span className={chipClass ?? "chip"}>{chip}</span> : null}
          <strong>{name}</strong>
          {meta ? <small>{meta}</small> : null}
        </div>
        {onOpen ? (
          <button
            type="button"
            className="vk-card-open"
            aria-label={`${name} öffnen`}
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            <Icon src={a.openTab} size={20} />
          </button>
        ) : (
          <span className="vk-card-open">
            <Icon src={a.openTab} size={20} />
          </span>
        )}
      </div>
    </article>
  );
}

function SuggestionCard({
  caption,
  captionIcon,
  chip,
  name,
  meta,
  glyph,
  onOpen,
  onAccept,
  onDecline,
}: {
  caption: string;
  captionIcon?: string;
  chip?: string;
  name: string;
  meta?: string;
  glyph: string;
  onOpen?: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <article className="vk-suggestion">
      <header className="vk-card-head">
        <span className="vk-card-caption">
          {captionIcon ? <Icon src={captionIcon} size={18} /> : null}
          {caption}
        </span>
        <Icon src={a.contextMenu} size={18} />
      </header>
      <div className="vk-card-body">
        <Avatar glyph={glyph} />
        <div className="vk-card-copy">
          {chip ? <span className="chip">{chip}</span> : null}
          <strong>{name}</strong>
          {meta ? <small>{meta}</small> : null}
        </div>
        {onOpen ? (
          <button type="button" className="vk-card-open" aria-label={`${name} öffnen`} onClick={onOpen}>
            <Icon src={a.openTab} size={20} />
          </button>
        ) : (
          <span className="vk-card-open">
            <Icon src={a.openTab} size={20} />
          </span>
        )}
      </div>
      <div className="vk-suggestion-actions">
        <button type="button" className="btn-secondary" onClick={onDecline}>
          Ablehnen
        </button>
        <button type="button" className="btn-primary" onClick={onAccept}>
          Übernehmen
        </button>
      </div>
    </article>
  );
}

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className={on ? "vk-toggle on" : "vk-toggle"} aria-pressed={on} onClick={onToggle}>
      <span>
        <strong>Konzern festlegen</strong>
        <small>Diesen Partner als Konzern festlegen</small>
      </span>
      <span className="vk-switch" />
    </button>
  );
}

function FamilyTab({
  memberId,
  initialId,
}: {
  memberId: FamilyMemberId;
  initialId?: string | null;
}) {
  const { openPartnerBeside } = useWorkflow();
  const { links, relatedIds, startDraft, updateLabel, updatePartner, acceptLink, unlinkLink, restoreLink } = useFamilyLinks();
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const confirmed = confirmedLinksFor(links, memberId);
  const drafts = draftLinksFor(links, memberId);
  const draft = drafts.find((link) => link.partnerId === null) ?? drafts[0] ?? null;
  const pending = pendingSuggestionsFor(links, memberId);
  const effectiveId = selectedId ?? draft?.id ?? confirmed[0]?.id ?? null;
  const editing =
    effectiveId === draft?.id ? draft : effectiveId ? confirmed.find((link) => link.id === effectiveId) ?? null : null;
  const isNew = editing?.partnerId === null;
  const ownsEditing = !editing || editing.ownerId === memberId;
  const otherId = editing && !isNew ? otherMemberOf(editing, memberId) : null;
  const related = relatedIds(memberId);
  const options = useMemo(
    () =>
      FAMILY_CANDIDATES.filter((candidate) => {
        if (candidate.id === memberId) return false;
        if (otherId && candidate.id === otherId) return true;
        return !related.has(candidate.id);
      }),
    [memberId, otherId, related],
  );

  const deleting = pendingDelete ? links.find((link) => link.id === pendingDelete) ?? null : null;
  const deletingName = deleting?.partnerId
    ? familyMember(deleting.ownerId === memberId ? deleting.partnerId : deleting.ownerId).name
    : "";

  useEffect(() => {
    if (confirmed.length === 0 && drafts.length === 0) {
      setSelectedId(startDraft(memberId));
    }
  }, [confirmed.length, drafts.length, memberId, startDraft]);

  return (
    <>
      <section className="vk-form-card">
        <Field label="Verknüpfungsbezeichnung" required>
          <Text
            value={editing ? familyRoleFor(editing, memberId) : ""}
            onChange={(value) => {
              if (editing && !ownsEditing) return;
              const id = editing?.id ?? startDraft(memberId);
              if (!editing) setSelectedId(id);
              updateLabel(id, value);
            }}
            placeholder=""
            required
          />
        </Field>
        <div className="block">
          <span className="field-label">Partner</span>
          <PartnerSearch
            key={editing?.id ?? "none"}
            value={otherId ? familyMember(otherId).name : ""}
            options={options.map((option) => option.name)}
            onChange={(name) => {
              if (editing && !ownsEditing) return;
              const picked = options.find((option) => option.name === name)?.id;
              if (!picked || picked === otherId) return;
              const id = editing?.id ?? startDraft(memberId);
              if (!editing) setSelectedId(id);
              updatePartner(id, memberId, picked);
            }}
          />
        </div>
      </section>

      <ListPanel
        title="Verknüpfung: Familie"
        onAdd={() => setSelectedId(startDraft(memberId))}
        suggestionCount={pending.length}
        suggestionsOpen={showSuggestions}
        onToggleSuggestions={() => setShowSuggestions((open) => !open)}
      >
        {confirmed.map((link) => {
          const other = otherMemberOf(link, memberId);
          const member = familyMember(other);
          return (
            <MemberCard
              key={link.id}
              caption={familyRoleFor(link, memberId) || "Nicht definiert"}
              chip={familyKindLabel(member.kind)}
              chipClass={kindChipClass(member.kind)}
              name={member.name}
              meta={member.born}
              glyph={a.clientBlank}
              selected={effectiveId === link.id}
              onSelect={() => setSelectedId(link.id)}
              onOpen={() => openPartnerBeside(other)}
              menuItems={[
                ...(link.ownerId === memberId
                  ? [{ label: "Editieren", icon: a.menuEdit, onSelect: () => setSelectedId(link.id) }]
                  : []),
                { label: "Verknüpfung auflösen", icon: a.menuUnlink, danger: true, onSelect: () => setPendingDelete(link.id) },
              ]}
            />
          );
        })}
        {drafts.map((link) => {
          const partner = link.partnerId ? familyMember(link.partnerId) : null;
          return (
            <MemberCard
              key={link.id}
              caption={link.label.trim() || "Nicht definiert"}
              chip={partner ? familyKindLabel(partner.kind) : undefined}
              chipClass={partner ? kindChipClass(partner.kind) : undefined}
              name={partner?.name ?? "-"}
              meta={partner?.born}
              glyph={a.clientBlank}
              draft
              selected={effectiveId === link.id}
              onSelect={() => setSelectedId(link.id)}
            />
          );
        })}
        {confirmed.length === 0 && drafts.length === 0 ? (
          <MemberCard
            caption="Keine Verknüpfung vorhanden"
            name="-"
            meta=""
            glyph={a.clientBlank}
            empty
            onSelect={() => setSelectedId(startDraft(memberId))}
          />
        ) : null}
      </ListPanel>
      {showSuggestions ? (
        <SuggestionsOverlay count={pending.length} kind="Familie" onClose={() => setShowSuggestions(false)}>
          {pending.map((link) => {
            const member = familyMember(link.ownerId);
            return (
              <SuggestionCard
                key={link.id}
                caption={familyRoleFor(link, memberId) || "Nicht definiert"}
                chip={familyKindLabel(member.kind)}
                name={member.name}
                meta={member.born}
                glyph={a.clientBlank}
                onOpen={() => openPartnerBeside(link.ownerId)}
                onAccept={() => {
                  acceptLink(link.id, memberId);
                  setToast({ message: "Verknüpfung bestätigt." });
                  if (pending.length <= 1) setShowSuggestions(false);
                }}
                onDecline={() => {
                  unlinkLink(link.id, memberId);
                  if (pending.length <= 1) setShowSuggestions(false);
                }}
              />
            );
          })}
        </SuggestionsOverlay>
      ) : null}

      {toast ? (
        <Snackbar message={toast.message} tone={toast.tone} onUndo={toast.undo} onClose={() => setToast(null)} />
      ) : null}
      {deleting ? (
        <DeleteCard
          title="Verknüpfung"
          action="auflösen"
          name={deletingName}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const doomed = deleting;
            const wasAccepted = doomed.accepted;
            const result = unlinkLink(doomed.id, memberId);
            setPendingDelete(null);
            setSelectedId(confirmed.length <= 1 ? startDraft(memberId) : null);
            if (!doomed.partnerId) return;
            setToast({
              message: deletingName ? `Verknüpfung mit ${deletingName} aufgelöst.` : "Verknüpfung aufgelöst.",
              undo: () => {
                if (result.mode === "removed" && result.link) restoreLink(result.link);
                else if (result.mode === "unaccepted" && wasAccepted) acceptLink(doomed.id, memberId);
                setSelectedId(doomed.id);
                setToast(null);
              },
            });
          }}
        />
      ) : null}
    </>
  );
}

function konzernCaption(id: string, isKonzern: boolean, label: string) {
  if (isKonzern) return `Konzern: ${partyName(id)}`;
  return label.trim() || partyName(id);
}

function KonzernTab({
  partyId,
  kind,
}: {
  partyId: string;
  kind: PartyKind;
}) {
  const { openPartnerBeside } = useWorkflow();
  const store = useKonzernLinks();
  const companyGroups = useCompanyGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const group = store.groupOf(partyId, kind);
  const suggestions = [...store.suggestionsFor(partyId, kind)].sort((left, right) => {
    if (left.ownerKind !== right.ownerKind) return left.ownerKind === "company" ? -1 : 1;
    return partyName(left.ownerId).localeCompare(partyName(right.ownerId));
  });
  const unpublished = store.links.filter(
    (link) => link.ownerId === partyId && link.ownerKind === kind && !isPublished(link),
  );
  const draft = unpublished.find((link) => link.targetId === null) ?? unpublished[0] ?? null;
  const personView = kind === "person";

  const groupLinks = store.links.filter((link) => group && link.groupId === group.id && link.targetId && isPublished(link));
  const incomingCards = store.links
    .filter(
      (link) =>
        link.targetId === partyId &&
        link.targetKind === kind &&
        link.accepted &&
        isPublished(link) &&
        link.ownerId !== partyId,
    )
    .flatMap((link) => {
      const sourceId = counterpartId(link, partyId, store.groups, store.links);
      if (!sourceId || sourceId === partyId) return [];
      return [{ ...link, targetId: sourceId, targetKind: partyKindOf(sourceId) }];
    });

  const companyCards = personView
    ? overviewKonzernLinks(store.groups, store.links, partyId, kind)
    : [...groupLinks.filter((link) => link.targetKind === "company"), ...incomingCards.filter((link) => link.targetKind === "company")];

  const personCards = personView
    ? []
    : [...groupLinks.filter((link) => link.targetKind === "person"), ...incomingCards.filter((link) => link.targetKind === "person")];

  const visible = [...companyCards, ...personCards].filter((link, index, all) => {
    if (!link.targetId) return false;
    return all.findIndex((entry) => entry.targetId === link.targetId) === index;
  });

  const sorted = personView
    ? visible
    : visible.sort((left, right) => {
        const leftKonzern = left.targetId === group?.konzernId ? 0 : 1;
        const rightKonzern = right.targetId === group?.konzernId ? 0 : 1;
        if (leftKonzern !== rightKonzern) return leftKonzern - rightKonzern;
        if (left.targetKind !== right.targetKind) return left.targetKind === "company" ? -1 : 1;
        return partyName(left.targetId ?? "").localeCompare(partyName(right.targetId ?? ""));
      });

  const effectiveId = selectedId ?? draft?.id ?? sorted[0]?.id ?? null;
  const editing =
    effectiveId === draft?.id ? draft : store.links.find((link) => link.id === effectiveId) ?? null;
  const editingTarget = editing?.targetId ?? null;
  const editingIsKonzern = Boolean(editingTarget && group?.konzernId === editingTarget && editing?.targetKind === "company");
  const showToggle = kind === "company" && (!editingTarget || editing?.targetKind === "company");

  const linkedIds = new Set(
    [partyId, ...visible.map((link) => link.targetId).filter((id): id is string => Boolean(id))],
  );
  const konzernIds = new Set(
    [
      ...companyGroups.groups.map((entry) => entry.konzernId),
      ...store.groups
        .filter(
          (group) =>
            Boolean(group.konzernId) &&
            !group.id.startsWith("grp-sug-") &&
            store.links.some(
              (link) =>
                link.groupId === group.id &&
                isPublished(link) &&
                link.accepted &&
                Boolean(link.targetId) &&
                !link.declined,
            ),
        )
        .map((group) => group.konzernId),
    ].filter((id): id is string => Boolean(id)),
  );
  const companyOptions = COMPANY_DIRECTORY.filter((company) => {
    if (linkedIds.has(company.id)) return false;
    if (personView && !konzernIds.has(company.id)) return false;
    return true;
  }).map((company) => company.name);
  const personOptions = Object.values(FILE_PARTNERS)
    .filter((partner) => partner.fileKind !== "company" && !linkedIds.has(partner.id))
    .map((partner) => partner.name);
  const searchOptions = personView ? companyOptions : [...companyOptions, ...personOptions];

  function pickPartner(name: string) {
    const id = editing?.id ?? store.startDraft(partyId, kind);
    if (!editing) setSelectedId(id);
    const company = COMPANY_DIRECTORY.find((entry) => entry.name === name);
    const person = (Object.keys(FILE_PARTNERS) as FamilyMemberId[]).find((id) => FILE_PARTNERS[id].name === name);
    if (company) {
      if (personView && !konzernIds.has(company.id)) return;
      store.setTarget(id, company.id, "company", kind === "company" && (!group?.konzernId || editingIsKonzern));
    } else if (person) {
      if (personView) return;
      store.setTarget(id, person, "person");
    } else {
      if (personView) return;
      const createdKind: PartyKind = personView || !group?.konzernId ? "company" : "person";
      store.setTarget(
        id,
        rememberParty(name, createdKind),
        createdKind,
        createdKind === "company" && kind === "company" && !group?.konzernId,
      );
    }
  }

  function toggleKonzern() {
    if (!editingTarget || editing?.targetKind !== "company") return;
    if (editingIsKonzern) {
      setToast({
        message: "Definiere zuerst ein anderes Unternehmen als Konzern um diesen Konzern zu deselektieren.",
        tone: "warn",
        undo: () => setToast(null),
      });
      return;
    }
    store.setKonzern(editingTarget);
  }

  useEffect(() => {
    if (!draft && sorted.length === 0) {
      setSelectedId(store.startDraft(partyId, kind));
    }
  }, [draft, kind, partyId, sorted.length, store]);

  const emptyCaption = kind === "company" ? "Kein Konzern ausgewählt" : "Keine Verknüpfung vorhanden";
  const searchValue = editingTarget ? partyName(editingTarget) : "";
  const searchPlaceholder = personView || !group?.konzernId ? "Konzern auswählen" : "Partner suchen";
  const unlinking = pendingDelete ? store.links.find((link) => link.id === pendingDelete) ?? null : null;
  const unlinkingName = unlinking?.targetId ? partyName(unlinking.targetId) : "";

  return (
    <>
      <section className="vk-form-card">
        <Field label="Verknüpfungsbezeichnung" required>
          <Text
            value={editing?.label ?? ""}
            onChange={(value) => {
              const id = editing?.id ?? store.startDraft(partyId, kind);
              if (!editing) setSelectedId(id);
              store.updateLabel(id, value);
            }}
            placeholder=""
            required
          />
        </Field>
        <div className="block">
          <span className="field-label">{personView ? "Konzern" : "Partner"}</span>
          <PartnerSearch
            key={editing?.id ?? "none"}
            value={searchValue}
            options={searchOptions}
            placeholder={searchPlaceholder}
            icon={personView || !group?.konzernId ? a.companyBlank : a.personSmall}
            allowCreate={!personView}
            onChange={pickPartner}
          />
        </div>
        {showToggle ? (
          <Toggle on={Boolean(editingIsKonzern || (!editingTarget && !group?.konzernId))} onToggle={toggleKonzern} />
        ) : null}
      </section>

      <ListPanel
        title="Verknüpfung: Konzern"
        onAdd={() => setSelectedId(store.startDraft(partyId, kind))}
        suggestionCount={suggestions.length}
        suggestionsOpen={showSuggestions}
        onToggleSuggestions={() => setShowSuggestions((open) => !open)}
      >
        {sorted.map((link) => {
          const id = link.targetId as string;
          const isKonzern = group?.konzernId === id;
          return (
            <MemberCard
              key={link.id}
              caption={konzernCaption(id, isKonzern, link.label)}
              captionIcon={isKonzern ? a.ksGroupCompanies : undefined}
              chip={partyChip(id)}
              name={partyName(id)}
              meta={partyMeta(id) || (link.targetKind === "company" ? companyMetaLine(COMPANY_DIRECTORY.find((entry) => entry.id === id)) : "")}
              glyph={link.targetKind === "company" ? a.companyBlank : a.clientBlank}
              selected={effectiveId === link.id}
              onSelect={() => setSelectedId(link.id)}
              onOpen={isFilePartner(id) ? () => openPartnerBeside(id) : undefined}
              menuItems={[
                { label: "Editieren", icon: a.menuEdit, onSelect: () => setSelectedId(link.id) },
                {
                  label: "Verknüpfung auflösen",
                  icon: a.menuUnlink,
                  danger: true,
                  onSelect: () => setPendingDelete(link.id),
                },
              ]}
            />
          );
        })}
        {unpublished.map((link) => {
          const id = link.targetId;
          return (
            <MemberCard
              key={link.id}
              caption={
                id
                  ? konzernCaption(id, false, link.label)
                  : link.label.trim() || (kind === "company" ? "Kein Konzern ausgewählt" : "Keine Verknüpfung vorhanden")
              }
              chip={id ? partyChip(id) : undefined}
              name={id ? partyName(id) : "-"}
              meta={id ? partyMeta(id) : "-"}
              glyph={link.targetKind === "company" || kind === "company" ? a.companyBlank : a.clientBlank}
              draft
              selected={effectiveId === link.id}
              onSelect={() => setSelectedId(link.id)}
            />
          );
        })}
        {sorted.length === 0 && !draft ? (
          <MemberCard
            caption={emptyCaption}
            name="-"
            glyph={kind === "company" ? a.companyBlank : a.clientBlank}
            empty
            selected
            onSelect={() => setSelectedId(store.startDraft(partyId, kind))}
          />
        ) : null}
      </ListPanel>
      {showSuggestions ? (
        <SuggestionsOverlay count={suggestions.length} kind="Konzern" onClose={() => setShowSuggestions(false)}>
          {suggestions.map((link) => {
            const groupKonzern = store.groups.find((entry) => entry.id === link.groupId)?.konzernId;
            const sourceId = suggestionDisplayId(link, groupKonzern, partyId);
            const foreignKonzern = partyKindOf(sourceId) === "company" && sourceId === groupKonzern && sourceId !== partyId;
            return (
              <SuggestionCard
                key={link.id}
                caption={konzernCaption(sourceId, foreignKonzern, link.label || partyName(sourceId))}
                captionIcon={foreignKonzern ? a.ksGroupCompanies : undefined}
                chip={partyChip(sourceId)}
                name={partyName(sourceId)}
                meta={partyMeta(sourceId)}
                glyph={partyKindOf(sourceId) === "company" ? a.companyBlank : a.clientBlank}
                onOpen={isFilePartner(sourceId) ? () => openPartnerBeside(sourceId) : undefined}
                onAccept={() => {
                  store.accept(link.id);
                  setToast({ message: "Verknüpfung bestätigt." });
                  if (suggestions.length <= 1) setShowSuggestions(false);
                }}
                onDecline={() => {
                  store.decline(link.id);
                  if (suggestions.length <= 1) setShowSuggestions(false);
                }}
              />
            );
          })}
        </SuggestionsOverlay>
      ) : null}

      {toast ? (
        <Snackbar message={toast.message} tone={toast.tone} onUndo={toast.undo} onClose={() => setToast(null)} />
      ) : null}
      {pendingDelete ? (
        <DeleteCard
          title="Verknüpfung"
          action="auflösen"
          name={unlinkingName}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const doomed = store.links.find((link) => link.id === pendingDelete);
            const displayId = doomed
              ? personView && doomed.ownerKind === "company"
                ? suggestionDisplayId(
                    doomed,
                    store.groups.find((entry) => entry.id === doomed.groupId)?.konzernId,
                    partyId,
                  )
                : doomed.targetId
              : null;
            const name = displayId ? partyName(displayId) : "";
            const wasKonzern = Boolean(doomed?.targetId && doomed.targetId === group?.konzernId);
            const result = pendingDelete ? store.unlink(pendingDelete, partyId, kind) : { unaccepted: [], removed: [] };
            if (effectiveId === pendingDelete) setSelectedId(null);
            setPendingDelete(null);
            if (!doomed && !result.unaccepted.length && !result.removed.length) return;
            setToast({
              message: name ? `Verknüpfung mit ${name} aufgelöst.` : "Verknüpfung aufgelöst.",
              undo: () => {
                for (const id of result.unaccepted) store.accept(id);
                for (const link of result.removed) store.restore(link);
                if (wasKonzern && doomed?.targetId && !personView) store.setKonzern(doomed.targetId);
                if (doomed) setSelectedId(doomed.id);
                setToast(null);
              },
            });
          }}
        />
      ) : null}
    </>
  );
}

function suggestionDisplayId(link: KonzernLink, konzernId: string | null | undefined, viewerId: string) {
  if (link.ownerKind === "company") {
    if (konzernId && konzernId !== viewerId) return konzernId;
    return link.ownerId === viewerId ? (link.targetId ?? link.ownerId) : link.ownerId;
  }
  return link.ownerId === viewerId ? (link.targetId ?? link.ownerId) : link.ownerId;
}

function SuggestionsOverlay({
  count,
  kind,
  onClose,
  children,
}: {
  count: number;
  kind: "Familie" | "Konzern";
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="vk-suggest-overlay" role="dialog" aria-label="Vorschläge">
      <button type="button" className="vk-suggest-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="vk-suggest-modal">
        <header className="vk-suggest-head">
          <span className="vk-suggest-head-spacer" />
          <span className="vk-suggest-head-title">
            <Icon src={a.vkSparkle} size={16} />
            Vorschläge
          </span>
          <button type="button" className="vk-suggest-close" aria-label="Schließen" onClick={onClose}>
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>
        <div className="vk-suggest-body">
          <div className="vk-suggest-lead">
            <span className="vk-suggest-lead-icon">
              <Icon src={a.vkSparkle} size={24} />
            </span>
            <span>
              <strong>
                {count} Vorschläge
              </strong>
              <small>{kind}</small>
            </span>
          </div>
          <div className="vk-suggest-cards">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ListPanel({
  title,
  onAdd,
  suggestionCount,
  suggestionsOpen,
  onToggleSuggestions,
  children,
}: {
  title: string;
  onAdd: () => void;
  suggestionCount: number;
  suggestionsOpen: boolean;
  onToggleSuggestions: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="vk-panel">
      <header className="vk-panel-head">
        <span>
          <Icon src={a.verknuepfung} size={22} />
          {title}
        </span>
        <button type="button" className="btn-primary vk-add-btn" onClick={onAdd}>
          + Hinzufügen
        </button>
      </header>
      <div className="vk-now-row">
        <p className="vk-caption">Aktuell in Wino</p>
        {suggestionCount > 0 ? (
          <button
            type="button"
            className={suggestionsOpen ? "vk-suggest-pill open" : "vk-suggest-pill"}
            onClick={onToggleSuggestions}
          >
            <Icon src={a.vkSparkle} size={18} />
            {suggestionCount} Vorschläge vorhanden
          </button>
        ) : null}
      </div>
      <div className="vk-list">{children}</div>
    </section>
  );
}

/**
 * Stammdaten-workflow Verknüpfung: Familie + Konzern for Privatpersonen, Konzern only
 * for companies. Cross-file links always land as Vorschläge on the other side.
 */
export function VerknuepfungPanel({
  memberId,
  initialId = null,
}: {
  memberId: FamilyMemberId;
  initialId?: string | null;
}) {
  const isCompany = FILE_PARTNERS[memberId].fileKind === "company";
  const { links: konzernLinks, groups: konzernGroups } = useKonzernLinks();
  const { links } = useFamilyLinks();
  const familyCount = confirmedLinksFor(links, memberId).length;
  const konzernCount = konzernTabCount(konzernLinks, memberId, isCompany ? "company" : "person", konzernGroups);
  const [tab, setTab] = useState<Tab>("familie");

  return (
    <div className="vk-grid">
      {isCompany ? (
        <KonzernTab partyId={memberId} kind="company" />
      ) : (
        <>
          <div className="vk-tabs">
            <button type="button" className={tab === "familie" ? "active" : undefined} onClick={() => setTab("familie")}>
              Familie ({familyCount})
            </button>
            <button type="button" className={tab === "konzern" ? "active" : undefined} onClick={() => setTab("konzern")}>
              Konzern{konzernCount ? ` (${konzernCount})` : ""}
            </button>
          </div>
          {tab === "familie" ? <FamilyTab memberId={memberId} initialId={initialId} /> : <KonzernTab partyId={memberId} kind="person" />}
        </>
      )}
    </div>
  );
}
