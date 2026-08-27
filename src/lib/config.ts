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
    return intOr("EXPECTED_VOTER_COUNT", 130);
  },
  /** A ballot is valid only when it carries exactly this many choices. */
  get selectionsRequired() {
    return intOr("SELECTIONS_REQUIRED", 16);
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

export { RESET_PHRASE, LIVE_OVERRIDE_PHRASE } from "./phrases";
