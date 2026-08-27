/**
 * Proves the write path itself, against a real database.
 *
 *   DATABASE_URL="..." npm run test:ballot-box
 *
 * This wipes and rewrites the database it points at, so run it against a test
 * database only. It refuses to run when the election is live.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { castBallot } from "../src/lib/ballot-box.ts";
import { dummyVoters } from "../src/lib/dummy-voters.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const BALLOTS = 100;
const TODAY = new Date().toISOString().slice(0, 10);

async function main() {
  await ensureSchema();

  const [{ mode }] = await sql<{ mode: string }[]>`
    SELECT mode FROM settings WHERE id = 1
  `;
  if (mode === "live") {
    console.error("Refusing to run: this database is in live mode.");
    process.exit(2);
  }

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log`;
  const people = dummyVoters(130);
  for (let i = 0; i < people.length; i++) {
    await sql`
      INSERT INTO voters (voter_id, name, candidate_number)
      VALUES (${people[i].voterId}, ${people[i].name}, ${i + 1})
    `;
  }

  // Each ballot carries a marker candidate unique to the order it was cast,
  // so the order votes arrived in is recoverable from the contents. Nothing
  // in the real app does this. It exists only so this test can look for a
  // leak that a real observer would not otherwise be able to measure.
  const castOrder: number[] = [];
  for (let i = 0; i < BALLOTS; i++) {
    const marker = 16 + i;
    const choices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, marker];
    const outcome = await castBallot({
      voterId: people[i].voterId,
      choices,
      electionDay: TODAY,
      claim: `session-${i}`,
    });
    if (outcome !== "ok") {
      check(`ballot ${i} accepted`, false, outcome);
      break;
    }
    castOrder.push(marker);
  }
  check(`${BALLOTS} ballots accepted`, castOrder.length === BALLOTS);

  const [{ count }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM ballots
  `;
  check("one ballot per vote", count === BALLOTS, `${count}`);

  // -------------------------------------------------------------- ordering
  // Read the ballot box the way somebody with direct database access would:
  // in raw physical order, with no ORDER BY at all.
  const physical = await sql<{ choices: number[] }[]>`
    SELECT choices FROM ballots ORDER BY ctid
  `;
  const physicalOrder = physical.map((r) => r.choices[r.choices.length - 1]);

  const identical = physicalOrder.every((m, i) => m === castOrder[i]);
  check("physical order is not the order votes were cast", !identical);

  const reversed = physicalOrder.every(
    (m, i) => m === castOrder[castOrder.length - 1 - i],
  );
  check("physical order is not simply reversed", !reversed);

  const inPlace = physicalOrder.filter((m, i) => m === castOrder[i]).length;
  // For a genuine shuffle the expected number of markers still sitting in
  // their original position is 1, whatever the size of the box.
  check(
    "almost nothing stays in its original position",
    inPlace <= 5,
    `${inPlace} of ${BALLOTS} in place`,
  );

  // Rank correlation between arrival order and physical order. A shuffle
  // gives something near zero. Insertion order would give exactly 1.
  const rho = spearman(castOrder, physicalOrder);
  check(
    "arrival order and storage order are uncorrelated",
    Math.abs(rho) < 0.4,
    `rho ${rho.toFixed(3)}`,
  );

  // The primary key must not recover the order either.
  const byId = await sql<{ choices: number[] }[]>`
    SELECT choices FROM ballots ORDER BY ballot_id
  `;
  const idOrder = byId.map((r) => r.choices[r.choices.length - 1]);
  const rhoId = spearman(castOrder, idOrder);
  check(
    "sorting by ballot id does not recover arrival order",
    Math.abs(rhoId) < 0.4,
    `rho ${rhoId.toFixed(3)}`,
  );

  // -------------------------------------------------------------- timestamps
  const [{ distinctDays, withTime }] = await sql<
    { distinctDays: number; withTime: number }[]
  >`
    SELECT COUNT(DISTINCT created_at)::int AS "distinctDays",
           0::int AS "withTime"
    FROM ballots
  `;
  check("every ballot shares one date", distinctDays === 1, `${distinctDays}`);
  check("no ballot carries a time of day", withTime === 0);

  const [{ offHour }] = await sql<{ offHour: number }[]>`
    SELECT COUNT(*)::int AS "offHour" FROM voters
    WHERE has_voted AND voted_at <> date_trunc('hour', voted_at)
  `;
  check("register timestamps are rounded to the hour", offHour === 0);

  // -------------------------------------------------------------- idempotency
  const before = (
    await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM ballots`
  )[0].count;

  const again = await castBallot({
    voterId: people[0].voterId,
    choices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    electionDay: TODAY,
    claim: "session-0",
  });
  const afterSame = (
    await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM ballots`
  )[0].count;
  check("a repeat submit from the same phone reports success", again === "ok");
  check("a repeat submit adds no second ballot", afterSame === before);

  const other = await castBallot({
    voterId: people[0].voterId,
    choices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 117],
    electionDay: TODAY,
    claim: "someone-else",
  });
  const afterOther = (
    await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM ballots`
  )[0].count;
  check("a different phone using a spent ID is refused", other === "already_voted");
  check("a refused submit adds no ballot", afterOther === before);

  // Two taps landing at the same instant.
  const [a, b] = await Promise.all([
    castBallot({
      voterId: people[125].voterId,
      choices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 118],
      electionDay: TODAY,
      claim: "double-tap",
    }),
    castBallot({
      voterId: people[125].voterId,
      choices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 118],
      electionDay: TODAY,
      claim: "double-tap",
    }),
  ]);
  const afterDouble = (
    await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM ballots`
  )[0].count;
  check("both halves of a double tap report success", a === "ok" && b === "ok");
  check(
    "a double tap creates exactly one ballot",
    afterDouble === before + 1,
    `${afterDouble} vs ${before + 1}`,
  );

  console.log(
    failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

/** Spearman rank correlation between two sequences of the same markers. */
function spearman(a: number[], b: number[]): number {
  const rankA = new Map(a.map((value, index) => [value, index]));
  const rankB = new Map(b.map((value, index) => [value, index]));
  const keys = [...rankA.keys()];
  const n = keys.length;
  if (n < 2) return 0;
  let sum = 0;
  for (const key of keys) {
    const d = (rankA.get(key) ?? 0) - (rankB.get(key) ?? 0);
    sum += d * d;
  }
  return 1 - (6 * sum) / (n * (n * n - 1));
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(2);
});
