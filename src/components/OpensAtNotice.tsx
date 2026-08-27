"use client";

import { strings } from "@/lib/strings";

/** Tells a voter when to come back, in their own time zone. */
export function OpensAtNotice({ opensAt }: { opensAt: string }) {
  const when = new Date(opensAt);
  return (
    <p
      suppressHydrationWarning
      className="mt-4 text-lg text-ink"
    >
      {strings.entry.opensAt(
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
