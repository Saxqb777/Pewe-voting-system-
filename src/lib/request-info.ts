import "server-only";
import { headers } from "next/headers";

/**
 * Best effort client IP. Used for admin flagging and for rate limiting only.
 * It is never written to the ballots table.
 */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim().slice(0, 64);
  return null;
}
