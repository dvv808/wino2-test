import { useMemo, useState } from "react";
import * as a from "../../assets/index";
import { addGroup, newId, setMembers } from "../../lib/dms/admin";
import { whoHasAccess } from "../../lib/dms/permissions";
import { formatPath } from "../../lib/dms/placeholders";
import { buildView, findFolder, walk, type FolderNode } from "../../lib/dms/views";
import type { Ansicht } from "../../types/dms";
import { Icon } from "../../ui";
import { useDms } from "../store";
import { Avatar, DmsTable, LevelChip, type DmsColumn } from "../ui";

function FolderPicker({ list, depth, selected, open, onSelect, onToggle }: {
  list: FolderNode[];
  depth: number;
  selected: string;
  open: Set<string>;
  onSelect: (f: FolderNode) => void;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className={depth === 0 ? "dms-tree-list" : undefined}>
      {list.map((f) => (
        <li key={f.key}>
          <div className={`dms-tree-row${selected === f.key ? " selected" : ""}`} style={{ paddingLeft: 8 + depth * 18 }}>
            <button type="button" className={`dms-caret${open.has(f.key) ? " open" : ""}`} disabled={!f.children.length} onClick={() => onToggle(f.key)}>
              {f.children.length ? <Icon src={a.chevronDown} size={14} /> : null}
            </button>
            <button type="button" className="dms-tree-name" onClick={() => onSelect(f)}>
              <span className="dms-folder-icon">
                <Icon src={a.folder} size={20} />
                {f.permissions.length ? <img className="dms-folder-lock" src={a.hnLock} alt="" width={10} height={10} /> : null}
              </span>
              <span className="dms-tree-label">{f.name}</span>
            </button>
          </div>
          {open.has(f.key) && f.children.length ? (
            <FolderPicker list={f.children} depth={depth + 1} selected={selected} open={open} onSelect={onSelect} onToggle={onToggle} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Berechtigungen() {
  const { state, apply } = useDms();
  const [groupId, setGroupId] = useState(state.groups[0]?.id ?? "");
  const [ansicht, setAnsicht] = useState<Ansicht>("Verwaltung");
  const view = useMemo(() => buildView(state, ansicht), [state, ansicht]);
  // Start on the first folder that has rules of its own (a mount folder like "Kunden" grants nothing itself).
  const first = useMemo(() => {
    let found: FolderNode | null = null;
    walk(view, (f) => {
      if (!found && f.permissions.length) found = f;
    });
    return found as FolderNode | null;
  }, [view]);
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState<Set<string>>(() => new Set(first ? first.path.map((_, i) => first.path.slice(0, i + 1).join("/")) : []));
  const folder = (selected ? findFolder(view, selected.split("/")) : null) ?? first ?? view[0];
  const group = state.groups.find((g) => g.id === groupId) ?? state.groups[0];
  const access = folder ? whoHasAccess(view, folder.path, state) : [];

  type Row = (typeof access)[number];
  const accessColumns: DmsColumn<Row>[] = [
    {
      key: "person",
      label: "Person",
      width: "minmax(190px, 1.2fr)",
      text: (r) => r.person.name,
      render: (r) => (
        <span className="dms-cell-name">
          <Avatar person={r.person} size={28} />
          {r.person.name}
        </span>
      ),
    },
    { key: "stufe", label: "Stufe", width: "minmax(120px, 0.7fr)", text: (r) => r.level, render: (r) => <LevelChip level={r.level} /> },
    { key: "herkunft", label: "Herkunft", width: "minmax(260px, 1.8fr)", text: (r) => r.via },
  ];

  return (
    <div className="dms-admin-split">
      <section className="dms-panel dms-admin-side">
        <header className="dms-admin-head">
          <h3>Gruppen</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const id = newId("g");
              apply((s) => addGroup(s, "Neue Gruppe", id).state);
              setGroupId(id);
            }}
          >
            + Gruppe
          </button>
        </header>
        <ul className="dms-pick-list">
          {state.groups.map((g) => (
            <li key={g.id}>
              <button type="button" className={g.id === group?.id ? "active" : ""} onClick={() => setGroupId(g.id)}>
                <strong>{g.name}</strong>
                <small>{g.members.length} Mitglieder</small>
              </button>
            </li>
          ))}
        </ul>
        {group ? (
          <>
            <h4>Mitglieder von {group.name}</h4>
            <ul className="dms-members">
              {state.people.map((p) => (
                <li key={p.id}>
                  <label className="dms-check">
                    <input
                      type="checkbox"
                      checked={group.members.includes(p.id)}
                      onChange={(event) =>
                        apply((s) => setMembers(s, group.id, event.target.checked ? [...group.members, p.id] : group.members.filter((m) => m !== p.id)))
                      }
                    />
                    <Avatar person={p} size={24} />
                    {p.name}
                    {p.rollen.includes("DMS-Admin") ? <span className="dms-tag">DMS-Admin</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="dms-panel dms-admin-main">
        <header className="dms-admin-head">
          <h3>Wer hat Zugriff?</h3>
          <div className="dms-segment" role="tablist">
            {(["Verwaltung", "Standard"] as Ansicht[]).map((a2) => (
              <button type="button" key={a2} className={ansicht === a2 ? "active" : ""} onClick={() => setAnsicht(a2)}>
                {a2}
              </button>
            ))}
          </div>
        </header>
        <div className="dms-access-split">
          <FolderPicker
            list={view}
            depth={0}
            selected={folder?.key ?? ""}
            open={open}
            onSelect={(f) => setSelected(f.key)}
            onToggle={(key) =>
              setOpen((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
          />
          <div className="dms-access-table">
            <p className="dms-muted">
              {folder ? formatPath(folder.path) : ""} · Vererbung aufgelöst. Nur Erlaubnisse, keine Sperren; vertrauliche Dokumente sehen nur die genannten Personen.
            </p>
            <DmsTable rows={access} columns={accessColumns} rowKey={(r) => r.person.id} label="Wer hat Zugriff?" unit="Personen" />
          </div>
        </div>
      </section>
    </div>
  );
}
