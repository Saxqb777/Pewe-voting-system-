"use server";

import { revalidatePath } from "next/cache";
import { sql, ensureSchema, audit } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getClientIp } from "@/lib/request-info";
import { normaliseVoterId } from "@/lib/voter-id";
import { parseRoster, parseNameList, duplicateNames, type RosterRow } from "@/lib/roster";
import { generateVoterIds } from "@/lib/voter-id-generator";
import { dummyVoters } from "@/lib/dummy-voters";
import {
  readAdminSession,
  writeAdminSession,
  clearAdminSession,
  passwordMatches,
} from "@/lib/session";
import { config, RESET_PHRASE, LIVE_OVERRIDE_PHRASE } from "@/lib/config";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

const DENIED: ActionResult = { ok: false, message: "Not signed in." };
const MAX_ADMIN_ATTEMPTS_PER_HOUR = 10;

async function requireAdmin(): Promise<boolean> {
  return readAdminSession();
}

export async function adminSignIn(password: string): Promise<ActionResult> {
  await ensureSchema();
  const ip = await getClientIp();

  const [row] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM id_attempts
    WHERE outcome = 'admin_wrong'
      AND ip_address IS NOT DISTINCT FROM ${ip}
      AND created_at > NOW() - make_interval(mins => 60)
  `;
  if ((row?.count ?? 0) >= MAX_ADMIN_ATTEMPTS_PER_HOUR) {
    return { ok: false, message: "Too many attempts. Please wait and try again." };
  }

  if (!passwordMatches(password ?? "")) {
    await sql`
      INSERT INTO id_attempts (session_id, ip_address, outcome)
      VALUES ('admin', ${ip}, 'admin_wrong')
    `;
    return { ok: false, message: "Wrong password." };
  }

  await writeAdminSession();
  await audit("admin_sign_in", ip ?? "");
  revalidatePath("/admin");
  return { ok: true };
}

export type AdminSignInState = { error: string | null };

/**
 * Form version of signing in, so the admin screen works before its
 * JavaScript has loaded, the same as the voter screen.
 */
export async function adminSignInForm(
  _previous: AdminSignInState,
  formData: FormData,
): Promise<AdminSignInState> {
  const result = await adminSignIn(String(formData.get("password") ?? ""));
  return { error: result.ok ? null : result.message };
}

export async function adminSignOut(): Promise<ActionResult> {
  await clearAdminSession();
  revalidatePath("/admin");
  return { ok: true };
}

export async function unlockVoter(voterId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  const id = normaliseVoterId(voterId ?? "");
  const rows = await sql<{ name: string }[]>`
    UPDATE voters SET is_locked = FALSE, failed_attempts = 0
    WHERE voter_id = ${id} RETURNING name
  `;
  if (rows.length === 0) return { ok: false, message: "No such voter." };
  await audit("unlock_voter", `${rows[0].name} (${id})`);
  revalidatePath("/admin");
  return { ok: true, message: `${rows[0].name} unlocked.` };
}

export async function unlockSession(sessionId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  await sql`
    UPDATE session_locks SET cleared_at = NOW()
    WHERE session_id = ${sessionId} AND cleared_at IS NULL
  `;
  await audit("unlock_session", sessionId.slice(0, 8));
  revalidatePath("/admin");
  return { ok: true, message: "Phone unlocked." };
}

export async function unlockAllSessions(): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  const rows = await sql`
    UPDATE session_locks SET cleared_at = NOW() WHERE cleared_at IS NULL
    RETURNING session_id
  `;
  await audit("unlock_all_sessions", `${rows.length} cleared`);
  revalidatePath("/admin");
  return { ok: true, message: `${rows.length} phones unlocked.` };
}

/**
 * Clears one voter's voted mark so they can vote again.
 * Their existing ballot stays in the ballot box, untouched and unidentifiable.
 */
export async function resetVote(voterId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  const id = normaliseVoterId(voterId ?? "");
  const rows = await sql<{ name: string }[]>`
    UPDATE voters
    SET has_voted = FALSE, voted_at = NULL, vote_claim = NULL,
        failed_attempts = 0, is_locked = FALSE
    WHERE voter_id = ${id}
    RETURNING name
  `;
  if (rows.length === 0) return { ok: false, message: "No such voter." };
  await audit(
    "reset_vote",
    `${rows[0].name} (${id}) may vote again. Their earlier ballot stays in the box and was not identified.`,
  );
  revalidatePath("/admin");
  return { ok: true, message: `${rows[0].name} can vote again.` };
}

export async function closeVoting(): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  await sql`
    UPDATE settings SET voting_open = FALSE, closed_at = NOW() WHERE id = 1
  `;
  await audit("close_voting");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Voting is closed." };
}

export async function reopenVoting(): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  await sql`
    UPDATE settings SET voting_open = TRUE, closed_at = NULL WHERE id = 1
  `;
  await audit("reopen_voting");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Voting is open again." };
}

/** Refuses any roster change once a single ballot has been cast. */
async function rosterIsEditable(): Promise<ActionResult | null> {
  const [{ count: ballots }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM ballots
  `;
  if (ballots > 0) {
    return {
      ok: false,
      message:
        "There are ballots in the ballot box. Reset for live first, or close and start a fresh election.",
    };
  }
  return null;
}

