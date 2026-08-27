"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { describeGap, describeMoment } from "@/lib/countdown";
import { strings } from "@/lib/strings";

const HOUR = 60 * 60 * 1000;

/**
 * The time left to vote, counting down.
 *
 * Nothing is drawn until the browser has ticked once, because the server's
 * idea of "now" is already stale by the time the page arrives and would show
 * a figure a second or two wrong. When the deadline passes the page reloads
 * itself, so a voter sitting on the screen sees it close rather than
 * discovering it when they press submit.
 */
export function VotingWindowNotice({ closesAt }: { closesAt: string | null }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!closesAt) return;
    const at = new Date(closesAt).getTime();
    if (Number.isNaN(at)) return;

    let reloaded = false;
    const tick = () => {
      const remaining = at - Date.now();
      setLeft(remaining);
      if (remaining <= 0 && !reloaded) {
        reloaded = true;
        router.refresh();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [closesAt, router]);

  if (!closesAt || left === null || left <= 0) return null;

  const urgent = left < HOUR;

  return (
    <div
      suppressHydrationWarning
      className={`mb-5 rounded-xl px-4 py-3 text-center ${
        urgent ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-dark"
      }`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide">
        {strings.entry.closesIn}
      </p>
      <p className="text-2xl font-bold tabular-nums">{describeGap(left)}</p>
      <p className="mt-1 text-sm">{describeMoment(closesAt)}</p>
      {urgent ? (
        <p className="mt-2 text-sm font-semibold">
          {strings.entry.closingSoon}
        </p>
      ) : null}
    </div>
  );
}
