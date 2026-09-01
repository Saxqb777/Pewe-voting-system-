import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getReport } from "@/lib/admin-data";
import { reportPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/** The report as a printable page. Counts and shares, nothing else. */
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

  const bytes = await reportPdf(report, `${when} India time`);
  const stamp = report.takenAt.slice(0, 16).replace(/[:T]/g, "-");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pewe-2026-report-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
