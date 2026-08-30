import { strings } from "@/lib/strings";

/**
 * A word from the society, set apart from the mechanics of voting. The opening
 * line is the thought it turns on, so it is given the weight of a pull quote
 * and the rest follows underneath at reading size.
 */
export function SocietyNote() {
  return (
    <aside className="mt-8 overflow-hidden rounded-xl bg-brand-soft">
      <blockquote className="border-l-[6px] border-brand px-4 py-5 sm:px-5">
        <p className="text-lg font-semibold leading-snug text-brand-dark text-balance">
          &ldquo;{strings.note.quote}&rdquo;
        </p>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          {strings.note.body}
        </p>
        <p className="mt-3 text-base font-bold text-brand-dark">
          {strings.note.amen}
        </p>
        <footer className="mt-4 border-t border-brand/25 pt-3 text-sm font-semibold text-ink-soft">
          {strings.common.orgName}
        </footer>
      </blockquote>
    </aside>
  );
}
