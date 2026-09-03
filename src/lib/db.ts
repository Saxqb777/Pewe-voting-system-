import "server-only";
import postgres from "postgres";
import { config } from "./config";
import { normaliseConnectionString } from "./connection-string";

/**
 * One connection pool per process. Kept on globalThis so that hot reload in
 * development and warm serverless instances in production do not pile up
 * connections.
 */
const globalForDb = globalThis as unknown as {
  __sql?: postgres.Sql;
  __schemaReady?: Promise<void>;
};

/**
 * Query parameters that belong to the libpq command line client, not to the
 * Postgres server. This driver forwards anything it does not recognise to the
 * server as a startup parameter, and the server then refuses the connection
 * with "unrecognized configuration parameter". Neon now puts
 * channel_binding=require on the strings it hands out, so strip these rather
 * than ask anyone to edit a connection string by hand.
 */
const CLIENT_ONLY_PARAMS = [
  "channel_binding",
  "gssencmode",
  "target_session_attrs",
  "sslrootcert",
  "sslcert",
  "sslkey",
  "sslnegotiation",
  "passfile",
  "service",
];

export function sanitiseDatabaseUrl(raw: string): string {
  let url: URL;
  const cleaned = normaliseConnectionString(raw);
  try {
    url = new URL(cleaned);
  } catch {
    // Not a URL we can parse. Hand it over and let the driver say why.
    return cleaned;
  }
  for (const param of CLIENT_ONLY_PARAMS) url.searchParams.delete(param);
  return url.toString();
}

function connect(): postgres.Sql {
  return postgres(sanitiseDatabaseUrl(config.databaseUrl), {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    // Neon's pooled endpoint runs pgbouncer in transaction mode, which does
    // not support prepared statements.
    prepare: false,
    // Never let the driver print query text or values anywhere.
    debug: false,
    onnotice: () => {},
  });
}

/**
 * The connection is opened the first time a query runs, not when this module
 * is imported, so that a build without DATABASE_URL still succeeds.
 */
function client(): postgres.Sql {
  globalForDb.__sql ??= connect();
  return globalForDb.__sql;
}

export const sql: postgres.Sql = new Proxy(
  function noop() {} as unknown as postgres.Sql,
  {
    apply(_target, _thisArg, args: unknown[]) {
      return (client() as unknown as (...a: unknown[]) => unknown)(...args);
    },
    get(_target, property) {
      const value = Reflect.get(
        client() as unknown as object,
        property,
      ) as unknown;
      return typeof value === "function"
        ? (value as (...a: unknown[]) => unknown).bind(client())
        : value;
    },
  },
);

/**
 * Creates the schema if it is not already there. Safe to call on every
 * request: the work happens once per process and every statement is guarded
 * with IF NOT EXISTS.
 *
 * The two tables that matter are deliberately unrelated. There is no foreign
 * key, no shared column and no index that could be used to pair a row in
 * ballots with a row in voters.
 */
export async function ensureSchema(): Promise<void> {
  // A failed attempt must not be remembered, or one bad moment would poison
  // every later request handled by the same instance.
  if (!globalForDb.__schemaReady) {
    globalForDb.__schemaReady = createSchema().catch((error) => {
      globalForDb.__schemaReady = undefined;
      throw error;
    });
  }
  return globalForDb.__schemaReady;
}

/**
 * Everything the app needs, as one statement batch.
 *
 * Sent in a single round trip rather than a statement at a time. The app and
 * the database can be far apart, and a cold start that spent a round trip per
 * table would burn seconds of its budget re-checking tables that already
 * exist.
 *
 * The advisory lock matters because this runs on serverless instances that
 * start in parallel. Two of them issuing CREATE TABLE IF NOT EXISTS at the
 * same instant is a known way to get a duplicate key error out of Postgres'
 * own catalog. The lock is held for the transaction, so it is released
 * whether this succeeds or fails.
 */
