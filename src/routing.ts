import type { StepId, View } from "./workflow";

/**
 * URLs mirror the app's nesting: the open person tab, the open workflow tab, then the page.
 * The prototype only ever has one person and one workflow, so those two are fixed.
 */
const PERSON = "person/julia-atkinson";
const WORKFLOW = "maklervereinbarung";
const MANAGER = "bestandsmanager/freigaben";

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
export type Route = { view: View; activeStep?: StepId };

export function routeToHash({ view, activeStep }: Route): string {
  if (view === "manager") return `#/${MANAGER}`;
  const slug = STEP_SLUGS[activeStep ?? "tasks"];
  return `#/${PERSON}/${WORKFLOW}/${slug}`;
}

export function hashToRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "bestandsmanager") return { view: "manager" };
  const step = STEP_BY_SLUG.get(parts[parts.length - 1] ?? "");
  return { view: "workflow", activeStep: step ?? "tasks" };
}
