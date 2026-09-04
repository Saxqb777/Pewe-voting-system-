"use client";

import { Countdown } from "./Countdown";
import { describeMoment } from "@/lib/countdown";
import { strings } from "@/lib/strings";

/**
 * The clock the village watches while the ballot is open.
 *
 * Loud on purpose, unlike the quiet line above the ballot itself: this one
 * sits on the page the group has pinned, where its whole job is to say how
 * long is left to get everybody in.
 */
export function ClosesAtNotice({ closesAt }: { closesAt: string }) {
  const s = strings.status;
  return (
    <div className="mt-6 rounded-2xl border-2 border-warn bg-warn-soft px-4 py-4 text-center text-warn">
      <p className="text-sm font-semibold uppercase tracking-wide">{s.closesIn}</p>
      <Countdown
        target={closesAt}
        prefix=""
        className="mt-1 block text-4xl font-bold tabular-nums"
      />
      <p className="mt-2 text-base font-semibold">{describeMoment(closesAt)}</p>
      <p className="mt-1 text-sm">
        {s.closesNote}
        <span className="block font-normal">{s.closesNoteHi}</span>
      </p>
    </div>
  );
}
