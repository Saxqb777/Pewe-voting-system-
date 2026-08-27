import "server-only";
import { sql } from "./db";

export type CastOutcome = "ok" | "already_voted" | "invalid";

/**
 * The only place in this codebase that writes a ballot.
 *
 * Both writes happen in one transaction, and they share no reference:
 *   the register row is found by voter_id
 *   the ballot row gets a fresh random UUID
 * Nothing is carried from one to the other.
 */
export async function castBallot(params: {
  voterId: string;
  choices: number[];
  electionDay: string;
  claim: string;
}): Promise<CastOutcome> {
  const { voterId, choices, electionDay, claim } = params;

  return sql.begin(async (tx) => {
    // Serialise ballot writes so the reshuffle below stays consistent.
    await tx`SELECT pg_advisory_xact_lock(918273645)`;

    const locked = await tx<{ has_voted: boolean; vote_claim: string | null }[]>`
      SELECT has_voted, vote_claim FROM voters
      WHERE voter_id = ${voterId}
      FOR UPDATE
    `;
    const voter = locked[0];
    if (!voter) return "invalid" as const;

    if (voter.has_voted) {
      // Same browser session as the ballot already in the box. This is the
      // double tap case: report success and add nothing.
      if (voter.vote_claim && voter.vote_claim === claim) return "ok" as const;
      return "already_voted" as const;
    }

    // Write one: the register. The time is rounded down to the hour.
    await tx`
      UPDATE voters
      SET has_voted = TRUE,
          voted_at = date_trunc('hour', NOW()),
          vote_claim = ${claim},
          failed_attempts = 0
      WHERE voter_id = ${voterId}
    `;

    // Write two: the ballot box. A random UUID, the choices, and a date with
    // no time of day. Nothing here points back to the row written above.
    await tx`
      INSERT INTO ballots (ballot_id, choices, created_at)
      VALUES (gen_random_uuid(), ${choices}::int[], ${electionDay}::date)
    `;

    // Rewrite the whole ballot box in a fresh random physical order, so that
    // reading the raw table in storage order says nothing about the order the
    // votes arrived in. A few hundred rows at most, so this stays cheap.
    await tx`
      CREATE TEMP TABLE ballot_shuffle ON COMMIT DROP AS
      SELECT ballot_id, choices, created_at FROM ballots ORDER BY random()
    `;
    await tx`DELETE FROM ballots`;
    await tx`
      INSERT INTO ballots (ballot_id, choices, created_at)
      SELECT ballot_id, choices, created_at FROM ballot_shuffle
    `;

    return "ok" as const;
  });
}
