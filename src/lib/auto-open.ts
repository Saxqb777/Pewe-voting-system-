import "server-only";
import { sql, ensureSchema, audit } from "./db";
import { config } from "./config";

/**
 * Fixes the voter list and opens the ballot when the hour arrives.
 *
 * The admin should not have to be awake and holding a phone at eight in the
 * morning for the village to be able to vote. The opening time is known in
 * advance, so when it passes the roster is confirmed exactly as pressing the
 * button would have done it, and voting opens.
 *
 * Pressing the button early still works and is still worth doing: it settles
 * the list while somebody is watching. This is the safety net for the
 * morning nobody presses anything.
 *
 * Called at the top of the pages a voter or the admin can reach, so the
 * first person through the door on the day sets it running. No scheduler is
 * involved, because there is nothing to run on between requests.
 */
export async function openWhenDue(): Promise<void> {
  await ensureSchema();

  const [row] = await sql<
    {
      roster_locked: boolean;
      opens_at: Date | null;
      closes_at: Date | null;
      mode: string;
    }[]
  >`SELECT roster_locked, opens_at, closes_at, mode FROM settings WHERE id = 1`;
  if (!row || row.roster_locked === true) return;

  const opens = row.opens_at ?? config.electionOpensAt;
  if (Date.now() < opens.getTime()) return;

  // Never over an election that has already been voted in.
  const [{ n: ballots }] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM ballots
  `;
  if (ballots > 0) return;

  // A ballot asks for more names than a tiny register holds. Opening one
  // nobody could complete would be worse than opening late, so it waits and
  // the admin is left to sort it out by hand.
  const [{ n: approved }] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM voters WHERE status = 'approved'
  `;
  if (approved <= config.selectionsRequired) return;

  const closes = row.closes_at ?? config.electionClosesAt;

  // Two people opening the site in the same second must not both confirm.
  // The lock is taken by the same statement that reads it, so exactly one
  // request finds the roster unlocked and does the work.
  const won = await sql.begin(async (tx) => {
    const claimed = await tx<{ id: number }[]>`
      UPDATE settings SET roster_locked = TRUE
      WHERE id = 1 AND roster_locked = FALSE
      RETURNING id
    `;
    if (claimed.length === 0) return false;

    await tx`DELETE FROM voters WHERE status <> 'approved'`;
    // Numbered in name order, in two passes, because the seat number is
    // unique and Postgres checks that row by row.
    await tx`UPDATE voters SET candidate_number = -candidate_number`;
    await tx`
      UPDATE voters AS v SET candidate_number = ordered.seat
      FROM (
        SELECT voter_id, ROW_NUMBER() OVER (ORDER BY LOWER(name), voter_id) AS seat
        FROM voters
      ) AS ordered
      WHERE v.voter_id = ordered.voter_id
    `;
    await tx`
      UPDATE settings SET
        registration_open = FALSE, voting_open = TRUE,
        started_at = NULL, closed_at = NULL,
        opens_at = ${opens}, closes_at = ${closes}
      WHERE id = 1
    `;
    return true;
  });

  if (won) {
    await audit(
      "auto_confirm_roster",
      `The opening hour arrived. ${approved} voters confirmed and voting opened.`,
    );
  }
}
