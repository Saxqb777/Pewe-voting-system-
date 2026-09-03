"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBallot } from "@/actions/voter";
import { strings } from "@/lib/strings";
import type { Candidate } from "@/lib/candidates";

type Step = "select" | "confirm";

export function BallotFlow({
  candidates,
  required,
  countdown,
}: {
  candidates: Candidate[];
  required: number;
  countdown?: React.ReactNode;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byNumber = useMemo(() => {
    const map = new Map<number, Candidate>();
    for (const c of candidates) map.set(c.number, c);
    return map;
  }, [candidates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return candidates;
    // Searching by phone number as well, since that is how somebody with a
    // common name will be told apart.
    const digits = q.replace(/\D/g, "");
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.number) === q ||
        (digits.length >= 4 && c.phone.replace(/\D/g, "").includes(digits)),
    );
  }, [candidates, query]);

  const count = selected.length;
  const remaining = required - count;
  const complete = count === required;

  function toggle(number: number) {
    setError(null);
    // Nobody votes for himself. Refused again on the server, so this only
    // saves him the round trip and tells him why.
    if (byNumber.get(number)?.isYou) {
      setError(strings.ballot.noSelfVote);
      return;
    }
    setSelected((current) => {
      if (current.includes(number)) return current.filter((n) => n !== number);
      if (current.length >= required) {
        setError(strings.ballot.alreadyFull(required));
        return current;
      }
      return [...current, number].sort((a, b) => a - b);
    });
  }

  function onConfirm() {
    if (pending || !complete) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitBallot(selected);
        if (result.status === "ok") {
          router.replace("/done");
          return;
        }
        if (result.status === "already_voted") {
          router.replace("/already");
          return;
        }
        if (result.status === "session_expired") {
          router.replace("/");
          return;
        }
        if (result.status === "closed") {
          router.replace("/");
          return;
        }
        setError(
          result.status === "self_vote"
            ? strings.ballot.noSelfVote
            : strings.common.somethingWentWrong,
        );
        setStep("select");
      } catch {
        setError(strings.common.somethingWentWrong);
      }
    });
  }

  if (step === "confirm") {
    return (
      <ConfirmStep
        names={selected.map((n) => byNumber.get(n)!).filter(Boolean)}
        pending={pending}
        error={error}
        onBack={() => setStep("select")}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <div className="pb-56">
      <h1 className="text-2xl font-bold text-ink">{strings.ballot.title}</h1>
      <p className="mt-1 text-base text-ink-soft">
        {strings.ballot.instruction(required)}
      </p>
      {countdown}

      <div className="sticky top-0 z-30 -mx-5 bg-paper px-5 pb-3 pt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={strings.ballot.searchPlaceholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={strings.ballot.searchPlaceholder}
          className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base text-ink placeholder:text-ink-soft focus:border-brand"
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-center text-base text-ink-soft">
          {strings.ballot.noResults}
        </p>
      ) : (
        <ul className="mt-1 space-y-2">
          {visible.map((c) => {
            const isOn = selected.includes(c.number);
            const you = c.isYou === true;
            return (
              <li key={c.number}>
                <button
                  type="button"
                  onClick={() => toggle(c.number)}
                  disabled={you}
                  aria-pressed={isOn}
                  className={`flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left ${
                    you
                      ? "cursor-not-allowed border-dashed border-line bg-paper opacity-70"
                      : isOn
                        ? "border-brand bg-brand-soft"
                        : "border-line bg-card active:bg-brand-soft"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      isOn ? "bg-brand text-white" : "bg-paper text-ink-soft"
                    }`}
                  >
                    {c.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-medium text-ink">
                      {c.name}
                    </span>
                    {c.phone ? (
                      <span className="block font-mono text-sm text-ink-soft">
                        {c.phone}
                      </span>
                    ) : null}
                    {you ? (
                      <span className="mt-0.5 block text-sm font-semibold text-ink-soft">
                        {strings.ballot.thisIsYou}
                        <span className="ml-2 font-normal">
                          {strings.ballot.thisIsYouHi}
                        </span>
                      </span>
                    ) : null}
                  </span>
                  {you ? null : (
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold ${
                        isOn
                          ? "border-brand bg-brand text-white"
                          : "border-line text-transparent"
                      }`}
                    >
                      {isOn ? "✓" : ""}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-card px-4 pb-[env(safe-area-inset-bottom)] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        {selected.length > 0 ? (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {selected.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark"
                aria-label={`Remove ${byNumber.get(n)?.name ?? n}`}
              >
                <span className="max-w-40 truncate">
                  {byNumber.get(n)?.name ?? n}
                </span>
                <span aria-hidden className="text-base leading-none">
                  &times;
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mb-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        <div className="pb-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lg font-bold text-ink">
              {strings.ballot.counter(count, required)}
            </p>
            {!complete ? (
              <p className="text-sm text-ink-soft">
                {strings.ballot.needMore(remaining)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!complete}
            onClick={() => {
              setStep("confirm");
              window.scrollTo(0, 0);
            }}
            className="mt-2 min-h-14 w-full rounded-xl bg-brand px-4 py-3 text-lg font-bold text-white active:bg-brand-dark disabled:bg-line disabled:text-ink-soft"
          >
            {strings.ballot.review}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmStep({
  names,
  pending,
  error,
  onBack,
  onConfirm,
}: {
  names: Candidate[];
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{strings.confirm.title}</h1>
      <p className="mt-2 text-base text-ink-soft">{strings.confirm.lead}</p>

      <ol className="mt-5 space-y-2">
        {names.map((c, i) => (
          <li
            key={c.number}
            className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-line bg-card px-3 py-2"
          >
            <span className="w-6 shrink-0 text-right text-sm font-bold text-ink-soft">
              {i + 1}
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-bold text-brand-dark">
              {c.number}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-medium text-ink">{c.name}</span>
              {c.phone ? (
                <span className="block font-mono text-sm text-ink-soft">
                  {c.phone}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-5 rounded-xl bg-warn-soft px-4 py-3 text-base font-medium text-warn">
        {strings.confirm.warning}
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-base font-medium text-danger"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="mt-5 min-h-16 w-full rounded-xl bg-brand px-4 py-4 text-lg font-bold text-white active:bg-brand-dark disabled:bg-line disabled:text-ink-soft"
      >
        {pending ? strings.confirm.submitting : strings.confirm.submit}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={pending}
        className="mt-3 min-h-14 w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base font-semibold text-ink disabled:opacity-60"
      >
        {strings.confirm.change}
      </button>

      {pending ? (
        <p className="mt-3 text-center text-sm text-ink-soft">
          {strings.common.slowConnectionHint}
        </p>
      ) : null}
    </div>
  );
}
