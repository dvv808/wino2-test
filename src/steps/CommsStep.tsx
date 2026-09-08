import * as a from "../assets/index";
import { Summary } from "../Summary";
import { EditLink, EntityIcon, Icon } from "../ui";

const FIELDS = [
  { id: "phone", label: "Telefonnummer Mobil", icon: a.phone, value: "+43 664 22 22 15 2" },
  { id: "mail", label: "E-Mail Adresse", icon: a.mail, value: "julia.atkinson@mail.at" },
  {
    id: "post",
    label: "Postadresse",
    icon: a.house,
    value: "Mondseestrasse 32",
    second: "A-5310 Mondsee",
  },
];

export function CommsStep() {
  return (
    <>
      <section>
        <div className="page-title">
          <h1>Kommunikationsdaten Kunde</h1>
          <p>Bitte wähle die Kontaktdaten aus die der Kunde für die Maklervereinbarung wünscht.</p>
        </div>

        <div className="panel-card">
          <h2>Zentrale Kontaktdaten</h2>
          <div className="form-col plain">
            {FIELDS.map((field) => (
              <div className="block" key={field.id}>
                <div className="label-row">
                  <span className="field-label">{field.label}</span>
                  <EditLink />
                </div>
                <button type="button" className="entity-card">
                  <EntityIcon src={field.icon} />
                  <span className="copy">
                    {field.value}
                    {field.second ? (
                      <>
                        <br />
                        {field.second}
                      </>
                    ) : null}
                  </span>
                  <Icon src={a.selectCaret} size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Summary cards={["contact"]} />
    </>
  );
}
