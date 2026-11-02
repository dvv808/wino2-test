import * as a from "../assets/index";
import { FILE_PARTNERS, kindLabel, partnerKindText, type PartnerId } from "../person/partners";
import { useWorkflow } from "../workflow";

/**
 * Bestand › Dashboard: the partner files, listed where the logo dropdown used to be. "Partner anlegen" sits top right
 * and starts the Partner-anlegen workflow.
 */
export function PartnerList() {
  const { openPartner, ashleyConverted, extraPartners, openPartnerCreate } = useWorkflow();

  const partners: { id: PartnerId; name: string; type: string; company: boolean }[] = [
    { id: "julia", name: FILE_PARTNERS.julia.name, type: kindLabel("interessent"), company: false },
    {
      id: "ashley",
      name: FILE_PARTNERS.ashley.name,
      type: ashleyConverted ? kindLabel("interessent") : "Einfache Person",
      company: false,
    },
    { id: "lunixo", name: FILE_PARTNERS.lunixo.name, type: kindLabel("interessent"), company: true },
    { id: "lunixo-holding", name: FILE_PARTNERS["lunixo-holding"].name, type: kindLabel("interessent"), company: true },
    {
      id: "lunixo-immobilien",
      name: FILE_PARTNERS["lunixo-immobilien"].name,
      type: kindLabel("interessent"),
      company: true,
    },
    ...extraPartners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      type: partnerKindText(partner.kind),
      company: FILE_PARTNERS[partner.id]?.fileKind === "company",
    })),
  ];

  return (
    <section className="mb-partners">
      <header className="mb-partners-head">
        <div>
          <h1>Partner</h1>
          <p>{partners.length} Partner im Bestand</p>
        </div>
        <button type="button" className="btn-primary" onClick={openPartnerCreate}>
          Partner anlegen
        </button>
      </header>

      <ul className="mb-partners-list">
        {partners.map((partner) => (
          <li key={partner.id}>
            <button type="button" onClick={() => openPartner(partner.id)}>
              <span className="mb-partner-avatar">
                <img src={partner.company ? a.companyBlank : a.clientBlank} alt="" width={36} height={36} />
              </span>
              <span className="mb-partner-copy">
                <strong>{partner.name}</strong>
                <small>{partner.type}</small>
              </span>
              <img className="mb-partner-open" src={a.openTab} alt="" width={16} height={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
