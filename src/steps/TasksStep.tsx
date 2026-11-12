import * as a from "../assets/index";
import { Icon, IdCardIcon } from "../ui";
import { openTasks } from "../person/stammdaten";
import { useWorkflow } from "../workflow";
import { FilePersonChip, useFilePerson } from "../chrome";

const TASKS = [
  { id: "id", label: "Ausweis und/oder Reisepass hochladen" },
  { id: "bank", label: "Bankverbindung angeben" },
  { id: "contact", label: "Kontaktdaten angeben" },
];

export function TasksStep() {
  // Only what is still missing in the Stammdaten: an added Ausweis, Bankverbindung or contact drops off.
  const { sections } = useWorkflow();
  // The partner whose file this Maklervereinbarung belongs to – never a fixed person.
  const { personName, born, address, file, isCompany } = useFilePerson();
  const open = new Set(openTasks(sections));
  const tasks = TASKS.filter((task) => open.has(task.id as "id" | "bank" | "contact"));
  return (
    <div className="tasks-page">
      <div className="tasks-person">
        <span className="stack-icon" style={{ width: 32, height: 32 }}>
          <img src={a.avatarBg} alt="" width={32} height={32} />
          <img
            src={isCompany ? a.companyBlank : a.personSmall}
            alt=""
            width={21}
            height={21}
            style={{ inset: 5 }}
          />
        </span>
        <div className="tasks-person-copy">
          <FilePersonChip />
          <strong>{personName}</strong>
          {isCompany ? (file.fn ? <small>FN {file.fn}</small> : null) : born ? <small>{born}</small> : null}
          {address && (address[0] || address[1]) ? (
            <p>
              {address[0]}
              {address[0] && address[1] ? <br /> : null}
              {address[1]}
            </p>
          ) : null}
        </div>
        <span className="tasks-person-id">ID: {file.fileId}</span>
      </div>

      <h1>Offene Aufgaben</h1>
      {tasks.length ? (
        <p className="tasks-intro">
          Bevor die Maklervereinbarung vollständig abgeschlossen werden kann, fehlen noch einige
          Angaben. Ergänzen Sie diese gebündelt im Stammdaten-Workflow. Du kannst die Vereinbarung
          bereits jetzt bearbeiten.
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="tasks-done">
          <Icon src={a.checkGreen} size={16} />
          Alle Angaben sind in den Stammdaten hinterlegt.
        </p>
      ) : null}
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id}>
            <span className="task-main">
              <Icon src={a.onhold} size={16} />
              {task.id === "id" && <IdCardIcon />}
              {task.id === "bank" && <Icon src={a.bank} size={16} />}
              {task.id === "contact" && <Icon src={a.contactBadge} size={16} />}
              {task.label}
            </span>
            <button type="button" className="task-add">
              <Icon src={a.plusCircle} size={16} />
              hinzufügen
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
