# PEWE Election

A private, single link voting app for the PEWE village election.

- 138 voters, each selecting exactly 16 names from the same list of 138
- Every voter is also a candidate
- One link, shared in WhatsApp. No accounts, no passwords, no OTP, no signup
- After voting closes, all 138 are ranked and the top 16 are the winners
- Nobody, including the admin, can ever see who voted for whom

---

## How anonymity is guaranteed

This is the part that matters most, so here is exactly how it works.

### Two tables that share nothing

**`voters`** is the register. It answers one question: is this person allowed
to vote, and have they voted yet.

| column | what it holds |
| --- | --- |
| `voter_id` | their private ID |
| `name` | their name |
| `candidate_number` | 1 to 138, their number on the ballot |
| `has_voted` | true or false |
| `voted_at` | rounded down to the hour, never more precise |
| `device_fingerprint` | for admin flagging only |
| `ip_address` | for admin flagging only |
| `failed_attempts`, `is_locked` | for admin flagging only |
| `vote_claim` | random browser session id, so a double tap cannot create a second ballot |

**`ballots`** is the ballot box. It answers one question: what was chosen.

| column | what it holds |
| --- | --- |
| `ballot_id` | a random version 4 UUID |
| `choices` | the 16 candidate numbers, sorted |
| `created_at` | a DATE, with no time of day |

There is no foreign key between them, no shared column, no shared index and no
join key. Nothing in `ballots` appears anywhere in `voters`, and nothing in
`voters` appears anywhere in `ballots`.

### The seven things that could have leaked, and what stops each

1. **A direct reference.** A ballot could have stored the voter id, the name,
   the phone, the device or the IP. It stores none of them. The only writer is
   `src/lib/ballot-box.ts`, and you can read the whole insert in one screen.

2. **A sequential id.** An auto increment id would put the ballots in the order
   they arrived, and the admin watching the live turnout knows who voted when.
   The ballot id is a random UUID instead, and no sequence exists on the table.

3. **Physical row order.** Even with random ids, a database stores rows roughly
   in the order they were written, and `SELECT * FROM ballots` with no
   `ORDER BY` returns them that way. So on every single submit the app rewrites
   the entire ballot box in a fresh random order inside the same transaction.
   There are only as many rows as there are voters, so this costs nothing. After it runs, the raw
   storage order carries no information at all. `npm run test:ballot-box`
   measures this: it casts 100 ballots in a known order, reads them back by
   physical position, and checks the rank correlation with arrival order is
   near zero.

4. **Timestamps.** With this few voters an hourly bucket can easily hold exactly one
   person. If a ballot and a voter shared a lone hour, that would name them. So
   `ballots.created_at` is a DATE with no time of day, while `voters.voted_at`
   keeps the hour for the admin's use. The two cannot be lined up.

5. **The order names were tapped.** Choices are sorted before they are stored,
   so the sequence a voter tapped in is not recorded either.

6. **Logs and error messages.** Ballot contents are never logged, never put in
   an error message and never written to the audit log. The database driver is
   started with `debug: false` so it cannot print query values.

7. **A partial count.** `getResults()` throws if voting is still open, the
   results page redirects away, and both CSV routes return 403. There is no
   code path that produces a count before you close voting.

### What the app can see, and when

While voting is open the admin sees one number: how many people have voted, and
which names are still missing. That is all. No counts, no leader board, no
partial results exist anywhere until voting is closed.

### The one thing that is true of any online vote

For the fraction of a second in which your vote is submitted, the server holds
your identity and your choices in memory at the same time. It has to, in order
to check your ID and write your ballot. What it does with them in that moment
is deliberately write them to two places that share nothing, and then forget.
That is the standard trust model for any system where you do not hand in a
paper slip yourself, and it is worth stating plainly rather than pretending
otherwise.

### Checking it yourself

Two commands, both safe to point at the real database:

```bash
DATABASE_URL="..." npm run verify:anonymity   # read only, structural checks
npm run test:roster                           # voter list validation, no database
```

`verify:anonymity` reads the database's own catalog rather than trusting the
source code, so it checks what is actually there: the column list, the absence
of foreign keys, the absence of a sequence, that every stored id really is a
random UUID, that every ballot is the same size and sorted, and that the
register holds no choices.

---

## Running it

