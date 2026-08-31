"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerVoterForm, type RegisterState } from "@/actions/registration";
import Link from "next/link";
import { strings } from "@/lib/strings";
import {
  COMMON_COUNTRIES,
  OTHER_COUNTRIES,
  OTHER_LABEL,
} from "@/lib/countries";

const START: RegisterState = { phase: "form", error: null };

/**
 * Name and number in one screen, because every extra screen loses people.
 *
 * A plain HTML form pointed at a server action, so it submits and works
 * before the page's JavaScript has loaded.
 *
 * `already` is what the register says about the person who registered on this
 * phone on an earlier visit, read fresh from the database rather than from
 * the phone. It is only ever consulted after the two phases below, so a man
 * who has just this moment registered still sees his code: the screen in
 * front of him always wins over an earlier visit.
 */
export type EarlierVisit = {
  name: string;
  /** How it went then, and where it stands now. */
  state: "registered" | "pending" | "approved";
};

export function RegisterForm({ already = null }: { already?: EarlierVisit | null }) {
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

        <p className="mt-5 text-left text-lg font-semibold text-brand-dark">
          {r.doneThanks}
        </p>
        <p className="mt-2 text-left text-base font-semibold text-ink">
          {r.doneKeep}
          <span className="mt-1 block font-normal text-ink-soft">{r.doneKeepHi}</span>
        </p>
        <p className="mt-3 text-left text-base text-ink-soft">
          {r.doneNext}
          <span className="mt-1 block">{r.doneNextHi}</span>
        </p>
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

  if (already) {
    const title =
      already.state === "pending"
        ? r.backPendingTitle
        : already.state === "approved"
          ? r.backApprovedTitle
          : r.backTitle;

    return (
      <section className="rounded-xl border-2 border-brand bg-card p-5">
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        <p className="mt-1 text-lg text-ink-soft">{r.backLead(already.name)}</p>

        {already.state === "pending" ? (
          <p className="mt-4 text-base text-ink-soft">{r.pendingLead}</p>
        ) : already.state === "approved" ? (
          <>
            <p className="mt-4 text-base text-ink-soft">
              {r.backApprovedLead}
              <span className="mt-1 block">{r.backApprovedLeadHi}</span>
            </p>
            <p className="mt-3 text-base text-ink-soft">
              {r.doneNext}
              <span className="mt-1 block">{r.doneNextHi}</span>
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-base font-semibold text-ink">
              {r.doneKeep}
              <span className="mt-1 block font-normal text-ink-soft">{r.doneKeepHi}</span>
            </p>
            <p className="mt-3 text-base text-ink-soft">
              {r.doneNext}
              <span className="mt-1 block">{r.doneNextHi}</span>
            </p>
            <p className="mt-3 text-base text-ink-soft">
              {r.backLost}
              <span className="mt-1 block">{r.backLostHi}</span>
            </p>
          </>
        )}

        {/* The wait is what he came back to check, so the way to it is the
            one thing on this screen to press. A real link, so it works before
            the page's JavaScript has loaded, and it moves without leaving the
            site or asking him to open anything again. */}
        {already.state === "pending" ? null : (
          <Link
            href="/countdown"
            className="mt-6 flex min-h-14 w-full flex-col items-center justify-center rounded-xl bg-brand px-4 py-3 text-center text-lg font-bold text-white active:bg-brand-dark"
          >
            {r.backCountdown}
            <span className="mt-0.5 block text-base font-normal">
              {r.backCountdownHi}
            </span>
          </Link>
        )}
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

      <label
        htmlFor="country"
        className="mb-2 mt-6 block text-base font-semibold text-ink"
      >
        {r.countryLabel}
      </label>
      <select
        id="country"
        name="country"
        required
        defaultValue=""
        aria-describedby="countryHelp"
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-4 text-lg text-ink focus:border-brand"
      >
        <option value="" disabled>
          {r.countryPlaceholder}
        </option>
        <optgroup label={r.countryCommon}>
          {COMMON_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </optgroup>
        <optgroup label={r.countryOther}>
          {OTHER_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={OTHER_LABEL}>{OTHER_LABEL}</option>
        </optgroup>
      </select>
      <p id="countryHelp" className="mt-2 text-sm text-ink-soft">
        {r.countryHelp}
        <span className="mt-1 block">{r.countryHelpHi}</span>
      </p>

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
