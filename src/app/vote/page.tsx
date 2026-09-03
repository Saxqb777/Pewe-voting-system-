import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { openWhenDue } from "@/lib/auto-open";
import { readVoterSession } from "@/lib/session";
import { getCandidates } from "@/lib/candidates";
import { Screen } from "@/components/Screen";
import { BallotFlow } from "@/components/BallotFlow";
import { BallotCountdown } from "@/components/BallotCountdown";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  const session = await readVoterSession();
  if (!session.voterId) redirect("/");

  await openWhenDue();
  const settings = await getSettings();
  if (!settings.votingOpen) redirect("/");

  const candidates = await getCandidates(session.voterId);

  return (
    <Screen mode={settings.mode}>
      <BallotFlow
        candidates={candidates}
        required={settings.selectionsRequired}
        countdown={
          <BallotCountdown
            closesAt={settings.closesAt ? settings.closesAt.toISOString() : null}
          />
        }
      />
    </Screen>
  );
}
