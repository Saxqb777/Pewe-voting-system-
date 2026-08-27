"use client";

import { strings } from "@/lib/strings";
import "./globals.css";

/** Last line of defence. Replaces the whole document, so it carries its own html tags. */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8 text-center">
          <h1 className="text-3xl font-bold text-ink">
            {strings.common.errorTitle}
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            {strings.common.errorLead}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 min-h-14 w-full rounded-xl bg-brand px-4 py-4 text-lg font-bold text-white"
          >
            {strings.common.errorRetry}
          </button>
        </div>
      </body>
    </html>
  );
}
