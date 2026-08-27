"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminSignInForm, type AdminSignInState } from "@/actions/admin";
import { strings } from "@/lib/strings";

const EMPTY: AdminSignInState = { error: null };

export function AdminLogin() {
  const [state, formAction] = useActionState(adminSignInForm, EMPTY);

  return (
    <form action={formAction} className="mx-auto mt-16 w-full max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-ink">
        {strings.admin.title}
      </h1>
      <label htmlFor="pw" className="mb-2 block font-semibold text-ink">
        {strings.admin.passwordLabel}
      </label>
      <input
        id="pw"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-lg text-ink focus:border-brand"
      />
      {state.error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-danger"
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 min-h-14 w-full rounded-xl bg-brand px-4 py-3 text-lg font-bold text-white active:bg-brand-dark disabled:bg-line disabled:text-ink-soft"
    >
      {pending ? strings.common.loading : strings.admin.signIn}
    </button>
  );
}
