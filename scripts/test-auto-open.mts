/**
 * Nobody should have to be awake at eight in the morning for the village to
 * vote. When the opening hour passes, the roster is fixed and the ballot
 * opens by itself, exactly as pressing the button would have done it.
 *
 *   DATABASE_URL="..." npm run test:auto-open
 *
 * This wipes the database it points at. It refuses to run when live.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { openWhenDue } from "../src/lib/auto-open.ts";
import { getSettings } from "../src/lib/settings.ts";
import { config } from "../src/lib/config.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const HOUR = 3600e3;

async function people(n: number, from = 1) {
  for (let i = 0; i < n; i++) {
    const id = String(700000 + from + i);
    await sql`
      INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at)
      VALUES (${id}, ${`Voter ${String(from + i).padStart(3, "0")}`}, ${from + i},
              ${`9199000${String(from + i).padStart(5, "0")}`}, 'approved', NOW())
    `;
  }
}

async function reset(opensAt: Date | null) {
  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  await sql`
    UPDATE settings SET mode = 'live', registration_open = TRUE, roster_locked = FALSE,
      voting_open = FALSE, started_at = NULL, closed_at = NULL,
      opens_at = ${opensAt}, closes_at = NOW() + interval '6 hours'
    WHERE id = 1
  `;
}

async function main() {
  await ensureSchema();
  const [{ mode }] = await sql<{ mode: string }[]>`SELECT mode FROM settings WHERE id = 1`;
  if (mode === "live" && process.env.ALLOW_LIVE !== "yes") {
    // The reset below puts it back to live itself; this only guards a real one.
    const [{ n }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ballots`;
    if (n > 0) {
      console.error("Refusing to run: this database holds ballots.");
      process.exit(2);
    }
  }

  const seats = config.selectionsRequired;

  // --- before the hour ----------------------------------------------------
  await reset(new Date(Date.now() + HOUR));
  await people(seats + 5);
  await openWhenDue();
  let s = await getSettings();
  check("before the hour nothing opens", !s.votingOpen && !s.rosterLocked);
  check("and registration is still open", s.registrationOpen);

  // --- the hour passes ----------------------------------------------------
  await reset(new Date(Date.now() - 60e3));
  await people(seats + 5);
  await sql`
    INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at)
    VALUES ('700999', 'Still Waiting', 999, '919900099999', 'pending', NOW())
  `;
  await openWhenDue();
  s = await getSettings();
  check("the hour passes and voting is open", s.votingOpen, `open=${s.votingOpen}`);
  check("the roster is fixed", s.rosterLocked);
  check("registration has closed", !s.registrationOpen);
  // Its own closing time, not the one in the config, which is a real date
  // that eventually passes and would fail this file every day after it.
  check("a closing time is set", s.closesAt !== null, String(s.closesAt));

  const [{ n: waiting }] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM voters WHERE status <> 'approved'
  `;
  check("nobody is left waiting for approval on the roster", waiting === 0, `${waiting}`);

  const seatsTaken = await sql<{ candidate_number: number; name: string }[]>`
    SELECT candidate_number, name FROM voters ORDER BY candidate_number
  `;
  check(
    "the ballot is numbered from one with no gaps",
    seatsTaken.every((r, i) => r.candidate_number === i + 1),
    seatsTaken.slice(0, 3).map((r) => `${r.candidate_number}:${r.name}`).join(" "),
  );
  check(
    "and numbered in name order",
    seatsTaken.every(
      (r, i) => i === 0 || seatsTaken[i - 1].name.toLowerCase() <= r.name.toLowerCase(),
    ),
  );

  // --- everybody arriving at once ----------------------------------------
  await reset(new Date(Date.now() - 60e3));
  await people(seats + 5);
  await Promise.all(Array.from({ length: 8 }, () => openWhenDue()));
  const seatCounts = await sql<{ candidate_number: number; n: number }[]>`
    SELECT candidate_number, COUNT(*)::int AS n FROM voters
    GROUP BY candidate_number HAVING COUNT(*) > 1
  `;
  check("eight people arriving at once take one seat each", seatCounts.length === 0);
  const [{ n: opened }] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM audit_log WHERE action = 'auto_confirm_roster'
  `;
  check("and it is only confirmed once", opened === 1, `${opened}`);

  // --- refuses when it would open a ballot nobody could finish ------------
  await reset(new Date(Date.now() - 60e3));
  await people(seats - 1);
  await openWhenDue();
  s = await getSettings();
  // votingOpen follows the clock on its own, which is how a scheduled start
  // has always worked. What must not happen is the roster being fixed and
  // registration slammed shut on a register too small to fill a ballot.
  check("too few people on the register and the roster is not fixed", !s.rosterLocked);
  check("and registration stays open so more can come in", s.registrationOpen);

  // --- never reopens an election already voted in ------------------------
  await reset(new Date(Date.now() - 60e3));
  await people(seats + 5);
  await sql`INSERT INTO ballots (ballot_id, choices, created_at)
    VALUES (gen_random_uuid(), ARRAY[1, 2, 3], CURRENT_DATE)`;
  await openWhenDue();
  s = await getSettings();
  check("an election with ballots in the box is left alone", !s.rosterLocked);
  await sql`TRUNCATE ballots`;

  // Put the database back the way the other suites expect to find it.
  await sql`
    UPDATE settings SET mode = 'test', registration_open = FALSE, roster_locked = FALSE,
      voting_open = FALSE, started_at = NULL, closed_at = NULL,
      opens_at = NULL, closes_at = NULL
    WHERE id = 1
  `;
  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;

  console.log(
    failures === 0
      ? "\nThe hour opens the ballot on its own, once, and only when it is safe to."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main();
