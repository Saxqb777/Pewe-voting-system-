import { strings } from "@/lib/strings";

/** Shown on every screen, voter and admin, whenever the app is in test mode. */
export function TestBanner({ mode }: { mode: "test" | "live" }) {
  if (mode !== "test") return null;
  return (
    <div className="bg-warn px-4 py-2 text-center text-sm font-bold tracking-wide text-white">
      {strings.common.testBanner}
    </div>
  );
}
