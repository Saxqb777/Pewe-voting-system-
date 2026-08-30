import { sql, ensureSchema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { readVoterSession } from "@/lib/session";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";
import { EntryForm } from "@/components/EntryForm";
import { VotingWindowNotice } from "@/components/VotingWindowNotice";
import { OpensAtNotice } from "@/components/OpensAtNotice";
import { Brand, ContactLine } from "@/components/Brand";
import { SocietyNote } from "@/components/SocietyNote";
import { RegisterForm } from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  await ensureSchema();
  const settings = await getSettings();
  const session = await readVoterSession();

  // Three states, in the order a voter meets them. Judging by the clock alone
  // would have told voters it had not opened while the admin had already
  // pressed Start, since the schedule still said before.
  // Registration comes first. While it is open the ballot does not exist yet,
  // so the code box would have nothing to check against.
  if (settings.registrationOpen) {
    return (
      <Screen mode={settings.mode}>
        <header className="mb-6 text-center">
          <Brand />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance text-ink">
            {strings.entry.title}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">{strings.register.title}</p>
        </header>

        <p className="mb-6 rounded-xl bg-brand-soft px-4 py-3 text-base text-brand-dark">
          {strings.register.lead}
          <span className="mt-1 block">{strings.register.leadHi}</span>
        </p>

        <RegisterForm />

        <SocietyNote />
        <ContactLine />
      </Screen>
    );
  }

  if (settings.votingEnded) {
    return (
      <Screen mode={settings.mode}>
        <Brand />
        <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-balance text-ink">
          {strings.closed.title}
        </h1>
        <p className="mt-3 text-center text-lg text-ink-soft">
          {strings.closed.lead}
        </p>
        <ContactLine />
      </Screen>
    );
  }

  if (!settings.votingOpen) {
    return (
      <Screen mode={settings.mode}>
        <div className="pt-2 text-center">
          <Brand />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-balance text-ink">
            {strings.entry.title}
          </h1>
          {settings.opensAt && settings.schedule === "before" ? (
            <OpensAtNotice opensAt={settings.opensAt.toISOString()} />
          ) : (
            <p className="mt-4 text-lg text-ink-soft">
              {strings.entry.notReady}
            </p>
          )}
          <ContactLine />
        </div>
      </Screen>
    );
  }

  // Show a number keypad when every ID on the register is digits only.
  const [{ numeric }] = await sql<{ numeric: boolean | null }[]>`
    SELECT bool_and(voter_id ~ '^[0-9]+$') AS numeric FROM voters
  `;

  return (
    <Screen mode={settings.mode}>
      <header className="mb-6 text-center">
        <Brand />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance text-ink">
          {strings.entry.title}
        </h1>
        <p className="mt-2 text-lg text-ink-soft">{strings.entry.subtitle}</p>
      </header>

      <VotingWindowNotice
        closesAt={settings.closesAt ? settings.closesAt.toISOString() : null}
      />

      {session.voted ? (
        <p className="mb-6 rounded-xl bg-brand-soft px-4 py-3 text-center text-base font-medium text-brand-dark">
          {strings.done.lead}
        </p>
      ) : null}

      <EntryForm numericIds={numeric === true} />

      <section className="mt-8 rounded-xl border-2 border-line bg-card p-4">
        <h2 className="text-base font-bold text-ink">
          {strings.entry.whatHappensHeading}
        </h2>
        <ul className="mt-2 space-y-2">
          {strings.entry.whatHappens(settings.selectionsRequired).map((line) => (
            <li key={line} className="flex gap-2 text-base text-ink-soft">
              <span aria-hidden className="text-brand">
                &bull;
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <SocietyNote />

      <ContactLine />
    </Screen>
  );
}
