import { redirect } from "next/navigation";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { ensureSchema } from "@/lib/db";
import { config } from "@/lib/config";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";
import { Brand, ContactLine } from "@/components/Brand";
import { OpensAtNotice } from "@/components/OpensAtNotice";

export const dynamic = "force-dynamic";

/**
 * The wait, on a page of its own.
 *
 * A man who has registered has one question left, and it is this one. Giving
 * it its own address means the screen that says he is registered can hand him
 * straight to it without asking him to close the link and open it again.
 *
 * Once voting is actually open there is nothing to count down to, so this
 * sends him to the door instead of leaving him watching a finished clock.
 */
export default async function CountdownPage() {
  await ensureSchema();
  const settings = await getSettings();

  // The moment already set if the roster is confirmed, otherwise the one
  // confirming will set. Either way it is the hour the society announced.
  const opening = settings.opensAt ?? config.electionOpensAt;
  if (settings.votingOpen || settings.votingEnded || opening.getTime() <= Date.now()) {
    redirect("/");
  }

  const r = strings.register;

  return (
    <Screen mode={settings.mode}>
      <div className="text-center">
        <Brand />
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-balance text-ink">
          {r.waitTitle}
        </h1>
        <p className="mt-1 text-lg text-ink-soft">{r.waitTitleHi}</p>

        <OpensAtNotice opensAt={opening.toISOString()} />

        <p className="mt-5 text-base text-ink-soft">
          {r.waitLead}
          <span className="mt-1 block">{r.waitLeadHi}</span>
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 flex-col items-center justify-center rounded-xl border-2 border-line px-5 py-2 text-base font-semibold text-ink"
        >
          {r.waitBack}
          <span className="block text-sm font-normal text-ink-soft">
            {r.waitBackHi}
          </span>
        </Link>

        <ContactLine />
      </div>
    </Screen>
  );
}
