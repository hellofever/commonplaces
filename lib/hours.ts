import type { OpeningPeriod } from "./types";

export type OpenStatus = {
  label: string;
  iconClass: string;
  textClass: string;
};

const GREEN = "text-green-600 dark:text-green-400";
const AMBER = "text-amber-500 dark:text-amber-400";
const RED = "text-red-500 dark:text-red-400";
const BLACK = "text-black dark:text-white";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
const CLOSING_SOON_THRESHOLD = 30;

function toMinutes(day: number, hour: number, minute: number): number {
  return day * MINUTES_PER_DAY + hour * 60 + minute;
}

function formatClock(hour: number, minute: number): string {
  const meridiem = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return minute === 0 ? `${h12}${meridiem}` : `${h12}:${String(minute).padStart(2, "0")}${meridiem}`;
}

// Places represents "open 24 hours" as a single period with an open time and no close --
// too ambiguous to call confidently "open" in green, so it gets the same
// amber-icon/black-text treatment as having no opening_hours at all.
function isAlwaysOpen(periods: OpeningPeriod[]): boolean {
  return periods.some((p) => !p.close);
}

// Determines open/closed status from the current machine time. Each period is
// duplicated a week earlier/later (as minutes-since-Sunday-midnight) so periods that
// wrap past Saturday->Sunday, or that already ran earlier this week, still resolve to
// the correct *next* occurrence relative to `now`.
export function getOpenStatus(periods: OpeningPeriod[] | null, now: Date = new Date()): OpenStatus {
  if (!periods || periods.length === 0) {
    return { label: "Hours not set", iconClass: AMBER, textClass: BLACK };
  }
  if (isAlwaysOpen(periods)) {
    return { label: "Open · 24 hours", iconClass: AMBER, textClass: BLACK };
  }

  const nowMinutes = toMinutes(now.getDay(), now.getHours(), now.getMinutes());

  const spans = periods.flatMap((p) => {
    if (!p.close) return [];
    const start = toMinutes(p.open.day, p.open.hour, p.open.minute);
    let end = toMinutes(p.close.day, p.close.hour, p.close.minute);
    if (end <= start) end += MINUTES_PER_WEEK;
    return [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK].map((offset) => ({
      start: start + offset,
      end: end + offset,
      closeHour: p.close!.hour,
      closeMinute: p.close!.minute,
    }));
  });
  if (spans.length === 0) {
    return { label: "Hours not set", iconClass: AMBER, textClass: BLACK };
  }

  const current = spans.find((s) => nowMinutes >= s.start && nowMinutes < s.end);
  if (current) {
    const closeLabel = formatClock(current.closeHour, current.closeMinute);
    if (current.end - nowMinutes <= CLOSING_SOON_THRESHOLD) {
      return { label: `Closing soon · ${closeLabel}`, iconClass: AMBER, textClass: AMBER };
    }
    return { label: `Open · closes ${closeLabel}`, iconClass: GREEN, textClass: GREEN };
  }

  const upcoming = spans.filter((s) => s.start > nowMinutes).sort((a, b) => a.start - b.start)[0];
  if (!upcoming) {
    return { label: "Closed", iconClass: RED, textClass: RED };
  }

  const normalizedStart = ((upcoming.start % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
  const openDay = Math.floor(normalizedStart / MINUTES_PER_DAY);
  const minutesOfDay = normalizedStart % MINUTES_PER_DAY;
  const openLabel = formatClock(Math.floor(minutesOfDay / 60), minutesOfDay % 60);
  const opensToday = upcoming.start - nowMinutes < MINUTES_PER_DAY && openDay === now.getDay();

  return {
    label: opensToday ? `Closed · opens ${openLabel}` : `Closed · opens ${DAY_ABBR[openDay]} ${openLabel}`,
    iconClass: RED,
    textClass: RED,
  };
}
