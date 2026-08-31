/**
 * Numbers as people actually type them, written back the way their own
 * country writes them.
 *
 * The register holds one form per person. A number that arrives as
 * 0506918237 and is stored as 506918237 reads as nothing on the ballot, on
 * the admin screen and on the sheet of codes. This works out the country the
 * number belongs to, and it must never guess a country the number itself has
 * already named.
 *
 * Run with: npm run test:phone-parse
 */
import { toInternational } from "../src/lib/phone-parse";
import { displayPhone } from "../src/lib/phone";

let failures = 0;
function check(label: string, got: string, want: string) {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  ${got}${ok ? "" : `  wanted ${want}`}`);
}

const AE = "United Arab Emirates";
const IN = "India";
const QA = "Qatar";
const ELSEWHERE = "Somewhere else";

// --- the same Gulf number, however its owner writes it ---------------------
check("a UAE number with the trunk zero", toInternational("0506918237", AE), "971506918237");
check("without the zero", toInternational("506918237", AE), "971506918237");
check("with the code and a plus", toInternational("+971 50 691 8237", AE), "971506918237");
check("with the code and no plus", toInternational("971506918237", AE), "971506918237");
check("spaced out the way it is spoken", toInternational("0 50 691 8237", AE), "971506918237");

// The two the admin actually saw arrive, written with no code at all.
check("545388662 with UAE chosen", toInternational("545388662", AE), "971545388662");
check("0545388662 with UAE chosen", toInternational("0545388662", AE), "971545388662");
check("506918237 with UAE chosen", toInternational("506918237", AE), "971506918237");
check("0506918237 with UAE chosen", toInternational("0506918237", AE), "971506918237");
check("and each reads back", displayPhone(toInternational("545388662", AE)), "+971 545388662");

// --- the number itself outranks the country on the form -------------------
check(
  "a man in Dubai registering his Indian mobile",
  toInternational("9876543210", AE),
  "919876543210",
);
check(
  "and his Indian number written in full while abroad",
  toInternational("+91 98765 43210", AE),
  "919876543210",
);
check(
  "a UAE number given by somebody who chose India",
  toInternational("+971506918237", IN),
  "971506918237",
);

// --- every country this election is spread across -------------------------
check("India", toInternational("08104885830", IN), "918104885830");
check("Qatar", toInternational("55884597", QA), "97455884597");
check("Saudi Arabia", toInternational("0541105434", "Saudi Arabia"), "966541105434");
check("Oman", toInternational("99091455", "Oman"), "96899091455");
check("Kuwait", toInternational("66942429", "Kuwait"), "96566942429");
check("Rwanda", toInternational("0788444555", "Rwanda"), "250788444555");
check("Tanzania", toInternational("0675821222", "Tanzania"), "255675821222");
check("the United Kingdom", toInternational("07700900123", "United Kingdom"), "447700900123");

// --- and anywhere else at all ---------------------------------------------
check("Germany", toInternational("015112345678", "Germany"), "4915112345678");
check("Kenya", toInternational("0712345678", "Kenya"), "254712345678");
check("South Africa", toInternational("0821234567", "South Africa"), "27821234567");

// --- nothing is ever lost --------------------------------------------------
check(
  "a full number still works with no country chosen",
  toInternational("+971506918237", null),
  "971506918237",
);
check(
  "an unrecognised number is kept as it was typed",
  toInternational("12345678901234", ELSEWHERE),
  "12345678901234",
);
check("an empty number stays empty", toInternational("", AE), "");

// --- and reads correctly wherever it is shown ------------------------------
check("the Gulf reads correctly", displayPhone("971506918237"), "+971 506918237");
check("India reads correctly", displayPhone("918104885830"), "+91 8104885830");
check("Qatar reads correctly", displayPhone("97455884597"), "+974 55884597");
check("Tanzania reads correctly", displayPhone("255675821222"), "+255 675821222");
check("Rwanda reads correctly", displayPhone("250788444555"), "+250 788444555");
check("the United Kingdom reads correctly", displayPhone("447700900123"), "+44 7700900123");
check("Germany reads correctly", displayPhone("4915112345678"), "+49 15112345678");
check("the United States reads correctly", displayPhone("12025550123"), "+1 2025550123");

console.log(
  failures === 0
    ? "\nEvery number is stored and shown the way its own country writes it."
    : `\n${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
