/**
 * How the voting went, hour by hour.
 *
 * The register keeps the hour a man voted and nothing finer, which is the
 * whole reason this report can exist: it says how many voted between four
 * and five, never who, and the ballot box carries no time at all, so no line
 * on it can be lined up against a vote.
 *
 *   DATABASE_URL="..." npm run test:timeline
 *
 * This wipes the database it points at. It refuses to run when live.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { getVotingTimeline } from "../src/lib/admin-data.ts";
import { timelinePdf } from "../src/lib/report-pdf.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
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

  // A day with a rush, a lull, an hour where nobody voted at all, and a
  // second rush. The quiet hour is the interesting one.
  const shape = [5, 9, 0, 2, 7];
  let n = 0;
  for (let h = 0; h < shape.length; h++) {
    for (let i = 0; i < shape[h]; i++) {
      n++;
      await sql`
        INSERT INTO voters (voter_id, name, candidate_number, phone, status,
                            registered_at, has_voted, voted_at, country)
        VALUES (${String(140000 + n)}, ${`Voter ${n}`}, ${n},
                ${`9199010${String(n).padStart(5, "0")}`}, 'approved', NOW(), TRUE,
                date_trunc('hour', NOW() - (${shape.length - h} || ' hours')::interval),
                ${n % 3 === 0 ? "Qatar" : "India"})
      `;
    }
  }
  for (let i = 0; i < 6; i++) {
    await sql`
      INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at, has_voted)
      VALUES (${String(149000 + i)}, ${`Waiting ${i}`}, ${900 + i},
              ${`9199011${String(i).padStart(5, "0")}`}, 'approved', NOW(), FALSE)
    `;
  }

  const t = await getVotingTimeline();
  const total = shape.reduce((a, b) => a + b, 0);

  check("every hour between the first and last vote is there", t.hours.length === 5, `${t.hours.length}`);
  check("including the one where nobody voted", t.hours.some((h) => h.votes === 0));
  check("the counts are the counts", t.hours.map((h) => h.votes).join(",") === shape.join(","),
    t.hours.map((h) => h.votes).join(","));
  check("the running total climbs to the turnout",
    t.hours[t.hours.length - 1].running === total, `${t.hours[t.hours.length - 1].running}`);
  check("and never goes backwards",
    t.hours.every((h, i) => i === 0 || h.running >= t.hours[i - 1].running));
  check("the busiest hour is the busiest hour", t.busiest?.votes === 9, String(t.busiest?.votes));
  check("the turnout matches the register", t.voted === total && t.roster === total + 6,
    `${t.voted}/${t.roster}`);
  check("the average is the votes over the hours counted",
    t.perHour === Math.round((total / 5) * 10) / 10, String(t.perHour));
  check("an hour is written as the hour it covers",
    /to \d\d:\d\d$/.test(t.hours[0].label), t.hours[0].label);
  check("countries are counted from the men who voted",
    t.countries.reduce((sum, c) => sum + c.votes, 0) === total,
    t.countries.map((c) => `${c.name}:${c.votes}`).join(" "));

  // --- what the report must never carry -----------------------------------
  const shown = JSON.stringify(t);
  check("no name is in it", !/Voter 1\b|Waiting/.test(shown), shown.slice(0, 80));
  check("no voter code is in it", !/14000\d/.test(shown));
  check("no phone number is in it", !/9199010/.test(shown));

  const bytes = await timelinePdf(t, "Saturday 5 September at 12:00 India time");
  check("the file is a PDF", Buffer.from(bytes).subarray(0, 4).toString() === "%PDF",
    `${bytes.length} bytes`);

  // The ballot box must be untouched by any of this.
  const cols = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ballots'
  `;
  check("the ballot box still holds an id, choices and a date",
    cols.map((c) => c.column_name).sort().join(",") === "ballot_id,choices,created_at",
    cols.map((c) => c.column_name).join(","));

  const [{ n: fine }] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM voters
    WHERE voted_at IS NOT NULL AND voted_at <> date_trunc('hour', voted_at)
  `;
  check("no vote time is recorded finer than the hour", fine === 0, `${fine}`);

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  console.log(
    failures === 0
      ? "\nThe day is counted by the hour, and by nothing else."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main();
