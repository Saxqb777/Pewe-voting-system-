/**
 * Pulls the connection string out of the shapes a hosting panel usually ends
 * up holding. Neon's copy button hands over a whole line rather than a bare
 * string, so the value pasted in is often one of:
 *
 *   DATABASE_URL=postgresql://...
 *   export DATABASE_URL="postgresql://..."
 *   psql 'postgresql://...'
 *   "postgresql://..."
 *
 * All of those clearly mean the same thing, so accept them rather than send
 * somebody back to edit a string by hand.
 */
export function normaliseConnectionString(raw: string): string {
  let value = (raw ?? "").trim();

  // Peel one wrapper at a time, since they nest in either order.
  for (let pass = 0; pass < 4; pass++) {
    const before = value;
    value = value.replace(/^psql\s+/i, "");
    value = value.replace(/^export\s+/i, "");
    // A NAME= prefix. A real string starts postgresql:// so its scheme is
    // followed by a colon, never an equals sign, and cannot match this.
    value = value.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, "");
    value = value.replace(/^(['"`])([\s\S]*)\1$/, "$2");
    value = value.trim();
    if (value === before) break;
  }

  return value;
}
