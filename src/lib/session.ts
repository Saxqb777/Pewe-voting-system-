import "server-only";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { config } from "./config";

const VOTER_COOKIE = "pv_s";
const ADMIN_COOKIE = "pv_a";

const VOTER_MAX_AGE = 60 * 60 * 6; // 6 hours
const ADMIN_MAX_AGE = 60 * 60 * 8; // 8 hours

export type VoterSession = {
  /** Random id for this browser session. Used only for rate limiting. */
  sid: string;
  /** Voter id this session has proved it holds. Cleared once the vote is in. */
  voterId?: string;
  /** True once this session has successfully cast its ballot. */
  voted?: boolean;
};

function b64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payload: string): string {
  return b64url(
    createHmac("sha256", config.sessionSecret).update(payload).digest(),
  );
}

function seal(value: unknown): string {
  const payload = b64url(Buffer.from(JSON.stringify(value), "utf8"));
  return `${payload}.${sign(payload)}`;
}

function unseal<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const provided = raw.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Reads the voter session, or returns a fresh unsaved one. */
export async function readVoterSession(): Promise<VoterSession> {
  const jar = await cookies();
  const existing = unseal<VoterSession>(jar.get(VOTER_COOKIE)?.value);
  if (existing && typeof existing.sid === "string") return existing;
  return { sid: randomUUID() };
}

/** Writes the voter session. Only valid inside a server action or route. */
export async function writeVoterSession(session: VoterSession): Promise<void> {
  const jar = await cookies();
  jar.set(VOTER_COOKIE, seal(session), {
    ...cookieOptions,
    maxAge: VOTER_MAX_AGE,
  });
}

export async function clearVoterSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(VOTER_COOKIE);
}

// --------------------------------------------------------------------------
// Admin
// --------------------------------------------------------------------------

type AdminSession = { admin: true; at: number };

export async function readAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const value = unseal<AdminSession>(jar.get(ADMIN_COOKIE)?.value);
  if (!value || value.admin !== true) return false;
  return Date.now() - value.at < ADMIN_MAX_AGE * 1000;
}

export async function writeAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, seal({ admin: true, at: Date.now() }), {
    ...cookieOptions,
    maxAge: ADMIN_MAX_AGE,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

/** Constant time comparison of the submitted admin password. */
export function passwordMatches(submitted: string): boolean {
  const expected = Buffer.from(config.adminPassword, "utf8");
  const given = Buffer.from(submitted, "utf8");
  // Hash both sides so that length alone does not leak through the compare.
  const h = (buf: Buffer) =>
    createHmac("sha256", config.sessionSecret).update(buf).digest();
  return timingSafeEqual(h(expected), h(given));
}
