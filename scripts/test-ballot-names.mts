/**
 * The one thing that must never happen on voting day.
 *
 * The society's old contact list calls a man "A Gaffar Pewa" or "Hanif
 * India". Those are the names on the chasing lists, and they must not reach
 * the ballot. A man appears on the ballot under the name he registered with
 * himself, or he does not appear at all.
 *
 *   DATABASE_URL="..." npm run test:ballot-names
 *
 * This wipes the database it points at, so run it against a test database
 * only. It refuses to run when the election is live.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

/** Names that exist only on the society's contact list, nowhere else. */
const CONTACT_ONLY = [
  "A Gaffar Pewa",
  "Hanif India",
  "Kauser Dubai",
  "Akbar Pewekar 2",
  "Anis I Khan 2",
];

async function main() {
  await ensureSchema();

  const [{ mode }] = await sql<{ mode: string }[]>`SELECT mode FROM settings WHERE id = 1`;
  if (mode === "live") {
    console.error("Refusing to run: this database is in live mode.");
    process.exit(2);
  }

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;

  // The society's list, names and all.
  const list: [string, string][] = [
    ["917887975151", "A Gaffar Pewa"],
    ["919326566925", "Hanif India"],
    ["971553232677", "Kauser Dubai"],
    ["917057760315", "Akbar Pewekar 2"],
    ["971586400543", "Anis I Khan 2"],
  ];
  for (const [phone, name] of list) {
    await sql`INSERT INTO allowed_numbers (phone, known_name) VALUES (${phone}, ${name})`;
  }

  // Two men register, each under the name he types himself. One uses a number
  // the society has, one uses a number it has never seen.
  await sql`
    INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at)
    VALUES
      ('900001', 'ABDUL GAFFAR SIRGUROH', 1, '917887975151', 'approved', NOW()),
      ('900002', 'KAUSER HASAN KHAN', 2, '918976218191', 'approved', NOW())
  `;

  const ballot = await sql<{ name: string }[]>`
    SELECT name FROM voters WHERE status = 'approved' ORDER BY LOWER(name)
  `;
  const names = ballot.map((r) => r.name);

  check("the ballot holds only the men who registered", names.length === 2, names.join(", "));

  for (const contact of CONTACT_ONLY) {
    check(
      `the contact list name "${contact}" is not on the ballot`,
      !names.includes(contact),
      names.join(", "),
    );
  }

  check(
    "a man is on the ballot under the name he typed",
    names.includes("ABDUL GAFFAR SIRGUROH") && names.includes("KAUSER HASAN KHAN"),
    names.join(", "),
  );

  // The register and the contact list share no column at all, so no query can
  // quietly take a name from one and seat it in the other.
  const [{ n: leaked }] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM voters v
    WHERE EXISTS (SELECT 1 FROM allowed_numbers a WHERE a.known_name = v.name)
  `;
  check("no voter carries a name that came from the contact list", leaked === 0, `${leaked}`);

  // Loading the list again must not put a single person on the ballot.
  const before = names.length;
  for (const [phone, name] of list) {
    await sql`
      INSERT INTO allowed_numbers (phone, known_name) VALUES (${phone}, ${name})
      ON CONFLICT (phone) DO UPDATE SET known_name = EXCLUDED.known_name
    `;
  }
  const [{ n: after }] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM voters`;
  check("saving the list again adds nobody to the ballot", after === before, `${before} then ${after}`);

  console.log(
    failures === 0
      ? "\nOnly the names people registered with can reach the ballot."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main();
