import { PARTNER_BY_SLUG, getPartner, type PartnerId } from "./person/partners";
import type { StammdatenAreaId } from "./person/stammdaten";
import { STAMMDATEN_AREAS } from "./person/stammdaten";
import type { StepId, View, WorkflowPane } from "./workflow";
import type { FinanzenPage, HonorarStepKey } from "./types/honorar";

/** Profil is the default person module; Workflows & To-Dos is the advisor inbox. */
export type PersonModule = "profil" | "workflows" | "dashboard";
export type PersonArea = "stammdaten" | "maklermandat" | "inkasso";

/**
 * URLs mirror the app's nesting: the open person tab, the open workflow tab, then the page.
 * Maklervereinbarung hangs off the partner who opened it.
 */
const WORKFLOW = "maklervereinbarung";
/** Management: the area tab (Bestand, HRM, Finanzen …), then the list tab. "bestandsmanager/…" links still open. */
const MANAGER = "management/bestand/freigaben";
const FINANZEN = "management/finanzen";
/** The profile page opens on Stammdaten; Ashley's file opens on Maklermandat. */
const PERSON_AREA = "stammdaten";
const MAKLERMANDAT_AREA = "maklermandat";
const INKASSO_AREA = "inkasso";
const PERSON_WORKFLOWS = "workflows-to-dos";
const STAMMDATEN_WORKFLOW = "stammdaten-workflow";
/** Prüfmodus: Stammdaten beim Kunden prüfen. */
const PRUEFUNG = "stammdaten-pruefen";

function personRoot(partnerId: PartnerId = "julia") {
  return `person/${getPartner(partnerId).slug}`;
}

const STEP_SLUGS: Record<StepId, string> = {
  tasks: "offene-aufgaben",
  comms: "kommunikationsdaten",
  fee: "honorar",
  terms: "individuelle-vereinbarungen",
  scope: "leistungsumfang",
  docs: "dokumentenfreigabe",
  sign: "signaturen",
};

const AREA_SLUGS: Record<StammdatenAreaId, string> = {
  personendaten: "allgemeine-partnerdaten",
  wirtschaftsdaten: "wirtschaftsdaten",
  kontakte: "kontakte",
  adressen: "adressen",
  bankverbindungen: "bankverbindung",
  systemdaten: "systemdaten",
  verknuepfung: "verknuepfung",
  externe: "externe-quellen",
};

const STEP_BY_SLUG = new Map(
  Object.entries(STEP_SLUGS).map(([id, slug]) => [slug, id as StepId]),
);

const AREA_BY_SLUG = new Map(
  Object.entries(AREA_SLUGS).map(([id, slug]) => [slug, id as StammdatenAreaId]),
);

const PANE_SLUGS: Record<Exclude<WorkflowPane, "workflow">, string> = {
  notizen: "notizen",
  email: "e-mail",
  dateien: "dateien",
  verlauf: "verlauf",
};

const PANE_BY_SLUG = new Map(
  Object.entries(PANE_SLUGS).map(([id, slug]) => [slug, id as Exclude<WorkflowPane, "workflow">]),
);

/** The Bestandsmanager has no step of its own, so activeStep is left alone there. */
const FINANZEN_STEP_SLUGS: Record<HonorarStepKey, string> = {
  status: "status",
  data: "daten",
  carrier: "datentraeger",
  dispatch: "versand",
  reminders: "erinnerungen",
};

const FINANZEN_STEP_BY_SLUG = new Map(
  Object.entries(FINANZEN_STEP_SLUGS).map(([id, slug]) => [slug, id as HonorarStepKey]),
);

/** Area and page of a tabbed section (Home, Mein Bereich), by their labels. */
export type NavPlace = { area: string; page: string };

/** Management: area tab and the list tab inside it. */
export type ManagerNav = { area: "bestand" | "hrm"; tab: string };

/** Every area / page label that can stand in a URL; the slug is made from the label. */
const NAV_LABELS = [
  "Planner",
  "Kommunikation",
  "Bestand",
  "Wissen",
  "Dashboard",
  "Kalender",
  "Workflows & To-Dos",
  "Notizblock",
  "Meine Dateien",
  "Chat",
  "E-Mail",
  "Telefonie",
  "Mein Bereich",
  "Profil",
  "Listen",
  "Dokumente",
  "Honorare/Forderungen",
];

