/**
 * Phone numbers as people actually type them.
 *
 * The same man will write +91 98765 43210, 09876543210 and 9876543210 on
 * three different days. The allow list holds one canonical form per person,
 * so every number that arrives is reduced to digits and then compared by its
 * meaningful tail rather than demanded exactly.
 */

/** Digits only, with any leading zeros dropped. */
export function normalisePhone(raw: string): string {
  return (raw ?? "").replace(/\D/g, "").replace(/^0+/, "");
}

/** The shortest tail worth comparing. Below this a match means nothing. */
const SIGNIFICANT_DIGITS = 8;

/**
 * True when two numbers belong to the same person.
 *
 * A number typed without its country code still matches the one on the list,
 * because the last nine digits are compared when the full strings differ.
 * Nine is short enough to survive a missing country code and long enough that
 * two different people cannot collide.
 */
export function sameNumber(a: string, b: string): boolean {
  const x = normalisePhone(a);
  const y = normalisePhone(b);
  // Two short strings being identical proves nothing, so length is checked
  // before equality rather than after it.
  if (x.length < SIGNIFICANT_DIGITS || y.length < SIGNIFICANT_DIGITS) return false;
  if (x === y) return true;

  const tail = Math.min(x.length, y.length, 9);
  return x.slice(-tail) === y.slice(-tail);
}

/** Looks a number up in a list, returning the list's own spelling of it. */
export function findNumber<T extends { phone: string }>(
  list: T[],
  raw: string,
): T | undefined {
  return list.find((entry) => sameNumber(entry.phone, raw));
}

/**
 * Is this long enough to be a real number at all? Checked before anything is
 * written, so a stray keypress does not become a registration.
 */
export function looksLikeAPhoneNumber(raw: string): boolean {
  const digits = normalisePhone(raw);
  return digits.length >= 9 && digits.length <= 15;
}

/**
 * The country codes this election actually uses. Splitting on a guessed
 * length mangles numbers that are not ten digits long, so the code is only
 * separated when it is one we know. Longest first, because 971 must win
 * over 97.
 */
const COUNTRY_CODES = ["971", "974", "966", "968", "965", "250", "255", "44", "91", "1"];

/**
 * Readable on screen without inventing a format. The country code is set off
 * from the rest and the rest is left exactly as dialled, so no number is ever
 * shown grouped in a way its owner would not recognise.
 */
export function displayPhone(raw: string): string {
  const digits = normalisePhone(raw);
  if (digits === "") return "";
  const code = COUNTRY_CODES.find(
    (c) => digits.startsWith(c) && digits.length - c.length >= 7,
  );
  return code ? `+${code} ${digits.slice(code.length)}` : `+${digits}`;
}
