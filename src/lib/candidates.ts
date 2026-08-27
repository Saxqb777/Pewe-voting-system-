import "server-only";
import { sql, ensureSchema } from "./db";

export type Candidate = { number: number; name: string };

/**
 * The names shown on the ballot, in candidate number order. Read from the
 * register, which is the same list of people. Reading this never touches the
 * ballots table.
 */
export async function getCandidates(): Promise<Candidate[]> {
  await ensureSchema();
  const rows = await sql<{ candidate_number: number; name: string }[]>`
    SELECT candidate_number, name FROM voters ORDER BY candidate_number
  `;
  return rows.map((r) => ({ number: r.candidate_number, name: r.name }));
}
