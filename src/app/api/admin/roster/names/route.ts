import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getRegisteredList } from "@/lib/admin-data";
import { namesPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/**
 * The list of who has registered, made to be sent to the group.
 *
 * Names, numbers and when each one came in. No voting codes: this page is
 * meant to be shared, and a code on it would let any reader vote as its
 * owner. It never touches the ballot box.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const rows = await getRegisteredList();
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

  const bytes = await namesPdf(rows, `${when} India time`);
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pewe-2026-registered-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
