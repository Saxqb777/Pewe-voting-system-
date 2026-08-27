export type RosterRow = { voterId: string; name: string };

export type RosterParse =
  | { ok: true; rows: RosterRow[] }
  | { ok: false; error: string };

/** Splits one CSV line, honouring double quoted fields. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === "," || ch === "\t" || ch === ";") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function looksLikeHeader(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return (
    joined.includes("voter") ||
    joined.includes("id") ||
    (joined.includes("name") && !/\d/.test(cells[0] ?? ""))
  );
}

/**
 * Parses a pasted voter list and checks it completely. Refuses the whole list
 * if any row is wrong, and says which row.
 */
export function parseRoster(
  text: string,
  expectedCount: number,
  normalise: (id: string) => string,
): RosterParse {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { ok: false, error: "The list is empty." };

  let start = 0;
  const firstCells = splitLine(lines[0]);
  if (looksLikeHeader(firstCells)) start = 1;

  const rows: RosterRow[] = [];
  const seenIds = new Map<string, number>();
  const seenNames = new Map<string, number>();

  for (let i = start; i < lines.length; i++) {
    const rowNumber = rows.length + 1;
    const cells = splitLine(lines[i]);

    if (cells.length < 2) {
      return {
        ok: false,
        error: `Row ${rowNumber} does not have two columns. Expected a Voter ID, a comma, then the name. The row reads: ${lines[i]}`,
      };
    }

    const rawId = cells[0] ?? "";
    const name = (cells.slice(1).join(", ") ?? "").trim();
    const voterId = normalise(rawId);

    if (voterId.length === 0) {
      return { ok: false, error: `Row ${rowNumber} has a blank Voter ID.` };
    }
    if (name.length === 0) {
      return {
        ok: false,
        error: `Row ${rowNumber} has a blank name. Its Voter ID is ${rawId.trim()}.`,
      };
    }
    const duplicateAt = seenIds.get(voterId);
    if (duplicateAt !== undefined) {
      return {
        ok: false,
        error: `Row ${rowNumber} repeats the Voter ID ${rawId.trim()}, which is already used on row ${duplicateAt}.`,
      };
    }

    seenIds.set(voterId, rowNumber);
    const nameKey = name.toLowerCase();
    if (!seenNames.has(nameKey)) seenNames.set(nameKey, rowNumber);
    rows.push({ voterId, name });
  }

  if (rows.length !== expectedCount) {
    return {
      ok: false,
      error: `The list has ${rows.length} voters. It must have exactly ${expectedCount}. Nothing was loaded.`,
    };
  }

  return { ok: true, rows };
}

/** Names that appear more than once, so the admin can add something to tell them apart. */
export function duplicateNames(rows: RosterRow[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return rows
    .filter((r) => (counts.get(r.name.toLowerCase()) ?? 0) > 1)
    .map((r) => r.name)
    .filter((n, i, all) => all.indexOf(n) === i);
}
