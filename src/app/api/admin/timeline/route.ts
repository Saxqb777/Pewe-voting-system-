import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getVotingTimeline } from "@/lib/admin-data";
import { timelinePdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/**
 * How the voting went, hour by hour.
 *
 * Counted from the register, which keeps the hour and nothing finer. It
 * carries no names and nothing about anybody's choices, so unlike the
 * chasing lists this one is safe to send to the whole society.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const timeline = await getVotingTimeline();
  const now = new Date();
  const when = now.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const bytes = await timelinePdf(timeline, `${when} India time`);
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pewe-2026-voting-timeline-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
