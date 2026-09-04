"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { Dashboard as DashboardData } from "@/lib/admin-data";
import { strings } from "@/lib/strings";
import { describeMoment } from "@/lib/countdown";
import {
  RESET_PHRASE,
  LIVE_OVERRIDE_PHRASE,
  RESTART_PHRASE,
} from "@/lib/phrases";
import {
  adminSignOut,
  loadDummyVoters,
  loadRoster,
  loadRosterFromNames,
  setPracticeSize,
  restartElection,
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
import { ElectionFlow } from "./ElectionFlow";
import { ElectionStatus } from "./ElectionStatus";

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
  const registering = data.registration.open;

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

      <ElectionStatus data={data} />

      {registering ? (
        // While people are still putting their names in there is no roster to
        // run an election against. Every control that starts, schedules or
        // replaces one is off the page, so none of them can be pressed by
        // accident on a half built list.
        <>
          <ElectionFlow data={data} run={run} pending={pending} />
          <ReportPanel data={data} />
          <RosterPanel data={data} />
          <ResetPanel data={data} run={run} pending={pending} />
          <AuditPanel data={data} />
        </>
      ) : (
        <>
          <ElectionFlow data={data} run={run} pending={pending} />
          <TurnoutPanel data={data} />
          <ReportPanel data={data} />
          <PendingPanel voters={pendingVoters} total={data.turnout.total} />
          <VoterToolsPanel data={data} run={run} pending={pending} />
          <CountriesPanel data={data} />
          <FlagsPanel data={data} run={run} pending={pending} />
          <SchedulePanel data={data} run={run} pending={pending} />
          {data.mode === "test" ? (
            <PracticePanel data={data} run={run} pending={pending} />
          ) : null}
          {/* Pasting a list in would fight the register people built
              themselves, so it is only offered before registration is used. */}
          <RosterPanel data={data} />
          <RestartPanel data={data} run={run} pending={pending} />
          <ResetPanel data={data} run={run} pending={pending} />
          <AuditPanel data={data} />
        </>
      )}
    </div>
  );
}

type RunFn = (action: () => Promise<ActionResult>) => void;

/**
 * Where the election stands, in figures, with a copy to take away.
 *
 * Counts and shares only. Nothing in here names anybody or says a word about
 * how a single vote was cast, so it can go to the whole committee as it is.
 */
