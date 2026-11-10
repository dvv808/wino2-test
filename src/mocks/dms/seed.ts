import type {
  Ablageregel,
  Berechtigung,
  DmsEntity,
  DmsPerson,
  DmsState,
  DocMeta,
  Dokument,
  Dokumenttyp,
  EntityLink,
  Gruppe,
  Ordnervorlage,
  PersonId,
  UploadContext,
} from "../../types/dms";

/** "Today" of the prototype: 2025 Bedingungen are "nicht aktuell", Julia's 2023 agreement has run out. */
export const DMS_TODAY = "2026-11-05";

export const VERSICHERER = ["Allianz", "Donau", "UNIQA", "Wiener Städtische", "Generali"] as const;
export const SPARTEN = [
  "Transportversicherung",
  "Haftpflichtversicherung",
  "Feuerversicherung",
  "Rechtsschutzversicherung",
  "Kfz-Versicherung",
] as const;

// ---------------------------------------------------------------- people & groups

const people: DmsPerson[] = [
  { id: "lucy", name: "Lucy Dallon", rollen: ["DMS-Admin", "Mitarbeiter:in"] },
  { id: "anna", name: "Anna Chan", rollen: ["Mitarbeiter:in"] },
  { id: "thomas", name: "Thomas Leitner", rollen: ["Mitarbeiter:in"] },
  { id: "mike", name: "Mike Bennett", rollen: ["Mitarbeiter:in"] },
  { id: "sandra", name: "Sandra Huber", rollen: ["Mitarbeiter:in"] },
  { id: "markus", name: "Markus Wallner", rollen: ["Mitarbeiter:in"] },
  { id: "elif", name: "Elif Yılmaz", rollen: ["Mitarbeiter:in"] },
];

const groups: Gruppe[] = [
  { id: "gf", name: "Geschäftsführung", members: ["thomas"] },
  { id: "schaden", name: "Schadenabteilung", members: ["markus", "elif"] },
  { id: "partner", name: "Partnerbetreuung", members: ["mike", "sandra"] },
  { id: "backoffice", name: "Backoffice", members: ["lucy", "anna"] },
];

// ---------------------------------------------------------------- entities (Stammdaten)

const v = (name: string) => `v-${name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-+$/, "")}`;

const entities: DmsEntity[] = [
  { id: "julia", type: "Partner", name: "Julia Atkinson" },
  { id: "ashley", type: "Partner", name: "Ashley Johnson" },
  { id: "lunixo", type: "Partner", name: "Lunixo AG" },
  { id: "k-hoeller", type: "Partner", name: "Bäckerei Höller & Söhne OG" },
  { id: "k-gruber", type: "Partner", name: "Dr. Maria Gruber" },
  { id: "k-steiner", type: "Partner", name: "Transporte Steiner / Wels GmbH" },
  { id: "k-zentral", type: "Partner", name: "Café Zentral Huber KG" },
  {
    id: "s-0142",
    type: "Schaden",
    name: "Ladungsschaden A1 Linz",
    nummer: "S-2026-0142",
    parent: { entityType: "Partner", entityId: "k-steiner" },
  },
  ...VERSICHERER.map((name): DmsEntity => ({ id: v(name), type: "Versicherer", name })),
];

// ---------------------------------------------------------------- Dokumenttypen

const noWorkflow = { states: [], transitions: [], auto: [] };

const dokumenttypen: Dokumenttyp[] = [
  {
    id: "maklervereinbarung",
    name: "Maklervereinbarung",
    requiredFields: ["gueltig_von", "gueltig_bis"],
    workflow: {
      states: ["Entwurf", "In Freigabe", "Aktiv", "Abgelaufen", "Gekündigt"],
      transitions: [
        { from: "Entwurf", to: "In Freigabe" },
        { from: "In Freigabe", to: "Entwurf" },
        { from: "In Freigabe", to: "Aktiv" },
        { from: "Aktiv", to: "Gekündigt" },
        { from: "Aktiv", to: "Abgelaufen" },
      ],
      auto: [{ from: ["Aktiv"], to: "Abgelaufen", when: { field: "gueltig_bis", op: "before_today" } }],
    },
  },
  {
    id: "kooperationsvertrag",
    name: "Kooperationsvertrag",
    requiredFields: ["gueltig_von"],
    workflow: {
      states: ["Entwurf", "Aktiv", "Gekündigt"],
      transitions: [
        { from: "Entwurf", to: "Aktiv" },
        { from: "Aktiv", to: "Gekündigt" },
      ],
      auto: [],
    },
  },
  { id: "nda", name: "NDA", requiredFields: [], workflow: noWorkflow },
  { id: "anhang", name: "Anhang", requiredFields: [], workflow: noWorkflow },
  { id: "bankdokument", name: "Bankdokument", requiredFields: [], workflow: noWorkflow },
  { id: "polizze", name: "Polizze", requiredFields: ["sparte"], workflow: noWorkflow },
  { id: "schadendokument", name: "Schadendokument", requiredFields: [], workflow: noWorkflow },
  { id: "korrespondenz", name: "Korrespondenz", requiredFields: [], workflow: noWorkflow },
  { id: "vollmacht", name: "Vollmacht", requiredFields: ["gueltig_von"], workflow: noWorkflow },
  { id: "bedingungen", name: "Bedingungen", requiredFields: ["sparte", "jahr"], workflow: noWorkflow },
];

