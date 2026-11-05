/**
 * DMS data model. Documents are stored once (`DmsState.documents`). Folders are never stored on a document:
 * they are views computed from Ordnervorlagen (filter rules over document metadata) for each Ansicht.
 */

export type PersonId = string;
export type GroupId = string;

/** Entities a document can be linked to and that can trigger a folder template. */
export type EntityType = "Partner" | "Kunde" | "Versicherer" | "Schaden";

export type DmsEntity = {
  id: string;
  type: EntityType;
  name: string;
  /** Schaden → its Kunde. */
  parent?: EntityLink;
  /** Schaden.Nummer, Polizzennummer … */
  nummer?: string;
};

export type EntityLink = { entityType: EntityType; entityId: string };

export const META_FIELDS = ["sparte", "jahr", "gueltig_von", "gueltig_bis"] as const;
export type MetaField = (typeof META_FIELDS)[number];

/** Dates as ISO "YYYY-MM-DD"; shown as DD.MM.YYYY. */
export type DocMeta = {
  sparte?: string;
  jahr?: number;
  gueltig_von?: string;
  gueltig_bis?: string;
};

/** Every place in WINO that can upload a file. Adding an upload point means adding a source here. */
export type UploadSource =
  | "maklervereinbarung.vertrag"
  | "partner.aktivitaet.anhang"
  | "partner.stammdaten.anhang"
  | "partner.bank"
  | "kunde.polizze"
  | "schaden.dokumente"
  | "kommunikation.email"
  | "versicherer.bedingungen"
  | "dms.dragdrop";

/** Required for every upload: an upload without context does not compile. Unknown parts are explicit nulls. */
export type UploadContext = {
  source: UploadSource;
  entityType: EntityType | null;
  entityId: string | null;
  slot: string;
  knownMetadata: DocMeta;
  /** DMS drag & drop only: the folder the file was dropped on. */
  folderPath?: string[];
};

export type Version = {
  nr: number;
  fileName: string;
  /** Bytes. */
  size: number;
  mime: string;
  uploadedAt: string;
  uploadedBy: PersonId;
};

export type Dokument = {
  id: string;
  name: string;
  versions: Version[];
  /** null = not assigned yet: the document waits in "Eingang / Nicht zugeordnet". */
  dokumenttyp: string | null;
  status: string | null;
  links: EntityLink[];
  meta: DocMeta;
  upload_context: UploadContext;
  /** Set = only these persons may see the document, whatever the folder permissions say. */
  vertraulich: PersonId[] | null;
  kommentar?: string;
  createdAt: string;
  createdBy: PersonId;
};

export type StatusTransition = { from: string; to: string };

/** Automatic transition, e.g. Aktiv → Abgelaufen once gueltig_bis lies before today. */
export type AutoTransition = { from: string[]; to: string; when: { field: "gueltig_bis"; op: "before_today" } };

export type Dokumenttyp = {
  id: string;
  name: string;
  requiredFields: MetaField[];
  workflow: {
    /** Ordered. The first state is the initial one. Empty = no status. */
    states: string[];
    transitions: StatusTransition[];
    auto: AutoTransition[];
  };
};

/** One condition of a folder filter. A node's filter is the AND of its conditions plus those of its ancestors. */
export type Bedingung =
  | { kind: "typ"; in: string[] }
  | { kind: "status"; in: string[] }
  | { kind: "meta"; field: MetaField; op: "eq" | "lt" | "gt" | "exists"; value?: string | number }
  /** `to: "$entity"` = the entity the template was instantiated for. */
  | { kind: "link"; entityType: EntityType; to?: "$entity" | string };

/**
 * A level made of one folder per value, e.g. {Sparte} or {Versicherer}. With `allEntities` an entity level has a
 * folder for every Partner/Kunde/… in Stammdaten, also without documents (created automatically).
 */
export type GroupBy = { kind: "meta"; field: MetaField } | { kind: "link"; entityType: EntityType; allEntities?: boolean };

/** An upload point linked to a folder: its files show up here and get this Dokumenttyp. */
export type QuellenLink = { source: UploadSource; slot: string | null; dokumenttyp: string };

export type Principal =
  | { kind: "Person"; id: PersonId }
  | { kind: "Gruppe"; id: GroupId }
  | { kind: "Rolle"; id: Rolle }
  | { kind: "Alle" };

export type Level = "Sehen" | "Bearbeiten" | "Verwalten";

/** Allow-only, inherited downward. No deny rules. */
export type Berechtigung = { principal: Principal; level: Level };

export type Knoten = {
  id: string;
  /** May contain placeholders: {Partner.Name}, {Kunde.Name}, {Sparte}, {Jahr}, {Versicherer}, {Schaden.Nummer}. */
  name: string;
  filter: Bedingung[];
  groupBy?: GroupBy;
  /** Standard view of Versicherer: per (Sparte, Versicherer, Dokumenttyp) only the highest Jahr. */
  latestOnly?: boolean;
  /** Upload points linked to this folder (Ordner Zuordnung). */
  quellen?: QuellenLink[];
  /** Takes over the sub-folders of another folder (by id), filled with this folder's own documents. */
  linkTo?: string;
  /** The folder name is the value, e.g. a folder "Feuerversicherung" holds documents with that Sparte. */
  nameMatches?: MetaField;
  permissions: Berechtigung[];
  children: Knoten[];
};

export type Ansicht = "Verwaltung" | "Standard";

export type Ordnervorlage = {
  id: string;
  name: string;
  ansichten: Ansicht[];
  /** "global" = one tree; an entity type = one instance per entity of that type, created automatically. */
  scope: "global" | EntityType;
  /** Folders above the template in the view, e.g. ["Partner"] for Partner/{Partner.Name}/…. */
  mount: string[];
  root: Knoten;
};

export type Ablageregel = {
  id: string;
  name: string;
  source: UploadSource;
  entityType: EntityType | null;
  slot: string | null;
  /** Metadata the rule needs; whatever the context does not know is asked in the upload dialog. */
  requires: MetaField[];
  /** null = taken from the folder filter (DMS drag & drop). */
  dokumenttyp: string | null;
  /** Path template, e.g. "Kunden/{Kunde.Name}/Polizzen/{Sparte}". "{Ordner}" = the current folder. */
  targetPath: string;
  priority: number;
};

export type Rolle = "DMS-Admin" | "Mitarbeiter:in";

export type DmsPerson = { id: PersonId; name: string; rollen: Rolle[]; photo?: string };

export type Gruppe = { id: GroupId; name: string; members: PersonId[] };

export type DmsState = {
  version: 2;
  /** "Today" of the prototype, so automatic transitions and "nicht aktuell" are reproducible. */
  today: string;
  activePerson: PersonId;
  people: DmsPerson[];
  groups: Gruppe[];
  entities: DmsEntity[];
  dokumenttypen: Dokumenttyp[];
  vorlagen: Ordnervorlage[];
  regeln: Ablageregel[];
  documents: Dokument[];
};
