/**
 * Every country on the form, not just the ones this village happens to live in.
 *
 * For each country the phone rules supply a real example mobile number. That
 * number is then written the four ways a person actually writes their own:
 * the national way with a zero in front, the national way without, the full
 * number with a plus, and the full number without. All four have to come back
 * as the same number, and it has to read correctly on screen.
 *
 * Run with: npm run test:every-country
 */
import { getExampleNumber, type CountryCode } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import { toInternational } from "../src/lib/phone-parse";
import { displayPhone, normalisePhone } from "../src/lib/phone";
import { COMMON_COUNTRIES, OTHER_COUNTRIES, isoForCountry } from "../src/lib/countries";

const NAMES = [...COMMON_COUNTRIES, ...OTHER_COUNTRIES];

let failures = 0;
let countries = 0;
const broken: string[] = [];

for (const name of NAMES) {
  const iso = isoForCountry(name) as CountryCode | null;
  if (!iso) {
    failures++;
    console.log(`FAIL  ${name} has no country code`);
    continue;
  }
  const example = getExampleNumber(iso, examples);
  if (!example) {
    console.log(`SKIP  ${name} has no example number to test with`);
    continue;
  }
  countries++;

  const want = normalisePhone(example.number);
  const national = example.nationalNumber;
  const written = [
    example.formatNational(),        // 050 123 4567
    national,                        // 501234567
    example.formatInternational(),   // +971 50 123 4567
    want,                            // 971501234567
  ];

  const wrong = written.filter((form) => toInternational(form, name) !== want);
  if (wrong.length > 0) {
    failures++;
    broken.push(name);
    for (const form of wrong) {
      console.log(
        `FAIL  ${name}: ${JSON.stringify(form)} -> ${toInternational(form, name)}, wanted ${want}`,
      );
    }
  }

  // And it has to read back with its country code set off from the rest.
  const shown = displayPhone(want);
  if (!shown.startsWith(`+${example.countryCallingCode} `)) {
    failures++;
    broken.push(name);
    console.log(`FAIL  ${name} reads as ${shown}`);
  }
}

console.log(
  failures === 0
    ? `\nAll ${countries} countries: a number typed any of four ways is stored and shown the same.`
    : `\n${failures} FAILED across ${new Set(broken).size} countries`,
);
process.exit(failures === 0 ? 0 : 1);
