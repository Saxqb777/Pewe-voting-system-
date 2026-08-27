import { getVersion } from "@/lib/version";

/**
 * A quiet line at the foot of the admin page saying which build is live.
 * There so nobody has to guess whether an update has arrived yet.
 */
export function VersionStamp() {
  const { commit, change, builtAt } = getVersion();

  if (!commit && !builtAt) {
    return (
      <p className="pt-2 text-center font-mono text-xs text-ink-soft">
        Running from a local copy, so there is no version to show.
      </p>
    );
  }

  const when = builtAt
    ? new Date(builtAt).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex flex-col items-center gap-1 pt-2 text-center">
      <p className="font-mono text-xs text-ink-soft">
        {commit ? `Version ${commit}` : "Version unknown"}
        {when ? ` \u00b7 built ${when}` : ""}
      </p>
      {change ? (
        <p className="max-w-lg text-xs text-ink-soft">{change}</p>
      ) : null}
    </div>
  );
}
