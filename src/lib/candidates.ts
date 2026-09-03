import "server-only";
import { sql, ensureSchema } from "./db";
import { displayPhone } from "./phone";

export type Candidate = {
  number: number;
  name: string;
  phone: string;
  /** True on the one row that is the man reading the ballot. */
  isYou?: boolean;
};

/**
 * The names shown on the ballot, in candidate number order. Read from the
 * register, which is the same list of people. Reading this never touches the
 * ballots table.
 *
 * The row belonging to the man reading it is marked, because nobody votes
 * for himself. Marking it here is a convenience for the screen only: the
 * refusal that matters is made again on the server when the ballot arrives.
 *
 * The number is carried alongside the name because several men in the village
 * share a name. It is already the number that man registered with, so it
 * tells other voters nothing they could not ask him for, and it never
 * reaches a ballot.
 */
export async function getCandidates(voterId?: string): Promise<Candidate[]> {
  await ensureSchema();
  const rows = await sql<
    { candidate_number: number; name: string; phone: string | null; voter_id: string }[]
  >`
    SELECT candidate_number, name, phone, voter_id FROM voters ORDER BY candidate_number
  `;
  // Marked rather than removed. A man whose own name simply vanished would
  // wonder whether his registration had gone with it, so his row stays on the
  // ballot where he can see it, and cannot be chosen.
  return rows.map((r) => ({
    number: r.candidate_number,
    name: r.name,
    phone: r.phone ? displayPhone(r.phone) : "",
    isYou: voterId !== undefined && r.voter_id === voterId,
  }));
}
