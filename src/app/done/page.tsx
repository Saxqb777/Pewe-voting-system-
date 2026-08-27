import { getSettings } from "@/lib/settings";
import { strings } from "@/lib/strings";
import { Screen } from "@/components/Screen";

export const dynamic = "force-dynamic";

export default async function DonePage() {
  const settings = await getSettings();
  return (
    <Screen mode={settings.mode}>
      <div className="pt-10 text-center">
        <div
          aria-hidden
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand text-4xl text-white"
        >
          ✓
        </div>
        <h1 className="mt-6 text-3xl font-bold text-ink">
          {strings.done.title}
        </h1>
        <p className="mt-3 text-lg text-ink">{strings.done.lead}</p>
        <p className="mt-6 rounded-xl bg-brand-soft px-4 py-4 text-left text-base text-brand-dark">
          {strings.done.anonymity}
        </p>
        <p className="mt-6 text-base text-ink-soft">{strings.done.close}</p>
      </div>
    </Screen>
  );
}
