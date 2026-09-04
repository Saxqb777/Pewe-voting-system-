import Link from "next/link";
import { ensureSchema } from "@/lib/db";
import { openWhenDue } from "@/lib/auto-open";
import { getPublicStatus, type ReportLine } from "@/lib/admin-data";
import { getSettings } from "@/lib/settings";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";
import { Brand, ContactLine } from "@/components/Brand";
import { OpensAtNotice } from "@/components/OpensAtNotice";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${strings.status.title} | ${strings.common.appName}`,
};

/**
 * The page the group pins.
 *
 * Anybody may open it and nobody has to ask the admin for a file. It names
 * the men who have registered and nobody else: a man who has not registered
 * yet is chased privately, not named on a page the whole village can open.
 * No voting codes, and not one word about how a single person voted.
 */

/**
 * One figure with its share, drawn the same way the report draws it.
 *
 * The bar is there for the man reading it on a phone at arm's length, who
 * takes the length in before he reads either number.
 */
function Figure({ line }: { line: ReportLine }) {
  const s = strings.status;
  return (
    <li className="border-t border-line py-2 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="min-w-0 text-base text-ink">
          {line.label}
          <span className="block text-sm text-ink-soft">{line.labelHi}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="text-xl font-bold tabular-nums text-ink">{line.count}</span>
          {line.percent === null ? null : (
            <span className="ml-2 text-sm tabular-nums text-ink-soft">
              {s.statsOf(line.percent, line.outOf)}
            </span>
          )}
        </span>
      </div>
      {line.percent === null ? null : (
        <div aria-hidden className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${Math.min(100, line.percent)}%` }}
          />
        </div>
      )}
    </li>
  );
}

