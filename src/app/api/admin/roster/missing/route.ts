import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getNotRegisteredList } from "@/lib/admin-data";
import { namesPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/**
 * Who the society is still waiting on.
 *
 * The admin's own chasing list: every number he loaded that has not
 * registered yet. Not for the group, because nobody should be named in
 * public for not having got round to it.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const rows = await getNotRegisteredList();
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

  const bytes = await namesPdf(rows, `${when} India time`, "missing");
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pewe-2026-not-registered-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
