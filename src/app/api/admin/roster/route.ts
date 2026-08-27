import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { sql, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The Voter ID sheet: every person, their candidate number and their private
 * Voter ID. Admin only, and never reachable from a voter screen. It touches
 * the register alone and never reads the ballots table.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  await ensureSchema();
  const rows = await sql<
    { candidate_number: number; name: string; voter_id: string }[]
  >`
    SELECT candidate_number, name, voter_id FROM voters
    ORDER BY candidate_number
  `;

  const lines = [["Candidate number", "Name", "Voter ID"].join(",")];
  for (const row of rows) {
    lines.push(
      [row.candidate_number, csvCell(row.name), csvCell(row.voter_id)].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="voter-id-sheet.csv"',
      "Cache-Control": "no-store",
    },
  });
}
