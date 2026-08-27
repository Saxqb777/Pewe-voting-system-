import "server-only";
import { sql, ensureSchema } from "./db";
import { config } from "./config";

export type Mode = "test" | "live";

export type Settings = {
  mode: Mode;
  votingOpen: boolean;
  closedAt: Date | null;
  electionDay: string;
  /**
   * How many names a voter must choose, and how many the register must hold.
   *
   * In test mode these can be shrunk so a practice can run with a handful of
   * people. A real vote never sees them: they are only consulted while mode is
   * 'test', and the reset that switches the election live clears them.
   */
  selectionsRequired: number;
  expectedVoterCount: number;
  /** True when the numbers above came from a practice setting. */
  isPracticeSize: boolean;
};

export async function getSettings(): Promise<Settings> {
  await ensureSchema();
  const rows = await sql<
    {
      mode: Mode;
      voting_open: boolean;
      closed_at: Date | null;
      election_day: Date;
      test_voter_count: number | null;
      test_selections: number | null;
    }[]
  >`
    SELECT mode, voting_open, closed_at, election_day,
           test_voter_count, test_selections
    FROM settings WHERE id = 1
  `;
  const row = rows[0];

  const live = {
    selectionsRequired: config.selectionsRequired,
    expectedVoterCount: config.expectedVoterCount,
  };

  if (!row) {
    return {
      mode: "test",
      votingOpen: true,
      closedAt: null,
      electionDay: new Date().toISOString().slice(0, 10),
      ...live,
      isPracticeSize: false,
    };
  }

  const practising =
    row.mode === "test" &&
    typeof row.test_voter_count === "number" &&
    typeof row.test_selections === "number";

  return {
    mode: row.mode,
    votingOpen: row.voting_open,
    closedAt: row.closed_at,
    electionDay:
      row.election_day instanceof Date
        ? row.election_day.toISOString().slice(0, 10)
        : String(row.election_day).slice(0, 10),
    selectionsRequired: practising ? row.test_selections! : live.selectionsRequired,
    expectedVoterCount: practising ? row.test_voter_count! : live.expectedVoterCount,
    isPracticeSize: practising,
  };
}
