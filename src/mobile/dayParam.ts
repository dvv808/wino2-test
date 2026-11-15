/**
 * The Kalender day in the link: ?tag=2026-11-16. It sits outside the #route, so it stays while the app writes its
 * own hash, and a shared link opens the Kalender (mobile and desktop) on that day.
 */
const PARAM = "tag";
const VALID = /^\d{4}-\d{2}-\d{2}$/;

export function readDayParam(): string | null {
  try {
    const value = new URLSearchParams(window.location.search).get(PARAM);
    return value && VALID.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeDayParam(day: string) {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PARAM) === day) return;
    url.searchParams.set(PARAM, day);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // The link just does not carry the day.
  }
}
