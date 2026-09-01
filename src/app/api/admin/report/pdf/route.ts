import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getReport } from "@/lib/admin-data";
import { reportPdf, type ReportLang } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/**
 * The report as a printable page. Counts and shares, nothing else.
 *
 * One language per file. Two languages on one page would double its length
 * and halve how easily it can be read across a table.
 */
export async function GET(request: Request) {
  const lang: ReportLang =
    new URL(request.url).searchParams.get("lang") === "hi" ? "hi" : "en";
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

  const bytes = await reportPdf(report, `${when} India time`, lang);
  const stamp = report.takenAt.slice(0, 16).replace(/[:T]/g, "-");
  const name = lang === "hi" ? `pewe-2026-report-hinglish-${stamp}` : `pewe-2026-report-${stamp}`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
