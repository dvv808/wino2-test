import { useId, type ReactNode } from "react";
import * as a from "../assets/index";

export type PlausiMode = "hint" | "search" | "empty";
export type PlausiSource = "wico" | "wino";

// 9 × 9 dot grid on the 70px disc. A soft glow travels diagonally from bottom
// left to top right; each dot swells when the glow reaches it.
const DOTS: [number, number][] = Array.from({ length: 81 }, (_, i) => [i % 9, Math.floor(i / 9)]);
const WAVE_S = 2.4; // keep in sync with .pa-plausi-dots in styles.css
// The glow crosses 100px of diagonal in WAVE_S; a dot sits 4·(c−r) px off the
// centre line, and peaks 40% into its own WAVE_S cycle.
const dotDelay = (c: number, r: number) => `${(((4 * (c - r) + 50) / 100 - 0.4) * WAVE_S).toFixed(2)}s`;

// Diamond end marker of an arc (Figma: 5.77px square turned 45°).
function Diamond({ x, y, late }: { x: number; y: number; late?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className={late ? "end late" : "end"} x="-2.04" y="-2.04" width="4.08" height="4.08" transform="rotate(45)" />
    </g>
  );
}

// Plausibilitätscheck hint / search / no-results card (Figma 22819:431834).
// Geometry is taken 1:1 from the Figma vectors: 70px disc with a 80px halo,
// a 270° outer arc (r 45) and a 270° inner arc (r 29, 40%) with diamond ends,
// and the WICO / Wino badges. In "search" a wave of dots runs over the disc
// from bottom left to top right; the arcs stay still.
export function PlausiState({
  mode,
  sources,
  children,
}: {
  mode: PlausiMode;
  sources: PlausiSource[];
  children: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const disc = `pl-disc-${id}`;
  const outer = `pl-outer-${id}`;
  const inner = `pl-inner-${id}`;
  return (
    <div className={`pa-plausi ${mode}`} role="status" aria-live="polite">
      <span className="pa-plausi-art" aria-hidden>
        <svg className="pa-plausi-disc" width="90" height="90" viewBox="0 0 90 90">
          <defs>
            <linearGradient id={disc} x1="0" y1="1.2" x2="0.85" y2="-0.4">
              <stop offset="0.11" stopColor="#d3e7f1" />
              <stop offset="1" stopColor="#ffffff" />
            </linearGradient>
            {/* Figma's arc gradients (white → #d3e7f1), in the 90px frame's coordinates. */}
            <linearGradient id={outer} gradientUnits="userSpaceOnUse" x1="83.57" y1="104.19" x2="-35.21" y2="11.4">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.89" stopColor="#d3e7f1" />
            </linearGradient>
            <linearGradient id={inner} gradientUnits="userSpaceOnUse" x1="46.26" y1="82.45" x2="75.85" y2="26.39">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.89" stopColor="#d3e7f1" />
            </linearGradient>
          </defs>
          <circle cx="45" cy="45" r="40" fill={`url(#${disc})`} opacity="0.3" />
          <circle className="face" cx="45" cy="45" r="35" fill={`url(#${disc})`} />
        </svg>
        {mode === "search" && (
          <span className="pa-plausi-dots">
            <span className="glow" />
            {DOTS.map(([c, r]) => (
              <i key={`${c}-${r}`} style={{ left: c * 8 + 3, top: r * 8 + 3, animationDelay: dotDelay(c, r) }} />
            ))}
          </span>
        )}
        <svg className="pa-plausi-orbit outer" width="90" height="90" viewBox="0 0 90 90" stroke={`url(#${outer})`} fill={`url(#${outer})`}>
          <path d="M45 0 A45 45 0 1 1 0 45" fill="none" />
          <Diamond x={45} y={0} />
          <Diamond x={0} y={45} late />
        </svg>
        <svg className="pa-plausi-orbit inner" width="90" height="90" viewBox="0 0 90 90" stroke={`url(#${inner})`} fill={`url(#${inner})`}>
          <path d="M45 74 A29 29 0 1 1 74 45" fill="none" />
          <Diamond x={45} y={74} />
          <Diamond x={74} y={45} late />
        </svg>
        {/* Icon_PlausiCheck (Figma 40px), shown a little smaller at 34px; lines stay 1px. */}
        <svg className="pa-plausi-icon" width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="#313537">
          <path d="M28.3322 3.33203H35.6653C36.2176 3.33203 36.6653 3.77975 36.6653 4.33203V11.6651M11.6661 3.33203H4.33301C3.78072 3.33203 3.33301 3.77975 3.33301 4.33203V11.6651M36.6653 28.3312V35.6643C36.6653 36.2166 36.2176 36.6643 35.6653 36.6643H28.3322M11.6661 36.6643H4.33301C3.78072 36.6643 3.33301 36.2166 3.33301 35.6643V28.3312" />
          <circle cx="19.9996" cy="19.9976" r="11.9996" />
          <path d="M14.166 21.9429L16.6131 24.2929C17.0166 24.6804 17.6596 24.6615 18.0396 24.2509L25.8323 15.832" strokeLinecap="round" />
        </svg>
        <span className="pa-plausi-badges">
          {sources.includes("wico") && <img src={a.plausiBadgeWico} alt="" width={30} height={30} />}
          {sources.includes("wino") && <img src={a.plausiBadgeWino} alt="" width={30} height={30} />}
        </span>
      </span>
      <p>{children}</p>
    </div>
  );
}
