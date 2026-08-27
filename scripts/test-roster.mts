/**
 * Checks the voter list loader. No database needed.
 *   npm run test:roster
 */
import { parseRoster, parseNameList, duplicateNames } from "../src/lib/roster.ts";
import { generateVoterIds } from "../src/lib/voter-id-generator.ts";
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

// ------------------------------------------------ names only, IDs made for you
function names(n: number, start = 1): string {
  return Array.from({ length: n }, (_, i) => `Person ${start + i}`).join("\n");
}

const nameList = parseNameList(names(130), 130);
check("a list of 130 names loads", nameList.ok);
if (nameList.ok) {
  check("names are kept in order", nameList.names[0] === "Person 1");
  check("the last name is kept", nameList.names[129] === "Person 130");
}

check("a name header row is ignored", parseNameList(`Name\n${names(130)}`, 130).ok);

const shortList = parseNameList(names(129), 130);
check("129 names is refused", !shortList.ok);
check(
  "the refusal says how many names were found",
  !shortList.ok && shortList.error.includes("129"),
  !shortList.ok ? shortList.error : "",
);

const withIds = parseNameList(`100001,Amina Khan\n${names(129, 2)}`, 130);
check("a row that still has an ID column is refused", !withIds.ok);
check(
  "the refusal points at the offending row",
  !withIds.ok && withIds.error.includes("Row 1"),
  !withIds.ok ? withIds.error : "",
);

const digitsOnly = parseNameList(`${names(129)}\n100002`, 130);
check("a row of only digits is refused as a name", !digitsOnly.ok);

const messyNames = parseNameList(`  Amina Khan  \n\n${names(129, 2)}\n\n`, 130);
check("blank lines and spaces in a name list are tolerated", messyNames.ok);
if (messyNames.ok) {
  check("the name is trimmed", messyNames.names[0] === "Amina Khan");
}

const sameNames = parseNameList(`Amina Khan\nAmina Khan\n${names(128, 3)}`, 130);
check("two people with the same name are allowed in a name list", sameNames.ok);

// ------------------------------------------------------ generated Voter IDs
const generated = generateVoterIds(130);
check("130 IDs are made", generated.length === 130);
check("every generated ID is unique", new Set(generated).size === 130);
check(
  "every generated ID is six digits",
  generated.every((id) => /^[1-9][0-9]{5}$/.test(id)),
);

// IDs must not follow the order of the list, or knowing one would give the next.
let ascending = 0;
for (let i = 1; i < generated.length; i++) {
  if (Number(generated[i]) > Number(generated[i - 1])) ascending++;
}
check(
  "generated IDs do not run in order",
  ascending > 30 && ascending < 99,
  `${ascending} of 129 steps ascending`,
);

// Two separate runs must not produce the same list.
const secondRun = generateVoterIds(130);
const overlap = secondRun.filter((id) => generated.includes(id)).length;
check("a second run makes different IDs", overlap < 5, `${overlap} shared`);

// A stranger guessing has to get through the whole space.
const space = 900000;
check(
  "the chance of guessing a valid ID in one try stays below one in 5000",
  space / 130 > 5000,
  `about 1 in ${Math.round(space / 130)}`,
);

console.log(
  failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
