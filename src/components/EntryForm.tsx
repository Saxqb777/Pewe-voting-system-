"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { verifyVoterIdForm, type VerifyState } from "@/actions/voter";
import { deviceFingerprint } from "@/lib/fingerprint";
import { strings } from "@/lib/strings";
import {
  COMMON_COUNTRIES,
  OTHER_COUNTRIES,
  OTHER_LABEL,
} from "@/lib/countries";

const EMPTY: VerifyState = { error: null };

/**
 * A plain HTML form pointed at a server action. It submits and works before
 * the page's JavaScript has loaded, which matters on a slow connection, and
 * gains the pending label once it has.
 */
export function EntryForm({ numericIds }: { numericIds: boolean }) {
  const [state, formAction] = useActionState(verifyVoterIdForm, EMPTY);
  const [fingerprint, setFingerprint] = useState("");

  // Needs a browser, so it fills in after the page loads. It is only used for
  // admin flagging, so an empty one costs a voter nothing.
  useEffect(() => setFingerprint(deviceFingerprint()), []);

  return (
    <form action={formAction} className="w-full">
      <label
        htmlFor="voterId"
        className="mb-2 block text-base font-semibold text-ink"
      >
        {strings.entry.label}
      </label>
      <input
        id="voterId"
        name="voterId"
        required
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode={numericIds ? "numeric" : "text"}
        enterKeyHint="go"
        placeholder={strings.entry.placeholder}
        aria-describedby={state.error ? "voterIdError" : "voterIdHelp"}
        aria-invalid={state.error ? true : undefined}
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-4 text-center text-2xl font-semibold tracking-widest text-ink placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-soft focus:border-brand"
      />
      <input type="hidden" name="fingerprint" value={fingerprint} />

      <label
        htmlFor="country"
        className="mb-2 mt-6 block text-base font-semibold text-ink"
      >
        {strings.entry.countryLabel}
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
          {strings.entry.countryPlaceholder}
        </option>
        <optgroup label={strings.entry.countryCommon}>
          {COMMON_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </optgroup>
        <optgroup label={strings.entry.countryOther}>
          {OTHER_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={OTHER_LABEL}>{OTHER_LABEL}</option>
        </optgroup>
      </select>
      <p id="countryHelp" className="mt-2 text-sm text-ink-soft">
        {strings.entry.countryHelp}
      </p>

      {state.error ? (
        <p
          id="voterIdError"
          role="alert"
          className="mt-3 rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger"
        >
          {state.error}
        </p>
      ) : (
        <p id="voterIdHelp" className="mt-3 text-sm text-ink-soft">
          {strings.entry.help}
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
        {pending ? strings.entry.checking : strings.entry.submit}
      </button>
      {pending ? (
        <p className="mt-3 text-center text-sm text-ink-soft">
          {strings.common.slowConnectionHint}
        </p>
      ) : null}
    </>
  );
}
