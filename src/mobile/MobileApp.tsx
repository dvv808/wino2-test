import { useEffect, useState } from "react";
import * as a from "../assets/index";
import { MobileArbeitszeit } from "./MobileArbeitszeit";
import { MobileKalender } from "./MobileKalender";
import { MobileKontakte } from "./MobileKontakte";
import { MobileTerminForm } from "./MobileTermin";
import { iso } from "../home/calendar/calendarData";

/**
 * Mobile version of the Kalender (Figma 19075:470560). Shown instead of the desktop Kalender below MOBILE_MAX
 * width. It has two main navs for now: Kalender and Kontakte (Figma 19075:490158).
 */
export const MOBILE_MAX = 640;

/** True while the window is at phone width. */
export function useIsMobile() {
  const query = `(max-width: ${MOBILE_MAX}px)`;
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMobile(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return mobile;
}

type Nav = "kalender" | "kontakte";
type Screen = null | { kind: "arbeitszeit"; day: string } | { kind: "termin"; day: string; art: string };

export function MobileApp() {
  const today = iso(new Date());
  const [nav, setNav] = useState<Nav>("kalender");
  const [day, setDay] = useState(today);
  const [screen, setScreen] = useState<Screen>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="m-app">
      {screen?.kind === "arbeitszeit" ? (
        <MobileArbeitszeit
          day={screen.day}
          today={today}
          onBack={() => setScreen(null)}
          onSaved={(saved) => {
            setDay(saved);
            setScreen(null);
            setToast("Arbeitszeit erfolgreich hinzugefügt");
          }}
        />
      ) : screen?.kind === "termin" ? (
        <MobileTerminForm
          day={screen.day}
          art={screen.art}
          onBack={() => setScreen(null)}
          onSaved={(saved, message) => {
            setDay(saved);
            setScreen(null);
            setToast(message);
          }}
        />
      ) : (
        <>
          <header className="m-header" style={{ backgroundImage: `url(${a.mHeaderBg})` }}>
            <span className="m-header-title">
              <img src={nav === "kalender" ? a.mHeaderCalendar : a.contacts} alt="" width={24} height={24} className={nav === "kontakte" ? "m-invert" : ""} />
              <span>
                <small>{nav === "kalender" ? "Kalender" : "Kontakte"}</small>
                <strong>
                  Lucy Dallon
                  <img src={a.chevronDown} alt="" width={12} height={12} className="m-invert" />
                </strong>
              </span>
            </span>
            <span className="m-header-avatar">
              <img src={a.empLucy} alt="" />
              <i className="m-header-online" />
              <b>3</b>
            </span>
          </header>

          <main className="m-sheet">
            {nav === "kalender" ? (
              <MobileKalender
                day={day}
                today={today}
                onDay={setDay}
                onArbeitszeit={() => setScreen({ kind: "arbeitszeit", day })}
                onTermin={(art) => setScreen({ kind: "termin", day, art })}
                onToast={setToast}
              />
            ) : (
              <MobileKontakte />
            )}
          </main>

          <nav className="m-nav" aria-label="Hauptnavigation">
            <button type="button" className={nav === "kalender" ? "active" : ""} aria-current={nav === "kalender" ? "page" : undefined} onClick={() => setNav("kalender")}>
              <img src={nav === "kalender" ? a.mNavKalenderDark : a.mNavKalender} alt="" width={21} height={24} />
              Kalender
            </button>
            <button type="button" className={nav === "kontakte" ? "active" : ""} aria-current={nav === "kontakte" ? "page" : undefined} onClick={() => setNav("kontakte")}>
              <img src={nav === "kontakte" ? a.mNavKontakteDark : a.mNavKontakte} alt="" width={36} height={21} />
              Kontakte
            </button>
          </nav>
        </>
      )}

      {toast ? (
        <div className="m-toast" role="status">
          <img src={a.checkGreen} alt="" width={20} height={20} />
          <span>{toast}</span>
          <button type="button" aria-label="Schließen" onClick={() => setToast(null)}>
            <img src={a.iconCloseDark} alt="" width={10} height={10} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
