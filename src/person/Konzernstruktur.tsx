import { Fragment, useState } from "react";
import * as a from "../assets/index";
import { ContextMenu, Icon, RadioRow, Snackbar, type ContextItem } from "../ui";
import { useWorkflow } from "../workflow";
import { COMPANY_CONTACTS, companyMetaLine, companyShortName, type CompanyRole } from "./company";
import { useCompanyGroups, type CompanyRoleLink } from "./companyGroups";
import { Field, PartnerSearch, Text } from "./forms";
import { FILE_PARTNERS, kindLabel, type PartnerId } from "./partners";

type Toast = { id: number; message: string; undo?: () => void };
type AddSlotKind = "konzern" | "unternehmen" | "personen";

const ADD_SLOT: Record<AddSlotKind, { label: string; glyph: string; stack: boolean }> = {
  konzern: { label: "Konzern hinzufügen", glyph: a.ksGroupCompanies, stack: true },
  unternehmen: { label: "Unternehmen hinzufügen", glyph: a.companyBlank, stack: false },
  personen: { label: "Personen hinzufügen", glyph: a.clientBlank, stack: false },
};

function asPartnerId(id: string): PartnerId | null {
  return id in FILE_PARTNERS ? (id as PartnerId) : null;
}

function partnerIdByName(name: string): PartnerId | null {
  const hit = (Object.keys(FILE_PARTNERS) as PartnerId[]).find((id) => FILE_PARTNERS[id].name === name);
  return hit ?? null;
}

function AddOrb({ kind }: { kind: AddSlotKind }) {
  const { glyph, stack } = ADD_SLOT[kind];
  const size = stack ? 120 : 90;
  const glyphSize = stack ? 53 : 40;
  const plusSize = stack ? 32 : 24;
  return (
    <span className={stack ? "ks-add-orb lg" : "ks-add-orb"}>
      <img className="ks-add-orb-ring" src={a.ksAddOrb} alt="" width={size} height={size} />
      <img className="ks-add-orb-glyph" src={glyph} alt="" width={glyphSize} height={glyphSize} />
      <img className="ks-add-orb-plus" src={a.ksAddPlus} alt="" width={plusSize} height={plusSize} />
    </span>
  );
}

function AddSlot({ kind, onClick }: { kind: AddSlotKind; onClick: () => void }) {
  const { label, stack } = ADD_SLOT[kind];
  return (
    <button type="button" className={stack ? "ks-add-slot stack" : "ks-add-slot"} onClick={onClick}>
      <AddOrb kind={kind} />
      <span className="ks-add-pill">{label}</span>
    </button>
  );
}

function EntityCard({
  caption,
  name,
  meta,
  glyph,
  chip,
  onOpen,
  menuItems,
}: {
  caption: string;
  name: string;
  meta?: string;
  glyph: string;
  chip?: string;
  onOpen?: () => void;
  menuItems: ContextItem[];
}) {
  return (
    <article className="vk-card ks-entity">
      <header className="vk-card-head">
        <span>{caption}</span>
        <span>
          <ContextMenu items={menuItems} label={`Aktionen für ${name}`} />
        </span>
      </header>
      <div className="vk-card-body">
        <span className="vk-avatar">
          <img src={a.avatarBg} alt="" />
          <img className="glyph" src={glyph} alt="" />
        </span>
        <div className="vk-card-copy">
          {chip ? <span className="chip">{chip}</span> : null}
          <strong>{name}</strong>
          {meta ? <small>{meta}</small> : null}
        </div>
        {onOpen ? (
          <button type="button" className="vk-card-open" aria-label={`${name} öffnen`} onClick={onOpen}>
            <Icon src={a.openTab} size={16} />
          </button>
        ) : (
          <span className="vk-card-open">
            <Icon src={a.openTab} size={16} />
          </span>
        )}
      </div>
    </article>
  );
}

