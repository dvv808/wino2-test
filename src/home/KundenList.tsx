import { useMemo, useState } from "react";
import * as a from "../assets/index";
import { DmsTable, type DmsColumn } from "../dms/ui";
import type { PartnerId } from "../person/partners";
import { isInactive, isKunde, kuerzel, kundenRows, type Kunde } from "./kundenData";
import { useWorkflow } from "../workflow";
import { TEAM } from "../manager/hrmTeam";

/**
 * Home → Bestand → Kunden (Figma 8534:82498): every customer in one standard table (DmsTable, Status zu Rechnungen
 * look, a filter per column). The real partner files open in a new tab; the rest are demo rows. Hot filters
 * Alle / Zuletzt geöffnet / Häufigsten geöffnet; an active one shows as a bubble under them.
 */

type Hot = "zuletzt" | "haeufig";
const HOT: { id: Hot | null; label: string }[] = [
  { id: null, label: "Alle" },
  { id: "zuletzt", label: "Zuletzt geöffnet" },
  { id: "haeufig", label: "Häufigsten geöffnet" },
];
const OFTEN: PartnerId[] = ["julia", "lunixo", "thomas", "ashley"];

/** Partner icon: dark with the Winter badge for a Kunde, light grey otherwise. */
function KundeAvatar({ company, kunde }: { company: boolean; kunde: boolean }) {
  return (
    <span className={kunde ? "kd-avatar kunde" : "kd-avatar"}>
      <img src={kunde ? a.avatarBgDark : a.avatarBg} alt="" />
      <img className="glyph" src={company ? a.companyBlank : a.clientBlank} alt="" />
      {kunde ? <img className="kd-badge" src={a.kundeBadge} alt="Winter Kunde" /> : null}
    </span>
  );
}

function chipClass(tag: string) {
  if (tag.startsWith("Interessent")) return "chip";
  if (tag.startsWith("Einfache")) return "chip einfach";
  return "chip kunde";
}

export function KundenList() {
  const { ashleyConverted, openFileIds, openPartner, openPartnerCreate } = useWorkflow();
  const [hot, setHot] = useState<Hot | null>(null);
  const all = useMemo(() => kundenRows(ashleyConverted), [ashleyConverted]);
  const rows = all.filter((r) => (hot === "zuletzt" ? !!r.id && openFileIds.includes(r.id) : hot === "haeufig" ? !!r.id && OFTEN.includes(r.id) : true));
  // Every row is a Wino file (demo customers are registered at start), so it opens like any partner.
  const open = (r: Kunde) => r.id && openPartner(r.id);

  const columns: DmsColumn<Kunde>[] = [
    {
      key: "kunde",
      label: "Kunde",
      width: "minmax(314px, 314fr)",
      text: (r) => `${r.name} ${r.sub}`,
      className: "kd-kunde",
      render: (r) => (
        <div className={r.unpaid ? "kd-person unpaid" : "kd-person"}>
          <KundeAvatar company={r.company} kunde={isKunde(r)} />
          <span className="kd-copy">
            {r.unpaid ? <small className="kd-alert">Abonnement nicht bezahlt</small> : null}
            <strong>
              {r.locked ? <img src={a.hnLock} alt="Gesperrt" width={12} height={12} /> : null}
              {r.name}
            </strong>
            {r.sub ? <small>{r.sub}</small> : null}
          </span>
          <button type="button" className="cell-open" aria-label={`${r.name} öffnen`} onClick={() => open(r)}>
            <img src={a.openTab} alt="" width={16} height={16} />
          </button>
        </div>
      ),
    },
    {
      key: "adresse",
      label: "Adresse",
      width: "minmax(187px, 187fr)",
      text: (r) => `${r.street} ${r.city}`,
      render: (r) => (
        <span className="kd-lines">
          {r.street}
          <br />
          {r.city}
        </span>
      ),
    },
    {
      key: "typ",
      label: "Partner Typ",
      width: "minmax(190px, 190fr)",
      text: (r) => r.tags.join(" "),
      render: (r) => (
        <span className="kd-tags">
          {r.tags.map((tag) => {
            const [main, until] = tag.split(" bis ");
            return (
              <span className={chipClass(tag)} key={tag}>
                {main}
                {until ? <small> bis {until}</small> : null}
              </span>
            );
          })}
        </span>
      ),
    },
    { key: "konzern", label: "Konzern", width: "minmax(168px, 168fr)", text: (r) => r.konzern },
    { key: "familie", label: "Familie", width: "minmax(168px, 168fr)", text: (r) => r.familie },
    {
      key: "berater",
      label: "Kundenberater",
      width: "minmax(170px, 170fr)",
      text: (r) => `${kuerzel(r.berater)} ${r.berater}`,
      render: (r) => {
        const photo = TEAM.find((m) => m.name === r.berater)?.photo;
        return (
          <span className="kd-berater" title={r.berater}>
            <span className="emp-avatar">
              <img src={photo || a.clientBlank} alt="" />
              <img className="emp-dot" src={a.statusDot} alt="" />
            </span>
            {kuerzel(r.berater)}
          </span>
        );
      },
    },
    { key: "id", label: "ID", width: "minmax(123px, 123fr)", text: (r) => r.kundenNr },
  ];

  const hotLabel = HOT.find((h) => h.id === hot)?.label;

  return (
    <section className="kd-page">
      <header className="kd-head">
        <h1>
          Kunden <span>{rows.length.toLocaleString("de-DE")} Ergebnisse</span>
        </h1>
        <div className="kd-head-actions">
        <div className="kd-hot" role="group" aria-label="Schnellfilter">
          {HOT.map((h) => (
            <button type="button" key={h.label} className={hot === h.id ? "kd-hot-pill active" : "kd-hot-pill"} onClick={() => setHot(h.id)}>
              {hot === h.id ? <img src={a.tick} alt="" width={12} height={12} /> : null}
              {h.label}
            </button>
          ))}
        </div>
        {/* Partner anlegen (was in the logo menu until the logo became the Home button). */}
        <button type="button" className="btn-primary kd-create" onClick={openPartnerCreate}>
          Partner anlegen
        </button>
        </div>
      </header>
      {hot && hotLabel ? (
        <div className="mb-ant-filterbar">
          <div className="mb-ant-bubbles">
            <button type="button" className="mb-ant-bubble" onClick={() => setHot(null)}>
              {hotLabel}
              <img src={a.iconCloseDark} alt={`Filter ${hotLabel} entfernen`} width={12} height={12} />
            </button>
          </div>
        </div>
      ) : null}
      <DmsTable key={hot ?? "alle"} rows={rows} columns={columns} rowKey={(r) => r.key} label="Kunden" unit="Kunden" rowClass={(r) => ["kd-row", r.unpaid ? "unpaid" : "", isInactive(r) ? "inactive" : ""].join(" ")} />
    </section>
  );
}
