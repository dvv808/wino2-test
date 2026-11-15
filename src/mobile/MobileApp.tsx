import React, { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { MobileArbeitszeit } from "./MobileArbeitszeit";
import { MobileKalender } from "./MobileKalender";
import { MobileKontakte } from "./MobileKontakte";
import { MobileTerminForm } from "./MobileTermin";
import { iso, seedWeek } from "../home/calendar/calendarData";
import { SideNav, type SidePanel } from "../home/calendar/KalenderPage";
import { HomeofficeModal } from "../home/calendar/HomeofficeUI";
import { loadAntraege, onAntraegeChange, saveAntraege, saveDay } from "../home/calendar/homeoffice";
import { loadArbeitszeiten } from "../home/calendar/arbeitszeit";

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
  /* The desktop side nav (Mein Kalender, Aktivitäten, Kalender) as a drawer, opened from the name in the header. */
  const [drawer, setDrawer] = useState(false);
  const [panel, setPanel] = useState<SidePanel>("kalender");
  const [visible, setVisible] = useState<Set<string>>(() => new Set(["lucy", "icloud"]));
  const [hoDay, setHoDay] = useState<string | null>(null);
  /* Bottom nav: hides while scrolling down, comes back on scrolling up (or at the top). */
  const [navHidden, setNavHidden] = useState(false);
  const lastScroll = useRef(0);
  const onSheetScroll = (event: React.UIEvent<HTMLElement>) => {
    const y = event.currentTarget.scrollTop;
    const delta = y - lastScroll.current;
    if (y < 24) setNavHidden(false);
    else if (delta > 6) setNavHidden(true);
    else if (delta < -6) setNavHidden(false);
    lastScroll.current = y;
  };
  const [antraege, setAntraege] = useState(loadAntraege);
  useEffect(() => onAntraegeChange(setAntraege), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className={navHidden ? "m-app nav-hidden" : "m-app"}>
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
            <button
              type="button"
              className="m-header-title"
              aria-expanded={drawer}
              aria-label={nav === "kalender" ? "Kalender-Navigation öffnen" : "Kontakte"}
              onClick={() => nav === "kalender" && setDrawer(!drawer)}
            >
              <img src={nav === "kalender" ? a.mHeaderCalendar : a.contacts} alt="" width={24} height={24} className={nav === "kontakte" ? "m-invert" : ""} />
              <span>
                <small>{nav === "kalender" ? "Kalender" : "Kontakte"}</small>
                <strong>
                  Lucy Dallon
                  <img src={a.chevronDown} alt="" width={14} height={7} className={drawer ? "m-invert m-chev open" : "m-invert m-chev"} />
                </strong>
              </span>
            </button>
            <span className="m-header-avatar">
              <img src={a.empLucy} alt="" />
              <i className="m-header-online" />
              <b>3</b>
            </span>
          </header>

          <main className="m-sheet" onScroll={onSheetScroll}>
            {nav === "kalender" ? (
              <MobileKalender
                day={day}
                today={today}
                onDay={setDay}
                onArbeitszeit={() => setScreen({ kind: "arbeitszeit", day })}
                onHomeoffice={() => setHoDay(day < today ? today : day)}
                visible={visible}
                onTermin={(art) => setScreen({ kind: "termin", day, art })}
                onToast={setToast}
              />
            ) : (
              <MobileKontakte />
            )}
          </main>

          <nav className="m-nav" aria-label="Hauptnavigation">
            <button
              type="button"
              className={nav === "kalender" ? "active" : ""}
              aria-current={nav === "kalender" ? "page" : undefined}
              onClick={() => {
                setNav("kalender");
                setNavHidden(false);
              }}
            >
              <img src={nav === "kalender" ? a.mNavKalenderDark : a.mNavKalender} alt="" width={21} height={24} />
              Kalender
            </button>
            <button
              type="button"
              className={nav === "kontakte" ? "active" : ""}
              aria-current={nav === "kontakte" ? "page" : undefined}
              onClick={() => {
                setNav("kontakte");
                setNavHidden(false);
              }}
            >
              <img src={nav === "kontakte" ? a.mNavKontakteDark : a.mNavKontakte} alt="" width={36} height={21} />
              Kontakte
            </button>
          </nav>
        </>
      )}

      {drawer ? (
        <div className="m-drawer-wrap">
          <button type="button" className="m-drawer-scrim" aria-label="Navigation schließen" onClick={() => setDrawer(false)} />
          <div className="m-drawer" role="dialog" aria-label="Kalender-Navigation">
            <SideNav
              day={day}
              today={today}
              onPick={(d) => {
                setDay(d);
                setDrawer(false);
              }}
              visible={visible}
              toggle={(id) =>
                setVisible((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              panel={panel}
              setPanel={setPanel}
              highlight={null}
              antraege={antraege}
              onOpenAntrag={(x) => {
                setDay(x.day);
                setDrawer(false);
              }}
              onEditAntrag={(x) => {
                setDrawer(false);
                setHoDay(x.day);
              }}
            />
          </div>
        </div>
      ) : null}

      {hoDay ? (
        <div className="m-ho">
          <HomeofficeModal
            today={today}
            start={hoDay}
            antraege={antraege}
            holidays={seedWeek(today).holidays}
            arbeitszeiten={loadArbeitszeiten()}
            onClose={() => setHoDay(null)}
            onSave={(d, blocks) => {
              const next = saveDay(antraege, d, blocks, new Date().toISOString());
              saveAntraege(next);
              setAntraege(next);
              setHoDay(null);
              setDay(d);
              setToast("Homeoffice beantragt");
            }}
          />
        </div>
      ) : null}

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