function SetKonzernDialog({
  companyName,
  currentKonzernName,
  onCancel,
  onConfirm,
}: {
  companyName: string;
  currentKonzernName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="wmodal" role="dialog" aria-label="Konzern festlegen">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="wmodal-body">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onCancel}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>
        <h2>{companyName} als Konzern festlegen?</h2>
        <p>{currentKonzernName} wird zur Gesellschaft.</p>
        <footer className="wmodal-foot centered">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Festlegen
          </button>
        </footer>
      </div>
    </div>
  );
}

function RemoveKonzernDialog({
  konzernName,
  subsidiaries,
  onCancel,
  onConfirm,
}: {
  konzernName: string;
  subsidiaries: { id: string; name: string }[];
  onCancel: () => void;
  onConfirm: (successorId: string | "dissolve") => void;
}) {
  const [choice, setChoice] = useState<string | "dissolve" | "">("");
  const [error, setError] = useState("");

  return (
    <div className="wmodal" role="dialog" aria-label={`${konzernName} entfernen`}>
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="wmodal-body">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onCancel}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>
        <h2>{konzernName} entfernen</h2>
        {subsidiaries.length >= 2 ? (
          <>
            <p>Wählen Sie einen neuen Konzern oder lösen Sie die Gruppe auf.</p>
            <div className="radio-stack">
              {subsidiaries.map((sub) => (
                <RadioRow key={sub.id} tall selected={choice === sub.id} onSelect={() => setChoice(sub.id)}>
                  {sub.name}
                  <br />
                  <small>Wird neuer Konzern</small>
                </RadioRow>
              ))}
              <RadioRow tall selected={choice === "dissolve"} onSelect={() => setChoice("dissolve")}>
                Gruppe auflösen
                <br />
                <small>Alle Gesellschaften werden eigenständig</small>
              </RadioRow>
            </div>
          </>
        ) : subsidiaries.length === 1 ? (
          <p>Die Gruppe wird aufgelöst. {subsidiaries[0].name} wird eigenständig.</p>
        ) : (
          <p>Die Konzernstruktur wird geleert.</p>
        )}
        {error ? <p className="ks-add-error">{error}</p> : null}
        <footer className="wmodal-foot centered">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (subsidiaries.length >= 2) {
                if (!choice) {
                  setError("Wählen Sie eine Option.");
                  return;
                }
                onConfirm(choice);
                return;
              }
              onConfirm(subsidiaries.length === 1 ? subsidiaries[0].id : "dissolve");
            }}
          >
            Entfernen
          </button>
        </footer>
      </div>
    </div>
  );
}

function AddCompanyDialog({
  title,
  excludeCompanyIds,
  currentGroupId,
  onClose,
  onLink,
  onMove,
  onCreate,
}: {
  title: string;
  excludeCompanyIds: string[];
  currentGroupId?: string;
  onClose: () => void;
  onLink: (companyId: string) => void;
  onMove: (companyId: string) => void;
  onCreate: (name: string) => void;
}) {
  const { companies, groupOf } = useCompanyGroups();
  const options = companies
    .filter((company) => !excludeCompanyIds.includes(company.id))
    .filter((company) => groupOf(company.id)?.konzernId !== company.id)
    .map((company) => company.name);

  function pick(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const company = companies.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
    if (!company) {
      onCreate(trimmed);
      return;
    }
    const existingGroup = groupOf(company.id);
    const otherGroup = existingGroup && existingGroup.id !== currentGroupId ? existingGroup : undefined;
    if (otherGroup) onMove(company.id);
    else onLink(company.id);
  }

  return (
    <div className="wmodal" role="dialog" aria-label={title}>
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="wmodal-body ks-dialog-wide">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onClose}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>
        <h2>{title}</h2>
        <Field label="Partner">
          <PartnerSearch value="" options={options} onChange={pick} />
        </Field>
      </div>
    </div>
  );
}

