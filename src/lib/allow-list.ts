import "server-only";
import { looksLikeAPhoneNumber } from "./phone";
import { toInternational } from "./phone-parse";

/** One person on the list of numbers allowed to register. */
export type AllowedEntry = {
  /** The number in the one spelling the whole system uses. */
  phone: string;
  /** Whatever name the list carried for it, or "" when it carried none. */
  knownName: string;
};

export type AllowList = {
  entries: AllowedEntry[];
  /** Lines that held no usable number, kept short so they can be shown back. */
  rejected: string[];
  /** How many of the entries came with a name in front of the number. */
  named: number;
};

/**
 * Pulls the name off the front of a line and the number off the end.
 *
 * The admin pastes this list out of whatever they have to hand: a contacts
 * export, a spreadsheet column, a message somebody forwarded. So the split is
 * done on a comma or a tab when there is one, and on the number itself when
 * there is not, rather than insisting on one shape and quietly dropping the
 * name of every man on a list written the other way.
 */
function splitLine(line: string): { name: string; number: string } | null {
  const parts = line
    .split(/[,\t;|]/)
    .map((p) => p.trim())
    .filter((p) => p !== "");

  if (parts.length > 1) {
    const number = parts.find(looksLikeAPhoneNumber);
    if (!number) return null;
    return { name: parts.find((p) => p !== number) ?? "", number };
  }

  // No separator, so the number has to be found at the end of the line. A
  // contacts export gives more than one man the same name and tells them
  // apart with a number on the end, so "Akbar Pewekar 2" must not have its 2
  // read as the front of a phone number.
  const words = line.split(/\s+/).filter((w) => w !== "");
  if (words.length === 0) return null;

  // Written with its country code in front, the number starts at the + and
  // runs to the end of the line however many spaces it was typed with.
  const dialled = words.findIndex((w) => /^[+(]\d/.test(w));
  if (dialled >= 0) {
    return {
      name: words.slice(0, dialled).join(" "),
      number: words.slice(dialled).join(" "),
    };
  }

  // Otherwise it is the last word, and only if that alone is too short to be
  // a number does the one before it get pulled in.
  for (let from = words.length - 1; from >= 0; from--) {
    const number = words.slice(from).join(" ");
    if (looksLikeAPhoneNumber(number)) {
      return { name: words.slice(0, from).join(" "), number };
    }
  }
  return null;
}

/**
 * Reads a pasted list into the numbers allowed to register.
 *
 * Every number is worked out the same way a voter's own number is when they
 * type it, so a list of bare national numbers still matches the man who puts
 * his number in with its country code in front.
 */
export function parseAllowList(text: string): AllowList {
  const entries: AllowedEntry[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();

  for (const line of (text ?? "").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    const split = splitLine(trimmed);
    if (!split || !looksLikeAPhoneNumber(split.number)) {
      rejected.push(trimmed.slice(0, 40));
      continue;
    }

    const phone = toInternational(split.number, null);
    if (seen.has(phone)) continue;
    seen.add(phone);
    entries.push({ phone, knownName: split.name.slice(0, 60) });
  }

  return {
    entries,
    rejected,
    named: entries.filter((e) => e.knownName !== "").length,
  };
}
