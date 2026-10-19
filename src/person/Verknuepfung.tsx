import { useMemo, useState } from "react";
import * as a from "../assets/index";
import { ContextMenu, Icon, Snackbar } from "../ui";
import { useWorkflow } from "../workflow";
import { DeleteCard } from "./DeleteCard";
import { Field, PartnerSearch, Text } from "./forms";
import { FAMILY_CANDIDATES, familyKindLabel, familyMember, type FamilyKind, type FamilyMemberId } from "./family";
import { confirmedLinksFor, otherMemberOf, useFamilyLinks } from "./familyLinks";

function Avatar() {
  return (
    <span className="vk-avatar">
      <img src={a.avatarBg} alt="" />
      <img className="glyph" src={a.clientBlank} alt="" />
    </span>
  );
}

function kindChipClass(kind: FamilyKind) {
  return `chip ${kind}`;
}

/** An existing (confirmed) relationship card - click it to edit it on the left, like Kontakte cards. */
function RelationCard({
  label,
  memberId,
  selected,
  canEdit,
  onSelect,
  onOpen,
  onRemove,
}: {
  label: string;
  memberId: FamilyMemberId;
  selected: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const member = familyMember(memberId);

  return (
    <article className={selected ? "vk-card selected" : "vk-card"} onClick={onSelect}>
      <header className="vk-card-head">
        <span>{label || "Nicht definiert"}</span>
        <span onClick={(event) => event.stopPropagation()}>
          <ContextMenu
            items={[
              ...(canEdit ? [{ label: "Editieren", icon: a.menuEdit, onSelect }] : []),
              { label: "Entfernen", icon: a.trash, danger: true, onSelect: onRemove },
            ]}
          />
        </span>
      </header>
      <div className="vk-card-body">
        <Avatar />
        <div className="vk-card-copy">
          <span className={kindChipClass(member.kind)}>{familyKindLabel(member.kind)}</span>
          <strong>{member.name}</strong>
          {member.born ? <small>{member.born}</small> : null}
        </div>
        <button
          type="button"
          className="vk-card-open"
          aria-label={`${member.name} öffnen`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <Icon src={a.openTab} size={20} />
        </button>
      </div>
    </article>
  );
}

/** The in-progress "add a new relationship" card - mirrors the Figma placeholder exactly. */
function DraftCard({ label, memberId }: { label: string; memberId: FamilyMemberId | null }) {
  const member = memberId ? familyMember(memberId) : null;
  return (
    <article className="vk-card draft selected">
      <header className="vk-card-head">
        <span>{label.trim() || "Nicht definiert"}</span>
        <Icon src={a.contextMenu} size={18} />
      </header>
      <div className="vk-card-body">
        <Avatar />
        <div className="vk-card-copy">
          {member ? <span className={kindChipClass(member.kind)}>{familyKindLabel(member.kind)}</span> : null}
          <strong>{member?.name ?? "-"}</strong>
          <small>{member?.born || "-"}</small>
        </div>
        <Icon src={a.openTab} size={20} />
      </div>
    </article>
  );
}

function SuggestionCard({
  label,
  memberId,
  onOpen,
  onAccept,
  onDecline,
}: {
  label: string;
  memberId: FamilyMemberId;
  onOpen: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const member = familyMember(memberId);
  return (
    <article className="vk-suggestion">
      <header className="vk-card-head">
        <span>{label || "Nicht definiert"}</span>
        <Icon src={a.contextMenu} size={18} />
      </header>
      <div className="vk-card-body">
        <Avatar />
        <div className="vk-card-copy">
          <span className={kindChipClass(member.kind)}>{familyKindLabel(member.kind)}</span>
          <strong>{member.name}</strong>
          {member.born ? <small>{member.born}</small> : null}
        </div>
        <button type="button" className="vk-card-open" aria-label={`${member.name} öffnen`} onClick={onOpen}>
          <Icon src={a.openTab} size={20} />
        </button>
      </div>
      <div className="vk-suggestion-actions">
        <button type="button" className="btn-secondary" onClick={onDecline}>
          Ablehnen
        </button>
        <button type="button" className="btn-primary" onClick={onAccept}>
          Akzeptieren
        </button>
      </div>
    </article>
  );
}

/**
 * The Verknüpfung area of the Stammdaten workflow: link this file to other Privatperson
 * files to form a family. This follows the same selection pattern as Kontakte - click a
 * card on the right to edit it on the left, or click "+ Hinzufügen" to start a new one.
 * Linking from here shows up immediately on this file; the other file sees it as a
 * suggestion until it accepts, at which point it also counts as confirmed there.
 */
export function VerknuepfungPanel({ memberId, initialId = null }: { memberId: FamilyMemberId; initialId?: string | null }) {
  const { openPartner } = useWorkflow();
  const { links, startDraft, updateLabel, updatePartner, acceptLink, removeLink } = useFamilyLinks();
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [toast, setToast] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const confirmed = confirmedLinksFor(links, memberId);
  const draft = links.find((link) => link.ownerId === memberId && link.partnerId === null) ?? null;
  const pending = links.filter((link) => link.partnerId === memberId && !link.accepted);

  const effectiveId = selectedId ?? confirmed[0]?.id ?? null;
  const editing =
    effectiveId === draft?.id ? draft : effectiveId ? confirmed.find((link) => link.id === effectiveId) ?? null : null;
  const isNew = editing?.partnerId === null;

  const otherIdForEditing = editing && !isNew ? otherMemberOf(editing, memberId) : null;
  const options = useMemo(() => FAMILY_CANDIDATES.filter((candidate) => candidate.id !== memberId), [memberId]);

  function startNew() {
    const id = startDraft(memberId);
    setSelectedId(id);
  }

  function clearSelection() {
    setSelectedId(null);
  }

  const deleting = pendingDelete ? links.find((link) => link.id === pendingDelete) ?? null : null;
  const deletingName = deleting
    ? deleting.partnerId
      ? familyMember(deleting.ownerId === memberId ? deleting.partnerId : deleting.ownerId).name
      : ""
    : "";

  return (
    <div className="vk-grid">
      <section className="vk-form-card">
        <Field label="Verknüpfungsbezeichnung">
          <Text
            value={editing?.label ?? ""}
            onChange={(value) => editing && updateLabel(editing.id, value)}
            placeholder="z. B. Vater"
          />
        </Field>
        <div className="block">
          <span className="field-label">Partner</span>
          <PartnerSearch
            key={editing?.id ?? "none"}
            value={otherIdForEditing ? familyMember(otherIdForEditing).name : ""}
            options={options.map((option) => option.name)}
            onChange={(name) => {
              const picked = options.find((option) => option.name === name)?.id;
              if (!picked || !editing || picked === otherIdForEditing) return;
              updatePartner(editing.id, memberId, picked);
            }}
          />
        </div>
      </section>

      <section className="vk-panel">
        <header className="vk-panel-head">
          <span>
            <Icon src={a.verknuepfung} size={22} />
            Verknüpfung
          </span>
          <button type="button" className="btn-primary vk-add-btn" onClick={startNew}>
            + Hinzufügen
          </button>
        </header>
        <p className="vk-caption">Aktuell in Wino</p>
        <div className="vk-list">
          {confirmed.map((link) => {
            const otherId = otherMemberOf(link, memberId);
            return (
              <RelationCard
                key={link.id}
                label={link.label}
                memberId={otherId}
                selected={effectiveId === link.id}
                canEdit={link.ownerId === memberId}
                onSelect={() => setSelectedId(link.id)}
                onOpen={() => openPartner(otherId)}
                onRemove={() => setPendingDelete(link.id)}
              />
            );
          })}
          {isNew && draft ? <DraftCard label={draft.label} memberId={draft.partnerId} /> : null}
          {confirmed.length === 0 && !isNew ? <p className="vk-empty">Noch keine Verknüpfung angelegt.</p> : null}
        </div>

        {pending.length > 0 ? (
          <>
            <p className="vk-caption vk-caption-suggest">Vorschläge</p>
            <div className="vk-list">
              {pending.map((link) => (
                <SuggestionCard
                  key={link.id}
                  label={link.label}
                  memberId={link.ownerId}
                  onOpen={() => openPartner(link.ownerId)}
                  onAccept={() => {
                    acceptLink(link.id);
                    setToast("Verknüpfung bestätigt.");
                  }}
                  onDecline={() => removeLink(link.id)}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>

      {toast ? <Snackbar message={toast} onClose={() => setToast("")} /> : null}
      {deleting ? (
        <DeleteCard
          title={deleting.partnerId ? `${deleting.label} (${deletingName})` : "Eintrag"}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            removeLink(deleting.id);
            if (effectiveId === deleting.id) clearSelection();
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
