import Link from "next/link";
import { redirect } from "next/navigation";
import { readAdminSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getResults } from "@/lib/admin-data";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  if (!(await readAdminSession())) redirect("/admin");

  const settings = await getSettings();
  // Second gate. getResults refuses as well, so there is no path to a
  // partial count even if this check were ever removed.
  if (!settings.votingEnded) redirect("/admin");

  const results = await getResults();
  const mismatch = results.totalBallots !== results.totalMarkedVoted;

  return (
    <Screen mode={settings.mode} wide>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{strings.results.title}</h1>
        <Link
          href="/admin"
          className="rounded-xl border-2 border-line bg-card px-4 py-2 text-base font-semibold text-ink"
        >
          {strings.common.back}
        </Link>
      </div>

      {results.totalBallots === 0 ? (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-base font-medium text-warn">
          {strings.results.emptyBox}
        </p>
      ) : null}

      {results.tie ? (
        <div className="mb-4 rounded-2xl border-2 border-danger bg-danger-soft p-4">
          <h2 className="text-lg font-bold text-danger">
            {strings.results.tieHeading}
          </h2>
          <p className="mt-2 text-base text-ink">
            {strings.results.tieWarning(
              results.tie.names.length,
              results.tie.votes,
              results.tie.place,
            )}
          </p>
          <ul className="mt-3 list-inside list-disc text-base text-ink">
            {results.tie.names.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-4 rounded-xl bg-brand-soft px-4 py-2 text-sm font-medium text-brand-dark">
          {strings.results.noTie}
        </p>
      )}

      <section className="mb-4 rounded-2xl border-2 border-line bg-card p-4">
        <h2 className="mb-2 text-lg font-bold text-ink">
          {strings.results.totalsHeading}
        </h2>
        <ul className="space-y-1 text-base text-ink">
          <li>{strings.results.totalBallots(results.totalBallots)}</li>
          <li>{strings.results.totalVoters(results.totalVoters)}</li>
          <li>{strings.results.totalMarkedVoted(results.totalMarkedVoted)}</li>
          <li>{strings.results.totalVotesCast(results.totalVotesCast)}</li>
        </ul>
        {mismatch ? (
          <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm font-medium text-warn">
            {strings.results.mismatchWarning}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/api/admin/results"
            className="inline-flex min-h-12 items-center rounded-xl bg-brand px-4 py-2 text-base font-semibold text-white"
          >
            {strings.results.exportCsv}
          </a>
          <a
            href="/api/admin/ballots"
            className="inline-flex min-h-12 items-center rounded-xl border-2 border-line bg-card px-4 py-2 text-base font-semibold text-ink"
          >
            Download anonymous ballots as CSV
          </a>
        </div>
      </section>

      <h2 className="mb-2 text-lg font-bold text-ink">
        {strings.results.heading(results.seats)}
      </h2>
      <div className="overflow-x-auto rounded-2xl border-2 border-line bg-card">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-line text-sm text-ink-soft">
              <th className="px-3 py-2">{strings.results.rank}</th>
              <th className="px-3 py-2">{strings.results.number}</th>
              <th className="px-3 py-2">{strings.results.name}</th>
              <th className="px-3 py-2 text-right">{strings.results.votes}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {results.rows.map((row) => (
              <tr
                key={row.number}
                className={`border-b border-line ${
                  row.isWinner ? "bg-brand-soft" : ""
                }`}
              >
                <td className="px-3 py-2 text-base text-ink-soft">{row.rank}</td>
                <td className="px-3 py-2 font-mono text-sm text-ink-soft">
                  {row.number}
                </td>
                <td className="px-3 py-2 text-base font-medium text-ink">
                  {row.name}
                </td>
                <td className="px-3 py-2 text-right text-base font-bold text-ink">
                  {row.votes}
                </td>
                <td className="px-3 py-2">
                  {row.isWinner ? (
                    <span className="rounded-full bg-brand px-2 py-1 text-xs font-bold text-white">
                      {strings.results.winner}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Screen>
  );
}