### Environment variables

Copy `.env.example` to `.env.local` and fill it in.

| variable | what it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Use the pooled one from Neon |
| `ADMIN_PASSWORD` | the single admin password |
| `SESSION_SECRET` | random 64 character hex string, signs the session cookies |
| `EXPECTED_VOTER_COUNT` | how many voters the list must contain. Default 138. Change it here if the village list changes size |
| `SELECTIONS_REQUIRED` | how many names each voter must pick. Default 16 |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run seed         # optional, fills the register with dummy voters
```

The schema creates itself on first use, so there is no migration step.

### Commands

| command | what it does |
| --- | --- |
| `npm run dev` | run locally |
| `npm run build` | production build |
| `npm run seed` | load dummy voters. Refuses in live mode |
| `npm run test` | roster, ballot box and anonymity checks |
| `npm run verify:anonymity` | read only structural proof, safe on the live database |

---

## Loading the real voter list

In the admin dashboard, under **Voter list**, there are two ways in.

### If you have names only, and the IDs still have to be made

This is the usual case. Pick **I have names only. Make the Voter IDs for me**
and paste one name per line:

```
Amina Khan
Bilal Shah
Chandra Baig
```

The system makes a six digit Voter ID for each person, then offers you
**Download the Voter ID sheet**, a CSV of candidate number, name and Voter ID.

The IDs are drawn with a cryptographic random number generator, not
`Math.random`, and they are deliberately unrelated to the order of the list.
Knowing one person's ID tells you nothing about the next one. Six digits gives
900000 possibilities for 138 people, so a stranger guessing has about a one in
6500 chance per try, against a limit of five wrong tries per phone.

**Hand each person only their own ID, one to one.** The voting link is public
by design. The ID is the only thing standing between a stranger and somebody
else's ballot, so if the sheet reaches the group chat, anyone can vote as
anyone.

### If you already have a Voter ID for each person

Pick **I already have a Voter ID for each person** and paste one row per
person:

```
100001,Amina Khan
100002,Bilal Shah
```

Commas, semicolons and tabs all work as the separator. A header row is ignored.
A name containing a comma should be wrapped in double quotes.

### Either way

The loader refuses the whole list unless every check passes, and tells you
which row is wrong:

- exactly as many rows as `EXPECTED_VOTER_COUNT`, 138 by default
- no duplicate Voter ID
- no blank name
- no blank Voter ID
- the right number of columns for the mode you picked

A running count under the box shows how many rows you have pasted, so you can
see you are at the right number before you load.

Candidate numbers are given out in the order of your list, so sort it the way
you want the ballot to read. If two people share a name you are warned, and the
candidate number next to every name tells them apart.

The voter list cannot be replaced once there is a single ballot in the ballot
box. The ID sheet stays downloadable.

## Test run, then the real thing

The app starts in **test** mode. A brown banner reads TEST MODE on every screen,
voter and admin.

1. Load the dummy voters, or your real list, and do a full practice run
2. Vote from a few phones, try a wrong ID, lock a phone, unlock it, reset a vote
3. Close voting and look at the results and the CSV
4. When you are happy, type `RESET FOR LIVE` in the admin dashboard

The reset wipes every ballot, marks every voter as not voted, clears every flag
and lock, and switches the app to live. The voter list survives it.

Once the app is live, the same button also requires a second phrase,
`DELETE THE REAL ELECTION`, so a real election cannot be wiped by accident.

---

## Security

- After 5 wrong Voter IDs, that phone is locked and the lock is recorded so you
  can clear it from the dashboard
- A network wide limit backs that up, so clearing cookies does not reset it
- One generic message for every failure, so the screen cannot be used to find
  out which IDs exist or who has already voted
- Every rule is enforced on the server. The browser is never trusted about how
  many names were selected, or which
- Submitting is idempotent. A double tap, a refresh or a retry on a bad
  connection cannot create a second ballot
- HTTPS is enforced by a Strict Transport Security header, and session cookies
  are httpOnly, SameSite and Secure
- The admin password is compared in constant time and rate limited by IP

---

## Stack

Next.js and TypeScript, Postgres, Tailwind CSS. No ORM: every query is plain
parameterised SQL, so the parts that matter can be read and checked by eye.
Deployed on Vercel with a Neon database, both on free tiers.
