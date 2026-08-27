"use client";

export function Section({
  title,
  children,
  tone = "plain",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "plain" | "danger";
}) {
  return (
    <section
      className={`rounded-2xl border-2 bg-card p-4 ${
        tone === "danger" ? "border-danger" : "border-line"
      }`}
    >
      <h2
        className={`mb-3 text-lg font-bold ${
          tone === "danger" ? "text-danger" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  tone = "plain",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "plain" | "primary" | "danger";
  type?: "button" | "submit";
}) {
  const styles =
    tone === "primary"
      ? "bg-brand text-white active:bg-brand-dark"
      : tone === "danger"
        ? "bg-danger text-white"
        : "border-2 border-line bg-card text-ink";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-xl px-4 py-2 text-base font-semibold disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warn" | "danger" | "good";
}) {
  const styles = {
    info: "bg-paper text-ink-soft",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    good: "bg-brand-soft text-brand-dark",
  }[tone];
  return (
    <p role="status" className={`rounded-lg px-3 py-2 text-sm font-medium ${styles}`}>
      {children}
    </p>
  );
}
