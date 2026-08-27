"use client";

import Link from "next/link";
import type { Dashboard } from "@/lib/admin-data";
import { strings } from "@/lib/strings";
import { Button, Section } from "./ui";
import type { ActionResult } from "@/actions/admin";
import { closeVoting, reopenVoting, startVoting } from "@/actions/admin";

type State = "done" | "now" | "later";

/**
 * The running order of the whole election, so the admin can always see what
 * has happened, what is next, and what is still ahead.
 *
 * Exactly one step is marked as the current one, and only that step carries a
 * button. Everything else on the page is a tool for when something goes
 * wrong, not part of the sequence.
 */
export function NextSteps({
  data,
  run,
  pending,
}: {
  data: Dashboard;
  run: (action: () => Promise<ActionResult>) => void;
  pending: boolean;
}) {
  const hasVoters = data.turnout.total > 0;
  const hasTimes = Boolean(data.opensAt || data.closesAt);

  const rosterState: State = hasVoters ? "done" : "now";
  const timesState: State = hasTimes
    ? "done"
    : hasVoters && !data.hasStarted
      ? "now"
      : "later";
  const startState: State = data.hasStarted
    ? "done"
    : hasVoters
      ? "now"
      : "later";
  const closeState: State = data.votingEnded
    ? "done"
    : data.hasStarted
      ? "now"
      : "later";
  const resultsState: State = data.votingEnded ? "now" : "later";

  return (
    <Section title={strings.admin.stepsHeading}>
      <ol className="flex flex-col gap-1">
        <Step
          number={1}
          state={rosterState}
          title={strings.admin.step1}
          detail={
            hasVoters
              ? strings.admin.step1Done(data.turnout.total)
              : strings.admin.step1Todo
          }
        />

        <Step
          number={2}
          state={timesState}
          optional
          title={strings.admin.step2}
          detail={hasTimes ? strings.admin.step2Done : strings.admin.step2Todo}
        />

        <Step
          number={3}
          state={startState}
          title={strings.admin.step3}
          detail={
            data.hasStarted ? strings.admin.step3Done : strings.admin.step3Todo
          }
          action={
            startState === "now" ? (
              <Button
                tone="primary"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(strings.admin.step3Confirm)) {
                    run(startVoting);
                  }
                }}
              >
                {strings.admin.step3Button}
              </Button>
            ) : null
          }
        />

        <Step
          number={4}
          state={closeState}
          title={strings.admin.step4}
          detail={
            data.votingEnded ? strings.admin.step4Done : strings.admin.step4Todo
          }
          action={
            closeState === "now" ? (
              <Button
                tone="danger"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(strings.admin.closeVotingConfirm)) {
                    run(closeVoting);
                  }
                }}
              >
                {strings.admin.closeVoting}
              </Button>
            ) : data.votingEnded ? (
              <Button disabled={pending} onClick={() => run(reopenVoting)}>
                {strings.admin.reopenVoting}
              </Button>
            ) : null
          }
        />

        <Step
          number={5}
          state={resultsState}
          last
          title={strings.admin.step5}
          detail={data.votingEnded ? "" : strings.admin.step5Todo}
          action={
            resultsState === "now" ? (
              <Link
                href="/admin/results"
                className="inline-flex min-h-12 items-center rounded-xl bg-brand px-4 py-2 text-base font-semibold text-white"
              >
                {strings.admin.viewResults}
              </Link>
            ) : null
          }
        />
      </ol>
    </Section>
  );
}

function Step({
  number,
  state,
  title,
  detail,
  action,
  optional,
  last,
}: {
  number: number;
  state: State;
  title: string;
  detail: string;
  action?: React.ReactNode;
  optional?: boolean;
  last?: boolean;
}) {
  const marker =
    state === "done"
      ? "border-brand bg-brand text-white"
      : state === "now"
        ? "border-brand bg-card text-brand"
        : "border-line bg-card text-ink-faint";

  return (
    <li className="relative flex gap-3 pb-3">
      {!last ? (
        <span
          aria-hidden
          className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${
            state === "done" ? "bg-brand" : "bg-line"
          }`}
        />
      ) : null}

      <span
        aria-hidden
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${marker}`}
      >
        {state === "done" ? "✓" : number}
      </span>

      <div className="flex-1 pt-0.5">
        <p
          className={`text-base font-bold ${
            state === "later" ? "text-ink-faint" : "text-ink"
          }`}
        >
          {title}
          {optional ? (
            <span className="ml-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              {strings.admin.stepOptional}
            </span>
          ) : null}
        </p>
        {detail ? (
          <p
            className={`text-sm ${
              state === "now" ? "text-ink" : "text-ink-soft"
            }`}
          >
            {detail}
          </p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </li>
  );
}
