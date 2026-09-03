/**
 * The chasing list goes to the whole group, so a man who registered and is
 * named on it anyway is not a small mistake. The society's list holds two and
 * three numbers for men working abroad, told apart by a counter on the name,
 * and registering on one has to clear all of them.
 *
 *   DATABASE_URL="..." npm run test:split-list
 *
 * This wipes the database it points at, so run it against a test one only.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { splitTheList } from "../src/lib/admin-data.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

async function main() {
  await ensureSchema();

  const [{ mode }] = await sql<{ mode: string }[]>`SELECT mode FROM settings WHERE id = 1`;
  if (mode === "live") {
    console.error("Refusing to run: this database is in live mode.");
    process.exit(2);
  }

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;

  await sql`
    INSERT INTO allowed_numbers (phone, known_name) VALUES
      ('917057760315', 'Akbar Pewekar'),
      ('971529069708', 'Akbar Pewekar 2'),
      ('917887975151', 'A Gaffar Pewa'),
      ('919657124760', 'A Qader Khan'),
      ('447700900123', '')
  `;

  // One man registered on his India number, one typed his own name from a
  // number nobody had, and one number on the list has no name against it.
  await sql`
    INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at) VALUES
      ('100001', 'Akbar Pewekar', 1, '917057760315', 'approved', NOW()),
      ('100002', 'A Qader Khan', 2, '919999999999', 'pending', NOW()),
      ('100003', 'Sohail Nobody', 3, '971500000000', 'pending', NOW())
  `;

  const { registered, missing } = await splitTheList();
  const named = (rows: { name: string }[]) => rows.map((r) => r.name).join(", ");

  check("every number on the list is on one side or the other",
    registered.length + missing.length === 6,
    `${registered.length} + ${missing.length}`);

  check("a man the society never had a number for is still shown as registered",
    registered.some((r) => r.name === "Sohail Nobody" && r.phone.includes("971")),
    named(registered));

  check("nobody is named on both sides at once",
    !registered.some((r) => missing.some((m) => m.phone === r.phone)));

  check("the man who registered is on the registered side",
    registered.some((r) => r.name === "Akbar Pewekar"));

  check("and so is his second number",
    registered.some((r) => r.name === "Akbar Pewekar 2"),
    named(missing));

  check("a man who registered from a number nobody had is not chased",
    registered.some((r) => r.name === "A Qader Khan"),
    named(missing));

  check("and he is named once, under the number the society has for him",
    registered.filter((r) => r.name === "A Qader Khan").length === 1 &&
      registered.some((r) => r.name === "A Qader Khan" && r.phone.includes("9657124760")),
    registered.filter((r) => r.name === "A Qader Khan").map((r) => r.phone).join(", "));

  check("a man who has not registered is still chased",
    missing.some((r) => r.name === "A Gaffar Pewa"),
    named(missing));

  check("a number with no name and nobody behind it is chased on its number",
    missing.some((r) => r.name === "" && r.phone.includes("44")),
    missing.map((r) => `${r.name}/${r.phone}`).join(", "));

  check("the registered side carries the moment he arrived",
    registered.find((r) => r.name === "Akbar Pewekar")?.joined !== "",
    registered.find((r) => r.name === "Akbar Pewekar")?.joined);

  check("his second number carries no arrival time of its own",
    registered.find((r) => r.name === "Akbar Pewekar 2")?.joined === "");

  check("both sides are sorted by name",
    missing.map((r) => r.name).join("|") ===
      [...missing].map((r) => r.name).sort().join("|"));

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  await sql.end();

  console.log(failures === 0 ? "\nAll split checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
