/**
 * Plain words for a gap in time. Seconds only appear under an hour, where
 * they matter, and never above it, where a ticking seconds figure is just
 * noise on a page somebody is watching for hours.
 */
export function describeGap(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const part = (value: number, word: string) =>
    `${value} ${word}${value === 1 ? "" : "s"}`;

  if (days > 0) return `${part(days, "day")} ${part(hours, "hour")}`;
  if (hours > 0) return `${part(hours, "hour")} ${part(minutes, "minute")}`;
  if (minutes > 0) return `${part(minutes, "minute")} ${part(seconds, "second")}`;
  return part(seconds, "second");
}

/** A moment written out in the reader's own zone. */
export function describeMoment(iso: string | null): string {
  if (!iso) return "";
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  return when.toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}
