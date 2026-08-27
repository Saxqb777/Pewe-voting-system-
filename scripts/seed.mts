/**
 * Fills a database with the schema and 130 made up voters, for local work.
 *   npm run seed
 * Refuses to touch a live election.
 */
import { sql, ensureSchema } from "../src/lib/db.ts";
import { dummyVoters } from "../src/lib/dummy-voters.ts";
import { config } from "../src/lib/config.ts";

async function main() {
  await ensureSchema();

  const [{ mode }] = await sql<{ mode: string }[]>`
    SELECT mode FROM settings WHERE id = 1
  `;
  if (mode === "live") {
    console.error("Refusing to seed: this database is in live mode.");
    process.exit(2);
  }

  const [{ count: ballots }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM ballots
  `;
  if (ballots > 0) {
    console.error(
      `Refusing to seed: there are ${ballots} ballots in the ballot box.`,
    );
    process.exit(2);
  }

  const people = dummyVoters(config.expectedVoterCount);
  await sql.begin(async (tx) => {
    await tx`DELETE FROM voters`;
    for (let i = 0; i < people.length; i++) {
      await tx`
        INSERT INTO voters (voter_id, name, candidate_number)
        VALUES (${people[i].voterId}, ${people[i].name}, ${i + 1})
      `;
    }
  });

  console.log(`Seeded ${people.length} dummy voters.`);
  console.log(`Try signing in as ${people[0].name}, Voter ID ${people[0].voterId}.`);
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
