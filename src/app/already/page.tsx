import { getSettings } from "@/lib/settings";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";

export const dynamic = "force-dynamic";

export default async function AlreadyPage() {
  const settings = await getSettings();
  return (
    <Screen mode={settings.mode}>
      <div className="pt-10 text-center">
        <h1 className="text-3xl font-bold text-ink">
          {strings.already.title}
        </h1>
        <p className="mt-3 text-lg text-ink">{strings.already.lead}</p>
        <p className="mt-6 text-base text-ink-soft">{strings.already.help}</p>
      </div>
    </Screen>
  );
}
