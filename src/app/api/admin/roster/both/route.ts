import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { splitTheList } from "@/lib/admin-data";
import { bothListsPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/**
 * The society's list, both sides of it.
 *
 * Made to be sent to the group: a man who has registered finds his own name
 * on the first list and stops asking, and the two counts add up to the list
 * everybody already knows the size of. No codes, and nothing about voting.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const { registered, missing } = await splitTheList();
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

  const bytes = await bothListsPdf(registered, missing, `${when} India time`);
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pewe-2026-both-lists-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
