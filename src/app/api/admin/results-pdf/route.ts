import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getResults, VotingStillOpenError } from "@/lib/admin-data";
import { resultsPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/**
 * The result, as a document.
 *
 * Behind the admin sign in like every other reading of the count, and
 * refused outright while voting is still open, so no path in this app can
 * hand anybody a partial result.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let results;
  try {
    results = await getResults();
  } catch (error) {
    if (error instanceof VotingStillOpenError) {
      return NextResponse.json({ error: "voting is still open" }, { status: 409 });
    }
    throw error;
  }

  const now = new Date();
  const when = now.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const bytes = await resultsPdf(results, `${when} India time`);
  const stamp = now.toISOString().slice(0, 10);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pewe-2026-result-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
