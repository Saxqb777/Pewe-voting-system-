"use server";

import { revalidatePath } from "next/cache";
import { sql, ensureSchema, audit } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { strings } from "@/lib/strings";
import { getClientIp } from "@/lib/request-info";
import { generateVoterIds } from "@/lib/voter-id-generator";
import { normalisePhone, looksLikeAPhoneNumber, sameNumber } from "@/lib/phone";
import { readAdminSession } from "@/lib/session";
import { config } from "@/lib/config";
import { REGISTRATION_PHRASE } from "@/lib/phrases";

/**
 * What a person is told after putting their name and number in.
 *
 * A number on the allow list is on the roster at once and is shown its code.
 * Anything else is held for the admin, and says so plainly rather than
 * pretending to have failed.
 */
export type RegisterResult =
  | { status: "registered"; code: string; name: string }
  | { status: "pending"; name: string }
  | { status: "already" }
  | { status: "closed" }
  | { status: "bad_number" }
  | { status: "bad_name" }
  | { status: "too_many" };

/** Registrations allowed from one network address in the rolling window. */
const MAX_REGISTRATIONS_PER_IP = 25;
const REGISTRATION_WINDOW_MINUTES = 60;

/** Longest name we will store. Long enough for anybody, short enough to read. */
const MAX_NAME_LENGTH = 60;
const MIN_NAME_LENGTH = 3;

function tidyName(raw: string): string {
  return (raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

/** One unused six digit code, drawn afresh if it happens to collide. */
async function freshCode(): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const [candidate] = generateVoterIds(1);
    const [clash] = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM voters WHERE voter_id = ${candidate}
    `;
    if (clash.n === 0) return candidate;
  }
  throw new Error("Could not draw an unused Voter ID.");
}

/**
 * Puts one person on the register, from their own hands.
 *
 * The name and the number are written to the register beside each other.
 * Neither ever reaches a ballot, so this changes nothing about who can see
 * how somebody voted: the answer is still nobody.
 */
export async function registerVoter(
  rawName: string,
  rawPhone: string,
): Promise<RegisterResult> {
  await ensureSchema();

  const settings = await getSettings();
  if (!settings.registrationOpen) return { status: "closed" };

  const name = tidyName(rawName);
  if (name.length < MIN_NAME_LENGTH) return { status: "bad_name" };
  if (!looksLikeAPhoneNumber(rawPhone)) return { status: "bad_number" };

  // Stops one person, or one script, filling the roster with invented people.
  const ip = await getClientIp();
  if (ip) {
    const [recent] = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM voters
      WHERE ip_address = ${ip}
        AND registered_at > NOW() - (${REGISTRATION_WINDOW_MINUTES} || ' minutes')::interval
    `;
    if (recent.n >= MAX_REGISTRATIONS_PER_IP) return { status: "too_many" };
  }

  const typed = normalisePhone(rawPhone);

  // Both lists are small enough to compare in full, which lets a number match
  // whether or not the person typed their country code.
  const [allowed, existing] = await Promise.all([
    sql<{ phone: string }[]>`SELECT phone FROM allowed_numbers`,
    sql<{ phone: string }[]>`SELECT phone FROM voters WHERE phone IS NOT NULL`,
  ]);

  if (existing.some((row) => sameNumber(row.phone, typed))) {
    return { status: "already" };
  }

  const match = allowed.find((row) => sameNumber(row.phone, typed));
  // The list's own spelling of the number wins, so one man cannot appear
  // twice under two ways of writing the same number.
  const phone = match ? normalisePhone(match.phone) : typed;
  const status = match ? "approved" : "pending";

  const code = await freshCode();

  try {
    await sql`
      INSERT INTO voters (voter_id, name, candidate_number, phone, status, registered_at, ip_address)
      VALUES (
        ${code}, ${name},
        (SELECT COALESCE(MAX(candidate_number), 0) + 1 FROM voters),
        ${phone}, ${status}, NOW(), ${ip}
      )
    `;
  } catch {
    // The unique index on the number is the last word. Two people pressing
    // the button at the same instant land here rather than both getting in.
    return { status: "already" };
  }

  await audit(
    "register",
    match ? "A number on the list registered." : "A number not on the list is waiting.",
  );
  revalidatePath("/admin");

  return match
    ? { status: "registered", code, name }
    : { status: "pending", name };
}

