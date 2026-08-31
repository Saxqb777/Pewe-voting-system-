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
 * Every dialling code in the world, longest first so that 971 wins over 97
 * and 97 over 9. Splitting on a guessed length mangles numbers that are not
 * ten digits long, so the code is only ever separated when it is a real one.
 *
 * Plain data on purpose: the ballot is read on village phones over a thin
 * connection, and this is a couple of kilobytes rather than the whole of a
 * phone number library.
 */
const COUNTRY_CODES = [
  "211", "212", "213", "216", "218", "220", "221", "222", "223", "224", "225", "226",
  "227", "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238",
  "239", "240", "241", "242", "243", "244", "245", "246", "247", "248", "249", "250",
  "251", "252", "253", "254", "255", "256", "257", "258", "260", "261", "262", "263",
  "264", "265", "266", "267", "268", "269", "290", "291", "297", "298", "299", "350",
  "351", "352", "353", "354", "355", "356", "357", "358", "359", "370", "371", "372",
  "373", "374", "375", "376", "377", "378", "380", "381", "382", "383", "385", "386",
  "387", "389", "420", "421", "423", "500", "501", "502", "503", "504", "505", "506",
  "507", "508", "509", "590", "591", "592", "593", "594", "595", "596", "597", "598",
  "599", "670", "672", "673", "674", "675", "676", "677", "678", "679", "680", "681",
  "682", "683", "685", "686", "687", "688", "689", "690", "691", "692", "850", "852",
  "853", "855", "856", "880", "886", "960", "961", "962", "963", "964", "965", "966",
  "967", "968", "970", "971", "972", "973", "974", "975", "976", "977", "992", "993",
  "994", "995", "996", "998", "20", "27", "30", "31", "32", "33", "34", "36",
  "39", "40", "41", "43", "44", "45", "46", "47", "48", "49", "51", "52",
  "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65",
  "66", "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98",
  "1", "7",
];

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
