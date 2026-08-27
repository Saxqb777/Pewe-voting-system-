"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSignIn } from "@/actions/admin";
import { strings } from "@/lib/strings";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await adminSignIn(password);
      if (result.ok) {
        setPassword("");
        router.refresh();
      } else {
        setError(result.message);
        setPassword("");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-16 w-full max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-ink">
        {strings.admin.title}
      </h1>
      <label htmlFor="pw" className="mb-2 block font-semibold text-ink">
        {strings.admin.passwordLabel}
      </label>
      <input
        id="pw"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        disabled={pending}
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-lg text-ink focus:border-brand"
      />
      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="mt-5 min-h-14 w-full rounded-xl bg-brand px-4 py-3 text-lg font-bold text-white active:bg-brand-dark disabled:bg-line disabled:text-ink-soft"
      >
        {pending ? strings.common.loading : strings.admin.signIn}
      </button>
    </form>
  );
}
