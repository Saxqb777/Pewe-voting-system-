import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { readVoterSession } from "@/lib/session";
import { getCandidates } from "@/lib/candidates";
import { config } from "@/lib/config";
import { Screen } from "@/components/Screen";
import { BallotFlow } from "@/components/BallotFlow";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  const session = await readVoterSession();
  if (!session.voterId) redirect("/");

  const settings = await getSettings();
  if (!settings.votingOpen) redirect("/");

  const candidates = await getCandidates();

  return (
    <Screen mode={settings.mode}>
      <BallotFlow
        candidates={candidates}
        required={config.selectionsRequired}
      />
    </Screen>
  );
}
