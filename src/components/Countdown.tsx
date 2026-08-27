"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { describeGap } from "@/lib/countdown";

/**
 * A live count down to a moment.
 *
 * Renders nothing on the server and on the first client paint, because the
 * server's idea of "now" is a second or two stale and would flash a wrong
 * figure. When the moment arrives it reloads the page once, so whatever the
 * server decides at that instant, open or closed, appears on its own without
 * anybody refreshing.
 */
export function Countdown({
  target,
  prefix,
  className = "",
}: {
  target: string;
  prefix: string;
  className?: string;
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const at = new Date(target).getTime();
    if (Number.isNaN(at)) return;

    let fired = false;
    const tick = () => {
      const left = at - Date.now();
      setRemaining(left);
      if (left <= 0 && !fired) {
        fired = true;
        router.refresh();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target, router]);

  if (remaining === null) return null;
  if (remaining <= 0) return null;

  return (
    <p suppressHydrationWarning className={className}>
      {prefix} <strong>{describeGap(remaining)}</strong>
    </p>
  );
}
