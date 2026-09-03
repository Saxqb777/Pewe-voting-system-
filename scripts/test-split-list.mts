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
      ('919820066515', 'Iqbal H Khan'),
      ('919833499119', 'Shakir Khan'),
      ('919657124760', 'A Qader Khan'),
      ('447700900123', '')
  `;

  // One man registered on his India number, one typed his own name from a
  // number nobody had, and one number on the list has no name against it.
  await sql`
    INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at) VALUES
      ('100001', 'Akbar Pewekar', 1, '917057760315', 'approved', NOW()),
      ('100002', 'A Qader Khan Dubai', 2, '919999999999', 'approved', NOW()),
      ('100003', 'Sohail Nobody', 3, '971500000000', 'approved', NOW()),
      ('100004', 'Iqbal Khan', 4, '919820066515', 'approved', NOW())
  `;

  const { registered, missing } = await splitTheList();
  const named = (rows: { name: string }[]) => rows.map((r) => r.name).join(", ");

  check("everybody who registered is on the registered side",
    registered.length === 4,
    `${registered.length}: ${named(registered)}`);

  // The society writes him with his father's initial and he does not.
  check("a name written two ways is still one man",
    !missing.some((m) => m.name === "Iqbal H Khan"),
    named(missing));

  // But a surname two men share must never stand in for either of them.
  check("another Khan is still chased",
    missing.some((m) => m.name === "Shakir Khan"),
    named(missing));

  check("nobody is named on both sides at once",
    !registered.some((r) => missing.some((m) => m.phone === r.phone)),
    named(missing));

  check("a man the society never had a number for is still shown as registered",
    registered.some((r) => r.name === "Sohail Nobody" && r.phone.includes("971")),
    named(registered));

  check("the man who registered is on the registered side",
    registered.some((r) => r.name === "Akbar Pewekar"));

  check("his second number is not chased",
    !missing.some((m) => m.phone.includes("529069708")),
    named(missing));

  check("and he is named once, not once per number he owns",
    registered.filter((r) => r.name.startsWith("Akbar")).length === 1,
    registered.filter((r) => r.name.startsWith("Akbar")).map((r) => r.phone).join(", "));

  check("the name shown is the one he registered under, not the society's",
    registered.some((r) => r.name === "A Qader Khan Dubai") &&
      !registered.some((r) => r.name === "A Qader Khan"),
    named(registered));

  check("and the number shown is the one he registered with",
    registered.some((r) => r.name === "A Qader Khan Dubai" && r.phone.includes("9999999999")),
    registered.map((r) => `${r.name}/${r.phone}`).join(", "));

  check("his entry on the society's list is not chased either",
    !missing.some((m) => m.phone.includes("9657124760")),
    named(missing));

  check("a man who has not registered is still chased",
    missing.some((r) => r.name === "A Gaffar Pewa"),
    named(missing));

  check("a number with no name and nobody behind it is chased on its number",
    missing.some((r) => r.name === "" && r.phone.includes("44")),
    missing.map((r) => `${r.name}/${r.phone}`).join(", "));

  check("the registered side carries the moment he arrived",
    registered.find((r) => r.name === "Akbar Pewekar")?.joined !== "",
    registered.find((r) => r.name === "Akbar Pewekar")?.joined);

  check("both sides are sorted by name",
    missing.map((r) => r.name).join("|") ===
      [...missing].map((r) => r.name).sort().join("|"));

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  await sql.end();

  console.log(failures === 0 ? "\nAll split checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
