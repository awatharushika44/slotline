# DECISIONS
## Phase 0 additions: edge cases
| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Editing a reservation (BR11) | Same overlap rule, excluding itself | Skip check on edit | Edits must never create overlaps; self-overlap must not block the edit |
| Ended / in-progress bookings (BR12) | Ended = read-only; in progress = start locked, end editable, cancel allowed | Allow all edits anytime | History must stay trustworthy. Trade-off: cancel of in-progress booking hides real usage from stats |
| Midnight crossing (BR13) | One range of instants, clipped per day in the UI | Date + two times model | Ranges map directly to tstzrange and make overlap math simple |
| Cancel/rebook race (BR14) | Rely on DB constraint, no app locks | Row locks / check-then-insert | Check-then-insert has a race window; the constraint is atomic. Cancel is idempotent |
| Deactivated users (BR15) | Deactivate, keep future bookings, flag for admin | Hard delete or auto-cancel | Same principle as resources: never destroy history silently |

## Phase 1: Setup and tooling
| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| ORM | Drizzle | Prisma | SQL stays visible; clean raw-SQL migrations for the exclusion constraint. Trade-off: smaller ecosystem |
| Database runtime | Docker Compose, postgres:16-alpine | Local install, `latest` tag | Same setup for every developer; pinned major version |
| Styling | Tailwind CSS | Plain CSS | Fast, consistent design tokens |
| Folder structure | app / components / lib {validation, domain, services, db, time} | Logic inside routes/components | Testable pure domain logic; clear dependency direction |
| Git workflow | Short branches, PRs to main, squash merge, Conventional Commits | Direct pushes to main | Clean, reviewable history |
| CI | GitHub Actions: lint + typecheck now, tests in Phase 4 | No CI | Automatic proof of quality on every push |
| Secrets | `.env` ignored, `.env.example` committed | Committing real values | Never commit secrets |

## Phase 2: Database Design