const SCHEMA_SQL = `
SELECT pg_advisory_xact_lock(577134922);

-- Table: voters. The register. Who is entitled to vote and whether they
-- have. Never contains a choice.
CREATE TABLE IF NOT EXISTS voters (
  voter_id            TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  candidate_number    INTEGER NOT NULL UNIQUE,
  has_voted           BOOLEAN NOT NULL DEFAULT FALSE,
  voted_at            TIMESTAMPTZ,
  device_fingerprint  TEXT,
  ip_address          TEXT,
  failed_attempts     INTEGER NOT NULL DEFAULT 0,
  is_locked           BOOLEAN NOT NULL DEFAULT FALSE,
  -- Random id of the browser session that cast this voter's ballot. Used
  -- only to make a double tap idempotent. It is not stored anywhere in the
  -- ballots table, so it links nothing.
  vote_claim          TEXT,
  -- Where this voter said they were voting from.
  --
  -- Deliberately on the register and never on a ballot. On a ballot it would
  -- be a property of the vote, and a country with only one or two voters
  -- would single those ballots out. Here it sits beside has_voted, which
  -- already says exactly who voted, so it reveals nothing new.
  country             TEXT
);

ALTER TABLE voters ADD COLUMN IF NOT EXISTS vote_claim TEXT;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS country TEXT;

-- The number this person registered with, and whether they are on the
-- roster yet. A number on the allow list is approved the moment it
-- registers. Anything else waits for the admin.
--
-- The number sits here beside the name, on the register, never on a ballot.
ALTER TABLE voters ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE voters ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

-- One registration per number. Rows loaded the old way carry no number at
-- all, so the index only covers the ones that do.
CREATE UNIQUE INDEX IF NOT EXISTS voters_phone_key
  ON voters (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS voters_status_idx ON voters (status);

-- Table: allowed_numbers. The numbers entitled to register without the
-- admin being asked. Holds no vote and no code, only who may join.
CREATE TABLE IF NOT EXISTS allowed_numbers (
  phone       TEXT PRIMARY KEY,
  known_name  TEXT NOT NULL DEFAULT '',
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: list_matches. One man, two records. The society's contact list has
-- him under an old number and he registered on a new one, so nothing in the
-- data joins the two. Only a person can say they are the same man, and this
-- is where that decision is kept so it is made once rather than every time a
-- chasing list is written. Holds no vote and no code.
CREATE TABLE IF NOT EXISTS list_matches (
  phone       TEXT PRIMARY KEY,
  -- The voter he turned out to be, or NULL when the admin has looked at the
  -- pair and said they are two different men.
  voter_id    TEXT,
  decided_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: ballots. The ballot box. What was chosen. Never contains anything
-- that identifies a person, a device, a network address or a precise moment
-- in time.
--
-- ballot_id is a random version 4 UUID, not a sequence, so the ids
-- themselves carry no ordering.
--
-- created_at is a DATE, not a timestamp. With 130 voters an hourly bucket
-- can easily hold a single person, which would identify them by matching
-- against voters.voted_at. A date cannot.
CREATE TABLE IF NOT EXISTS ballots (
  ballot_id   UUID PRIMARY KEY,
  choices     INTEGER[] NOT NULL,
  created_at  DATE NOT NULL
);

-- Table: settings. One row, id fixed at 1.
CREATE TABLE IF NOT EXISTS settings (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  mode          TEXT NOT NULL DEFAULT 'test',
  voting_open   BOOLEAN NOT NULL DEFAULT TRUE,
  closed_at     TIMESTAMPTZ,
  election_day  DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Practice run size. Only ever read while mode is 'test', and cleared by
  -- the reset that switches the election live, so a real vote can never
  -- inherit a practice number.
  test_voter_count  INTEGER,
  test_selections   INTEGER,
  -- Optional voting window. Stored with a time zone, so the moment is exact
  -- wherever the admin or a voter happens to be.
  opens_at      TIMESTAMPTZ,
  closes_at     TIMESTAMPTZ,
  -- When the admin pressed Start. Null means the election has not begun, which
  -- is a different state from open and from finished.
  started_at    TIMESTAMPTZ,
  CONSTRAINT settings_single_row CHECK (id = 1),
  CONSTRAINT settings_mode_valid CHECK (mode IN ('test', 'live'))
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS test_voter_count INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS test_selections INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
-- Registration comes before voting. While it is open people put their own
-- name and number in. Confirming locks the roster and closes it for good.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS registration_open BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS roster_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Set by the admin when somebody says they lost their code before writing it
-- down. It puts the code back on that person's own screen, and clears itself
-- the moment they say they have it.
ALTER TABLE voters ADD COLUMN IF NOT EXISTS show_code BOOLEAN NOT NULL DEFAULT FALSE;
-- Anything already running before there was a Start button counts as started.
UPDATE settings SET started_at = NOW()
  WHERE started_at IS NULL AND voting_open AND id = 1;

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Table: id_attempts. Rate limiting for the ID screen only. Rows are
-- written when an attempt FAILS. A successful entry is never recorded here,
-- so this table cannot be used to work out when any particular person voted.
CREATE TABLE IF NOT EXISTS id_attempts (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL,
  ip_address  TEXT,
  outcome     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS id_attempts_session_idx
  ON id_attempts (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS id_attempts_ip_idx
  ON id_attempts (ip_address, created_at DESC);

-- Table: session_locks. A browser session that made too many wrong ID
-- attempts. The admin can clear a lock from the dashboard. Holds no voter
-- id, because a locked session by definition never proved one.
CREATE TABLE IF NOT EXISTS session_locks (
  session_id  TEXT PRIMARY KEY,
  ip_address  TEXT,
  locked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleared_at  TIMESTAMPTZ
);

-- Table: audit_log. Admin actions only. Ballot contents are never written
-- here, and no writer in the codebase passes them.
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function createSchema(): Promise<void> {
  // One round trip to ask whether there is anything to do at all. On a warm
  // database this is the only query this function ever runs.
  //
  // EVERY new table and column has to be named here. A database from an
  // earlier version already holds all the old tables, so a check that only
  // asks about those reports itself ready, the migration never runs, and the
  // first query for a new column takes the whole site down.
  const [ready] = await sql<{ ready: boolean }[]>`
    SELECT
      to_regclass('public.settings') IS NOT NULL
      AND to_regclass('public.ballots') IS NOT NULL
      AND to_regclass('public.voters') IS NOT NULL
      AND to_regclass('public.id_attempts') IS NOT NULL
      AND to_regclass('public.session_locks') IS NOT NULL
      AND to_regclass('public.audit_log') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'voters'
          AND column_name = 'country'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'settings'
          AND column_name = 'test_selections'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'settings'
          AND column_name = 'started_at'
      )
      AND to_regclass('public.allowed_numbers') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'voters'
          AND column_name = 'status'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'settings'
          AND column_name = 'roster_locked'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'voters'
          AND column_name = 'show_code'
      )
      AND to_regclass('public.list_matches') IS NOT NULL AS ready
  `;
  if (ready?.ready) return;

  await sql.unsafe(SCHEMA_SQL).simple();
}

/**
 * Records an admin action. Callers must never pass ballot contents.
 */
export async function audit(action: string, detail = ""): Promise<void> {
  await sql`
    INSERT INTO audit_log (action, detail) VALUES (${action}, ${detail})
  `;
}

/**
 * Tries one trivial query and turns any failure into plain language.
 *
 * Shown on the admin screen so that a setup problem explains itself instead
 * of appearing as a blank page. It deliberately never echoes the driver's raw
 * message, because that can carry the database host and user name. It reports
 * what to do about it and, at most, an error code.
 */
export async function pingDatabase(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  try {
    await sql`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: explainDatabaseError(error) };
  }
}

function explainDatabaseError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "28P01":
    case "28000":
      return "The database refused the password. The connection string is out of date, most likely because the password was reset after it was copied. Copy the current one from Neon and paste it in again.";
    case "3D000":
      return "The connection string points at a database that does not exist. Copy it again from Neon.";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "The database address could not be found. The connection string is probably incomplete or has a stray space or quote mark in it. Paste it again with nothing added.";
    case "ECONNREFUSED":
      return "The database refused the connection. Check the connection string is the pooled one from Neon.";
    case "ETIMEDOUT":
    case "CONNECT_TIMEOUT":
      return "The database did not answer in time. It may be waking up after being idle. Wait ten seconds and reload this page. If it keeps happening, check the connection string.";
    case "CONNECTION_CLOSED":
    case "CONNECTION_DESTROYED":
      return "The connection to the database was dropped. Reload this page. If it keeps happening, copy the connection string again from Neon.";
    default:
      return code
        ? `The database could not be reached. The error code was ${code}. Copy the connection string again from Neon and paste it in with nothing added.`
        : "The database could not be reached. Copy the connection string again from Neon and paste it in with nothing added.";
  }
}
