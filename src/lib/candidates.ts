import "server-only";
import { sql, ensureSchema } from "./db";
import { displayPhone } from "./phone";

export type Candidate = { number: number; name: string; phone: string };

/**
 * The names shown on the ballot, in candidate number order. Read from the
 * register, which is the same list of people. Reading this never touches the
 * ballots table.
 *
 * The number is carried alongside the name because several men in the village
 * share a name. It is already the number that man registered with, so it
 * tells other voters nothing they could not ask him for, and it never
 * reaches a ballot.
 */
export async function getCandidates(): Promise<Candidate[]> {
  await ensureSchema();
  const rows = await sql<{ candidate_number: number; name: string; phone: string | null }[]>`
    SELECT candidate_number, name, phone FROM voters ORDER BY candidate_number
  `;
  return rows.map((r) => ({
    number: r.candidate_number,
    name: r.name,
    phone: r.phone ? displayPhone(r.phone) : "",
  }));
}
