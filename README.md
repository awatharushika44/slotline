# Slotline

> See what is free, when, and who has it. **Double booking is impossible by design.**

Slotline is a resource reservation system for an organisation's shared rooms, equipment and vehicles. It replaces informal booking (chat messages and notebooks) with one source of truth: a live "departures board" of what is free now, a day timeline, one-click conflict alternatives, and a database that physically refuses overlapping bookings.

Built for the PrimeWave Lab Software Engineering Internship technical assessment.

![Departures board](docs/board.png)

- 🎥 **Demo video:** YOUR-VIDEO-LINK
- 🗺️ **ER diagram:** YOUR-ER-LINK

## Run it in 5 commands

Requirements: Node.js 20 or newer, Docker Desktop.

```bash
git clone https://github.com/awatharushika44/slotline.git && cd slotline
npm install
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
docker compose up -d          # starts PostgreSQL
npm run db:migrate && npm run db:seed && npm run dev
```

Open http://localhost:3000. Use the **demo buttons** on the login page:

| Account | Role | Password |
|---|---|---|
| amaya@slotline.test | admin | `slotline-demo` |
| kasun@slotline.test | member | `slotline-demo` |
| dilini@slotline.test | member | `slotline-demo` |

Before real use, generate your own session secret and set it in `.env`:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection for the app |
| `TEST_DATABASE_URL` | A separate database the tests wipe and rebuild |
| `SESSION_SECRET` | Signs session cookies (32+ characters) |
| `SHOW_DEMO_ACCOUNTS` | `true` shows the demo login buttons |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm run build` / `npm start` | Production build and run |
| `npm run db:generate` | Create a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Wipe and refill with demo data (refuses in production) |
| `npm test` | All unit and integration tests |
| `npm run lint` / `npm run typecheck` | Static checks |

Tests need a second database, created once:
`docker compose exec db psql -U slotline -d slotline -c "CREATE DATABASE slotline_test;"`

## What it does

- **Departures board:** every resource shows `FREE for 2h 15m` or `BUSY until 14:30 · Anna`, refreshing every 30 seconds.
- **Ribbon timeline:** day view with resources as rows, a "now" line, click free time to book.
- **Conflict handling:** if a slot is taken you see who holds it and one-click alternatives (same time on another resource, next free slot here).
- **Find me a slot:** choose a duration and category and get the earliest free options in working hours.
- **Resources:** admins create, edit and archive (never delete) resources.
- **Reservations:** create, edit, cancel with undo, filters, search and pagination.
- **Roles:** members manage only their own bookings, admins manage everything.
- **Insights:** utilization per resource, busiest hours, top users (computed in SQL).
- **Audit trail:** every create, update, cancel and restore is recorded with who and when.

## Reliability: how double booking is prevented

Checking "is it free?" and then inserting has a gap. Two people can both see "free" and both insert (a race condition). Slotline closes the gap in the database with a PostgreSQL **exclusion constraint**:

```sql
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'active')
```

In words: among active reservations, never allow the same resource with overlapping time ranges.

- `'[)'` ranges are half-open, so 10:00–11:00 and 11:00–12:00 do not clash.
- `WHERE status = 'active'` means cancelled bookings never block time.
- The service does not pre-check. It inserts, and translates error `23P01` into a friendly conflict message.
- **Proof:** `tests/integration/double-booking.test.ts` fires 20 simultaneous requests. Exactly one succeeds. A second test bypasses the app code entirely and the database still allows only one. CI runs both on every push.

The constraint is a hand-written SQL migration because Drizzle cannot express `EXCLUDE`. It is documented here and in `DECISIONS.md`.

## Architecture

```
src/
  app/            Next.js App Router pages and server actions
  components/     UI (client components only where needed)
  lib/
    domain/       Pure business rules: overlap, booking policy, permissions,
                  slot search, timeline layout. No DB, no clock, fully unit-tested
    validation/   Zod schemas shared by client and server
    services/     Use cases: orchestrate rules, DB and error translation
    db/           Drizzle schema, repositories (the only place that knows SQL)
    auth/         scrypt password hashing, signed session cookies
    time/         All time-zone logic (store UTC, display Asia/Colombo)
drizzle/          Versioned SQL migrations (including the exclusion constraint)
tests/            unit/ and integration/ (real PostgreSQL, no mocks)
```

Layers: UI → server action (validate with Zod) → service (permissions, business rules) → repository (SQL). The database is the final judge.

**Key decisions** (full list with rejected alternatives in [`DECISIONS.md`](DECISIONS.md)):
- Half-open time ranges, UTC storage (`timestamptz`), display in Asia/Colombo.
- Database enforces structure (no overlap, `end > start`, foreign keys with `RESTRICT`). The app enforces policy (15-minute grid, max 8 hours, no past bookings) and gives friendly messages.
- Resources are archived, never deleted, so history and the audit trail stay valid.
- Auth: scrypt with per-user salt, HMAC-signed httpOnly cookie, role checks in the service layer.
- Pure functions with an injected clock, so time rules are testable.

## Known limitations and what I would do next

- No password reset, no login rate limiting or lockout.
- Session cookies cannot be revoked before expiry (deactivated users are still blocked on every request).
- Offset pagination (keyset pagination would scale better).
- Route protection relies on each page calling `getCurrentUser()`; a route-group layout guard would make that automatic.
- Not built (scope): drag-to-create, dark mode, recurring bookings, notifications, multi-organisation support.n
