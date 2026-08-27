import "server-only";
import { randomInt } from "node:crypto";

/**
 * Makes Voter IDs when the admin has names but no IDs yet.
 *
 * The voting link is public, so an ID is the only thing standing between a
 * stranger and somebody else's ballot. That means the IDs must not be
 * guessable and must not follow the order of the list. They are drawn with a
 * cryptographic random number generator, not Math.random, which is
 * predictable once a few of its outputs are known.
 *
 * Six digits gives 900000 possibilities for 130 people, so a stranger has
 * roughly a one in 6900 chance per guess. With the five wrong tries per phone
 * limit and the network wide limit on top, guessing one is not realistic.
 */
export function generateVoterIds(count: number, digits = 6): string[] {
  const low = 10 ** (digits - 1);
  const high = 10 ** digits;
  const seen = new Set<string>();
  while (seen.size < count) {
    seen.add(String(randomInt(low, high)));
  }
  return [...seen];
}
