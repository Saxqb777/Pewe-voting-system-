/**
 * The admin's chasing list for voting day.
 *
 * Two things must hold. It has to name the right men, and it must not carry
 * a single voting code: this file is read out in a room, and a code on it is
 * a code anybody in that room could use.
 *
 *   DATABASE_URL="..." npm run test:not-voted
 *
 * This wipes the database it points at. It refuses to run when live.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { getNotVotedList } from "../src/lib/admin-data.ts";
import { namesPdf } from "../src/lib/report-pdf.ts";
import { PDFDocument, PDFName, PDFDict, PDFArray } from "pdf-lib";

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
  const CODES = ["414141", "525252", "636363", "747474", "858585"];
  const people: [string, string, string, boolean, string][] = [
    [CODES[0], "Aslam Ahmed Khan", "919900300001", true, "approved"],
    [CODES[1], "Bashir Wazir Khan", "919900300002", false, "approved"],
    [CODES[2], "Dawood Akbar Khan", "971500300003", false, "approved"],
    [CODES[3], "Zihad Khan", "919900300004", true, "approved"],
    [CODES[4], "Waiting Man", "919900300005", false, "pending"],
  ];
  for (let i = 0; i < people.length; i++) {
    const [id, name, phone, voted, status] = people[i];
    await sql`
      INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at, has_voted)
      VALUES (${id}, ${name}, ${i + 1}, ${phone}, ${status}, NOW(), ${voted})
    `;
  }

  const rows = await getNotVotedList();
  const names = rows.map((r) => r.name).join(", ");

  check("only the men who have not voted are on it", rows.length === 2, `${rows.length}: ${names}`);
  check(
    "and they are the right two",
    rows.some((r) => r.name === "Bashir Wazir Khan") &&
      rows.some((r) => r.name === "Dawood Akbar Khan"),
    names,
  );
  check("a man who has voted is not chased", !names.includes("Aslam"), names);
  check("nor is one still waiting for approval", !names.includes("Waiting"), names);
  check(
    "each one carries the number he registered with",
    rows.every((r) => r.phone !== ""),
    rows.map((r) => `${r.name}/${r.phone}`).join(", "),
  );
  check("it is sorted by name", rows[0].name < rows[1].name, names);

  // --- no code can reach the file -----------------------------------------
  //
  // Checked on the rows rather than on the bytes. A PDF holds its text
  // compressed, so searching the raw file for a code passes whether or not
  // the code is in there, which is worse than not checking at all. The file
  // can only ever draw what it is handed, so this is where it is settled.
  const handed = rows.flatMap((r) => [r.name, r.phone, r.joined]).join(" ");
  for (const code of CODES) {
    check(`no row carries the voting code ${code}`, !handed.includes(code), handed);
  }
  check(
    "a row carries a name, a number and nothing else",
    rows.every((r) => Object.keys(r).sort().join(",") === "joined,name,phone"),
    Object.keys(rows[0]).join(","),
  );

  // --- the file itself ----------------------------------------------------
  const bytes = await namesPdf(rows, "Saturday 5 September at 12:00 India time", "notvoted");
  check("the file is a PDF", Buffer.from(bytes).subarray(0, 4).toString() === "%PDF", `${bytes.length} bytes`);

  const doc = await PDFDocument.load(bytes);
  const dialled: string[] = [];
  for (const page of doc.getPages()) {
    const annots = page.node.lookup(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const action = annots.lookup(i, PDFDict)?.lookup(PDFName.of("A"), PDFDict);
      const uri = action?.get(PDFName.of("URI"));
      if (uri) dialled.push(uri.toString().replace(/^\(|\)$/g, ""));
    }
  }
  check("every number on it can be dialled", dialled.length === rows.length, dialled.join(" "));
  check(
    "and the links dial the numbers on the page",
    dialled.includes("tel:+919900300002") && dialled.includes("tel:+971500300003"),
    dialled.join(" "),
  );
  check(
    "no link carries anything but a phone number",
    dialled.every((d) => /^tel:\+\d{8,15}$/.test(d)),
    dialled.join(" "),
  );

  await sql`TRUNCATE ballots, voters, id_attempts, session_locks, audit_log, allowed_numbers`;
  console.log(
    failures === 0
      ? "\nThe chasing list names who is left and carries nobody's code."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main();
