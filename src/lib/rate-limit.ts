import "server-only";
import { sql } from "./db";
import { MAX_SESSION_ATTEMPTS, IP_ATTEMPT_WINDOW_MINUTES } from "./config";

/**
 * Rate limiting for the Voter ID screen.
 *
 * The counters live in the database rather than in the cookie so that the
 * admin can see a lock and clear it. None of these rows touch the ballots
 * table, and none of them record a successful entry, so this data cannot be
 * used to work out when any particular person voted.
 */

/** True when this browser session is currently locked out. */
export async function isSessionLocked(sessionId: string): Promise<boolean> {
  const rows = await sql<{ locked: boolean }[]>`
    SELECT TRUE AS locked FROM session_locks
    WHERE session_id = ${sessionId} AND cleared_at IS NULL
  `;
  return rows.length > 0;
}

/** Failed attempts by this session since the last time it was unlocked. */
export async function sessionFailureCount(sessionId: string): Promise<number> {
  const [row] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM id_attempts
    WHERE session_id = ${sessionId}
      AND created_at > COALESCE(
        (SELECT cleared_at FROM session_locks WHERE session_id = ${sessionId}),
        TIMESTAMPTZ '-infinity'
      )
  `;
  return row?.count ?? 0;
}

/** Failed attempts from this IP inside the rolling window. */
export async function ipFailureCount(ip: string | null): Promise<number> {
  if (!ip) return 0;
  const [row] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM id_attempts
    WHERE ip_address = ${ip}
      AND created_at > NOW() - make_interval(mins => ${IP_ATTEMPT_WINDOW_MINUTES})
  `;
  return row?.count ?? 0;
}

export async function lockSession(
  sessionId: string,
  ip: string | null,
): Promise<void> {
  await sql`
    INSERT INTO session_locks (session_id, ip_address, locked_at, cleared_at)
    VALUES (${sessionId}, ${ip}, NOW(), NULL)
    ON CONFLICT (session_id)
    DO UPDATE SET locked_at = NOW(), cleared_at = NULL, ip_address = ${ip}
  `;
}

export async function recordFailure(
  sessionId: string,
  ip: string | null,
  outcome: string,
): Promise<number> {
  await sql`
    INSERT INTO id_attempts (session_id, ip_address, outcome)
    VALUES (${sessionId}, ${ip}, ${outcome})
  `;
  return sessionFailureCount(sessionId);
}

export { MAX_SESSION_ATTEMPTS };
