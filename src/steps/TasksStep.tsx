import * as a from "../assets/index";
import { Icon, IdCardIcon } from "../ui";

const TASKS = [
  { id: "id", label: "Ausweis und/oder Reisepass hochladen" },
  { id: "bank", label: "Bankverbindung angeben" },
  { id: "contact", label: "Kontaktdaten angeben" },
];

export function TasksStep() {
  return (
    <div className="tasks-page">
      <div className="tasks-person">
        <span className="stack-icon" style={{ width: 32, height: 32 }}>
          <img src={a.avatarBg} alt="" width={32} height={32} />
          <img src={a.personSmall} alt="" width={21} height={21} style={{ inset: 5 }} />
        </span>
        <div className="tasks-person-copy">
          <span className="chip">Interessent</span>
          <strong>Julia Atkinson</strong>
          <small>12.09.1988</small>
          <p>
            Mondseestrasse 32
            <br />
            A-5310 Mondsee
          </p>
        </div>
        <span className="tasks-person-id">ID: 2813</span>
      </div>

      <h1>Offene Aufgaben</h1>
      <p className="tasks-intro">
        Bevor die Maklervereinbarung vollständig abgeschlossen werden kann, fehlen noch einige
        Angaben. Ergänzen Sie diese gebündelt im Stammdaten-Workflow. Du kannst die Vereinbarung
        bereits jetzt bearbeiten.
      </p>

      <ul className="task-list">
        {TASKS.map((task) => (
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
