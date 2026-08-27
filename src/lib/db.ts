import "server-only";
import postgres from "postgres";
import { config } from "./config";

/**
 * One connection pool per process. Kept on globalThis so that hot reload in
 * development and warm serverless instances in production do not pile up
 * connections.
 */
const globalForDb = globalThis as unknown as {
  __sql?: postgres.Sql;
  __schemaReady?: Promise<void>;
};

function connect(): postgres.Sql {
  return postgres(config.databaseUrl, {
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
  globalForDb.__schemaReady ??= createSchema();
  return globalForDb.__schemaReady;
}

async function createSchema(): Promise<void> {
  // ---------------------------------------------------------------
  // Table: voters. The register. Who is entitled to vote and whether
  // they have. Never contains a choice.
  // ---------------------------------------------------------------
  await sql`
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
      -- Random id of the browser session that cast this voter's ballot.
      -- Used only to make a double tap idempotent. It is not stored anywhere
      -- in the ballots table, so it links nothing.
      vote_claim          TEXT
    )
  `;

  // Present for databases created before vote_claim existed.
  await sql`ALTER TABLE voters ADD COLUMN IF NOT EXISTS vote_claim TEXT`;

  // ---------------------------------------------------------------
  // Table: ballots. The ballot box. What was chosen. Never contains
  // anything that identifies a person, a device, a network address or
  // a precise moment in time.
  //
  // ballot_id is a random version 4 UUID, not a sequence, so the ids
  // themselves carry no ordering.
  //
  // created_at is a DATE, not a timestamp. With 130 voters an hourly
  // bucket can easily hold a single person, which would identify them
  // by matching against voters.voted_at. A date cannot.
  // ---------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS ballots (
      ballot_id   UUID PRIMARY KEY,
      choices     INTEGER[] NOT NULL,
      created_at  DATE NOT NULL
    )
  `;

  // ---------------------------------------------------------------
  // Table: settings. One row, id fixed at 1.
  // ---------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id            INTEGER PRIMARY KEY DEFAULT 1,
      mode          TEXT NOT NULL DEFAULT 'test',
      voting_open   BOOLEAN NOT NULL DEFAULT TRUE,
      closed_at     TIMESTAMPTZ,
      election_day  DATE NOT NULL DEFAULT CURRENT_DATE,
      CONSTRAINT settings_single_row CHECK (id = 1),
      CONSTRAINT settings_mode_valid CHECK (mode IN ('test', 'live'))
    )
  `;
  await sql`
    INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING
  `;

  // ---------------------------------------------------------------
  // Table: id_attempts. Rate limiting for the ID screen only.
  // Rows are written when an attempt FAILS. A successful entry is
  // never recorded here, so this table cannot be used to work out
  // when any particular person voted.
  // ---------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS id_attempts (
      id          BIGSERIAL PRIMARY KEY,
      session_id  TEXT NOT NULL,
      ip_address  TEXT,
      outcome     TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS id_attempts_session_idx
      ON id_attempts (session_id, created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS id_attempts_ip_idx
      ON id_attempts (ip_address, created_at DESC)
  `;

  // ---------------------------------------------------------------
  // Table: session_locks. A browser session that made too many wrong ID
  // attempts. The admin can clear a lock from the dashboard. Holds no
  // voter id, because a locked session by definition never proved one.
  // ---------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS session_locks (
      session_id  TEXT PRIMARY KEY,
      ip_address  TEXT,
      locked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cleared_at  TIMESTAMPTZ
    )
  `;

  // ---------------------------------------------------------------
  // Table: audit_log. Admin actions only. Ballot contents are never
  // written here, and no writer in the codebase passes them.
  // ---------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id          BIGSERIAL PRIMARY KEY,
      action      TEXT NOT NULL,
      detail      TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

/**
 * Records an admin action. Callers must never pass ballot contents.
 */
export async function audit(action: string, detail = ""): Promise<void> {
  await sql`
    INSERT INTO audit_log (action, detail) VALUES (${action}, ${detail})
  `;
}
