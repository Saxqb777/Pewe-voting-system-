"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { describeGap } from "@/lib/countdown";
import { strings } from "@/lib/strings";

const HOUR = 60 * 60 * 1000;

/**
 * A quiet line above the ballot with the time left.
 *
 * Deliberately small: somebody choosing names does not need a clock shouting
 * at them, only a way to check. It turns urgent under an hour, and if the
 * deadline passes while they are still choosing the page reloads so they are
 * told plainly rather than losing a submission at the last moment.
 */
export function BallotCountdown({ closesAt }: { closesAt: string | null }) {
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
    <p
      suppressHydrationWarning
      className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${
        urgent ? "bg-warn-soft text-warn" : "bg-paper text-ink-soft"
      }`}
    >
      {strings.entry.ballotClosesIn}{" "}
      <strong className="tabular-nums">{describeGap(left)}</strong>
    </p>
  );
}
