import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getNotVotedList } from "@/lib/admin-data";
import { namesPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/**
 * Who is still to vote.
 *
 * The admin's own list for the day, the same way the registration one
 * worked: names and numbers to ring, and no voting codes on it, because
 * this file gets passed around a room. Never for the group, since nobody
 * should be named in public for not having voted yet.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const rows = await getNotVotedList();
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

  const bytes = await namesPdf(rows, `${when} India time`, "notvoted");
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pewe-2026-not-voted-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
