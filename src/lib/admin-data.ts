import "server-only";
import { sql, ensureSchema } from "./db";
import { getSettings } from "./settings";
import {
  config,
  SHARED_IP_FLAG_THRESHOLD,
  VOTER_FAILED_ATTEMPT_FLAG_THRESHOLD,
} from "./config";

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
    super("Results are not available until voting is closed.");
  }
}

/**
 * Counts the ballot box. Throws if voting is still open, so no code path in
 * this app can produce a partial count by accident.
 */
export async function getResults(): Promise<Results> {
  await ensureSchema();
  const settings = await getSettings();
  if (settings.votingOpen) throw new VotingStillOpenError();

  const seats = config.selectionsRequired;

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
  if (settings.votingOpen) throw new VotingStillOpenError();
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

export type Dashboard = {
  mode: "test" | "live";
  /** How many voters a roster must contain before it is accepted. */
  expectedVoterCount: number;
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
};

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

  const [settings, turnout, flags, auditRows, voterRows] = await Promise.all([
    getSettings(),
    getTurnout(),
    getFlags(),
    getAudit(40),
    voterQuery,
  ]);

  return {
    mode: settings.mode,
    expectedVoterCount: config.expectedVoterCount,
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
    audit: auditRows.map((a) => ({
      action: a.action,
      detail: a.detail,
      at: a.at.toISOString(),
    })),
  };
}
