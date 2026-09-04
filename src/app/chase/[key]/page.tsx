import { notFound } from "next/navigation";
import { ensureSchema } from "@/lib/db";
import { isChaseKey } from "@/lib/chase-link";
import { getNotVotedList, getTurnout } from "@/lib/admin-data";
import { getSettings } from "@/lib/settings";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";
import { Brand } from "@/components/Brand";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${strings.chase.title} | ${strings.common.appName}`,
  robots: { index: false, follow: false },
};

/**
 * The page for whoever is making the calls.
 *
 * Everybody still holding a code, with the number to ring, updating on its
 * own. Behind a key, because a man who has not got round to voting yet is
 * not a man to be named on a page the whole village can open. It carries no
 * voting code, and nothing about how anybody voted.
 */
export default async function ChasePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isChaseKey(key)) notFound();

  await ensureSchema();
  const [rows, turnout, settings] = await Promise.all([
    getNotVotedList(),
    getTurnout(),
    getSettings(),
  ]);
  const s = strings.chase;

  const checked = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <Screen mode={settings.mode}>
      <AutoRefresh seconds={30} />

      <header className="text-center">
        <Brand />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">{s.title}</h1>
        <p className="mt-1 text-lg text-ink-soft">{s.titleHi}</p>
      </header>

      <section className="mt-6 rounded-2xl border-2 border-warn bg-warn-soft p-5 text-center text-warn">
        <p className="text-5xl font-bold tabular-nums">{rows.length}</p>
        <p className="mt-1 text-base font-semibold">
          {s.stillToVote}
          <span className="block font-normal">{s.stillToVoteHi}</span>
        </p>
        <p className="mt-2 text-sm">
          {s.ofRoster(turnout.voted, turnout.total)}
        </p>
      </section>

      <p className="mt-6 text-sm text-ink-soft">
        {s.help}
        <span className="mt-1 block">{s.helpHi}</span>
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl bg-card p-4 text-center text-base font-semibold text-brand-dark">
          {s.everybodyVoted}
          <span className="mt-1 block font-normal text-ink-soft">{s.everybodyVotedHi}</span>
        </p>
      ) : (
        <ul className="mt-4 space-y-1">
          {rows.map((person, i) => (
            <li
              key={`${person.phone}-${i}`}
              className="rounded-lg bg-card px-3 py-2"
            >
              <span className="block text-base text-ink">
                <span className="mr-2 text-sm text-ink-faint tabular-nums">{i + 1}</span>
                {person.name}
              </span>
              <a
                href={`tel:+${person.phone.replace(/\D/g, "")}`}
                className="ml-6 mt-0.5 inline-flex min-h-8 items-center font-mono text-sm text-brand underline"
              >
                {person.phone}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-sm text-ink-soft">{s.updated(checked)}</p>
      <p className="mt-3 text-center text-xs text-ink-soft">
        {s.privacy}
        <span className="mt-1 block">{s.privacyHi}</span>
      </p>
    </Screen>
  );
}
