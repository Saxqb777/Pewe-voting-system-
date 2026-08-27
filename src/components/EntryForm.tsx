"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyVoterId } from "@/actions/voter";
import { deviceFingerprint } from "@/lib/fingerprint";
import { strings } from "@/lib/strings";

export function EntryForm({ numericIds }: { numericIds: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || stopped) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await verifyVoterId(value, deviceFingerprint());
        if (result.status === "ok") {
          router.push("/vote");
          return;
        }
        if (result.status === "locked") {
          setStopped(true);
          setError(strings.entry.locked);
        } else if (result.status === "closed") {
          setStopped(true);
          setError(strings.entry.closed);
        } else if (result.status === "not_ready") {
          setStopped(true);
          setError(strings.entry.notReady);
        } else {
          setError(strings.entry.generic);
          setValue("");
        }
      } catch {
        setError(strings.common.somethingWentWrong);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label
        htmlFor="voterId"
        className="mb-2 block text-base font-semibold text-ink"
      >
        {strings.entry.label}
      </label>
      <input
        id="voterId"
        name="voterId"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending || stopped}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode={numericIds ? "numeric" : "text"}
        enterKeyHint="go"
        placeholder={strings.entry.placeholder}
        aria-describedby={error ? "voterIdError" : "voterIdHelp"}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-4 text-center text-2xl font-semibold tracking-widest text-ink placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-soft focus:border-brand disabled:opacity-60"
      />

      {error ? (
        <p
          id="voterIdError"
          role="alert"
          className="mt-3 rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger"
        >
          {error}
        </p>
      ) : (
        <p id="voterIdHelp" className="mt-3 text-sm text-ink-soft">
          {strings.entry.help}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || stopped || value.trim().length === 0}
        className="mt-5 min-h-14 w-full rounded-xl bg-brand px-4 py-4 text-lg font-bold text-white active:bg-brand-dark disabled:bg-line disabled:text-ink-soft"
      >
        {pending ? strings.entry.checking : strings.entry.submit}
      </button>

      {pending ? (
        <p className="mt-3 text-center text-sm text-ink-soft">
          {strings.common.slowConnectionHint}
        </p>
      ) : null}
    </form>
  );
}
