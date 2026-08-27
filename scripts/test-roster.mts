/**
 * Checks the voter list loader. No database needed.
 *   npm run test:roster
 */
import { parseRoster, duplicateNames } from "../src/lib/roster.ts";
import { normaliseVoterId } from "../src/lib/voter-id.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

function rows(n: number, start = 1): string {
  return Array.from(
    { length: n },
    (_, i) => `${100000 + start + i},Person ${start + i}`,
  ).join("\n");
}

const good = parseRoster(rows(130), 130, normaliseVoterId);
check("a correct list of 130 loads", good.ok);
if (good.ok) {
  check("ids are normalised", good.rows[0].voterId === "100001");
  check("names are kept as typed", good.rows[0].name === "Person 1");
}

const withHeader = parseRoster(
  `Voter ID,Name\n${rows(130)}`,
  130,
  normaliseVoterId,
);
check("a header row is ignored", withHeader.ok);

const tooFew = parseRoster(rows(129), 130, normaliseVoterId);
check("129 rows is refused", !tooFew.ok);
check(
  "the refusal says how many were found",
  !tooFew.ok && tooFew.error.includes("129") && tooFew.error.includes("130"),
  !tooFew.ok ? tooFew.error : "",
);

const tooMany = parseRoster(rows(131), 130, normaliseVoterId);
check("131 rows is refused", !tooMany.ok);

const duplicated = parseRoster(
  `${rows(129)}\n100001,Someone Else`,
  130,
  normaliseVoterId,
);
check("a duplicate Voter ID is refused", !duplicated.ok);
check(
  "the refusal names both rows",
  !duplicated.ok &&
    duplicated.error.includes("130") &&
    duplicated.error.includes("row 1"),
  !duplicated.ok ? duplicated.error : "",
);

const blankName = parseRoster(
  `${rows(129)}\n200001,`,
  130,
  normaliseVoterId,
);
check("a blank name is refused", !blankName.ok);
check(
  "the refusal names the row",
  !blankName.ok && blankName.error.includes("Row 130"),
  !blankName.ok ? blankName.error : "",
);

const blankId = parseRoster(`${rows(129)}\n,No Id Person`, 130, normaliseVoterId);
check("a blank Voter ID is refused", !blankId.ok);

const oneColumn = parseRoster(`${rows(129)}\n200002`, 130, normaliseVoterId);
check("a row with one column is refused", !oneColumn.ok);
check(
  "the refusal shows the bad row",
  !oneColumn.ok && oneColumn.error.includes("200002"),
  !oneColumn.ok ? oneColumn.error : "",
);

const quoted = parseRoster(
  `100001,"Khan, Amina"\n${rows(129, 2)}`,
  130,
  normaliseVoterId,
);
check("a quoted name with a comma survives", quoted.ok);
if (quoted.ok) {
  check(
    "the quoted name is kept whole",
    quoted.rows[0].name === "Khan, Amina",
    quoted.rows[0].name,
  );
}

const semicolons = parseRoster(
  Array.from({ length: 130 }, (_, i) => `${100001 + i};Person ${i + 1}`).join("\n"),
  130,
  normaliseVoterId,
);
check("semicolon separated rows also load", semicolons.ok);

const messy = parseRoster(
  `  100001 , Amina Khan  \n\n${rows(129, 2)}\n\n`,
  130,
  normaliseVoterId,
);
check("blank lines and stray spaces are tolerated", messy.ok);
if (messy.ok) {
  check("spaces around the name are trimmed", messy.rows[0].name === "Amina Khan");
}

const sameName = parseRoster(
  `100001,Amina Khan\n100002,Amina Khan\n${rows(128, 3)}`,
  130,
  normaliseVoterId,
);
check("two people with the same name still load", sameName.ok);
if (sameName.ok) {
  const dupes = duplicateNames(sameName.rows);
  check("repeated names are reported back", dupes.length === 1, dupes.join(", "));
}

const empty = parseRoster("", 130, normaliseVoterId);
check("an empty box is refused", !empty.ok);

console.log(
  failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
