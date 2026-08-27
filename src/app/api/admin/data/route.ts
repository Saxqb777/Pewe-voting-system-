import { NextResponse } from "next/server";
import { readAdminSession } from "@/lib/session";
import { getDashboard } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

/**
 * Polled by the dashboard. Returns turnout, the register and the flags.
 * It never reads the ballots table beyond counting rows, so it cannot leak a
 * partial result.
 */
export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const data = await getDashboard();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
