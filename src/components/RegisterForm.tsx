"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerVoterForm, type RegisterState } from "@/actions/registration";
import { strings } from "@/lib/strings";

const START: RegisterState = { phase: "form", error: null };

/**
 * Name and number in one screen, because every extra screen loses people.
 *
 * A plain HTML form pointed at a server action, so it submits and works
 * before the page's JavaScript has loaded.
 */
export function RegisterForm() {
  const [state, formAction] = useActionState(registerVoterForm, START);
  const r = strings.register;

  if (state.phase === "done") {
    return (
      <section className="rounded-xl border-2 border-brand bg-card p-5 text-center">
        <h2 className="text-2xl font-bold text-ink">{r.doneTitle}</h2>
        <p className="mt-1 text-lg text-ink-soft">{state.name}</p>

        <p className="mt-6 text-base font-semibold text-ink">{r.codeLabel}</p>
        <p className="mt-1 select-all font-mono text-5xl font-bold tracking-widest text-brand">
          {state.code}
        </p>

        <p className="mt-6 rounded-lg bg-warn-soft px-4 py-3 text-left text-base font-semibold text-warn">
          {r.codeWarning}
          <span className="mt-1 block font-normal">{r.codeWarningHi}</span>
        </p>

        <p className="mt-4 text-left text-base text-ink-soft">{r.doneNext}</p>
      </section>
    );
  }

  if (state.phase === "pending") {
    return (
      <section className="rounded-xl border-2 border-line bg-card p-5">
        <h2 className="text-2xl font-bold text-ink">{r.pendingTitle}</h2>
        <p className="mt-1 text-lg text-ink-soft">{state.name}</p>
        <p className="mt-4 text-base text-ink-soft">{r.pendingLead}</p>
      </section>
    );
  }

  return (
    <form action={formAction} className="w-full">
      <label
        htmlFor="fullName"
        className="mb-2 block text-base font-semibold text-ink"
      >
        {r.nameLabel}
      </label>
      <input
        id="fullName"
        name="fullName"
        required
        autoComplete="name"
        autoCapitalize="words"
        enterKeyHint="next"
        placeholder={r.namePlaceholder}
        aria-describedby="nameHelp"
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-4 text-lg text-ink placeholder:text-base placeholder:text-ink-soft focus:border-brand"
      />
      <p id="nameHelp" className="mt-2 text-sm text-ink-soft">
        {r.nameHelp}
        <span className="mt-1 block">{r.nameHelpHi}</span>
      </p>

      <label
        htmlFor="phone"
        className="mb-2 mt-6 block text-base font-semibold text-ink"
      >
        {r.phoneLabel}
      </label>
      <input
        id="phone"
        name="phone"
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint="go"
        placeholder={r.phonePlaceholder}
        aria-describedby={state.error ? "registerError" : "phoneHelp"}
        aria-invalid={state.error ? true : undefined}
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-4 text-lg text-ink placeholder:text-base placeholder:text-ink-soft focus:border-brand"
      />

      {state.error ? (
        <p
          id="registerError"
          role="alert"
          className="mt-3 rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger"
        >
          {state.error}
        </p>
      ) : (
        <p id="phoneHelp" className="mt-2 text-sm text-ink-soft">
          {r.phoneHelp}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-14 w-full rounded-xl bg-brand px-4 py-4 text-lg font-bold text-white active:bg-brand-dark disabled:bg-line disabled:text-ink-soft"
      >
        {pending ? strings.register.working : strings.register.submit}
      </button>
      {pending ? (
        <p className="mt-3 text-center text-sm text-ink-soft">
          {strings.common.slowConnectionHint}
        </p>
      ) : null}
    </>
  );
}
