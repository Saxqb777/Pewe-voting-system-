/**
 * A rough device signature used only so the admin can see when one phone was
 * used by several voters. It is not a security control and nothing is blocked
 * because of it.
 */
export function deviceFingerprint(): string {
  if (typeof window === "undefined") return "";
  const nav = window.navigator;
  const parts = [
    nav.userAgent,
    nav.language,
    String(nav.hardwareConcurrency ?? ""),
    String(window.screen?.width ?? ""),
    String(window.screen?.height ?? ""),
    String(window.devicePixelRatio ?? ""),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
  ];
  return hash(parts.join("|"));
}

function hash(input: string): string {
  // FNV 1a, 64 bit, in two 32 bit halves.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 2166136261) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
