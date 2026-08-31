/**
 * An election that is already running must survive an update.
 *
 * The schema only runs when a readiness check says something is missing. A
 * database from an earlier version already holds every old table, so a check
 * that asks only about those reports itself ready, the migration is skipped,
 * and the first query for a new column takes the whole site down. That is not
 * a hypothetical: it happened.
 *
 * This test builds a database in the previous shape, starts the app against
 * it, and insists every new column and table arrives.
 *
 * Run with: npm run test:migration
 */
import postgres from "postgres";

const url =
  process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5433/village";
const sql = postgres(url, { prepare: false, onnotice: () => {} });

let failures = 0;
function check(label: string, condition: boolean, extra = "") {
  if (!condition) failures++;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
}

/** Everything this version added on top of the last one. */
const ADDED_COLUMNS: [string, string][] = [
  ["voters", "phone"],
  ["voters", "status"],
  ["voters", "registered_at"],
  ["settings", "registration_open"],
  ["settings", "roster_locked"],
];
const ADDED_TABLES = ["allowed_numbers"];

// --- put the database back the way it looked before this version ----------
for (const [table, column] of ADDED_COLUMNS) {
  await sql.unsafe(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column}`);
}
for (const table of ADDED_TABLES) {
  await sql.unsafe(`DROP TABLE IF EXISTS ${table}`);
}

const missingBefore = await sql<{ n: number }[]>`
  SELECT COUNT(*)::int AS n FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'settings'
    AND column_name = 'roster_locked'
`;
check("the database really is in the old shape", missingBefore[0].n === 0);

// A row that was there before the update, to prove nothing is lost.
await sql`DELETE FROM voters WHERE voter_id = '999001'`;
await sql`
  INSERT INTO voters (voter_id, name, candidate_number)
  VALUES ('999001', 'Somebody From Before', 9001)
`;

await sql.end();

// --- now let the app open it, exactly as a deploy would -------------------
const { ensureSchema, sql: appSql } = await import("../src/lib/db");
await ensureSchema();

let added = 0;
for (const [table, column] of ADDED_COLUMNS) {
  const [{ n }] = await appSql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `;
  if (n !== 1) {
    added++;
    console.log(`   missing: ${table}.${column}`);
  }
}
check("every new column arrived", added === 0, `${added} missing`);

for (const table of ADDED_TABLES) {
  const [{ present }] = await appSql<{ present: boolean }[]>`
    SELECT to_regclass(${"public." + table}) IS NOT NULL AS present
  `;
  check(`the ${table} table arrived`, present === true);
}

// --- and the settings the app reads on every page load actually work ------
const { getSettings } = await import("../src/lib/settings");
const settings = await getSettings();
check("the app can read its settings", typeof settings.rosterLocked === "boolean");
check("an upgraded election is not stuck in registration", settings.registrationOpen === false);

const [survivor] = await appSql<{ name: string; status: string }[]>`
  SELECT name, status FROM voters WHERE voter_id = '999001'
`;
check("a voter from before the update is still there", survivor?.name === "Somebody From Before");
check("and counts as being on the roster", survivor?.status === "approved", survivor?.status);

await appSql`DELETE FROM voters WHERE voter_id = '999001'`;
await appSql.end();

console.log(
  failures === 0
    ? "\nA database from the previous version upgrades cleanly and loses nobody."
    : `\n${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
