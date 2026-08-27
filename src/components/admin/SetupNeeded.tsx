import type { ConfigProblem } from "@/lib/config";
import { strings } from "@/lib/strings";

/**
 * Shown on the admin screen when a setting is missing or unsafe. It names the
 * setting and the problem, never the value, so nothing secret is on screen.
 */
export function SetupNeeded({ problems }: { problems: ConfigProblem[] }) {
  return (
    <div className="mx-auto mt-10 w-full max-w-2xl">
      <h1 className="text-2xl font-bold text-danger">{strings.setup.title}</h1>
      <p className="mt-3 text-base text-ink">{strings.setup.lead}</p>

      <ul className="mt-5 space-y-3">
        {problems.map((problem) => (
          <li
            key={problem.variable}
            className="rounded-xl border-2 border-danger bg-danger-soft p-4"
          >
            <p className="font-mono text-sm font-bold text-danger">
              {problem.variable}
            </p>
            <p className="mt-1 text-base text-ink">{problem.problem}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 rounded-xl bg-brand-soft px-4 py-3 text-base text-brand-dark">
        {strings.setup.safe}
      </p>
    </div>
  );
}
