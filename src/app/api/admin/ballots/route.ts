import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getAnonymousBallots, VotingStillOpenError } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

/**
 * Every ballot, in a fresh random order, with nothing but the choices on it.
 * Useful for checking the count by hand. It carries no id, no time and no
 * person, so it stays anonymous.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  try {
    const ballots = await getAnonymousBallots();
    const width = ballots[0]?.length ?? 0;
    const header = Array.from({ length: width }, (_, i) => `Choice ${i + 1}`);
    const lines = [header.join(",")];
    for (const choices of ballots) lines.push(choices.join(","));
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="anonymous-ballots.csv"',
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
