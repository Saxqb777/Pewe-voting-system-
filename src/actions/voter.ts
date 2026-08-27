"use server";

import { sql, ensureSchema } from "@/lib/db";
import { castBallot } from "@/lib/ballot-box";
import { getSettings } from "@/lib/settings";
import { getClientIp } from "@/lib/request-info";
import { normaliseVoterId } from "@/lib/voter-id";
import { readVoterSession, writeVoterSession } from "@/lib/session";
import {
  isSessionLocked,
  ipFailureCount,
  lockSession,
  recordFailure,
} from "@/lib/rate-limit";
import { config, MAX_SESSION_ATTEMPTS, MAX_IP_ATTEMPTS } from "@/lib/config";

export type VerifyResult =
  | { status: "ok" }
  | { status: "rejected" }
  | { status: "locked" }
  | { status: "closed" }
  | { status: "not_ready" };

/**
 * Step one of voting. Checks a Voter ID.
 *
 * Every failure returns the same "rejected" status so that this screen cannot
 * be used to discover which IDs exist or which people have already voted.
 */
export async function verifyVoterId(
  rawId: string,
  fingerprint: string,
): Promise<VerifyResult> {
  await ensureSchema();

  const session = await readVoterSession();
  await writeVoterSession(session);

  if (await isSessionLocked(session.sid)) return { status: "locked" };

  const settings = await getSettings();
  if (!settings.votingOpen) return { status: "closed" };

  const ip = await getClientIp();

  // Network wide brake, so that clearing cookies does not reset the limit.
  if (ip && (await ipFailureCount(ip)) >= MAX_IP_ATTEMPTS) {
    await lockSession(session.sid, ip);
    return { status: "locked" };
  }

  const voterId = normaliseVoterId(rawId ?? "");
  if (voterId.length === 0) return fail(session.sid, ip, "empty");

  const [{ count: rosterSize }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM voters
  `;
  if (rosterSize === 0) return { status: "not_ready" };

  const rows = await sql<
    { voter_id: string; has_voted: boolean; is_locked: boolean }[]
  >`
    SELECT voter_id, has_voted, is_locked FROM voters WHERE voter_id = ${voterId}
  `;
  const voter = rows[0];

  if (!voter) return fail(session.sid, ip, "unknown_id");
  if (voter.is_locked) return fail(session.sid, ip, "voter_locked");

  if (voter.has_voted) {
    // A real ID offered a second time is worth flagging to the admin, so the
    // count is kept on the voter row as well as in the attempt log.
    await sql`
      UPDATE voters SET failed_attempts = failed_attempts + 1
      WHERE voter_id = ${voterId}
    `;
    return fail(session.sid, ip, "already_voted");
  }

  // Success. Remember who this browser session is.
  session.voterId = voter.voter_id;
  session.voted = false;
  await writeVoterSession(session);

  // Fingerprint and IP belong to the register, never to the ballot box.
  await sql`
    UPDATE voters
    SET device_fingerprint = ${fingerprint ? fingerprint.slice(0, 128) : null},
        ip_address = ${ip}
    WHERE voter_id = ${voter.voter_id}
  `;

  return { status: "ok" };
}

async function fail(
  sessionId: string,
  ip: string | null,
  outcome: string,
): Promise<VerifyResult> {
  const failures = await recordFailure(sessionId, ip, outcome);
  if (failures >= MAX_SESSION_ATTEMPTS) {
    await lockSession(sessionId, ip);
    return { status: "locked" };
  }
  return { status: "rejected" };
}

export type SubmitResult =
  | { status: "ok" }
  | { status: "invalid" }
  | { status: "already_voted" }
  | { status: "closed" }
  | { status: "session_expired" };

/**
 * Step two of voting. Writes the register and the ballot box in one
 * transaction that shares no reference between them.
 *
 * Idempotent: a double tap, a refresh or a retry on a bad connection can never
 * produce a second ballot, because the register row is locked and checked
 * inside the same transaction that inserts the ballot.
 */
export async function submitBallot(choices: number[]): Promise<SubmitResult> {
  await ensureSchema();

  const session = await readVoterSession();
  const required = config.selectionsRequired;

  // A retry arriving after the vote already went through.
  if (session.voted && !session.voterId) return { status: "ok" };
  if (!session.voterId) return { status: "session_expired" };

  const settings = await getSettings();
  if (!settings.votingOpen) return { status: "closed" };

  // Server side validation. The browser is never trusted about any of this.
  if (!Array.isArray(choices)) return { status: "invalid" };
  const cleaned = choices
    .map((n) => (typeof n === "number" ? Math.trunc(n) : Number.NaN))
    .filter((n) => Number.isFinite(n));
  const unique = Array.from(new Set(cleaned));
  if (unique.length !== required) return { status: "invalid" };

  const [{ count: validCount }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM voters
    WHERE candidate_number = ANY(${unique}::int[])
  `;
  if (validCount !== required) return { status: "invalid" };

  const ordered = [...unique].sort((a, b) => a - b);
  const outcome = await castBallot({
    voterId: session.voterId,
    choices: ordered,
    electionDay: settings.electionDay,
    claim: session.sid,
  });

  if (outcome === "ok") {
    delete session.voterId;
    session.voted = true;
    await writeVoterSession(session);
    return { status: "ok" };
  }
  if (outcome === "already_voted") {
    delete session.voterId;
    await writeVoterSession(session);
    return { status: "already_voted" };
  }
  return { status: "invalid" };
}
