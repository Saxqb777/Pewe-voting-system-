import { sql, ensureSchema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { readVoterSession } from "@/lib/session";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";
import { EntryForm } from "@/components/EntryForm";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  await ensureSchema();
  const settings = await getSettings();
  const session = await readVoterSession();

  if (!settings.votingOpen) {
    return (
      <Screen mode={settings.mode}>
        <h1 className="text-3xl font-bold text-ink">{strings.closed.title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{strings.closed.lead}</p>
      </Screen>
    );
  }

  // Show a number keypad when every ID on the register is digits only.
  const [{ numeric }] = await sql<{ numeric: boolean | null }[]>`
    SELECT bool_and(voter_id ~ '^[0-9]+$') AS numeric FROM voters
  `;

  return (
    <Screen mode={settings.mode}>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-ink">{strings.entry.title}</h1>
        <p className="mt-2 text-lg text-ink-soft">{strings.entry.subtitle}</p>
      </header>

      {session.voted ? (
        <p className="mb-6 rounded-xl bg-brand-soft px-4 py-3 text-center text-base font-medium text-brand-dark">
          {strings.done.lead}
        </p>
      ) : null}

      <EntryForm numericIds={numeric === true} />
    </Screen>
  );
}
