import { checkConfig } from "@/lib/config";
import { readAdminSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { pingDatabase } from "@/lib/db";
import { getDashboard } from "@/lib/admin-data";
import { Screen } from "@/components/Screen";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Dashboard } from "@/components/admin/Dashboard";
import { SetupNeeded } from "@/components/admin/SetupNeeded";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Checked before anything touches the database, so a missing setting shows
  // as a clear list rather than a failed connection.
  const problems = checkConfig();
  if (problems.length > 0) {
    return (
      <Screen mode="live" wide>
        <SetupNeeded problems={problems} />
      </Screen>
    );
  }

  // The settings look right, so the next thing that can go wrong is the
  // database itself. Say so plainly rather than failing to a blank page.
  const ping = await pingDatabase();
  if (!ping.ok) {
    return (
      <Screen mode="live" wide>
        <SetupNeeded
          problems={[{ variable: "DATABASE_URL", problem: ping.reason }]}
        />
      </Screen>
    );
  }

  const settings = await getSettings();
  const signedIn = await readAdminSession();

  if (!signedIn) {
    return (
      <Screen mode={settings.mode}>
        <AdminLogin />
      </Screen>
    );
  }

  const data = await getDashboard();
  return (
    <Screen mode={settings.mode} wide>
      <Dashboard initial={data} />
    </Screen>
  );
}
