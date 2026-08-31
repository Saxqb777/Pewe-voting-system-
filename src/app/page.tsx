import { sql, ensureSchema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { readVoterSession, readRegistrationMark } from "@/lib/session";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";
import { EntryForm } from "@/components/EntryForm";
import { VotingWindowNotice } from "@/components/VotingWindowNotice";
import { OpensAtNotice } from "@/components/OpensAtNotice";
import { Brand, ContactLine } from "@/components/Brand";
import { SocietyNote } from "@/components/SocietyNote";
import { RegisterForm } from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await ensureSchema();
  const settings = await getSettings();
  const session = await readVoterSession();

  // Three states, in the order a voter meets them. Judging by the clock alone
  // would have told voters it had not opened while the admin had already
  // pressed Start, since the schedule still said before.
  // Registration comes first. While it is open the ballot does not exist yet,
  // so the code box would have nothing to check against.
  if (settings.registrationOpen) {
    // A man who has registered sees what happened instead of an empty form.
    //
    // Nothing on screen offers the form a second time. The address still
    // answers to ?again=1, which is the one way to hand a shared phone back
    // to the form, so a household with a single phone is recoverable without
    // putting a button in front of everybody who does not need it.
    //
    // What the phone remembers is only a number. The register itself is asked
    // whether that number is still on it, so a mark left behind by a practice
    // run that was later cleared shows the form again rather than telling
    // somebody they are registered when they are not.
    const mark = await readRegistrationMark();
    const registerAnother = "again" in (await searchParams);
    let already: { name: string; state: "registered" | "pending" | "approved" } | null =
      null;

    if (mark && !registerAnother) {
      const [row] = await sql<{ name: string; status: string }[]>`
        SELECT name, status FROM voters WHERE phone = ${mark.phone}
      `;
      if (row) {
        already = {
          name: row.name,
          state:
            row.status !== "approved"
              ? "pending"
              : // Approved by the admin after being held back, which means the
                // code was never shown on this screen and has to be asked for.
                mark.pending
                ? "approved"
                : "registered",
        };
      }
    }

    return (
      <Screen mode={settings.mode}>
        <header className="mb-6 text-center">
          <Brand />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance text-ink">
            {strings.entry.title}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">{strings.register.title}</p>
        </header>

        {already ? null : (
          <p className="mb-6 rounded-xl bg-brand-soft px-4 py-3 text-base text-brand-dark">
            {strings.register.lead}
            <span className="mt-1 block">{strings.register.leadHi}</span>
          </p>
        )}

        <RegisterForm already={already} />

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