function ReportPanel({ data }: { data: DashboardData }) {
  const a = strings.admin;
  const r = data.report;
  const when = new Date(r.takenAt).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <Section title={a.reportHeading}>
      <p className="text-sm text-ink-soft">{a.reportTaken(`${when} India time`)}</p>
      <p className="mt-1 text-base font-semibold text-ink">
        {a.reportStage}: {r.stage}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{a.reportExpected(r.expected)}</p>

      {r.pace ? (
        <p className="mt-3 rounded-xl bg-paper px-4 py-3 text-base font-semibold text-ink">
          {r.pace}
        </p>
      ) : null}

      <ReportBlock title={a.reportTarget} rows={r.target} />
      <ReportBlock title={a.reportRegistration} rows={r.registration} />
      <ReportBlock title={a.reportVoting} rows={r.voting} />
      {r.countries.length > 0 ? (
        <ReportBlock title={a.reportCountries} rows={r.countries} />
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href="/api/admin/report/pdf"
          className="inline-flex min-h-12 items-center rounded-xl bg-brand px-4 py-2 text-base font-semibold text-white"
        >
          {a.reportDownload}
        </a>
        <a
          href="/api/admin/report/pdf?lang=hi"
          className="inline-flex min-h-12 items-center rounded-xl bg-brand px-4 py-2 text-base font-semibold text-white"
        >
          {a.reportDownloadHi}
        </a>
        <a
          href="/api/admin/report"
          className="inline-flex min-h-12 items-center rounded-xl border-2 border-line bg-card px-4 py-2 text-base font-semibold text-ink"
        >
          {a.reportDownloadCsv}
        </a>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{a.reportPrivacy}</p>
    </Section>
  );
}


/**
 * A link the admin has to pass on, shown so it can actually be passed on.
 *
 * The address itself is the link, because that is what a thumb goes for, and
 * a copy button sits beside it because the way this reaches anybody is being
 * pasted into WhatsApp, not opened here.
 */
function LinkBox({
  heading,
  help,
  url,
  warning,
  tone = "brand",
}: {
  heading: string;
  help: string;
  url: string;
  warning?: string;
  tone?: "brand" | "warn";
}) {
  const [copied, setCopied] = useState(false);
  const edge = tone === "warn" ? "border-warn" : "border-brand";
  const ink = tone === "warn" ? "text-warn" : "text-brand";

  return (
    <div className={`rounded-xl border-2 ${edge} bg-paper p-3`}>
      <h3 className="text-base font-bold text-ink">{heading}</h3>
      <p className="mt-1 text-sm text-ink-soft">{help}</p>

      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`mt-2 block select-all break-all font-mono text-sm font-semibold underline ${ink}`}
      >
        {url}
      </a>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Some phones refuse the clipboard. The address is selectable
              // above, so say nothing rather than throw a scary message.
              setCopied(false);
            }
          }}
          className="inline-flex min-h-12 items-center rounded-xl border-2 border-line bg-card px-4 py-2 text-base font-semibold text-ink"
        >
          {copied ? strings.admin.linkCopied : strings.admin.linkCopy}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center rounded-xl border-2 border-line bg-card px-4 py-2 text-base font-semibold text-ink"
        >
          {strings.admin.statusLinkOpen}
        </a>
      </div>

      {warning ? (
        <p className="mt-2 text-sm font-medium text-warn">{warning}</p>
      ) : null}
    </div>
  );
}

