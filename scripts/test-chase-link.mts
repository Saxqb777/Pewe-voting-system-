/**
 * The chasing page and its key.
 *
 * The list of who has not voted is for the people ringing round, not for the
 * village, so the page is locked. Three things matter: the key cannot be
 * guessed, a wrong one gets nothing, and holding it gets nobody an admin
 * session or anybody's voting code.
 *
 * Run with: npm run test:chase-link
 */
process.env.SESSION_SECRET ??= "a-test-signing-secret-of-ample-length-000";
process.env.ADMIN_PASSWORD ??= "test-admin-password-1234";
process.env.DATABASE_URL ??= "postgres://postgres@127.0.0.1:5433/village";

const { chaseKey, isChaseKey, chaseUrl } = await import("../src/lib/chase-link.ts");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const key = chaseKey();

check("the key is long enough to be worth locking with", key.length === 24, `${key.length}`);
check("it is hex and nothing else", /^[0-9a-f]{24}$/.test(key), key);
check("the same secret always gives the same key", chaseKey() === key);
check("the key opens the page", isChaseKey(key));

for (const wrong of [
  "",
  "0",
  key.slice(0, 23),
  key + "0",
  key.slice(0, 23) + (key[23] === "a" ? "b" : "a"),
  "../admin",
  "0000000000000000000000000",
]) {
  check(
    `a wrong key gets nothing: ${JSON.stringify(wrong).slice(0, 30)}`,
    !isChaseKey(wrong),
  );
}
check("and neither does nothing at all", !isChaseKey(undefined));

// The key is a one way step off the secret. Holding it must say nothing
// about the secret itself, which is what signs admin sessions.
const secret = process.env.SESSION_SECRET!;
check("the key is not the secret", key !== secret);
check("nor any slice of it", !secret.includes(key) && !key.includes(secret.slice(0, 12)));

const url = chaseUrl();
check("the address carries the key", url.endsWith(`/chase/${key}`), url);
check("and it is not the page the village has", !url.includes("/status"), url);

console.log(
  failures === 0
    ? "\nThe chasing page is locked, and its key is a dead end."
    : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
