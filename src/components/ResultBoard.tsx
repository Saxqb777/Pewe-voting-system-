import type { Results } from "@/lib/admin-data";
import { strings } from "@/lib/strings";

/**
 * The result, on the page the village already has pinned.
 *
 * The elected come first and large, because that is what everybody opened
 * the link for. The whole standing follows underneath, so nobody has to
 * take the top of the list on trust, and the arithmetic that proves the
 * count sits at the end where anybody who doubts it can check.
 *
 * Counts only. The ballot box holds the choices and a date, so there is
 * nothing here that could say who voted for whom.
 */
export function ResultBoard({ results }: { results: Results }) {
  const s = strings.status;
  const winners = results.rows.filter((r) => r.isWinner);
  const most = Math.max(1, winners[0]?.votes ?? 1);
  const ballots = Math.max(1, results.totalBallots);
  const share = (votes: number) => `${((votes / ballots) * 100).toFixed(1)}%`;
  const cut = winners[winners.length - 1];
  const firstOut = results.rows.find((r) => !r.isWinner);
  const margin = cut && firstOut ? cut.votes - firstOut.votes : 0;

  return (
    <>
      <section className="mt-6 overflow-hidden rounded-2xl border-2 border-brand-dark bg-brand-dark text-white">
        <div className="px-4 pt-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
            {s.resultKicker}
          </p>
          <h2 className="mt-1 text-3xl font-bold">{s.resultHeading(winners.length)}</h2>
          <p className="mt-1 text-base opacity-80">{s.resultHeadingHi}</p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px bg-white/20">
          <Figure
            value={`${results.totalMarkedVoted}/${results.totalVoters}`}
            label={s.resultVoted}
          />
          <Figure
            value={`${((results.totalMarkedVoted / Math.max(1, results.totalVoters)) * 100).toFixed(1)}%`}
            label={s.resultTurnout}
          />
          <Figure value={String(results.totalVotesCast)} label={s.resultVotes} />
          <Figure value={String(margin)} label={s.resultMargin} />
        </dl>

        <ol className="bg-white/5 px-4 py-4">
          {winners.map((row) => (
            <li key={row.number} className="border-t border-white/15 py-2.5 first:border-t-0">
              <div className="flex items-baseline gap-3">
                <span className="w-6 shrink-0 text-right text-sm tabular-nums opacity-60">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1 text-base font-semibold leading-snug">
                  {row.name}
                </span>
                <span className="shrink-0 text-lg font-bold tabular-nums">{row.votes}</span>
                <span className="w-14 shrink-0 text-right text-sm tabular-nums opacity-70">
                  {share(row.votes)}
                </span>
              </div>
              <div
                aria-hidden
                className="ml-9 mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15"
              >
                <div
                  className="h-full rounded-full bg-white/85"
                  style={{ width: `${(row.votes / most) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Everybody, so the top of the list needs no trust. */}
      <section className="mt-8">
        <h2 className="text-base font-bold text-ink">{s.resultStanding}</h2>
        <p className="mt-1 text-sm text-ink-soft">{s.resultStandingHi}</p>

        <ul className="mt-3 space-y-1">
          {results.rows.map((row) => (
            <li
              key={row.number}
              className={`flex items-baseline gap-3 rounded-lg px-3 py-2 ${
                row.isWinner ? "bg-brand-soft" : "bg-card"
              }`}
            >
              <span className="w-7 shrink-0 text-right text-sm tabular-nums text-ink-faint">
                {row.rank}
              </span>
              <span
                className={`min-w-0 flex-1 text-base leading-snug ${
                  row.isWinner ? "font-semibold text-ink" : "text-ink-soft"
                }`}
              >
                {row.name}
              </span>
              <span className="shrink-0 text-base font-semibold tabular-nums text-ink">
                {row.votes}
              </span>
              <span className="w-14 shrink-0 text-right text-sm tabular-nums text-ink-soft">
                {share(row.votes)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* The arithmetic, for anybody who would rather check than believe. */}
      <section className="mt-8 rounded-2xl bg-card p-4">
        <h2 className="text-base font-bold text-ink">{s.resultChecks}</h2>
        <p className="mt-1 text-sm text-ink-soft">{s.resultChecksHi}</p>
        <dl className="mt-3">
          <Check label={s.resultCheckBallots} value={String(results.totalBallots)} />
          <Check label={s.resultCheckRoster} value={String(results.totalVoters)} />
          <Check label={s.resultCheckVoted} value={String(results.totalMarkedVoted)} />
          <Check label={s.resultCheckVotes} value={String(results.totalVotesCast)} />
          <Check label={s.resultCheckSeats} value={String(results.seats)} />
          <Check
            label={s.resultCheckSum}
            value={`${results.seats} x ${results.totalBallots} = ${results.seats * results.totalBallots}`}
          />
        </dl>
      </section>
    </>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-brand-dark px-3 py-3 text-center">
      <dt className="sr-only">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
      <p className="mt-0.5 text-xs opacity-70">{label}</p>
    </div>
  );
}

function Check({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line py-2 first:border-t-0">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="shrink-0 text-sm font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
