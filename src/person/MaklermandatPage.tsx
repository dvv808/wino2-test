import { ShelfBody, ShelfTitle } from "./ProfileShelf";
import { useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { Icon } from "../ui";
import { FileIdentity } from "../chrome";
import { useWorkflow } from "../workflow";
import { DataCard } from "./cards";
import {
  getPartner,
  type FileContact,
  type FilePartner,
  type PartnerKind,
} from "./partners";
import { liveFileIdentity, type Card, type Section } from "./stammdaten";
import { useHonorar } from "../honorar/store";
import { agreementLines } from "../honorar/invoiceCells";
import type { Fee, Partner } from "../types/honorar";
import { useDms } from "../dms/store";
import { setDmsFocus } from "../dms/focus";
import { formatDate, formatSize, StatusChip } from "../dms/ui";
import {
  partnerAgreements,
  type AgreementSection,
} from "../lib/dms/agreements";
import { formatPath } from "../lib/dms/placeholders";
import { buildView, locateDocument } from "../lib/dms/views";
import { nextStates, setStatus } from "../lib/dms/workflow";
import type { DmsState, Dokument } from "../types/dms";

const MANDATE_SECTIONS = [
  {
    id: "gueltig",
    icon: a.confirmOutline,
    title: "Gültige Vereinbarungen",
    empty: "Gültige Vereinbarungen erscheinen hier",
    create: true,
  },
  {
    id: "entwuerfe",
    icon: a.notes,
    title: "Entwürfe",
    empty: "Entwürfe erscheinen hier",
  },
  {
    id: "abgelaufen",
    icon: a.docList,
    title: "Abgelaufen (0)",
    empty: "Keine abgelaufenen Vereinbarungen",
  },
] as const;

const SIDE_SUBS = [
  { id: "gueltig", icon: a.confirmOutline, label: "Gültig (0)" },
  { id: "entwuerfe", icon: a.notes, label: "Entwürfe (0)" },
  { id: "abgelaufen", icon: a.docList, label: "Abgelaufen" },
] as const;

const FEATURES = [
  "Risikomanagement",
  "Maklervereinbarungen",
  "Vollmachten",
  "Angebote",
  "und mehr",
];

const OVERVIEW = [
  {
    icon: a.iconInteressent,
    label: "Interessentenvereinbarung",
    state: "Offen",
    child: { icon: a.iconMandate, label: "AV Vollmacht", state: "Offen" },
  },
];

const CREATE_COPY =
  "Dolor sit amet di donitas amir estis della sonte esimir, della sonte del dante di don esimir della sonte.";

const CREATE_OPTIONS = [
  {
    id: "interessent",
    title: "Interessentenvereinbarung",
    enabled: false,
    tree: [
      {
        icon: a.iconInteressent,
        label: "Interessentenvereinbarung",
        state: "Offen",
      },
      { icon: a.iconMandate, label: "AV Vollmacht", state: "Offen" },
    ],
  },
  {
    id: "makler",
    title: "Maklervereinbarung",
    enabled: true,
    tree: [
      {
        icon: a.iconBrokerContract,
        label: "Maklervereinbarung",
        state: "Offen",
      },
      {
        icon: a.iconInsurance,
        label: "Vollmacht: Versicherungsmakler",
        state: "Offen",
      },
      { icon: a.iconMandate, label: "AV Vollmacht", state: "Offen" },
    ],
  },
] as const;

function agreementKindLabel(kind?: PartnerKind) {
  if (kind === "interessent") return "Interessent";
  if (kind === "einfach") return "Einfache Person";
  return "Kunde";
}

function agreementContacts(
  file: FilePartner,
  live: ReturnType<typeof liveFileIdentity>,
): FileContact[] {
  if (live.contacts.length) return live.contacts;
  if (file.contacts.length) return file.contacts;
  const fallback: FileContact[] = [];
  if (file.phone)
    fallback.push({
      kind: "phone",
      caption: "Mobil Privat",
      value: file.phone,
    });
  if (file.email)
    fallback.push({ kind: "mail", caption: "Mail Privat", value: file.email });
  return fallback;
}

function feeLine(amount: string) {
  const value = amount
    .replace("EUR", "€")
    .replace(",00", "")
    .replace(/\s+/g, " ")
    .trim();
  return `${value} /Jahr`;
}

function maklerAgreementCard(
  file: FilePartner,
  sections: Section[],
  model: "privat" | "partner" | "custom",
  amount: string,
): Card {
  const live = liveFileIdentity(sections);
  const contacts = agreementContacts(file, live);
  const address = live.address ?? file.address;
  const aboName =
    model === "partner"
      ? "bei anderem Partner mit umfasst"
      : model === "custom"
        ? "Individuell"
        : "Privatkunden";
  const blocks: Card["blocks"] = [];

  if (contacts.length) {
    blocks.push({
      kind: "rows",
      caption: "Zentrale Kontaktdaten",
      rows: contacts.map((contact) => ({
        label: contact.caption,
        value: contact.value,
        icon:
          contact.kind === "phone"
            ? a.phone
            : contact.kind === "web"
              ? a.globe
              : a.mail,
      })),
    });
  }

  if (address) {
    blocks.push({
      kind: "rows",
      caption: "Adressdaten",
      rows: [
        {
          label: "Postadresse",
          value: { kind: "link", text: address.join("\n") },
        },
      ],
    });
  }

  blocks.push(
    {
      kind: "person",
      caption: "Abo Modell",
      name: aboName,
      sub: feeLine(amount),
    },
    {
      kind: "rows",
      caption: "Vordefinierte individuelle Vereinbarungen",
      rows: [
        { label: "Beratungsumfang", value: "Ja" },
        { label: "Schadenservice", value: "Ja" },
      ],
    },
  );

  return {
    id: "makler-vereinbarung",
    // Listed under Gültige Vereinbarungen: a valid agreement carries the green tick (not the pending clock).
    icon: a.hoStatusGenehmigt,
    title: `Maklervereinbarung: ${agreementKindLabel(file.kind)}`,
    clampTo: 551,
    blocks,
  };
}

/**
 * A partner in the Honorar Forderungen always has a valid Maklervereinbarung (a Kunde always has one; there are no
 * Kurzfristige Vereinbarungen yet). Business shows its Laufzeit, Single the date it is valid since.
 */
function honorarAgreementCard(partner: Partner, fee: Fee): Card {
  const [kind, since] = agreementLines(fee);
  const laufzeit = kind === "Maklervereinbarung";
  return {
    id: "honorar-vereinbarung",
    icon: a.hoStatusGenehmigt,
    title: "Maklervereinbarung: Kunde",
    clampTo: 551,
    blocks: [
      {
        kind: "rows",
        caption: "Adressdaten",
        rows: [
          {
            label: "Postadresse",
            value: {
              kind: "link",
              text: partner.address.split(", ").join("\n"),
            },
          },
        ],
      },
      {
        kind: "person",
        caption: "Abo Modell",
        name: fee.tariff,
        sub: `€ ${fee.amount.toLocaleString("de-AT", { minimumFractionDigits: 2 })} /Jahr`,
      },
      {
        kind: "rows",
        caption: "Vereinbarung",
        rows: [
          {
            label: laufzeit ? "Laufzeit" : "Gültig seit",
            value: laufzeit ? since.replace(/^LZ /, "") : since,
          },
          { label: "Kundenberater", value: partner.advisor },
        ],
      },
    ],
  };
}

/**
 * The Maklervereinbarung bundle: every Maklervereinbarung comes with these three documents.
 * Entwurf → yellow clock and empty values; Gültig → green tick and filled in.
 */
const MANDATE_DOCS = [
  {
    id: "vollmacht-vm",
    title: "Vollmacht: Versicherungsmakler",
    file: "Vollmacht_Versicherungsmakler.pdf",
  },
  { id: "av-vollmacht", title: "AV Vollmacht", file: "AV_Vollmacht.pdf" },
  {
    id: "sepa",
    title: "SEPA Vereinbarung",
    file: "SEPA_Lastschriftmandat.pdf",
  },
] as const;

const EMPTY = "–";

function mandateDocCard(
  doc: (typeof MANDATE_DOCS)[number],
  done: boolean,
): Card {
  return {
    id: `mandat-${doc.id}`,
    icon: done ? a.hoStatusGenehmigt : a.onhold,
    title: doc.title,
    blocks: [
      {
        kind: "rows",
        caption: "Anhänge",
        rows: [
          {
            label: "Vereinbarung",
            value: done ? { kind: "file", text: doc.file } : EMPTY,
          },
        ],
      },
      {
        kind: "rows",
        caption: "Details",
        rows: [
          { label: "Gültig ab", value: done ? "12.12.2025" : EMPTY },
          { label: "Gültig bis", value: done ? "12.12.2028" : EMPTY },
          { label: "Autor", value: done ? "Lucy Dullon" : EMPTY },
        ],
      },
    ],
  };
}

/** While the Maklervereinbarung is a draft its card keeps the captions but shows no values yet. */
function asDraft(card: Card): Card {
  return {
    ...card,
    icon: a.onhold,
    blocks: (card.blocks ?? []).map((block) =>
      block.kind === "rows"
        ? {
            ...block,
            rows: block.rows.map((row) => ({
              ...row,
              icon: undefined,
              value: EMPTY,
            })),
          }
        : block.kind === "person"
          ? {
              kind: "rows",
              caption: block.caption,
              rows: [{ label: "Modell", value: EMPTY }],
            }
          : block,
    ),
  };
}

/** Kunde: the Interessentenvereinbarung that came before the Maklervereinbarung, now expired. */
function interessentAgreementCard(): Card {
  return {
    id: "mandat-interessent",
    icon: a.iconInteressent,
    title: "Interessentenvereinbarung",
    blocks: [
      {
        kind: "rows",
        caption: "Anhänge",
        rows: [
          {
            label: "Vereinbarung",
            value: { kind: "file", text: "Interessentenvereinbarung.pdf" },
          },
        ],
      },
      {
        kind: "rows",
        caption: "Details",
        rows: [
          { label: "Gültig ab", value: "01.03.2025" },
          { label: "Gültig bis", value: "11.12.2025" },
          { label: "Abgelöst durch", value: "Maklervereinbarung" },
          { label: "Autor", value: "Lucy Dullon" },
        ],
      },
    ],
  };
}

/** A Maklervereinbarung from the DMS as a card: the same record as the file in the DMS. */
function dmsAgreementCard(doc: Dokument, place: string[] | null): Card {
  const version = doc.versions.at(-1);
  return {
    id: `dms-${doc.id}`,
    icon: a.iconBrokerContract,
    title: doc.name,
    blocks: [
      {
        kind: "rows",
        caption: "Vereinbarung",
        rows: [
          {
            label: "Laufzeit",
            value: `${formatDate(doc.meta.gueltig_von)} – ${formatDate(doc.meta.gueltig_bis)}`,
          },
          {
            label: "Datei",
            value: version
              ? `${version.fileName} · ${formatSize(version.size)}`
              : "–",
          },
          {
            label: "Hochgeladen",
            value: formatDate(version?.uploadedAt ?? doc.createdAt),
          },
        ],
      },
      {
        kind: "rows",
        caption: "Ablage im DMS",
        rows: [{ label: "Ordner", value: place ? formatPath(place) : "–" }],
      },
    ],
  };
}

function DmsAgreementCards({
  docs,
  state,
  onOpen,
}: {
  docs: Dokument[];
  state: DmsState;
  /** Gültig: a click opens the Maklervereinbarung workflow, finished and filled in. */
  onOpen?: () => void;
}) {
  const { apply } = useDms();
  const { setMeinBereichNav, openMeinBereich } = useWorkflow();
  const view = buildView(state, "Standard");
  const typ = state.dokumenttypen.find((t) => t.id === "maklervereinbarung");
  return (
    <>
      {docs.map((doc) => {
        const place = locateDocument(view, doc.id)[0] ?? null;
        return (
          <DataCard
            key={doc.id}
            card={dmsAgreementCard(doc, place)}
            onSelect={onOpen}
            headerExtra={
              <span
                className="mm-dms-head"
                onClick={(event) => event.stopPropagation()}
              >
                <StatusChip status={doc.status} />
              </span>
            }
            // Figma 22742:254126: the card header only has the status and the ⋮ menu.
            menuItems={[
              ...nextStates(typ, doc.status).map((to) => ({
                label: `Als ${to.toLowerCase()} markieren`,
                icon: to === "Abgelaufen" ? a.docList : a.tarifCancelled,
                onSelect: () => apply((s) => setStatus(s, doc.id, to)),
              })),
              ...(place
                ? [
                    {
                      label: "Im DMS öffnen",
                      icon: a.folder,
                      onSelect: () => {
                        setDmsFocus({ path: place, docId: doc.id });
                        setMeinBereichNav({
                          area: "Mein Bereich",
                          page: "Dokumente",
                        });
                        openMeinBereich();
                      },
                    },
                  ]
                : []),
            ]}
          />
        );
      })}
    </>
  );
}

function scrollTo(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Halo({ size = 130, icon = 54 }: { size?: number; icon?: number }) {
  return (
    <span className="mm-halo" style={{ width: size, height: size }}>
      <Icon src={a.transform} size={icon} />
    </span>
  );
}

function ConvertCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="mm-convert">
      <header>
        <Icon src={a.iconBrokerContract} size={22} />
        Maklermandat Übersicht
      </header>
      <Halo />
      <strong>
        Zu Interessenten
        <br />
        umwandeln
      </strong>
      <p>
        Als Interessent stehen weitere Funktionen und Möglichkeiten zur
        Verfügung.
      </p>
      <button
        type="button"
        className="btn-secondary mm-start"
        onClick={onStart}
      >
        Umwandlung starten
      </button>
    </div>
  );
}

