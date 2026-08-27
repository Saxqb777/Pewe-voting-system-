import "server-only";
import { sql, ensureSchema } from "./db";

export type Mode = "test" | "live";

export type Settings = {
  mode: Mode;
  votingOpen: boolean;
  closedAt: Date | null;
  electionDay: string;
};

export async function getSettings(): Promise<Settings> {
  await ensureSchema();
  const rows = await sql<
    {
      mode: Mode;
      voting_open: boolean;
      closed_at: Date | null;
      election_day: Date;
    }[]
  >`
    SELECT mode, voting_open, closed_at, election_day FROM settings WHERE id = 1
  `;
  const row = rows[0];
  if (!row) {
    return {
      mode: "test",
      votingOpen: true,
      closedAt: null,
      electionDay: new Date().toISOString().slice(0, 10),
    };
  }
  return {
    mode: row.mode,
    votingOpen: row.voting_open,
    closedAt: row.closed_at,
    electionDay:
      row.election_day instanceof Date
        ? row.election_day.toISOString().slice(0, 10)
        : String(row.election_day).slice(0, 10),
  };
}
