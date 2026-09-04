import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

/**
 * The key on the chasing page.
 *
 * The list of who has not voted is nobody's business but the people doing
 * the ringing, so the page needs a lock. It is worked out from the signing
 * secret rather than kept in a column, which means no change to the database
 * in the middle of a live vote, and it is a one way step: holding the key
 * says nothing about the secret and gets nobody an admin session.
 *
 * Rotating it means changing SESSION_SECRET, which also signs everybody out.
 * That is the honest trade for not touching the schema while people vote.
 */
export function chaseKey(): string {
  return createHmac("sha256", config.sessionSecret)
    .update("pewe-2026-chase-list")
    .digest("hex")
    .slice(0, 24);
}

/** True when a visitor holds the key. Compared without leaking its length. */
export function isChaseKey(given: string | undefined): boolean {
  if (!given) return false;
  const real = Buffer.from(chaseKey());
  const shown = Buffer.from(given);
  if (real.length !== shown.length) return false;
  return timingSafeEqual(real, shown);
}

/** The whole address, ready to be sent to whoever is making the calls. */
export function chaseUrl(): string {
  return `${config.siteUrl}/chase/${chaseKey()}`;
}