| Decision                      | Chosen                                                                                                                                                              | Rejected                                          | Why                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No-overlap rule               | PostgreSQL `EXCLUDE USING gist`, partial `WHERE status = 'active'`                                                                                                  | Check-then-insert in application code only        | Atomic enforcement prevents concurrent bookings from overlapping. Cancelled bookings are excluded from the constraint.                                                            |
| Time storage                  | Two `timestamptz` columns, with a range constructed inside the constraint                                                                                           | A single `tstzrange` column                       | Simpler ORM integration, validation, and readability, at the cost of a slightly less elegant schema.                                                                              |
| Interval semantics            | Half-open intervals: `[)`                                                                                                                                           | Closed intervals                                  | Allows back-to-back bookings without treating the shared boundary as an overlap.                                                                                                  |
| Primary keys                  | UUIDs using `gen_random_uuid()`                                                                                                                                     | `serial` or `bigint`                              | Makes identifiers harder to guess. The trade-off is larger keys. The audit table uses a `bigint` identity for ordered log entries.                                                |
| Category and status           | PostgreSQL ENUM types                                                                                                                                               | Lookup tables                                     | Simple and typo-resistant. Adding a new value requires a database migration.                                                                                                      |
| Foreign keys                  | `ON DELETE RESTRICT`                                                                                                                                                | `ON DELETE CASCADE`                               | Prevents deleting records that have dependent history, supporting BR7 and BR15.                                                                                                   |
| Audit details                 | JSONB `before` and `after` values                                                                                                                                   | A separate typed column for every possible change | Flexible for recording different changes, but less strictly typed.                                                                                                                |
| Database enforcement boundary | Database enforces structure, overlap, `end > start`, foreign keys, and uniqueness                                                                                   | Enforcing every business rule in the database     | Application rules such as the 15-minute grid, maximum 8-hour duration, no past bookings, and active-resource checks can provide clearer validation errors and evolve more easily. |
| Past bookings (BR5)           | Enforced in application logic                                                                                                                                       | A database `CHECK` constraint using `now()`       | Time-dependent `CHECK` constraints are unsuitable because their results can change over time and existing rows could become invalid.                                              |
| Indexes                       | GiST index through the exclusion constraint; indexes on `(user_id, starts_at)`, `starts_at`, and audit events by reservation; unique email and unique `lower(name)` | Indexes on status and category                    | Supports expected queries and uniqueness requirements without adding indexes on low-cardinality columns that may offer little benefit on small tables.                            |
| `password_hash` column        | Include in the initial schema                                                                                                                                       | Add in a later migration                          | Avoids an unnecessary follow-up migration. Confirm the authentication requirements before finalizing the schema.                                                                  |
## Phase 3: Migrations, seed, constraint
| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Schema changes | Versioned SQL migrations (drizzle-kit), committed | `push` / manual edits | Reproducible, reviewable, same DB for every developer |
| Exclusion constraint | Hand-written custom SQL migration | Hoping ORM supports it / app-only check | Drizzle can't express EXCLUDE; DB-level guarantee is the whole point. Trade-off: not visible in schema.ts, documented instead |
| Extension | CREATE EXTENSION btree_gist in migration | Manual setup | Fresh DB works with `db:migrate` alone |
| DB connection | Single pg Pool cached on globalThis in dev | New pool per import | Next.js dev reloads would exhaust connections |
| Seed | Wipe-and-refill with TRUNCATE, relative dates, refuses in production | Fixed dates / append-only | Idempotent; demo always has future bookings; cannot wipe prod |
| Seed shortcuts (known) | Fake password hash, hard-coded +05:30 offset | Real hashing / tz library now | Both replaced later (Phase 7 and Phase 4). Documented honestly |
| Proof of safety | SQL experiments + two-terminal race test (automated test in Phase 4) | "Trust me" | Evidence for reviewers |
## Phase 4: Domain, validation, service, tests
| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Where rules live | Pure functions in lib/domain, no DB/clock access | Logic in routes/components | Unit-testable in milliseconds; one source of truth |
| Current time | Passed in as `now` | `new Date()` inside rules | Deterministic tests |
| Validation | One Zod schema factory shared by client and server, calling domain rules | Separate client/server checks | Same rules everywhere; server still re-validates (never trust the browser) |
| Time zones | Luxon, all conversion in lib/time/zone.ts, store UTC | Hard-coded +05:30, native Date only | Correct "start of day" logic; one place to change. Trade-off: extra dependency |
| Conflict handling | Try insert, translate PG error 23P01 into friendly CONFLICT with holder info | Check-then-insert | Pre-check has a race window and still needs the catch. DB is the single judge |
| Error style | Return result objects for expected failures, throw for unexpected | Exceptions for everything | Conflicts are normal business outcomes |
| Error detection | Walk the `cause` chain for the SQLSTATE code | Check `error.code` only | ORM may wrap the driver error |
| Audit write | Reservation + event in one transaction | Two separate writes | All-or-nothing consistency |
| Test DB | Separate `slotline_test`, migrations run in test setup | Reuse dev DB / mocks | Tests wipe tables; real DB needed for concurrency proof |
| Concurrency proof | 20 simultaneous requests via service, plus 20 raw inserts bypassing the app | Single test or mocks | Shows both layers: app handles it, DB guarantees it |
| CI | Postgres service container, runs full test suite | Unit tests only | Visible, repeatable proof on every push |
| Known gap | In-progress booking edits need to skip the past-start check | Ignore | Handled in Phase 6 (BR12) |
## Phase 4.5: Design system
| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Visual concept | Departures board + ribbon timeline | Generic table/calendar look | Matches the question "what is free, when, who has it?" and reads in 3 seconds |
| Palette | Warm paper, deep indigo ink, one signal green | Many bright colors / default framework theme | One accent keeps "free" instantly recognizable. Text pairs checked by hand at 5:1 or better (verify with a contrast checker before submitting) |
| Not color alone | Shape + text (● FREE / ■ BUSY), hatching and strikethrough for cancelled | Color-only status | WCAG: color-blind users and grayscale printing still work |
| Fonts | Bricolage Grotesque (display), Geist (UI), Geist Mono (times) via next/font | Google Fonts link / one font | Character in headings, readability in forms, tabular numbers so times align. next/font self-hosts, no layout shift |
| Styling approach | Plain CSS variables (tokens) + small class set | UI kit / heavy animation library | Light, fully understood, easy to explain. Trade-off: more hand-written CSS |
| Motion | CSS only, 3 durations, one ease-out, honors prefers-reduced-motion | JS animation library | No dependencies; accessible |
| Flip animation | key-based remount replays a CSS animation | Animation library | Tiny; teaches how React keys work |
| Touch targets | Controls at least 44px tall | Compact controls | Usable on phones |
| Accessibility basics | Skip link, visible focus ring, labelled inputs with aria-describedby, aria-live on status | Add later | Cheaper to build in now than to retrofit |
| Dark mode | Not now | Build now | Cut order: only if time remains |
## Phase 6: Reservations and screens
| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| BR12 | One pure getReservationPermissions used by UI and service | Separate checks in each | UI and server can never disagree |
| Ongoing booking | Start locked, end editable (finish early allowed) | Fully locked | Matches reality; frees the slot |
| Window rules on edit | validateBookingWindow(existingStart) in the service | Zod with past-start check | The rule depends on the stored row |
| Conflict UX | Try the write, translate 23P01, return holder + suggestions | Pre-check availability | No race window; one judge |
| Suggestions | findNextSlots twice: same time on other resources, next free here | Only same-resource | Fixes the "fewer than 3 slots" limit from Phase 4.5 |
| Chips | Submit exact slot through the same action | Fill the form and ask again | One click; server still validates |
| Undo | Real restore through the constraint | Hide the cancel | Honest: can fail if the slot was taken |
| Date inputs | datetime-local interpreted as Colombo | Separate date + time fields | Handles overnight bookings; one field each |
| Timeline layout | Percent-based blocks from a pure function, 24 h scroll | Pixel maths in the component | Testable; nothing hidden outside the viewport |
| Archived resources | Shown (greyed) when they hold bookings that day | Hide them | Never make existing bookings invisible |
| Drag to create | Cut (click + Book button instead) | Build drag | Time risk; keyboard path matters more |
| Race on cancel | UPDATE ... WHERE status = 'active' | Read then write | Two cancels cannot both succeed |