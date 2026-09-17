import type { StepId, View } from "./workflow";

/**
 * URLs mirror the app's nesting: the open person tab, the open workflow tab, then the page.
 * The prototype only ever has one person and one workflow, so those two are fixed.
 */
const PERSON = "person/julia-atkinson";
const WORKFLOW = "maklervereinbarung";
const MANAGER = "bestandsmanager/freigaben";
/** The profile page opens on Stammdaten; Riskmanagement and Maklermandat come later. */
const PERSON_AREA = "stammdaten";

const STEP_SLUGS: Record<StepId, string> = {
  tasks: "offene-aufgaben",
  comms: "kommunikationsdaten",
  fee: "honorar",
  terms: "individuelle-vereinbarungen",
  scope: "leistungsumfang",
  docs: "dokumentenfreigabe",
  sign: "signaturen",
};

const STEP_BY_SLUG = new Map(
  Object.entries(STEP_SLUGS).map(([id, slug]) => [slug, id as StepId]),
);

/** The Bestandsmanager has no step of its own, so activeStep is left alone there. */
export type Route = { view: View; activeStep?: StepId; freigabeId?: string };

export function routeToHash({ view, activeStep, freigabeId }: Route): string {
  if (view === "person") return `#/${PERSON}/${PERSON_AREA}`;
  if (view === "freigabe" && freigabeId) return `#/${MANAGER}/${freigabeId}`;
  if (view === "manager" || view === "freigabe") return `#/${MANAGER}`;
  const slug = STEP_SLUGS[activeStep ?? "tasks"];
  return `#/${PERSON}/${WORKFLOW}/${slug}`;
}

export function hashToRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "bestandsmanager") {
    const id = parts[2];
    return id ? { view: "freigabe", freigabeId: id } : { view: "manager" };
  }
  /** The profile page hangs off the person without a workflow segment. */
  if (parts[0] === "person" && parts[2] !== WORKFLOW) return { view: "person" };
  const step = STEP_BY_SLUG.get(parts[parts.length - 1] ?? "");
  return { view: "workflow", activeStep: step ?? "tasks" };
}
