/**
 * Voting with no closing time.
 *
 * The society would rather watch the room than the clock, so the deadline
 * comes off and the ballot runs until somebody closes it. The trap here is
 * that the opening time is what holds a running ballot open, so removing a
 * schedule carelessly shuts the vote in the same breath. That must not
 * happen, and it is what this file is for.
 *
 *   DATABASE_URL="..." npm run test:open-ended
 *
 * This wipes the database it points at. It refuses to run when live.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { getSettings } from "../src/lib/settings.ts";
import { getPublicStatus } from "../src/lib/admin-data.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

/** The same statement the admin action runs, without the sign in around it. */
async function removeClosingTime() {
  await sql`
    UPDATE settings SET
      started_at = COALESCE(started_at, opens_at, NOW()),
      closes_at = NULL
    WHERE id = 1
  `;
}

async function clearVotingWindow() {
  await sql`
    UPDATE settings SET
      started_at = COALESCE(started_at, opens_at),
      opens_at = NULL,
      closes_at = NULL
    WHERE id = 1
  `;
}

async function main() {
  await ensureSchema();
  const [{ n: cast }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ballots`;
  const [{ mode }] = await sql<{ mode: string }[]>`SELECT mode FROM settings WHERE id = 1`;
  if (mode === "live" && cast > 0) {
    console.error("Refusing to run: this database holds ballots.");
    process.exit(2);
  }

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  for (let i = 1; i <= 40; i++) {
    await sql`
      INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at, has_voted)
      VALUES (${String(300000 + i)}, ${`Voter ${String(i).padStart(2, "0")}`}, ${i},
              ${`9199004${String(i).padStart(5, "0")}`}, 'approved', NOW(), ${i <= 12})
    `;
  }
  // A ballot that opened two hours ago and is scheduled to close in three.
  await sql`
    UPDATE settings SET mode = 'live', registration_open = FALSE, roster_locked = TRUE,
      voting_open = TRUE, started_at = NULL, closed_at = NULL,
      opens_at = NOW() - interval '2 hours', closes_at = NOW() + interval '3 hours'
    WHERE id = 1
  `;

  let s = await getSettings();
  check("the ballot is open on a schedule", s.votingOpen && s.closesAt !== null);

  // --- taking the clock off -----------------------------------------------
  await removeClosingTime();
  s = await getSettings();
  check("the ballot is still open after the closing time is removed", s.votingOpen);
  check("and it has no closing time", s.closesAt === null, String(s.closesAt));
  check("and it has not ended", !s.votingEnded);

  let status = await getPublicStatus();
  check("the page knows there is no clock", status.closesAt === null, String(status.closesAt));
  check("the board says so too", status.chase?.openEnded === true);
  check(
    "and offers no required rate to keep up with",
    status.chase?.requiredRate === 0,
    String(status.chase?.requiredRate),
  );
  check(
    "the rate people are voting at is still real",
    (status.chase?.currentRate ?? 0) > 0,
    String(status.chase?.currentRate),
  );
  check(
    "and it still says how many are left",
    status.chase?.needed === 28,
    String(status.chase?.needed),
  );
  check("the sentence that needs a deadline is dropped", status.pace === "", status.pace);

  // --- the trap: clearing the whole schedule mid vote ---------------------
  await clearVotingWindow();
  s = await getSettings();
  check("clearing the whole schedule does not shut a running ballot", s.votingOpen);
  check("nor does it end the election", !s.votingEnded);

  // --- closing is now a thing a person does -------------------------------
  await sql`UPDATE settings SET closed_at = NOW() WHERE id = 1`;
  s = await getSettings();
  check("closing by hand still ends it", s.votingEnded && !s.votingOpen);

  status = await getPublicStatus();
  check("and the board comes off the page", status.chase === null);

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  await sql`
    UPDATE settings SET mode = 'test', registration_open = FALSE, roster_locked = FALSE,
      voting_open = FALSE, started_at = NULL, closed_at = NULL,
      opens_at = NULL, closes_at = NULL
    WHERE id = 1
  `;
  console.log(
    failures === 0
      ? "\nThe clock can come off without the vote coming down with it."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main();
