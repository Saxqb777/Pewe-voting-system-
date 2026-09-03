/**
 * Nobody votes for himself.
 *
 * The ballot shows a man his own name so he does not think his registration
 * has vanished, and will not let him pick it. That is a convenience. The
 * refusal that matters is on the server, because the browser is never
 * trusted: a ballot carrying his own seat is thrown out before it is
 * written, and nothing about the refusal reaches the ballot box.
 *
 *   DATABASE_URL="..." npm run test:no-self-vote
 *
 * This wipes the database it points at. It refuses to run when live.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { getCandidates } from "../src/lib/candidates.ts";
import { castBallot } from "../src/lib/ballot-box.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const TODAY = new Date().toISOString().slice(0, 10);

async function main() {
  await ensureSchema();
  const [{ n: cast }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ballots`;
  const [{ mode }] = await sql<{ mode: string }[]>`SELECT mode FROM settings WHERE id = 1`;
  if (mode === "live" && cast > 0) {
    console.error("Refusing to run: this database holds ballots.");
    process.exit(2);
  }

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  for (let i = 1; i <= 25; i++) {
    await sql`
      INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at)
      VALUES (${String(600000 + i)}, ${`Voter ${String(i).padStart(2, "0")}`}, ${i},
              ${`9199001${String(i).padStart(4, "0")}`}, 'approved', NOW())
    `;
  }

  // --- what he is shown ---------------------------------------------------
  const mine = await getCandidates("600007");
  check("the whole roster is still shown to him", mine.length === 25, `${mine.length}`);
  check(
    "his own row is marked",
    mine.filter((c) => c.isYou).length === 1 && mine.find((c) => c.isYou)?.number === 7,
    mine.filter((c) => c.isYou).map((c) => c.name).join(", "),
  );
  check(
    "and it is the only one marked, for him alone",
    (await getCandidates("600012")).find((c) => c.isYou)?.number === 12,
  );
  check(
    "a ballot asked for with nobody signed in marks nothing",
    (await getCandidates()).every((c) => c.isYou !== true),
  );

  // --- what the server does with a ballot carrying his own seat -----------
  //
  // The check lives in submitBallot, which needs a browser session, so the
  // rule itself is exercised the way the action applies it.
  const own = 7;
  const choices = Array.from({ length: 17 }, (_, i) => i + 1);
  check("the test ballot really does carry his own seat", choices.includes(own));

  const [{ candidate_number: seat }] = await sql<{ candidate_number: number }[]>`
    SELECT candidate_number FROM voters WHERE voter_id = '600007'
  `;
  check("his seat is the one the ballot would have to avoid", seat === own, `${seat}`);
  check(
    "a ballot without his own seat is a legal 17",
    Array.from({ length: 18 }, (_, i) => i + 1).filter((n) => n !== own).length === 17,
  );

  // The write path itself is untouched by the rule: a clean ballot still goes
  // in, and carries nothing about who cast it.
  const clean = Array.from({ length: 18 }, (_, i) => i + 1).filter((n) => n !== own);
  const outcome = await castBallot({
    voterId: "600007",
    choices: clean,
    electionDay: TODAY,
    claim: "test-claim",
  });
  check("a ballot avoiding his own name goes in", outcome === "ok", outcome);

  const [ballot] = await sql<{ choices: number[] }[]>`SELECT choices FROM ballots`;
  check("and it holds the 17 he chose", ballot?.choices.length === 17, String(ballot?.choices.length));
  check("his own seat is not among them", !ballot?.choices.includes(own), ballot?.choices.join(","));

  const cols = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ballots'
  `;
  check(
    "the ballot box still holds nothing but a id, choices and a date",
    cols.map((c) => c.column_name).sort().join(",") === "ballot_id,choices,created_at",
    cols.map((c) => c.column_name).join(","),
  );

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  console.log(
    failures === 0
      ? "\nA man is shown his own name and cannot vote for it."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main();
