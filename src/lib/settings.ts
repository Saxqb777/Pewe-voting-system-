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

  /** True once the admin has pressed Start, or a start time has arrived. */
  hasStarted: boolean;
  /** When it began, if it has. */
  startedAt: Date | null;

  /**
   * True once the election is over: the admin closed it, or the closing time
   * has passed. Not the same as votingOpen being false, which is also true
   * before a scheduled start. Results follow this, never votingOpen, so a
   * vote that has not begun cannot show a result.
   */
  votingEnded: boolean;

  /** True while people may still put their own name and number in. */
  registrationOpen: boolean;
  /**
   * True once the admin has confirmed the roster. From that moment the list
   * of voters and candidates is fixed and registration can never reopen.
   */
  rosterLocked: boolean;
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
      started_at: Date | null;
      registration_open: boolean;
      roster_locked: boolean;
    }[]
  >`
    SELECT mode, voting_open, closed_at, election_day,
           test_voter_count, test_selections, opens_at, closes_at, started_at,
           registration_open, roster_locked
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
      hasStarted: false,
      startedAt: null,
      votingEnded: false,
      registrationOpen: false,
      rosterLocked: false,
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

  // Three states, not two. An election that has not begun is not the same as
  // one that is over, and neither is the same as one that is running.
  const hasStarted =
    row.started_at !== null || (opensAt !== null && now >= opensAt.getTime());

  const votingEnded =
    hasStarted && (row.closed_at !== null || schedule === "after");

  return {
    mode: row.mode,
    votingOpen: hasStarted && !votingEnded,
    votingEnded,
    hasStarted,
    startedAt: row.started_at,
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
    registrationOpen: row.registration_open === true && row.roster_locked !== true,
    rosterLocked: row.roster_locked === true,
  };
}
