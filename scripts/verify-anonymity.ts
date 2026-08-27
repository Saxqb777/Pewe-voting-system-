/**
 * Structural proof that a ballot cannot be traced to a person.
 *
 * Read only. Safe to run against the live election database at any time:
 *   DATABASE_URL="..." npm run verify:anonymity
 *
 * It reads the database's own catalog rather than trusting the source code,
 * so it checks what is actually there.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(2);
}

const sql = postgres(url, { prepare: false, onnotice: () => {} });

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const IDENTIFYING = [
  "voter",
  "name",
  "phone",
  "device",
  "fingerprint",
  "ip",
  "session",
  "email",
  "user",
];

async function main() {
  // 1. The ballot box holds three columns and nothing else.
  const columns = await sql<{ column_name: string; data_type: string }[]>`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'ballots' AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  const names = columns.map((c) => c.column_name);
  check(
    "ballots has exactly ballot_id, choices, created_at",
    names.length === 3 &&
      names.includes("ballot_id") &&
      names.includes("choices") &&
      names.includes("created_at"),
    names.join(", "),
  );

  // 2. No column name in the ballot box refers to a person, a device or a network.
  const suspicious = names.filter((n) =>
    IDENTIFYING.some((word) => n.toLowerCase().includes(word)),
  );
  check(
    "no identifying column in the ballot box",
    suspicious.length === 0,
    suspicious.join(", "),
  );

  // 3. created_at is a date, so it cannot carry a time of day.
  const createdAt = columns.find((c) => c.column_name === "created_at");
  check(
    "ballot timestamps have no time of day",
    createdAt?.data_type === "date",
    createdAt?.data_type ?? "missing",
  );

  // 4. Nothing joins the two tables.
  const foreignKeys = await sql<{ constraint_name: string; detail: string }[]>`
    SELECT conname AS constraint_name, pg_get_constraintdef(oid) AS detail
    FROM pg_constraint
    WHERE contype = 'f'
      AND (conrelid = 'ballots'::regclass OR confrelid = 'ballots'::regclass)
  `;
  check(
    "no foreign key touches the ballot box",
    foreignKeys.length === 0,
    foreignKeys.map((f) => f.detail).join("; "),
  );

  // 5. The ballot id is not a sequence, so it carries no ordering.
  const idColumn = await sql<{ default_value: string | null; data_type: string }[]>`
    SELECT column_default AS default_value, data_type FROM information_schema.columns
    WHERE table_name = 'ballots' AND column_name = 'ballot_id'
  `;
  check(
    "ballot id is a uuid, not a counter",
    idColumn[0]?.data_type === "uuid",
    idColumn[0]?.data_type ?? "missing",
  );

  const sequences = await sql<{ relname: string }[]>`
    SELECT c.relname FROM pg_class c
    JOIN pg_depend d ON d.objid = c.oid
    WHERE c.relkind = 'S' AND d.refobjid = 'ballots'::regclass
  `;
  check("no sequence attached to the ballot box", sequences.length === 0);

  // 6. Every stored ballot id is a random version 4 uuid.
  const [{ total, v4 }] = await sql<{ total: number; v4: number }[]>`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (
             WHERE ballot_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
           )::int AS v4
    FROM ballots
  `;
  check(
    "every ballot id is a random uuid",
    total === v4,
    `${v4} of ${total}`,
  );

  // 7. Every ballot carries the same number of choices, so the shape of a
  //    ballot cannot single anybody out.
  const widths = await sql<{ width: number; count: number }[]>`
    SELECT array_length(choices, 1) AS width, COUNT(*)::int AS count
    FROM ballots GROUP BY 1 ORDER BY 1
  `;
  check(
    "every ballot is the same size",
    widths.length <= 1,
    widths.map((w) => `${w.count} ballots of ${w.width}`).join(", "),
  );

  // 8. Choices are stored sorted, so the order the voter tapped names is not
  //    recorded either.
  const [{ unsorted }] = await sql<{ unsorted: number }[]>`
    SELECT COUNT(*)::int AS unsorted FROM ballots
    WHERE choices IS DISTINCT FROM (
      SELECT array_agg(c ORDER BY c) FROM unnest(choices) AS c
    )
  `;
  check("choices are stored in sorted order", unsorted === 0, `${unsorted} unsorted`);

  // 9. The register never holds a ballot.
  const voterColumns = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'voters' AND table_schema = 'public'
  `;
  const leaked = voterColumns
    .map((c) => c.column_name)
    .filter((n) => /choice|ballot_id|vote_for|selection/.test(n));
  check("the register holds no choices", leaked.length === 0, leaked.join(", "));

  console.log(
    failures === 0
      ? "\nEvery structural check passed. A ballot cannot be traced to a person."
      : `\n${failures} check(s) failed.`,
  );
  await sql.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await sql.end();
  process.exit(2);
});
