/**
 * Three checks decide whether a man on the society's list has registered.
 *
 *   1. His number. Nothing beats it.
 *   2. A decision the admin has already made about him.
 *   3. His name, against the men who registered on a number the society
 *      never had.
 *
 * The third one is the reason this file exists. A name that fits one man is
 * a question worth asking. A name that fits three is a trap, and answering
 * it by guessing puts a man who has registered on a list of people to ring.
 *
 *   DATABASE_URL="..." npm run test:cross-check
 *
 * This wipes the database it points at. It refuses to run when live.
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

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers, list_matches`;

  const list: [string, string][] = [
    ["919326566925", "Hanif India"],
    ["919029206506", "Hanif Razzak Khan"],
    ["971526922678", "Wasim Hanif khan"],
    ["971553232677", "Kauser Dubai"],
    ["917887975151", "A Gaffar Pewa"],
    ["919820066515", "Iqbal H Khan"],
    ["447700900123", ""],
  ];
  for (const [phone, name] of list) {
    await sql`INSERT INTO allowed_numbers (phone, known_name) VALUES (${phone}, ${name})`;
  }

  await sql`
    INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at)
    VALUES
      ('800001', 'HANIF U. Khan', 1, '966556651406', 'approved', NOW()),
      ('800002', 'KAUSER HASAN KHAN', 2, '918976218191', 'approved', NOW()),
      ('800003', 'Iqbal Hussain Khan Sarguroh', 3, '919820066515', 'approved', NOW()),
      ('800004', 'Zihad Khan', 4, '918767920084', 'approved', NOW())
  `;

  let split = await splitTheList();
  const names = (rows: { name: string }[]) => rows.map((r) => r.name).join(", ");

  // --- check one: the number ---------------------------------------------
  check(
    "a man who registered on his own number is not chased",
    !split.missing.some((m) => m.name === "Iqbal H Khan"),
    names(split.missing),
  );

  // --- check three: the name ---------------------------------------------
  const hanif = split.possible.find((p) => p.listName === "Hanif India");
  check("the man on a different number is raised as a question", hanif !== undefined);
  check(
    "and every man his name could be is offered, not just the first",
    (hanif?.candidates.length ?? 0) === 1,
    hanif?.candidates.map((c) => c.name).join(", ") ?? "none",
  );
  check(
    "all three Hanifs are asked about, none quietly dropped",
    split.possible.filter((p) => p.listName.toLowerCase().includes("hanif")).length === 3,
    split.possible.map((p) => p.listName).join(", "),
  );
  check(
    "nobody is taken off the chasing list on a guess",
    split.missing.some((m) => m.name === "Hanif India") &&
      split.missing.some((m) => m.name === "Hanif Razzak Khan"),
    names(split.missing),
  );
  check(
    "a place word in a contact name does not stop the match",
    split.possible.some((p) => p.listName === "Kauser Dubai"),
    split.possible.map((p) => p.listName).join(", "),
  );
  check(
    "a man nobody on the list resembles raises no question",
    !split.possible.some((p) => p.candidates.some((c) => c.name === "Zihad Khan")),
    split.possible.flatMap((p) => p.candidates.map((c) => c.name)).join(", "),
  );
  check(
    "an entry with no name at all raises no question",
    !split.possible.some((p) => p.listName === ""),
  );

  // --- check two: a decision already made --------------------------------
  await sql`INSERT INTO list_matches (phone, voter_id) VALUES ('919326566925', '800001')`;
  split = await splitTheList();
  check(
    "once you say it is the same man he is off the chasing list",
    !split.missing.some((m) => m.name === "Hanif India"),
    names(split.missing),
  );
  check(
    "and he is not asked about again",
    !split.possible.some((p) => p.listName === "Hanif India"),
    split.possible.map((p) => p.listName).join(", "),
  );
  check(
    "the other Hanifs are still chased",
    split.missing.some((m) => m.name === "Hanif Razzak Khan"),
    names(split.missing),
  );

  await sql`INSERT INTO list_matches (phone, voter_id) VALUES ('919029206506', NULL)`;
  split = await splitTheList();
  check(
    "saying two men are different keeps him on the chasing list",
    split.missing.some((m) => m.name === "Hanif Razzak Khan"),
    names(split.missing),
  );
  check(
    "and stops him being asked about over and over",
    !split.possible.some((p) => p.listName === "Hanif Razzak Khan"),
    split.possible.map((p) => p.listName).join(", "),
  );

  // Nothing here may ever reach the ballot.
  const ballot = await sql<{ name: string }[]>`SELECT name FROM voters ORDER BY name`;
  check(
    "no contact list name has been seated on the ballot",
    !ballot.some((b) => list.some(([, n]) => n !== "" && n === b.name)),
    ballot.map((b) => b.name).join(", "),
  );
  check(
    "and settling a pair seats nobody new",
    ballot.length === 4,
    `${ballot.length}`,
  );

  console.log(
    failures === 0
      ? "\nA man is only taken off the chasing list on evidence or on your word."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main();
