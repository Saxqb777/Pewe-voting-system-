import type { Chase } from "@/lib/admin-data";
import { strings } from "@/lib/strings";

/**
 * The day's voting drawn as a run chase.
 *
 * Not one new figure: the same turnout, the same clock, said the way the
 * village already talks about a chase. A man who will not read "73 still to
 * vote" will read a required rate against a current one and go and ring his
 * cousin about it.
 */
export function Scoreboard({ chase }: { chase: Chase }) {
  const s = strings.status;
  const par = chase.strikeRate >= 100;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border-2 border-brand-dark bg-brand-dark text-white">
      <div className="flex items-baseline justify-between px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {s.scoreHeading}
          <span className="ml-2 font-normal opacity-80">{s.scoreHeadingHi}</span>
        </h2>
        <span className="text-xs tabular-nums opacity-80">
          {chase.openEnded ? s.scoreNoClock : s.scoreLeft(chase.hoursLeft)}
        </span>
      </div>

      {/* The score itself, the way a scoreboard says it. */}
      <div className="bg-white/10 px-4 py-4 text-center">
        <p className="text-4xl font-bold tabular-nums">
          {chase.score}
          <span className="opacity-60"> / </span>
          {chase.target}
        </p>
        <p className="mt-1 text-sm opacity-90">
          {s.scoreOvers(chase.hoursGone)}
          <span className="ml-2 opacity-75">{s.scoreOversHi(chase.hoursGone)}</span>
        </p>
      </div>

      {/* With no closing time there is no rate to keep up with, so the board
          shows what is left rather than inventing a required rate out of a
          deadline nobody has set. */}
      <dl
        className={`grid gap-px bg-white/20 ${
          chase.openEnded ? "grid-cols-2" : "grid-cols-3"
        }`}
      >
        {chase.openEnded ? null : (
          <Cell
            label={s.scoreRequired}
            labelHi={s.scoreRequiredHi}
            value={String(chase.requiredRate)}
            note={s.scorePerHour(chase.requiredRate)}
          />
        )}
        <Cell
          label={s.scoreCurrent}
          labelHi={s.scoreCurrentHi}
          value={String(chase.currentRate)}
          note={s.scorePerHour(chase.currentRate)}
        />
        {chase.openEnded ? (
          <Cell
            label={s.scoreStillOut}
            labelHi={s.scoreStillOutHi}
            value={String(chase.needed)}
            note={s.scoreOpenNote}
          />
        ) : (
          <Cell
            label={s.scoreStrike}
            labelHi={s.scoreStrikeHi}
            value={String(chase.strikeRate)}
            note={s.scoreOnPar}
            strong={par}
          />
        )}
      </dl>

      <p
        className={`px-4 py-3 text-center text-base font-bold ${
          par ? "bg-brand text-white" : "bg-warn-soft text-warn"
        }`}
      >
        {chase.verdict}
        <span className="mt-0.5 block text-sm font-normal">{chase.verdictHi}</span>
      </p>
    </section>
  );
}

function Cell({
  label,
  labelHi,
  value,
  note,
  strong,
}: {
  label: string;
  labelHi: string;
  value: string;
  note: string;
  strong?: boolean;
}) {
  return (
    <div className="bg-brand-dark px-2 py-3 text-center">
      <dt className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
        <span className="block font-normal normal-case opacity-90">{labelHi}</span>
      </dt>
      <dd
        className={`mt-1 text-2xl font-bold tabular-nums ${
          strong ? "text-white" : "text-white/90"
        }`}
      >
        {value}
      </dd>
      <p className="text-xs opacity-75">{note}</p>
    </div>
  );
}
