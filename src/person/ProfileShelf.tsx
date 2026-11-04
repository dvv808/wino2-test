import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { Icon, ShelveToggleIcon } from "../ui";

type Shelf = { collapsed: boolean; toggle: () => void; open: boolean; setOpen: (open: boolean) => void };

const ShelfContext = createContext<Shelf>({ collapsed: false, toggle: () => {}, open: false, setOpen: () => {} });

/** Profile side nav: shown beside the page, or shelved (then it opens as a dropdown under the page title). */
export function ProfileShelfProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  // Picking an area in the dropdown changes the route: the dropdown closes.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  return (
    <ShelfContext.Provider
      value={{
        collapsed,
        toggle: () => {
          setCollapsed((value) => !value);
          setOpen(false);
        },
        open,
        setOpen,
      }}
    >
      {children}
    </ShelfContext.Provider>
  );
}

/** `.pp-body` of a profile area: hides the side nav when shelved, and shows it as a dropdown while open. */
export function ShelfBody({ children }: { children: ReactNode }) {
  const { collapsed, open } = useContext(ShelfContext);
  return <div className={`pp-body${collapsed ? " shelved" : ""}${collapsed && open ? " drop-open" : ""}`}>{children}</div>;
}

/**
 * Page title of a profile area with the shelve toggle in front. Shelved, the title itself opens the
 * side nav as a dropdown (chevron at the end), placed right under the title.
 */
export function ShelfTitle({ icon, children }: { icon: string; children: ReactNode }) {
  const { collapsed, toggle, open, setOpen } = useContext(ShelfContext);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const title = ref.current;
    const body = title?.closest<HTMLElement>(".pp-body");
    if (!open || !title || !body) return;
    const titleRect = title.getBoundingClientRect();
    const headRect = (title.closest(".pp-main-head") ?? title).getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    // Right under the grey page header, aligned with the title.
    body.style.setProperty("--shelf-top", `${headRect.bottom - bodyRect.top + 8}px`);
    body.style.setProperty("--shelf-left", `${titleRect.left - bodyRect.left - 8}px`);

    function onDown(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (title?.contains(target) || target.closest(".pp-body.drop-open > .pp-side")) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  return (
    <span className="pp-main-title" ref={ref}>
      <button
        type="button"
        className="hn-shelve"
        aria-label={collapsed ? "Navigation einblenden" : "Navigation ausblenden"}
        title={collapsed ? "Navigation einblenden" : "Navigation ausblenden"}
        onClick={toggle}
      >
        <ShelveToggleIcon collapsed={collapsed} />
      </button>
      {collapsed ? (
        <button
          type="button"
          className={open ? "hn-kicker-drop open" : "hn-kicker-drop"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon src={icon} size={24} />
          {children}
          <Icon src={a.chevronDown} size={16} />
        </button>
      ) : (
        <>
          <Icon src={icon} size={24} />
          {children}
        </>
      )}
    </span>
  );
}
