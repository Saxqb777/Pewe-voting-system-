import "server-only";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { normalisePhone } from "./phone";
import { isoForCountry } from "./countries";

/**
 * A number written the way its own country writes it, whatever was typed.
 *
 * People type their number every way there is: +971 50 691 8237, 0506918237,
 * 506918237, 971506918237. All four are the same man, and the register should
 * hold one form so that the ballot, the admin screen and the sheet of codes
 * all read alike.
 *
 * Nothing here is a demand on the voter. The number he types is taken as it
 * comes and worked out afterwards.
 */

/** Tried in turn when the number carries no country code of its own. */
const LIKELY: CountryCode[] = ["IN", "AE", "QA", "SA", "OM", "KW", "BH"];

/**
 * Reads a number, either strictly or by length alone.
 *
 * Strict asks whether the number is one the country actually hands out. Loose
 * asks only whether it is the right length to be one. Real numbers are
 * sometimes refused by the strict test, so a man is never turned away on it.
 */
function attempt(
  text: string,
  region: CountryCode | undefined,
  strict: boolean,
): string | null {
  try {
    const parsed = parsePhoneNumberFromString(text, region);
    if (!parsed) return null;
    const ok = strict ? parsed.isValid() : parsed.isPossible();
    // Digits only, matching how every other number in the register is held.
    return ok ? normalisePhone(parsed.number) : null;
  } catch {
    return null;
  }
}

/**
 * Reads digits as a whole international number, but only believes the answer
 * when the country it lands in is the one expected.
 */
function attemptFrom(digits: string, expected: CountryCode): string | null {
  try {
    const parsed = parsePhoneNumberFromString(`+${digits}`);
    return parsed && parsed.isValid() && parsed.country === expected
      ? normalisePhone(parsed.number)
      : null;
  } catch {
    return null;
  }
}

/**
 * Works out the full international form of a number.
 *
 * The number itself is asked first, so a man living in Dubai who registers
 * with his Indian mobile is recorded as Indian. Only when the digits alone
 * cannot say does the country he chose on the form get a say, and only then
 * the handful of countries this village actually lives in.
 *
 * Returns the digits as typed when nothing recognises them, so a number is
 * never lost to a rule that did not understand it.
 */
export function toInternational(raw: string, country: string | null): string {
  const digits = normalisePhone(raw);
  if (digits === "") return "";

  const iso = isoForCountry(country) as CountryCode | null;
  const hint = (strict: boolean) =>
    iso ? attempt(raw, iso, strict) ?? attempt(digits, iso, strict) : null;
  const asWritten = (strict: boolean) => attempt(`+${digits}`, undefined, strict);

  // A plus is a man saying plainly that what follows is the whole number.
  const plus = /^\s*\+/.test(raw);
  // A zero in front is him writing it the way home writes it. Nobody puts a
  // zero before a country code.
  const writtenAtHome = /^0/.test(raw.replace(/\D/g, ""));

  // 1. Written with a plus, so its own country code settles it whatever else
  //    was said. A man working in Dubai who registers his Indian mobile is
  //    recorded as Indian.
  if (plus) {
    const own = asWritten(true);
    if (own) return own;
  }

  // 1b. Digits that already begin with his own country's code, written
  //     without the plus. Accepted only when the code they carry is his
  //     country's: a German number read as though it began with an American
  //     1 is how a real number ends up in the wrong place.
  if (iso) {
    const ownAndHis = attemptFrom(digits, iso);
    if (ownAndHis) return ownAndHis;
  }

  // 2. The country he chose on the form. Asked before the bare digits are
  //    assumed to carry a code, because a German number read as though it
  //    began with an American 1 is how a real number ends up in the wrong
  //    country.
  const named = hint(true);
  if (named) return named;

  // 3. Digits that turn out to carry a country code of their own after all.
  const own = asWritten(true);
  if (own) return own;

  // 4. Written the home way, believed on length alone. Real numbers are
  //    sometimes refused by the strict rules, and his own word about where he
  //    is beats a country we would have guessed for him.
  if (writtenAtHome) {
    const home = hint(false);
    if (home) return home;
  }

  // 5. Failing all that, the countries this election is spread across. Only
  //    accepted when exactly one of them recognises the number, because two
  //    answers is the same as none.
  const guesses = new Set<string>();
  for (const region of LIKELY) {
    const guess = attempt(raw, region, true) ?? attempt(digits, region, true);
    if (guess) guesses.add(guess);
  }
  if (guesses.size === 1) return [...guesses][0];

  // 6. Last of all, believed on length: his country, then its own code. And
  //    if nothing recognises it, the digits exactly as he typed them, so no
  //    number is ever lost to a rule that did not understand it.
  return hint(false) ?? asWritten(false) ?? digits;
}
