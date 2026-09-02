import "server-only";
import { sql, ensureSchema } from "./db";
import { getSettings } from "./settings";
import {
  config,
  SHARED_IP_FLAG_THRESHOLD,
  VOTER_FAILED_ATTEMPT_FLAG_THRESHOLD,
} from "./config";
import { describeGap, describeGapHi } from "./countdown";
import { displayPhone } from "./phone";
import { strings } from "./strings";

/** A moment in the hour the village agreed on, which is India time. */
function readableMoment(when: Date): string {
  return `${when.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} India time`;
}

export type Turnout = { total: number; voted: number; ballots: number };

/**
 * The only live number the admin ever sees. It says how many people have
 * voted. It says nothing at all about what anybody chose.
 */
export async function getTurnout(): Promise<Turnout> {
  await ensureSchema();
  const [row] = await sql<
    { total: number; voted: number; ballots: number }[]
  >`
    SELECT
      (SELECT COUNT(*)::int FROM voters) AS total,
      (SELECT COUNT(*)::int FROM voters WHERE has_voted) AS voted,
      (SELECT COUNT(*)::int FROM ballots) AS ballots
  `;
  return row ?? { total: 0, voted: 0, ballots: 0 };
}

export type PendingVoter = { voterId: string; name: string };

export async function getPending(): Promise<PendingVoter[]> {
  await ensureSchema();
  const rows = await sql<{ voter_id: string; name: string }[]>`
    SELECT voter_id, name FROM voters WHERE NOT has_voted ORDER BY name
  `;
  return rows.map((r) => ({ voterId: r.voter_id, name: r.name }));
}

export type Flags = {
  sharedDevices: { fingerprint: string; voters: PendingVoter[] }[];
  sharedIps: { ip: string; voters: PendingVoter[] }[];
  failedVoters: { voterId: string; name: string; attempts: number }[];
  lockedVoters: PendingVoter[];
  lockedSessions: { sessionId: string; ip: string | null; lockedAt: Date }[];
};

/** Warnings for the admin to look at. Nothing here blocks anybody. */
export async function getFlags(): Promise<Flags> {
  await ensureSchema();

  const deviceQuery = sql<
    { device_fingerprint: string; voter_id: string; name: string }[]
  >`
    SELECT device_fingerprint, voter_id, name FROM voters
    WHERE device_fingerprint IS NOT NULL
      AND device_fingerprint IN (
        SELECT device_fingerprint FROM voters
        WHERE device_fingerprint IS NOT NULL
        GROUP BY device_fingerprint HAVING COUNT(*) > 1
      )
    ORDER BY device_fingerprint, name
  `;

  const ipQuery = sql<
    { ip_address: string; voter_id: string; name: string }[]
  >`
    SELECT ip_address, voter_id, name FROM voters
    WHERE ip_address IS NOT NULL
      AND ip_address IN (
        SELECT ip_address FROM voters
        WHERE ip_address IS NOT NULL
        GROUP BY ip_address HAVING COUNT(*) >= ${SHARED_IP_FLAG_THRESHOLD}
      )
    ORDER BY ip_address, name
  `;

  const failedQuery = sql<
    { voter_id: string; name: string; failed_attempts: number }[]
  >`
    SELECT voter_id, name, failed_attempts FROM voters
    WHERE failed_attempts >= ${VOTER_FAILED_ATTEMPT_FLAG_THRESHOLD}
    ORDER BY failed_attempts DESC, name
  `;

  const lockedVoterQuery = sql<{ voter_id: string; name: string }[]>`
    SELECT voter_id, name FROM voters WHERE is_locked ORDER BY name
  `;

  const lockedSessionQuery = sql<
    { session_id: string; ip_address: string | null; locked_at: Date }[]
  >`
    SELECT session_id, ip_address, locked_at FROM session_locks
    WHERE cleared_at IS NULL ORDER BY locked_at DESC
  `;

  // Sent together rather than one after another. The app and the database can
  // be far apart, and five round trips in a row is five times the wait.
  const [
    deviceRows,
    ipRows,
    failedRows,
    lockedVoterRows,
    lockedSessionRows,
  ] = await Promise.all([
    deviceQuery,
    ipQuery,
    failedQuery,
    lockedVoterQuery,
    lockedSessionQuery,
  ]);

  return {
    sharedDevices: group(deviceRows, (r) => r.device_fingerprint).map(
      ([fingerprint, rows]) => ({
        fingerprint,
        voters: rows.map((r) => ({ voterId: r.voter_id, name: r.name })),
      }),
    ),
    sharedIps: group(ipRows, (r) => r.ip_address).map(([ip, rows]) => ({
      ip,
      voters: rows.map((r) => ({ voterId: r.voter_id, name: r.name })),
    })),
    failedVoters: failedRows.map((r) => ({
      voterId: r.voter_id,
      name: r.name,
      attempts: r.failed_attempts,
    })),
    lockedVoters: lockedVoterRows.map((r) => ({
      voterId: r.voter_id,
      name: r.name,
    })),
    lockedSessions: lockedSessionRows.map((r) => ({
      sessionId: r.session_id,
      ip: r.ip_address,
      lockedAt: r.locked_at,
    })),
  };
}