/** A named block of figures, skipped entirely when it holds none. */
function Block({ title, lines }: { title: string; lines: ReportLine[] }) {
  if (lines.length === 0) return null;
  return (
    <section className="mt-5 rounded-2xl bg-card p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft">{title}</h3>
      <ul className="mt-2">
        {lines.map((line) => (
          <Figure key={line.label} line={line} />
        ))}
      </ul>
    </section>
  );
}
export default async function StatusPage() {
  await ensureSchema();
  await openWhenDue();
  const [status, settings] = await Promise.all([getPublicStatus(), getSettings()]);
  const s = strings.status;

  // Once the ballot is open the village is watching a different number. The
  // panel is the same shape, so the link the group pinned needs no reposting.
  const voting = status.votingOpen || status.votingEnded;
  const top = voting
    ? { have: status.voted, outOf: status.roster }
    : { have: status.registered, outOf: status.expected };
  const pct =
    top.outOf > 0 ? Math.min(100, Math.round((top.have / top.outOf) * 100)) : 0;
  const left = Math.max(0, top.outOf - top.have);

  const stage = status.votingEnded
    ? [s.votingDone, s.votingDoneHi]
    : status.votingOpen
      ? [s.votingNow, s.votingNowHi]
      : status.registrationOpen
        ? [s.registrationOpen, s.registrationOpenHi]
        : [s.registrationClosed, s.registrationClosedHi];

  const checked = new Date(status.takenAt).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <Screen mode={settings.mode}>
      <AutoRefresh seconds={voting ? 30 : 60} />

      <header className="text-center">
        <Brand />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance text-ink">
          {voting ? s.votingTitle : s.title}
        </h1>
        <p className="mt-1 text-lg text-ink-soft">
          {voting ? s.votingTitleHi : s.titleHi}
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          {s.lead}
          <span className="mt-1 block">{s.leadHi}</span>
        </p>
      </header>

      {/* The one figure everybody opens this page for, said as a share. A
          count alone means nothing without the number it is out of. */}
      <section className="mt-6 rounded-2xl border-2 border-brand bg-card p-5 text-center">
        <p className="text-6xl font-bold tabular-nums text-brand">{pct}%</p>
        <p className="mt-1 text-base font-semibold text-ink">
          {voting ? s.votedNow : s.registeredNow}
          <span className="block font-normal text-ink-soft">
            {voting ? s.votedNowHi : s.registeredNowHi}
          </span>
        </p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-ink">
          {voting
            ? s.ofRoster(top.have, top.outOf)
            : s.ofExpected(status.registered, status.expected)}
        </p>
        <p className="text-base text-ink-soft">
          {voting
            ? s.ofRosterHi(top.have, top.outOf)
            : s.ofExpectedHi(status.registered, status.expected)}
        </p>

        <div aria-hidden className="mt-4 h-3 w-full overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>

        <p className="mt-3 text-base font-semibold text-ink">
          {voting
            ? left > 0
              ? s.stillToVote(left)
              : s.everybodyVoted
            : status.stillToCome > 0
              ? s.stillToCome(status.stillToCome)
              : s.everybodyIn}
          <span className="mt-1 block font-normal text-ink-soft">
            {voting
              ? left > 0
                ? s.stillToVoteHi(left)
                : s.everybodyVotedHi
              : status.stillToCome > 0
                ? s.stillToComeHi(status.stillToCome)
                : s.everybodyInHi}
          </span>
        </p>

        <p className="mt-3 text-sm font-semibold text-ink-soft">
          {stage[0]}
          <span className="block font-normal">{stage[1]}</span>
        </p>

        {voting ? (
          <p className="mt-3 text-sm text-ink-soft">
            {s.liveNote}
            <span className="block">{s.liveNoteHi}</span>
          </p>
        ) : null}
      </section>

      {status.opensAt ? <OpensAtNotice opensAt={status.opensAt} /> : null}

      {status.registrationOpen ? (
        <Link
          href="/"
          className="mt-6 flex min-h-14 w-full flex-col items-center justify-center rounded-xl bg-brand px-4 py-3 text-center text-lg font-bold text-white active:bg-brand-dark"
        >
          {s.joinIn}
          <span className="mt-0.5 block text-base font-normal">{s.joinInHi}</span>
        </Link>
      ) : null}

      <section className="mt-8">
        <h2 className="text-base font-bold text-ink">
          {status.people.length > 0
            ? voting
              ? s.rosterHeading(status.people.length)
              : s.listHeading(status.people.length)
            : s.notYet}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {status.people.length > 0
            ? voting
              ? s.rosterHeadingHi
              : s.listHeadingHi
            : s.notYetHi}
        </p>

        {status.people.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {status.people.map((person, i) => (
              <li
                key={`${person.name}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-card px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block text-base text-ink">
                    <span className="mr-2 text-sm text-ink-faint tabular-nums">{i + 1}</span>
                    {person.name}
                  </span>
                  {person.phone ? (
                    // Tappable, because the reason anybody looks a number up
                    // on this page is to call the man it belongs to.
                    <a
                      href={`tel:${person.dial}`}
                      className="ml-6 mt-0.5 inline-flex min-h-8 items-center font-mono text-sm text-brand underline"
                    >
                      {person.phone}
                    </a>
                  ) : null}
                </span>
                <span className="text-sm tabular-nums text-ink-soft">{person.joined}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* The same figures the admin reads, so nobody has to ask him for them. */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-ink">{s.statsHeading}</h2>
        <p className="mt-1 text-sm text-ink-soft">{s.statsHeadingHi}</p>
        <p className="mt-2 text-sm text-ink-soft">
          {s.statsAgainst(status.report.expected)}
          <span className="mt-1 block">{s.statsAgainstHi(status.report.expected)}</span>
        </p>

        {status.report.pace ? (
          <p className="mt-4 rounded-xl bg-card p-4 text-base font-semibold text-ink">
            {status.report.pace}
            <span className="mt-1 block font-normal text-ink-soft">
              {status.report.paceHi}
            </span>
          </p>
        ) : null}

        <Block title={strings.admin.reportTarget} lines={status.report.target} />
        <Block title={strings.admin.reportRegistration} lines={status.report.registration} />
        <Block title={strings.admin.reportVoting} lines={status.report.voting} />
        <Block title={strings.admin.reportCountries} lines={status.report.countries} />
      </section>

      <p className="mt-6 text-center text-sm text-ink-soft">{s.updated(checked)}</p>
      {voting ? (
        <p className="mt-4 text-center text-sm font-medium text-ink-soft">
          {s.noResultsYet}
          <span className="mt-1 block font-normal">{s.noResultsYetHi}</span>
        </p>
      ) : null}

      <p className="mt-3 text-center text-xs text-ink-soft">
        {s.privacy}
        <span className="mt-1 block">{s.privacyHi}</span>
      </p>

      <ContactLine />
    </Screen>
  );
}
