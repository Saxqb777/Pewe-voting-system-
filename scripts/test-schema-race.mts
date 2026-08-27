/**
 * Serverless runs many instances, and they start together. This proves that
 * several of them creating the schema at the same instant against one empty
 * database all succeed.
 *
 * Without the advisory lock in the DDL, seven of eight fail with
 * "duplicate key value violates unique constraint pg_type_typname_nsp_index",
 * which is Postgres' own catalog losing a race with itself.
 *
 *   DATABASE_URL="..." npm run test:schema-race
 *
 * This drops and recreates every table, so point it at a test database only.
 */
/**
 * Eight separate processes would be ideal, but eight independent connection
 * pools in one process race the same way: concurrent CREATE TABLE IF NOT
 * EXISTS against one empty database.
 */
import postgres from "postgres";
const CONNECTION = process.env.DATABASE_URL;
if (!CONNECTION) {
  console.error("Set DATABASE_URL first. This wipes the schema, so point it at a test database only.");
  process.exit(2);
}
const admin = postgres(CONNECTION, { prepare: false, onnotice: () => {} });

// The very DDL the app ships, read out of the source so the two cannot drift.
const source = (await import("node:fs")).readFileSync(
  new URL("../src/lib/db.ts", import.meta.url),
  "utf8",
);
const SCHEMA = source.match(/const SCHEMA_SQL = `([^`]*)`;/)![1];

let failures = 0;
for (let round = 1; round <= 5; round++) {
  await admin`DROP TABLE IF EXISTS ballots, voters, settings, id_attempts, session_locks, audit_log CASCADE`;

  const results = await Promise.allSettled(
    Array.from({ length: 8 }, async () => {
      const c = postgres(CONNECTION, { prepare: false, onnotice: () => {}, max: 1 });
      try {
        await c.unsafe(SCHEMA).simple();
      } finally {
        await c.end();
      }
    }),
  );
  const rejected = results.filter(r => r.status === "rejected");
  if (rejected.length) {
    failures++;
    console.log(`FAIL  round ${round}: ${rejected.length} of 8 failed  ${(rejected[0] as PromiseRejectedResult).reason?.message?.slice(0,90)}`);
  } else {
    const [{ n }] = await admin`SELECT COUNT(*)::int AS n FROM settings`;
    const t = await admin`SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`;
    const ok = n === 1 && t[0].n === 6;
    if (!ok) failures++;
    console.log(`${ok?"PASS":"FAIL"}  round ${round}: 8 instances raced, ${t[0].n} tables, ${n} settings row`);
  }
}
await admin.end();
console.log(failures === 0 ? "\nALL ROUNDS PASSED" : `\n${failures} ROUND(S) FAILED`);
process.exit(failures?1:0);