/** Writes a checked roster, numbering candidates in the order given. */
async function writeRoster(
  rows: RosterRow[],
  how: string,
): Promise<ActionResult> {
  await sql.begin(async (tx) => {
    await tx`DELETE FROM voters`;
    for (let i = 0; i < rows.length; i++) {
      await tx`
        INSERT INTO voters (voter_id, name, candidate_number)
        VALUES (${rows[i].voterId}, ${rows[i].name}, ${i + 1})
      `;
    }
  });

  await audit("load_roster", `${rows.length} voters loaded, ${how}`);
  revalidatePath("/admin");
  revalidatePath("/");

  const dupes = duplicateNames(rows);
  const warning =
    dupes.length > 0
      ? ` Warning: these names appear more than once, so voters may not be able to tell them apart: ${dupes.join(", ")}. Every name also shows its candidate number on the ballot.`
      : "";

  return { ok: true, message: `${rows.length} voters loaded.${warning}` };
}

/** Replaces the whole voter list from rows that already carry a Voter ID. */
export async function loadRoster(csvText: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  await ensureSchema();

  const blocked = await rosterIsEditable();
  if (blocked) return blocked;

  const parsed = parseRoster(
    csvText ?? "",
    config.expectedVoterCount,
    normaliseVoterId,
  );
  if (!parsed.ok) return { ok: false, message: parsed.error };

  return writeRoster(parsed.rows, "IDs supplied by the admin");
}

/**
 * Replaces the whole voter list from names alone, making a Voter ID for each.
 *
 * The IDs are drawn with a cryptographic random number generator and are
 * deliberately unrelated to the order of the list, so knowing one person's ID
 * tells you nothing about anybody else's.
 */
export async function loadRosterFromNames(
  namesText: string,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  await ensureSchema();

  const blocked = await rosterIsEditable();
  if (blocked) return blocked;

  const parsed = parseNameList(namesText ?? "", config.expectedVoterCount);
  if (!parsed.ok) return { ok: false, message: parsed.error };

  const ids = generateVoterIds(parsed.names.length);
  const rows: RosterRow[] = parsed.names.map((name, i) => ({
    name,
    voterId: ids[i],
  }));

  const result = await writeRoster(rows, "IDs made by the system");
  if (!result.ok) return result;
  return {
    ok: true,
    message: `${rows.length} voters loaded and a Voter ID made for each one. Download the Voter ID sheet below, then hand each person only their own ID.`,
  };
}

/** Fills the register with made up people so the practice run can be done. */
export async function loadDummyVoters(): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  const settings = await getSettings();
  if (settings.mode !== "test") {
    return { ok: false, message: "Dummy voters can only be loaded in test mode." };
  }
  const csv = dummyVoters(config.expectedVoterCount)
    .map((v) => `${v.voterId},${v.name}`)
    .join("\n");
  return loadRoster(csv);
}

/**
 * Wipes every ballot, clears every mark, flag and lock, and switches to live.
 * Requires a typed phrase, plus a second phrase once the election is live.
 */
export async function resetForLive(
  phrase: string,
  overridePhrase: string,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  await ensureSchema();

  if ((phrase ?? "").trim().toUpperCase() !== RESET_PHRASE) {
    return { ok: false, message: "The confirmation phrase does not match." };
  }

  const settings = await getSettings();
  if (settings.mode === "live") {
    if ((overridePhrase ?? "").trim().toUpperCase() !== LIVE_OVERRIDE_PHRASE) {
      return {
        ok: false,
        message:
          "This election is already live. The second confirmation phrase does not match, so nothing was changed.",
      };
    }
  }

  await sql.begin(async (tx) => {
    await tx`DELETE FROM ballots`;
    await tx`
      UPDATE voters SET
        has_voted = FALSE,
        voted_at = NULL,
        vote_claim = NULL,
        device_fingerprint = NULL,
        ip_address = NULL,
        failed_attempts = 0,
        is_locked = FALSE
    `;
    await tx`DELETE FROM id_attempts`;
    await tx`DELETE FROM session_locks`;
    await tx`
      UPDATE settings SET mode = 'live', voting_open = TRUE,
        closed_at = NULL, election_day = CURRENT_DATE
      WHERE id = 1
    `;
  });

  await audit(
    "reset_for_live",
    settings.mode === "live"
      ? "A live election was wiped and restarted."
      : "Test data wiped. Mode switched to live.",
  );
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Everything is reset. The election is now live." };
}

/** Puts the app back into test mode. Only allowed when nothing has been cast. */
export async function switchToTestMode(): Promise<ActionResult> {
  if (!(await requireAdmin())) return DENIED;
  const [{ count: ballots }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM ballots
  `;
  if (ballots > 0) {
    return {
      ok: false,
      message: "There are ballots in the ballot box. Reset for live first.",
    };
  }
  await sql`UPDATE settings SET mode = 'test' WHERE id = 1`;
  await audit("switch_to_test_mode");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Back in test mode." };
}
