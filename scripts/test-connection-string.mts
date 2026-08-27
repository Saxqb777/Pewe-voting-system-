/**
 * Checks that the shapes a hosting panel usually ends up holding are all
 * understood. No database needed.
 *   npm run test:connection-string
 */
import { normaliseConnectionString } from "../src/lib/connection-string.ts";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const REAL =
  "postgresql://neondb_owner:npg_abc123@ep-shiny-boat-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const cases: [string, string][] = [
  ["a bare string is untouched", REAL],
  ["a name in front is removed", `DATABASE_URL=${REAL}`],
  ["a name with spaces around the equals", `DATABASE_URL = ${REAL}`],
  ["an export line", `export DATABASE_URL=${REAL}`],
  ["an export line with quotes", `export DATABASE_URL="${REAL}"`],
  ["double quotes", `"${REAL}"`],
  ["single quotes", `'${REAL}'`],
  ["backticks", `\`${REAL}\``],
  ["a psql command", `psql '${REAL}'`],
  ["a psql command without quotes", `psql ${REAL}`],
  ["a name inside quotes", `"DATABASE_URL=${REAL}"`],
  ["leading and trailing spaces", `   ${REAL}   `],
  ["a newline on the end", `${REAL}\n`],
  ["a different variable name", `POSTGRES_URL=${REAL}`],
];

for (const [label, input] of cases) {
  const out = normaliseConnectionString(input);
  check(label, out === REAL, out === REAL ? "" : `got ${out.slice(0, 60)}`);
}

// The password and every parameter must survive intact.
const out = normaliseConnectionString(`DATABASE_URL="${REAL}"`);
check("the password survives", out.includes("npg_abc123"));
check("the host survives", out.includes("ep-shiny-boat-pooler.c-3.ap-southeast-1.aws.neon.tech"));
check("the parameters survive", out.endsWith("?sslmode=require&channel_binding=require"));

// A password containing an equals sign must not be mistaken for a name.
const tricky = "postgresql://user:pa==ss@host.example.com/db";
check("an equals sign in the password is safe", normaliseConnectionString(tricky) === tricky);

// A postgres:// scheme is equally fine.
const shortScheme = "postgres://user:pw@host/db";
check("the postgres scheme is left alone", normaliseConnectionString(`DATABASE_URL=${shortScheme}`) === shortScheme);

// Nonsense comes back as nonsense so the real error is reported, not hidden.
check("nonsense is not silently repaired", normaliseConnectionString("hello world") === "hello world");
check("an empty value stays empty", normaliseConnectionString("") === "");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
