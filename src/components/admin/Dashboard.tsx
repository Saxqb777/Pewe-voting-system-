"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { Dashboard as DashboardData } from "@/lib/admin-data";
import { strings } from "@/lib/strings";
import { RESET_PHRASE, LIVE_OVERRIDE_PHRASE } from "@/lib/phrases";
import {
  adminSignOut,
  closeVoting,
  reopenVoting,
  loadDummyVoters,
  loadRoster,
  loadRosterFromNames,
  setPracticeSize,
  setVotingWindow,
  clearVotingWindow,
  clearPracticeSize,
  resetForLive,
  resetVote,
  switchToTestMode,
  unlockAllSessions,
  unlockSession,
  unlockVoter,
  type ActionResult,
} from "@/actions/admin";
import { Button, Notice, Section } from "./ui";

const POLL_MS = 10000;

export function Dashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as DashboardData);
    } catch {
      // A missed poll is harmless. The next one will catch up.
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const run = useCallback(
    (action: () => Promise<ActionResult>) => {
      startTransition(async () => {
        try {
          const result = await action();
          setMessage(result);
        } catch {
          setMessage({ ok: false, message: strings.common.somethingWentWrong });
        }
        await refresh();
      });
    },
    [refresh],
  );

  const pendingVoters = data.voters.filter((v) => !v.hasVoted);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{strings.admin.title}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
              data.mode === "test"
                ? "bg-warn text-white"
                : "bg-brand text-white"
            }`}
          >
            {data.mode === "test" ? strings.admin.modeTest : strings.admin.modeLive}
          </span>
        </div>
        <Button onClick={() => run(adminSignOut)} disabled={pending}>
          {strings.admin.signOut}
        </Button>
      </header>

      {message ? (
        <Notice tone={message.ok ? "good" : "danger"}>
          {message.message ?? "Done."}
        </Notice>
      ) : null}

      <TurnoutPanel data={data} />
      <ClosePanel data={data} run={run} pending={pending} />
      <SchedulePanel data={data} run={run} pending={pending} />
      <PendingPanel voters={pendingVoters} total={data.turnout.total} />
      <VoterToolsPanel data={data} run={run} pending={pending} />
      <FlagsPanel data={data} run={run} pending={pending} />
      {data.mode === "test" ? (
        <PracticePanel data={data} run={run} pending={pending} />
      ) : null}
      <RosterPanel data={data} run={run} pending={pending} />
      <ResetPanel data={data} run={run} pending={pending} />
      <AuditPanel data={data} />
    </div>
  );
}

type RunFn = (action: () => Promise<ActionResult>) => void;

function TurnoutPanel({ data }: { data: DashboardData }) {
  const { voted, total, ballots } = data.turnout;
  const percent = total > 0 ? Math.round((voted / total) * 100) : 0;
  return (
    <Section title={strings.admin.turnoutHeading}>
      <p className="text-4xl font-bold text-brand">
        {strings.admin.turnout(voted, total)}
      </p>
      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-paper"
        role="img"
        aria-label={`${percent} percent`}
      >
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {strings.admin.ballotsInBox(ballots)}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{strings.admin.autoRefresh}</p>
    </Section>
  );
}

function ClosePanel({
  data,
  run,
  pending,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
}) {
  return (
    <Section title={strings.admin.closeVotingHeading}>
      {data.votingOpen ? (
        <>
          <Notice tone="warn">{strings.admin.resultsHidden}</Notice>
          <p className="mt-2 text-sm text-ink-soft">
            {strings.admin.resultsHiddenNote}
          </p>
          <div className="mt-4">
            <Button
              tone="danger"
              disabled={pending}
              onClick={() => {
                if (window.confirm(strings.admin.closeVotingConfirm)) {
                  run(closeVoting);
                }
              }}
            >
              {strings.admin.closeVoting}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Notice tone="good">
            {strings.admin.votingClosedAt(
              data.closedAt ? new Date(data.closedAt).toLocaleString() : "",
            )}
          </Notice>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/results"
              className="inline-flex min-h-12 items-center rounded-xl bg-brand px-4 py-2 text-base font-semibold text-white"
            >
              {strings.admin.viewResults}
            </Link>
            <Button disabled={pending} onClick={() => run(reopenVoting)}>
              {strings.admin.reopenVoting}
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}

/** Turns an exact moment into the value a datetime-local box expects. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Reads a datetime-local value back as an exact moment. */
function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function longTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SchedulePanel({
  data,
  run,
  pending,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
}) {
  const [opens, setOpens] = useState(() => toLocalInput(data.opensAt));
  const [closes, setCloses] = useState(() => toLocalInput(data.closesAt));

  const backwards =
    opens !== "" && closes !== "" && new Date(closes) <= new Date(opens);

  // The button is dead until there is something to save. Say so, rather than
  // leaving somebody to work out why it will not press.
  const nothingToSave = opens === "" && closes === "";

  const state =
    data.schedule === "before"
      ? strings.admin.scheduleBefore(longTime(data.opensAt))
      : data.schedule === "during"
        ? data.closesAt
          ? strings.admin.scheduleDuring(longTime(data.closesAt))
          : strings.admin.scheduleDuringNoEnd
        : data.schedule === "after"
          ? strings.admin.scheduleAfter(longTime(data.closesAt))
          : strings.admin.scheduleNone;

  return (
    <Section title={strings.admin.scheduleHeading}>
      <Notice
        tone={
          data.schedule === "during"
            ? "good"
            : data.schedule === "none"
              ? "info"
              : "warn"
        }
      >
        {state}
      </Notice>

      <p className="mt-3 text-sm text-ink-soft">{strings.admin.scheduleHelp}</p>

      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">
            {strings.admin.scheduleOpens}
          </span>
          <input
            type="datetime-local"
            value={opens}
            onChange={(e) => setOpens(e.target.value)}
            className="rounded-xl border-2 border-line bg-card px-3 py-2 text-base text-ink focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">
            {strings.admin.scheduleCloses}
          </span>
          <input
            type="datetime-local"
            value={closes}
            onChange={(e) => setCloses(e.target.value)}
            className="rounded-xl border-2 border-line bg-card px-3 py-2 text-base text-ink focus:border-brand"
          />
        </label>
      </div>

      {backwards ? (
        <p className="mt-2 text-sm font-medium text-danger">
          {strings.admin.scheduleBackwards}
        </p>
      ) : nothingToSave ? (
        <p className="mt-2 text-sm text-ink-soft">
          {strings.admin.scheduleNeedOne}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          tone="primary"
          disabled={pending || backwards || nothingToSave}
          onClick={() => run(() => setVotingWindow(toIso(opens), toIso(closes)))}
        >
          {strings.admin.scheduleSave}
        </Button>
        {data.opensAt || data.closesAt ? (
          <Button
            disabled={pending}
            onClick={() => {
              setOpens("");
              setCloses("");
              run(clearVotingWindow);
            }}
          >
            {strings.admin.scheduleClear}
          </Button>
        ) : null}
      </div>
    </Section>
  );
}

function PendingPanel({
  voters,
  total,
}: {
  voters: DashboardData["voters"];
  total: number;
}) {
  const [copied, setCopied] = useState(false);
  const text = voters.map((v) => v.name).join("\n");

  return (
    <Section title={`${strings.admin.pendingHeading} (${voters.length})`}>
      {voters.length === 0 ? (
        <Notice tone="good">
          {total === 0 ? strings.admin.rosterEmpty : strings.admin.pendingEmpty}
        </Notice>
      ) : (
        <>
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {voters.map((v) => (
              <li
                key={v.voterId}
                className="flex items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2 text-base"
              >
                <span className="text-ink">{v.name}</span>
                <span className="font-mono text-xs text-ink-soft">
                  {v.voterId}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Button
              onClick={() => {
                void navigator.clipboard?.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? strings.admin.copied : strings.admin.copyPending}
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}

function VoterToolsPanel({
  data,
  run,
  pending,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches =
    q === ""
      ? []
      : data.voters
          .filter(
            (v) =>
              v.name.toLowerCase().includes(q) ||
              v.voterId.toLowerCase().includes(q),
          )
          .slice(0, 12);

  return (
    <Section title="Find a voter">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or Voter ID"
        className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base text-ink focus:border-brand"
      />
      {q !== "" && matches.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">No voter matches that.</p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {matches.map((v) => (
          <li
            key={v.voterId}
            className="rounded-xl border-2 border-line bg-paper p-3"
          >
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-base font-semibold text-ink">{v.name}</span>
              <span className="font-mono text-xs text-ink-soft">
                {v.voterId}
              </span>
              <span
                className={`text-sm font-medium ${
                  v.hasVoted ? "text-brand" : "text-ink-soft"
                }`}
              >
                {v.hasVoted ? "Voted" : "Not voted"}
              </span>
              {v.isLocked ? (
                <span className="text-sm font-medium text-danger">Locked</span>
              ) : null}
              {v.failedAttempts > 0 ? (
                <span className="text-sm text-warn">
                  {v.failedAttempts} failed attempts
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {v.isLocked || v.failedAttempts > 0 ? (
                <Button
                  disabled={pending}
                  onClick={() => run(() => unlockVoter(v.voterId))}
                >
                  {strings.admin.unlock}
                </Button>
              ) : null}
              {v.hasVoted ? (
                <Button
                  tone="danger"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(strings.admin.resetVoteConfirm)) {
                      run(() => resetVote(v.voterId));
                    }
                  }}
                >
                  {strings.admin.resetVote}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FlagsPanel({
  data,
  run,
  pending,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
}) {
  const f = data.flags;
  const empty =
    f.sharedDevices.length === 0 &&
    f.sharedIps.length === 0 &&
    f.failedVoters.length === 0 &&
    f.lockedVoters.length === 0 &&
    f.lockedSessions.length === 0;

  return (
    <Section title={strings.admin.flagsHeading}>
      <Notice tone="info">{strings.admin.flagsNote}</Notice>
      {empty ? (
        <p className="mt-3 text-base text-ink-soft">{strings.admin.flagsEmpty}</p>
      ) : (
        <div className="mt-3 space-y-4">
          {f.sharedDevices.map((d) => (
            <FlagGroup
              key={d.fingerprint}
              title={strings.admin.flagSharedDevice}
              detail={d.voters.map((v) => v.name).join(", ")}
            />
          ))}
          {f.sharedIps.map((g) => (
            <FlagGroup
              key={g.ip}
              title={`${strings.admin.flagSharedIp} (${g.voters.length})`}
              detail={g.voters.map((v) => v.name).join(", ")}
            />
          ))}
          {f.failedVoters.length > 0 ? (
            <FlagGroup
              title={strings.admin.flagFailedAttempts}
              detail={f.failedVoters
                .map((v) => `${v.name} (${v.attempts})`)
                .join(", ")}
            />
          ) : null}
          {f.lockedVoters.length > 0 ? (
            <FlagGroup
              title={strings.admin.flagLocked}
              detail={f.lockedVoters.map((v) => v.name).join(", ")}
            />
          ) : null}
          {f.lockedSessions.length > 0 ? (
            <div className="rounded-xl bg-warn-soft p-3">
              <p className="font-semibold text-warn">
                Phones locked after too many wrong Voter IDs
              </p>
              <ul className="mt-2 space-y-2">
                {f.lockedSessions.map((s) => (
                  <li
                    key={s.sessionId}
                    className="flex flex-wrap items-center gap-2 text-sm text-ink"
                  >
                    <span>{new Date(s.lockedAt).toLocaleString()}</span>
                    <span className="font-mono text-xs text-ink-soft">
                      {s.ip ?? "unknown network"}
                    </span>
                    <Button
                      disabled={pending}
                      onClick={() => run(() => unlockSession(s.sessionId))}
                    >
                      {strings.admin.unlock}
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Button
                  disabled={pending}
                  onClick={() => run(unlockAllSessions)}
                >
                  Unlock every phone
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Section>
  );
}

function FlagGroup({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl bg-warn-soft p-3">
      <p className="font-semibold text-warn">{title}</p>
      <p className="mt-1 text-sm text-ink">{detail}</p>
    </div>
  );
}

function PracticePanel({
  data,
  run,
  pending,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
}) {
  const [people, setPeople] = useState(20);
  const [picks, setPicks] = useState(5);
  const blocked = data.turnout.ballots > 0;
  const valid = people >= 3 && picks >= 1 && picks < people;

  return (
    <Section title={strings.admin.practiceHeading}>
      <Notice tone={data.isPracticeSize ? "warn" : "info"}>
        {data.isPracticeSize
          ? strings.admin.practiceActive(
              data.expectedVoterCount,
              data.selectionsRequired,
            )
          : strings.admin.practiceFull(
              data.liveVoterCount,
              data.liveSelections,
            )}
      </Notice>

      {blocked ? (
        <p className="mt-3 text-base text-ink-soft">
          {strings.admin.rosterBlocked}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-ink-soft">
            {strings.admin.practiceHelp}
          </p>

          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink">
                {strings.admin.practicePeople}
              </span>
              <input
                type="number"
                min={3}
                max={999}
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                className="w-32 rounded-xl border-2 border-line bg-card px-3 py-2 text-base text-ink focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink">
                {strings.admin.practicePicks}
              </span>
              <input
                type="number"
                min={1}
                max={998}
                value={picks}
                onChange={(e) => setPicks(Number(e.target.value))}
                className="w-32 rounded-xl border-2 border-line bg-card px-3 py-2 text-base text-ink focus:border-brand"
              />
            </label>
          </div>

          {!valid ? (
            <p className="mt-2 text-sm font-medium text-danger">
              Each voter has to choose fewer names than there are people.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              tone="primary"
              disabled={pending || !valid}
              onClick={() => run(() => setPracticeSize(people, picks))}
            >
              {strings.admin.practiceStart}
            </Button>
            {data.isPracticeSize ? (
              <Button disabled={pending} onClick={() => run(clearPracticeSize)}>
                {strings.admin.practiceClear}
              </Button>
            ) : null}
          </div>

          <p className="mt-3 text-sm text-ink-soft">
            {strings.admin.practiceNote}
          </p>
        </>
      )}
    </Section>
  );
}

function RosterPanel({
  data,
  run,
  pending,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
}) {
  const [text, setText] = useState("");
  const [makeIds, setMakeIds] = useState(true);
  const blocked = data.turnout.ballots > 0;
  const loaded = data.turnout.total > 0;

  return (
    <Section title={strings.admin.rosterHeading}>
      <p className="text-base text-ink">
        {loaded
          ? strings.admin.rosterCurrent(data.turnout.total)
          : strings.admin.rosterEmpty}
      </p>

      {loaded ? (
        <div className="mt-3">
          <a
            href="/api/admin/roster"
            className="inline-flex min-h-12 items-center rounded-xl border-2 border-line bg-card px-4 py-2 text-base font-semibold text-ink"
          >
            {strings.admin.rosterDownloadSheet}
          </a>
          <p className="mt-2 text-sm font-medium text-warn">
            {strings.admin.rosterSheetWarning}
          </p>
        </div>
      ) : null}

      {blocked ? (
        <div className="mt-3">
          <Notice tone="warn">{strings.admin.rosterBlocked}</Notice>
        </div>
      ) : (
        <>
          <fieldset className="mt-4">
            <legend className="sr-only">How the Voter IDs are set</legend>
            <label className="flex items-start gap-3 rounded-xl border-2 border-line bg-paper p-3">
              <input
                type="radio"
                name="rosterMode"
                checked={makeIds}
                onChange={() => setMakeIds(true)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span className="text-base font-medium text-ink">
                {strings.admin.rosterModeNames}
              </span>
            </label>
            <label className="mt-2 flex items-start gap-3 rounded-xl border-2 border-line bg-paper p-3">
              <input
                type="radio"
                name="rosterMode"
                checked={!makeIds}
                onChange={() => setMakeIds(false)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span className="text-base font-medium text-ink">
                {strings.admin.rosterModeIds}
              </span>
            </label>
          </fieldset>

          <p className="mt-3 text-sm text-ink-soft">
            {makeIds ? strings.admin.rosterNamesHelp : strings.admin.rosterHelp}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder={
              makeIds
                ? "Amina Khan\nBilal Shah\nChandra Baig"
                : "100001,Amina Khan\n100002,Bilal Shah"
            }
            className="mt-2 w-full rounded-xl border-2 border-line bg-card px-3 py-2 font-mono text-sm text-ink focus:border-brand"
          />
          <p
            className={`mt-1 text-sm ${
              countRows(text) === data.expectedVoterCount
                ? "font-medium text-brand"
                : "text-ink-soft"
            }`}
          >
            {strings.admin.rosterRowCount(
              countRows(text),
              data.expectedVoterCount,
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              tone="primary"
              disabled={pending || text.trim().length === 0}
              onClick={() =>
                run(() =>
                  makeIds ? loadRosterFromNames(text) : loadRoster(text),
                )
              }
            >
              {strings.admin.rosterLoad}
            </Button>
            {data.mode === "test" ? (
              <Button disabled={pending} onClick={() => run(loadDummyVoters)}>
                {strings.admin.rosterDummy}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </Section>
  );
}

/** Counts the non blank lines, so the admin can see the total before loading. */
function countRows(text: string): number {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function ResetPanel({
  data,
  run,
  pending,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
}) {
  const [phrase, setPhrase] = useState("");
  const [override, setOverride] = useState("");
  const isLive = data.mode === "live";

  return (
    <Section title={strings.admin.modeHeading} tone="danger">
      <p className="text-base text-ink">
        {strings.admin.resetForLiveHelp(RESET_PHRASE)}
      </p>
      <input
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder={RESET_PHRASE}
        autoCapitalize="characters"
        className="mt-3 w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base text-ink focus:border-danger"
      />
      {isLive ? (
        <>
          <div className="mt-3">
            <Notice tone="danger">
              {strings.admin.resetLiveOverrideHelp(LIVE_OVERRIDE_PHRASE)}
            </Notice>
          </div>
          <input
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder={LIVE_OVERRIDE_PHRASE}
            autoCapitalize="characters"
            className="mt-3 w-full rounded-xl border-2 border-danger bg-card px-4 py-3 text-base text-ink"
          />
        </>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          tone="danger"
          disabled={
            pending ||
            phrase.trim().toUpperCase() !== RESET_PHRASE ||
            (isLive && override.trim().toUpperCase() !== LIVE_OVERRIDE_PHRASE)
          }
          onClick={() => {
            run(() => resetForLive(phrase, override));
            setPhrase("");
            setOverride("");
          }}
        >
          {strings.admin.resetForLive}
        </Button>
        {isLive && data.turnout.ballots === 0 ? (
          <Button disabled={pending} onClick={() => run(switchToTestMode)}>
            Go back to test mode
          </Button>
        ) : null}
      </div>
    </Section>
  );
}

function AuditPanel({ data }: { data: DashboardData }) {
  return (
    <Section title={strings.admin.auditHeading}>
      {data.audit.length === 0 ? (
        <p className="text-base text-ink-soft">{strings.admin.auditEmpty}</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
          {data.audit.map((entry, i) => (
            <li key={i} className="rounded-lg bg-paper px-3 py-2">
              <span className="font-mono text-xs text-ink-soft">
                {new Date(entry.at).toLocaleString()}
              </span>
              <span className="ml-2 font-semibold text-ink">{entry.action}</span>
              {entry.detail ? (
                <span className="ml-2 text-ink-soft">{entry.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
