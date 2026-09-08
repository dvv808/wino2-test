import * as a from "../assets/index";
import { Icon } from "../ui";

type Employee = {
  name: string;
  role: string;
  photo: string;
  requests: number;
  workflows: number;
};

type Department = {
  label: string;
  lead?: string[];
  people: Employee[];
};

const DEPARTMENTS: Department[] = [
  {
    label: "Beratung & Service (3)",
    lead: ["Vorgesetzter der Abteilung: Adams Lucy", "Abteilungsleitung: Christine Auer"],
    people: [
      {
        name: "Christine Auer Hammer-schmidt",
        role: "Leitung Beratung & Service",
        photo: a.empChristineHs,
        requests: 0,
        workflows: 0,
      },
      {
        name: "Alexander Doppler",
        role: "Leitung Beratung & Service & Schadensvabwicklungen",
        photo: a.empAlexander,
        requests: 0,
        workflows: 0,
      },
      { name: "Christine Auer", role: "Berater", photo: a.empChristine, requests: 1, workflows: 2 },
    ],
  },
  {
    label: "Unternehmensleitung (3)",
    lead: ["Leiter des Unternehmens: Peter Moser"],
    people: [
      {
        name: "Peter Moser",
        role: "CEO & Geschäftsführer",
        photo: a.empPeter,
        requests: 0,
        workflows: 3,
      },
      {
        name: "Lucy Dullon",
        role: "Leitung Beratung & Service",
        photo: a.empLucy,
        requests: 0,
        workflows: 0,
      },
      { name: "Jasmin Gratzinger", role: "Berater", photo: a.empJasmin, requests: 1, workflows: 2 },
    ],
  },
];

function CountChip({ icon, value }: { icon: string; value: number }) {
  return (
    <span className="emp-chip">
      <Icon src={icon} size={14} />
      {value}
    </span>
  );
}

function EmployeeCard({ person }: { person: Employee }) {
  return (
    <li className="emp-card">
      <span className="emp-avatar">
        <img src={person.photo} alt="" />
        <img className="emp-dot" src={a.statusDot} alt="" />
      </span>
      <span className="emp-copy">
        <strong>{person.name}</strong>
        <small>{person.role}</small>
      </span>
      <button type="button" className="emp-open" aria-label={`${person.name} öffnen`}>
        <Icon src={a.openTab} size={15} />
      </button>
      <span className="emp-chips">
        <CountChip icon={a.requestSmall} value={person.requests} />
        <CountChip icon={a.workflow} value={person.workflows} />
      </span>
    </li>
  );
}

export function MitarbeiterSidebar() {
  return (
    <aside className="mitarbeiter">
      <div className="mitarbeiter-head">
        <div className="mitarbeiter-title">
          <h2>Mitarbeiter</h2>
          <span className="mitarbeiter-count">112</span>
        </div>

        <label className="mitarbeiter-search">
          <Icon src={a.searchDark} size={18} />
          <input type="search" placeholder="Suchen..." />
        </label>

        <button type="button" className="mitarbeiter-select">
          Alle Mitarbeiter &amp; Abteilungen
          <Icon src={a.chevronDown} size={18} />
        </button>

        <button type="button" className="mitarbeiter-select">
          <Icon src={a.calendar} size={18} />
          Zeitpunk: Heute
          <Icon src={a.chevronDown} size={18} />
        </button>
      </div>

      <div className="mitarbeiter-body">
        {DEPARTMENTS.map((department) => (
          <section className="dept" key={department.label}>
            <div className="dept-head">
              <span className="dept-name">
                <img className="tickbox" src={a.tickbox} alt="" width={14} height={14} />
                {department.label}
              </span>
              <span className="dept-actions">
                <Icon src={a.openTab} size={18} />
                <Icon src={a.chevronDown} size={18} />
              </span>
            </div>
            {department.lead?.map((line) => (
              <p className="dept-lead" key={line}>
                {line}
              </p>
            ))}
            <ul className="emp-list">
              {department.people.map((person) => (
                <EmployeeCard person={person} key={person.name} />
              ))}
            </ul>
          </section>
        ))}

        <div className="dept-head divided">
          <span className="dept-name">
            <img className="tickbox" src={a.tickbox} alt="" width={14} height={14} />
            <Icon src={a.abteilung} size={12} />
            Schadenabteilung (3)
          </span>
          <span className="dept-actions">
            <Icon src={a.openTab} size={18} />
            <Icon src={a.chevronDown} size={18} />
          </span>
        </div>
      </div>
    </aside>
  );
}
