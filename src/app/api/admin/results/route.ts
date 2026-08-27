import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getResults, VotingStillOpenError } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  try {
    const results = await getResults();
    const lines: string[] = [];
    lines.push(["Rank", "Candidate number", "Name", "Votes", "Winner"].join(","));
    for (const row of results.rows) {
      lines.push(
        [
          row.rank,
          row.number,
          csvCell(row.name),
          row.votes,
          row.isWinner ? "yes" : "",
        ].join(","),
      );
    }
    lines.push("");
    lines.push(["Ballots counted", results.totalBallots].join(","));
    lines.push(["Voters on the register", results.totalVoters].join(","));
    lines.push(["Voters marked as voted", results.totalMarkedVoted].join(","));
    lines.push(["Individual votes counted", results.totalVotesCast].join(","));
    lines.push(["Seats", results.seats].join(","));
    if (results.tie) {
      lines.push("");
      lines.push(
        csvCell(
          `UNBROKEN TIE at position ${results.tie.place} on ${results.tie.votes} votes`,
        ),
      );
      for (const name of results.tie.names) lines.push(csvCell(name));
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="election-results.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof VotingStillOpenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
