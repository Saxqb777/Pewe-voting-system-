import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getReport } from "@/lib/admin-data";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

function cell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Where the election stands, as a spreadsheet.
 *
 * Counts and shares only. Not one name, number or code goes into it, and it
 * never reads a ballot's contents, so this file can be shown to the whole
 * committee without a second thought.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const report = await getReport();
  const when = new Date(report.takenAt).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const lines: string[] = [
    [cell(strings.common.orgName)].join(","),
    [cell(strings.common.registration)].join(","),
    [cell(strings.common.appName)].join(","),
    "",
    ["Report taken", cell(`${when} India time`)].join(","),
    ["Stage", cell(report.stage)].join(","),
    ["Expected to take part", report.expected].join(","),
    "",
    ["Section", "Figure", "Count", "Share", "Out of"].join(","),
  ];

  const block = (name: string, rows: typeof report.registration) => {
    for (const row of rows) {
      lines.push(
        [
          cell(name),
          cell(row.label),
          row.count,
          row.percent === null ? "" : `${row.percent}%`,
          cell(row.outOf),
        ].join(","),
      );
    }
  };

  block("Registration", report.registration);
  block("Voting", report.voting);
  block("Where they are", report.countries);

  const stamp = report.takenAt.slice(0, 16).replace(/[:T]/g, "-");
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pewe-2026-report-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