function group<T>(rows: T[], key: (row: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return [...map.entries()];
}

export type CountryCount = { country: string | null; count: number };

/** How many people voted from each country. Read from the register only. */
export async function getCountryCounts(): Promise<CountryCount[]> {
  await ensureSchema();
  return sql<CountryCount[]>`
    SELECT country, COUNT(*)::int AS count
    FROM voters WHERE has_voted
    GROUP BY country
    ORDER BY COUNT(*) DESC, country NULLS LAST
  `;
}

export type AuditEntry = { action: string; detail: string; at: Date };

export async function getAudit(limit = 60): Promise<AuditEntry[]> {
  await ensureSchema();
  const rows = await sql<
    { action: string; detail: string; created_at: Date }[]
  >`
    SELECT action, detail, created_at FROM audit_log
    ORDER BY created_at DESC, id DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({
    action: r.action,
    detail: r.detail,
    at: r.created_at,
  }));
}

// --------------------------------------------------------------------------
// Results. Locked until voting is closed.
// --------------------------------------------------------------------------

export type ResultRow = {
  rank: number;
  number: number;
  name: string;
  votes: number;
  isWinner: boolean;
};

export type Results = {
  rows: ResultRow[];
  totalBallots: number;
  totalVoters: number;
  totalMarkedVoted: number;
  totalVotesCast: number;
  seats: number;
  tie: null | { votes: number; place: number; names: string[] };
};

export class VotingStillOpenError extends Error {
  constructor() {
    super("Results are not available until voting has finished.");
  }
}

/**
 * Counts the ballot box. Throws if voting is still open, so no code path in
 * this app can produce a partial count by accident.
 */
export async function getResults(): Promise<Results> {
  await ensureSchema();
  const settings = await getSettings();
  // Gated on the election being over, not merely not open. Before a scheduled
  // start neither is true, and a vote that has not begun has no result.
  if (!settings.votingEnded) throw new VotingStillOpenError();

  const seats = settings.selectionsRequired;

  // Ballots are read in a randomised order, as they always are.
  const tally = await sql<{ choice: number; votes: number }[]>`
    SELECT choice, COUNT(*)::int AS votes
    FROM (
      SELECT unnest(choices) AS choice
      FROM (SELECT choices FROM ballots ORDER BY random()) shuffled
    ) flat
    GROUP BY choice
  `;
  const votesByNumber = new Map(tally.map((t) => [t.choice, t.votes]));

  const people = await sql<{ candidate_number: number; name: string }[]>`
    SELECT candidate_number, name FROM voters ORDER BY candidate_number
  `;

  const [counts] = await sql<
    { ballots: number; voters: number; marked: number }[]
  >`
    SELECT
      (SELECT COUNT(*)::int FROM ballots) AS ballots,
      (SELECT COUNT(*)::int FROM voters) AS voters,
      (SELECT COUNT(*)::int FROM voters WHERE has_voted) AS marked
  `;

  const ranked = people
    .map((p) => ({
      number: p.candidate_number,
      name: p.name,
      votes: votesByNumber.get(p.candidate_number) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes || a.number - b.number);

  // A tie matters only where it straddles the last winning place.
  let tie: Results["tie"] = null;
  if (ranked.length > seats) {
    const boundaryVotes = ranked[seats - 1].votes;
    if (ranked[seats].votes === boundaryVotes) {
      const clear = ranked.filter((r) => r.votes > boundaryVotes).length;
      tie = {
        votes: boundaryVotes,
        place: clear + 1,
        names: ranked
          .filter((r) => r.votes === boundaryVotes)
          .map((r) => `${r.number}. ${r.name}`),
      };
    }
  }

  // Anyone caught in an unbroken boundary tie is not marked a winner, because
  // the tie has to be settled by village rules first.
  const tieVotes = tie?.votes ?? null;
  const rows: ResultRow[] = ranked.map((r, i) => ({
    rank: i + 1,
    number: r.number,
    name: r.name,
    votes: r.votes,
    isWinner: i < seats && (tieVotes === null || r.votes !== tieVotes),
  }));

  return {
    rows,
    totalBallots: counts?.ballots ?? 0,
    totalVoters: counts?.voters ?? 0,
    totalMarkedVoted: counts?.marked ?? 0,
    totalVotesCast: tally.reduce((sum, t) => sum + t.votes, 0),
    seats,
    tie,
  };
}

/** Every ballot, contents only, in a fresh random order. */
export async function getAnonymousBallots(): Promise<number[][]> {
  await ensureSchema();
  const settings = await getSettings();
  if (!settings.votingEnded) throw new VotingStillOpenError();
  const rows = await sql<{ choices: number[] }[]>`
    SELECT choices FROM ballots ORDER BY random()
  `;
  return rows.map((r) => r.choices);
}

// --------------------------------------------------------------------------
// One JSON safe snapshot, used both for the first render and for polling.
// --------------------------------------------------------------------------

export type VoterRow = {
  voterId: string;
  name: string;
  number: number;
  hasVoted: boolean;
  votedAt: string | null;
  isLocked: boolean;
  failedAttempts: number;
};

/** One person who has put themselves on the register. */
export type Registration = {
  voterId: string;
  name: string;
  phone: string;
  registeredAt: string | null;
  /** The name the society already had for this number, if it had one. */
  knownName: string;
  /** True while the admin has put this person's code back on their screen. */
  showingCode: boolean;
};

export type RegistrationState = {
  /** True while people may still register. */
  open: boolean;
  /** True once the roster has been confirmed and fixed. */
  locked: boolean;
  /** How many numbers are allowed to register at all. */
  allowedCount: number;
  /** Registered and on the roster. */
  approved: Registration[];
  /** Registered from a number nobody recognises, waiting on the admin. */
  pending: Registration[];
  /** Allowed numbers that have not registered yet. */
  missing: { phone: string; knownName: string }[];
};

export type Dashboard = {
  registration: RegistrationState;
  mode: "test" | "live";
  /** How many voters a roster must contain before it is accepted. */
  expectedVoterCount: number;
  /** How many names each voter must choose. */
  selectionsRequired: number;
  /** True when those two numbers are a practice size rather than the real one. */
  isPracticeSize: boolean;
  /** The real numbers, so the admin can see what live will use. */
  liveVoterCount: number;
  liveSelections: number;
  /** Scheduled voting window, as exact moments. */
  opensAt: string | null;
  closesAt: string | null;
  /** The dates confirming the roster will set, unless they are overridden. */
  defaultOpensAt: string;
  defaultClosesAt: string;
  schedule: "none" | "before" | "during" | "after";
  /** True once the election is over and results may be read. */
  votingEnded: boolean;
  /** True once voting has begun. */
  hasStarted: boolean;
  votingOpen: boolean;
  closedAt: string | null;
  turnout: Turnout;
  voters: VoterRow[];
  flags: {
    sharedDevices: { fingerprint: string; voters: PendingVoter[] }[];
    sharedIps: { ip: string; voters: PendingVoter[] }[];
    failedVoters: { voterId: string; name: string; attempts: number }[];
    lockedVoters: PendingVoter[];
    lockedSessions: { sessionId: string; ip: string | null; lockedAt: string }[];
  };
  audit: { action: string; detail: string; at: string }[];
  countries: CountryCount[];
  report: Report;
  /** Where this site actually lives, for the link the admin hands out. */
  siteUrl: string;
};

/**
 * Who has registered, who is waiting, and who has not turned up yet.
 *
 * Read straight from the register. It holds names and numbers and never a
 * choice, so none of this can be joined to a ballot.
 */
export async function getRegistrationState(): Promise<RegistrationState> {
  await ensureSchema();

  const [settings, people, allowed] = await Promise.all([
    getSettings(),
    sql<
      {
        voter_id: string;
        name: string;
        phone: string | null;
        status: string;
        registered_at: Date | null;
        show_code: boolean;
      }[]
    >`
      SELECT voter_id, name, phone, status, registered_at, show_code
      FROM voters WHERE phone IS NOT NULL
      ORDER BY registered_at DESC NULLS LAST, LOWER(name)
    `,
    sql<{ phone: string; known_name: string }[]>`
      SELECT phone, known_name FROM allowed_numbers ORDER BY known_name, phone
    `,
  ]);

  const known = new Map(allowed.map((a) => [a.phone, a.known_name]));
  const shape = (r: (typeof people)[number]): Registration => ({
    voterId: r.voter_id,
    name: r.name,
    phone: r.phone ?? "",
    registeredAt: r.registered_at ? r.registered_at.toISOString() : null,
    knownName: known.get(r.phone ?? "") ?? "",
    showingCode: r.show_code === true,
  });

  const registered = new Set(people.map((p) => p.phone ?? ""));

  return {
    open: settings.registrationOpen,
    locked: settings.rosterLocked,
    allowedCount: allowed.length,
    approved: people.filter((p) => p.status === "approved").map(shape),
    pending: people.filter((p) => p.status === "pending").map(shape),
    missing: allowed
      .filter((a) => !registered.has(a.phone))
      .map((a) => ({ phone: a.phone, knownName: a.known_name })),
  };
}

export async function getDashboard(): Promise<Dashboard> {
  await ensureSchema();
  const voterQuery = sql<
    {
      voter_id: string;
      name: string;
      candidate_number: number;
      has_voted: boolean;
      voted_at: Date | null;
      is_locked: boolean;
      failed_attempts: number;
    }[]
  >`
    SELECT voter_id, name, candidate_number, has_voted, voted_at,
           is_locked, failed_attempts
    FROM voters ORDER BY name
  `;

  const [
    settings, turnout, flags, auditRows, voterRows, countries, registration, report,
  ] = await Promise.all([
      getSettings(),
      getTurnout(),
      getFlags(),
      getAudit(40),
      voterQuery,
      getCountryCounts(),
      getRegistrationState(),
      getReport(),
    ]);

  return {
    registration,
    mode: settings.mode,
    expectedVoterCount: settings.expectedVoterCount,
    selectionsRequired: settings.selectionsRequired,
    isPracticeSize: settings.isPracticeSize,
    liveVoterCount: config.expectedVoterCount,
    liveSelections: config.selectionsRequired,
    opensAt: settings.opensAt ? settings.opensAt.toISOString() : null,
    closesAt: settings.closesAt ? settings.closesAt.toISOString() : null,
    defaultOpensAt: config.electionOpensAt.toISOString(),
    defaultClosesAt: config.electionClosesAt.toISOString(),
    schedule: settings.schedule,
    votingEnded: settings.votingEnded,
    hasStarted: settings.hasStarted,
    votingOpen: settings.votingOpen,
    closedAt: settings.closedAt ? settings.closedAt.toISOString() : null,
    turnout,
    voters: voterRows.map((r) => ({
      voterId: r.voter_id,
      name: r.name,
      number: r.candidate_number,
      hasVoted: r.has_voted,
      votedAt: r.voted_at ? r.voted_at.toISOString() : null,
      isLocked: r.is_locked,
      failedAttempts: r.failed_attempts,
    })),
    flags: {
      sharedDevices: flags.sharedDevices,
      sharedIps: flags.sharedIps,
      failedVoters: flags.failedVoters,
      lockedVoters: flags.lockedVoters,
      lockedSessions: flags.lockedSessions.map((s) => ({
        sessionId: s.sessionId,
        ip: s.ip,
        lockedAt: s.lockedAt.toISOString(),
      })),
    },
    countries,
    report,
    siteUrl: config.siteUrl,
    audit: auditRows.map((a) => ({
      action: a.action,
      detail: a.detail,
      at: a.at.toISOString(),
    })),
  };
}

// --------------------------------------------------------------------------
// The list that can be shared
// --------------------------------------------------------------------------

export type RegisteredRow = { name: string; phone: string; joined: string };

/**
 * Who has registered, in the order they arrived.
 *
 * Names, numbers and the moment each one came in. Deliberately no voting
 * code: this list is made to be sent to the whole group, and a code on it
 * would let any reader vote as its owner.
 */
export async function getRegisteredList(): Promise<RegisteredRow[]> {
  await ensureSchema();
  const rows = await sql<
    { name: string; phone: string | null; registered_at: Date | null }[]
  >`
    SELECT name, phone, registered_at FROM voters
    WHERE status = 'approved'
    ORDER BY registered_at NULLS LAST, name
  `;
  return rows.map((r) => ({
    name: r.name,
    phone: r.phone ? displayPhone(r.phone) : "",
    joined: r.registered_at
      ? r.registered_at.toLocaleString("en-GB", {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "",
  }));
}

// --------------------------------------------------------------------------
// What the whole village may see
// --------------------------------------------------------------------------

export type PublicStatus = {
  takenAt: string;
  expected: number;
  registered: number;
  stillToCome: number;
  /** Null once registration has closed, or if it never opened. */
  opensAt: string | null;
  registrationOpen: boolean;
  rosterLocked: boolean;
  votingOpen: boolean;
  votingEnded: boolean;
  /** Name, number and the moment each one arrived. Never a code. */
  people: { name: string; phone: string; joined: string }[];
};

/**
 * The same figures the admin sees, minus everything that is his business
 * alone.
 *
 * No voting codes, ever: this page needs no password, and a code on it would
 * let any reader vote as its owner. The numbers are here at the society's
 * own decision, so a man can find himself among names that repeat.
 */
export async function getPublicStatus(): Promise<PublicStatus> {
  await ensureSchema();
  const settings = await getSettings();

  const [counts] = await sql<{ registered: number; still: number }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM voters WHERE status = 'approved') AS registered,
      (SELECT COUNT(*)::int FROM allowed_numbers a
        WHERE NOT EXISTS (SELECT 1 FROM voters v WHERE v.phone = a.phone)) AS still
  `;

  const rows = await sql<
    { name: string; phone: string | null; registered_at: Date | null }[]
  >`
    SELECT name, phone, registered_at FROM voters
    WHERE status = 'approved'
    ORDER BY registered_at NULLS LAST, name
  `;

  const opening = settings.opensAt ?? config.electionOpensAt;

  return {
    takenAt: new Date().toISOString(),
    expected: config.expectedTurnout,
    registered: counts?.registered ?? 0,
    stillToCome: counts?.still ?? 0,
    opensAt: opening.getTime() > Date.now() ? opening.toISOString() : null,
    registrationOpen: settings.registrationOpen,
    rosterLocked: settings.rosterLocked,
    votingOpen: settings.votingOpen,
    votingEnded: settings.votingEnded,
    people: rows.map((r) => ({
      name: r.name,
      phone: r.phone ? displayPhone(r.phone) : "",
      joined: r.registered_at
        ? r.registered_at.toLocaleString("en-GB", {
            timeZone: "Asia/Kolkata",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "",
    })),
  };
}

// --------------------------------------------------------------------------
// The report
// --------------------------------------------------------------------------

export type ReportLine = {
  label: string;
  /** The same line for a reader who would rather have it in Hinglish. */
  labelHi: string;
  count: number;
  /** Share of the figure this line is measured against, or null when none. */
  percent: number | null;
  /** What that percentage is out of, for anyone reading the export later. */
  outOf: string;
  outOfHi: string;
};

export type Report = {
  takenAt: string;
  stage: string;
  stageHi: string;
  expected: number;
  /** How the pace reads in one sentence, or empty before registration opens. */
  pace: string;
  paceHi: string;
  target: ReportLine[];
  registration: ReportLine[];
  voting: ReportLine[];
  countries: ReportLine[];
};

const share = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;

/**
 * Where the election has got to, in figures.
 *
 * Everything here is counted from the register alone. The ballot box is asked
 * one question, how many ballots it holds, which is the same number the
 * turnout panel already shows and says nothing about anybody's choices.
 */
export async function getReport(): Promise<Report> {
  await ensureSchema();

  const settings = await getSettings();
  const hi = strings.admin.hi;
  const expected = config.expectedTurnout;

  const [row] = await sql<
    {
      allowed: number;
      approved: number;
      pending: number;
      voted: number;
      ballots: number;
      off_list: number;
    }[]
  >`
    SELECT
      (SELECT COUNT(*)::int FROM allowed_numbers) AS allowed,
      (SELECT COUNT(*)::int FROM voters WHERE status = 'approved') AS approved,
      (SELECT COUNT(*)::int FROM voters WHERE status <> 'approved') AS pending,
      (SELECT COUNT(*)::int FROM voters WHERE has_voted) AS voted,
      (SELECT COUNT(*)::int FROM ballots) AS ballots,
      (SELECT COUNT(*)::int FROM voters v
        WHERE NOT EXISTS (
          SELECT 1 FROM allowed_numbers a WHERE a.phone = v.phone
        )) AS off_list
  `;
  const counts = row ?? {
    allowed: 0, approved: 0, pending: 0, voted: 0, ballots: 0, off_list: 0,
  };

  const [stillOut] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM allowed_numbers a
    WHERE NOT EXISTS (SELECT 1 FROM voters v WHERE v.phone = a.phone)
  `;

  /** One figure, written once in each language. */
  const line = (
    label: string,
    labelHi: string,
    count: number,
    against: { whole: number; outOf: string; outOfHi: string } | null,
  ): ReportLine => ({
    label,
    labelHi,
    count,
    percent: against ? share(count, against.whole) : null,
    outOf: against?.outOf ?? "",
    outOfHi: against?.outOfHi ?? "",
  });

  const onRoster = counts.approved;
  const everybody = onRoster + counts.pending;
  const ofExpected = {
    whole: expected, outOf: "expected", outOfHi: hi.outOfBases.expected,
  };
  const ofAllowed = {
    whole: counts.allowed, outOf: "allowed numbers", outOfHi: hi.outOfBases.allowed,
  };
  const ofRoster = {
    whole: onRoster, outOf: "the roster", outOfHi: hi.outOfBases.roster,
  };
  const ofEverybody = {
    whole: everybody, outOf: "everybody registered", outOfHi: hi.outOfBases.everybody,
  };

  const [stage, stageHi] = settings.registrationOpen
    ? ["Registration is open", hi.stages.registering]
    : settings.votingEnded
      ? ["Voting is closed", hi.stages.closed]
      : settings.votingOpen
        ? ["Voting is open", hi.stages.voting]
        : settings.rosterLocked
          ? ["Voter list confirmed, waiting for voting to open", hi.stages.confirmed]
          : ["Not started", hi.stages.idle];

  // --- how far along we ought to be by now -------------------------------
  //
  // Registration has a start and a hard end: the hour voting opens. Spread
  // the expected turnout evenly across that window and the target for this
  // minute falls out, which is the difference between a number that means
  // something and a number that just goes up.
  const [opened] = await sql<{ at: Date }[]>`
    SELECT created_at AS at FROM audit_log
    WHERE action = 'open_registration' ORDER BY created_at DESC LIMIT 1
  `;
  const [firstIn] = await sql<{ at: Date | null }[]>`
    SELECT MIN(registered_at) AS at FROM voters
  `;
  const startedAt = opened?.at ?? firstIn?.at ?? null;
  const deadline = settings.opensAt ?? config.electionOpensAt;

  const now = Date.now();
  const target: ReportLine[] = [];
  let pace = "";
  let paceHi = "";

  if (startedAt) {
    const left = Math.max(0, deadline.getTime() - now);
    const elapsed = Math.max(1, now - startedAt.getTime());
    const stillNeeded = Math.max(0, expected - onRoster);

    // Read the way a chase is read: what is left to get, over the time
    // remaining, set beside what is actually arriving. Counted per day while
    // days remain and per hour once the last one starts, because "3 a day"
    // means nothing at seven in the morning on the day itself.
    const perHour = left > 0 && left < 2 * 86400e3;
    const unit = perHour ? 3600e3 : 86400e3;
    const timeLeft = left / unit;
    const needRate = timeLeft > 0 ? Math.ceil(stillNeeded / timeLeft) : stillNeeded;
    const comingRate = Math.round(onRoster / (elapsed / unit));

    const by = readableMoment(deadline);
    target.push(
      line(strings.admin.reportTargetBy(by), hi.targetBy(by), expected, null),
      line(strings.admin.reportSoFar, hi.soFar, onRoster, ofExpected),
      line(strings.admin.reportStillNeeded, hi.stillNeeded, stillNeeded, ofExpected),
      line(
        perHour ? strings.admin.reportNeededPerHour : strings.admin.reportNeededPerDay,
        perHour ? hi.neededPerHour : hi.neededPerDay,
        needRate,
        null,
      ),
      line(
        perHour ? strings.admin.reportComingPerHour : strings.admin.reportComingPerDay,
        perHour ? hi.comingPerHour : hi.comingPerDay,
        comingRate,
        null,
      ),
    );

    if (left === 0) {
      pace = strings.admin.reportPaceOver(onRoster, expected);
      paceHi = hi.paceOver(onRoster, expected);
    } else if (stillNeeded === 0) {
      pace = strings.admin.reportPaceReached(onRoster, expected);
      paceHi = hi.paceReached(onRoster, expected);
    } else {
      pace = strings.admin.reportPaceNeeded(
        stillNeeded,
        describeGap(left),
        strings.admin.reportRate(needRate, perHour ? "hour" : "day"),
        strings.admin.reportRate(comingRate, perHour ? "hour" : "day"),
      );
      paceHi = hi.paceNeeded(
        stillNeeded,
        describeGapHi(left),
        hi.rate(needRate, perHour ? "ghanta" : "din"),
        hi.rate(comingRate, perHour ? "ghanta" : "din"),
      );
    }
  }

  const countries = await sql<{ country: string | null; n: number }[]>`
    SELECT country, COUNT(*)::int AS n FROM voters
    GROUP BY country ORDER BY COUNT(*) DESC, country NULLS LAST
  `;

  return {
    takenAt: new Date().toISOString(),
    stage,
    stageHi,
    expected,
    pace,
    paceHi,
    target,
    registration: [
      line("Expected to take part", hi.lines.expectedToTakePart, expected, null),
      line("Numbers allowed to register", hi.lines.allowed, counts.allowed, ofExpected),
      line("Registered and on the roster", hi.lines.onRoster, onRoster, ofExpected),
      line("Waiting for approval", hi.lines.waiting, counts.pending, ofExpected),
      line("On your list, not registered yet", hi.lines.stillOut, stillOut?.n ?? 0, ofAllowed),
      line(
        "Registered from a number not on your list",
        hi.lines.offList,
        counts.off_list,
        ofEverybody,
      ),
    ],
    voting: [
      line("On the roster", hi.lines.rosterTotal, onRoster, null),
      line("Voted", hi.lines.voted, counts.voted, ofRoster),
      line("Not voted yet", hi.lines.notVoted, Math.max(0, onRoster - counts.voted), ofRoster),
      line("Ballots in the ballot box", hi.lines.ballots, counts.ballots, ofRoster),
    ],
    // Country names stay as they are written on the form in both files.
    countries: countries.map((c) =>
      line(c.country ?? "Not given", c.country ?? hi.lines.noCountry, c.n, ofEverybody),
    ),
  };
}