function OverviewCard() {
  return (
    <div className="mm-overview">
      <header>
        <Icon src={a.iconBrokerContract} size={22} />
        Maklermandat Übersicht
      </header>
      {OVERVIEW.map((entry) => (
        <div className="mm-ov-group" key={entry.label}>
          <div className="mm-ov-row">
            <span className="mm-contact-icon">
              <Icon src={entry.icon} size={18} />
            </span>
            <span className="mm-ov-copy">
              <strong>{entry.label}</strong>
              <small>{entry.state}</small>
            </span>
            <Icon src={a.onhold} size={20} />
          </div>
          <div className="mm-ov-row nested">
            <span className="mm-contact-icon">
              <Icon src={entry.child.icon} size={18} />
            </span>
            <span className="mm-ov-copy">
              <strong>{entry.child.label}</strong>
              <small>{entry.child.state}</small>
            </span>
            <Icon src={a.onhold} size={20} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyArt({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <article className="pp-card empty">
      <div className="pp-empty-art">
        <span className="plate p3" />
        <span className="plate p2" />
        <span className="plate p1" />
        <span className="orb">
          <Icon src={icon} size={40} />
        </span>
      </div>
      <strong>{title}</strong>
      {children}
    </article>
  );
}

function Sidebar({
  converted,
  counts,
}: {
  converted: boolean;
  counts: Record<AgreementSection, number>;
}) {
  const { personName, openPersonArea } = useWorkflow();
  return (
    <aside className="pp-side">
      <header className="pp-side-head">
        <span className="pp-side-glyph">
          <Icon src={a.moduleProfile} size={24} />
        </span>
        <span className="pp-side-title">
          <strong>Profil</strong>
          <small>{personName}</small>
        </span>
      </header>

      <div className="pp-side-search">
        <Icon src={a.searchDark} size={18} />
        Suchen...
      </div>

      <button
        type="button"
        className="pp-area"
        onClick={() => openPersonArea("stammdaten")}
      >
        <span className="pp-area-label">
          <Icon src={a.stammdaten} size={18} />
          Stammdaten
        </span>
        <Icon src={a.chevronDark} size={18} className="caret-side" />
      </button>
      <button type="button" className="pp-area">
        <span className="pp-area-label">
          <Icon src={a.riskTarget} size={18} />
          Riskmanagement
        </span>
        <Icon src={a.chevronDark} size={18} className="caret-side" />
      </button>
      <button type="button" className="pp-area open">
        <span className="pp-area-label">
          <Icon src={a.iconBrokerContract} size={18} />
          Maklermandat
        </span>
        <Icon
          src={converted ? a.chevronDown : a.chevronDark}
          size={18}
          className={converted ? undefined : "caret-side"}
        />
      </button>

      {converted ? (
        <div className="pp-tree mm-tree">
          {SIDE_SUBS.map((item) => (
            <button
              type="button"
              className="pp-tree-item"
              key={item.id}
              onClick={() => scrollTo(item.id)}
            >
              <span className="pp-tree-name">
                <Icon src={item.icon} size={18} />
                {item.id === "gueltig"
                  ? `Gültig (${counts.gueltig})`
                  : item.id === "entwuerfe"
                    ? `Entwürfe (${counts.entwuerfe})`
                    : `Abgelaufen (${counts.abgelaufen})`}
              </span>
              <Icon
                src={a.chevronDark}
                size={18}
                className="pp-tree-caret caret-side"
              />
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="pp-area"
        onClick={() => openPersonArea("inkasso")}
      >
        <span className="pp-area-label">
          <Icon src={a.tickList} size={18} />
          Inkasso
        </span>
        <Icon src={a.chevronDark} size={18} className="caret-side" />
      </button>
      <button type="button" className="pp-area">
        <span className="pp-area-label">
          <Icon src={a.logoMark} size={18} className="mm-wino" />
          Wino
        </span>
        <Icon src={a.chevronDark} size={18} className="caret-side" />
      </button>
    </aside>
  );
}

function Overlay({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="umw-modal"
      role="dialog"
      aria-label="Umwandlung zu Interessenten"
    >
      <button
        type="button"
        className="wmodal-scrim"
        aria-label="Schließen"
        onClick={onCancel}
      />
      <div className="umw-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">
            Umwandlung zu Interessenten
          </span>
          <button
            type="button"
            className="review-titlebar-close"
            aria-label="Schließen"
            onClick={onCancel}
          >
            <Icon src={a.iconCloseDark} size={12} />
          </button>
        </header>

        <div className="umw-content">
          <Halo size={96} icon={40} />
          <h2>
            Umwandlung
            <br />
            zu Interessenten
          </h2>

          <div className="umw-panel">
            <FileIdentity
              className="pp-id mm-id compact umw-id"
              forceInteressent
            />

            <p>
              Als Interessent bekommt diese Person Zugang zu weiteren
              Funktionen:
            </p>
            <ul className="umw-features">
              {FEATURES.map((feature) => (
                <li key={feature}>
                  <Icon src={a.tick} size={14} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="umw-foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Umwandlung bestätigen
          </button>
        </footer>
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onCreateMakler,
}: {
  onClose: () => void;
  onCreateMakler: () => void;
}) {
  return (
    <div
      className="umw-modal"
      role="dialog"
      aria-label="Vereinbarung erstellen"
    >
      <button
        type="button"
        className="wmodal-scrim"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div className="umw-body mm-create-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">Vereinbarung erstellen</span>
          <button
            type="button"
            className="review-titlebar-close"
            aria-label="Schließen"
            onClick={onClose}
          >
            <Icon src={a.iconCloseDark} size={12} />
          </button>
        </header>

        <div className="mm-create-content">
          <h2>Erstelle eine Vereinbarung</h2>
          <div className="mm-create-cards">
            {CREATE_OPTIONS.map((option) => (
              <article className="mm-create-card" key={option.id}>
                <div className="mm-ov-group">
                  {option.tree.map((entry, index) => (
                    <div
                      className={index === 0 ? "mm-ov-row" : "mm-ov-row nested"}
                      key={entry.label}
                    >
                      <span className="mm-contact-icon">
                        <Icon src={entry.icon} size={18} />
                      </span>
                      <span className="mm-ov-copy">
                        <strong>{entry.label}</strong>
                        <small>{entry.state}</small>
                      </span>
                      <Icon src={a.onhold} size={20} />
                    </div>
                  ))}
                </div>
                <h3>{option.title}</h3>
                <p>{CREATE_COPY}</p>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!option.enabled}
                  onClick={option.enabled ? onCreateMakler : undefined}
                >
                  Erstellen
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ashley stays gated until conversion; every other partner can create agreements. */
export function MaklermandatPage() {
  const {
    ashleyConverted,
    convertAshley,
    filePartnerId,
    goTo,
    openMakler,
    markMaklerCreated,
    maklerCreated,
    maklerFinished,
    displaySections,
    model,
    amount,
  } = useWorkflow();
  const [overlay, setOverlay] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const ready = filePartnerId !== "ashley" || ashleyConverted;
  const file = getPartner(filePartnerId);
  const info = file.info;
  const { personName } = useWorkflow();
  const { state } = useHonorar();
  const honorarPartner = state.partners.find(
    (partner) => partner.name === personName,
  );
  const honorarFee = honorarPartner
    ? state.fees
        .filter((fee) => fee.partnerId === honorarPartner.id)
        .sort((x, y) => y.month.localeCompare(x.month))[0]
    : undefined;
  // Kunde: everything signed and valid, the old Interessentenvereinbarung expired.
  // Interessent: Erstellen puts the four agreements into Entwürfe until the Signaturen step is approved.
  const kunde = file.kind === "kunde";
  const stage: "none" | "draft" | "done" =
    kunde || maklerFinished ? "done" : maklerCreated ? "draft" : "none";
  const maklerCard =
    honorarPartner && honorarFee && !maklerCreated
      ? honorarAgreementCard(honorarPartner, honorarFee)
      : maklerAgreementCard(file, displaySections, model, amount);
  const dms = useDms().state;
  const dmsDocs = partnerAgreements(dms, filePartnerId, dms.activePerson);
  // A running Maklervereinbarung filed in the DMS is that agreement: show it instead of a second card.
  const fromDms = stage === "done" && dmsDocs.gueltig.length > 0;
  const bundle: Card[] =
    stage === "none"
      ? []
      : [
          ...(fromDms ? [] : [stage === "done" ? maklerCard : asDraft(maklerCard)]),
          ...MANDATE_DOCS.map((doc) => mandateDocCard(doc, stage === "done")),
        ];
  const mandateCards: Record<AgreementSection, Card[]> = {
    gueltig: stage === "done" ? bundle : [],
    entwuerfe: stage === "draft" ? bundle : [],
    abgelaufen: kunde ? [interessentAgreementCard()] : [],
  };
  // Maklervereinbarungen stored in the DMS: the same records, grouped by status.
  const counts: Record<AgreementSection, number> = {
    gueltig: dmsDocs.gueltig.length + mandateCards.gueltig.length,
    entwuerfe: dmsDocs.entwuerfe.length + mandateCards.entwuerfe.length,
    abgelaufen: dmsDocs.abgelaufen.length + mandateCards.abgelaufen.length,
  };

  return (
    <>
      <ShelfBody>
        <Sidebar converted={ready} counts={counts} />
        <main className="pp-main">
          <header className="fg-head pp-main-head">
            <ShelfTitle icon={a.iconBrokerContract}>Maklermandat</ShelfTitle>
            <span className="fg-head-actions">
              <button
                type="button"
                className="fg-head-search"
                aria-label="Suche"
              >
                <Icon src={a.searchDark} size={18} />
              </button>
            </span>
          </header>

          <div className="pp-strip">
            <div className="pp-strip-main">
              <FileIdentity className="pp-id mm-id" />
              {info ? (
                <div className="pp-info">
                  <small>Info</small>
                  <p>{info}</p>
                </div>
              ) : null}
            </div>
            {ready ? (
              <OverviewCard />
            ) : (
              <ConvertCard onStart={() => setOverlay(true)} />
            )}
          </div>

          {ready ? (
            MANDATE_SECTIONS.map((section) => (
              <section className="pp-section" id={section.id} key={section.id}>
                <header className="pp-section-head">
                  <span className="pp-section-title">
                    <Icon src={section.icon} size={32} />
                    {section.id === "gueltig"
                      ? `${section.title} (${counts.gueltig})`
                      : section.id === "entwuerfe"
                        ? `${section.title} (${counts.entwuerfe})`
                        : `Abgelaufen (${counts.abgelaufen})`}
                  </span>
                  {"create" in section && section.create ? (
                    <button
                      type="button"
                      className="btn-primary pp-edit"
                      onClick={() => setCreateOpen(true)}
                    >
                      Erstellen
                    </button>
                  ) : null}
                </header>
                {(mandateCards[section.id].length ||
                  dmsDocs[section.id].length) ? (
                  <div className="pp-cards">
                    {/* The Maklervereinbarung (from the DMS when filed there) leads, the other agreements follow. */}
                    <DmsAgreementCards docs={dmsDocs[section.id]} state={dms} onOpen={section.id === "gueltig" ? openMakler : undefined} />
                    {mandateCards[section.id].map((card) =>
                      card.id === "makler-vereinbarung" ||
                      card.id === "honorar-vereinbarung" ? (
                        <DataCard
                          key={card.id}
                          card={card}
                          onSelect={openMakler}
                          onEdit={openMakler}
                          headerExtra={
                            stage === "done" ? (
                              <button
                                type="button"
                                className="btn-secondary fg-verlauf-btn"
                                onClick={openMakler}
                              >
                                <Icon src={a.history} size={18} />
                                Version 1
                              </button>
                            ) : null
                          }
                        />
                      ) : (
                        <DataCard
                          key={card.id}
                          card={card}
                          onSelect={
                            section.id === "entwuerfe" ? openMakler : undefined
                          }
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <div className="pp-cards center mm-empty">
                    <EmptyArt icon={section.icon} title={section.empty} />
                  </div>
                )}
              </section>
            ))
          ) : (
            <section className="pp-section mm-empty">
              <div className="pp-cards center">
                <EmptyArt icon={a.docList} title="Maklermandat nicht verfügbar">
                  <p>
                    Ein Maklermandat kann nur für Interessenten &amp; Kunden
                    erstellt werden.
                    <br />
                    <button
                      type="button"
                      className="pp-empty-link"
                      onClick={() => setOverlay(true)}
                    >
                      Wandle diese Person zuerst in einen Interessenten um.
                    </button>
                  </p>
                </EmptyArt>
              </div>
            </section>
          )}
        </main>
      </ShelfBody>

      {overlay ? (
        <Overlay
          onCancel={() => setOverlay(false)}
          onConfirm={() => {
            convertAshley();
            setOverlay(false);
          }}
        />
      ) : null}

      {createOpen ? (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreateMakler={() => {
            setCreateOpen(false);
            markMaklerCreated();
            goTo("tasks");
            openMakler();
          }}
        />
      ) : null}
    </>
  );
}
