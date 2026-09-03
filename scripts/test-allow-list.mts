/**
 * The allow list decides who is even let as far as the register, and the name
 * it carries is the name on every chasing list the society sends out. A list
 * pasted in one shape must not quietly lose the names a list pasted in
 * another shape keeps.
 *
 * Run with: npm run test:allow-list
 */
import { parseAllowList } from "../src/lib/allow-list";

let failures = 0;
function check(label: string, condition: boolean, extra = "") {
  if (!condition) failures++;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
}

// The four shapes the same three people arrive in.
const comma = "A Gaffar Pewa,917887975151\nAatif Amin Khan,97433291868\nAbdAllah Dubai,971559568903";
const tabbed = "A Gaffar Pewa\t+91 78879 75151\nAatif Amin Khan\t+974 3329 1868\nAbdAllah Dubai\t+971 55 956 8903";
const spaced = "A Gaffar Pewa 917887975151\nAatif Amin Khan 97433291868\nAbdAllah Dubai 971559568903";
const bare = "917887975151\n97433291868\n971559568903";

for (const [shape, text] of [
  ["name then comma", comma],
  ["name then tab", tabbed],
  ["name then space", spaced],
] as const) {
  const list = parseAllowList(text);
  check(`${shape}: three numbers`, list.entries.length === 3, `got ${list.entries.length}`);
  check(`${shape}: three names`, list.named === 3, `got ${list.named}`);
  check(
    `${shape}: first name kept whole`,
    list.entries[0]?.knownName === "A Gaffar Pewa",
    JSON.stringify(list.entries[0]?.knownName),
  );
  check(
    `${shape}: nothing rejected`,
    list.rejected.length === 0,
    list.rejected.join(" | "),
  );
}

// Whatever shape it came in, the number is stored the one way.
const shapes = [comma, tabbed, spaced, bare].map((t) =>
  parseAllowList(t).entries.map((e) => e.phone).join(","),
);
check("every shape stores the same numbers", new Set(shapes).size === 1, shapes.join("  vs  "));

const bareList = parseAllowList(bare);
check("bare numbers still load", bareList.entries.length === 3);
check("bare numbers carry no name", bareList.named === 0);

// A spreadsheet paste brings its heading with it.
const withHeader = parseAllowList("Name,Phone Number\n" + comma);
check("a heading row is skipped", withHeader.entries.length === 3, `got ${withHeader.entries.length}`);
check("a heading row is reported", withHeader.rejected.length === 1);

const messy = parseAllowList(
  [
    "Zahid Khan , +91 98765 43210 ",
    "",
    "   ",
    "Some Person With No Number",
    "Zahid Khan,919876543210",
    "Khan (Dubai),+971 55 956 8903",
  ].join("\n"),
);
check("blank lines are ignored", messy.entries.length === 2, `got ${messy.entries.length}`);
check("the same man is not listed twice", messy.entries.length === 2);
check("a line with no number is rejected", messy.rejected.length === 1, messy.rejected.join(" | "));
check(
  "brackets in a name do not eat the number",
  messy.entries[1]?.knownName === "Khan (Dubai)",
  JSON.stringify(messy.entries[1]),
);

// A contacts export tells two men of the same name apart with a number on
// the end of it, and that number is not the front of a phone number.
const twice = parseAllowList(
  [
    "Akbar Pewekar 2 917057760315",
    "Akbar Pewekar 2,917057760316",
    "Faisal Nazir Khan 1 918237857855",
    "Khan +91 78879 75151",
  ].join("\n"),
);
check(
  "a name ending in a digit keeps its digit",
  twice.entries[0]?.knownName === "Akbar Pewekar 2",
  JSON.stringify(twice.entries[0]),
);
check(
  "and the number stays the number",
  twice.entries[0]?.phone === "917057760315",
  twice.entries[0]?.phone,
);
check(
  "comma and space give the same name",
  twice.entries[1]?.knownName === "Akbar Pewekar 2",
  JSON.stringify(twice.entries[1]),
);
check(
  "a name ending in 1 is not eaten either",
  twice.entries[2]?.knownName === "Faisal Nazir Khan 1" && twice.entries[2]?.phone === "918237857855",
  JSON.stringify(twice.entries[2]),
);
check(
  "a number typed with spaces after its code stays whole",
  twice.entries[3]?.phone === "917887975151" && twice.entries[3]?.knownName === "Khan",
  JSON.stringify(twice.entries[3]),
);

// The real list the society is using, in the shape it is pasted in.
const real = [
  "A Gaffar Pewa,917887975151",
  "A Qader Khan,919657124760",
  "A Rahman H Khan,918625081273",
  "Aatif Amin Khan,97433291868",
  "AbdAllah Dubai,971559568903",
].join("\n");
const realList = parseAllowList(real);
check("the society list loads whole", realList.entries.length === 5);
check("every man on it keeps his name", realList.named === 5);

console.log(failures === 0 ? "\nAll allow list checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