function AddPersonDialog({
  options,
  onClose,
  onAdd,
}: {
  options: string[];
  onClose: () => void;
  onAdd: (person: string, role: CompanyRole) => void;
}) {
  const [person, setPerson] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="wmodal" role="dialog" aria-label="Person hinzufügen">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="wmodal-body ks-dialog-wide">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onClose}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>
        <h2>Person hinzufügen</h2>
        <Field label="Person">
          <PartnerSearch value={person} options={options} onChange={setPerson} />
        </Field>
        <Field label="Rolle">
          <Text value={role} onChange={setRole} placeholder="z. B. Geschäftsführung" />
        </Field>
        {error ? <p className="ks-add-error">{error}</p> : null}
        <footer className="wmodal-foot centered">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!person.trim() || !role.trim()) {
                setError("Person und Rolle angeben.");
                return;
              }
              onAdd(person.trim(), role.trim());
            }}
          >
            Hinzufügen
          </button>
        </footer>
      </div>
    </div>
  );
}

function PersonCards({
  roles,
  peopleOpen,
  otherCompaniesOf,
  onOpen,
  onRemove,
  onStartAdd,
}: {
  roles: CompanyRoleLink[];
  peopleOpen: boolean;
  otherCompaniesOf: (person: string) => string[];
  onOpen: (person: string) => void;
  onRemove: (linkId: string) => void;
  onStartAdd: () => void;
}) {
  const visible = peopleOpen ? roles : [];
  return (
    <>
      {visible.map((link) => {
        const also = otherCompaniesOf(link.person);
        const partnerId = partnerIdByName(link.person);
        const chip = partnerId ? kindLabel(FILE_PARTNERS[partnerId].kind ?? "interessent") || "Interessent" : "Interessent";
        return (
          <Fragment key={link.id}>
            <div className="ks-vline" />
            <EntityCard
              caption={link.role}
              name={link.person}
              meta={also.length > 0 ? `Auch bei ${also.join(", ")}` : undefined}
              glyph={a.clientBlank}
              chip={chip}
              onOpen={partnerId ? () => onOpen(link.person) : undefined}
              menuItems={[{ label: "Entfernen", icon: a.trash, danger: true, onSelect: () => onRemove(link.id) }]}
            />
          </Fragment>
        );
      })}
      <div className="ks-vline" />
      <AddSlot kind="personen" onClick={onStartAdd} />
    </>
  );
}

/**
 * Konzernstruktur: the business-partner version of Verknüpfung. Groups companies into a
 * two-level Konzern/Gesellschaft structure and links people into each company by role.
 * Rendered on the Verknüpfung page of a company file instead of the Privatperson
 * VerknuepfungPanel.
 */
