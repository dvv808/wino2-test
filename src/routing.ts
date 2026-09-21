import { FILE_PARTNERS, PARTNER_BY_SLUG, type PartnerId } from "./person/partners";
import type { StammdatenAreaId } from "./person/stammdaten";
import { STAMMDATEN_AREAS } from "./person/stammdaten";
import type { StepId, View, WorkflowPane } from "./workflow";

/** Profil is the default person module; Workflows & To-Dos is the advisor inbox. */
export type PersonModule = "profil" | "workflows";
export type PersonArea = "stammdaten" | "maklermandat";

/**
 * URLs mirror the app's nesting: the open person tab, the open workflow tab, then the page.
 * Maklervereinbarung always hangs off Julia; Ashley only has a person file.
 */
const WORKFLOW = "maklervereinbarung";
const MANAGER = "bestandsmanager/freigaben";
/** The profile page opens on Stammdaten; Ashley's file opens on Maklermandat. */
const PERSON_AREA = "stammdaten";
const ASHLEY_AREA = "maklermandat";
const PERSON_WORKFLOWS = "workflows-to-dos";
const STAMMDATEN_WORKFLOW = "stammdaten-workflow";

function personRoot(partnerId: PartnerId = "julia") {
  return `person/${FILE_PARTNERS[partnerId].slug}`;
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
export type Route = {
  view: View;
  activeStep?: StepId;
  freigabeId?: string;
  stammdatenArea?: StammdatenAreaId;
  stammdatenCardId?: string;
  workflowPane?: WorkflowPane;
  personModule?: PersonModule;
  personArea?: PersonArea;
  partnerId?: PartnerId;
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
}: Route): string {
  if (view === "stammdaten") {
    const area = AREA_SLUGS[stammdatenArea ?? "personendaten"];
    const card = stammdatenCardId ? `/${stammdatenCardId}` : "";
    return `#/${personRoot(partnerId)}/${STAMMDATEN_WORKFLOW}/${area}${card}`;
  }
  if (view === "person") {
    const root = personRoot(partnerId);
    if (personModule === "workflows") return `#/${root}/${PERSON_WORKFLOWS}`;
    if (partnerId === "ashley" && personArea !== "stammdaten") return `#/${root}/${ASHLEY_AREA}`;
    return `#/${root}/${PERSON_AREA}`;
  }
  if (view === "freigabe" && freigabeId) return `#/${MANAGER}/${freigabeId}`;
  if (view === "manager" || view === "freigabe") return `#/${MANAGER}`;
  const pane = workflowPane && workflowPane !== "workflow" ? PANE_SLUGS[workflowPane] : null;
  if (pane) return `#/${personRoot("julia")}/${WORKFLOW}/${pane}`;
  const slug = STEP_SLUGS[activeStep ?? "tasks"];
  return `#/${personRoot("julia")}/${WORKFLOW}/${slug}`;
}

export function hashToRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "bestandsmanager") {
    const id = parts[2];
    return id ? { view: "freigabe", freigabeId: id } : { view: "manager" };
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
  if (parts[0] === "person" && parts[2] === PERSON_WORKFLOWS) {
    return { view: "person", partnerId: partnerOf(parts), personModule: "workflows" };
  }
  /** The profile page hangs off the person without a workflow segment. */
  if (parts[0] === "person" && parts[2] !== WORKFLOW) {
    return {
      view: "person",
      partnerId: partnerOf(parts),
      personModule: "profil",
      personArea: parts[2] === ASHLEY_AREA ? "maklermandat" : "stammdaten",
    };
  }
  const last = parts[parts.length - 1] ?? "";
  const pane = PANE_BY_SLUG.get(last);
  if (pane) return { view: "workflow", partnerId: "julia", workflowPane: pane };
  const step = STEP_BY_SLUG.get(last);
  return { view: "workflow", partnerId: "julia", activeStep: step ?? "tasks", workflowPane: "workflow" };
}
