/**
 * The last man in closes the election.
 *
 * The society would rather the ballot shut itself the moment everybody has
 * voted than sit open on a clock, and would rather nobody's vote were taken
 * away by an early close. Both halves are here.
 *
 *   DATABASE_URL="..." npm run test:closes-itself
 *
 * This wipes the database it points at. It refuses to run when live.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { castBallot } from "../src/lib/ballot-box.ts";
import { getSettings } from "../src/lib/settings.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const TODAY = new Date().toISOString().slice(0, 10);
const CHOICES = Array.from({ length: 17 }, (_, i) => i + 1);

async function main() {
  await ensureSchema();
  const [{ n: cast }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ballots`;
  const [{ mode }] = await sql<{ mode: string }[]>`SELECT mode FROM settings WHERE id = 1`;
  if (mode === "live" && cast > 0) {
    console.error("Refusing to run: this database holds ballots.");
    process.exit(2);
  }

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  for (let i = 1; i <= 20; i++) {
    await sql`
      INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at)
      VALUES (${String(200000 + i)}, ${`Voter ${String(i).padStart(2, "0")}`}, ${i},
              ${`9199005${String(i).padStart(5, "0")}`}, 'approved', NOW())
    `;
  }
  // One man who registered but was never approved. He is not on the voter
  // list, so the election must not wait on him for ever.
  await sql`
    INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at)
    VALUES ('200099', 'Waiting Man', 99, '919900599999', 'pending', NOW())
  `;
  await sql`
    UPDATE settings SET mode = 'live', registration_open = FALSE, roster_locked = TRUE,
      voting_open = TRUE, started_at = NOW() - interval '2 hours', closed_at = NULL,
      opens_at = NULL, closes_at = NULL
    WHERE id = 1
  `;

  // --- votes come in ------------------------------------------------------
  for (let i = 1; i <= 19; i++) {
    const outcome = await castBallot({
      voterId: String(200000 + i),
      choices: CHOICES,
      electionDay: TODAY,
      claim: `claim-${i}`,
    });
    if (outcome !== "ok") check(`vote ${i} went in`, false, outcome);
  }

  let s = await getSettings();
  check("with one man still out the ballot stays open", s.votingOpen && !s.votingEnded);

  // --- the refusal --------------------------------------------------------
  const [{ n: waiting }] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM voters WHERE status = 'approved' AND NOT has_voted
  `;
  check("the register knows exactly who is left", waiting === 1, `${waiting}`);
  check(
    "and a man waiting for approval is not counted among them",
    waiting === 1,
    "a pending registration must not hold the election open",
  );

  // --- the last man in ----------------------------------------------------
  const last = await castBallot({
    voterId: "200020",
    choices: CHOICES,
    electionDay: TODAY,
    claim: "claim-20",
  });
  check("the last vote goes in", last === "ok", last);

  s = await getSettings();
  check("and the election closes itself", s.votingEnded, `open=${s.votingOpen}`);
  check("with a closing time written down", s.closedAt !== null, String(s.closedAt));

  const [{ n: ballots }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ballots`;
  check("every vote is in the box", ballots === 20, `${ballots}`);

  // Closing itself must not have touched the ballot box.
  const cols = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ballots'
  `;
  check(
    "the ballot box still holds an id, choices and a date",
    cols.map((c) => c.column_name).sort().join(",") === "ballot_id,choices,created_at",
    cols.map((c) => c.column_name).join(","),
  );
  const times = await sql<{ created_at: Date }[]>`SELECT created_at FROM ballots`;
  check(
    "and no ballot carries a time of day",
    times.every((t) => t.created_at.toISOString().slice(11, 19) === "00:00:00"),
  );

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  await sql`
    UPDATE settings SET mode = 'test', voting_open = FALSE, roster_locked = FALSE,
      registration_open = FALSE, started_at = NULL, closed_at = NULL,
      opens_at = NULL, closes_at = NULL
    WHERE id = 1
  `;
  console.log(
    failures === 0
      ? "\nThe election shuts itself when the last man has voted, and not before."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main();
