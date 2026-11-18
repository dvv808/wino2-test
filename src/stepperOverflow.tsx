import { useEffect, useRef, useState } from "react";
import * as a from "./assets/index";

/**
 * Responsive wave stepper (Figma 22742:231226), shared by every stepper (Maklervereinbarung, Stammdaten workflows):
 * when the bar is too narrow, the last step stays pinned at the right edge and the others slide underneath it;
 * ‹ › in the page-coloured pocket scroll the bar. Labels never squeeze or hyphenate.
 *
 * `active` is the id of the current step: it scrolls into view, clear of the pinned last step.
 */
export function useStepperOverflow(active: string) {
  const barRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const check = () => setOverflow(bar.scrollWidth > bar.clientWidth + 2);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const bar = barRef.current;
    const step = bar?.querySelector<HTMLElement>(".step.active");
    const last = bar?.lastElementChild as HTMLElement | null;
    if (!bar || !step || !last || step === last) return;
    const box = bar.getBoundingClientRect();
    const own = step.getBoundingClientRect();
    const pinned = last.getBoundingClientRect();
    const tooFarRight = own.right - (pinned.left - 40);
    const tooFarLeft = own.left - (box.left + 24);
    if (tooFarRight > 0) bar.scrollBy({ left: tooFarRight, behavior: "smooth" });
    else if (tooFarLeft < 0) bar.scrollBy({ left: tooFarLeft, behavior: "smooth" });
  }, [active, overflow]);
  // ‹ ›: one step's width at a time, to an exact target (clamped), so repeated clicks never get lost mid-animation.
  const [edge, setEdge] = useState({ start: true, end: false });
  const target = useRef<number | null>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () => {
      const max = bar.scrollWidth - bar.clientWidth;
      setEdge({ start: bar.scrollLeft <= 1, end: bar.scrollLeft >= max - 1 });
      if (target.current !== null && Math.abs(bar.scrollLeft - target.current) < 2) target.current = null;
    };
    update();
    bar.addEventListener("scroll", update, { passive: true });
    return () => bar.removeEventListener("scroll", update);
  }, [overflow]);
  const scrollBy = (dir: 1 | -1) => {
    const bar = barRef.current;
    if (!bar) return;
    const max = bar.scrollWidth - bar.clientWidth;
    const from = target.current ?? bar.scrollLeft;
    const next = Math.max(0, Math.min(max, from + dir * 260));
    target.current = next;
    bar.scrollTo({ left: next, behavior: "smooth" });
  };
  return { barRef, overflow, edge, scrollBy };
}

/** The pinned last step's white fade over the steps sliding underneath. */
export function StepFade() {
  return <img className="step-fade" src={a.stepperEndFade} alt="" />;
}

/** The pocket cut into the bar's end, holding ‹ ›. */
export function StepperPocket({
  edge,
  scrollBy,
}: {
  edge: { start: boolean; end: boolean };
  scrollBy: (dir: 1 | -1) => void;
}) {
  return (
    <span className="stepper-pocket">
      <img className="stepper-pocket-bg" src={a.stepperEndPocket} alt="" />
      <button type="button" aria-label="Schritte nach links" disabled={edge.start} onClick={() => scrollBy(-1)}>
        <img src={a.stepperArrowLeft} alt="" />
      </button>
      <button type="button" aria-label="Schritte nach rechts" disabled={edge.end} onClick={() => scrollBy(1)}>
        <img src={a.stepperArrowRight} alt="" />
      </button>
    </span>
  );
}

/**
 * The one wrapper for every wave stepper: renders the bar, pins the last step and adds the ‹ › pocket when the
 * steps do not fit. `children(overflow)` renders the step buttons; put <StepFade /> into the last one while
 * `overflow` is true. Every new stepper uses this, so it is responsive from the start.
 */
export function WaveStepper({
  active,
  className = "",
  children,
}: {
  active: string;
  className?: string;
  children: (overflow: boolean) => import("react").ReactNode;
}) {
  const { barRef, overflow, edge, scrollBy } = useStepperOverflow(active);
  return (
    <div className={overflow ? "stepper-wrap overflowing" : "stepper-wrap"}>
      <div className={`stepper ${className}`.trim()} ref={barRef}>
        {children(overflow)}
      </div>
      {overflow ? <StepperPocket edge={edge} scrollBy={scrollBy} /> : null}
    </div>
  );
}