/**
 * What the registration screen is showing. It starts as a form, and ends
 * either holding a code or telling the person the admin has been asked.
 */
export type RegisterState =
  | { phase: "form"; error: string | null }
  | { phase: "done"; code: string; name: string }
  | { phase: "pending"; name: string };

/** The form's own entry point, so the page works before JavaScript loads. */
export async function registerVoterForm(
  _previous: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("fullName") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const result = await registerVoter(name, phone);
  const r = strings.register;

  switch (result.status) {
    case "registered":
      return { phase: "done", code: result.code, name: result.name };
    case "pending":
      return { phase: "pending", name: result.name };
    case "already":
      return { phase: "form", error: r.already };
    case "closed":
      return { phase: "form", error: r.closed };
    case "bad_name":
      return { phase: "form", error: r.badName };
    case "too_many":
      return { phase: "form", error: r.tooMany };
    default:
      return { phase: "form", error: r.badNumber };
  }
}

// ---------------------------------------------------------------- admin side

export type AdminResult = { ok: true; message?: string } | { ok: false; message: string };

const NOT_SIGNED_IN: AdminResult = { ok: false, message: "Not signed in." };

async function noBallotsYet(): Promise<AdminResult | null> {
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM ballots
  `;
  if (count > 0) {
    return {
      ok: false,
      message:
        "There are ballots in the ballot box. The roster cannot be touched once voting has begun.",
    };
  }
  return null;
}

/**
 * Replaces the list of numbers allowed to register.
 *
 * Accepts one number per line, with or without a name in front of it. Every
 * number is reduced to digits, so the list can be pasted straight out of a
 * spreadsheet or a contacts export.
 */
export async function loadAllowedNumbers(text: string): Promise<AdminResult> {
  if (!(await readAdminSession())) return NOT_SIGNED_IN;
  await ensureSchema();

  const rows: { phone: string; known_name: string }[] = [];
  const seen = new Set<string>();
  const rejected: string[] = [];

  for (const line of (text ?? "").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    // A line may be "Name,number", "number,Name" or a bare number.
    const parts = trimmed.split(/[,\t;]/).map((p) => p.trim());
    const numberPart = parts.find((p) => looksLikeAPhoneNumber(p)) ?? trimmed;
    const namePart = parts.find((p) => p !== numberPart && p !== "") ?? "";

    if (!looksLikeAPhoneNumber(numberPart)) {
      rejected.push(trimmed.slice(0, 40));
      continue;
    }
    const phone = normalisePhone(numberPart);
    if (seen.has(phone)) continue;
    seen.add(phone);
    rows.push({ phone, known_name: namePart.slice(0, 60) });
  }

  if (rows.length === 0) {
    return { ok: false, message: "No usable phone numbers were found in that list." };
  }

  await sql.begin(async (tx) => {
    await tx`DELETE FROM allowed_numbers`;
    for (const row of rows) {
      await tx`
        INSERT INTO allowed_numbers (phone, known_name)
        VALUES (${row.phone}, ${row.known_name})
        ON CONFLICT (phone) DO NOTHING
      `;
    }
  });

  await audit("load_allowed_numbers", `${rows.length} numbers allowed to register.`);
  revalidatePath("/admin");

  const note =
    rejected.length > 0
      ? ` ${rejected.length} line${rejected.length === 1 ? "" : "s"} had no usable number and were skipped.`
      : "";
  return { ok: true, message: `${rows.length} numbers can now register.${note}` };
}

/**
 * Clears the register and lets people put themselves on it.
 *
 * Destructive on purpose: any roster loaded the old way is wiped, because
 * leaving it would put people on the ballot twice, once from the old list and
 * once from their own hands.
 */
export async function openRegistration(phrase: string): Promise<AdminResult> {
  if (!(await readAdminSession())) return NOT_SIGNED_IN;
  await ensureSchema();

  const blocked = await noBallotsYet();
  if (blocked) return blocked;

  if ((phrase ?? "").trim().toUpperCase() !== REGISTRATION_PHRASE) {
    return { ok: false, message: "The confirmation phrase does not match, so nothing was changed." };
  }

  const [{ count: allowed }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM allowed_numbers
  `;
  if (allowed === 0) {
    return {
      ok: false,
      message: "Load the list of allowed numbers first, or nobody will be able to register.",
    };
  }

  await sql.begin(async (tx) => {
    await tx`DELETE FROM voters`;
    await tx`
      UPDATE settings SET
        registration_open = TRUE, roster_locked = FALSE,
        voting_open = FALSE, started_at = NULL, closed_at = NULL,
        opens_at = NULL, closes_at = NULL
      WHERE id = 1
    `;
  });

  await audit("open_registration", "The register was cleared and registration opened.");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Registration is open. People can now put their own names in." };
}

