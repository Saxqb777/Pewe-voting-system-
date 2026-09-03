import Link from "next/link";
import { ensureSchema } from "@/lib/db";
import { getPublicStatus } from "@/lib/admin-data";
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
 * Anybody may open it and nobody has to ask the admin for a file. It carries
 * names and counts and nothing else: no phone numbers, no voting codes, and
 * not one word about how a single person voted.
 */
export default async function StatusPage() {
  await ensureSchema();
  const [status, settings] = await Promise.all([getPublicStatus(), getSettings()]);
  const s = strings.status;

  const pct =
    status.expected > 0
      ? Math.min(100, Math.round((status.registered / status.expected) * 100))
      : 0;

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
      <AutoRefresh />

      <header className="text-center">
        <Brand />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance text-ink">
          {s.title}
        </h1>
        <p className="mt-1 text-lg text-ink-soft">{s.titleHi}</p>
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
          {s.registeredNow}
          <span className="block font-normal text-ink-soft">{s.registeredNowHi}</span>
        </p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-ink">
          {s.ofExpected(status.registered, status.expected)}
        </p>
        <p className="text-base text-ink-soft">
          {s.ofExpectedHi(status.registered, status.expected)}
        </p>

        <div aria-hidden className="mt-4 h-3 w-full overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>

        <p className="mt-3 text-base font-semibold text-ink">
          {status.stillToCome > 0 ? s.stillToCome(status.stillToCome) : s.everybodyIn}
          <span className="mt-1 block font-normal text-ink-soft">
            {status.stillToCome > 0
              ? s.stillToComeHi(status.stillToCome)
              : s.everybodyInHi}
          </span>
        </p>

        <p className="mt-3 text-sm font-semibold text-ink-soft">
          {stage[0]}
          <span className="block font-normal">{stage[1]}</span>
        </p>
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
          {status.people.length > 0 ? s.listHeading(status.people.length) : s.notYet}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {status.people.length > 0 ? s.listHeadingHi : s.notYetHi}
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

      <p className="mt-6 text-center text-sm text-ink-soft">{s.updated(checked)}</p>
      <p className="mt-3 text-center text-xs text-ink-soft">
        {s.privacy}
        <span className="mt-1 block">{s.privacyHi}</span>
      </p>

      <ContactLine />
    </Screen>
  );
}
