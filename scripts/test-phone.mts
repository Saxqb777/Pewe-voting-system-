/**
 * Phone matching is the gate on this election: it decides who is allowed to
 * register. Two dangers sit either side of it. Too strict and a man who types
 * his own number slightly differently is turned away. Too loose and one
 * person's number lets them register as somebody else.
 *
 * Run with: npm run test:phone
 */
import {
  sameNumber,
  normalisePhone,
  looksLikeAPhoneNumber,
  displayPhone,
} from "../src/lib/phone";

let failures = 0;
function check(label: string, condition: boolean, extra = "") {
  if (!condition) failures++;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
}

// A spread of the shapes this election really contains: India, the Gulf
// states and the two African numbers.
const NUMBERS = [
  "918104885830", "917400131519", "919657124760", "919004078613",
  "971559568903", "971504766096", "97455254978", "97433291868",
  "966541105434", "96899091455", "96566942429", "250788444555",
  "255675821222", "97455884597",
];

const CODES = ["971", "974", "966", "968", "965", "250", "255", "91"];
const codeOf = (n: string) => CODES.find((c) => n.startsWith(c)) ?? "";

// --- a man must always match his own number, however he writes it ---------
let missed = 0;
for (const n of NUMBERS) {
  const national = n.slice(codeOf(n).length);
  const forms = [
    n,
    `+${n}`,
    `+${codeOf(n)} ${national}`,
    national,
    `0${national}`,
    n.replace(/(\d{3})/g, "$1 "),
    ` ${n} `,
  ];
  for (const form of forms) {
    if (!sameNumber(n, form)) {
      missed++;
      console.log(`   missed: ${n} typed as ${JSON.stringify(form)}`);
    }
  }
}
check("a number matches itself however it is typed", missed === 0, `${missed} missed`);

// --- and must never match anybody else ------------------------------------
let collisions = 0;
for (let i = 0; i < NUMBERS.length; i++) {
  for (let j = i + 1; j < NUMBERS.length; j++) {
    if (sameNumber(NUMBERS[i], NUMBERS[j])) {
      collisions++;
      console.log(`   collision: ${NUMBERS[i]} and ${NUMBERS[j]}`);
    }
  }
}
check("two different people never match", collisions === 0, `${collisions} collisions`);

// --- not even when one of them drops the country code ---------------------
let wrong = 0;
for (const n of NUMBERS) {
  const national = n.slice(codeOf(n).length);
  for (const other of NUMBERS) {
    if (other !== n && sameNumber(other, national)) {
      wrong++;
      console.log(`   ${national} wrongly matched ${other}`);
    }
  }
}
check("a national number matches only its owner", wrong === 0, `${wrong} wrong`);

// --- junk is never a number ------------------------------------------------
check("identical junk is not a match", !sameNumber("12345", "12345"));
check("empty is not a match", !sameNumber("", ""));
check("letters are not a number", !looksLikeAPhoneNumber("abcdefghij"));
check("too short is not a number", !looksLikeAPhoneNumber("12345"));
check("too long is not a number", !looksLikeAPhoneNumber("1234567890123456789"));
check("a real number is accepted", looksLikeAPhoneNumber("+91 81048 85830"));
check("normalising keeps the digits", normalisePhone("+91 81048 85830") === "918104885830");

// --- shown the way its owner would recognise it ---------------------------
check("India reads correctly", displayPhone("918104885830") === "+91 8104885830");
check("the Gulf reads correctly", displayPhone("971559568903") === "+971 559568903");
check("an unknown country still reads", displayPhone("999123456789") === "+999123456789");

console.log(
  failures === 0
    ? "\nEvery phone check passed. The gate lets the right people through and nobody else."
    : `\n${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
