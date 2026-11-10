import type { EntityType, UploadSource } from "../../types/dms";

/** Every upload point of WINO, as Ordner Zuordnung lists them. Slot = which field of the module. */
export type SourceItem = {
  source: UploadSource;
  slot: string | null;
  module: string;
  label: string;
  entityType: EntityType | null;
  /** Dokumenttyp a file from here gets unless the link says otherwise. */
  dokumenttyp: string;
};

export const SOURCE_ITEMS: SourceItem[] = [
  { source: "partner.stammdaten.anhang", slot: "anhang", module: "Stammdaten", label: "Allgemeine Partnerdaten → Anhänge", entityType: "Partner", dokumenttyp: "anhang" },
  { source: "partner.stammdaten.anhang", slot: "wirtschaft", module: "Stammdaten", label: "Wirtschaftsdaten → Anhänge", entityType: "Partner", dokumenttyp: "anhang" },
  { source: "partner.bank", slot: "bank", module: "Stammdaten", label: "Bankverbindung → Dokumente", entityType: "Partner", dokumenttyp: "bankdokument" },
  { source: "maklervereinbarung.vertrag", slot: "vertrag", module: "Maklervereinbarung", label: "Vertrag hochladen", entityType: "Partner", dokumenttyp: "maklervereinbarung" },
  { source: "partner.aktivitaet.anhang", slot: null, module: "Partner", label: "Aktivität → Anhang", entityType: "Partner", dokumenttyp: "anhang" },
  { source: "kunde.polizze", slot: null, module: "Polizzen", label: "Polizze anlegen", entityType: "Partner", dokumenttyp: "polizze" },
  { source: "schaden.dokumente", slot: null, module: "Schaden", label: "Dokumente", entityType: "Schaden", dokumenttyp: "schadendokument" },
  { source: "kommunikation.email", slot: null, module: "Kommunikation", label: "E-Mail-Anhang", entityType: "Partner", dokumenttyp: "korrespondenz" },
  { source: "versicherer.bedingungen", slot: null, module: "Versicherer", label: "Bedingungen", entityType: "Versicherer", dokumenttyp: "bedingungen" },
];

export const SOURCE_LABEL: Record<UploadSource, string> = {
  "maklervereinbarung.vertrag": "Maklervereinbarung → Vertrag hochladen",
  "partner.aktivitaet.anhang": "Partner → Aktivität → Anhang",
  "partner.stammdaten.anhang": "Stammdaten → Anhänge",
  "partner.bank": "Stammdaten → Bankverbindung",
  "kunde.polizze": "Polizzen → Polizze anlegen",
  "schaden.dokumente": "Schaden → Dokumente",
  "kommunikation.email": "Kommunikation → E-Mail-Anhang",
  "versicherer.bedingungen": "Versicherer → Bedingungen",
  "dms.dragdrop": "DMS → Drag & Drop",
};

export const sourceKey = (source: UploadSource, slot: string | null) => `${source}#${slot ?? "*"}`;

export function sourceItem(source: UploadSource, slot: string | null) {
  return SOURCE_ITEMS.find((s) => s.source === source && s.slot === slot) ?? SOURCE_ITEMS.find((s) => s.source === source);
}

export function sourceLabel(source: UploadSource, slot: string | null) {
  const item = sourceItem(source, slot);
  return item && (item.slot === slot || slot === null) ? `${item.module} → ${item.label}` : SOURCE_LABEL[source];
}