// ---------------------------------------------------------------- Ordnervorlagen

const admin: Berechtigung = { principal: { kind: "Rolle", id: "DMS-Admin" }, level: "Verwalten" };
const group = (id: string, level: Berechtigung["level"]): Berechtigung => ({ principal: { kind: "Gruppe", id }, level });


/**
 * Folder structures as built in Ordner Zuordnung. A Kunde is a Partner, so everything about a client lives in
 * Partner / {Partner.Name} / …; "{Partner.Name}" is a level with a folder for every partner in Stammdaten.
 * Upload points are linked to folders (`quellen`); each link is the Ablageregel for that upload point.
 */
const vorlagen: Ordnervorlage[] = [
  {
    id: "tpl-partner",
    name: "Partner",
    ansichten: ["Verwaltung", "Standard"],
    scope: "global",
    mount: [],
    root: {
      id: "partner-top",
      name: "Partner",
      filter: [],
      permissions: [admin],
      children: [
        {
          id: "p-root",
          name: "{Partner.Name}",
          filter: [],
          groupBy: { kind: "link", entityType: "Partner", allEntities: true },
          permissions: [group("partner", "Bearbeiten"), group("backoffice", "Bearbeiten"), group("gf", "Sehen")],
          children: [
            {
              id: "p-vereinbarungen",
              name: "Vereinbarungen",
              filter: [{ kind: "typ", in: ["maklervereinbarung", "kooperationsvertrag", "nda"] }],
              quellen: [{ source: "maklervereinbarung.vertrag", slot: "vertrag", dokumenttyp: "maklervereinbarung" }],
              permissions: [],
              children: [],
            },
            {
              id: "p-polizzen",
              name: "Polizzen",
              filter: [{ kind: "typ", in: ["polizze"] }],
              quellen: [{ source: "kunde.polizze", slot: null, dokumenttyp: "polizze" }],
              permissions: [],
              children: [
                { id: "p-polizzen-sparte", name: "{Sparte}", filter: [], groupBy: { kind: "meta", field: "sparte" }, permissions: [], children: [] },
              ],
            },
            {
              id: "p-schaeden",
              name: "Schäden",
              filter: [{ kind: "typ", in: ["schadendokument"] }],
              quellen: [{ source: "schaden.dokumente", slot: null, dokumenttyp: "schadendokument" }],
              permissions: [group("schaden", "Bearbeiten")],
              children: [
                {
                  id: "p-schaeden-nr",
                  name: "{Schaden.Nummer}",
                  filter: [],
                  groupBy: { kind: "link", entityType: "Schaden", allEntities: true },
                  permissions: [],
                  children: [],
                },
              ],
            },
            {
              id: "p-vollmachten",
              name: "Vollmachten & Verträge",
              filter: [{ kind: "typ", in: ["vollmacht"] }],
              permissions: [],
              children: [],
            },
            {
              id: "p-korrespondenz",
              name: "Korrespondenz",
              filter: [{ kind: "typ", in: ["korrespondenz"] }],
              quellen: [{ source: "kommunikation.email", slot: null, dokumenttyp: "korrespondenz" }],
              permissions: [],
              children: [],
            },
            {
              id: "p-anhaenge",
              name: "Anhänge",
              filter: [{ kind: "typ", in: ["anhang", "bankdokument"] }],
              quellen: [
                { source: "partner.stammdaten.anhang", slot: "anhang", dokumenttyp: "anhang" },
                { source: "partner.stammdaten.anhang", slot: "wirtschaft", dokumenttyp: "anhang" },
                { source: "partner.bank", slot: "bank", dokumenttyp: "bankdokument" },
                { source: "partner.aktivitaet.anhang", slot: null, dokumenttyp: "anhang" },
              ],
              permissions: [],
              children: [],
            },
          ],
        },
      ],
    },
  },
  {
    id: "tpl-versicherungen",
    name: "Versicherungen",
    ansichten: ["Verwaltung"],
    scope: "global",
    mount: [],
    root: {
      id: "vv-root",
      name: "Versicherungen",
      filter: [],
      permissions: [admin, group("backoffice", "Bearbeiten")],
      children: [
        {
          id: "vv-versicherer",
          name: "{Versicherer}",
          filter: [],
          groupBy: { kind: "link", entityType: "Versicherer", allEntities: true },
          permissions: [],
          children: [
            {
              id: "vv-fachbereiche",
              name: "Fachbereiche",
              filter: [{ kind: "typ", in: ["bedingungen"] }],
              quellen: [{ source: "versicherer.bedingungen", slot: null, dokumenttyp: "bedingungen" }],
              permissions: [],
              children: [
                {
                  id: "vv-sparte",
                  name: "{Sparte}",
                  filter: [],
                  groupBy: { kind: "meta", field: "sparte" },
                  permissions: [],
                  children: [{ id: "vv-jahr", name: "{Jahr}", filter: [], groupBy: { kind: "meta", field: "jahr" }, permissions: [], children: [] }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "tpl-global",
    name: "Global",
    ansichten: ["Verwaltung"],
    scope: "global",
    mount: [],
    root: {
      id: "gl-root",
      name: "Global",
      filter: [],
      permissions: [admin, group("backoffice", "Bearbeiten")],
      children: [
        {
          // Ordner verbinden: every insurer's Fachbereiche in one place, merged by Sparte and Jahr.
          id: "gl-fachbereiche",
          name: "Fachbereiche",
          filter: [],
          verbindungen: [{ nodeId: "vv-fachbereiche", include: null }],
          permissions: [],
          children: [],
        },
      ],
    },
  },
  {
    id: "tpl-versicherer-standard",
    name: "Unternehmen",
    ansichten: ["Standard"],
    scope: "global",
    mount: [],
    root: {
      id: "vs-root",
      name: "Unternehmen",
      filter: [],
      permissions: [admin, { principal: { kind: "Alle" }, level: "Sehen" }],
      children: [
        {
          id: "vs-versicherer",
          name: "Versicherer",
          filter: [{ kind: "typ", in: ["bedingungen"] }],
          permissions: [],
          children: [
            {
              id: "vs-sparte",
              name: "{Sparte}",
              filter: [],
              groupBy: { kind: "meta", field: "sparte" },
              latestOnly: true,
              permissions: [],
              children: [],
            },
          ],
        },
      ],
    },
  },
];

// ---------------------------------------------------------------- Ablageregeln

/** Only DMS drag & drop is a rule of its own; every other upload point is placed by its folder link. */
const regeln: Ablageregel[] = [
  {
    id: "r-dragdrop",
    name: "DMS → Drag & Drop",
    source: "dms.dragdrop",
    entityType: null,
    slot: null,
    requires: [],
    dokumenttyp: null,
    targetPath: "{Ordner}",
    priority: 0,
  },
];

// ---------------------------------------------------------------- documents

let counter = 0;

function ctx(source: UploadContext["source"], link: EntityLink | null, knownMetadata: DocMeta = {}, slot = ""): UploadContext {
  return { source, entityType: link?.entityType ?? null, entityId: link?.entityId ?? null, slot, knownMetadata };
}

function doc(input: {
  name: string;
  typ: string | null;
  status?: string | null;
  links: EntityLink[];
  meta?: DocMeta;
  context: UploadContext;
  by: PersonId;
  at: string;
  vertraulich?: PersonId[];
  kommentar?: string;
  sizeKb?: number;
}): Dokument {
  counter += 1;
  const fileName = `${input.name.replace(/[\s/&]+/g, "_")}.pdf`;
  return {
    id: `d-${String(counter).padStart(3, "0")}`,
    name: input.name,
    versions: [
      {
        nr: 1,
        fileName,
        size: (input.sizeKb ?? 180 + ((counter * 37) % 400)) * 1024,
        mime: "application/pdf",
        uploadedAt: input.at,
        uploadedBy: input.by,
      },
    ],
    dokumenttyp: input.typ,
    status: input.status ?? null,
    links: input.links,
    meta: input.meta ?? {},
    upload_context: input.context,
    vertraulich: input.vertraulich ?? null,
    kommentar: input.kommentar,
    createdAt: input.at,
    createdBy: input.by,
  };
}

const P = (id: string): EntityLink => ({ entityType: "Partner", entityId: id });
/** Kunden are partners. */
const K = (id: string): EntityLink => ({ entityType: "Partner", entityId: id });
const V = (name: string): EntityLink => ({ entityType: "Versicherer", entityId: v(name) });
const S = (id: string): EntityLink => ({ entityType: "Schaden", entityId: id });

function maklervereinbarung(partner: string, label: string, status: string, von: string, bis: string, at: string) {
  return doc({
    name: `Maklervereinbarung ${label}`,
    typ: "maklervereinbarung",
    status,
    links: [P(partner)],
    meta: { gueltig_von: von, gueltig_bis: bis },
    context: ctx("maklervereinbarung.vertrag", P(partner), {}, "vertrag"),
    by: "mike",
    at,
  });
}

function partnerDocuments(): Dokument[] {
  return [
    // Julia: one running agreement, one that ran out on 31.12.2025 (seeded as Aktiv → set to Abgelaufen automatically).
    maklervereinbarung("julia", "Julia Atkinson 2023", "Aktiv", "2023-01-01", "2025-12-31", "2022-12-12T13:55:00"),
    maklervereinbarung("julia", "Julia Atkinson 2026", "Aktiv", "2026-01-01", "2028-12-31", "2025-12-12T13:55:00"),
    // Ashley: one waiting for Freigabe, one terminated.
    maklervereinbarung("ashley", "Ashley Johnson 2027", "In Freigabe", "2027-01-01", "2029-12-31", "2026-10-28T09:12:00"),
    maklervereinbarung("ashley", "Ashley Johnson 2022", "Gekündigt", "2022-01-01", "2027-12-31", "2021-11-30T10:40:00"),
    // Lunixo: a draft, a running Kooperationsvertrag and a confidential NDA.
    maklervereinbarung("lunixo", "Lunixo AG 2027", "Entwurf", "2027-01-01", "2029-12-31", "2026-11-02T15:05:00"),
    doc({
      name: "Kooperationsvertrag Lunixo AG",
      typ: "kooperationsvertrag",
      status: "Aktiv",
      links: [P("lunixo")],
      meta: { gueltig_von: "2024-07-01" },
      context: ctx("maklervereinbarung.vertrag", P("lunixo"), {}, "vertrag"),
      by: "sandra",
      at: "2024-06-20T11:00:00",
    }),
    doc({
      name: "NDA Lunixo AG Übernahme",
      typ: "nda",
      links: [P("lunixo")],
      context: ctx("maklervereinbarung.vertrag", P("lunixo"), {}, "vertrag"),
      by: "thomas",
      at: "2026-09-14T08:30:00",
      vertraulich: ["thomas"],
      kommentar: "Nur Geschäftsführung.",
    }),
    doc({
      name: "Gesprächsnotiz Julia Atkinson",
      typ: "anhang",
      links: [P("julia")],
      context: ctx("partner.aktivitaet.anhang", P("julia")),
      by: "mike",
      at: "2026-10-03T14:20:00",
    }),
    doc({
      name: "Firmenbuchauszug Lunixo AG",
      typ: "anhang",
      links: [P("lunixo")],
      context: ctx("partner.stammdaten.anhang", P("lunixo"), {}, "anhang"),
      by: "lucy",
      at: "2026-08-11T09:45:00",
    }),
    doc({
      name: "Kontobestätigung Ashley Johnson",
      typ: "bankdokument",
      links: [P("ashley")],
      context: ctx("partner.bank", P("ashley"), {}, "bank"),
      by: "anna",
      at: "2026-05-19T16:10:00",
    }),
  ];
}

function polizze(kunde: string, versicherer: string, sparte: string, nr: string, at: string) {
  return doc({
    name: `Polizze ${nr}`,
    typ: "polizze",
    links: [K(kunde), V(versicherer)],
    meta: { sparte },
    context: ctx("kunde.polizze", K(kunde), { sparte }),
    by: "anna",
    at,
  });
}

function kundenDocuments(): Dokument[] {
  return [
    polizze("k-hoeller", "Wiener Städtische", "Feuerversicherung", "WS-4471209", "2025-02-03T10:00:00"),
    polizze("k-hoeller", "UNIQA", "Haftpflichtversicherung", "UQ-88213", "2025-02-03T10:05:00"),
    polizze("k-gruber", "Generali", "Rechtsschutzversicherung", "GE-30017", "2024-09-12T13:30:00"),
    polizze("k-gruber", "Allianz", "Kfz-Versicherung", "AL-7719-K", "2026-03-01T08:15:00"),
    polizze("k-steiner", "UNIQA", "Transportversicherung", "UQ-T-5512", "2025-06-30T09:00:00"),
    polizze("k-steiner", "Donau", "Kfz-Versicherung", "DO-K-2291", "2025-06-30T09:10:00"),
    polizze("k-zentral", "Allianz", "Haftpflichtversicherung", "AL-H-1045", "2026-01-15T11:40:00"),
    doc({
      name: "Schadenmeldung S-2026-0142",
      typ: "schadendokument",
      links: [K("k-steiner"), S("s-0142")],
      context: ctx("schaden.dokumente", S("s-0142")),
      by: "markus",
      at: "2026-10-21T07:50:00",
    }),
    doc({
      name: "Fotos Ladung S-2026-0142",
      typ: "schadendokument",
      links: [K("k-steiner"), S("s-0142")],
      context: ctx("schaden.dokumente", S("s-0142")),
      by: "elif",
      at: "2026-10-22T12:05:00",
      sizeKb: 2480,
    }),
    doc({
      name: "E-Mail Prämienanpassung Feuer",
      typ: "korrespondenz",
      links: [K("k-hoeller")],
      context: ctx("kommunikation.email", K("k-hoeller")),
      by: "anna",
      at: "2026-10-30T10:22:00",
    }),
    doc({
      name: "E-Mail Rückfrage Rechtsschutz",
      typ: "korrespondenz",
      links: [K("k-gruber")],
      context: ctx("kommunikation.email", K("k-gruber")),
      by: "lucy",
      at: "2026-11-03T15:48:00",
    }),
    doc({
      name: "Maklervollmacht Café Zentral",
      typ: "vollmacht",
      links: [K("k-zentral")],
      meta: { gueltig_von: "2026-01-01" },
      context: { ...ctx("dms.dragdrop", null), folderPath: ["Partner", "Café Zentral Huber KG", "Vollmachten & Verträge"] },
      by: "lucy",
      at: "2025-12-18T09:00:00",
    }),
  ];
}

/** Years each (Versicherer, Sparte) has Bedingungen for. Default 2024–2026; the gaps make "nicht aktuell" visible. */
const BEDINGUNGEN_GAPS: Record<string, number[]> = {
  "UNIQA|Transportversicherung": [2024, 2025],
  "Donau|Feuerversicherung": [2024],
  "Generali|Rechtsschutzversicherung": [2024, 2025],
  "Allianz|Kfz-Versicherung": [2024, 2026],
};

const SPARTE_SHORT: Record<string, string> = {
  Transportversicherung: "Transport",
  Haftpflichtversicherung: "Haftpflicht",
  Feuerversicherung: "Feuer",
  Rechtsschutzversicherung: "Rechtsschutz",
  "Kfz-Versicherung": "Kfz",
};

function bedingungenDocuments(): Dokument[] {
  const list: Dokument[] = [];
  for (const versicherer of VERSICHERER) {
    for (const sparte of SPARTEN) {
      const years = BEDINGUNGEN_GAPS[`${versicherer}|${sparte}`] ?? [2024, 2025, 2026];
      for (const jahr of years) {
        list.push(
          doc({
            name: `AVB ${SPARTE_SHORT[sparte]} ${versicherer} ${jahr}`,
            typ: "bedingungen",
            links: [V(versicherer)],
            meta: { sparte, jahr },
            context: ctx("versicherer.bedingungen", V(versicherer), { sparte, jahr }),
            by: "anna",
            at: `${jahr - 1}-12-${String(1 + (list.length % 27)).padStart(2, "0")}T10:00:00`,
          }),
        );
      }
    }
  }
  return list;
}

function eingangDocuments(): Dokument[] {
  return [
    doc({
      name: "Scan_20261103_0915",
      typ: null,
      links: [],
      context: ctx("kommunikation.email", null),
      by: "anna",
      at: "2026-11-03T09:15:00",
      kommentar: "Aus dem Sammelpostfach, kein Partner erkannt.",
    }),
    doc({
      name: "Gutachten Brandschaden",
      typ: null,
      links: [],
      context: { ...ctx("dms.dragdrop", null), folderPath: [] },
      by: "markus",
      at: "2026-11-04T16:32:00",
    }),
  ];
}

export function createDmsSeed(today = DMS_TODAY): DmsState {
  counter = 0;
  return {
    version: 3,
    today,
    activePerson: "lucy",
    people,
    groups,
    entities,
    dokumenttypen,
    vorlagen,
    regeln,
    documents: [...partnerDocuments(), ...kundenDocuments(), ...bedingungenDocuments(), ...eingangDocuments()],
  };
}
