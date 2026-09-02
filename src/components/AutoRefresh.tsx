"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a page current without anybody pressing anything.
 *
 * Asks the server for the page again every so often. The whole point of a
 * pinned link is that it is never out of date, and a village phone left open
 * on a table should show the same figure as one just opened.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
