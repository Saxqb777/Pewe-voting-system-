"use client";

import type { Dashboard } from "@/lib/admin-data";
import { Countdown } from "@/components/Countdown";
import { describeMoment } from "@/lib/countdown";
import { strings } from "@/lib/strings";

/**
 * The first thing on the admin page, answering the only question that matters
 * at a glance: has this started, is it running, or is it over.
 *
 * State is carried by colour and by a plain sentence, not by colour alone.
 */
export function ElectionStatus({ data }: { data: Dashboard }) {
  // Not started is the first question, before anything about the clock.
  // Judging by the schedule alone called an election with no schedule and no
  // start "open", which is exactly the state nobody could read off the page.
  const state = data.votingEnded
    ? "finished"
    : data.hasStarted
      ? "open"
      : "waiting";

  const styles = {
    waiting: "border-warn bg-warn-soft text-warn",
    open: "border-brand bg-brand-soft text-brand-dark",
    finished: "border-line bg-card text-ink-soft",
  }[state];

  const dot = {
    waiting: "bg-warn",
    open: "bg-brand",
    finished: "bg-ink-soft",
  }[state];

  const heading = {
    waiting: strings.admin.statusNotStarted,
    open: strings.admin.statusOpen,
    finished: strings.admin.statusFinished,
  }[state];

  return (
    <section
      aria-label={heading}
      className={`rounded-2xl border-2 p-4 ${styles}`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`h-3 w-3 shrink-0 rounded-full ${dot}`}
        />
        <h2 className="text-xl font-bold tracking-tight">{heading}</h2>
      </div>

      {state === "waiting" && data.opensAt && data.schedule === "before" ? (
        <>
          <Countdown
            target={data.opensAt}
            prefix={strings.admin.statusOpensIn}
            className="mt-2 text-2xl"
          />
          <p className="mt-1 text-base">
            {strings.admin.statusOpensAt(describeMoment(data.opensAt))}
          </p>
          <p className="mt-2 text-sm">{strings.admin.statusWaiting}</p>
        </>
      ) : state === "waiting" ? (
        <p className="mt-2 text-base">{strings.admin.statusNotStartedHelp}</p>
      ) : null}

      {state === "open" ? (
        data.closesAt ? (
          <>
            <Countdown
              target={data.closesAt}
              prefix={strings.admin.statusClosesIn}
              className="mt-2 text-2xl"
            />
            <p className="mt-1 text-base">
              {strings.admin.statusClosesAt(describeMoment(data.closesAt))}
            </p>
          </>
        ) : (
          <p className="mt-2 text-base">{strings.admin.statusNoSchedule}</p>
        )
      ) : null}

      {state === "finished" ? (
        <p className="mt-2 text-base">
          {data.closedAt || data.closesAt
            ? strings.admin.statusClosedAt(
                describeMoment(data.closedAt ?? data.closesAt),
              )
            : strings.admin.statusFinished}
        </p>
      ) : null}
    </section>
  );
}