/** "Workflows & To-Dos" → "workflows-und-to-dos", "Übersicht" → "uebersicht". */
export function toSlug(label: string) {
  return label
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const LABEL_BY_SLUG = new Map(NAV_LABELS.map((label) => [toSlug(label), label]));

function navOf(parts: string[], fallback: NavPlace): NavPlace {
  const area = LABEL_BY_SLUG.get(parts[0] ?? "");
  const page = LABEL_BY_SLUG.get(parts[1] ?? "");
  return area ? { area, page: page ?? "Dashboard" } : fallback;
}

export type Route = {
  view: View;
  /** Home and Mein Bereich: the open area and page. */
  nav?: NavPlace;
  managerNav?: ManagerNav;
  activeStep?: StepId;
  freigabeId?: string;
  stammdatenArea?: StammdatenAreaId;
  stammdatenCardId?: string;
  workflowPane?: WorkflowPane;
  personModule?: PersonModule;
  personArea?: PersonArea;
  partnerId?: PartnerId;
  finanzenPage?: FinanzenPage;
  finanzenMonth?: string;
  finanzenStep?: HonorarStepKey;
  finanzenPartnerId?: string;
  /** Year dashboard of the Sammelfaktura; empty means the overview of all years. */
  finanzenYear?: string;
  konzernHubId?: string;
  /** Invoice workflow: the fee it belongs to. */
  rechnungFeeId?: string;
};

function partnerOf(parts: string[]): PartnerId {
  return PARTNER_BY_SLUG.get(parts[1] ?? "") ?? "julia";
}

export function routeToHash({
  view,
  activeStep,
  freigabeId,
  stammdatenArea,
  stammdatenCardId,
  workflowPane,
  personModule,
  personArea,
  partnerId = "julia",
  finanzenPage,
  finanzenMonth,
  finanzenStep,
  finanzenPartnerId,
  finanzenYear,
  konzernHubId,
  rechnungFeeId,
  nav,
  managerNav,
}: Route): string {
  if (view === "rechnung" && rechnungFeeId) return `#/${FINANZEN}/rechnung/${rechnungFeeId}`;
  if (view === "konzernHub" && konzernHubId) {
    return `#/${personRoot(partnerId)}/konzern/${konzernHubId}`;
  }
  if (view === "pruefung") return `#/${personRoot(partnerId)}/${PRUEFUNG}`;
  if (view === "stammdaten") {
    const area = AREA_SLUGS[stammdatenArea ?? "personendaten"];
    const card = stammdatenCardId ? `/${stammdatenCardId}` : "";
    return `#/${personRoot(partnerId)}/${STAMMDATEN_WORKFLOW}/${area}${card}`;
  }
  if (view === "person") {
    const root = personRoot(partnerId);
    if (personModule === "workflows") return `#/${root}/${PERSON_WORKFLOWS}`;
    if (personModule === "dashboard") return `#/${root}/dashboard`;
    if (personArea === "inkasso") return `#/${root}/${INKASSO_AREA}`;
    if (personArea === "maklermandat") return `#/${root}/${MAKLERMANDAT_AREA}`;
    return `#/${root}/${PERSON_AREA}`;
  }
  if (view === "meinBereich") return nav ? `#/mein-bereich/${toSlug(nav.area)}/${toSlug(nav.page)}` : "#/mein-bereich";
  if (view === "admin") return "#/admin";
  if (view === "home") return nav ? `#/home/${toSlug(nav.area)}/${toSlug(nav.page)}` : "#/home";
  if (view === "finanzen") {
    if (finanzenPage === "sammelfaktura") return `#/${FINANZEN}/sammelfaktura${finanzenYear ? `/${finanzenYear}` : ""}`;
    if (finanzenPage === "openItems") return `#/${FINANZEN}/offene-posten`;
    if (finanzenPage === "singleInvoices") return `#/${FINANZEN}/einzelfaktura`;
    if (finanzenPage === "inkasso") return `#/${FINANZEN}/inkasso/${finanzenPartnerId ?? ""}`;
    if (finanzenPage === "meinBereich") return `#/${FINANZEN}/mein-bereich`;
    const month = finanzenMonth ?? "2027-04";
    const step = finanzenStep && finanzenStep !== "status" ? `/${FINANZEN_STEP_SLUGS[finanzenStep]}` : "";
    return `#/${FINANZEN}/${month}${step}`;
  }
  if (view === "freigabe" && freigabeId) return `#/${MANAGER}/${freigabeId}`;
  if (view === "manager" || view === "freigabe") {
    const place = managerNav ?? { area: "bestand", tab: "freigaben" };
    return `#/management/${place.area}/${place.tab}`;
  }
  const pane = workflowPane && workflowPane !== "workflow" ? PANE_SLUGS[workflowPane] : null;
  if (pane) return `#/${personRoot(partnerId)}/${WORKFLOW}/${pane}`;
  const slug = STEP_SLUGS[activeStep ?? "tasks"];
  return `#/${personRoot(partnerId)}/${WORKFLOW}/${slug}`;
}

export function hashToRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "mein-bereich") return { view: "meinBereich", nav: navOf(parts.slice(1), { area: "Mein Bereich", page: "Dashboard" }) };
  if (parts[0] === "admin") return { view: "admin" };
  if (parts[0] === "home") return { view: "home", nav: navOf(parts.slice(1), { area: "Planner", page: "Workflows & To-Dos" }) };
  // Management: management/<area>/<tab>[/<freigabe>]. Older links (bestandsmanager/…) mean the same.
  if (parts[0] === "management" && parts[1] !== "finanzen") {
    const area = parts[1] === "hrm" ? "hrm" : "bestand";
    const tab = parts[2] ?? (area === "hrm" ? "antraege" : "freigaben");
    if (area === "bestand" && tab === "freigaben" && parts[3]) return { view: "freigabe", freigabeId: parts[3], managerNav: { area, tab } };
    return { view: "manager", managerNav: { area, tab } };
  }
  if (parts[0] === "management" || (parts[0] === "bestandsmanager" && parts[1] === "finanzen")) {
    const rest = parts.slice(2);
    if (rest[0] === "sammelfaktura") {
      const year = /^\d{4}$/.test(rest[1] ?? "") ? rest[1] : "";
      return { view: "finanzen", finanzenPage: "sammelfaktura", finanzenYear: year };
    }
    if (rest[0] === "rechnung" && rest[1]) return { view: "rechnung", rechnungFeeId: rest[1] };
    if (rest[0] === "offene-posten") return { view: "finanzen", finanzenPage: "openItems" };
    if (rest[0] === "einzelfaktura") return { view: "finanzen", finanzenPage: "singleInvoices" };
    if (rest[0] === "mein-bereich") return { view: "finanzen", finanzenPage: "meinBereich" };
    if (rest[0] === "inkasso") {
      return { view: "finanzen", finanzenPage: "inkasso", finanzenPartnerId: rest[1] };
    }
    const month = /^\d{4}-\d{2}$/.test(rest[0] ?? "") ? rest[0] : "2027-04";
    const step = FINANZEN_STEP_BY_SLUG.get(rest[1] ?? "") ?? "status";
    return { view: "finanzen", finanzenPage: "month", finanzenMonth: month, finanzenStep: step };
  }
  if (parts[0] === "bestandsmanager") {
    const id = parts[2];
    return id ? { view: "freigabe", freigabeId: id } : { view: "manager", managerNav: { area: "bestand", tab: "freigaben" } };
  }
  if (parts[0] === "person" && parts[2] === PRUEFUNG) {
    return { view: "pruefung", partnerId: partnerOf(parts), personModule: "profil", personArea: "stammdaten" };
  }
  if (parts[0] === "person" && parts[2] === STAMMDATEN_WORKFLOW) {
    const area = AREA_BY_SLUG.get(parts[3] ?? "") ?? STAMMDATEN_AREAS[0].id;
    return {
      view: "stammdaten",
      partnerId: partnerOf(parts),
      stammdatenArea: area,
      stammdatenCardId: parts[4],
      personArea: "stammdaten",
    };
  }
  if (parts[0] === "person" && parts[2] === "konzern" && parts[3]) {
    return { view: "konzernHub", partnerId: partnerOf(parts), konzernHubId: parts[3], personArea: "stammdaten" };
  }
  if (parts[0] === "person" && parts[2] === "dashboard") {
    return { view: "person", partnerId: partnerOf(parts), personModule: "dashboard" };
  }
  if (parts[0] === "person" && parts[2] === PERSON_WORKFLOWS) {
    return { view: "person", partnerId: partnerOf(parts), personModule: "workflows" };
  }
  /** The profile page hangs off the person without a workflow segment. */
  if (parts[0] === "person" && parts[2] !== WORKFLOW) {
    return {
      view: "person",
      partnerId: partnerOf(parts),
      personModule: "profil",
      personArea:
        parts[2] === INKASSO_AREA ? "inkasso" : parts[2] === MAKLERMANDAT_AREA ? "maklermandat" : "stammdaten",
    };
  }
  const last = parts[parts.length - 1] ?? "";
  const pane = PANE_BY_SLUG.get(last);
  if (pane) return { view: "workflow", partnerId: partnerOf(parts), workflowPane: pane };
  const step = STEP_BY_SLUG.get(last);
  return { view: "workflow", partnerId: partnerOf(parts), activeStep: step ?? "tasks", workflowPane: "workflow" };
}