function ReportBlock({
  title,
  rows,
}: {
  title: string;
  rows: DashboardData["report"]["registration"];
}) {
  // A block with nothing in it is a heading over a gap. Once voting starts
  // the registration figures are emptied rather than frozen, so this is how
  // they leave the page.
  if (rows.length === 0) return null;
  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-soft">
        {title}
      </h3>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={`${title}-${row.label}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base text-ink">{row.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-bold tabular-nums text-ink">
                  {row.count}
                </span>
                {row.percent === null ? null : (
                  <span className="text-sm tabular-nums text-ink-soft">
                    {row.percent}% {strings.admin.reportOutOf(row.outOf)}
                  </span>
                )}
              </span>
            </div>
            {row.percent === null ? null : (
              <div
                aria-hidden
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-paper"
              >
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.min(100, row.percent)}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
      ? strings.admin.scheduleBefore(describeMoment(data.opensAt))
      : data.schedule === "during"
        ? data.closesAt
          ? strings.admin.scheduleDuring(describeMoment(data.closesAt))
          : strings.admin.scheduleDuringNoEnd
        : data.schedule === "after"
          ? strings.admin.scheduleAfter(describeMoment(data.closesAt))
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

function CountriesPanel({ data }: { data: DashboardData }) {
  const rows = data.countries;
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Section title={strings.admin.countriesHeading}>
      {rows.length === 0 ? (
        <p className="text-base text-ink-soft">
          {strings.admin.countriesEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <li key={row.country ?? "unknown"}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium text-ink">
                    {row.country ?? strings.admin.countriesUnknown}
                  </span>
                  <span className="text-base font-bold tabular-nums text-ink">
                    {row.count}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-sm text-ink-soft">
        {strings.admin.countriesNote}
      </p>
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

/**
 * What the register holds, and the sheet of codes.
 *
 * The list itself is built by people registering, so there is nothing to
 * paste in here. This exists to say how many are on it and to hand over the
 * sheet of codes for anyone who loses theirs.
 */
function RosterPanel({ data }: { data: DashboardData }) {
  const loaded = data.turnout.total > 0;

  return (
    <Section title={strings.admin.rosterHeading}>
      <p className="text-base text-ink">
        {loaded
          ? strings.admin.rosterCurrent(data.turnout.total)
          : strings.admin.rosterEmpty}
      </p>

      {loaded ? (
        <div className="mt-3 space-y-4">
          {/* One link, sent once. It saves the admin from being asked for the
              same file every time somebody new registers. */}
          <LinkBox
            heading={strings.admin.statusLinkHeading}
            help={strings.admin.statusLinkHelp}
            url={`${data.siteUrl}/status`}
          />

          {/* A second link, for the handful of people doing the ringing. Kept
              apart from the one the village has, because being named for not
              having voted yet is not a thing to publish. */}
          {data.hasStarted && data.chaseUrl ? (
            <LinkBox
              tone="warn"
              heading={strings.admin.chaseLinkHeading}
              help={strings.admin.chaseLinkHelp}
              url={data.chaseUrl}
              warning={strings.admin.chaseLinkWarning}
            />
          ) : null}

          {/* First, because a list that names only the men who are missing is
              what brought the complaints. */}
          <div>
            <a
              href="/api/admin/roster/both"
              className="inline-flex min-h-12 items-center rounded-xl bg-brand px-4 py-2 text-base font-semibold text-white"
            >
              {strings.admin.bothDownload}
            </a>
            <p className="mt-2 text-sm text-ink-soft">
              {strings.admin.bothDownloadHelp}
            </p>
          </div>

          <div>
            <a
              href="/api/admin/roster/names"
              className="inline-flex min-h-12 items-center rounded-xl border-2 border-line bg-card px-4 py-2 text-base font-semibold text-ink"
            >
              {strings.admin.namesDownload}
            </a>
            <p className="mt-2 text-sm text-ink-soft">
              {strings.admin.namesDownloadHelp}
            </p>
          </div>

          <div>
            <a
              href="/api/admin/roster/missing"
              className="inline-flex min-h-12 items-center rounded-xl border-2 border-warn bg-card px-4 py-2 text-base font-semibold text-warn"
            >
              {strings.admin.missingDownload}
            </a>
            <p className="mt-2 text-sm text-ink-soft">
              {strings.admin.missingDownloadHelp}
            </p>
          </div>

          {/* Only worth offering once there is a vote to chase. */}
          {data.hasStarted ? (
            <div>
              <a
                href="/api/admin/roster/notvoted"
                className="inline-flex min-h-12 items-center rounded-xl border-2 border-warn bg-card px-4 py-2 text-base font-semibold text-warn"
              >
                {strings.admin.notVotedDownload}
              </a>
              <p className="mt-2 text-sm text-ink-soft">
                {strings.admin.notVotedDownloadHelp}
              </p>
            </div>
          ) : null}

          <div>
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
        </div>
      ) : null}
    </Section>
  );
}

function countRows(text: string): number {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function RestartPanel({
  data,
  run,
  pending,
}: {
  data: DashboardData;
  run: RunFn;
  pending: boolean;
}) {
  const [phrase, setPhrase] = useState("");
  const isLive = data.mode === "live";
  const ready = !isLive || phrase.trim().toUpperCase() === RESTART_PHRASE;

  return (
    <Section title={strings.admin.restartHeading}>
      <p className="text-base text-ink">{strings.admin.restartHelp}</p>

      {isLive ? (
        <>
          <div className="mt-3">
            <Notice tone="danger">
              {strings.admin.restartLiveWarning(RESTART_PHRASE)}
            </Notice>
          </div>
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={RESTART_PHRASE}
            autoCapitalize="characters"
            className="mt-3 w-full rounded-xl border-2 border-danger bg-card px-4 py-3 text-base text-ink"
          />
        </>
      ) : null}

      <div className="mt-3">
        <Button
          tone="danger"
          disabled={pending || !ready}
          onClick={() => {
            if (window.confirm(strings.admin.restartConfirm)) {
              run(() => restartElection(phrase));
              setPhrase("");
            }
          }}
        >
          {strings.admin.restartButton}
        </Button>
      </div>
    </Section>
  );
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
