"use client";

import { Countdown } from "./Countdown";
import { describeMoment } from "@/lib/countdown";
import { strings } from "@/lib/strings";

/** Tells a voter how long until they can vote, and when that is. */
export function OpensAtNotice({ opensAt }: { opensAt: string }) {
  return (
    <div className="mt-6 rounded-xl bg-warn-soft px-4 py-4 text-warn">
      <p className="text-sm font-semibold uppercase tracking-wide">
        {strings.entry.opensIn}
      </p>
      <Countdown
        target={opensAt}
        prefix=""
        className="text-3xl font-bold tabular-nums"
      />
      <p className="mt-2 text-base">{describeMoment(opensAt)}</p>
    </div>
  );
}
