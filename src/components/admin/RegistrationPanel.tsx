"use client";

import { useState } from "react";
import { Button, Notice, Section } from "./ui";
import { strings } from "@/lib/strings";
import { displayPhone } from "@/lib/phone";
import { REGISTRATION_PHRASE } from "@/lib/phrases";
import type { Dashboard as DashboardData } from "@/lib/admin-data";
import {
  loadAllowedNumbers,
  openRegistration,
  approveRegistration,
  rejectRegistration,
  confirmRoster,
  type AdminResult,
} from "@/actions/registration";

type RunFn = (action: () => Promise<AdminResult>) => void;

/** The dates as a person reads them, in the timezone of whoever is looking. */
function readable(iso: string | null): string {
  if (!iso) return "";
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  return when.toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RegistrationPanel({
  data,
  run,
  pending,
  defaultOpensAt,
  defaultClosesAt,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
  defaultOpensAt: string;
  defaultClosesAt: string;
}) {
  const reg = data.registration;
  const a = strings.admin;
  const [allowText, setAllowText] = useState("");
  const [phrase, setPhrase] = useState("");
  const blocked = data.turnout.ballots > 0;

  if (reg.locked) {
    return (
      <Section title={a.regHeading}>
        <Notice tone="good">{a.regLocked(reg.approved.length)}</Notice>
      </Section>
    );
  }

  if (!reg.open) {
    return (
      <Section title={a.regHeading}>
        <p className="text-base text-ink">{a.regNotStarted}</p>

        <label
          htmlFor="allowedNumbers"
          className="mt-4 mb-2 block text-base font-semibold text-ink"
        >
          {a.regAllowedLabel}
        </label>
        <textarea
          id="allowedNumbers"
          rows={6}
          value={allowText}
          onChange={(e) => setAllowText(e.target.value)}
          className="w-full rounded-xl border-2 border-line bg-paper p-3 font-mono text-sm text-ink"
        />
        <p className="mt-2 text-sm text-ink-soft">{a.regAllowedHelp}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            tone="primary"
            disabled={pending || allowText.trim() === ""}
            onClick={() => run(() => loadAllowedNumbers(allowText))}
          >
            {a.regAllowedLoad}
          </Button>
          <span className="text-sm text-ink-soft">
            {a.regAllowedCount(reg.allowedCount)}
          </span>
        </div>

        <hr className="my-5 border-line" />

        <h3 className="text-base font-bold text-ink">{a.regOpenHeading}</h3>
        <p className="mt-1 text-sm text-warn">
          {a.regOpenWarning(REGISTRATION_PHRASE)}
        </p>
        <input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder={a.regOpenPlaceholder}
          aria-label={a.regOpenHeading}
          className="mt-2 w-full rounded-xl border-2 border-line bg-paper px-3 py-2 text-base text-ink"
        />
        <div className="mt-3">
          <Button
            tone="danger"
            disabled={pending || reg.allowedCount === 0}
            onClick={() => {
              run(() => openRegistration(phrase));
              setPhrase("");
            }}
          >
            {a.regOpenButton}
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <Section title={a.regHeading}>
      <p className="text-2xl font-bold text-brand-dark">
        {a.regLiveCount(reg.approved.length)}
      </p>

      {reg.pending.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-base font-bold text-warn">
            {a.regWaitingHeading(reg.pending.length)}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">{a.regWaitingHelp}</p>
          <ul className="mt-2 space-y-2">
            {reg.pending.map((p) => (
              <li
                key={p.voterId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-warn bg-warn-soft p-3"
              >
                <span>
                  <span className="block text-base font-semibold text-ink">
                    {p.name}
                  </span>
                  <span className="block font-mono text-sm text-ink-soft">
                    {displayPhone(p.phone)}
                  </span>
                </span>
                <span className="flex gap-2">
                  <Button
                    tone="primary"
                    disabled={pending}
                    onClick={() => run(() => approveRegistration(p.voterId))}
                  >
                    {a.regApprove}
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() => run(() => rejectRegistration(p.voterId))}
                  >
                    {a.regReject}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="text-base font-bold text-ink">
          {a.regRegisteredHeading(reg.approved.length)}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">{a.regRegisteredHelp}</p>
        <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
          {reg.approved.map((p) => (
            <li
              key={p.voterId}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-paper px-3 py-2"
            >
              <span className="text-base font-medium text-ink">{p.name}</span>
              <span className="flex items-baseline gap-3 font-mono text-sm">
                <span className="text-ink-soft">{displayPhone(p.phone)}</span>
                <span className="font-bold tracking-widest text-brand">
                  {p.voterId}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-bold text-ink">
          {a.regMissingHeading(reg.missing.length)}
        </h3>
        {reg.missing.length === 0 ? (
          <p className="mt-1 text-sm text-brand-dark">{a.regNobodyMissing}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">{a.regMissingHelp}</p>
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {reg.missing.map((m) => (
                <li
                  key={m.phone}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-paper px-3 py-2"
                >
                  <span className="text-base text-ink-soft">
                    {m.knownName || "No name on file"}
                  </span>
                  <span className="font-mono text-sm text-ink-soft">
                    {displayPhone(m.phone)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <hr className="my-5 border-line" />

      <h3 className="text-base font-bold text-ink">{a.regConfirmHeading}</h3>
      {blocked ? (
        <div className="mt-2">
          <Notice tone="danger">{a.regConfirmBlocked}</Notice>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            {a.regConfirmHelp(readable(defaultOpensAt), readable(defaultClosesAt))}
          </p>
          <div className="mt-3">
            <Button
              tone="primary"
              disabled={pending || reg.approved.length <= data.liveSelections}
              onClick={() => run(confirmRoster)}
            >
              {a.regConfirmButton}
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}
