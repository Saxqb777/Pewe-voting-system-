import { normaliseConnectionString } from "./connection-string";

/**
 * Central place for every environment backed setting.
 * Nothing else in the app reads process.env directly.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

function intOr(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get adminPassword() {
    return required("ADMIN_PASSWORD");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  /** Exactly this many rows must be present for a roster to load. */
  get expectedVoterCount() {
    return intOr("EXPECTED_VOTER_COUNT", 138);
  },
  /**
   * Public address of the site. Used only to turn the society seal into an
   * absolute address, so WhatsApp can show it when someone shares the link.
   * Vercel supplies its own host, so this is usually left unset.
   */
  get siteUrl() {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit;
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercel) return `https://${vercel}`;
    // WhatsApp will not fetch a preview image from a relative or localhost
    // address, so this never falls back to empty. Override it with
    // NEXT_PUBLIC_SITE_URL if the site ever moves.
    return "https://pewe-voting-system.vercel.app";
  },
  /** A ballot is valid only when it carries exactly this many choices. */
  get selectionsRequired() {
    return intOr("SELECTIONS_REQUIRED", 17);
  },
} as const;

/** Wrong ID attempts allowed from one browser session before it is locked. */
export const MAX_SESSION_ATTEMPTS = 5;

/**
 * Wrong ID attempts allowed from one IP address in the rolling window.
 *
 * Set generously on purpose. In a village many phones share one mobile
 * network address, so a low limit would lock out honest voters who simply
 * mistyped. The five wrong tries per phone limit is the real brake. This one
 * only stops somebody working through the ID space, which would take well
 * over a hundred hours at this rate.
 */
export const MAX_IP_ATTEMPTS = 50;

/** Rolling window for the IP limit, in minutes. */
export const IP_ATTEMPT_WINDOW_MINUTES = 60;

/** An IP shared by more than this many voters is shown as a flag. */
export const SHARED_IP_FLAG_THRESHOLD = 3;

/** A voter with at least this many failed attempts is shown as a flag. */
export const VOTER_FAILED_ATTEMPT_FLAG_THRESHOLD = 3;

export { RESET_PHRASE, LIVE_OVERRIDE_PHRASE, RESTART_PHRASE } from "./phrases";

// --------------------------------------------------------------------------
// Setup checks
// --------------------------------------------------------------------------

/** Shortest admin password that is not an invitation. */
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

/** Shortest signing secret. Anyone holding it can forge an admin session. */
export const MIN_SESSION_SECRET_LENGTH = 32;

export type ConfigProblem = { variable: string; problem: string };

/**
 * Looks over the environment and reports anything that would make the
 * election unsafe or simply not work. Reported in plain language on the admin
 * screen, so a missing setting never shows up as a blank page.
 *
 * It reports the name of the setting and what is wrong with it. It never
 * reports the value.
 */
export function checkConfig(): ConfigProblem[] {
  const problems: ConfigProblem[] = [];

  const databaseUrl = normaliseConnectionString(process.env.DATABASE_URL ?? "");
  if (databaseUrl === "") {
    problems.push({
      variable: "DATABASE_URL",
      problem: "Not set. Paste the connection string from your database.",
    });
  } else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    problems.push({
      variable: "DATABASE_URL",
      problem:
        "Does not look like a connection string. It must contain postgresql:// followed by the rest of the string from Neon. Check nothing was cut off when it was copied.",
    });
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  if (adminPassword.trim() === "") {
    problems.push({
      variable: "ADMIN_PASSWORD",
      problem: "Not set. Choose a password only you know.",
    });
  } else if (adminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    problems.push({
      variable: "ADMIN_PASSWORD",
      problem: `Too short. Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters. Anyone who guesses this can close the election.`,
    });
  }

  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (sessionSecret.trim() === "") {
    problems.push({
      variable: "SESSION_SECRET",
      problem: "Not set. Type a long line of random letters and numbers.",
    });
  } else if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    problems.push({
      variable: "SESSION_SECRET",
      problem: `Too short. Use at least ${MIN_SESSION_SECRET_LENGTH} characters. Anyone who works this out can sign in as admin without the password.`,
    });
  } else if (/^(.)\1+$/.test(sessionSecret)) {
    problems.push({
      variable: "SESSION_SECRET",
      problem: "The same character repeated is not random. Mix letters and numbers.",
    });
  }

  const voters = Number.parseInt(process.env.EXPECTED_VOTER_COUNT ?? "138", 10);
  const picks = Number.parseInt(process.env.SELECTIONS_REQUIRED ?? "17", 10);
  if (Number.isFinite(voters) && Number.isFinite(picks) && picks >= voters) {
    problems.push({
      variable: "SELECTIONS_REQUIRED",
      problem: `Each voter would have to pick ${picks} names out of ${voters}. It must be fewer than the number of voters.`,
    });
  }

  return problems;
}
