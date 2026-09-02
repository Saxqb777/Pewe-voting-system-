"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Notice, Section } from "./ui";
import { strings } from "@/lib/strings";
import { displayPhone } from "@/lib/phone";
import { REGISTRATION_PHRASE } from "@/lib/phrases";
import type { Dashboard } from "@/lib/admin-data";
import type { ActionResult } from "@/actions/admin";
import { closeVoting, reopenVoting, startVoting } from "@/actions/admin";
import {
  loadAllowedNumbers,
  openRegistration,
  approveRegistration,
  rejectRegistration,
  showCodeAgain,
  removeRegistration,
  confirmRoster,
} from "@/actions/registration";

type State = "done" | "now" | "later";
type RunFn = (action: () => Promise<ActionResult>) => void;

/**
 * A moment written in India time, because that is when the village votes.
 *
 * The admin may be sitting in the Gulf, where the reader's own timezone would
 * quietly show a different hour than the one everyone agreed on.
 */
function readable(iso: string | null): string {
  if (!iso) return "";
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  const text = when.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${text} India time`;
}

/**
 * The election, start to finish, as one list.
 *
 * Every step carries its own controls, and only the step that is due shows
 * them. The alternative, a list of steps at the top and the boxes they refer
 * to scattered down the page, means hunting for the right box at the moment
 * it matters most. Here the page always answers one question: what now.
 */
export function ElectionFlow({
  data,
  run,
  pending,
}: {
  data: Dashboard;
  run: RunFn;
  pending: boolean;
}) {
  const a = strings.admin;
  const reg = data.registration;
  const [allowText, setAllowText] = useState("");
  const [phrase, setPhrase] = useState("");

  const hasAllowList = reg.allowedCount > 0;
  const started = reg.open || reg.locked;
  const registered = reg.approved.length;
  const tooFew = registered <= data.liveSelections;
  const hasBallots = data.turnout.ballots > 0;
  // A trial run has to be undoable. Until the first ballot is cast, opening
  // registration again wipes the register and starts it clean, so the way
  // back from a practice round is one press rather than a reset that leaves
  // everybody's name behind.
  const canRestart = started && !hasBallots;

  const step: Record<number, State> = {
    1: hasAllowList ? "done" : "now",
    2: started ? "done" : hasAllowList ? "now" : "later",
    3: reg.locked ? "done" : reg.open ? "now" : "later",
    4: reg.locked ? "done" : reg.open ? "now" : "later",
    5: data.hasStarted ? "done" : reg.locked ? "now" : "later",
    6: data.votingEnded ? "done" : data.hasStarted ? "now" : "later",
    7: data.votingEnded ? "now" : "later",
  };

  return (
    <Section title={a.flowHeading}>
      <ol className="flex flex-col gap-1">
        {/* 1. who may register --------------------------------------- */}
        <Step n={1} state={step[1]} title={a.step1}
          detail={hasAllowList ? a.step1Done(reg.allowedCount) : a.step1Todo}>
          {/* Stays open for as long as the roster can still change. A number
              gets mistyped, or somebody is left off, and there has to be a way
              to put it right without tearing the election down. */}
          {reg.locked ? null : (
            <>
              <label htmlFor="allowedNumbers" className="sr-only">
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
              {hasAllowList ? (
                <p className="mt-2 text-sm font-medium text-warn">
                  {a.regAllowedReplace(reg.allowedCount)}
                </p>
              ) : null}
              <div className="mt-3">
                <Button
                  tone="primary"
                  disabled={pending || allowText.trim() === ""}
                  onClick={() => run(() => loadAllowedNumbers(allowText))}
                >
                  {a.regAllowedLoad}
                </Button>
              </div>
            </>
          )}
        </Step>

        {/* 2. open it ------------------------------------------------- */}
        <Step n={2} state={step[2]} title={a.step2}
          detail={started ? a.step2Done : a.step2Todo}>
          {step[2] === "now" || canRestart ? (
            <>
              {canRestart ? (
                <h4 className="mb-2 text-sm font-bold text-warn">{a.regRestartHeading}</h4>
              ) : null}
              <Notice tone="warn">
                {canRestart
                  ? a.regRestartWarning(registered, REGISTRATION_PHRASE)
                  : a.regOpenWarning(REGISTRATION_PHRASE)}
              </Notice>
              <input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={a.regOpenPlaceholder}
                aria-label={canRestart ? a.regRestartHeading : a.step2}
                className="mt-2 w-full rounded-xl border-2 border-line bg-paper px-3 py-2 text-base text-ink"
              />
              <div className="mt-3">
                <Button
                  tone="danger"
                  disabled={pending}
                  onClick={() => {
                    run(() => openRegistration(phrase));
                    setPhrase("");
                  }}
                >
                  {canRestart ? a.regRestartButton : a.regOpenButton}
                </Button>
              </div>
            </>
          ) : null}
        </Step>

        {/* 3. people arrive ------------------------------------------- */}
        <Step n={3} state={step[3]} title={a.step3}
          detail={
            reg.locked
              ? a.step3Done(registered)
              : reg.open
                ? a.step3Waiting(registered, reg.missing.length)
                : a.step3Todo
          }>
          {step[3] === "now" ? (
            <>
              {reg.pending.length > 0 ? (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-warn">
                    {a.regWaitingHeading(reg.pending.length)}
                  </h4>
                  <p className="mt-1 text-sm text-ink-soft">{a.regWaitingHelp}</p>
                  <ul className="mt-2 space-y-2">
                    {reg.pending.map((p) => (
                      <li key={p.voterId} data-registration="pending"
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-warn bg-warn-soft p-3">
                        <span>
                          <span className="block text-base font-semibold text-ink">{p.name}</span>
                          <span className="block font-mono text-sm text-ink-soft">
                            {displayPhone(p.phone)}
                          </span>
                        </span>
                        <span className="flex gap-2">
                          <Button tone="primary" disabled={pending}
                            onClick={() => run(() => approveRegistration(p.voterId))}>
                            {a.regApprove}
                          </Button>
                          <Button disabled={pending}
                            onClick={() => run(() => rejectRegistration(p.voterId))}>
                            {a.regReject}
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Each person carries the two things that go wrong: a code lost
                  before it was written down, and a registration that has to be
                  started over. */}
              <div>
                <h4 className="text-sm font-bold text-ink">
                  {a.regRegisteredHeading(registered)}
                </h4>
                <p className="mt-1 text-sm text-ink-soft">{a.regRegisteredHelp}</p>
                <p className="mt-1 text-sm text-ink-soft">{a.regRowHelp}</p>
                <ul className="mt-2 max-h-96 space-y-1 overflow-y-auto">
                  {reg.approved.map((p) => (
                    <li key={p.voterId} data-registration="approved"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-base text-ink">{p.name}</span>
                        <span className="block font-mono text-sm text-ink-soft">
                          {displayPhone(p.phone)}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold tracking-widest text-brand">
                          {p.voterId}
                        </span>
                        {p.showingCode ? (
                          <span className="text-sm font-medium text-warn">
                            {a.regShowingCode}
                          </span>
                        ) : (
                          <Button disabled={pending}
                            onClick={() => run(() => showCodeAgain(p.voterId))}>
                            {a.regShowCode}
                          </Button>
                        )}
                        <Button disabled={pending}
                          onClick={() => {
                            if (window.confirm(a.regRemoveConfirm(p.name))) {
                              run(() => removeRegistration(p.voterId));
                            }
                          }}>
                          {a.regRemove}
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                {reg.missing.length === 0 ? (
                  <p className="text-sm font-medium text-brand-dark">{a.regNobodyMissing}</p>
                ) : (
                  <People title={a.regMissingHeading(reg.missing.length)} help={a.regMissingHelp}
                    rows={reg.missing.map((m) => ({
                      key: m.phone, name: m.knownName || a.regNoNameOnFile, phone: m.phone,
                    }))} />
                )}
              </div>
            </>
          ) : null}
        </Step>

        {/* 4. fix the list -------------------------------------------- */}
        <Step n={4} state={step[4]} title={a.step4}
          detail={reg.locked ? a.step4Done(registered) : a.step4Todo}>
          {step[4] === "now" ? (
            <>
              <p className="text-sm text-ink-soft">
                {a.regConfirmHelp(readable(data.defaultOpensAt), readable(data.defaultClosesAt))}
              </p>
              {hasBallots ? (
                <div className="mt-2"><Notice tone="danger">{a.regConfirmBlocked}</Notice></div>
              ) : tooFew ? (
                <div className="mt-2">
                  <Notice tone="warn">{a.regConfirmTooFew(registered, data.liveSelections)}</Notice>
                </div>
              ) : null}
              <div className="mt-3">
                <Button tone="primary" disabled={pending || tooFew || hasBallots}
                  onClick={() => run(confirmRoster)}>
                  {a.regConfirmButton}
                </Button>
              </div>
            </>
          ) : null}
        </Step>

        {/* 5. voting opens -------------------------------------------- */}
        <Step n={5} state={step[5]} title={a.step5}
          detail={
            data.hasStarted ? a.step5Done
              : data.opensAt ? a.step5Auto(readable(data.opensAt))
                : a.step5Todo
          }>
          {step[5] === "now" ? (
            <Button disabled={pending}
              onClick={() => { if (window.confirm(a.step5Confirm)) run(startVoting); }}>
              {a.step5Button}
            </Button>
          ) : null}
        </Step>

        {/* 6. voting closes ------------------------------------------- */}
        <Step n={6} state={step[6]} title={a.step6}
          detail={
            data.votingEnded ? a.step6Done
              : data.closesAt ? a.step6Auto(readable(data.closesAt))
                : a.step6Todo
          }>
          {step[6] === "now" ? (
            <Button tone="danger" disabled={pending}
              onClick={() => { if (window.confirm(a.closeVotingConfirm)) run(closeVoting); }}>
              {a.closeVoting}
            </Button>
          ) : data.votingEnded ? (
            <Button disabled={pending} onClick={() => run(reopenVoting)}>
              {a.reopenVoting}
            </Button>
          ) : null}
        </Step>

        {/* 7. the result ---------------------------------------------- */}
        <Step n={7} state={step[7]} last title={a.step7}
          detail={data.votingEnded ? "" : a.step7Todo}>
          {step[7] === "now" ? (
            <Link href="/admin/results"
              className="inline-flex min-h-12 items-center rounded-xl bg-brand px-4 py-2 text-base font-semibold text-white">
              {a.viewResults}
            </Link>
          ) : null}
        </Step>
      </ol>
    </Section>
  );
}

function People({
  title,
  help,
  rows,
}: {
  title: string;
  help: string;
  rows: { key: string; name: string; phone: string; code?: string }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <p className="mt-1 text-sm text-ink-soft">{help}</p>
      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.key}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-paper px-3 py-2">
            <span className="text-base text-ink">{r.name}</span>
            <span className="flex items-baseline gap-3 font-mono text-sm">
              <span className="text-ink-soft">{displayPhone(r.phone)}</span>
              {r.code ? (
                <span className="font-bold tracking-widest text-brand">{r.code}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({
  n,
  state,
  title,
  detail,
  children,
  last,
}: {
  n: number;
  state: State;
  title: string;
  detail: string;
  children?: React.ReactNode;
  last?: boolean;
}) {
  const marker =
    state === "done"
      ? "border-brand bg-brand text-white"
      : state === "now"
        ? "border-brand bg-card text-brand"
        : "border-line bg-card text-ink-faint";

  return (
    <li className="relative flex gap-3 pb-4">
      {!last ? (
        <span aria-hidden className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-line" />
      ) : null}
      <span
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${marker}`}
      >
        {state === "done" ? "✓" : n}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-base font-bold ${
            state === "later" ? "text-ink-faint" : "text-ink"
          }`}
        >
          {title}
        </span>
        {detail ? <span className="block text-sm text-ink-soft">{detail}</span> : null}
        {children ? (
          <span className="mt-3 block rounded-xl border-2 border-line bg-paper p-3">
            {children}
          </span>
        ) : null}
      </span>
    </li>
  );
}