export function KonzernstrukturPanel({ currentCompanyId }: { currentCompanyId: string }) {
  const store = useCompanyGroups();
  const { openPartner } = useWorkflow();
  const group = store.groupOf(currentCompanyId);

  const [peopleOpen, setPeopleOpen] = useState(false);
  const [dialog, setDialog] = useState<
    | { kind: "setKonzern"; companyId: string }
    | { kind: "removeKonzern"; groupId: string }
    | { kind: "addCompany"; mode: "subsidiary" | "konzern" }
    | { kind: "addPerson"; companyId: string }
    | null
  >(null);
  const [toast, setToast] = useState<Toast | null>(null);

  function notify(message: string) {
    setToast({ id: Date.now(), message, undo: () => store.undo() });
  }

  function openNamedPartner(name: string) {
    const id = partnerIdByName(name);
    if (id) openPartner(id);
  }

  function openCompany(id: string) {
    const partnerId = asPartnerId(id);
    if (partnerId) openPartner(partnerId);
  }

  const konzernId = group?.konzernId ?? null;

  const addCompanyDialog =
    dialog?.kind === "addCompany" ? (
      <AddCompanyDialog
        title={dialog.mode === "konzern" ? "Konzern hinzufügen" : "Unternehmen hinzufügen"}
        excludeCompanyIds={
          dialog.mode === "konzern" ? [] : group?.konzernId ? [group.konzernId, ...group.memberIds] : []
        }
        currentGroupId={dialog.mode === "subsidiary" ? group?.id : undefined}
        onClose={() => setDialog(null)}
        onLink={(companyId) => {
          if (dialog.mode === "konzern") store.startGroupWithKonzern(companyId, currentCompanyId);
          else if (group) store.linkCompanyToGroup(companyId, group.id);
          setDialog(null);
          notify(
            dialog.mode === "konzern"
              ? `${store.companyName(companyId)} ist jetzt Konzern`
              : `${store.companyName(companyId)} verknüpft`,
          );
        }}
        onMove={(companyId) => {
          if (dialog.mode === "konzern") store.startGroupWithKonzern(companyId, currentCompanyId);
          else if (group) store.linkCompanyToGroup(companyId, group.id);
          setDialog(null);
          notify(
            dialog.mode === "konzern"
              ? `${store.companyName(companyId)} ist jetzt Konzern`
              : `${store.companyName(companyId)} verknüpft`,
          );
        }}
        onCreate={(name) => {
          if (!name) return;
          if (dialog.mode === "konzern") store.createAndStartGroup(name, currentCompanyId);
          else if (group) store.createAndLinkCompany(name, group.id);
          setDialog(null);
          notify(dialog.mode === "konzern" ? `${name} ist jetzt Konzern` : `${name} verknüpft`);
        }}
      />
    ) : null;

  const toastNode = toast ? (
    <Snackbar key={toast.id} message={toast.message} onUndo={toast.undo} onClose={() => setToast(null)} />
  ) : null;

  if (!group || !konzernId) {
    return (
      <section className="vk-panel ks-section">
        <header className="ks-head">
          <div className="ks-head-brand">
            <span>
              <Icon src={a.verknuepfung} size={24} />
              Verknüpfung
            </span>
            <p className="ks-now">Aktuell in Wino</p>
          </div>
        </header>
        <h2 className="ks-title">Konzern</h2>
        <div className="ks-tree">
          <div className="ks-spine">
            <AddSlot kind="konzern" onClick={() => setDialog({ kind: "addCompany", mode: "konzern" })} />
          </div>
        </div>
        {addCompanyDialog}
        {toastNode}
      </section>
    );
  }

  const activeGroup = group;
  const konzern = store.companies.find((company) => company.id === konzernId);
  const konzernName = konzern?.name ?? konzernId;
  const subsidiaries = activeGroup.memberIds
    .map((id) => store.companies.find((company) => company.id === id) ?? { id, name: store.companyName(id), city: "" })
    .filter(Boolean);
  const konzernRoles = store.rolesOf(konzernId);
  const showExpand = subsidiaries.length > 0;

  function personHandlers(companyId: string) {
    const roles = store.rolesOf(companyId);
    return {
      roles,
      otherCompaniesOf: (person: string) => store.otherCompaniesOf(person, activeGroup, companyId),
      onRemove: (linkId: string) => {
        const link = roles.find((entry) => entry.id === linkId);
        store.removePerson(linkId);
        if (link) notify(`${link.person} entfernt`);
      },
      onStartAdd: () => setDialog({ kind: "addPerson", companyId }),
    };
  }

  const konzernPeople = personHandlers(konzernId);

  return (
    <section className="vk-panel ks-section">
      <header className="ks-head">
        <div className="ks-head-brand">
          <span>
            <Icon src={a.verknuepfung} size={24} />
            Verknüpfung
          </span>
          <p className="ks-now">Aktuell in Wino</p>
        </div>
        {showExpand ? (
          <button
            type="button"
            className={peopleOpen ? "btn-secondary ks-expand open" : "btn-secondary ks-expand"}
            aria-expanded={peopleOpen}
            onClick={() => setPeopleOpen(!peopleOpen)}
          >
            <Icon src={a.chevronDark} size={18} />
            {peopleOpen ? "Alle zuklappen" : "Alle aufklappen"}
          </button>
        ) : null}
      </header>
      <h2 className="ks-title">Konzern</h2>

      <div className="ks-tree">
        <div className="ks-spine">
          <EntityCard
            caption="Konzern"
            name={konzernName}
            meta={companyMetaLine(konzern)}
            glyph={a.companyBlank}
            chip="Interessent"
            onOpen={asPartnerId(konzernId) ? () => openCompany(konzernId) : undefined}
            menuItems={[
              { label: "Person hinzufügen", icon: a.plusCircle, onSelect: konzernPeople.onStartAdd },
              { label: "Konzern entfernen", icon: a.trash, danger: true, onSelect: () => setDialog({ kind: "removeKonzern", groupId: group.id }) },
            ]}
          />

          {peopleOpen
            ? konzernRoles.map((link) => {
                const also = konzernPeople.otherCompaniesOf(link.person);
                const partnerId = partnerIdByName(link.person);
                return (
                  <Fragment key={link.id}>
                    <div className="ks-vline" />
                    <EntityCard
                      caption={link.role}
                      name={link.person}
                      meta={also.length > 0 ? `Auch bei ${also.join(", ")}` : undefined}
                      glyph={a.clientBlank}
                      chip="Interessent"
                      onOpen={partnerId ? () => openNamedPartner(link.person) : undefined}
                      menuItems={[
                        { label: "Entfernen", icon: a.trash, danger: true, onSelect: () => konzernPeople.onRemove(link.id) },
                      ]}
                    />
                  </Fragment>
                );
              })
            : null}

          <div className="ks-vline" />

          {subsidiaries.length === 0 ? (
            <AddSlot kind="unternehmen" onClick={() => setDialog({ kind: "addCompany", mode: "subsidiary" })} />
          ) : null}
        </div>

        {subsidiaries.length > 0 ? (
          <div className="ks-company-row">
            {subsidiaries.map((company, index) => {
              const handlers = personHandlers(company.id);
              return (
                <Fragment key={company.id}>
                  {index > 0 ? <span className="ks-hline" /> : null}
                  <div className="ks-col">
                    <EntityCard
                      caption="Unternehmen"
                      name={company.name}
                      meta={companyMetaLine(company)}
                      glyph={a.companyBlank}
                      chip="Interessent"
                      onOpen={asPartnerId(company.id) ? () => openCompany(company.id) : undefined}
                      menuItems={[
                        { label: "Als Konzern festlegen", icon: a.verknuepfung, onSelect: () => setDialog({ kind: "setKonzern", companyId: company.id }) },
                        {
                          label: "Aus Gruppe entfernen",
                          icon: a.trash,
                          danger: true,
                          onSelect: () => {
                            store.removeSubsidiary(company.id);
                            notify(`${company.name} aus der Gruppe entfernt`);
                          },
                        },
                      ]}
                    />
                    <PersonCards peopleOpen={peopleOpen} onOpen={openNamedPartner} {...handlers} />
                  </div>
                </Fragment>
              );
            })}
            <span className="ks-hline" />
            <AddSlot kind="unternehmen" onClick={() => setDialog({ kind: "addCompany", mode: "subsidiary" })} />
          </div>
        ) : null}
      </div>

      {dialog?.kind === "setKonzern" ? (
        <SetKonzernDialog
          companyName={companyShortName(store.companyName(dialog.companyId))}
          currentKonzernName={companyShortName(konzernName)}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            const name = store.companyName(dialog.companyId);
            store.setKonzern(dialog.companyId);
            setDialog(null);
            notify(`${name} ist jetzt Konzern`);
          }}
        />
      ) : null}

      {dialog?.kind === "removeKonzern" ? (
        <RemoveKonzernDialog
          konzernName={konzernName}
          subsidiaries={subsidiaries.map((company) => ({ id: company.id, name: company.name }))}
          onCancel={() => setDialog(null)}
          onConfirm={(successorId) => {
            store.removeKonzern(group.id, successorId);
            setDialog(null);
            if (successorId === "dissolve") notify("Gruppe aufgelöst");
            else notify(`${store.companyName(successorId)} ist jetzt Konzern`);
          }}
        />
      ) : null}

      {dialog?.kind === "addPerson" ? (
        <AddPersonDialog
          options={COMPANY_CONTACTS.filter(
            (contact) => !store.rolesOf(dialog.companyId).some((link) => link.person === contact),
          )}
          onClose={() => setDialog(null)}
          onAdd={(person, role) => {
            store.addPerson(dialog.companyId, person, role);
            setPeopleOpen(true);
            setDialog(null);
            notify(`${person} hinzugefügt`);
          }}
        />
      ) : null}

      {addCompanyDialog}
      {toastNode}
    </section>
  );
}
