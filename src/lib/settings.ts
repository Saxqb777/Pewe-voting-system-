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

  /** Optional scheduled window. Either end can be set on its own. */
  opensAt: Date | null;
  closesAt: Date | null;

  /**
   * Where the clock stands relative to the window.
   *   none    no window is set, so only the manual switch matters
   *   before  a start time is set and has not arrived
   *   during  inside the window
   *   after   the closing time has passed
   */
  schedule: "none" | "before" | "during" | "after";

  /** The admin's manual open switch, ignoring the clock. */
  manuallyOpen: boolean;
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
      opens_at: Date | null;
      closes_at: Date | null;
    }[]
  >`
    SELECT mode, voting_open, closed_at, election_day,
           test_voter_count, test_selections, opens_at, closes_at
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
      opensAt: null,
      closesAt: null,
      schedule: "none",
      manuallyOpen: true,
    };
  }

  const practising =
    row.mode === "test" &&
    typeof row.test_voter_count === "number" &&
    typeof row.test_selections === "number";

  // The clock and the manual switch both have to agree before a ballot opens.
  const now = Date.now();
  const opensAt = row.opens_at;
  const closesAt = row.closes_at;

  let schedule: Settings["schedule"] = "none";
  if (opensAt || closesAt) {
    if (opensAt && now < opensAt.getTime()) schedule = "before";
    else if (closesAt && now >= closesAt.getTime()) schedule = "after";
    else schedule = "during";
  }

  return {
    mode: row.mode,
    votingOpen: row.voting_open && schedule !== "before" && schedule !== "after",
    manuallyOpen: row.voting_open,
    opensAt,
    closesAt,
    schedule,
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
