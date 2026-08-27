/**
 * Voter IDs are compared after normalising, so that a voter typing lower case,
 * extra spaces or a stray dash still gets in.
 */
export function normaliseVoterId(raw: string): string {
  return raw.replace(/[\s\-_.]/g, "").toUpperCase().slice(0, 64);
}
