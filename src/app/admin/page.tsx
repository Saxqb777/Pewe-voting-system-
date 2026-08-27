import { readAdminSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getDashboard } from "@/lib/admin-data";
import { Screen } from "@/components/Screen";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Dashboard } from "@/components/admin/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
