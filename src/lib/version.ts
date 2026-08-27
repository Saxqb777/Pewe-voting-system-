import "server-only";

export type Version = {
  /** Short commit id of the build that is live, or null when unknown. */
  commit: string | null;
  /** First line of that commit's message. */
  change: string | null;
  /** When the site was built. */
  builtAt: string | null;
};

/**
 * Which build is actually serving this page.
 *
 * The host sets the commit variables itself on every deploy, so this always
 * describes the running build rather than whatever was last pushed.
 */
export function getVersion(): Version {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
  const builtAt = process.env.BUILD_TIME ?? "";

  const firstLine = message.split("\n")[0]?.trim() ?? "";

  return {
    commit: sha ? sha.slice(0, 7) : null,
    change: firstLine
      ? firstLine.length > 72
        ? `${firstLine.slice(0, 69)}...`
        : firstLine
      : null,
    builtAt: builtAt || null,
  };
}
