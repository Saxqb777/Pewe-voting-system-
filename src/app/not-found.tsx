import { strings } from "@/lib/strings";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8 text-center">
      <h1 className="text-3xl font-bold text-ink">
        {strings.common.notFoundTitle}
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        {strings.common.notFoundLead}
      </p>
    </div>
  );
}
