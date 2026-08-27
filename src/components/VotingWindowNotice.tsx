"use client";

import { strings } from "@/lib/strings";

/**
 * Shows the closing time to a voter in their own time zone.
 *
 * Rendered on the client because only the browser knows where the reader is.
 * Until it does, nothing is shown rather than a time in the wrong zone.
 */
export function VotingWindowNotice({ closesAt }: { closesAt: string | null }) {
  if (!closesAt) return null;

  const when = new Date(closesAt);
  if (Number.isNaN(when.getTime())) return null;

  return (
    <p
      suppressHydrationWarning
      className="mb-5 rounded-xl bg-brand-soft px-4 py-3 text-center text-base font-medium text-brand-dark"
    >
      {strings.entry.closesAt(
        when.toLocaleString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "numeric",
          minute: "2-digit",
        }),
      )}
    </p>
  );
}
