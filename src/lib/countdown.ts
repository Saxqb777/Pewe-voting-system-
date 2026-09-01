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

/**
 * The same gap for a Hinglish reader. Written the way it is said out loud,
 * so "2 days 9 hours" becomes "2 din 9 ghante".
 */
export function describeGapHi(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (days > 0) return `${days} din ${hours} ghante`;
  if (hours > 0) return `${hours} ghante ${minutes} minute`;
  if (minutes > 0) return `${minutes} minute ${seconds} second`;
  return `${seconds} second`;
}

/**
 * A moment written out in India time, because that is the hour the society
 * announced and the one every voter has been told.
 *
 * Half this village works in the Gulf, where the reader's own zone would show
 * a different hour than the message in the group, and a man reading a closing
 * time two and a half hours later than it really is misses the vote. The
 * countdown above it is the figure that needs no arithmetic at all.
 */
export function describeMoment(iso: string | null): string {
  if (!iso) return "";
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  const text = when.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${text} India time`;
}
