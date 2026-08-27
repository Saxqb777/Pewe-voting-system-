"use client";

import { strings } from "@/lib/strings";

/**
 * Shown when a page fails to render, most likely because the database is
 * briefly unreachable. A voter must never see a stack trace, and the message
 * must never carry anything about a ballot, so nothing from the error is
 * printed here.
 */
export default function ErrorScreen({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8 text-center">
      <h1 className="text-3xl font-bold text-ink">{strings.common.errorTitle}</h1>
      <p className="mt-3 text-lg text-ink-soft">{strings.common.errorLead}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 min-h-14 w-full rounded-xl bg-brand px-4 py-4 text-lg font-bold text-white active:bg-brand-dark"
      >
        {strings.common.errorRetry}
      </button>
      <p className="mt-4 text-base text-ink-soft">
        {strings.common.errorContact}
      </p>
    </div>
  );
}
