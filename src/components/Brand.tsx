import { strings } from "@/lib/strings";

/**
 * The society mark, shown at the top of every voter screen so a voter can see
 * at a glance that the page belongs to the society and not to a stranger.
 *
 * The image is decorative, so it carries an empty alt and the society name is
 * read out as real text underneath.
 */
export function Brand() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/psws-logo.jpg"
        alt=""
        width={80}
        height={80}
        className="h-20 w-20 rounded-full"
      />
      <p className="mt-2 text-sm font-semibold text-ink-soft">
        {strings.common.orgName}
      </p>
      <p className="text-xs text-ink-soft/80">{strings.common.registration}</p>
    </div>
  );
}

/** Who to ask when something goes wrong. Shown at the foot of a voter screen. */
export function ContactLine() {
  return (
    <p className="mt-8 border-t border-line pt-4 text-center text-sm text-ink-soft">
      {strings.common.contactLead}
      <br />
      <span className="font-semibold text-ink">{strings.common.contactName}</span>{" "}
      <a
        href={`tel:${strings.common.contactPhone.replace(/\s/g, "")}`}
        className="font-semibold text-brand underline"
      >
        {strings.common.contactPhone}
      </a>
    </p>
  );
}