/** Lets somebody who was not on the list onto the roster. */
export async function approveRegistration(voterId: string): Promise<AdminResult> {
  if (!(await readAdminSession())) return NOT_SIGNED_IN;
  const blocked = await noBallotsYet();
  if (blocked) return blocked;

  const rows = await sql<{ name: string }[]>`
    UPDATE voters SET status = 'approved'
    WHERE voter_id = ${voterId} AND status = 'pending'
    RETURNING name
  `;
  if (rows.length === 0) return { ok: false, message: "That registration was not found." };

  await audit("approve_registration", `${rows[0].name} was approved.`);
  revalidatePath("/admin");
  return { ok: true, message: `${rows[0].name} is on the roster.` };
}

/** Removes a registration outright. Only ever used before the roster is locked. */
export async function rejectRegistration(voterId: string): Promise<AdminResult> {
  if (!(await readAdminSession())) return NOT_SIGNED_IN;
  const blocked = await noBallotsYet();
  if (blocked) return blocked;

  const rows = await sql<{ name: string }[]>`
    DELETE FROM voters WHERE voter_id = ${voterId} AND status <> 'approved'
    RETURNING name
  `;
  if (rows.length === 0) return { ok: false, message: "That registration was not found." };

  await audit("reject_registration", `${rows[0].name} was rejected.`);
  revalidatePath("/admin");
  return { ok: true, message: `${rows[0].name} was removed.` };
}

/**
 * Closes registration and fixes the roster for good.
 *
 * Anyone still waiting for approval is removed here rather than left in the
 * register, so from this moment every row in voters is a real voter and a
 * real candidate, and no other query in the app has to ask about status.
 *
 * The voting window is set from the dates held in settings, so nobody has to
 * type them on the night. The admin schedule panel can still change them.
 */
export async function confirmRoster(): Promise<AdminResult> {
  if (!(await readAdminSession())) return NOT_SIGNED_IN;
  await ensureSchema();

  const blocked = await noBallotsYet();
  if (blocked) return blocked;

  const [{ count: approved }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM voters WHERE status = 'approved'
  `;
  const seats = config.selectionsRequired;
  if (approved <= seats) {
    return {
      ok: false,
      message: `Only ${approved} people have registered, and each voter has to choose ${seats} names. Wait for more before confirming.`,
    };
  }

  const opens = config.electionOpensAt;
  const closes = config.electionClosesAt;

  await sql.begin(async (tx) => {
    await tx`DELETE FROM voters WHERE status <> 'approved'`;
    // Numbered in name order, so the ballot reads like a list rather than the
    // order people happened to register in.
    //
    // Done in two passes. The seat number is unique, and Postgres checks that
    // row by row rather than at the end of the statement, so renumbering in
    // place collides the moment one person takes a seat another still holds.
    // Moving every seat negative first leaves the positive range empty.
    await tx`UPDATE voters SET candidate_number = -candidate_number`;
    await tx`
      UPDATE voters AS v SET candidate_number = ordered.seat
      FROM (
        SELECT voter_id, ROW_NUMBER() OVER (ORDER BY LOWER(name), voter_id) AS seat
        FROM voters
      ) AS ordered
      WHERE v.voter_id = ordered.voter_id
    `;
    await tx`
      UPDATE settings SET
        registration_open = FALSE, roster_locked = TRUE,
        voting_open = TRUE, started_at = NULL, closed_at = NULL,
        opens_at = ${opens}, closes_at = ${closes}
      WHERE id = 1
    `;
  });

  await audit(
    "confirm_roster",
    `${approved} voters confirmed. Voting opens ${opens.toISOString()} and closes ${closes.toISOString()}.`,
  );
  revalidatePath("/admin");
  revalidatePath("/");

  return {
    ok: true,
    message: `${approved} voters confirmed. Voting will open on its own at the set time.`,
  };
}
