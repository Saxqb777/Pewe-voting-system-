import { TestBanner } from "./TestBanner";

/** The single page shell every voter screen uses. */
export function Screen({
  mode,
  children,
  wide = false,
}: {
  mode: "test" | "live";
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TestBanner mode={mode} />
      <main
        className={`mx-auto w-full flex-1 px-5 py-8 ${wide ? "max-w-3xl" : "max-w-md"}`}
      >
        {children}
      </main>
    </div>
  );
}
